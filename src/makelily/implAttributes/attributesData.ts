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

import {Key} from "musicxml-interfaces";
import {times, forEach, map, reduce} from "lodash";
import * as invariant from "invariant";

import IAttributesSnapshot from "../private/attributesSnapshot";

export const NUMBER_SPACING = 28;
export const PLUS_SPACING = 12;
// Gould(6): "A clef is indented into the stave by one stave-space or a little less"
export const CLEF_INDENTATION = 7;
export const FLAT_WIDTH = 10;
export const DOUBLE_FLAT_WIDTH = 19;
export const DOUBLE_SHARP_WIDTH = 13;
export const SHARP_WIDTH = 11;
export const NATURAL_WIDTH = 11;

/**
 * Returns true if warning Attributes are required at the end of a line, and false otherwise.
 */
export function needsWarning(end: IAttributesSnapshot, start: IAttributesSnapshot, staff: number) {
    invariant(!!end && !!start,
        "A null end or start was passed to needsWarning. Check your types!!");
    invariant(!("P1" in end || "P1" in start),
        "An object with 'P1' was passed to needsWarning. Check your types!!");
    return !clefsEqual(end, start, staff) || !timesEqual(end, start, 0) || !keysEqual(end, start, 0);
}

export function warningWidth(end: IAttributesSnapshot, start: IAttributesSnapshot, staff: number) {
    if (!start) {
        return 0;
    }
    let totalWidth = 0;
    if (!clefsEqual(end, start, staff)) {
        totalWidth += clefWidth(start, staff);
    }
    if (!timesEqual(end, start, 0)) {
        totalWidth += timeWidth(start, 0);
    }
    if (!keysEqual(end, start, 0)) {
        totalWidth += keyWidth(start, 0);
    }
    return totalWidth;
}

export function clefWidth(attributes: IAttributesSnapshot, staff: number) {
    return 24;
}

export function timeWidth(attributes: IAttributesSnapshot, staff: number) {
    if (staff !== 0) {
        console.warn("Satie does not support different time signatures concurrently.");
    }

    if (!attributes.time || !attributes.time.beatTypes) {
        return 0;
    }
    let beats = attributes.time.beats;
    let numeratorSegments = reduce(beats, (memo, beats) => memo + beats.split("+").length, 0);
    return NUMBER_SPACING * numeratorSegments +
        (attributes.time.beatTypes.length - 1) * PLUS_SPACING;
}

export function keyWidth(attributes: IAttributesSnapshot, staff: number) {
    if (staff !== 0) {
        console.warn("Satie does not support different key signature concurrently, yet.");
    }

    if (!attributes.keySignature) {
        return 0;
    }

    const keySignature = attributes.keySignature;

    if (keySignature.fifths || keySignature.keyAlters) {
        return 2 + reduce(keyWidths(keySignature), (memo, width) => memo + width, 0);
    } else {
        return -5;
    }
}

export function clefsEqual(from: IAttributesSnapshot, to: IAttributesSnapshot, staff: number) {
    let cA = from && from.clef;
    let cB = to && to.clef;
    if (!cA || !cB) {
        return false;
    }

    return cA.sign === cB.sign &&
        cA.line === cB.line &&
        cA.clefOctaveChange === cB.clefOctaveChange;
}

export function timesEqual(from: IAttributesSnapshot, to: IAttributesSnapshot, staff: number) {
    if (staff !== 0) {
        console.warn("Satie does not support different time signatures concurrently.");
    }
    let tA = from && from.time;
    let tB = to && to.time;
    if (!tA || !tB) {
        return false;
    }

    return JSON.stringify(tA.beats) === JSON.stringify(tB.beats) &&
        JSON.stringify(tA.beatTypes) === JSON.stringify(tB.beatTypes) &&
        !!tA.senzaMisura === !!tB.senzaMisura &&
        tA.symbol === tB.symbol;
}

export function keysEqual(from: IAttributesSnapshot, to: IAttributesSnapshot, staff: number) {
    if (staff !== 0) {
        console.warn("Satie does not support different key signature concurrently, yet.");
    }
    let keyA = from && from.keySignature;
    let keyB = to && to.keySignature;
    if (!keyA || !keyB) {
        return false;
    }

    return keyA.fifths === keyB.fifths &&
        JSON.stringify(keyA.keySteps) === JSON.stringify(keyB.keySteps) &&
        JSON.stringify(keyA.keyAccidentals) === JSON.stringify(keyB.keyAccidentals) &&
        JSON.stringify(keyA.keyAlters) === JSON.stringify(keyB.keyAlters) &&
        keyA.mode === keyB.mode;
}

export function approximateWidth(attributes: IAttributesSnapshot, atEnd = AtEnd.No) {
    if (atEnd) {
        return 80;
    }
    return 150;
}

export const enum AtEnd {
    No = 0,
    Yes = 1
}

export function keyWidths(spec: Key) {
    let widths: number[] = [];
    if (spec.keyAlters) {
        return map(spec.keyAlters, alter => {
            switch (alter) {
                case "-2":
                case "-1.5":
                    return DOUBLE_FLAT_WIDTH;
                case "-1":
                case "-0.5":
                    return FLAT_WIDTH;
                case "0":
                    return NATURAL_WIDTH;
                case "0.5":
                case "1":
                    return SHARP_WIDTH;
                case "1.5":
                case "2":
                    return DOUBLE_SHARP_WIDTH;
                default:
                    console.warn("Unknown accidental ", alter);
                    return SHARP_WIDTH;
            }
        });
    }
    let accidentalCount = Math.min(7, Math.abs(spec.fifths));
    let idxes = times(accidentalCount, i => (i + Math.max(0, Math.abs(spec.fifths) - 7)) % 7);
    forEach(idxes, i => widths[i] = getWidth(i, spec.fifths >= 0));
    return widths;

    function getWidth(i: number, sharp: boolean): number {
        switch (true) {
            case (sharp && 7 + i < spec.fifths):
                return DOUBLE_SHARP_WIDTH;
            case (sharp && 7 + i >= spec.fifths):
                return SHARP_WIDTH;
            case (!sharp && (7 + i < -spec.fifths)):
                return DOUBLE_FLAT_WIDTH;
            case (!sharp && (7 + i >= -spec.fifths)):
                return FLAT_WIDTH;
            default:
                throw new Error("Impossible.");
        }

        return 10;
    }
}
