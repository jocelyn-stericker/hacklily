// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import { isEqual } from "lodash";

import type { IAny, IListInsert } from "#/musicxml-interfaces/operations";

import type { Document, ISegment } from "./document";
import type { IFactory } from "./private_factory";
import { cloneObject } from "./private_util";

export default function segmentMutator(
  factory: IFactory,
  segment: ISegment,
  op: IAny,
  doc: Document,
) {
  const { part, ownerType } = segment; // p[2]
  invariant(op.p.length === 6, "Invalid length for segment operation.");

  invariant(op.p[1] === "parts", "Malformed path.");
  invariant(op.p[2] === part, "Invalid fixup part.");
  invariant(
    op.p[3] === "voices" || op.p[3] === "staves",
    "Only voice and staff fixups are supported.",
  );
  invariant(
    (op.p[3] === "voices" && ownerType === "voice") ||
      (op.p[3] === "staves" && ownerType === "staff"),
    "Type/path mismatch",
  );

  if ("li" in op && !("ld" in op)) {
    const liop = op as IListInsert<any>;
    const newModel = factory.fromSpec(liop.li);
    if (liop.li._class === "VisualCursor") {
      doc._visualCursor = newModel;
    }
    segment.splice(op.p[5] as number, 0, newModel);
  } else if ("ld" in op && !("li" in op)) {
    const existingSerializable: any = cloneObject(segment[op.p[5] as number]);
    const ld: any = cloneObject(op.ld);
    if (!isEqual(existingSerializable, ld)) {
      console.warn(
        "The element to be removed should be accurately specified in the operation.\n\n" +
          "OPERATION SPEC: " +
          JSON.stringify(ld, null, 2) +
          "\n\n" +
          "ACTUAL SPEC: " +
          JSON.stringify(existingSerializable, null, 2) +
          "\n\n" +
          "Your patch is broken.",
      );
    }
    segment.splice(op.p[5] as number, 1);
  } else {
    throw new Error("Unsupported operation type");
  }
}
