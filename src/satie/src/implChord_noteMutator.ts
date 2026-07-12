// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";

import type {
  IAny,
  IObjectReplace,
  IObjectDelete,
  IObjectInsert,
} from "#/musicxml-interfaces/operations";

import type NoteImpl from "./implChord_noteImpl";
import { replace, remove, set, mutate } from "./private_mutate";

export default function noteMutator(note: NoteImpl, op: IAny) {
  if (op.p.length > 2) {
    mutate(note, op);
    return;
  }

  if ("od" in op && "oi" in op) {
    if (op.p.length === 2 && op.p[0] === "noteType" && op.p[1] === "duration") {
      note.noteType = {
        duration: op.oi,
      };
    } else {
      replace(note, op as IObjectReplace<any>);
    }
  } else if ("od" in op) {
    remove(note, op as IObjectDelete<any>);
  } else if ("oi" in op) {
    invariant(!(note as any)[op.p[0]], "Object already set");
    set(note, op as IObjectInsert<any>);
  } else if ("ld" in op || "li" in op) {
    mutate(note, op);
  } else {
    throw new Error("Unknown operation");
  }
}
