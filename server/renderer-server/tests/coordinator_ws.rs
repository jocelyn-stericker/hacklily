#![warn(clippy::all)]
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

// End-to-end test of the coordinator WebSocket dispatch path, using
// real tokio-tungstenite sockets but NO Docker: a fake worker connects,
// handshakes, and replies to a render; a fake frontend connects and
// sends a render. This exercises the code path the unit tests missed —
// in particular the worker-handshake wire format (must be JSON-RPC 2.0
// with a `jsonrpc` field) and the frontend->coordinator->worker->
// coordinator->frontend round trip.
//
// The local render pool is sized to zero, so renders MUST be dispatched
// to the remote worker (pure-coordinator mode).

extern crate renderer_lib;

use futures::{SinkExt, StreamExt};
use renderer_lib::{
    event_loop, status::StatusHandle, worker_registry::WorkerRegistryHandle, CommandSourceConfig,
    Config,
};
use serde_json::{json, Value};
use std::sync::atomic::Ordering;
use std::time::Duration;
use tokio_tungstenite::tungstenite::Message;

/// Find a free TCP port by binding to :0 and dropping the listener.
fn ephemeral_port() -> u16 {
    let l = std::net::TcpListener::bind("127.0.0.1:0").expect("bind");
    l.local_addr().expect("addr").port()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn coordinator_dispatches_render_to_remote_worker_end_to_end() {
    let port = ephemeral_port();
    let status = StatusHandle::new();
    let workers = WorkerRegistryHandle::with_status(status.clone());

    let config = Config {
        stable_docker_tag: "unused-no-local-pool".to_owned(),
        stable_worker_count: 0,
        unstable_docker_tag: "unused-no-local-pool".to_owned(),
        unstable_worker_count: 0,
        render_timeout_msec: 8000,
        status: status.clone(),
        command_source: CommandSourceConfig::Coordinator {
            ws_port: port,
            github_client_id: String::new(),
            github_secret: String::new(),
            workers: workers.clone(),
            status: status.clone(),
        },
    };

    // Run the full event loop in the background. It binds the
    // coordinator listener and processes render requests. With zero
    // local containers it will dispatch to the remote worker. The
    // task is aborted when the test runtime drops at the end of the
    // test — no graceful shutdown needed.
    let _loop = tokio::spawn(event_loop(config));

    // Wait for the listener to bind.
    tokio::time::sleep(Duration::from_millis(150)).await;

    // --- Fake worker ---------------------------------------------------
    let (ws, _resp) = tokio_tungstenite::connect_async(format!("ws://127.0.0.1:{}", port))
        .await
        .expect("worker connect");
    let (mut w_sink, mut w_stream) = ws.split();

    // Send the handshake using the EXACT wire format that
    // `command_source/ws_worker_client.rs` emits: a JSON-RPC 2.0
    // request with method `i_haz_computes` and a Uuid-string id.
    // (An earlier version omitted `jsonrpc` and the coordinator
    // rejected every worker — this test pins the working shape.)
    let handshake = json!({
        "jsonrpc": "2.0",
        "id": "11111111-2222-3333-4444-555555555555",
        "method": "i_haz_computes",
        "params": { "max_jobs": 1 },
    });
    w_sink
        .send(Message::Text(handshake.to_string()))
        .await
        .expect("send handshake");

    // Wait for the coordinator to register the worker (published to
    // the shared status snapshot) before issuing a render, so the
    // fail-fast "no renderers attached" check passes.
    let registered = tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            if status.snapshot().remote_total.load(Ordering::Relaxed) >= 1 {
                return;
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    })
    .await;
    assert!(registered.is_ok(), "worker did not register in time");

    // Worker task: read the first render request and reply with a
    // JSON-RPC success response carrying a RenderResponse.
    let worker_task = tokio::spawn(async move {
        let mut replied = false;
        while let Some(msg) = w_stream.next().await {
            let text = match msg {
                Ok(Message::Text(t)) => t,
                _ => continue,
            };
            let v: Value = match serde_json::from_str(&text) {
                Ok(v) => v,
                Err(_) => continue,
            };
            if v["method"] == "render" {
                let id = v["id"].clone();
                let resp = json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "files": ["<svg xmlns=\"http://www.w3.org/2000/svg\"/>"],
                        "logs": "ok from fake worker",
                        "midi": "",
                    },
                });
                w_sink
                    .send(Message::Text(resp.to_string()))
                    .await
                    .expect("worker reply");
                replied = true;
                break;
            }
        }
        assert!(replied, "worker never received a render request");
    });

    // --- Fake frontend -------------------------------------------------
    let (fws, _resp) = tokio_tungstenite::connect_async(format!("ws://127.0.0.1:{}", port))
        .await
        .expect("frontend connect");
    let (mut f_sink, mut f_stream) = fws.split();

    let render = json!({
        "jsonrpc": "2.0",
        "id": "42",
        "method": "render",
        "params": { "backend": "svg", "src": "c4", "version": "stable" },
    });
    f_sink
        .send(Message::Text(render.to_string()))
        .await
        .expect("frontend send render");

    // Await the render response on the frontend socket.
    let resp_msg = tokio::time::timeout(Duration::from_secs(10), f_stream.next())
        .await
        .expect("frontend timed out waiting for render response")
        .expect("stream ended")
        .expect("ws error");
    let resp_text = match resp_msg {
        Message::Text(t) => t,
        other => panic!("expected text response, got {:?}", other),
    };
    let v: Value = serde_json::from_str(&resp_text).expect("parse response");
    assert_eq!(v["id"], json!("42"), "response id matches request");
    assert_eq!(
        v["result"]["logs"],
        json!("ok from fake worker"),
        "response carried the worker's result",
    );
    assert!(
        v["result"]["files"].is_array(),
        "response carried files",
    );

    // The worker task should have completed (it replied and broke out).
    worker_task
        .await
        .expect("worker task did not panic");

    // Sanity: the coordinator bumped the renders analytics counter.
    assert!(
        status.snapshot().analytics_renders.load(Ordering::Relaxed) >= 1,
        "analytics_renders was bumped",
    );
}