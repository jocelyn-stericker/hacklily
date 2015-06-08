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

import MusicXML             = require("musicxml-interfaces");
import _                    = require("lodash");

"use strict";

/**
 * Returns true if warning Attributes are required at the end of a line, and false otherwise.
 */
export function needsWarning(end: MusicXML.Attributes, start: MusicXML.Attributes, staff: number) {
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
    let numeratorSegments = _.reduce(attributes.times[staff].beats, (memo, beats) => memo + beats.split("+").length, 0);
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

    const fifths: number = Math.min(7, Math.abs(keySignature.fifths));
    if (fifths) {
        return 10.4 * fifths;
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
            line:               2,
            sign:               "G",
            additional:         false,
            afterBarline:       false,
            clefOctaveChange:   null,
            color:              "#000000",
            defaultX:           -16,
            defaultY:           16,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number:             1,
            printObject:        true,
            relativeX:          0,
            relativeY:          0,
            size:               1
        }, {
            // bass
            line:               4,
            sign:               "F",
            additional:         false,
            afterBarline:       false,
            clefOctaveChange:   null,
            color:              "#000000",
            defaultX:           -16,
            defaultY:             4,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number:             1,
            printObject:        true,
            relativeX:          0,
            relativeY:          0,
            size:               1
        }, {
            // tenor
            line:               3,
            sign:               "C",
            additional:         false,
            afterBarline:       false,
            clefOctaveChange:   null,
            color:              "#000000",
            defaultX:           -16,
            defaultY:             0,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number:             1,
            printObject:        true,
            relativeX:          0,
            relativeY:          0,
            size:               1
        }, {
            // alto
            line:               4,
            sign:               "C",
            additional:         false,
            afterBarline:       false,
            clefOctaveChange:   null,
            color:              "#000000",
            defaultX:           -16,
            defaultY:           8,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number:             1,
            printObject:        true,
            relativeX:          0,
            relativeY:          0,
            size:               1
        },
        {
            line:               3,
            sign:               "percussion",
            additional:         false,
            afterBarline:       false,
            clefOctaveChange:   null,
            color:              "#000000",
            defaultX:           -16,
            defaultY:           8,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number:             1,
            printObject:        true,
            relativeX:          0,
            relativeY:          0,
            size:               1
        },
        {
            line:               5,
            sign:               "tab",
            additional:         false,
            afterBarline:       false,
            clefOctaveChange:   null,
            color:              "#000000",
            defaultX:           -16,
            defaultY:           8,
            fontFamily:         "",
            fontSize:           "small",
            fontStyle:          0,
            fontWeight:         0,
            number:             1,
            printObject:        true,
            relativeX:          0,
            relativeY:          0,
            size:               1
        }
    ];
}

export const NUMBER_SPACING     = 28;
export const PLUS_SPACING       = 12;
export const CLEF_INDENTATION = 7; // Gould(6): "A clef is indented into the stave by one stave-space or a little less"

