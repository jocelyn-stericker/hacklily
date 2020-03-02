#![warn(clippy::all)]
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
extern crate log;

use ansi_term::Colour::{Green, Red};
use clap::{App, Arg, SubCommand};
use std::env;
use std::path::Path;

extern crate renderer_lib;

use renderer_lib::{event_loop, CommandSourceConfig, Config};

#[tokio::main]
async fn main() {
    let matches = App::new("Hacklily Renderer Server")
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
        .arg(
            Arg::with_name("v")
                .long("verbose")
                .short("v")
                .multiple(true)
                .help("Sets the level of verbosity (-v = warn, -vv = info, -vvv = debug, -vvvv = trace)"),
        )
        .subcommand(
            SubCommand::with_name("ws-worker")
                .about("Offer computing power to a Hacklily cordinator.")
                .arg(
                    Arg::with_name("coordinator-address")
                        .help("The address of the coordinator (starts with ws:// or wss://)")
                        .index(1)
                        .required(true)
                        .validator(is_url),
                ),
        )
        .subcommand(
            SubCommand::with_name("batch")
                .about("Render test cases from a file")
                .arg(
                    Arg::with_name("test_path")
                        .help("Path to a test file")
                        .index(1)
                        .required(true)
                        .validator(file_exists),
                )
        )
        .get_matches();

    env_logger::Builder::new()
        .parse_filters(&env::var("RUST_LOG").unwrap_or_else(|_| {
            match matches.occurrences_of("v") {
                0 => "error",
                1 => "warn",
                2 => "info",
                3 => "debug",
                4 | _ => "trace",
            }
            .to_owned()
        }))
        .init();

    let config = Config {
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
            Some("ws-worker") => CommandSourceConfig::Worker {
                coordinator: url::Url::parse(
                    &matches
                        .subcommand_matches("ws-worker")
                        .unwrap()
                        .value_of("coordinator-address")
                        .expect("Missing address (this field was marked as required above)"),
                )
                .expect("Invalid coordinator URL (this field was validated above)"),
            },
            Some("batch") => CommandSourceConfig::Batch {
                path: Path::new(
                    &matches
                        .subcommand_matches("batch")
                        .unwrap()
                        .value_of("test_path")
                        .expect("Missing test_path (this field was marked as required above)"),
                )
                .to_owned(),
            },
            _ => {
                eprintln!("{}: A subcommand is required.", Red.paint("error"));
                eprintln!("");
                eprintln!("{}", matches.usage());
                eprintln!("");
                eprintln!("For more information try {}", Green.paint("--help"));
                ::std::process::exit(1);
            }
        },
    };

    event_loop(config).await;

    info!("Bye.")
}

fn is_url(val: String) -> Result<(), String> {
    if let Err(_error) = url::Url::parse(&val) {
        Err(val + " is not a valid URL")
    } else {
        Ok(())
    }
}

fn file_exists(val: String) -> Result<(), String> {
    if !Path::new(&val).exists() {
        Err(val + " does not exist")
    } else {
        Ok(())
    }
}
