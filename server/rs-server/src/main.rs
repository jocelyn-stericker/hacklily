#![feature(await_macro, async_await, futures_api, pin)]
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

#[macro_use]
extern crate clap;

#[macro_use]
extern crate tokio;

#[macro_use]
extern crate log;

#[macro_use]
extern crate serde_derive;

use clap::{App, Arg, SubCommand};

mod container;
mod error;
mod event_loop;
mod renderer;
mod renderer_manager;
mod request;
mod ws_worker_client;

fn main() {
    env_logger::init();

    let mut app = App::new("Hacklily Renderer Server")
        .version("0.1")
        .author("Joshua Netterfield <joshua@nettek.ca>")
        .about("Renders LilyPond music efficiently in containers.")
        .arg(
            Arg::with_name("stable-docker-tag")
                .long("stable-docker-tag")
                .help("The docker tag of the stable Hacklily Lilypond REPL")
                .required(true)
                .value_name("DOCKER_IMAGE")
                .takes_value(true),
        )
        .arg(
            Arg::with_name("stable-worker-count")
                .long("stable-worker-count")
                .help("The number of stable worker processes to spawn")
                .required(true)
                .value_name("WORKER_COUNT")
                .takes_value(true),
        )
        .arg(
            Arg::with_name("unstable-docker-tag")
                .long("unstable-docker-tag")
                .help("The docker tag of the unstable Hacklily Lilypond REPL")
                .required(true)
                .value_name("DOCKER_IMAGE")
                .takes_value(true),
        )
        .arg(
            Arg::with_name("unstable-worker-count")
                .long("unstable-worker-count")
                .help("The number of unstable worker processes to spawn")
                .required(true)
                .value_name("WORKER_COUNT")
                .takes_value(true),
        )
        .arg(
            Arg::with_name("render-timeout-msec")
                .long("render-timeout-msec")
                .help("The number of msec to allow the worker to process a song before killing it.")
                .required(true)
                .value_name("MSEC")
                .takes_value(true),
        )
        .subcommand(
            SubCommand::with_name("worker")
                .about("Offer computing power to a Hacklily cordinator.")
                .arg(
                    Arg::with_name("coordinator-address")
                        .help("The address of the coordinator (starts with ws:// or wss://)")
                        .index(1)
                        .required(true)
                        .validator(is_url),
                ),
        );

    let matches = app.clone().get_matches();

    let config = crate::event_loop::Config {
        stable_docker_tag: matches
            .value_of("stable-docker-tag")
            .expect("Required config option stable-docker-tag not found.")
            .to_owned(),
        stable_worker_count: value_t!(matches.value_of("stable-worker-count"), u64)
            .expect("Required config option stable-worker-count malformed or not found."),

        unstable_docker_tag: matches
            .value_of("unstable-docker-tag")
            .expect("Required config option unstable-docker-tag not found.")
            .to_owned(),
        unstable_worker_count: value_t!(matches.value_of("unstable-worker-count"), u64)
            .expect("Required config option unstable-worker-count malformed or not found."),

        render_timeout_msec: value_t!(matches.value_of("render-timeout-msec"), u64)
            .expect("Required config option render-timeout-msec malformed or not found."),

        command_source: match matches.subcommand_name() {
            Some("worker") => crate::event_loop::CommandSource::Worker {
                coordinator: url::Url::parse(
                    &matches
                        .subcommand_matches("worker")
                        .unwrap()
                        .value_of("coordinator-address")
                        .expect("Missing address (this field was marked as required above)"),
                )
                .expect("Invalid coordinator URL (this field was validated above)"),
            },
            _ => {
                println!("ERROR: A command is required.");
                app.print_long_help().unwrap();
                ::std::process::exit(1);
            }
        },
    };

    tokio::run_async(crate::event_loop::event_loop(config));

    info!("Bye.")
}

fn is_url(val: String) -> Result<(), String> {
    if let Err(_error) = url::Url::parse(&val) {
        Err(String::from("this must be a valid URL"))
    } else {
        Ok(())
    }
}
