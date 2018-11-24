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
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use url::Url;

use super::request::{Request, Response};

#[derive(Clone)]
pub enum CommandSourceConfig {
    Worker {
        coordinator: Url,
    },

    Batch {
        path: PathBuf,
    },

    TestRunner {
        input: Vec<Request>,
        output: Arc<Mutex<HashMap<String, Response>>>,
    },
}

#[derive(Clone)]
pub struct Config {
    pub stable_docker_tag: String,
    pub stable_worker_count: u64,

    pub unstable_docker_tag: String,
    pub unstable_worker_count: u64,

    pub render_timeout_msec: u64,
    pub command_source: CommandSourceConfig,
}
