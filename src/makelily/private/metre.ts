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

/**
 * @file models/chord/metre.ts Utilities for rhythm arithmetic
 */

import {Time, TimeModification, Count} from "musicxml-interfaces";
import {some, reduce, times, forEach, clone, find} from "lodash";
import * as invariant from "invariant";

import ICursor from "./cursor";
import IChord, {timeModification, count, dots} from "./chord";

const _512 = makeDuration({ count: 512 });
const _256 = makeDuration({ count: 256 });
const _256D = makeDuration({ count: 256, dots: 1 });
const _128 = makeDuration({ count: 128 });
const _128D = makeDuration({ count: 128, dots: 1 });
const _64 = makeDuration({ count: 64 });
const _64D = makeDuration({ count: 64, dots: 1 });
const _32 = makeDuration({ count: 32 });
const _32D = makeDuration({ count: 32, dots: 1 });
const _16 = makeDuration({ count: 16 });
const _16D = makeDuration({ count: 16, dots: 1 });
const _16DD = makeDuration({ count: 16, dots: 2 });
const _8 = makeDuration({ count: 8 });
const _8D = makeDuration({ count: 8, dots: 1 });
const _8DD = makeDuration({ count: 8, dots: 2 });
const _4 = makeDuration({ count: 4 });
const _4D = makeDuration({ count: 4, dots: 1 });
const _4DD = makeDuration({ count: 4, dots: 2 });
const _2 = makeDuration({ count: 2 });
const _2D = makeDuration({ count: 2, dots: 1 });
const _2DD = makeDuration({ count: 2, dots: 2 }); // TODO: conditionally include on allNotes
const _1 = makeDuration({ count: 1 });
const _1D = makeDuration({ count: 1, dots: 1 }); // TODO: conditionally include on allNotes
const _1DD = makeDuration({ count: 1, dots: 2 }); // TODO: conditionally include on allNotes
const _05 = makeDuration({ count: 1 / 2 }); // TODO: conditionally include on allNotes

export interface IMicroCursor {
    division$: number;
    staff: {
        attributes: {
            time: Time;
            divisions: number;
        };
        totalDivisions: number;
    };
}

const allNotes = [_1, _2D, _2,
    _4DD, _4D, _4, _8DD, _8D, _8, _16DD, _16D, _16, _32D,
    _32, _64D, _64, _128D, _128, _256D, _256, _512];

// Adapted from Behind Bars (E. Gould) page 155
const BEAMING_PATTERNS: {[key: string]: IChord[]} = {
    "1/16": [_16 ],

    "2/16": [_16, _16 ],
    "1/8": [_8 ],

    "3/16": [_8D ],

    "4/16": [_8, _8 ],
    "2/8": [_8, _8 ],
    "1/4": [_4 ],

    "5/16": [_8D, _8 ],
    "5/16_alt": [_8, _8D ],

    "6/16": [_8D, _8D ],
    "3/8": [_4D ],

    "4/8": [_4, _4 ],
    "2/4": [_2 ],
    "2/4_clean": [_4, _4 ],
    "1/2": [_2 ],

    "9/16": [_8D, _8D, _8D ],

    "5/8": [_4D, _4 ],
    "5/8_alt": [_4, _4D ],

    "12/16": [_8D, _8D, _8D, _8D ],
    "6/8": [_4D, _4D ],
    "3/4": [_2D ], // << XXX: Provided it doesn't give the illusion of 6/8.

    "7/8": [_4, _8D ],
    "7/8_alt": [_8D, _4 ],

    "8/8": [_4D, _4D, _4 ],
    "8/8_alt": [_4D, _4, _4D ],
    "8/8_alt2": [_4, _4D, _4D ],
    "4/4": [_2, _2 ],
    "4/4_clean": [_4, _4, _4, _4 ],
    "2/2": [_2, _2 ],
    "1/1": [_1 ], // << If only they were all like this...

    "9/8": [_4D, _4D, _4D ],

    "10/8": [_2, _4D, _4D ],
    "10/8_alt": [_4D, _2, _4D ],
    "10/8_alt2": [_4D, _4D, _2 ],
    "5/4": [_2D, _2 ],
    "5/4_alt": [_2, _2D ],

    "12/8": [_4D, _4D, _4D, _4D ],
    "6/4": [_2D, _2D ],
    "3/2": [_2, _2, _2 ],

    "7/4": [_1, _2D ],
    "7/4_alt": [_2D, _1 ],

    "15/8": [_4D, _4D, _4D, _4D, _4D ],

    "8/4": [_1, _1 ],
        // "Or any other combination"...
        // There's a whole bunch, and I think composers using 8/4 are willing
        // to select the correct beaming manually
    "4/2": [_1, _1 ],
    "2/1": [_1, _1 ],

    "18/8": [_4D, _4D, _4D, _4D, _4D, _4D ],
    "9/4": [_2D, _2D, _2D ]
};

const WHOLE_NOTE_PATTERNS: {[key: string]: IChord[]} = {
    "2/16": [_8 ],
    "1/8": [_8 ],

    "3/16": [_8D ],

    "4/16": [_4 ],
    "2/8": [_4 ],
    "1/4": [_4 ],

    "5/16": [_8D, _8 ],
    "5/16_alt": [_8, _8D ],

    "6/16": [_4D ],
    "3/8": [_4D ],

    "4/8": [_2 ],
    "2/4": [_2 ],
    "1/2": [_2 ],

    "9/16": [_4D, _8D ],

    "5/8": [_4D, _4 ],
    "5/8_alt": [_4, _4D ],

    "12/16": [_2D ],
    "6/8": [_2D ],
    "3/4": [_2D ],

    "7/8": [_2DD ],
    "7/8_alt": [_2DD ],

    "8/8": [_1 ],
    "8/8_alt": [_1 ],
    "8/8_alt2": [_1 ],
    "4/4": [_1 ],
    "2/2": [_1 ],
    "1/1": [_1 ], // << If only they were all like this...

    "9/8": [_2D, _4D ],

    "10/8": [_2, _2D ],
    "10/8_alt": [_4D, _2, _4D ],
    "10/8_alt2": [_2D, _2 ],
    "5/4": [_2D, _2 ],
    "5/4_alt": [_2, _2D ],

    "12/8": [_1D ],
    "6/4": [_1D ],
    "3/2": [_1D ],

    "7/4": [_1DD ],
    "7/4_alt": [_1DD ],

    "15/8": [_2D, _2D, _4D ],

    "8/4": [_05 ],
        // "Or any other combination"...
        // There's a whole bunch, and I think composers using 8/4 are willing
        // to select the correct beaming manually
    "4/2": [_1, _1 ],
    "2/1": [_1, _1 ],

    "18/8": [_1D, _2D ],
    "9/4": [_1D, _2D ]
};

/**
 * @returns a TS string for lookup in the BEAMING_PATTERNS array.
 */
export function getTSString(time: Time) {
    invariant(!!time, "Expected time to be defined.");
    return reduce(time.beats, (memo, beats, idx) => {
        return beats + "/" + time.beatTypes[idx];

    }, "");
}

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

/**
 * @returns an array of Duration specs that is the result of adding "durr2" to "durr1"
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function add(durr1: IChord, durr2: IChord,
        cursor: ICursor, beatOffset?: number): IChord[];
export function add(durr1: number, durr2: IChord,
        cursor: ICursor, beatOffset?: number): IChord[];

export function add(durr1: any, durr2: IChord,
        cursor: ICursor, beatOffset?: number): IChord[] {
    // Bizarrely, we use subtract to add. That's just because I wrote subtract first.
    durr1 = isNaN(durr1) ? calcDivisions(durr1, cursor) : durr1;
    return subtract(durr1 + calcDivisions(durr2, cursor), 0, cursor, beatOffset);
}

/**
 * @returns an array of Duration specs that is the result of subtracting "beats" from "durr1".
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function subtract(durr1: IChord, beats: number,
    cursor: IMicroCursor, beatOffset?: number): IChord[];
/**
 * @returns an array of Duration specs that is the result of subtracting "beats" from "durr1".
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function subtract(durr1: number, beats: number,
    cursor: IMicroCursor, beatOffset?: number): IChord[];

export function subtract(durr1: any, divisions: number,
        cursor: IMicroCursor, divisionOffset: number = 0): IChord[] {

    let replaceWith: IChord[] = [];
    let durr1Divisions: number = isNaN(<any>durr1) ? calcDivisions(durr1, cursor) : <number> durr1;
    let beatsToFill = durr1Divisions - divisions;
    let {attributes} = cursor.staff;
    let bp = getBeamingPattern(attributes.time);
    let currDivision = (cursor.division$ + divisionOffset) % cursor.staff.totalDivisions;

    let bpIdx = 0;
    for (let tries = 0; tries < 20; ++tries) {
        bpIdx = 0;
        let bpCount = 0;
        while (bp[bpIdx] &&
                    bpCount + _calcDivisions(count(bp[bpIdx]), dots(bp[bpIdx]), null,
                attributes.time, attributes.divisions) <= currDivision) {
            ++bpIdx;
            if (!bp[bpIdx]) {
                break;
            }
            bpCount += _calcDivisions(count(bp[bpIdx]), dots(bp[bpIdx]), null,
                attributes.time, attributes.divisions);
        }

        if (beatsToFill <= 0) {
            /* Exit! */
            return replaceWith;
        }
        some(allNotes, function(note) { // stop at first 'true'
            let noteDivisions = _calcDivisions(count(note), dots(note), null,
                attributes.time, attributes.divisions);

            if (noteDivisions <= beatsToFill) {
                // The subtraction is allowed to completely fill multiple pattern sections
                // but cannot partially fill more than 1.
                let completelyFills = false;
                let tmpBeats = currDivision + noteDivisions;
                let lengthOfPattern = 0;
                for (let i = 0; bp[bpIdx + i]; ++i) {
                    if (tmpBeats < 0) {
                        break;
                    }
                    let currDots = dots(bp[bpIdx + i]);
                    let currCount = count(bp[bpIdx + i]);
                    let {time, divisions} = attributes;
                    let bpBeats = _calcDivisions(currCount, currDots, null, time, divisions);
                    if (tmpBeats === bpBeats) {
                        completelyFills = true;
                        break;
                    }
                    tmpBeats -= bpBeats;
                    ++lengthOfPattern;
                }

                if (completelyFills || (lengthOfPattern - bpIdx <= 1)) {
                    // This either fills multiple segments perfectly, or fills less than one
                    // segment.
                    replaceWith.push(clone(note));
                    beatsToFill -= noteDivisions;
                    currDivision += noteDivisions;
                    return true;
                }
            }
        });
    }
    throw new Error(`Could not subtract duration. ${durr1}, ${divisions}, ${divisionOffset}`);
}

export function calcDivisions(chord: IChord, cursor: IMicroCursor) {
    if (some(chord, note => note.grace)) {
        return 0;
    }

    let {attributes} = cursor.staff;
    let currCount = count(chord);
    if (isNaN(currCount)) {
        return find(chord, note => note.duration).duration;
    }
    let intrinsicDivisions = _calcDivisions(
        currCount,
        dots(chord),
        timeModification(chord),
        attributes.time,
        attributes.divisions);

    // TODO: Make it so we can overflow without trying to add barlines?
    return Math.min(intrinsicDivisions, cursor.staff.totalDivisions);
}

export function calcDivisionsNoCtx(chord: IChord, time: Time, divisions: number) {
    let currCount = count(chord);
    if (isNaN(currCount)) {
        return find(chord, note => note.duration).duration;
    }
    return _calcDivisions(
        currCount,
        dots(chord),
        timeModification(chord),
        time,
        divisions);
}

export function _calcDivisions(count: number, dots: number,
        timeModification: TimeModification, time: Time, divisions: number) {
    if (time.senzaMisura !== undefined) {
        time = {
            beatTypes: [4],
            beats: ["4"]
        };
    }
    if (count === -1) {
        // TODO: What if beatType isn't consistent?
        return divisions * reduce(time.beats, (memo, durr) =>
            memo + reduce(durr.split("+"), (m, l) => m + parseInt(l, 10), 0), 0);
    }

    if (count === Count.Breve) {
        count = 0.5;
    }
    if (count === Count.Long) {
        count = 0.25; // We really should...
    }
    if (count === Count.Maxima) {
        count = 0.125; // ... not support these at all.
    }

    invariant(!!time, "A time signature must be specified.");
    let base = divisions * 4 / count;

    if (timeModification) {
        base *= timeModification.normalNotes / timeModification.actualNotes;
    }

    let total = base;
    for (let i = 0; i < dots; ++i) {
        base /= 2;
        total += base;
    }
    invariant(!isNaN(total), "calcDivisions must return a number. %s is not a number.", total);
    return total;
};

/**
 * @returns a spec array for a whole note. Note that in some time signatures,
 * a whole note is composed of several notes, so the length of the array is not
 * always 1.
 */
export function wholeNote(cursor: ICursor): IChord[] {
    let attributes = cursor.staff.attributes;
    let tsName = getTSString(attributes.time);
    return WHOLE_NOTE_PATTERNS[tsName];
}

export enum Beaming {
    Default,
    Alt1,
    Alt2
};

/** 
 * Creates a simple realization of an IChord
 * 
 * @param spec
 */
function makeDuration(spec: IRestSpec): IChord {
    invariant(!spec.timeModification, "timeModification is not implemented in makeDuration");
    return [{
        dots: times(spec.dots || 0, () => { return {}; }),
        noteType: {
            duration: spec.count
        }
    }];
}

/** 
 * Information needed to create a duration using makeDuration().
 * 
 * See IChord and makeDuration().
 */
export interface IRestSpec {
    /** 
     * The base of the note, as encoded by Lilypond.
     * 
     * A quarter note is '4', a half note is '8', ...
     */
    count: number;

    /** 
     * The number of displayed dots, or null.
     */
    dots?: number;

    /** 
     * The time modification (canonical tuplet), or null.
     */
    timeModification?: TimeModification;
}
