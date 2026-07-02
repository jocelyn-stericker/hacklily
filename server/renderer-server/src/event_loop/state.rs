/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2018 - present Jocelyn Stericker <jocelyn@nettek.ca>
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
use futures::future::FutureExt;
use log::{debug, error, info, warn};
use std::collections::{BinaryHeap, HashMap, VecDeque};
use std::panic::AssertUnwindSafe;
use std::time::Duration;
use tokio::sync::mpsc;

use crate::command_source::{QuitSignal, QuitSink, ResponseCallback};
use crate::config::{CommandSourceConfig, Config};
use crate::renderer::{ReadyRenderContainer, RenderContainer, RendererMeta};
use crate::renderer_manager::{Command, Event as RenderEvent};
use crate::request::{Request, Response as RenderResponse, Version};
use crate::worker_registry::WorkerRegistryHandle;

pub enum Event {
    QueueRequest(Request, ResponseCallback),
    Manager(Box<RenderEvent>),
    CommandSourceReady(QuitSink),
    CommandSourceFailedToStart,
    CommandSourceDead,
    GracefullyQuit,
}

pub struct State {
    stopping: bool,
    ready_containers: HashMap<Version, BinaryHeap<ReadyRenderContainer>>,
    total_containers: i8,
    renderer_manager_command_sender: mpsc::Sender<Command>,
    pending_requests: HashMap<Version, VecDeque<(Request, ResponseCallback)>>,
    command_source_quit_sink: Option<QuitSink>,
    command_source_was_created: bool,
    internal_sink: mpsc::Sender<Event>,
    /// Remote worker registry. `None` in worker/batch/test-runner
    /// modes; `Some` in coordinator mode, where it's used to dispatch
    /// renders to remote `ws-worker` peers when the local pool has no
    /// ready container for the requested version.
    workers: Option<WorkerRegistryHandle>,
}

impl State {
    pub async fn new(
        config: &Config,
        command_sender: mpsc::Sender<Command>,
    ) -> (Self, mpsc::Receiver<Event>) {
        let (internal_sink, internal_events) = mpsc::channel::<Event>(50);

        let mut state = State {
            stopping: false,
            ready_containers: HashMap::new(),
            total_containers: 0,
            renderer_manager_command_sender: command_sender,
            pending_requests: HashMap::new(),
            command_source_quit_sink: None,
            command_source_was_created: false,
            internal_sink,
            workers: match config.command_source {
                CommandSourceConfig::Coordinator { ref workers, .. } => Some(workers.clone()),
                _ => None,
            },
        };

        for i in 0..config.stable_worker_count {
            state
                .create_container(
                    Version::Stable,
                    config.stable_docker_tag.to_owned(),
                    config.render_timeout_msec,
                    i as i8,
                )
                .await;
        }

        for i in 0..config.unstable_worker_count {
            state
                .create_container(
                    Version::Unstable,
                    config.unstable_docker_tag.to_owned(),
                    config.render_timeout_msec,
                    (config.stable_worker_count + i) as i8,
                )
                .await;
        }

        (state, internal_events)
    }

    async fn create_container(
        &mut self,
        version: Version,
        image: String,
        render_timeout_msec: u64,
        id: i8,
    ) {
        if self.stopping {
            warn!("Not creating a new container, because we're shutting down.");
            return;
        }

        let meta = RendererMeta {
            id,
            image,
            version,
            timeout: render_timeout_msec,
            num_renders: 0,
        };

        self.renderer_manager_command_sender
            .clone()
            .send(Command::CreateContainer(meta))
            .await
            .expect("Could not queue creation of renderer.");

        self.total_containers += 1;
    }

    pub async fn gracefully_quit(&mut self) {
        info!("Got quit request");

        if !self.stopping {
            eprintln!("QUITTING: Completing in-flight requests and terminating containers.");

            self.stopping = true;

            let ready_containers = std::mem::take(&mut self.ready_containers);

            // Create in-flight requests for our own cleanup!
            self.renderer_manager_command_sender
                .clone()
                .send(Command::Shutdown)
                .await
                .expect("Could not sent shutdown event.");

            for containers in ready_containers {
                for container in containers.1.into_vec() {
                    self.renderer_manager_command_sender
                        .clone()
                        .send(Command::ReceiveContainer(RenderContainer::Ready(Box::new(
                            container,
                        ))))
                        .await
                        .expect("Could not send container to shut down");
                }
            }

            // Terminate command source
            if let Some(quit_sink) = self.command_source_quit_sink.take() {
                if quit_sink.send(QuitSignal {}).await.is_err() {
                    // It's probably already quitting.
                }
            }
        } else {
            eprintln!("QUITTING: Still cleaning up...");
        }
    }

    pub async fn handle_request(&mut self, request: Request, response_cb: ResponseCallback) {
        if self.stopping {
            warn!("Not registering a new request, because we're shutting down.");
            return;
        }

        // Fail fast if no renderers are attached: no local containers
        // (created or creating) and no remote workers. This matches the
        // "fail if there's no render servers attached" requirement.
        let has_local = self.total_containers > 0;
        let has_remote = match &self.workers {
            Some(w) => w.worker_count().await > 0,
            None => false,
        };
        if !has_local && !has_remote {
            let request_id = request.id.clone();
            (response_cb)(RenderResponse {
                files: vec![],
                logs: "No renderers attached: no local containers and no remote workers."
                    .to_owned(),
                midi: String::new(),
            });
            warn!("rejected render {}: no renderers attached", request_id);
            return;
        }

        self.pending_requests
            .entry(request.version)
            .or_insert_with(VecDeque::new)
            .push_back((request, response_cb));

        self.process_if_possible().await;
    }

    pub async fn handle_manager_event(&mut self, clean_event: RenderEvent) {
        match clean_event {
            RenderEvent::ContainerReady(container) => {
                if self.stopping {
                    self.renderer_manager_command_sender
                        .clone()
                        .send(Command::ReceiveContainer(RenderContainer::Ready(container)))
                        .await
                        .expect("Could not send container to manager.");
                } else {
                    self.ready_containers
                        .entry(container.meta.version)
                        .or_insert_with(BinaryHeap::new)
                        .push(*container);

                    self.process_if_possible().await;
                }
            }
            RenderEvent::ContainerTerminated => {
                self.total_containers -= 1;
            }
            RenderEvent::Fatal => {
                self.total_containers -= 1;
                error!("FATAL: renderer sent a fatal event, so something must be very wrong.");
                self.gracefully_quit().await;
            }
        }
    }

    pub async fn process_if_possible(&mut self) {
        for (version, pending_requests) in self.pending_requests.iter_mut() {
            let ready_containers = self
                .ready_containers
                .entry(*version)
                .or_insert_with(BinaryHeap::new);

            debug!(
                "Processing {:?}: pending: {} ready: {}",
                version,
                pending_requests.len(),
                ready_containers.len()
            );

            if pending_requests.is_empty() {
                continue;
            }

            // Prefer a local ready container if one is available.
            if !ready_containers.is_empty() {
                let (request, response_cb) = pending_requests.pop_front().expect("len checked above");
                let container = ready_containers.pop().expect("len checked above");
                let timeout = Duration::from_millis(container.meta.timeout);

                let (render_container, result) = container.handle_request(request.clone(), timeout);
                self.renderer_manager_command_sender
                    .clone()
                    .send(Command::ReceiveContainer(render_container))
                    .await
                    .expect("Could not send container to manager.");

                let emergency_command_sender = self.renderer_manager_command_sender.clone();
                let internal_sink = self.internal_sink.clone();

                tokio::spawn(async move {
                    let f = async move {
                        match result.await {
                            Ok(render_result) => {
                                response_cb(render_result);
                            }
                            Err(_) => {
                                internal_sink
                                    .send(Event::QueueRequest(request, response_cb))
                                    .await
                                    .map(|_| ())
                                    .unwrap_or(());
                            }
                        }
                    };
                    if AssertUnwindSafe(f).catch_unwind().await.is_err() {
                        error!("FATAL: panic in renderer");
                        emergency_command_sender
                            .send(Command::Abort)
                            .await
                            .map(|_| ())
                            .unwrap_or(());
                    }
                });
                continue;
            }

            // No local container for this version — try a remote
            // worker if we have one registered with an idle slot.
            // Pop first, then attempt dispatch; if dispatch fails,
            // push back so the request isn't lost.
            if let Some(workers) = &self.workers {
                if let Some((request, response_cb)) = pending_requests.pop_front() {
                    match workers.try_dispatch(request, response_cb).await {
                        Ok(()) => {}
                        Err((request, response_cb)) => {
                            // No idle worker or send failed; re-queue
                            // and stop trying this version for now.
                            pending_requests.push_front((request, response_cb));
                            break;
                        }
                    }
                }
            }
        }
    }
    pub async fn handle_command_source_ready(&mut self, sink: QuitSink) {
        if self.stopping {
            if sink.send(QuitSignal {}).await.is_err() {
                // It's probably already quitting...
            }
        } else {
            self.command_source_quit_sink = Some(sink);
            self.command_source_was_created = true;
        }
    }

    pub fn handle_command_source_dead(&mut self) {
        self.command_source_quit_sink = None;
    }

    /// Handle when a command source failed to initialize.
    ///
    /// Returns the duration we should delay before trying again, or None if we're going
    /// to terminate.
    pub async fn handle_command_source_failed_to_start(&mut self) -> Option<Duration> {
        if self.command_source_was_created {
            Some(Duration::from_millis(4000))
        } else {
            self.gracefully_quit().await;
            None
        }
    }

    pub fn is_done(&self) -> bool {
        self.stopping && self.total_containers == 0
    }
}
