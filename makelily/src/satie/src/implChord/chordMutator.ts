/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import * as invariant from "invariant";
import {cloneDeep} from "lodash";
import {Note, serializeNote} from "musicxml-interfaces";
import {IAny, IObjectReplace, IListInsert, IListDelete,
    IListReplace} from "musicxml-interfaces/operations";

import ILinesLayoutState, {markDirty} from "../private/linesLayoutState";

import ChordImpl from "./chordImpl";
import NoteImpl from "./noteImpl";

import noteMutator from "./noteMutator";
import {replace, remove} from "../private/mutate";

export default function chordMutator(memo$: ILinesLayoutState, chord: ChordImpl, op: IAny) {
    const path = op.p;

    if (op.p[0] === "notes") {
        if (path.length === 2) {
            const idx = path[1] as number;
            invariant(!isNaN(idx), "Expected path index within chord to be a number");

            if ("li" in op && "ld" in op) {
                const replacement = op as IListReplace<Note>;
                invariant(serializeNote(replacement.ld) === serializeNote(chord[idx]),
                        "Cannot remove mismatching item from %s.", path.join(" "));
                chord.splice(idx, 1, new NoteImpl(chord, idx, replacement.li));
            } else if ("li" in op) {
                const insertion = op as IListInsert<Note>;
                chord.splice(idx, 0, new NoteImpl(chord, idx, insertion.li));
            } else if ("ld" in op) {
                const deletion = op as IListDelete<Note>;
                invariant(serializeNote(deletion.ld) === serializeNote(chord[idx]),
                        "Cannot remove mismatching item from %s.", path.join(" "));
                chord.splice(idx, 1);
            } else {
                invariant(false, "Unsupported operation");
            }

            chord._init = false;
            markDirty(memo$, chord);
        } else {
            let note = chord[parseInt(String(op.p[1]), 10)];
            invariant(Boolean(note), `Invalid operation path for chord. No such note ${op.p[1]}`);

            let localOp: IAny = cloneDeep(op);
            localOp.p = path.slice(2);
            noteMutator(memo$, note, localOp);

            chord._init = false;
            markDirty(memo$, chord);
        }
    } else if (op.p[0] === "count") {
        if ("od" in op && "oi" in op) {
            replace(chord, op as IObjectReplace<any>);
        } else if ("od" in op) {
            remove(chord, op as IObjectReplace<any>);
        } else {
            invariant(false, "Unsupported operation");
        }
    } else {
        invariant(false, `Invalid/unimplemented operation path for chord: ${op.p[0]}`);
    }
}
