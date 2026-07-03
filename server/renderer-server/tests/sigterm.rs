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

// Verifies that the `serve` coordinator exits gracefully on SIGTERM
// (the signal supervisors like systemd/k8s/`docker stop` send on
// stop/deploy), rather than being killed mid-request. The coordinator
// is started with zero local workers (no Docker needed) and a fresh
// ephemeral port; once it's listening we raise SIGTERM and assert the
// process drains and exits with status 0 within a generous bound.
//
// The signal is sent to a *child* process specifically so a timing slip
// can never take down the test runner.

use std::time::Duration;

/// Find a free TCP port by binding to :0 and dropping the listener.
fn ephemeral_port() -> u16 {
    let l = std::net::TcpListener::bind("127.0.0.1:0").expect("bind");
    l.local_addr().expect("addr").port()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn serve_exits_gracefully_on_sigterm() {
    let port = ephemeral_port();
    let bin = env!("CARGO_BIN_EXE_renderer_server");

    let mut cmd = tokio::process::Command::new(bin);
    cmd.args([
        "--stable-docker-tag", "dummy-sigterm-test",
        "--stable-worker-count", "0",
        "--unstable-docker-tag", "dummy-sigterm-test",
        "--unstable-worker-count", "0",
        "--render-timeout-msec", "8000",
        "serve",
        "--ws-port", &port.to_string(),
        "--github-client-id", "",
        "--github-secret", "",
    ])
    .kill_on_drop(true);

    let mut child = cmd.spawn().expect("could not spawn renderer_server");
    let pid = child.id().expect("child had no pid") as i32;

    // Wait until the coordinator is accepting connections on its WS port.
    let ready = tokio::time::timeout(Duration::from_secs(15), async {
        loop {
            if std::net::TcpStream::connect(("127.0.0.1", port)).is_ok() {
                return;
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    })
    .await;
    assert!(ready.is_ok(), "coordinator did not start listening in time");

    // Send SIGTERM — the deploy/stop signal a supervisor would send.
    unsafe {
        let rc = libc::kill(pid, libc::SIGTERM);
        assert_eq!(rc, 0, "kill(SIGTERM) failed");
    }

    // With zero containers in flight, graceful shutdown should be near-
    // instantaneous; allow a generous bound to absorb slow CI runners.
    let exited = tokio::time::timeout(Duration::from_secs(15), child.wait()).await;
    match exited {
        Ok(Ok(status)) => {
            assert!(
                status.success(),
                "coordinator did not exit cleanly on SIGTERM: {:?}",
                status,
            );
        }
        Ok(Err(e)) => panic!("error waiting for coordinator: {}", e),
        Err(_) => {
            // `kill_on_drop` will SIGKILL on drop; also be explicit.
            let _ = child.start_kill();
            panic!("coordinator did not exit within 15s of SIGTERM");
        }
    }
}