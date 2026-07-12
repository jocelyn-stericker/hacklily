// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2018-present Jocelyn Stericker <jocelyn@nettek.ca>
use futures::future;
use futures::stream;
use futures::stream::TryStreamExt;
use log::error;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::mpsc;
use tokio_stream::wrappers::{LinesStream, ReceiverStream};
use tokio_stream::StreamExt;

use crate::command_source::{QuitSignal, QuitSink, RequestStream, ResponseCallback};
use crate::error::HacklilyError;
use crate::request::{Request, Response};

enum Event {
    Request((Request, ResponseCallback)),
    QuitSignal(QuitSignal),
    Ignore,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash, Clone)]
struct TestResponse {
    id: String,
    result: Response,
}

async fn send_quit(quit_sink: mpsc::Sender<QuitSignal>) {
    quit_sink
        .send(QuitSignal {})
        .await
        .expect("Cannot send quit.");
}

pub async fn batch(path: PathBuf) -> Result<(RequestStream, QuitSink), HacklilyError> {
    match File::open(path).await {
        Ok(file) => {
            let (quit_sink, quit_stream) = mpsc::channel::<QuitSignal>(50);
            let quit_stream = ReceiverStream::new(quit_stream).map(|x| Ok(Event::QuitSignal(x)));
            let parent_quit_sink = quit_sink.clone();

            let reader = BufReader::new(file);
            let requests_remaining = Arc::new(Mutex::new(1_u32));
            let requests_remaining_2 = requests_remaining.clone();
            let done_event = stream::once(future::lazy(move |_| {
                let mut remaining = requests_remaining_2.lock().unwrap();
                *remaining -= 1;

                Ok(if *remaining == 0 {
                    Event::QuitSignal(QuitSignal {})
                } else {
                    Event::Ignore
                })
            }));

            let request_stream = LinesStream::new(reader.lines())
                .try_filter_map(move |line| {
                    future::ok(if line.starts_with("//") || line.is_empty() {
                        None
                    } else {
                        match serde_json::from_str::<Request>(&line) {
                            Ok(request) => {
                                let id = request.id.clone();
                                let quit_sink = quit_sink.clone();
                                *requests_remaining.lock().unwrap() += 1;

                                let requests_remaining = requests_remaining.clone();
                                let cb: ResponseCallback = Box::new(move |response: Response| {
                                    let is_done = {
                                        let mut remaining = requests_remaining.lock().unwrap();
                                        *remaining -= 1;
                                        *remaining == 0
                                    };

                                    let response = TestResponse {
                                        id: id.clone(),
                                        result: response,
                                    };

                                    println!("{}", serde_json::to_string(&response).unwrap());

                                    if is_done {
                                        tokio::spawn(send_quit(quit_sink.clone()));
                                    }
                                });
                                Some((request, cb))
                            }
                            Err(err) => {
                                error!("Could not parse line: {}", &line);
                                error!("Cause: {}", err);
                                None
                            }
                        }
                    })
                })
                .map_ok(Event::Request)
                .map_err(|e| {
                    HacklilyError::CommandSourceError(
                        "Cannot read file: ".to_owned() + &e.to_string(),
                    )
                })
                .chain(done_event);

            let request_stream = stream::select(request_stream, quit_stream)
                .take_while(|ev| !matches!(ev, Ok(Event::QuitSignal(_))))
                .try_filter_map(|req| {
                    future::ok(match req {
                        Event::Request(r) => Some(r),
                        Event::QuitSignal(_) => None,
                        Event::Ignore => None,
                    })
                });

            Ok((Box::new(request_stream), parent_quit_sink))
        }
        Err(err) => {
            error!("{}", err);
            Err(HacklilyError::CommandSourceError(
                "Could not read test file".to_owned(),
            ))
        }
    }
}
