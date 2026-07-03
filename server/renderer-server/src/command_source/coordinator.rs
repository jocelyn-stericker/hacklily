/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// The coordinator command source: a WebSocket server that replaces the
// legacy Qt `HacklilyServer` (now retired; formerly `server/ws-server/`).
//
// It listens on one port shared by frontend clients and remote renderer
// workers (distinguished by the first JSON-RPC message: workers send
// `i_haz_computes`, frontends send `render`/`signIn`/etc.). This module
// produces a `RequestStream` of render requests that feed the existing
// `event_loop` / `RendererManager` local pool, exactly like the batch
// and ws-worker command sources do. Non-render RPCs (ping, signIn,
// signOut, notifySaved, get_status) are handled inline per connection.
//
// Remote-worker dispatch (forwarding renders to connected workers
// instead of the local pool) is the router's job, added in the next
// step; here we only register workers and surface their count in
// `get_status` so the frontend status page keeps working.
use futures::stream::{SplitSink, StreamExt};
use futures::SinkExt;
use log::{debug, error, info, warn};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio_stream::wrappers::ReceiverStream;
use tokio_tungstenite::tungstenite::protocol::Message as WsMessage;
use tokio_tungstenite::WebSocketStream;
use uuid::Uuid;

/// Shared, cloneable sink type used by response callbacks. Behind a
/// `dyn WsSink` so the worker registry (and tests) can substitute a
/// non-WebSocket sink. `Mutex` serializes sends.
pub type SharedSink = Arc<Mutex<Box<dyn WsSink + Send>>>;

/// Trait abstracting the write half of a WebSocket connection, so the
/// worker registry can be tested without a real socket. The production
/// impl wraps `SplitSink<WebSocketStream<TcpStream>, Message>`.
pub trait WsSink: Send {
    /// Send a text message. The implementation must be async-safe.
    fn send_text(&mut self, text: String) -> SendFut<'_>;
    /// Send a pong (reply to a ping).
    fn send_pong(&mut self, payload: Vec<u8>) -> SendFut<'_>;
}

/// Future returned by `WsSink::send_*`. Using a concrete boxed future
/// keeps the trait object-friendly.
pub type SendFut<'a> = std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + Send + 'a>>;

/// Production `WsSink` wrapping a `SplitSink`.
struct TungsteniteSink(SplitSink<WebSocketStream<tokio::net::TcpStream>, WsMessage>);

impl WsSink for TungsteniteSink {
    fn send_text(&mut self, text: String) -> SendFut<'_> {
        Box::pin(async move {
            self.0
                .send(WsMessage::Text(text))
                .await
                .map_err(|e| e.to_string())
        })
    }
    fn send_pong(&mut self, payload: Vec<u8>) -> SendFut<'_> {
        Box::pin(async move {
            self.0
                .send(WsMessage::Pong(payload))
                .await
                .map_err(|e| e.to_string())
        })
    }
}

use crate::auth::{self, AuthError, GitHub};
use crate::command_source::{QuitSignal, QuitSink, RequestStream, ResponseCallback};
use crate::error::HacklilyError;
use crate::jsonrpc::{self, method, Request, Response};
use crate::request::{Backend, Request as RenderRequest, Response as RenderResponse, Version};
use crate::status::StatusHandle;
use std::sync::atomic::Ordering;

/// Parameters for the `render` method, mirroring `RenderParams` in
/// `src/RPCClient.tsx`. `version` is optional there and defaults to
/// stable, matching the legacy Qt `requestObj["version"].toString("stable")`.
#[derive(Debug, Deserialize)]
struct RenderParams {
    backend: Backend,
    src: String,
    #[serde(default = "default_version")]
    version: Version,
}

fn default_version() -> Version {
    Version::Stable
}

/// Parameters for `i_haz_computes`, sent by a freshly connected worker.
#[derive(Debug, Deserialize)]
struct IHazComputesParams {
    max_jobs: u64,
}

/// Shared coordinator state visible to all connections. Analytics
/// counters and the live frontend-client count live in the shared
/// `StatusSnapshot` (so `get_status` can also surface the event
/// loop's local-pool and backlog numbers and the registry's remote
/// counts). The per-connection tasks bump them via atomics — no
/// async locking needed.
#[derive(Clone)]
struct ConnState {
    status: StatusHandle,
}

impl ConnState {
    fn bump(counter: &std::sync::atomic::AtomicU64) -> u64 {
        StatusHandle::bump(counter)
    }
}

/// Configuration for the coordinator command source.
#[derive(Clone)]
pub struct CoordinatorConfig {
    /// Interface to bind the WebSocket listener on. Defaults to
    /// `127.0.0.1` so the plain `ws://` port is only reachable from a
    /// local reverse proxy; `0.0.0.0` exposes it (unencrypted) to the
    /// network.
    pub bind_address: std::net::IpAddr,
    pub ws_port: u16,
    pub github_client_id: String,
    pub github_secret: String,
    pub workers: crate::worker_registry::WorkerRegistryHandle,
    pub status: StatusHandle,
}

/// Build the coordinator command source. Binds the WebSocket listener
/// and returns a stream of render requests plus the quit sink. Errors
/// if the port cannot be bound (mirroring the Qt `qFatal` on listen
/// failure, but surfaced as a `Result` so the caller can retry or exit).
pub async fn coordinator(
    cfg: CoordinatorConfig,
) -> Result<(RequestStream, QuitSink), HacklilyError> {
    let (quit_sink, quit_stream) = tokio::sync::mpsc::channel::<QuitSignal>(50);
    let parent_quit_sink = quit_sink.clone();

    let listener = TcpListener::bind((cfg.bind_address, cfg.ws_port))
        .await
        .map_err(|e| HacklilyError::CommandSourceError(format!("bind failed: {}", e)))?;
    info!("coordinator listening on {}:{}", cfg.bind_address, cfg.ws_port);

    let conn = ConnState { status: cfg.status.clone() };
    let github: Arc<dyn GitHub> = Arc::new(auth::ReqwestGitHub::new().map_err(|e| {
        HacklilyError::CommandSourceError(format!("could not build GitHub client: {}", e.message))
    })?);

    let (req_tx, req_rx) = tokio::sync::mpsc::channel::<
        Result<(RenderRequest, ResponseCallback), HacklilyError>,
    >(100);

    // Spawn the accept loop. It owns the listener and spawns one task
    // per connection. Cancellation is via the quit stream: when the
    // quit sink fires, the select below exits and the listener drops.
    let mut quit = Box::pin(ReceiverStream::new(quit_stream));
    let conn_acc_loop = conn.clone();
    let github_acc_loop = github.clone();
    let cfg_acc_loop = cfg.clone();
    let req_tx_acc_loop = req_tx.clone();

    tokio::spawn(async move {
        loop {
            // Accept a new connection or quit, whichever comes first.
            let next = futures::future::select(
                Box::pin(listener.accept()),
                quit.next(),
            );
            match next.await {
                futures::future::Either::Left((Ok((stream, addr)), _quit)) => {
                    debug!("coordinator: new connection from {}", addr);
                    let conn = conn_acc_loop.clone();
                    let github = github_acc_loop.clone();
                    let cfg = cfg_acc_loop.clone();
                    let req_tx = req_tx_acc_loop.clone();
                    tokio::spawn(handle_connection(
                        stream,
                        conn,
                        github,
                        cfg,
                        req_tx,
                    ));
                }
                futures::future::Either::Left((Err(e), _quit)) => {
                    error!("coordinator: accept failed: {}", e);
                    break;
                }
                futures::future::Either::Right((_quit_ev, _accept)) => {
                    info!("coordinator: quit received, shutting down listener");
                    break;
                }
            }
        }
        info!("coordinator: accept loop exiting");
    });

    // The render-request stream feeds the event loop. The quit stream
    // is consumed by the accept loop above; the event loop observes
    // command-source death via the standard `CommandSourceDead` event
    // when this stream ends (on drop of `req_tx`).
    let request_stream: RequestStream = Box::new(ReceiverStream::new(req_rx));
    Ok((request_stream, parent_quit_sink))
}

/// Handle a single WebSocket connection. Determines whether it is a
/// frontend client or a remote worker by the first JSON-RPC message,
/// then dispatches accordingly.
async fn handle_connection(
    raw_stream: tokio::net::TcpStream,
    conn: ConnState,
    github: Arc<dyn GitHub>,
    cfg: CoordinatorConfig,
    req_tx: tokio::sync::mpsc::Sender<Result<(RenderRequest, ResponseCallback), HacklilyError>>,
) {
    let mut ws = match tokio_tungstenite::accept_async(raw_stream).await {
        Ok(ws) => ws,
        Err(e) => {
            warn!("coordinator: ws handshake failed: {}", e);
            return;
        }
    };

    // First message determines the role.
    let first = match ws.next().await {
        Some(Ok(tokio_tungstenite::tungstenite::Message::Text(t))) => t,
        Some(Ok(_)) => {
            debug!("coordinator: ignoring non-text first message");
            return;
        }
        Some(Err(e)) => {
            warn!("coordinator: recv error on first message: {}", e);
            return;
        }
        None => return,
    };

    let req = match first.parse::<Request>() {
        Ok(r) => r,
        Err(err) => {
            let resp = *err;
            let _ = ws.send(tokio_tungstenite::tungstenite::Message::Text(resp.serialize())).await;
            return;
        }
    };

    if req.method == method::I_HAZ_COMPUTES {
        handle_worker(ws, req, cfg.workers.clone()).await;
    } else {
        handle_frontend_first(ws, req, conn, github, cfg, req_tx).await;
    }
}

/// Handle a worker connection. A worker announces itself with
/// `i_haz_computes` and then receives `render` requests dispatched by
/// `State` via the registry. Render responses arrive as JSON-RPC
/// responses keyed by request id and are routed back through the
/// registry to the originating frontend callback.
async fn handle_worker(
    mut ws: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    req: Request,
    workers: crate::worker_registry::WorkerRegistryHandle,
) {
    let params: IHazComputesParams = match serde_json::from_value(req.params.clone()) {
        Ok(p) => p,
        Err(e) => {
            let resp = Response::error(req.id, jsonrpc::STDERR_INVALID_PARAMS, &e.to_string());
            let _ = ws
                .send(tokio_tungstenite::tungstenite::Message::Text(resp.serialize()))
                .await;
            return;
        }
    };
    info!("coordinator: worker registered (max_jobs={})", params.max_jobs);

    // Split so the sink can be shared with the registry for dispatch.
    let (sink, mut stream) = ws.split();
    let sink: SharedSink = Arc::new(tokio::sync::Mutex::new(Box::new(TungsteniteSink(sink))));
    let worker_id = Uuid::new_v4().to_string();
    workers
        .register_worker(worker_id.clone(), params.max_jobs, sink.clone())
        .await;

    // No handshake ack is sent: the `ws-worker` client does not wait for
    // one (it starts processing the inbound stream immediately and only
    // acts on `render` requests). Sending a JSON-RPC response here would
    // just surface as a warn-level parse failure on the worker.

    // Drain render responses from the worker until it disconnects.
    while let Some(msg) = stream.next().await {
        match msg {
            Ok(tokio_tungstenite::tungstenite::Message::Text(t)) => {
                // Workers send JSON-RPC responses (result/error) keyed
                // by the request id. Parse and deliver to the registry.
                match serde_json::from_str::<serde_json::Value>(&t) {
                    Ok(v) => {
                        if let Some(id) = v.get("id").and_then(|i| i.as_str()) {
                            let result = match v.get("result") {
                                Some(r) => serde_json::from_value::<RenderResponse>(r.clone())
                                    .unwrap_or_else(|_| RenderResponse {
                                        files: vec![],
                                        logs: "Could not parse worker response".to_owned(),
                                        midi: String::new(),
                                    }),
                                None => {
                                    let message = v
                                        .get("error")
                                        .and_then(|e| e.get("message"))
                                        .and_then(|m| m.as_str())
                                        .unwrap_or("worker error")
                                        .to_owned();
                                    RenderResponse {
                                        files: vec![],
                                        logs: message,
                                        midi: String::new(),
                                    }
                                }
                            };
                            workers.handle_response(id, result).await;
                        } else {
                            warn!("coordinator: worker message with no id: {}", t);
                        }
                    }
                    Err(e) => {
                        warn!("coordinator: could not parse worker message: {}", e);
                    }
                }
            }
            Ok(tokio_tungstenite::tungstenite::Message::Ping(p)) => {
                let _ = {
                    let mut g = sink.lock().await;
                    g.send_pong(p).await
                };
            }
            Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => break,
            Ok(_) => {}
            Err(e) => {
                warn!("coordinator: worker stream error: {}", e);
                break;
            }
        }
    }
    workers.unregister_worker(&worker_id).await;
    info!("coordinator: worker disconnected");
}

/// Handle the first message of a frontend connection (which was
/// already read by `handle_connection` to determine the role), then
/// continue reading subsequent messages from the same socket.
async fn handle_frontend_first(
    ws: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    first_req: Request,
    conn: ConnState,
    github: Arc<dyn GitHub>,
    cfg: CoordinatorConfig,
    req_tx: tokio::sync::mpsc::Sender<Result<(RenderRequest, ResponseCallback), HacklilyError>>,
) {
    // Split the stream so we can clone the sink for response callbacks.
    let (sink, stream) = ws.split();
    let sink: SharedSink = Arc::new(tokio::sync::Mutex::new(Box::new(TungsteniteSink(sink))));

    // Track this frontend connection in the live active-user count.
    // Workers don't go through this path, so only frontend clients
    // are counted (matching the Qt `_sockets` map).
    let snap = conn.status.snapshot();
    snap.active_users.fetch_add(1, Ordering::Relaxed);

    // Process the already-read first message, then the rest.
    if let Err(e) = dispatch_frontend_message(
        first_req,
        sink.clone(),
        &conn,
        github.clone(),
        &cfg,
        &req_tx,
    )
    .await
    {
        warn!("coordinator: error processing first message: {:?}", e);
        snap.active_users.fetch_sub(1, Ordering::Relaxed);
        return;
    }

    let mut stream = stream;
    while let Some(msg) = stream.next().await {
        match msg {
            Ok(tokio_tungstenite::tungstenite::Message::Text(t)) => {
                let req = match t.parse::<Request>() {
                    Ok(r) => r,
                    Err(err) => {
                        let resp = *err;
                        let _ = send_text(sink.clone(), resp.serialize()).await;
                        continue;
                    }
                };
                if let Err(e) =
                    dispatch_frontend_message(req, sink.clone(), &conn, github.clone(), &cfg, &req_tx).await
                {
                    warn!("coordinator: error processing message: {:?}", e);
                    // Keep going — one bad request shouldn't kill the session.
                }
            }
            Ok(tokio_tungstenite::tungstenite::Message::Ping(p)) => {
                // Reply with a Pong frame (not Text). Browsers can't emit
                // WS pings, so this rarely fires for frontend sockets,
                // but correctness matters and tungstenite doesn't auto-pong.
                let mut g = sink.lock().await;
                let _ = g.send_pong(p).await;
            }
            Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => break,
            Ok(_) => {}
            Err(e) => {
                warn!("coordinator: frontend stream error: {}", e);
                break;
            }
        }
    }
    snap.active_users.fetch_sub(1, Ordering::Relaxed);
    debug!("coordinator: frontend connection closed");
}

/// Dispatch one frontend JSON-RPC message. Non-render methods are
/// handled inline; `render` is forwarded to the render-request
/// channel as a `(RenderRequest, ResponseCallback)` pair.
async fn dispatch_frontend_message(
    req: Request,
    sink: SharedSink,
    conn: &ConnState,
    github: Arc<dyn GitHub>,
    cfg: &CoordinatorConfig,
    req_tx: &tokio::sync::mpsc::Sender<Result<(RenderRequest, ResponseCallback), HacklilyError>>,
) -> Result<(), AuthError> {
    match req.method.as_str() {
        method::PING => {
            let resp = Response::success(req.id, json!("pong"));
            let _ = send_text(sink, resp.serialize()).await;
        }
        method::NOTIFY_SAVED => {
            ConnState::bump(&conn.status.snapshot().analytics_saves);
            let resp = Response::success(req.id, json!("ok"));
            let _ = send_text(sink, resp.serialize()).await;
        }
        method::RENDER => {
            let params: RenderParams = match serde_json::from_value(req.params.clone()) {
                Ok(p) => p,
                Err(e) => {
                    let resp = Response::error(req.id, jsonrpc::STDERR_INVALID_PARAMS, &e.to_string());
                    let _ = send_text(sink, resp.serialize()).await;
                    return Ok(());
                }
            };
            if params.src.is_empty() {
                let resp = Response::error(req.id, jsonrpc::STDERR_INVALID_PARAMS, "src must not be empty");
                let _ = send_text(sink, resp.serialize()).await;
                return Ok(());
            }
            ConnState::bump(&conn.status.snapshot().analytics_renders);
            let rpc_id = req.id;
            let id = rpc_id.to_string();
            let request = RenderRequest {
                id,
                backend: params.backend,
                src: params.src,
                version: params.version,
            };
            let sink_cb = sink.clone();
            let cb: ResponseCallback = Box::new(move |response: RenderResponse| {
                let sink = sink_cb.clone();
                let rpc_id = rpc_id.clone();
                tokio::spawn(async move {
                    let result = serde_json::to_value(&response).unwrap_or_else(|_| json!({}));
                    let resp = Response::success(rpc_id, result);
                    let _ = send_text(sink, resp.serialize()).await;
                });
            });
            if req_tx.send(Ok((request, cb))).await.is_err() {
                let resp = Response::error(
                    Value::Null,
                    jsonrpc::ERROR_INTERNAL,
                    "render queue closed",
                );
                let _ = send_text(sink, resp.serialize()).await;
            }
        }
        method::SIGN_IN => {
            let params = req.params.clone();
            let state = serde_json::from_value::<auth_sign_in_params::Params>(params);
            match auth::sign_in(
                github.as_ref(),
                &cfg.github_client_id,
                &cfg.github_secret,
                &state.as_ref().map(|p| p.code.clone()).unwrap_or_default(),
                &state.as_ref().map(|p| p.state.clone()).unwrap_or_default(),
            )
            .await
            {
                Ok(auth_obj) => {
                    ConnState::bump(&conn.status.snapshot().analytics_sign_in);
                    let resp = Response::success(req.id, serde_json::to_value(&auth_obj).unwrap());
                    let _ = send_text(sink, resp.serialize()).await;
                }
                Err(err) => {
                    let resp = Response {
                        jsonrpc: jsonrpc::JSONRPC_VERSION.to_owned(),
                        id: req.id,
                        result: None,
                        error: Some(err.into_error_object()),
                    };
                    let _ = send_text(sink, resp.serialize()).await;
                }
            }
        }
        method::SIGN_OUT => {
            let token = req
                .params
                .get("token")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            match auth::sign_out(github.as_ref(), &cfg.github_client_id, &cfg.github_secret, token).await {
                Ok(()) => {
                    let resp = Response::success(req.id, json!("OK"));
                    let _ = send_text(sink, resp.serialize()).await;
                }
                Err(err) => {
                    let resp = Response {
                        jsonrpc: jsonrpc::JSONRPC_VERSION.to_owned(),
                        id: req.id,
                        result: None,
                        error: Some(err.into_error_object()),
                    };
                    let _ = send_text(sink, resp.serialize()).await;
                }
            }
        }
        method::GET_STATUS => {
            let snap = conn.status.snapshot();
            let local_total = snap.local_total.load(Ordering::Relaxed);
            let local_busy = snap.local_busy.load(Ordering::Relaxed);
            let local_free = snap.local_free.load(Ordering::Relaxed);
            let remote_total = snap.remote_total.load(Ordering::Relaxed);
            let remote_busy = snap.remote_busy.load(Ordering::Relaxed);
            let remote_free = snap.remote_free.load(Ordering::Relaxed);
            let backlog = snap.backlog.load(Ordering::Relaxed);
            let active_users = snap.active_users.load(Ordering::Relaxed);
            let renders = snap.analytics_renders.load(Ordering::Relaxed);
            let saves = snap.analytics_saves.load(Ordering::Relaxed);
            let sign_in = snap.analytics_sign_in.load(Ordering::Relaxed);
            let total = local_total + remote_total;
            let busy = local_busy + remote_busy;
            let free = local_free + remote_free;
            let result = json!({
                "alive": total > 0,
                "total_worker_count": total,
                "local_worker_count": local_total,
                "remote_worker_count": remote_total,
                "busy_worker_count": busy,
                "free_worker_count": free,
                "backlog": backlog,
                "startup_time": conn.status.startup_time(),
                "uptime_secs": conn.status.uptime_secs(),
                "current_active_users": active_users,
                "analytics_renders": renders,
                "analytics_saves": saves,
                "analytics_sign_in": sign_in,
            });
            let resp = Response::success(req.id, result);
            let _ = send_text(sink, resp.serialize()).await;
        }
        other => {
            let resp = Response::error(
                req.id,
                jsonrpc::STDERR_METHOD_NOT_FOUND,
                &format!("unknown method: {}", other),
            );
            let _ = send_text(sink, resp.serialize()).await;
        }
    }
    Ok(())
}

/// Send a text message on a shared sink. The `Mutex` serializes sends
/// because `SinkExt::send` takes `&mut self`.
async fn send_text(sink: SharedSink, text: String) -> Result<(), HacklilyError> {
    let mut guard = sink.lock().await;
    guard
        .send_text(text)
        .await
        .map_err(|e| HacklilyError::CommandSourceError(format!("ws send failed: {}", e)))
}


// Helper module to deserialize signIn params without adding a public
// struct. Kept private to this module.
mod auth_sign_in_params {
    use serde::Deserialize;
    #[derive(Deserialize)]
    pub struct Params {
        #[serde(rename = "oauth")]
        pub code: String,
        pub state: String,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::Notify;

    #[tokio::test]
    async fn render_params_default_version_is_stable() {
        // Verifies the serde default for `version` matches the Qt
        // behaviour of treating omitted version as stable.
        let v: RenderParams = serde_json::from_str(r#"{"backend":"svg","src":"c4"}"#).expect("parse");
        assert_eq!(v.version, Version::Stable);
    }

    #[tokio::test]
    async fn render_params_explicit_unstable() {
        let v: RenderParams =
            serde_json::from_str(r#"{"backend":"pdf","src":"c4","version":"unstable"}"#).expect("parse");
        assert_eq!(v.version, Version::Unstable);
        assert_eq!(v.backend, Backend::Pdf);
    }

    #[tokio::test]
    async fn i_haz_computes_params_parses() {
        let p: IHazComputesParams =
            serde_json::from_str(r#"{"max_jobs":4}"#).expect("parse");
        assert_eq!(p.max_jobs, 4);
    }

    #[tokio::test]
    async fn status_handle_bumps_counters() {
        let status = StatusHandle::new();
        let v = StatusHandle::bump(&status.snapshot().analytics_renders);
        assert_eq!(v, 1);
        let v = StatusHandle::bump(&status.snapshot().analytics_renders);
        assert_eq!(v, 2);
    }

    #[tokio::test]
    async fn sign_in_params_deserialize() {
        let p: auth_sign_in_params::Params =
            serde_json::from_str(r#"{"oauth":"code123","state":"csrf"}"#).expect("parse");
        assert_eq!(p.code, "code123");
        assert_eq!(p.state, "csrf");
    }

    #[tokio::test]
    async fn coordinator_binds_and_quits_cleanly() {
        // Bind on an ephemeral port and immediately fire the quit sink.
        // This exercises the accept-loop shutdown path without needing
        // a real WebSocket client.
        let port = ephemeral_port();
        let cfg = CoordinatorConfig {
            bind_address: "127.0.0.1".parse().unwrap(),
            ws_port: port,
            github_client_id: String::new(),
            github_secret: String::new(),
            workers: crate::worker_registry::WorkerRegistryHandle::new(),
            status: StatusHandle::new(),
        };
        let (stream, quit_sink) = coordinator(cfg).await.expect("coordinator starts");

        // Fire quit; the accept loop should exit and the stream should
        // end (the event loop would see CommandSourceDead).
        let notify = Arc::new(Notify::new());
        let notify2 = notify.clone();
        tokio::spawn(async move {
            quit_sink.send(QuitSignal {}).await.ok();
            notify2.notify_one();
        });
        notify.notified().await;

        // Drain the stream to ensure it terminates cleanly.
        let mut s = stream;
        while s.next().await.is_some() {}
    }

    /// Find a free TCP port by binding to :0 and reading the assigned
    /// port. The listener is dropped so the coordinator can rebind.
    fn ephemeral_port() -> u16 {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind");
        listener.local_addr().expect("addr").port()
    }
}