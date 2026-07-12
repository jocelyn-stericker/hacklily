// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { IAny } from "#/musicxml-interfaces/operations";

import type { IBarlineModel } from "./implBarline_barlineModel";
import { mutate } from "./private_mutate";

export default function barlineMutator(barline: IBarlineModel, op: IAny) {
  // This is a stub.
  mutate(barline, op);
}
