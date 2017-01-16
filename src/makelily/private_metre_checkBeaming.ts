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

import {reduce, forEach} from "lodash";
import * as invariant from "invariant";

import * as D from "./private_metre_metreDurations";
import {IChord} from "./private_chordUtil";
import getTSString from "./private_metre_getTSString";

import {Time} from "musicxml-interfaces";

// Adapted from Behind Bars (E. Gould) page 155
const BEAMING_PATTERNS: {[key: string]: IChord[]} = {
    "1/16": [D._16],

    "2/16": [D._16, D._16],
    "1/8": [D._8],

    "3/16": [D._8D],

    "4/16": [D._8, D._8],
    "2/8": [D._8, D._8],
    "1/4": [D._4],

    "5/16": [D._8D, D._8],
    "5/16_alt": [D._8, D._8D],

    "6/16": [D._8D, D._8D],
    "3/8": [D._4D],

    "4/8": [D._4, D._4],
    "2/4": [D._2],
    "2/4_clean": [D._4, D._4],
    "1/2": [D._2],

    "9/16": [D._8D, D._8D, D._8D],

    "5/8": [D._4D, D._4],
    "5/8_alt": [D._4, D._4D],

    "12/16": [D._8D, D._8D, D._8D, D._8D],
    "6/8": [D._4D, D._4D],
    "3/4": [D._2D],

    "7/8": [D._4, D._8D],
    "7/8_alt": [D._8D, D._4],

    "8/8": [D._4D, D._4D, D._4],
    "8/8_alt": [D._4D, D._4, D._4D],
    "8/8_alt2": [D._4, D._4D, D._4D],
    "4/4": [D._2, D._2],
    "4/4_clean": [D._4, D._4, D._4, D._4],
    "2/2": [D._2, D._2],
    "1/1": [D._1],

    "9/8": [D._4D, D._4D, D._4D],

    "10/8": [D._2, D._4D, D._4D],
    "10/8_alt": [D._4D, D._2, D._4D],
    "10/8_alt2": [D._4D, D._4D, D._2],
    "5/4": [D._2D, D._2],
    "5/4_alt": [D._2, D._2D],

    "12/8": [D._4D, D._4D, D._4D, D._4D],
    "6/4": [D._2D, D._2D],
    "3/2": [D._2, D._2, D._2],

    "7/4": [D._1, D._2D],
    "7/4_alt": [D._2D, D._1],

    "15/8": [D._4D, D._4D, D._4D, D._4D, D._4D],

    "8/4": [D._1, D._1],
    "4/2": [D._1, D._1],
    "2/1": [D._1, D._1],

    "18/8": [D._4D, D._4D, D._4D, D._4D, D._4D, D._4D],
    "9/4": [D._2D, D._2D, D._2D]
};

export function getBeamingPattern(time: Time, alt?: string) {
    let pattern: IChord[] = BEAMING_PATTERNS[getTSString(time) + (alt ? "_" + alt : "")];
    let factors: {[key: number]: number[]} = {
        4: [4, 3, 2, 1],
        8: [12, 8, 4, 3, 2, 1],
        16: [4, 3, 2, 1]
    };
    if (time.senzaMisura != null) {
        return [];
    }
    if (!pattern) {
        // TODO: Partial & Mixed
        pattern = [];
        // TODO: Varying denominators will err for the remainder of this function
        let beatsToAdd = reduce(time.beats, (memo, beat) => {
            return memo + reduce(beat.split("+"), (m, b) => m + parseInt(b, 10), 0);
        }, 0);
        let ownFactors = factors[time.beatTypes[0]];
        forEach(ownFactors, factor => {
            while (beatsToAdd >= factor) {
                pattern = pattern.concat(BEAMING_PATTERNS[factor + "/" + time.beatTypes[0]]);
                beatsToAdd -= factor;
            }
        });
    }
    invariant(!!pattern, "Unknown beaming pattern");
    return pattern;
}
