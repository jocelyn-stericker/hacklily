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
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::prelude::*;
use tokio_channel::mpsc;

use crate::command_source::{QuitSignal, QuitSink, RequestStream, ResponseCallback};
use crate::error::Error;
use crate::request::{Request, Response};

enum Event {
    Request((Request, ResponseCallback)),
    QuitSignal(QuitSignal),
}

pub async fn test_runner(
    input: Vec<Request>,
    output: Arc<Mutex<HashMap<String, Response>>>,
) -> Result<(RequestStream, QuitSink), Error> {
    let (quit_sink, quit_stream) = mpsc::channel::<QuitSignal>(50);
    let quit_stream = quit_stream
        .map_err(|_| Error::CommandSourceError("Quit sink dropped.".to_owned()))
        .map(Event::QuitSignal);
    let parent_quit_sink = quit_sink.clone();
    let input_len = input.len();

    let request_stream = stream::iter_ok(input)
        .filter_map(move |request| -> Option<(Request, ResponseCallback)> {
            let output = output.clone();
            let id = request.id.clone();
            let quit_sink = quit_sink.clone();

            Some((
                request,
                Box::new(move |response: Response| {
                    let id = id.clone();
                    let is_done = {
                        let mut output = output.lock().unwrap();
                        if output.insert(id.clone(), response).is_some() {
                            panic!("Invariant failed: ID {} in test is not unique", id);
                        }

                        output.len() == input_len
                    };

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
        })
        .map(Event::Request)
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
        });

    let request_stream: Box<
        Stream<Item = (Request, ResponseCallback), Error = Error> + Send + 'static,
    > = Box::new(request_stream);

    Ok((request_stream, parent_quit_sink))
}
