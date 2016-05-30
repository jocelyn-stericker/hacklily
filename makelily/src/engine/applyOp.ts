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
import {find, cloneDeep, forEach} from "lodash";
import {IAny} from "musicxml-interfaces/operations";

import Type from "../document/types";
import IMeasure from "../document/measure";
import IMeasurePart from "../document/measurePart";

import ILinesLayoutState from "../private/linesLayoutState";
import IFactory from "../private/factory";

import chordMutator from "../implChord/chordMutator";
import segmentMutator from "../implSegment/segmentMutator";

/**
 * Applies an operation to the given set of measures, usually part of a document.
 *
 * CAREFUL: Does not touch `appliedOperations` because this function can also be used for undo. It's
 * the caller's responsibility to update `appliedOperations`.
 *
 * @param op.p [measureUUID, ("part"|"voice")]
 */
export default function applyOp(measures: IMeasure[], factory: IFactory, op: IAny, memo: ILinesLayoutState) {
    let path = op.p;
    if (path.length === 2 && path[0] === "measures") {
        // Song-wide measure addition/removal
        const localOp = {
            p: op.p.slice(1),
            ld: op.ld,
            li: op.li,
        };
        applyMeasureOp(measures, factory, localOp, memo);
        return;
    }
    let measureUUID = parseInt(String(path[0]), 10);
    let measure = find(measures, (measure) => measure.uuid === measureUUID);
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

        if (path.length === 6 && (op.li && !op.ld) || (!op.li && op.ld)) {
            segmentMutator(factory, memo, voice, op);
            return;
        }

        let element = voice[parseInt(String(path[5]), 10)];
        invariant(Boolean(element),
            `Invalid operation path: No such element ${path.slice(0,5).join(", ")}`);

        let localOp: IAny = cloneDeep(op);
        localOp.p = path.slice(6);
        if (factory.modelHasType(element, Type.Chord)) {
            chordMutator(memo, element as any, localOp);
        } else {
            invariant(false, "Invalid operation path: No reducer for", element);
        }
    } else if (path[3] === "staves") {
        let staff = part.staves[parseInt(String(path[4]), 10)];
        invariant(Boolean(staff),
            `Invalid operation path: No such staff ${path.slice(0,4).join(", ")}`);

        if (path.length === 6 && (op.li && !op.ld) || (!op.li && op.ld)) {
            segmentMutator(factory, memo, staff, op);
            return;
        }
        invariant(false, "Stave changes not implemented");
    }
}

export function applyMeasureOp(measures: IMeasure[], factory: IFactory, op: IAny, memo: ILinesLayoutState) {
    if ((typeof op.li !== "undefined") && (typeof op.ld === "undefined") && op.p.length === 1) {
        const measureIdx = op.p[0] as number;
        invariant(!isNaN(measureIdx), `Measure index ${measureIdx} must be`);
        invariant(Boolean(op.li.uuid), "uuid must be specified");
        let oldMeasure$ = measures[measureIdx];
        const oldParts = oldMeasure$.parts;
        const newParts: {
            [id: string]: IMeasurePart;
        } = op.li.newParts;
        forEach(oldParts, (part, partID) => {
            forEach(part.staves, (staff, staffIdx) => {
                if (!staff) {
                    newParts[partID].staves[staffIdx] =
                        newParts[partID].staves[staffIdx] || null;
                } else {
                    newParts[partID].staves[staffIdx] =
                        newParts[partID].staves[staffIdx] || <any>[];
                    let nv = newParts[partID].staves[staffIdx];
                    nv.divisions = staff.divisions;
                    nv.part = staff.part;
                    nv.owner = staff.owner;
                    nv.ownerType = staff.ownerType;
                }
            });
        });
        let newMeasure = {
            idx: measureIdx + 1,
            uuid: op.li.uuid,
            number: "" + (parseInt(oldMeasure$.number, 10) + 1),
            implicit: false,
            width: NaN,
            nonControlling: false,
            parts: newParts,
            version: 0
        };

        oldMeasure$.parts = oldParts;
        measures.splice(measureIdx + 1, 0, newMeasure);
    } else if ((typeof op.li === "undefined") && (typeof op.ld !== "undefined")) {
        const measureIdx = op.p[0] as number;
        invariant(!isNaN(measureIdx), `Measure index ${measureIdx} must be`);
        invariant(Boolean(op.ld.uuid), "uuid must be specified");
        invariant(op.ld.uuid === measures[measureIdx + 1].uuid,
            `invalid uuid ${op.ld.uuid} != ${measures[measureIdx + 1].uuid}`);
        measures.splice(measureIdx + 1, 1);
    } else {
        invariant(false, `Invalid operation type ${JSON.stringify(op)}`);
    }
}
