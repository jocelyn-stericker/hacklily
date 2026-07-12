// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import { cloneDeep } from "lodash";

import type { Note } from "#/musicxml-interfaces";
import { serializeNote } from "#/musicxml-interfaces";
import type {
  IAny,
  IObjectReplace,
  IListInsert,
  IListDelete,
  IListReplace,
} from "#/musicxml-interfaces/operations";

import type ChordImpl from "./implChord_chordImpl";
import NoteImpl from "./implChord_noteImpl";
import noteMutator from "./implChord_noteMutator";
import { replace, remove } from "./private_mutate";

export default function chordMutator(chord: ChordImpl, op: IAny) {
  const path = op.p;

  if (op.p[0] === "notes") {
    if (path.length === 2) {
      const idx = path[1] as number;
      invariant(!isNaN(idx), "Expected path index within chord to be a number");

      if ("li" in op && "ld" in op) {
        const replacement = op as IListReplace<Note>;
        invariant(
          serializeNote(replacement.ld) === serializeNote(chord[idx]),
          "Cannot remove mismatching item from %s.",
          path.join(" "),
        );
        chord.splice(idx, 1, new NoteImpl(chord, idx, replacement.li));
      } else if ("li" in op) {
        const insertion = op as IListInsert<Note>;
        chord.splice(idx, 0, new NoteImpl(chord, idx, insertion.li));
      } else if ("ld" in op) {
        const deletion = op as IListDelete<Note>;
        invariant(
          serializeNote(deletion.ld) === serializeNote(chord[idx]),
          "Cannot remove mismatching item from %s.",
          path.join(" "),
        );
        chord.splice(idx, 1);
      } else {
        throw new Error("Unsupported operation");
      }

      chord._init = false;
    } else {
      const note = chord[parseInt(String(op.p[1]), 10)];
      invariant(
        Boolean(note),
        `Invalid operation path for chord. No such note ${op.p[1]}`,
      );

      const localOp: IAny = cloneDeep(op);
      localOp.p = path.slice(2);
      noteMutator(note, localOp);

      chord._init = false;
    }
  } else if (op.p[0] === "count") {
    if ("od" in op && "oi" in op) {
      replace(chord, op as IObjectReplace<any>);
    } else if ("od" in op) {
      remove(chord, op as IObjectReplace<any>);
    } else {
      throw new Error("Unsupported operation");
    }
  } else if (op.p[0] === "divCount") {
    chord.divCount = op.oi;
  } else {
    throw new Error(
      `Invalid/unimplemented operation path for chord: ${op.p[0]}`,
    );
  }
}
