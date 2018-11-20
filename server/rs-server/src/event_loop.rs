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
use std::collections::{HashMap, VecDeque};
use std::time::Duration;
use tokio::prelude::*;
use tokio_channel::mpsc;
use url::Url;

use crate::renderer::{ReadyRenderContainer, RenderContainer, RendererMeta};
use crate::renderer_manager;
use crate::request::{Request, Response, Version};

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash, Clone)]
pub enum CommandSource {
    #[serde(with = "url_serde")]
    Worker { coordinator: Url },
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash, Clone)]
pub struct Config {
    pub stable_docker_tag: String,
    pub stable_worker_count: u64,

    pub unstable_docker_tag: String,
    pub unstable_worker_count: u64,

    pub render_timeout_msec: u64,
    pub command_source: CommandSource,
}

enum Event {
    QueueRequest(Request, Box<Fn(Response) -> () + Send + 'static>),
    ManagerEvent(renderer_manager::Event),
    CommandSourceReady(
        Box<
            Sink<
                    SinkItem = crate::ws_worker_client::QuitSignal,
                    SinkError = tokio_channel::mpsc::SendError<crate::ws_worker_client::QuitSignal>,
                > + Send,
        >,
    ),
    GracefullyQuit,
}

struct EventLoopState {
    stopping: bool,
    ready_containers: HashMap<Version, VecDeque<ReadyRenderContainer>>,
    total_containers: i8,
    renderer_manager_command_sender: mpsc::Sender<renderer_manager::Command>,
    event_sender: mpsc::Sender<Event>,
    pending_requests:
        HashMap<Version, VecDeque<(Request, Box<Fn(Response) -> () + Send + 'static>)>>,
    command_source_quit_sink: Option<
        Box<
            Sink<
                    SinkItem = crate::ws_worker_client::QuitSignal,
                    SinkError = tokio_channel::mpsc::SendError<crate::ws_worker_client::QuitSignal>,
                > + Send,
        >,
    >,
}

impl EventLoopState {
    fn create_container(
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
        };

        self.renderer_manager_command_sender
            .clone()
            .send(renderer_manager::Command::CreateContainer(meta))
            .wait()
            .expect("Could not queue creation of renderer.");

        self.total_containers += 1;
    }

    fn gracefully_quit(&mut self) {
        info!("Got quit request");

        if !self.stopping {
            println!("QUITTING: Completing in-flight requests and terminating containers.");

            self.stopping = true;

            let ready_containers = std::mem::replace(&mut self.ready_containers, HashMap::new());

            // Create in-flight requests for our own cleanup!
            self.renderer_manager_command_sender
                .clone()
                .send(renderer_manager::Command::Shutdown)
                .wait()
                .expect("Could not sent shutdown event.");

            for containers in ready_containers {
                for container in containers.1 {
                    self.renderer_manager_command_sender
                        .clone()
                        .send(renderer_manager::Command::ReceiveContainer(
                            RenderContainer::Ready(container),
                        ))
                        .wait()
                        .expect("Could not send container to shut down");
                }
            }

            // Terminate command source
            if let Some(quit_sink) = self.command_source_quit_sink.take() {
                if let Err(err) = quit_sink
                    .send(crate::ws_worker_client::QuitSignal {})
                    .wait()
                {
                    error!("Could not send command to stop command source: {:?}", err);
                    error!("Maybe it's already dead?");
                }
            }
        } else {
            println!("QUITTING: Still cleaning up...");
        }
    }

    fn handle_request(
        &mut self,
        request: Request,
        response_cb: Box<Fn(Response) -> () + Send + 'static>,
    ) {
        if self.stopping {
            warn!("Not registering a new request, because we're shutting down.");
            return;
        }

        self.pending_requests
            .entry(request.version)
            .or_insert_with(|| VecDeque::new())
            .push_back((request, response_cb));

        self.process_if_possible();
    }

    fn handle_manager_event(&mut self, clean_event: renderer_manager::Event) {
        match clean_event {
            renderer_manager::Event::ContainerReady(container) => {
                if self.stopping {
                    self.renderer_manager_command_sender
                        .clone()
                        .send(renderer_manager::Command::ReceiveContainer(
                            RenderContainer::Ready(container),
                        ))
                        .wait()
                        .expect("Could not send container to manager.");
                } else {
                    self.ready_containers
                        .entry(container.meta.version)
                        .or_insert_with(|| VecDeque::new())
                        .push_back(container);

                    self.process_if_possible();
                }
            }
            renderer_manager::Event::ContainerTerminated => {
                self.total_containers -= 1;
            }
            renderer_manager::Event::Fatal => {
                self.total_containers -= 1;
                error!("Cannot create a new container, so something must be very wrong.");
                error!("FATAL: quitting");
                self.gracefully_quit();
            }
        }
    }

    fn process_if_possible(&mut self) {
        for (version, pending_requests) in self.pending_requests.iter_mut() {
            let ready_containers = self
                .ready_containers
                .entry(*version)
                .or_insert_with(|| VecDeque::new());

            if pending_requests.len() < 1 || ready_containers.len() < 1 {
                return;
            }

            let (request, response_cb) = pending_requests.pop_front().expect("len checked above");
            let container = ready_containers.pop_front().expect("len checked above");
            let timeout = Duration::from_millis(container.meta.timeout);

            let (render_container, result) = container.handle_request(request, timeout);
            self.renderer_manager_command_sender
                .clone()
                .send(renderer_manager::Command::ReceiveContainer(
                    render_container,
                ))
                .wait()
                .expect("Could not send container to manager.");

            tokio::spawn_async(
                async move {
                    let render_result = await!(result);
                    response_cb(render_result);
                },
            );
        }
    }
    fn handle_command_source_ready(
        &mut self,
        sink: Box<
            Sink<
                    SinkItem = crate::ws_worker_client::QuitSignal,
                    SinkError = tokio_channel::mpsc::SendError<crate::ws_worker_client::QuitSignal>,
                > + Send,
        >,
    ) {
        if self.stopping {
            if let Err(e) = sink.send(crate::ws_worker_client::QuitSignal {}).wait() {
                error!("Could not send command to stop command source: {:?}", e);
                error!("Maybe it's already dead?");
            }
        } else {
            self.command_source_quit_sink = Some(sink);
        }
    }
}

pub async fn event_loop(config: Config) -> () {
    let (event_sender, event_receiver) = mpsc::channel::<Event>(50);
    let event_receiver =
        event_receiver.or_else(|_| Err(std::io::Error::new(std::io::ErrorKind::Other, "no event")));

    let manager = renderer_manager::RendererManager::new();

    let mut state = EventLoopState {
        stopping: false,
        ready_containers: HashMap::new(),
        total_containers: 0,
        renderer_manager_command_sender: manager.command_sender,
        event_sender,
        pending_requests: HashMap::new(),
        command_source_quit_sink: None,
    };

    for i in 0..config.stable_worker_count {
        state.create_container(
            Version::Stable,
            config.stable_docker_tag.to_owned(),
            config.render_timeout_msec,
            i as i8,
        );
    }

    for i in 0..config.unstable_worker_count {
        state.create_container(
            Version::Unstable,
            config.unstable_docker_tag.to_owned(),
            config.render_timeout_msec,
            (config.stable_worker_count + i) as i8,
        );
    }

    let ctrl_c = await!(tokio_signal::ctrl_c())
        .unwrap()
        .map(|_| Event::GracefullyQuit);

    let manager_events = manager
        .event_receiver
        .map(|ev| Event::ManagerEvent(ev))
        .or_else(|_| {
            Err(std::io::Error::new(
                std::io::ErrorKind::BrokenPipe,
                "Cannot get renderer manager events",
            ))
        });

    {
        let event_sender = state.event_sender.clone();
        tokio::spawn_async(
            async move {
                match config.command_source {
                    CommandSource::Worker { coordinator } => {
                        match await!(crate::ws_worker_client::ws_worker_client(
                            coordinator,
                            config.stable_worker_count + config.unstable_worker_count
                        )) {
                            Err(error) => {
                                error!("Caught error: {}", error);
                                error!("FATAL: quitting");
                                await!(event_sender.send(Event::GracefullyQuit))
                                    .map(|_| ())
                                    .unwrap_or(());
                            }

                            Ok((mut request_stream, quit_sink)) => {
                                await!(event_sender
                                    .clone()
                                    .send(Event::CommandSourceReady(Box::new(quit_sink))))
                                .map(|_| ())
                                .unwrap_or(());

                                while let Some(request) = await!(request_stream.next()) {
                                    let event_sender = event_sender.clone();
                                    match request {
                                        Ok((request, response_cb)) => {
                                            await!(event_sender
                                                .send(Event::QueueRequest(request, response_cb)))
                                            .map(|_| ())
                                            .unwrap_or(());
                                        }
                                        Err(err) => {
                                            error!("Error from request stream: {:?}", err);
                                            error!("FATAL: quitting");
                                            // We suppress errors, because the receiver being
                                            // dropped is totally fine, and means we are quitting.
                                            await!(event_sender
                                                .clone()
                                                .send(Event::GracefullyQuit))
                                            .map(|_| ())
                                            .unwrap_or(());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        );
    }

    let mut events = ctrl_c.select(event_receiver).select(manager_events);

    while let Some(event_or_err) = await!(events.next()) {
        match event_or_err {
            Ok(event) => match event {
                // Container Management
                Event::QueueRequest(request, response_cb) => {
                    state.handle_request(request, response_cb);
                }
                Event::ManagerEvent(clean_event) => {
                    state.handle_manager_event(clean_event);
                }
                Event::GracefullyQuit => {
                    state.gracefully_quit();
                }
                Event::CommandSourceReady(quit_sink) => {
                    state.handle_command_source_ready(quit_sink);
                }
            },
            Err(err) => {
                warn!("got error from container {}", err);
            }
        };

        if state.stopping && state.total_containers == 0 {
            info!("Goodbye.");
            break;
        }
    }
}
