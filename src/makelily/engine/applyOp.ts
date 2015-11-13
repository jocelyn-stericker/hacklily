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

import invariant = require("invariant");
import {find, cloneDeep} from "lodash";
import {IAny} from "musicxml-interfaces/operations";

import Type from "../document/types";
import IDocument from "../document/document";

import ILinesLayoutState from "../private/linesLayoutState";

import chordMutator from "../implChord/chordMutator";

/**
 * Applies an operation to the given document. Functions under "mutators/" are actually responsible
 * for actually doing the mutations.
 *
 * CAREFUL: Does not touch `appliedOperations` because this function can also be used for undo. It's
 * the caller's responsibility to update `appliedOperations`.
 *
 * @param op.p [measureUUID, ("part"|"voice")]
 */
export default function applyOp(doc: IDocument, op: IAny, memo: ILinesLayoutState) {
    let path = op.p;
    let measureUUID = parseInt(String(path[0]), 10);
    let measure = find(doc.measures, (measure) => measure.uuid === measureUUID);
    invariant(Boolean(measure), `Invalid operation path: no such measure ${path[0]}`);

    invariant(path[1] === "parts",
        `Invalid operation path: only parts is supported, not ${path[1]}`);

    let part = measure.parts[path[2]];
    invariant(Boolean(part), `Invalid operation path: no such part ${part}`);
    ++measure.version;

    invariant(path[3] === "voices" || path[3] === "staves",
        `Invalid operation path: ${path[3]} should have been "voices" or "staves`);

    if (path[3] === "voices") {
        let voice = part.voices[parseInt(String(path[4]), 10)];
        invariant(Boolean(voice),
            `Invalid operation path: No such voice ${path.slice(0,4).join(", ")}`);
        let element = voice[parseInt(String(path[5]), 10)];
        invariant(Boolean(element),
            `Invalid operation path: No such element ${path.slice(0,5).join(", ")}`);

        let localOp: IAny = cloneDeep(op);
        localOp.p = path.slice(6);
        if (doc.modelHasType(element, Type.Chord)) {
            chordMutator(memo, element as any, localOp);
        } else {
            invariant(false, "Invalid operation path: No reducer for", element);
        }
    } else if (path[3] === "staves") {
        invariant(false, "Stave changes not implemented");
    }
}
