// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2018-present Jocelyn Stericker <jocelyn@nettek.ca>
use std::future::Future;
use std::pin::Pin;
use tokio::sync::mpsc::Sender;
use tokio_stream::Stream;

use crate::config::{CommandSourceConfig, Config};
use crate::error::HacklilyError;
use crate::request::{Request, Response};

#[allow(unused_imports)]
pub use self::coordinator::{coordinator, CoordinatorConfig, SendFut, SharedSink, WsSink};

mod batch;
mod coordinator;
mod test_runner;
mod ws_worker_client;

use self::batch::batch;
use self::test_runner::test_runner;
use self::ws_worker_client::ws_worker_client;

#[derive(Debug)]
pub struct QuitSignal {}

pub type ResponseCallback = Box<dyn Fn(Response) + Send + 'static>;
pub type QuitSink = Sender<QuitSignal>;

pub type RequestStream = Box<
    dyn Stream<Item = Result<(Request, ResponseCallback), HacklilyError>> + Send + Unpin + 'static,
>;

pub type FutureCommandSource =
    Pin<Box<dyn Future<Output = Result<(RequestStream, QuitSink), HacklilyError>> + Send>>;

pub fn new(config: &Config) -> FutureCommandSource {
    match &config.command_source {
        CommandSourceConfig::Worker { coordinator } => {
            let worker_count = config.stable_worker_count + config.unstable_worker_count;
            Box::pin(ws_worker_client(coordinator.clone(), worker_count))
        }
        CommandSourceConfig::Batch { path } => Box::pin(batch(path.clone())),
        CommandSourceConfig::TestRunner { input, output } => {
            Box::pin(test_runner(input.clone(), output.clone()))
        }
        CommandSourceConfig::Coordinator { .. } => {
            // The coordinator variant carries its config inside the
            // `CoordinatorConfig` itself; `new` delegates to it.
            match &config.command_source {
                CommandSourceConfig::Coordinator {
                    bind_address,
                    ws_port,
                    github_client_id,
                    github_secret,
                    workers,
                    status,
                } => Box::pin(coordinator(CoordinatorConfig {
                    bind_address: *bind_address,
                    ws_port: *ws_port,
                    github_client_id: github_client_id.clone(),
                    github_secret: github_secret.clone(),
                    workers: workers.clone(),
                    status: status.clone(),
                })),
                _ => unreachable!(),
            }
        }
    }
}
