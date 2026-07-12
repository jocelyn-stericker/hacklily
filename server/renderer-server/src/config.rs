// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2018-present Jocelyn Stericker <jocelyn@nettek.ca>
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use url::Url;

use super::request::{Request, Response};
use crate::status::StatusHandle;
use crate::worker_registry::WorkerRegistryHandle;

#[derive(Clone)]
pub enum CommandSourceConfig {
    Worker {
        coordinator: Url,
    },

    Batch {
        path: PathBuf,
    },

    TestRunner {
        input: Vec<Request>,
        output: Arc<Mutex<HashMap<String, Response>>>,
    },

    /// Coordinator mode: serve the frontend over WebSocket, with an
    /// optional local render pool. `ws_port` is shared by frontend
    /// clients and remote `ws-worker` peers. `bind_address` is the
    /// interface to listen on — `127.0.0.1` by default so the plain
    /// `ws://` listener is only reachable from the local TLS-terminating
    /// reverse proxy; set `0.0.0.0` only if you have no proxy and accept
    /// that the listener is unencrypted. `workers` is the shared
    /// registry used to dispatch renders to remote workers. `status`
    /// is the shared live-state snapshot backing `get_status`.
    Coordinator {
        bind_address: std::net::IpAddr,
        ws_port: u16,
        github_client_id: String,
        github_secret: String,
        workers: WorkerRegistryHandle,
        status: StatusHandle,
    },
}

#[derive(Clone)]
pub struct Config {
    pub stable_docker_tag: String,
    pub stable_worker_count: u64,

    pub unstable_docker_tag: String,
    pub unstable_worker_count: u64,

    pub render_timeout_msec: u64,
    pub command_source: CommandSourceConfig,
    /// Shared live-state snapshot for `get_status`. Present in every
    /// mode but only written/read in coordinator mode; the other
    /// modes simply never touch it.
    pub status: StatusHandle,
}
