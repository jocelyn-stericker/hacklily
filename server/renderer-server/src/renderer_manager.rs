/**
 * System that transitions RenderContainers to non-transient states.
 *
 * Generally, this will transition RenderContainers to ReadyRenderContainers.
 * During shutdown, this will terminate RenderContainers.
 */
use futures::future::FutureExt;
use log::{error, info};
use std::panic::AssertUnwindSafe;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::mpsc::{channel, Receiver, Sender};
use tokio_stream::wrappers::{LinesStream, ReceiverStream};
use tokio_stream::StreamExt;

use crate::error::HacklilyError;
use crate::renderer::{
    ReadyRenderContainer, RenderContainer, RendererMeta, TerminalRenderContainer,
};

#[derive(Debug)]
pub enum Command {
    CreateContainer(RendererMeta),
    ReceiveContainer(RenderContainer),
    Abort,
    Shutdown,
}

#[derive(Debug)]
pub enum Event {
    ContainerReady(Box<ReadyRenderContainer>),
    ContainerTerminated,
    Fatal,
}

#[derive(Debug)]
pub struct RendererManager {
    pub command_sender: Sender<Command>,
    pub event_receiver: Receiver<Event>,
}

fn steal_lines(ready_container: &mut ReadyRenderContainer) {
    if let Some(stderr) = ready_container.take_stderr() {
        let id = ready_container.meta.id;
        let mut stderr_lines = LinesStream::new(BufReader::new(stderr).lines());

        // NOTE: panics are ignored here.
        tokio::spawn(async move {
            while let Some(Ok(line)) = stderr_lines.next().await {
                info!("stderr from {}: {}", id, &line);
            }
        });
    }
}

async fn emit_recycled_or_new_ready_container(
    source_container: RenderContainer,
    event_stream: Sender<Event>,
) {
    match source_container.next_terminal().await {
        TerminalRenderContainer::Ready(clean) => {
            event_stream
                .send(Event::ContainerReady(clean))
                .await
                .expect("Receiver dropped.");
        }

        TerminalRenderContainer::Dead(_, HacklilyError::RenderPanic) => {
            error!("FATAL: renderer panicked!");
            event_stream
                .send(Event::Fatal)
                .await
                .expect("Renderer dropped.");
        }

        TerminalRenderContainer::Dead(meta, _) | TerminalRenderContainer::Stopped(meta) => {
            if let TerminalRenderContainer::Ready(mut clean) =
                RenderContainer::new(meta).next_terminal().await
            {
                steal_lines(&mut clean);
                event_stream
                    .send(Event::ContainerReady(clean))
                    .await
                    .expect("Receiver dropped.");
            } else {
                error!("Could not recreate render container.");
                event_stream
                    .send(Event::Fatal)
                    .await
                    .expect("Receiver dropped.");
            }
        }
    }
}

async fn manager_event_loop(command_receiver: Receiver<Command>, event_sender: Sender<Event>) {
    let mut closed = false;

    let mut command_receiver = ReceiverStream::new(command_receiver);
    while let Some(command) = command_receiver.next().await {
        match command {
            Command::CreateContainer(meta) => {
                let event_sender = event_sender.clone();
                let new_container = RenderContainer::new(meta);

                tokio::spawn(async move {
                    let emergency_event_sender = event_sender.clone();

                    let f = async move {
                        if let TerminalRenderContainer::Ready(mut clean) =
                            new_container.next_terminal().await
                        {
                            steal_lines(&mut clean);
                            event_sender
                                .send(Event::ContainerReady(clean))
                                .await
                                .expect("Receiver dropped.");
                        } else {
                            error!("Could not create render container.");
                            event_sender
                                .send(Event::Fatal)
                                .await
                                .expect("Receiver dropped.");
                        }
                    };

                    if AssertUnwindSafe(f).catch_unwind().await.is_err() {
                        error!("FATAL: render init panicked.");
                        emergency_event_sender
                            .send(Event::Fatal)
                            .await
                            .expect("Receiver dropped.");
                    }
                });
            }
            Command::ReceiveContainer(command) => {
                let event_sender = event_sender.clone();
                let was_closed_when_queued = closed;

                tokio::spawn(async move {
                    let emergency_event_sender = event_sender.clone();

                    let f = async move {
                        if was_closed_when_queued {
                            command.terminate().await;
                            event_sender
                                .send(Event::ContainerTerminated)
                                .await
                                .expect("Receiver dropped.");

                            return;
                        }

                        emit_recycled_or_new_ready_container(command, event_sender).await;
                    };
                    if AssertUnwindSafe(f).catch_unwind().await.is_err() {
                        error!("FATAL: render job panicked.");
                        emergency_event_sender
                            .send(Event::Fatal)
                            .await
                            .expect("Receiver dropped.");
                    }
                });
            }
            Command::Abort => {
                event_sender
                    .clone()
                    .send(Event::Fatal)
                    .await
                    .expect("Receiver dropped.");
            }
            Command::Shutdown => closed = true,
        }
    }
}

impl RendererManager {
    pub fn new() -> RendererManager {
        let (command_sender, command_receiver) = channel(50);
        let (event_sender, event_receiver) = channel(50);

        tokio::spawn(async move {
            let emergency_event_sender = event_sender.clone();
            let f = async move {
                manager_event_loop(command_receiver, event_sender).await;
            };

            if AssertUnwindSafe(f).catch_unwind().await.is_err() {
                error!("FATAL: Renderer manager event loop crashed.");
                error!("Check 'docker ps' to make sure all containers are cleared.");
                emergency_event_sender
                    .send(Event::Fatal)
                    .await
                    .map(|_| ())
                    .unwrap_or(());
            }
        });

        RendererManager {
            command_sender,
            event_receiver,
        }
    }
}

impl Default for RendererManager {
    fn default() -> Self {
        RendererManager::new()
    }
}
