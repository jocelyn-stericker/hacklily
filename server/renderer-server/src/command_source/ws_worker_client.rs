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
use futures::future::{self, Either, FutureExt};
use futures::sink::SinkExt;
use futures::stream::{self, StreamExt, TryStreamExt};
use log::{debug, error, info, trace, warn};
use serde::{Deserialize, Serialize};
use std::panic::AssertUnwindSafe;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::sleep;
use tokio_stream::wrappers::{IntervalStream, ReceiverStream};
use tokio_tungstenite::tungstenite::protocol::Message;
use url::Url;
use uuid::Uuid;

use crate::command_source::{QuitSignal, QuitSink, RequestStream, ResponseCallback};
use crate::error::HacklilyError;
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

/// Tries connecting to a coordinator, then returns a stream of events.
///
/// This does not time out (use ws_worker_client_impl for the timeout)
async fn ws_worker_client_impl(
    coordinator: Url,
    max_jobs: u64,
) -> Result<(RequestStream, QuitSink), HacklilyError> {
    let (quit_sink, quit_stream) = mpsc::channel::<QuitSignal>(50);
    let quit_stream = ReceiverStream::new(quit_stream).map(|x| Ok(Event::QuitSignal(x)));

    debug!("Connecting to coordinator {}", &coordinator);

    match tokio_tungstenite::connect_async(coordinator).await {
        Ok((duplex, _handshake_response)) => {
            let (mut sink, stream) = duplex.split();
            debug!("Connected to server");

            let cmd = serde_json::to_string(&WsCoordinatorMethod::IHazComputes {
                id: Uuid::new_v4(),
                params: IHazComputesParams { max_jobs },
            })
            .map_err(|err| {
                HacklilyError::CommandSourceError(
                    "Could not build hello JSON command: ".to_owned() + &err.to_string(),
                )
            })?;

            let cmd = Message::Text(cmd);

            sink.send(cmd).await.map_err(|err| {
                HacklilyError::CommandSourceError(
                    "Could not send message to coordinator: ".to_owned() + &err.to_string(),
                )
            })?;

            // Create a cloneable sink that forwards to the sink.
            let sink = {
                let (multi_sink, ab_stream) = mpsc::channel::<Message>(50);
                tokio::spawn(
                    ReceiverStream::new(ab_stream)
                        .map(Ok)
                        .forward(sink)
                        .map(|_| ()),
                );

                multi_sink
            };

            let parent_quit_sink = quit_sink.clone();

            let ping_interval =
                IntervalStream::new(tokio::time::interval(Duration::from_millis(500)))
                    .map(|_| Ok(Event::PingNeeded {}));

            let request_stream = stream
                .try_filter_map(|req| {
                    future::ok(match req {
                        Message::Text(req) => serde_json::from_str(&req).unwrap_or_else(|e| {
                            warn!("Got invalid request: {}", e);
                            None
                        }),
                        _ => None,
                    })
                })
                .map_err(|err| {
                    HacklilyError::CommandSourceError("Failure: ".to_owned() + &err.to_string())
                })
                .map_ok(Event::WsWorkerMethod);

            let request_stream = stream::select(request_stream, quit_stream);
            let request_stream = stream::select(request_stream, ping_interval)
                .take_while(|ev| future::ready(!matches!(ev, Ok(Event::QuitSignal(_)))))
                .try_filter_map(move |req| {
                    future::ok(match req {
                        Event::WsWorkerMethod(WsWorkerMethod::Render { id, params }) => {
                            let sink = sink.clone();
                            info!("Received request {}", id);
                            let quit_sink = quit_sink.clone();

                            let id_copy = id.clone();
                            let cb: ResponseCallback = Box::new(move |response: Response| {
                                let id = id_copy.clone();
                                let sink = sink.clone();
                                let quit_sink = quit_sink.clone();

                                tokio::spawn(async move {
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
                                        if let Err(err) = sink.send(response).await {
                                            error!("Could not talk to coordinator: {}", err);
                                        }
                                    };

                                    if AssertUnwindSafe(f).catch_unwind().await.is_err() {
                                        error!("FATAL: Command source responder panicked.");
                                        quit_sink
                                            .clone()
                                            .send(QuitSignal {})
                                            .await
                                            .map(|_| ())
                                            .unwrap_or(());
                                    }
                                });
                            });

                            Some((
                                Request {
                                    id,
                                    backend: params.backend,
                                    src: params.src,
                                    version: params.version,
                                },
                                cb,
                            ))
                        }
                        Event::PingNeeded => {
                            let sink = sink.clone();
                            tokio::spawn(async move {
                                let response = Message::Ping(vec![0x0]);
                                trace!("Ping");
                                if let Err(err) = sink.send(response).await {
                                    error!("Could not ping: {}", err);
                                }
                            });
                            None
                        }
                        Event::QuitSignal(_) => None,
                    })
                });

            let request_stream: RequestStream = Box::new(request_stream);

            Ok((request_stream, parent_quit_sink))
        }
        Err(err) => {
            error!("{}", err);
            Err(HacklilyError::CommandSourceError(
                "Could not connect to coordinator.".to_owned(),
            ))
        }
    }
}

pub async fn ws_worker_client(
    coordinator: Url,
    max_jobs: u64,
) -> Result<(RequestStream, QuitSink), HacklilyError> {
    let client = Box::pin(ws_worker_client_impl(coordinator, max_jobs));
    let timeout = Box::pin(async { sleep(Duration::from_millis(2500)).await });

    match future::select(client, timeout).await {
        Either::Left((client, _)) => client,
        Either::Right((_, _)) => Err(HacklilyError::CommandSourceError(
            "Timeout: could not connect to coordinator".to_owned(),
        )),
    }
}
