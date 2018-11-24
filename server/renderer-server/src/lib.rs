#![feature(await_macro, async_await, futures_api, pin)]
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
extern crate tokio;

#[macro_use]
extern crate log;

#[macro_use]
extern crate serde_derive;

mod command_source;
mod config;
mod container;
mod error;
mod event_loop;
mod renderer;
mod renderer_manager;
pub mod request;

pub use crate::config::{CommandSourceConfig, Config};
pub use crate::event_loop::event_loop;
