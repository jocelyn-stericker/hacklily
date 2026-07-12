// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2018-present Jocelyn Stericker <jocelyn@nettek.ca>
use futures::stream;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use crate::command_source::{QuitSignal, QuitSink, RequestStream, ResponseCallback};
use crate::error::HacklilyError;
use crate::request::{Request, Response};

enum Event {
    Request((Request, ResponseCallback)),
    QuitSignal(QuitSignal),
}

async fn send_quit(quit_sink: mpsc::Sender<QuitSignal>) {
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
    let quit_stream = ReceiverStream::new(quit_stream).map(Event::QuitSignal);
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
        .take_while(|ev| !matches!(ev, Event::QuitSignal(_)))
        .filter_map(|req| match req {
            Event::Request(r) => Some(Ok(r)),
            Event::QuitSignal(_) => None,
        });

    Ok((Box::new(request_stream), parent_quit_sink))
}
