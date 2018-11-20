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
use tokio::prelude::*;
use tokio_channel::mpsc;
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::protocol::Message;
use url::Url;
use uuid::Uuid;

use crate::error::Error;
use crate::request::{Backend, Request, Response, Version};

#[derive(Debug)]
pub struct QuitSignal {}

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
    QuitSignal(QuitSignal),
}

//     match prom {
//         Ok(promise) => {
//             info!("Got lock!");
//             if let Err(_sink_err) = await!(promise) {
//                 error!("Could not send response: SinkError");
//             }

//             info!("Sent!");
//         }
//         Err(_poisoned) => {
//             error!("Cannot send response: Sink mutex poisoned.");
//         }
//     }
// }

pub async fn ws_worker_client(
    coordinator: Url,
    max_jobs: u64,
) -> Result<
    (
        impl Stream<Item = (Request, Box<Fn(Response) -> () + Send + 'static>), Error = Error>,
        impl Sink<SinkItem = QuitSignal, SinkError = tokio_channel::mpsc::SendError<QuitSignal>>,
    ),
    Error,
> {
    let (quit_sink, quit_stream) = mpsc::channel::<QuitSignal>(50);
    let quit_stream = quit_stream
        .map_err(|_| Error::CommandSourceError("Quit sink dropped.".to_owned()))
        .map(|quit| Event::QuitSignal(quit));

    match await!(tokio_tungstenite::connect_async(coordinator)) {
        Ok((duplex, _handshake_response)) => {
            let (mut sink, stream) = duplex.split();

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

            // Create a cloneable sink that forwards to the sink.
            let sink = {
                let (multi_sink, ab_stream) = mpsc::channel::<Message>(1);
                tokio::spawn(
                    ab_stream
                        .map_err(|()| -> tungstenite::error::Error { unreachable!() })
                        .forward(sink)
                        .map(|_| ())
                        .map_err(|_| ()),
                );

                multi_sink
            };

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
                .map_err(|err| Error::CommandSourceError("Failure".to_owned() + &err.to_string()))
                .map(|method| Event::WsWorkerMethod(method))
                .select(quit_stream)
                .take_while(|ev| {
                    future::ok(match ev {
                        Event::QuitSignal(_) => false,
                        _ => true,
                    })
                })
                .filter_map(
                    move |req| -> Option<(Request, Box<Fn(Response) -> () + 'static + Send>)> {
                        match req {
                            Event::WsWorkerMethod(WsWorkerMethod::Render { id, params }) => {
                                let sink = sink.clone();

                                Some((
                                    Request {
                                        id: id.clone(),
                                        backend: params.backend,
                                        src: params.src,
                                        version: params.version,
                                    },
                                    Box::new(move |response: Response| -> () {
                                        let id = id.clone();
                                        let mut sink = sink.clone();

                                        tokio::spawn_async(
                                            async move {
                                                let response = RenderResponse {
                                                    jsonrpc: "2.0".to_owned(),
                                                    id,
                                                    result: response,
                                                };

                                                let response = serde_json::to_string(&response)
                                                    .expect("Could not JSONify reply");

                                                info!("Sending response");
                                                debug!("Response {:?}", response);

                                                let response = Message::Text(response);
                                                if let Err(err) = await!(sink.send_async(response))
                                                {
                                                    error!(
                                                        "Could not talk to coordinator: {}",
                                                        err
                                                    );
                                                }
                                            },
                                        );
                                    }),
                                ))
                            }
                            Event::QuitSignal(_) => None,
                        }
                    },
                );

            Ok((request_stream, quit_sink))
        }
        Err(err) => {
            error!("{}", err);
            Err(Error::CommandSourceError(
                "Could not connect to coordinator.".to_owned(),
            ))
        }
    }
}
