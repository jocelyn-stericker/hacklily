/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
 * 
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Attributes, Key} from "musicxml-interfaces";
import {times, forEach, map, reduce} from "lodash";
import * as invariant from "invariant";

import {IAttributesSnapshot} from "./private_attributesSnapshot";

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
export function needsWarning(end: Attributes, start: Attributes, staff: number) {
    invariant(!!end && !!start,
        "A null end or start was passed to needsWarning. Check your types!!");
    invariant(!("P1" in end || "P1" in start),
        "An object with 'P1' was passed to needsWarning. Check your types!!");
    return !clefsEqual(end, start, staff) || !timesEqual(end, start) || !keysEqual(end, start);
}

export function clefWidth(attributes: Attributes) {
    return 24;
}

export function timeWidth(attributes: Attributes) {
    if (!attributes.times[0] || !attributes.times[0].beatTypes) {
        return 0;
    }
    let beats = attributes.times[0].beats;
    let numeratorSegments = reduce(beats, (memo, beats) => memo + beats.split("+").length, 0);
    return NUMBER_SPACING * numeratorSegments +
        (attributes.times[0].beatTypes.length - 1) * PLUS_SPACING;
}

export function keyWidth(attributes: Attributes) {
    if (!attributes.keySignatures[0]) {
        return 0;
    }

    const keySignature = attributes.keySignatures[0];

    if (keySignature.fifths || keySignature.keyAlters) {
        return 2 + reduce(keyWidths(keySignature), (memo, width) => memo + width, 0);
    } else {
        return -5;
    }
}

export function clefsEqual(from: Attributes, to: Attributes, staff: number) {
    let cA = from && from.clefs[staff];
    let cB = to && to.clefs[staff];
    if (!cA || !cB) {
        return false;
    }

    return cA.sign === cB.sign &&
        cA.line === cB.line &&
        cA.clefOctaveChange === cB.clefOctaveChange;
}

export function timesEqual(from: Attributes, to: Attributes) {
    let tA = from && from.times[0];
    let tB = to && to.times[0];
    if (!tA || !tB) {
        return false;
    }

    return JSON.stringify(tA.beats) === JSON.stringify(tB.beats) &&
        JSON.stringify(tA.beatTypes) === JSON.stringify(tB.beatTypes) &&
        !!tA.senzaMisura === !!tB.senzaMisura &&
        tA.symbol === tB.symbol;
}

export function keysEqual(from: Attributes, to: Attributes) {
    let keyA = from && from.keySignatures[0];
    let keyB = to && to.keySignatures[0];
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
    }
}

export function getNativeKeyAccidentals(spec: Key): {[note: string]: number} {
    let accidentals: {[note: string]: number} = {};
    const sharps = "FCGDAEB";
    const flats = "BEADGCF";
    if (spec.fifths) {
        let accCount = Math.min(7, Math.abs(spec.fifths));
        let sharp = spec.fifths >= 0;
        (sharp ? sharps : flats).slice(0, accCount).split("").forEach(note => {
            accidentals[note] = sharp ? 1 : -1;
        });
    } else if (spec.keySteps) {
        for (let i = 0; i < spec.keySteps.length; ++i) {
            accidentals[spec.keySteps[i]] = parseInt(spec.keyAlters[i], 10);
        }
    }
    return accidentals;
}
