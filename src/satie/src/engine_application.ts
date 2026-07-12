// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { Pitch } from "#/musicxml-interfaces";

import type { ISatieOptions } from "./engine_setup";
import { init } from "./engine_setup";

export type IHandler = (path: (string | number)[], pitch: Pitch) => void;

let _didInit = false;

export default class Application {
  constructor(options: ISatieOptions) {
    if (_didInit) {
      throw new Error("There can only be one Satie Application.");
    }

    _didInit = true;
    init(options);
  }
}
