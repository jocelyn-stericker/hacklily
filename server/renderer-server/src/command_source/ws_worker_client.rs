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
use futures::future::{select, Either, FutureExt};
use std::panic::AssertUnwindSafe;
use std::time::{Duration, Instant};
use tokio::prelude::*;
use tokio_channel::mpsc;
use tokio_timer::{sleep, Interval};
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::protocol::Message;
use url::Url;
use uuid::Uuid;

use crate::command_source::{QuitSignal, QuitSink, RequestStream, ResponseCallback};
use crate::error::Error;
use crate::request::{Backend, Request, Response, Version};

#[derive(Debug, Serialize, Deserialize)]
struct IHazComputesParams {
    max_jobs: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method")]
enum WsCoordinatorMethod {
    #[serde(rename = "i_haz_computes")]
    IHazComputes {
        id: Uuid,
        params: IHazComputesParams,
    },
}

#[derive(Debug, Serialize, Deserialize)]
struct RenderRequest {
    backend: Backend,
    src: String,
    version: Version,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method")]
enum WsWorkerMethod {
    #[serde(rename = "render")]
    Render { id: String, params: RenderRequest },
}

#[derive(Debug, Serialize, Deserialize)]
struct RenderResponse {
    jsonrpc: String,
    id: String,
    result: Response,
}

enum Event {
    WsWorkerMethod(WsWorkerMethod),
    PingNeeded,
    QuitSignal(QuitSignal),
}

async fn send_hello(
    //sink: &mut (impl Sink<SinkItem = Message, SinkError = tungstenite::error::Error>),
    sink: &mut tokio::prelude::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::stream::Stream<
                tokio::net::TcpStream,
                tokio_tls::TlsStream<tokio::net::TcpStream>,
            >,
        >,
    >,
    max_jobs: u64,
) -> Result<(), Error> {
    let cmd = serde_json::to_string(&WsCoordinatorMethod::IHazComputes {
        id: Uuid::new_v4(),
        params: IHazComputesParams { max_jobs },
    })
    .or_else(|err| {
        Err(Error::CommandSourceError(
            "Could not build hello JSON command: ".to_owned() + &err.to_string(),
        ))
    })?;

    let cmd = Message::Text(cmd);

    await!(sink.send_async(cmd)).or_else(|err| {
        Err(Error::CommandSourceError(
            "Could not send message to coordinator: ".to_owned() + &err.to_string(),
        ))
    })?;

    Ok(())
}

/// Tries connecting to a coordinator, then returns a stream of events.
///
/// This does not time out (use ws_worker_client_impl for the timeout)
async fn ws_worker_client_impl(
    coordinator: Url,
    max_jobs: u64,
) -> Result<(RequestStream, QuitSink), Error> {
    let (quit_sink, quit_stream) = mpsc::channel::<QuitSignal>(50);
    let quit_stream = quit_stream
        .map_err(|_| Error::CommandSourceError("Quit sink dropped.".to_owned()))
        .map(Event::QuitSignal);

    debug!("Connecting to coordinator {}", &coordinator);

    match await!(tokio_tungstenite::connect_async(coordinator)) {
        Ok((duplex, _handshake_response)) => {
            let (mut sink, stream) = duplex.split();
            debug!("Connected to server");

            await!(send_hello(&mut sink, max_jobs))?;

            // Create a cloneable sink that forwards to the sink.
            let sink = {
                let (multi_sink, ab_stream) = mpsc::channel::<Message>(50);
                tokio::spawn(
                    ab_stream
                        .map_err(|()| -> tungstenite::error::Error { unreachable!() })
                        .forward(sink)
                        .map(|_| ())
                        .map_err(|_| ()),
                );

                multi_sink
            };

            let parent_quit_sink = quit_sink.clone();

            let ping_interval = Interval::new(Instant::now(), Duration::from_millis(500))
                .map(|_| Event::PingNeeded {})
                .map_err(|err| {
                    Error::CommandSourceError("Timer failure: ".to_owned() + &err.to_string())
                });

            let request_stream = stream
                .filter_map(|req| -> Option<WsWorkerMethod> {
                    match req {
                        Message::Text(req) => serde_json::from_str(&req).unwrap_or_else(|e| {
                            warn!("Got invalid request: {}", e);
                            None
                        }),
                        _ => None,
                    }
                })
                .map_err(|err| Error::CommandSourceError("Failure: ".to_owned() + &err.to_string()))
                .map(Event::WsWorkerMethod)
                .select(quit_stream)
                .select(ping_interval)
                .take_while(|ev| {
                    future::ok(match ev {
                        Event::QuitSignal(_) => false,
                        _ => true,
                    })
                })
                .filter_map(move |req| -> Option<(Request, ResponseCallback)> {
                    match req {
                        Event::WsWorkerMethod(WsWorkerMethod::Render { id, params }) => {
                            let sink = sink.clone();
                            info!("Received request {}", id);
                            let quit_sink = quit_sink.clone();

                            Some((
                                Request {
                                    id: id.clone(),
                                    backend: params.backend,
                                    src: params.src,
                                    version: params.version,
                                },
                                Box::new(move |response: Response| {
                                    let id = id.clone();
                                    let mut sink = sink.clone();
                                    let quit_sink = quit_sink.clone();

                                    tokio::spawn_async(
                                        async move {
                                            let f = async move {
                                                info!("Sending response {}", id);
                                                let response = RenderResponse {
                                                    jsonrpc: "2.0".to_owned(),
                                                    id,
                                                    result: response,
                                                };

                                                let response = serde_json::to_string(&response)
                                                    .expect("Could not JSONify reply");

                                                debug!("Response {:?}", response);

                                                let response = Message::Text(response);
                                                if let Err(err) = await!(sink.send_async(response))
                                                {
                                                    error!(
                                                        "Could not talk to coordinator: {}",
                                                        err
                                                    );
                                                }
                                            };

                                            if await!(AssertUnwindSafe(f).catch_unwind()).is_err() {
                                                error!("FATAL: Command source responder panicked.");
                                                await!(quit_sink.clone().send(QuitSignal {}))
                                                    .map(|_| ())
                                                    .unwrap_or(());
                                            }
                                        },
                                    );
                                }),
                            ))
                        }
                        Event::PingNeeded => {
                            let mut sink = sink.clone();
                            tokio::spawn_async(
                                async move {
                                    let response = Message::Ping(vec![0x0]);
                                    trace!("Ping");
                                    if let Err(err) = await!(sink.send_async(response)) {
                                        error!("Could not ping: {}", err);
                                    }
                                },
                            );
                            None
                        }
                        Event::QuitSignal(_) => None,
                    }
                });

            let request_stream: Box<
                Stream<Item = (Request, ResponseCallback), Error = Error> + Send + 'static,
            > = Box::new(request_stream);

            Ok((request_stream, parent_quit_sink))
        }
        Err(err) => {
            error!("{}", err);
            Err(Error::CommandSourceError(
                "Could not connect to coordinator.".to_owned(),
            ))
        }
    }
}

pub async fn ws_worker_client(
    coordinator: Url,
    max_jobs: u64,
) -> Result<(RequestStream, QuitSink), Error> {
    let client = Box::pin(ws_worker_client_impl(coordinator, max_jobs));
    let timeout = Box::pin(async { await!(sleep(Duration::from_millis(2500))) });

    match await!(select(client, timeout)) {
        Either::Left((client, _)) => client,
        Either::Right((_, _)) => Err(Error::CommandSourceError(
            "Timeout: could not connect to coordinator".to_owned(),
        )),
    }
}
