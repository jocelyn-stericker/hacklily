// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { Clef, Key, Time } from "#/musicxml-interfaces";

export interface MakelilyToolProps {
  clef: Clef;
  keySig: Key;
  time: Time;

  onInsertLy(ly: string): void;
}
