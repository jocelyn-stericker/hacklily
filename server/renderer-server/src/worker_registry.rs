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

// The worker registry tracks connected remote renderer workers and
// manages render dispatch to them. It replaces the Qt coordinator's
// `_freeWorkers` / `_busyWorkers` / `_remoteProcessingRequests` maps
// (`server/ws-server/hacklilyserver.cpp`).
//
// Remote workers are version-agnostic: the coordinator sends a render
// request with the `version` field in params, and the worker's own
// `RendererManager` (see `command_source/ws_worker_client.rs`) routes
// it to its stable or unstable pool. So the idle queue is a single
// deque, not per-version. Each worker connection contributes `max_jobs`
// slots to the idle queue, matching the Qt behaviour of pushing the
// socket N times into `_freeWorkers`.
//
// The registry is shared between the coordinator (which manages worker
// connections and responses) and `State` (which dispatches renders).
// `WorkerRegistryHandle` is a cheap `Arc` clone suitable for passing
// into `State::new`.
use log::{debug, info, warn};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use tokio::sync::Mutex;

use crate::command_source::ResponseCallback;
use crate::jsonrpc;
use crate::request::{Request, Response as RenderResponse};

/// A cloneable handle to the worker registry. Cheap to clone (the
/// inner state is behind an `Arc<Mutex<...>>`). Used by `State` to
/// dispatch renders to remote workers and by the coordinator to
/// register/unregister workers and deliver responses.
#[derive(Clone)]
pub struct WorkerRegistryHandle {
    inner: Arc<Mutex<WorkerRegistryState>>,
}

struct WorkerRegistryState {
    /// Idle worker slots. Each slot is a sink that can receive one
    /// render request. When a worker connects with `max_jobs=N`, we
    /// push N slots. When a slot is dispatched, it's removed from the
    /// deque; when the response arrives, a new slot for the same
    /// worker is pushed back.
    idle: VecDeque<WorkerSlot>,
    /// Pending render requests keyed by request id, awaiting a
    /// response from a remote worker. Stored so we can deliver the
    /// response to the originating frontend callback and return the
    /// slot to the idle queue.
    pending: HashMap<String, PendingRemote>,
    /// Metadata for each connected worker, keyed by worker id. Used
    /// for cleanup on disconnect: all idle slots for the worker are
    /// drained, and all pending requests for the worker are failed.
    workers: HashMap<String, WorkerMeta>,
}

struct WorkerSlot {
    worker_id: String,
}

struct PendingRemote {
    callback: ResponseCallback,
    worker_id: String,
}

struct WorkerMeta {
    sink: crate::command_source::SharedSink,
}

impl WorkerRegistryState {
    fn new() -> Self {
        WorkerRegistryState {
            idle: VecDeque::new(),
            pending: HashMap::new(),
            workers: HashMap::new(),
        }
    }
}

impl Default for WorkerRegistryHandle {
    fn default() -> Self {
        WorkerRegistryHandle::new()
    }
}

impl WorkerRegistryHandle {
    pub fn new() -> Self {
        WorkerRegistryHandle {
            inner: Arc::new(Mutex::new(WorkerRegistryState::new())),
        }
    }

    /// Number of currently-registered workers (not slots). Used by
    /// `State` for the "fail if no renderers attached" check and by
    /// `get_status`.
    pub async fn worker_count(&self) -> usize {
        self.inner.lock().await.workers.len()
    }

    /// Number of idle worker slots available for dispatch.
    pub async fn idle_slot_count(&self) -> usize {
        self.inner.lock().await.idle.len()
    }

    /// Number of in-flight render requests on remote workers.
    pub async fn busy_slot_count(&self) -> usize {
        self.inner.lock().await.pending.len()
    }

    /// Register a new worker. Adds `max_jobs` slots to the idle queue.
    /// Called by the coordinator when a worker sends `i_haz_computes`.
    pub async fn register_worker(
        &self,
        worker_id: String,
        max_jobs: u64,
        sink: crate::command_source::SharedSink,
    ) {
        let mut state = self.inner.lock().await;
        state.workers.insert(worker_id.clone(), WorkerMeta { sink });
        for _ in 0..max_jobs {
            state.idle.push_back(WorkerSlot {
                worker_id: worker_id.clone(),
            });
        }
        info!(
            "registered worker {} (max_jobs={}, total idle={})",
            worker_id,
            max_jobs,
            state.idle.len(),
        );
    }

    /// Unregister a worker (on disconnect). Drains all idle slots for
    /// the worker and fails all its pending requests with an
    /// "internal error: worker died" response, mirroring the Qt
    /// `_removeWorker`.
    pub async fn unregister_worker(&self, worker_id: &str) {
        let mut state = self.inner.lock().await;
        state.workers.remove(worker_id);

        // Remove idle slots for this worker.
        let before = state.idle.len();
        state.idle.retain(|slot| slot.worker_id != worker_id);
        let removed_idle = before - state.idle.len();

        // Fail all pending requests for this worker.
        let failed_ids: Vec<String> = state
            .pending
            .iter()
            .filter(|(_, p)| p.worker_id == worker_id)
            .map(|(id, _)| id.clone())
            .collect();
        for id in &failed_ids {
            let pending = state.pending.remove(id).expect("checked above");
            let callback = pending.callback;
            // The callback spawns a tokio task that sends the error
            // back to the frontend, so invoking it here (while holding
            // the lock) is safe — the actual network send is async.
            callback(RenderResponse {
                files: vec![],
                logs: "Internal error: worker died".to_owned(),
                midi: String::new(),
            });
        }

        info!(
            "unregistered worker {} (removed {} idle slots, failed {} pending)",
            worker_id,
            removed_idle,
            failed_ids.len(),
        );
    }

    /// Try to dispatch a render request to an idle remote worker.
    /// Returns `Ok(())` if dispatched, or `Err((request, callback))`
    /// with the inputs back if no worker is idle or the send failed
    /// (so the caller can re-queue). Called by `State::process_if_possible`.
    pub async fn try_dispatch(
        &self,
        request: Request,
        callback: ResponseCallback,
    ) -> Result<(), (Request, ResponseCallback)> {
        let mut state = self.inner.lock().await;

        let slot = match state.idle.pop_front() {
            Some(s) => s,
            None => return Err((request, callback)),
        };

        // Look up the sink for this worker.
        let sink = match state.workers.get(&slot.worker_id) {
            Some(meta) => meta.sink.clone(),
            None => {
                // The worker was unregistered between popping the slot
                // and now — shouldn't happen, but handle it.
                state.idle.push_back(slot);
                return Err((request, callback));
            }
        };

        // Build the JSON-RPC render request to send to the worker.
        // The worker's `ws_worker_client` expects this format (see
        // `WsWorkerMethod::Render` in `command_source/ws_worker_client.rs`).
        let render_params = serde_json::json!({
            "backend": request.backend,
            "src": request.src,
            "version": request.version,
        });
        let rpc_request = jsonrpc::Request {
            jsonrpc: jsonrpc::JSONRPC_VERSION.to_owned(),
            id: serde_json::json!(&request.id),
            method: jsonrpc::method::RENDER.to_owned(),
            params: render_params,
        };
        let text = serde_json::to_string(&rpc_request)
            .expect("render request is always serializable");

        let worker_id = slot.worker_id.clone();
        let request_id = request.id.clone();

        // Release the registry lock before sending.
        drop(state);

        {
            let mut sink_guard = sink.lock().await;
            if let Err(e) = sink_guard.send_text(text).await {
                warn!("could not send render to worker {}: {}", worker_id, e);
                // Could not dispatch — the worker is probably dead.
                // `unregister_worker` will handle cleanup when the
                // connection drops. Return the inputs so the caller
                // can re-queue.
                return Err((request, callback));
            }
        }

        // Re-acquire the lock to record the pending request.
        let mut state = self.inner.lock().await;
        state.pending.insert(
            request_id,
            PendingRemote {
                callback,
                worker_id: worker_id.clone(),
            },
        );
        debug!("dispatched render to worker {}", worker_id);
        Ok(())
    }

    /// Deliver a render response from a remote worker. Looks up the
    /// pending callback by request id, invokes it, and returns a new
    /// idle slot for the worker. Called by the coordinator when it
    /// receives a JSON-RPC response on a worker connection.
    pub async fn handle_response(&self, request_id: &str, response: RenderResponse) {
        let mut state = self.inner.lock().await;
        let pending = match state.pending.remove(request_id) {
            Some(p) => p,
            None => {
                warn!(
                    "received response for unknown request id {} (already completed or worker died?)",
                    request_id,
                );
                return;
            }
        };

        // Return a slot for this worker to the idle queue.
        state.idle.push_back(WorkerSlot {
            worker_id: pending.worker_id.clone(),
        });

        // Invoke the callback (it spawns its own async task to send
        // the response back to the frontend).
        (pending.callback)(response);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::command_source::{SendFut, SharedSink, WsSink};
    use crate::request::{Backend, Request, Version};

    /// A `WsSink` that records sent text messages into a `Mutex<Vec<String>>`
    /// so tests can assert on what was dispatched.
    struct FakeSink {
        sent: std::sync::Arc<std::sync::Mutex<Vec<String>>>,
    }

    impl WsSink for FakeSink {
        fn send_text(&mut self, text: String) -> SendFut<'_> {
            let sent = self.sent.clone();
            Box::pin(async move {
                sent.lock().unwrap().push(text);
                Ok(())
            })
        }
        fn send_pong(&mut self, _payload: Vec<u8>) -> SendFut<'_> {
            Box::pin(async { Ok(()) })
        }
    }

    fn discard_sink() -> SharedSink {
        Arc::new(tokio::sync::Mutex::new(Box::new(FakeSink {
            sent: std::sync::Arc::new(std::sync::Mutex::new(vec![])),
        })))
    }

    fn sample_request(id: &str) -> Request {
        Request {
            id: id.to_owned(),
            backend: Backend::Svg,
            src: "c4".to_owned(),
            version: Version::Stable,
        }
    }

    fn cb_noop() -> ResponseCallback {
        Box::new(|_r| {})
    }

    #[tokio::test]
    async fn try_dispatch_returns_err_when_no_workers() {
        let reg = WorkerRegistryHandle::new();
        let req = sample_request("r1");
        let cb = cb_noop();
        let err = match reg.try_dispatch(req, cb).await {
            Err(e) => e,
            Ok(_) => panic!("expected dispatch to fail with no workers"),
        };
        assert_eq!(err.0.id, "r1");
    }

    #[tokio::test]
    async fn register_then_dispatch_succeeds() {
        let reg = WorkerRegistryHandle::new();
        reg.register_worker("w1".into(), 2, discard_sink()).await;
        assert_eq!(reg.worker_count().await, 1);
        assert_eq!(reg.idle_slot_count().await, 2);

        let req = sample_request("r2");
        match reg.try_dispatch(req, cb_noop()).await {
            Ok(()) => {}
            Err(_) => panic!("dispatch should succeed with idle worker"),
        }
        assert_eq!(reg.idle_slot_count().await, 1);
        assert_eq!(reg.busy_slot_count().await, 1);
    }

    #[tokio::test]
    async fn handle_response_returns_slot_and_invokes_callback() {
        let reg = WorkerRegistryHandle::new();
        reg.register_worker("w1".into(), 1, discard_sink()).await;

        let req = sample_request("r3");
        match reg.try_dispatch(req, cb_noop()).await {
            Ok(()) => {}
            Err(_) => panic!("dispatch ok"),
        }

        let rendered = RenderResponse {
            files: vec!["svg".into()],
            logs: "ok".into(),
            midi: String::new(),
        };
        reg.handle_response("r3", rendered).await;
        assert_eq!(reg.busy_slot_count().await, 0);
        assert_eq!(reg.idle_slot_count().await, 1);
    }

    #[tokio::test]
    async fn unregister_worker_fails_pending() {
        let reg = WorkerRegistryHandle::new();
        reg.register_worker("w1".into(), 1, discard_sink()).await;
        let req = sample_request("r4");
        match reg.try_dispatch(req, cb_noop()).await {
            Ok(()) => {}
            Err(_) => panic!("dispatch ok"),
        }
        assert_eq!(reg.busy_slot_count().await, 1);

        reg.unregister_worker("w1").await;
        assert_eq!(reg.worker_count().await, 0);
        assert_eq!(reg.busy_slot_count().await, 0);
        assert_eq!(reg.idle_slot_count().await, 0);
    }

    #[tokio::test]
    async fn unregister_worker_drains_idle_slots() {
        let reg = WorkerRegistryHandle::new();
        reg.register_worker("w1".into(), 3, discard_sink()).await;
        assert_eq!(reg.idle_slot_count().await, 3);

        reg.unregister_worker("w1").await;
        assert_eq!(reg.idle_slot_count().await, 0);
    }
}