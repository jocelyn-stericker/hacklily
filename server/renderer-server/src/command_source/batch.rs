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
use std::io::BufReader;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::fs::file::File;
use tokio::prelude::*;
use tokio_channel::mpsc;
use tokio_io::io::lines;

use crate::command_source::{QuitSignal, QuitSink, RequestStream, ResponseCallback};
use crate::error::Error;
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

pub async fn batch(path: PathBuf) -> Result<(RequestStream, QuitSink), Error> {
    match await!(File::open(path)) {
        Ok(file) => {
            let (quit_sink, quit_stream) = mpsc::channel::<QuitSignal>(50);
            let quit_stream = quit_stream
                .map_err(|_| Error::CommandSourceError("Quit sink dropped.".to_owned()))
                .map(Event::QuitSignal);
            let parent_quit_sink = quit_sink.clone();

            let reader = BufReader::new(file);
            let requests_remaining = Arc::new(Mutex::new(1 as u32));
            let requests_remaining_2 = requests_remaining.clone();
            let done_event = future::ok(())
                .map(move |_| {
                    let mut remaining = requests_remaining_2.lock().unwrap();
                    *remaining -= 1;

                    if *remaining == 0 {
                        Event::QuitSignal(QuitSignal {})
                    } else {
                        Event::Ignore
                    }
                })
                .into_stream();

            let request_stream = lines(reader)
                .filter_map(move |line| -> Option<(Request, ResponseCallback)> {
                    if line.starts_with("//") || line.is_empty() {
                        None
                    } else {
                        match serde_json::from_str::<Request>(&line) {
                            Ok(request) => {
                                let id = request.id.clone();
                                let quit_sink = quit_sink.clone();
                                *requests_remaining.lock().unwrap() += 1;

                                let requests_remaining = requests_remaining.clone();
                                Some((
                                    request,
                                    Box::new(move |response: Response| {
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
                                            tokio::spawn(
                                                quit_sink
                                                    .clone()
                                                    .send(QuitSignal {})
                                                    // It's okay if we're already dead.
                                                    .map(|_| ())
                                                    .map_err(|_| ()),
                                            );
                                        }
                                    }),
                                ))
                            }
                            Err(err) => {
                                error!("Could not parse line: {}", &line);
                                error!("Cause: {}", err);
                                None
                            }
                        }
                    }
                })
                .map(Event::Request)
                .map_err(|e| {
                    Error::CommandSourceError("Cannot read file: ".to_owned() + &e.to_string())
                })
                .chain(done_event)
                .select(quit_stream)
                .take_while(|ev| {
                    future::ok(match ev {
                        Event::QuitSignal(_) => false,
                        _ => true,
                    })
                })
                .filter_map(|req| match req {
                    Event::Request(r) => Some(r),
                    Event::QuitSignal(_) => None,
                    Event::Ignore => None,
                });

            let request_stream: Box<
                Stream<Item = (Request, ResponseCallback), Error = Error> + Send + 'static,
            > = Box::new(request_stream);

            Ok((request_stream, parent_quit_sink))
        }
        Err(err) => {
            error!("{}", err);
            Err(Error::CommandSourceError(
                "Could not read test file".to_owned(),
            ))
        }
    }
}
