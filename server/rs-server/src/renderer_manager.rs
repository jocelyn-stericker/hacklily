/**
 * System that transitions RenderContainers to non-transient states.
 *
 * Generally, this will transition RenderContainers to ReadyRenderContainers.
 * During shutdown, this will terminate RenderContainers.
 */
use std::io::BufReader;
use tokio::io::lines;
use tokio::prelude::*;
use tokio_channel::mpsc;

use crate::renderer::{
    ReadyRenderContainer, RenderContainer, RendererMeta, TerminalRenderContainer,
};

#[derive(Debug)]
pub enum Command {
    CreateContainer(RendererMeta),
    ReceiveContainer(RenderContainer),
    Shutdown,
}

#[derive(Debug)]
pub enum Event {
    ContainerReady(ReadyRenderContainer),
    ContainerTerminated,
    Fatal,
}

#[derive(Debug)]
pub struct RendererManager {
    pub command_sender: mpsc::Sender<Command>,
    pub event_receiver: mpsc::Receiver<Event>,
}

fn steal_lines(ready_container: &mut ReadyRenderContainer) {
    if let Some(stderr) = ready_container.take_stderr() {
        let id = ready_container.meta.id;
        let mut stderr_lines = lines(BufReader::new(stderr));

        tokio::spawn_async(
            async move {
                while let Some(Ok(line)) = await!(stderr_lines.next()) {
                    info!("stderr from {}: {}", id, &line);
                }
            },
        )
    }
}

async fn emit_recycled_or_new_ready_container(
    source_container: RenderContainer,
    event_stream: mpsc::Sender<Event>,
) {
    match await!(source_container.next_terminal()) {
        TerminalRenderContainer::Ready(clean) => {
            await!(event_stream.send(Event::ContainerReady(clean))).expect("Receiver dropped.");
        }

        TerminalRenderContainer::Dead(meta, _) | TerminalRenderContainer::Stopped(meta) => {
            if let TerminalRenderContainer::Ready(mut clean) =
                await!(RenderContainer::new(meta).next_terminal())
            {
                steal_lines(&mut clean);
                await!(event_stream.send(Event::ContainerReady(clean))).expect("Receiver dropped.");
            } else {
                error!("Could not recreate render container.");
                await!(event_stream.send(Event::Fatal)).expect("Receiver dropped.");
            }
        }
    }
}

async fn manager_event_loop(
    mut command_receiver: mpsc::Receiver<Command>,
    event_sender: mpsc::Sender<Event>,
) {
    let mut closed = false;

    while let Some(Ok(command)) = await!(command_receiver.next()) {
        match command {
            Command::CreateContainer(meta) => {
                let event_sender = event_sender.clone();
                let new_container = RenderContainer::new(meta);

                tokio::spawn_async(
                    async move {
                        if let TerminalRenderContainer::Ready(mut clean) =
                            await!(new_container.next_terminal())
                        {
                            steal_lines(&mut clean);
                            await!(event_sender.send(Event::ContainerReady(clean)))
                                .expect("Receiver dropped.");
                        } else {
                            error!("Could not create render container.");
                            await!(event_sender.send(Event::Fatal)).expect("Receiver dropped.");
                        }
                    },
                );
            }
            Command::ReceiveContainer(command) => {
                let event_sender = event_sender.clone();
                let was_closed_when_queued = closed;

                tokio::spawn_async(
                    async move {
                        if was_closed_when_queued {
                            await!(command.terminate());
                            await!(event_sender.send(Event::ContainerTerminated))
                                .expect("Receiver dropped.");

                            return;
                        }

                        await!(emit_recycled_or_new_ready_container(command, event_sender));
                    },
                );
            }
            Command::Shutdown => closed = true,
        }
    }
}

impl RendererManager {
    pub fn new() -> RendererManager {
        let (command_sender, command_receiver) = mpsc::channel(1);
        let (event_sender, event_receiver) = mpsc::channel(1);

        tokio::spawn_async(
            async move {
                await!(manager_event_loop(command_receiver, event_sender));
            },
        );

        RendererManager {
            command_sender,
            event_receiver,
        }
    }
}
