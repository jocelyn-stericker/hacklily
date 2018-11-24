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
use std::panic::AssertUnwindSafe;
use std::time::Duration;
use tokio::prelude::*;
use tokio_channel::mpsc;
use tokio_timer::sleep;

use crate::command_source;
use crate::config::Config;
use crate::renderer_manager::RendererManager;

mod state;
use self::state::{Event, State};

fn init_and_attach_command_source(config: &Config) -> impl Stream<Item = Event, Error = ()> {
    let (event_sender, event_receiver) = mpsc::channel::<Event>(50);

    let make_worker_client = command_source::new(&config);

    tokio::spawn_async(
        async move {
            let emergency_event_sender = event_sender.clone();

            let f = async move {
                match await!(make_worker_client) {
                    Err(error) => {
                        error!("Caught error: {}", error);
                        error!("Failed to start command source.");
                        await!(event_sender.send(Event::CommandSourceFailedToStart))
                            .map(|_| ())
                            .unwrap_or(());
                    }

                    Ok((mut request_stream, quit_sink)) => {
                        await!(event_sender
                            .clone()
                            .send(Event::CommandSourceReady(quit_sink)))
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
                                    error!("Closing request stream.");
                                    // We suppress errors, because the receiver being
                                    // dropped is totally fine.
                                    await!(event_sender.clone().send(Event::CommandSourceDead))
                                        .map(|_| ())
                                        .unwrap_or(());

                                    break;
                                }
                            }
                        }

                        // Send a potentially extraneous GracefullyQuit, in case we died.
                        await!(event_sender.send(Event::GracefullyQuit))
                            .map(|_| ())
                            .unwrap_or(());
                    }
                }
            };

            if await!(AssertUnwindSafe(f).catch_unwind()).is_err() {
                error!("FATAL: Command source init panicked.");
                await!(emergency_event_sender.send(Event::GracefullyQuit))
                    .map(|_| ())
                    .unwrap_or(());
            }
        },
    );

    event_receiver
}

pub async fn event_loop(config: Config) {
    let manager = RendererManager::new();
    let (mut state, internal_events) = State::new(&config, manager.command_sender);

    let internal_events = internal_events.map_err(|_| {
        std::io::Error::new(std::io::ErrorKind::BrokenPipe, "Cannot get internal events")
    });

    let ctrl_c = await!(tokio_signal::ctrl_c())
        .unwrap()
        .map(|_| Event::GracefullyQuit);

    let manager_events = manager
        .event_receiver
        .map(Box::new)
        .map(Event::ManagerEvent)
        .or_else(|_| {
            Err(std::io::Error::new(
                std::io::ErrorKind::BrokenPipe,
                "Cannot get renderer manager events",
            ))
        });

    let (command_source_sink, command_source_events) = mpsc::channel::<Event>(50);
    let command_source_events = command_source_events
        .or_else(|_| Err(std::io::Error::new(std::io::ErrorKind::Other, "no event")));

    let spin_up_new_source = |delay: Duration| {
        let command_source_sink = command_source_sink.clone();
        let config = config.clone();
        tokio::spawn(sleep(delay).map_err(|_| ()).and_then(move |_| {
            // We may attach another stream in the future if this dies, so we forward it to
            // an mpsc.
            init_and_attach_command_source(&config)
                .map_err(|_| -> tokio_channel::mpsc::SendError<Event> {
                    error!("Oops!");
                    unreachable!()
                })
                .forward(command_source_sink.clone())
                .map(|_| ())
                .map_err(|_| ())
                .into_future()
        }));
    };

    spin_up_new_source(Duration::from_millis(0));

    let mut events = ctrl_c
        .select(command_source_events)
        .select(manager_events)
        .select(internal_events);

    while let Some(event_or_err) = await!(events.next()) {
        match event_or_err {
            Ok(event) => match event {
                // Container Management
                Event::QueueRequest(request, response_cb) => {
                    info!("Queueing request");
                    state.handle_request(request, response_cb);
                }
                Event::ManagerEvent(clean_event) => {
                    state.handle_manager_event(*clean_event);
                }
                Event::GracefullyQuit => {
                    state.gracefully_quit();
                }
                Event::CommandSourceReady(quit_sink) => {
                    info!("Command source ready");
                    state.handle_command_source_ready(quit_sink);
                }
                Event::CommandSourceDead => {
                    state.handle_command_source_dead();

                    // Spin up a new one!
                    spin_up_new_source(Duration::from_millis(2000));
                }
                Event::CommandSourceFailedToStart => {
                    if let Some(duration) = state.handle_command_source_failed_to_start() {
                        spin_up_new_source(duration);
                    }
                }
            },
            Err(err) => {
                warn!("got error from container {}", err);
            }
        };

        if state.is_done() {
            info!("Goodbye.");
            break;
        }
    }
}
