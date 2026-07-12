// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { Tuplet } from "#/musicxml-interfaces";

export interface IBeamLayout {
  beamCount: number[];
  x: number[];
  y1: number;
  y2: number;
  direction: number;
  tuplet?: Tuplet;
}
