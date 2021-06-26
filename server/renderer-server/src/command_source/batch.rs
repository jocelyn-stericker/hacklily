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
use futures::future;
use futures::stream;
use futures::stream::TryStreamExt;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::stream::StreamExt;
use tokio::sync::mpsc;

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

async fn send_quit(mut quit_sink: mpsc::Sender<QuitSignal>) {
    quit_sink
        .send(QuitSignal {})
        .await
        .expect("Cannot send quit.");
}

pub async fn batch(path: PathBuf) -> Result<(RequestStream, QuitSink), HacklilyError> {
    match File::open(path).await {
        Ok(file) => {
            let (quit_sink, quit_stream) = mpsc::channel::<QuitSignal>(50);
            let quit_stream = quit_stream.map(|x| Ok(Event::QuitSignal(x)));
            let parent_quit_sink = quit_sink.clone();

            let reader = BufReader::new(file);
            let requests_remaining = Arc::new(Mutex::new(1 as u32));
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

            let request_stream = reader
                .lines()
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
                .map_ok(move |x| Event::Request(x))
                .map_err(|e| {
                    HacklilyError::CommandSourceError(
                        "Cannot read file: ".to_owned() + &e.to_string(),
                    )
                })
                .chain(done_event);

            let request_stream = stream::select(request_stream, quit_stream)
                .take_while(|ev| match ev {
                    Ok(Event::QuitSignal(_)) => false,
                    _ => true,
                })
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
