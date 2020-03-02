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
use futures::stream;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::stream::StreamExt;
use tokio::sync::mpsc;

use crate::command_source::{QuitSignal, QuitSink, RequestStream, ResponseCallback};
use crate::error::HacklilyError;
use crate::request::{Request, Response};

enum Event {
    Request((Request, ResponseCallback)),
    QuitSignal(QuitSignal),
}

async fn send_quit(mut quit_sink: mpsc::Sender<QuitSignal>) {
    quit_sink
        .send(QuitSignal {})
        .await
        .expect("Cannot send quit.");
}

pub async fn test_runner(
    input: Vec<Request>,
    output: Arc<Mutex<HashMap<String, Response>>>,
) -> Result<(RequestStream, QuitSink), HacklilyError> {
    let (quit_sink, quit_stream) = mpsc::channel::<QuitSignal>(50);
    let quit_stream = quit_stream.map(Event::QuitSignal);
    let parent_quit_sink = quit_sink.clone();
    let input_len = input.len();

    let request_stream = stream::iter(input.into_iter())
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
                        tokio::spawn(send_quit(quit_sink.clone()));
                    }
                }),
            ))
        })
        .map(Event::Request);

    let request_stream = stream::select(request_stream, quit_stream)
        .take_while(|ev| match ev {
            Event::QuitSignal(_) => false,
            _ => true,
        })
        .filter_map(|req| match req {
            Event::Request(r) => Some(Ok(r)),
            Event::QuitSignal(_) => None,
        });

    Ok((Box::new(request_stream), parent_quit_sink))
}
