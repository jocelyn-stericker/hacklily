/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

import MusicXML = require("musicxml-interfaces");
import _ = require("lodash");
import invariant = require("react/lib/invariant");

"use strict";

module IAttributes {

/**
 * Returns true if warning Attributes are required at the end of a line, and false otherwise.
 */
export function needsWarning(end: MusicXML.Attributes, start: MusicXML.Attributes, staff: number) {
    if ("P1" in end || "P1" in start) {
        invariant(null, "An object with 'P1' was passed to needsWarning. Check your types!!");
    }
    return !clefsEqual(end, start, staff) || !timesEqual(end, start, 0) || !keysEqual(end, start, 0);
}

export function warningWidth(end: MusicXML.Attributes, start: MusicXML.Attributes, staff: number) {
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

export function clefWidth(attributes: MusicXML.Attributes, staff: number) {
    return 24;
}

export function timeWidth(attributes: MusicXML.Attributes, staff: number) {
    if (staff !== 0) {
        console.warn("Satie does not support different time signatures concurrently.");
    }

    if (!attributes.times || !attributes.times[staff] || !attributes.times[staff].beatTypes) {
        return 0;
    }
    let beats = attributes.times[staff].beats;
    let numeratorSegments = _.reduce(beats, (memo, beats) => memo + beats.split("+").length, 0);
    return NUMBER_SPACING*numeratorSegments +
        (attributes.times[staff].beatTypes.length - 1)*PLUS_SPACING;
}

export function keyWidth(attributes: MusicXML.Attributes, staff: number) {
    if (staff !== 0) {
        console.warn("Satie does not support different key signature concurrently, yet.");
    }

    if (!attributes.keySignatures || !attributes.keySignatures[staff]) {
        return 0;
    }

    const keySignature = attributes.keySignatures[staff];

    if (keySignature.fifths || keySignature.keyAlters) {
        return 2 + _.reduce(keyWidths(keySignature), (memo, width) => memo + width, 0);
    } else {
        return -5;
    }
}

export function clefsEqual(from: MusicXML.Attributes, to: MusicXML.Attributes, staff: number) {
    let cA = from && from.clefs && from.clefs[staff];
    let cB = to && to.clefs && to.clefs[staff];
    if (!cA || !cB) {
        return false;
    }

    return cA.sign === cB.sign &&
        cA.line === cB.line &&
        cA.clefOctaveChange === cB.clefOctaveChange;
}

export function timesEqual(from: MusicXML.Attributes, to: MusicXML.Attributes, staff: number) {
    if (staff !== 0) {
        console.warn("Satie does not support different time signatures concurrently.");
    }
    let tA = from && from.times && from.times[staff];
    let tB = to && to.times && to.times[staff];
    if (!tA || !tB) {
        return false;
    }

    return JSON.stringify(tA.beats) === JSON.stringify(tB.beats) &&
        JSON.stringify(tA.beatTypes) === JSON.stringify(tB.beatTypes) &&
        !!tA.senzaMisura === !!tB.senzaMisura &&
        tA.symbol === tB.symbol;
}

export function keysEqual(from: MusicXML.Attributes, to: MusicXML.Attributes, staff: number) {
    if (staff !== 0) {
        console.warn("Satie does not support different key signature concurrently, yet.");
    }
    let keyA = from && from.keySignatures && from.keySignatures[staff];
    let keyB = to && to.keySignatures && to.keySignatures[staff];
    if (!keyA || !keyB) {
        return false;
    }

    return keyA.fifths === keyB.fifths &&
        JSON.stringify(keyA.keySteps) === JSON.stringify(keyB.keySteps) &&
        JSON.stringify(keyA.keyAccidentals) === JSON.stringify(keyB.keyAccidentals) &&
        JSON.stringify(keyA.keyAlters) === JSON.stringify(keyB.keyAlters) &&
        keyA.mode === keyB.mode;
}

export function approximateWidth(attributes: MusicXML.Attributes, atEnd = AtEnd.No) {
    if (atEnd) {
        return 80;
    }
    return 150;
}

export const enum AtEnd {
    No = 0,
    Yes = 1
}

export module Clef {
    export const standardClefs: MusicXML.Clef[] = [
        {
            // Treble
            line: 2,
            sign: "G",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 16,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        }, {
            // bass
            line: 4,
            sign: "F",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 4,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        }, {
            // tenor
            line: 3,
            sign: "C",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 0,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        }, {
            // alto
            line: 4,
            sign: "C",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 8,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        },
        {
            line: 3,
            sign: "percussion",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 8,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        },
        {
            line: 5,
            sign: "tab",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 8,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        }
    ];
}

export function keyWidths(spec: MusicXML.Key) {
    let widths: number[] = [];
    if (spec.keyAlters) {
        return _.map(spec.keyAlters, alter => {
            switch(alter) {
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
    let idxes = _.times(accidentalCount, i => (i + Math.max(0, Math.abs(spec.fifths) - 7)) % 7);
    _.forEach(idxes, i => widths[i] = getWidth(i, spec.fifths >= 0));
    return widths;

    function getWidth(i: number, sharp: boolean): number {
        switch(true) {
            case (sharp && 7 + i < spec.fifths):
                return DOUBLE_SHARP_WIDTH;
            case (sharp && 7 + i >= spec.fifths):
                return SHARP_WIDTH;
            case (!sharp && (7 + i < -spec.fifths)):
                return DOUBLE_FLAT_WIDTH;
            case (!sharp && (7 + i >= -spec.fifths)):
                return FLAT_WIDTH;
        }

        return 10;
    }
}

export const NUMBER_SPACING = 28;
export const PLUS_SPACING = 12;
// Gould(6): "A clef is indented into the stave by one stave-space or a little less"
export const CLEF_INDENTATION = 7;
export const FLAT_WIDTH = 10;
export const DOUBLE_FLAT_WIDTH = 19;
export const DOUBLE_SHARP_WIDTH = 13;
export const SHARP_WIDTH = 11;
export const NATURAL_WIDTH = 11;

export interface IAttributesExt extends MusicXML.Attributes {
    satieMeasureStyle: MusicXML.MeasureStyle;
    multipleRestMeasureStyle: MusicXML.MultipleRest;
    measureStyleStartMeasure: number;
}

}

export default IAttributes;
