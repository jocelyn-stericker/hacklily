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

// Optional HTTP endpoint that mirrors the WebSocket `get_status` RPC.
// Serves `GET /status` -> `application/json` from the shared
// `StatusSnapshot`, so monitoring scripts and the nginx reverse proxy
// can check coordinator health without opening a WebSocket connection.
//
// Runs as a tokio task spawned alongside the event loop. Only started
// when the `serve` subcommand receives `--http-status-port`.

use std::sync::atomic::Ordering;

use log::{debug, error, info, warn};
use serde_json::json;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use crate::status::StatusHandle;

/// Start the HTTP status listener on `127.0.0.1:<port>`. Spawns one
/// task per connection (cheap: each connection is a single request,
/// then we close). Never returns normally; the task is cancelled by
/// tokio when the event loop exits.
pub async fn serve(port: u16, status: StatusHandle) {
    let addr = format!("127.0.0.1:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            error!("HTTP status listener: failed to bind {}: {}", addr, e);
            return;
        }
    };
    info!("HTTP status endpoint listening on http://{}", addr);

    loop {
        match listener.accept().await {
            Ok((stream, peer)) => {
                debug!("HTTP status: connection from {}", peer);
                let status = status.clone();
                tokio::spawn(async move {
                    handle_connection(stream, status).await;
                });
            }
            Err(e) => error!("HTTP status listener: accept error: {}", e),
        }
    }
}

async fn handle_connection(mut stream: tokio::net::TcpStream, status: StatusHandle) {
    let mut buf = [0u8; 1024];
    let n = match stream.read(&mut buf).await {
        Ok(0) | Err(_) => return,
        Ok(n) => n,
    };

    let header = String::from_utf8_lossy(&buf[..n.min(200)]);

    let response = if header.starts_with("GET /status HTTP/") {
        let snap = status.snapshot();
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

        let body = json!({
            "alive": total > 0,
            "total_worker_count": total,
            "local_worker_count": local_total,
            "remote_worker_count": remote_total,
            "busy_worker_count": busy,
            "free_worker_count": free,
            "backlog": backlog,
            "startup_time": status.startup_time(),
            "uptime_secs": status.uptime_secs(),
            "current_active_users": active_users,
            "analytics_renders": renders,
            "analytics_saves": saves,
            "analytics_sign_in": sign_in,
        });
        let body_str = serde_json::to_string(&body).unwrap_or_else(|_| "{}".to_owned());
        format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body_str.len(),
            body_str
        )
    } else {
        "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".to_owned()
    };

    if let Err(e) = stream.write_all(response.as_bytes()).await {
        warn!("HTTP status: write error: {}", e);
    }
}
