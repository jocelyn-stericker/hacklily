/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2018 - present Joshua Netterfield <joshua@nettek.ca>
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
use std::future::Future;
use std::pin::Pin;
use tokio::prelude::Stream;
use tokio_channel::mpsc::Sender;

use crate::config::{CommandSourceConfig, Config};
use crate::error::Error;
use crate::request::{Request, Response};

mod batch;
mod test_runner;
mod ws_worker_client;

use self::batch::batch;
use self::test_runner::test_runner;
use self::ws_worker_client::ws_worker_client;

#[derive(Debug)]
pub struct QuitSignal {}

pub type ResponseCallback = Box<Fn(Response) -> () + Send + 'static>;
pub type QuitSink = Sender<QuitSignal>;

// Spurious.
#[allow(dead_code)]
pub type RequestStream =
    Box<Stream<Item = (Request, ResponseCallback), Error = Error> + Send + 'static>;

pub type FutureCommandSource =
    Pin<Box<Future<Output = Result<(RequestStream, QuitSink), Error>> + Send>>;

pub fn new(config: &Config) -> FutureCommandSource {
    match &config.command_source {
        CommandSourceConfig::Worker { coordinator } => {
            let worker_count = config.stable_worker_count + config.unstable_worker_count;
            Box::pinned(ws_worker_client(coordinator.clone(), worker_count))
        }
        CommandSourceConfig::Batch { path } => Box::pinned(batch(path.clone())),
        CommandSourceConfig::TestRunner { input, output } => {
            Box::pinned(test_runner(input.clone(), output.clone()))
        }
    }
}
