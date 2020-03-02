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
use futures::future::FutureExt;
use futures::stream::{self, StreamExt};
use std::panic::AssertUnwindSafe;
use std::time::Duration;
use tokio::stream::Stream;
use tokio::sync::mpsc;
use tokio::time::delay_for;

use crate::command_source;
use crate::config::Config;
use crate::renderer_manager::RendererManager;

mod state;
use self::state::{Event, State};

fn init_and_attach_command_source(config: &Config) -> impl Stream<Item = Event> {
    let (mut event_sender, event_receiver) = mpsc::channel::<Event>(50);

    let make_worker_client = command_source::new(&config);

    tokio::spawn(async move {
        let mut emergency_event_sender = event_sender.clone();

        let f = async move {
            match make_worker_client.await {
                Err(error) => {
                    error!("Caught error: {}", error);
                    error!("Failed to start command source.");
                    event_sender
                        .send(Event::CommandSourceFailedToStart)
                        .await
                        .map(|_| ())
                        .unwrap_or(());
                }

                Ok((mut request_stream, quit_sink)) => {
                    event_sender
                        .clone()
                        .send(Event::CommandSourceReady(quit_sink))
                        .await
                        .map(|_| ())
                        .unwrap_or(());

                    let mut died_on_purpose = false;

                    while let Some(request) = request_stream.next().await {
                        let mut event_sender = event_sender.clone();
                        match request {
                            Ok((request, response_cb)) => {
                                event_sender
                                    .send(Event::QueueRequest(request, response_cb))
                                    .await
                                    .map(|_| ())
                                    .unwrap_or(());
                            }
                            Err(err) => {
                                error!("Error from request stream: {:?}", err);
                                error!("Closing request stream.");
                                // We suppress errors, because the receiver being
                                // dropped is totally fine.
                                event_sender
                                    .clone()
                                    .send(Event::CommandSourceDead)
                                    .await
                                    .map(|_| ())
                                    .unwrap_or(());

                                died_on_purpose = true;
                                break;
                            }
                        }
                    }

                    if !died_on_purpose {
                        // Send a potentially extraneous GracefullyQuit, in case we died.
                        event_sender
                            .send(Event::GracefullyQuit)
                            .await
                            .map(|_| ())
                            .unwrap_or(());
                    }
                }
            }
        };

        if AssertUnwindSafe(f).catch_unwind().await.is_err() {
            error!("FATAL: Command source init panicked.");
            emergency_event_sender
                .send(Event::GracefullyQuit)
                .await
                .map(|_| ())
                .unwrap_or(());
        }
    });

    event_receiver
}

pub async fn forward(
    mut stream: impl Stream<Item = Event> + Unpin,
    mut command_source_sink: mpsc::Sender<Event>,
) {
    while let Some(msg) = stream.next().await {
        if let Err(_x) = command_source_sink.send(msg).await {
            panic!("Cannot forward msg");
        }
    }
}

async fn spin_up_new_source(
    command_source_sink: mpsc::Sender<Event>,
    source: impl Stream<Item = Event> + Send + Unpin + 'static,
    delay: Duration,
) {
    tokio::spawn(delay_for(delay).then(move |_| forward(source, command_source_sink)));
}

pub async fn event_loop(config: Config) {
    let manager = RendererManager::new();
    let (mut state, internal_events) = State::new(&config, manager.command_sender).await;

    let ctrl_c = Box::pin(tokio::signal::ctrl_c())
        .map(|_| Event::GracefullyQuit)
        .into_stream();

    let manager_events = manager
        .event_receiver
        .map(Box::new)
        .map(Event::ManagerEvent);

    let (command_source_sink, command_source_events) = mpsc::channel::<Event>(50);
    // We may attach another stream in the future if this dies, so we forward it to
    // an mpsc.
    let source = init_and_attach_command_source(&config);

    spin_up_new_source(
        command_source_sink.clone(),
        source,
        Duration::from_millis(0),
    )
    .await;

    let events = stream::select(command_source_events, ctrl_c);
    let events = stream::select(events, manager_events);
    let mut events = stream::select(events, internal_events);

    while let Some(event) = events.next().await {
        match event {
            // Container Management
            Event::QueueRequest(request, response_cb) => {
                info!("Queueing request");
                state.handle_request(request, response_cb).await;
            }
            Event::ManagerEvent(clean_event) => {
                state.handle_manager_event(*clean_event).await;
            }
            Event::GracefullyQuit => {
                state.gracefully_quit().await;
            }
            Event::CommandSourceReady(quit_sink) => {
                info!("Command source ready");
                state.handle_command_source_ready(quit_sink).await;
            }
            Event::CommandSourceDead => {
                state.handle_command_source_dead();

                // Spin up a new one!
                let source = init_and_attach_command_source(&config);
                spin_up_new_source(
                    command_source_sink.clone(),
                    source,
                    Duration::from_millis(2000),
                )
                .await;
            }
            Event::CommandSourceFailedToStart => {
                if let Some(duration) = state.handle_command_source_failed_to_start().await {
                    let source = init_and_attach_command_source(&config);
                    spin_up_new_source(command_source_sink.clone(), source, duration).await;
                }
            }
        };

        if state.is_done() {
            info!("Goodbye.");
            break;
        }
    }
}
