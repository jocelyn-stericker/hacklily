// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { IAny } from "#/musicxml-interfaces/operations";

import type { IPrintModel } from "./implPrint_printModel";
import { mutate } from "./private_mutate";

export default function printMutator(
  _preview: boolean,
  print: IPrintModel,
  op: IAny,
) {
  // This is a stub.
  mutate(print, op);
}
