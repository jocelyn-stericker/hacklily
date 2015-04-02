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

"use strict";

/**
 * @file models/chord/metre.ts Utilities for rhythm arithmetic
 */

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Engine           = require("../engine");
import Util             = require("../engine/util");

var ModelType           = Engine.IModel.Type;
var IChord              = Engine.IChord;
var ICursor             = Engine.ICursor;

/**
 * Checks if the duration at the current index is rhythmically spelled correctly
 * within its context according to the time signature ("ts"), and fixes errors
 * if it is not.
 * 
 * These conditions can be overly strict. They're a good guess at what the user
 * wanted to convey, but the user can override any of these rules. Thus, most
 * checks only apply to models that are not Frozen or FrozenEngraved.
 * 
 * Otherwise, the function returns false. To correct the rhythmic spelling, run
 * correctMetre.
 * 
 * @param cursor give timeSignature, and current index.
 * @returns true if a change was made, false otherwise
 */
export function rhythmicSpellcheck$(cursor$: Engine.ICursor): boolean {
    var curr = ICursor.curr(cursor$);

    // Only durations can be spell-checked.
    if (!cursor$.factory.modelHasType(curr, ModelType.Chord)) {
        return false;
    }

    // This function does not deal with overfilled bars. Instead, the BarModel
    // will split the note, and the line will be re-annotated.
    if (cursor$.division$ + curr.divCount > cursor$.staff.totalDivisions) {
        return false;
    }

    // Get the pattern
    // TODO: allow custom beam patterns
    var pattern = getBeamingPattern(cursor$.staff.attributes.times);

    // Get the next note, if possible.
    var currNote = IChord.fromModel(curr);
    var currNoteStartDivision = cursor$.division$;
    var currNoteEndDivision = cursor$.division$ + curr.divCount;

    var nextIdx = Util.findIndex(cursor$.segment,
        (c: Engine.IModel) =>
            cursor$.factory.modelHasType(c, ModelType.Chord, ModelType.Barline),
        cursor$.idx$ + 1);

    var nextObj = cursor$.segment[nextIdx];

    var nextNote = cursor$.factory.modelHasType(nextObj, ModelType.Chord) ?
            IChord.fromModel(nextObj) : null;

    // See if this note can be merged. Rests and tied notes can be merged.
    // Frozen models cannot be merged.
    // TODO: Tuplets cannot be merged currently. They should be able to be merged if compatible.
    var nextEquivNote = nextIdx < cursor$.segment.length &&
        !!nextNote &&
        nextObj.frozenness < Engine.IModel.FrozenLevel.Frozen &&
        !IChord.timeModification(currNote) && !IChord.timeModification(nextNote) &&
        (
            currNote[0].rest && nextNote[0].rest ||
            !!nextNote && _.any(IChord.ties(currNote),
                    t => t && t.type !== MusicXML.StartStop.Stop) ?
            nextNote : null);

    /*---- I. Checks that should be done even if we are frozen ----------------------------------*/

    /*---- I.1: Make sure tuplet groups don't end part of the way through -----------------------*/

    if (!!IChord.timeModification(currNote) && (!nextNote || !IChord.timeModification(nextNote))) {
        var base = 1;
        var partial = 0;
        for (var i = cursor$.idx$; i >= 0; --i) {
            var chordi = cursor$.factory.modelHasType(cursor$.segment[i], ModelType.Chord) ? IChord.fromModel(cursor$.segment[i]) : null;
            if (chordi && !IChord.timeModification(chordi)) {
                break;
            }

            if (chordi) {
                partial = (partial + calcDivisions(chordi, cursor$)) % base;
            }
        }

        if (partial) {
            // subtract does not yet support tuplets yet, so...
            var toRestoreUntuplet = (base - partial) *
                    IChord.timeModification(currNote).actualNotes /
                    IChord.timeModification(currNote).normalNotes;
            var toAdd = subtract(toRestoreUntuplet, 0, cursor$, -cursor$.division$).map(spec => {
                _.forEach(spec, note => {
                    note.timeModification = Util.cloneObject(IChord.timeModification(currNote));
                    note.rest = {};
                });
                return cursor$.factory.create(ModelType.Chord, spec);
            });
            ICursor.splice$(cursor$, cursor$.idx$ + 1, 0, toAdd);
            return true;
        }
    }

    /*---- I.2: End of checks that apply to Frozen objects --------------------------------------*/

    if (curr.frozenness >= Engine.IModel.FrozenLevel.Frozen) {
        return false;
    }

    /*---- II. Checks that should be done only if the annotation status isn't User --------------*/

    /*---- II.1: Separate durations that cross a boundary and partially fill it. ----------------*/
    var excessBeats = 0;
    var patternStartDivision = 0;
    for (var p = 0; p < pattern.length; ++p) {
        var patternEndDivision = patternStartDivision + calcDivisions(pattern[p], cursor$);
        if (currNoteStartDivision > patternStartDivision &&
                currNoteEndDivision > patternEndDivision &&
                currNoteStartDivision < patternEndDivision) {
            excessBeats = currNoteEndDivision - patternEndDivision;
            break;
        }
        patternStartDivision = patternEndDivision;
    }

    if (excessBeats > 0) {
        clearExcessBeats(currNote, excessBeats, cursor$);
        return true;
    }

    /*---- II.2: Join rests and tied notes that don't cross a boundary --------------------------*/

    // XXX: Right now this only considers combinations of two notes.
    if (nextEquivNote) {
        patternStartDivision = 0;
        var nextNoteEndDivision = currNoteStartDivision + calcDivisions(nextNote, cursor$);

        for (var p = 0; p < pattern.length; ++p) {
            var patternEndDivision = patternStartDivision + calcDivisions(pattern[p], cursor$);
            if (currNoteStartDivision >= patternStartDivision &&
                    currNoteEndDivision < patternEndDivision &&
                    nextNoteEndDivision <= patternEndDivision + 0.0000001) {
                if (merge$(currNote, nextNote, nextIdx, cursor$)) {
                    return true;
                }
            }
            patternStartDivision = patternEndDivision;
        }
    }

    /*---- II.3: Join rests and tied notes that fully cover multiple boundaries -----------------*/

    // XXX: Right now this only covers combinations of two notes.
    if (nextEquivNote) {
        var nextNoteEndDivision = currNoteStartDivision + calcDivisions(nextNote, cursor$);
        patternStartDivision = 0;

        var gotFirstNote = false;
        for (var p = 0; p < pattern.length; ++p) {
            var patternEndDivision = patternStartDivision + calcDivisions(pattern[p], cursor$);
            if (!gotFirstNote) {
                if (currNoteStartDivision > patternStartDivision) {
                    break;
                } else if (currNoteStartDivision === patternStartDivision) {
                    gotFirstNote = true;
                    continue;
                }
            } else {
                if (nextNoteEndDivision > patternEndDivision) {
                    break;
                } else if (currNoteEndDivision === patternEndDivision) {
                    if (merge$(currNote, nextNote, nextIdx, cursor$)) {
                        return true;
                    }
                    break;
                }
            }
            patternStartDivision = patternEndDivision;
        }
    }

    return false;
};

/**
 * Convenience function which merges two notes if they can be merged.
 * 
 * @returns true on success, false otherwise.
 * 
 * @internal
 */
function merge$(thisChord: Engine.IChord, nextChord: Engine.IChord, nextIdx: number, cursor$: Engine.ICursor) {
    if (IChord.inBeam(nextChord)) { // TODO: what if both are in beam?
        return false;
    }
    var replaceWithMaybe = add(thisChord, nextChord, cursor$);
    if (replaceWithMaybe.length !== 1) {
        return false;
    }

    var spec                                = replaceWithMaybe[0];

    IChord.setCount$(thisChord,             IChord.count(spec));
    IChord.setDots$(thisChord,              IChord.dots(spec));
    IChord.setTimeModification$(thisChord,  IChord.timeModification(spec));

    ICursor.splice$(cursor$, nextIdx, 1, null);
    return true;
}

/**
 * Convenience function which splits a note or rest into two correct parts.
 * The measure MUST be marked as unvalidated after this function is called.
 * 
 * @internal
 */
function clearExcessBeats(currNote: Engine.IChord, excessBeats: number, cursor$: Engine.ICursor) {
    var nextIdx = cursor$.idx$ + 1;
    var replaceWith = subtract(currNote, excessBeats, cursor$).concat(
        subtract(currNote, calcDivisions(currNote, cursor$) - excessBeats,
            cursor$, calcDivisions(currNote, cursor$) - excessBeats));
    replaceWith.forEach((m: any) => {
        // Ideally there would be a PitchDuration constructor that would do this for us.
        _.forEach(currNote, (note, i) => {
            m[i] = Util.cloneObject(note);
        });
    });

    ICursor.splice$(cursor$, cursor$.idx$, nextIdx - cursor$.idx$,
        replaceWith.map(spec => cursor$.factory.create(ModelType.Chord, spec)));
    var after = cursor$.idx$ + replaceWith.length;
    if (!IChord.rest(currNote)) {
        for (var i = cursor$.idx$; i < after - 1; ++i) {
            var note = IChord.fromModel(cursor$.segment[i]);
            IChord.setTies$(note, _.times(note.length, () => {
                return {
                    type: MusicXML.StartStop.Start
                };
            }));
        }
    }

    return;
}

/**
 * @returns a TS string for lookup in the beamingPatterns array.
 */
export function getTSString(times: MusicXML.Time[]) {
    var time = times[0];
    invariant(!!time, "Time is not defined for getTSString");
    return _.reduce(time.beats, (memo, beats, idx) => {
        return beats + "/" + time.beatTypes[idx];

    }, "");
}

export function getBeamingPattern(times: MusicXML.Time[], alt?: string) {
    var time = times[0];
    var pattern: Engine.IChord[] = beamingPatterns[getTSString(times) + (alt ? "_" + alt : "")];
    var factors: {[key: number]: number[]} = {
        4: [4,3,2,1],
        8: [12,8,4,3,2,1],
        16: [4,3,2,1]
    };
    if (!pattern) {
        // TODO: Partial & Mixed
        pattern = [];
        // TODO: Varying denominators will err for the remainder of this function
        var beatsToAdd = _.reduce(time.beats, (memo, beat) => {
            return memo + _.reduce(beat.split("+"), (m, b) => m + parseInt(b, 10), 0);
        }, 0);
        var ownFactors = factors[time.beatTypes[0]];
        _.forEach(ownFactors, factor => {
            while(beatsToAdd >= factor) {
                pattern = pattern.concat(beamingPatterns[factor + "/" + time.beatTypes[0]]);
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
export function add(durr1: Engine.IChord, durr2: Engine.IChord, cursor: Engine.ICursor, beatOffset?: number): Engine.IChord[];
export function add(durr1: number, durr2: Engine.IChord, cursor: Engine.ICursor, beatOffset?: number): Engine.IChord[];

export function add(durr1: any, durr2: Engine.IChord, cursor: Engine.ICursor, beatOffset?: number): Engine.IChord[] {
    // Bizarrely, we use subtract to add. That's just because I wrote subtract first.
    return subtract((isNaN(durr1) ? calcDivisions(durr1, cursor) : durr1) + calcDivisions(durr2, cursor), 0, cursor, beatOffset);
}

/**
 * @returns an array of Duration specs that is the result of subtracting "beats" from "durr1".
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function subtract(durr1: Engine.IChord, beats: number,
    cursor: Engine.ICursor, beatOffset?: number): Engine.IChord[];
/**
 * @returns an array of Duration specs that is the result of subtracting "beats" from "durr1".
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function subtract(durr1: number, beats: number,
    cursor: Engine.ICursor, beatOffset?: number): Engine.IChord[];

export function subtract(durr1: any, divisions: number,
        cursor: Engine.ICursor, divisionOffset?: number): Engine.IChord[] {
    var replaceWith: Engine.IChord[] = [];
    var durr1Divisions: number = isNaN(<any>durr1) ? calcDivisions(durr1, cursor) : <number> durr1;
    var beatsToFill = durr1Divisions - divisions;
    var bp = getBeamingPattern(cursor.staff.attributes.times);
    var currDivision = (cursor.division$ + (divisionOffset || 0)) % cursor.staff.totalDivisions;

    for (var tries = 0; tries < 20; ++tries) {
        var bpIdx = 0;
        var bpCount = 0;
        var attributes = cursor.staff.attributes;
        while (bp[bpIdx] &&
            bpCount + _calcDivisions(IChord.count(bp[bpIdx]), IChord.dots(bp[bpIdx]), null,
                attributes.times, attributes.divisions) <= currDivision) {
            ++bpIdx;
            if (!bp[bpIdx]) {
                return replaceWith;
            }
            bpCount += _calcDivisions(IChord.count(bp[bpIdx]), IChord.dots(bp[bpIdx]), null,
                attributes.times, attributes.divisions);
        }

        if (beatsToFill <= 0) {
            /* Exit! */
            return replaceWith;
        }
        _.any(allNotes, function(note) { // stop at first 'true'
            var noteDivisions = _calcDivisions(IChord.count(note), IChord.dots(note), null,
                attributes.times, attributes.divisions);

            if (noteDivisions <= beatsToFill) {
                // The subtraction is allowed to completely fill multiple pattern sections
                // but cannot partially fill more than 1.
                var completelyFills = false;
                var tmpBeats = currDivision + noteDivisions;
                for (var i = 0; bp[bpIdx + i]; ++i) {
                    if (tmpBeats < 0) {
                        break;
                    }
                    var bpBeats = _calcDivisions(IChord.count(bp[bpIdx + i]), IChord.dots(bp[bpIdx + i]), null,
                        attributes.times, attributes.divisions);
                    if (tmpBeats === bpBeats) {
                        completelyFills = true;
                        break;
                    }
                    tmpBeats -= bpBeats;
                }

                if (completelyFills || (i - bpIdx <= 1)) {
                    // This either fills multiple segments perfectly, or fills less than one
                    // segment.
                    replaceWith.push(_.clone(note));
                    beatsToFill -= noteDivisions;
                    currDivision += noteDivisions;
                    return true;
                }
            }
        });
    }
    throw new InvalidDurationError();
}

class InvalidDurationError {
};

/**
 * If there is a "better" way to beam the notes starting at the cursor's index, return an array
 * of notes that make up that beam, else return null.
 * 
 * @param idx the index where the beam would start
 * @param alt a string representing an alternative beaming. See beamingPatterns.
 */
export function rebeamable(idx: number, cursor: Engine.ICursor, alt?: string): Array<Engine.IModel> {
    var countOffset = 0;
    for (var i = cursor.idx$; i < idx; ++i) {
        countOffset += cursor.segment[i].divCount;
    }
    var attributes = cursor.staff.attributes;
    var divisions = attributes.divisions;

    var tsName = getTSString(attributes.times) + (alt ? "_" + alt : "");
    var replaceWith: Engine.IModel[] = [];
    var bp = getBeamingPattern(attributes.times, alt);
    var currDivision = cursor.division$ + countOffset;

    var bpIdx = 0;
    var bpCount = 0;
    while (bp[bpIdx] &&
        bpCount + _calcDivisions(IChord.count(bp[bpIdx]), IChord.dots(bp[bpIdx]), null,
            attributes.times, attributes.divisions) <= currDivision) {
        ++bpIdx;
        if (!bp[bpIdx]) {
            return replaceWith;
        }
        bpCount += _calcDivisions(IChord.count(bp[bpIdx]), IChord.dots(bp[bpIdx]), null,
            attributes.times, attributes.divisions);
    }

    var needsReplacement = false;
    var prevCount: number;

    var prevInBeam = true;

    var foundNote = false;
    var timeModification: MusicXML.TimeModification;

    for (var i = idx; !!cursor.segment[i]; ++i) {
        if (cursor.factory.modelHasType(cursor.segment[i], ModelType.BeamGroup)) {
            if (idx !== i) {
                needsReplacement = true;
            }
        } else if (cursor.factory.modelHasType(cursor.segment[i], ModelType.Chord)) {
            var prevNote = IChord.fromModel(cursor.segment[i]);
            if (!!timeModification !== !!IChord.timeModification(prevNote) && foundNote) {
                break;
            }
            foundNote = true;
            timeModification = IChord.timeModification(prevNote);
            prevCount = IChord.count(prevNote) || prevCount;

            if (!IChord.hasFlagOrBeam(prevNote)) {
                break;
            }

            // TODO: break if temporary!

            if (tsName === "4/4" && prevCount >= 16 ||
                tsName === "2/4" && prevCount >= 8) {
                var alternativeOption = rebeamable(idx, cursor, "clean");
                if (alternativeOption) {
                    return alternativeOption;
                } else {
                    return null;
                }
            }

            var bDivisions = calcDivisions(prevNote, cursor);

            var bpBeats = _calcDivisions(IChord.count(bp[bpIdx]), IChord.dots(bp[bpIdx]), null,
                attributes.times, attributes.divisions);

            // Note: A quarter note between a division should have ALREADY been made 2
            // tied eighth notes by now.

            currDivision += bDivisions;
            if (currDivision > bpCount + bpBeats) {
                break;
            }
            if (prevInBeam && !IChord.inBeam(prevNote)) {
                needsReplacement = true;
                prevInBeam = false;
            }

            replaceWith.push(cursor.segment[i]);

            if (currDivision === bpCount + bpBeats) {
                break;
            }
        }
    }

    if (needsReplacement && replaceWith.length) {
        var last = replaceWith[replaceWith.length - 1];
        var replacementDivisions = _.reduce(replaceWith, (memo, d) => memo + d.divCount, 0);
        if (tsName.indexOf("/4") !== -1) {
            // Rhythmic figures that are not part of a repeated pattern may be best beamed into separate beats,
            // so that they are not mistaken for triplets nor for groups of three quavers in compound time.
            // (Note doesn't solve the root issue)
            while (((currDivision % divisions) !== 0 || ((currDivision + replacementDivisions) % divisions) === 0) &&
                    Math.floor(currDivision/divisions) !== Math.floor((currDivision + replacementDivisions)/divisions)) {
                replaceWith.pop();
                last = replaceWith[replaceWith.length - 1];
            }
        }
        return replaceWith.length > 1 ? replaceWith : null;
    }
    return null;
}

export function calcDivisions(chord: Engine.IChord, cursor: Engine.ICursor) {
    var attributes = cursor.staff.attributes;
    var count = IChord.count(chord);
    if (isNaN(count)) {
        return _.find(chord, note => note.duration).duration;
    }
    return _calcDivisions(
        IChord.count(chord),
        IChord.dots(chord),
        IChord.timeModification(chord),
        attributes.times,
        attributes.divisions);
}

export function calcDivisionsNoCtx(chord: Engine.IChord, times: MusicXML.Time[], divisions: number) {
    var count = IChord.count(chord);
    if (isNaN(count)) {
        return _.find(chord, note => note.duration).duration;
    }
    return _calcDivisions(
        count,
        IChord.dots(chord),
        IChord.timeModification(chord),
        times,
        divisions);
}

function _calcDivisions(count: number, dots: number,
        timeModification: MusicXML.TimeModification, times: MusicXML.Time[], divisions: number) {
    var time = times[0];
    if (time.senzaMisura !== undefined) {
        time = {
            beats: ["4"],
            beatTypes: [4]
        };
    }
    if (count === -1) {
        // TODO: What if beatType isn't consistent?
        return divisions * _.reduce(time.beats, (memo, durr) =>
            memo + _.reduce(durr.split("+"), (m, l) => m + parseInt(l, 10), 0), 0);
    }

    if (count === MusicXML.Count.Breve) {
        count = 0.5;
    }
    if (count === MusicXML.Count.Long) {
        count = 0.25; // We really should...
    }
    if (count === MusicXML.Count.Maxima) {
        count = 0.125; // ... not support these at all.
    }

    invariant(!!time, "A time signature must be specified.");
    // TODO: What if beatType isn't consistent?
    var base = divisions * time.beatTypes[0]/count;

    if (timeModification) {
        base *= timeModification.normalNotes / timeModification.actualNotes;
    }

    var total = base;
    for (var i = 0; i < dots; ++i) {
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
export function wholeNote(cursor: Engine.ICursor): Engine.IChord[] {
    var attributes = cursor.staff.attributes;
    var tsName = getTSString(attributes.times);
    return wholeNotePatterns[tsName];
}

var _512   = makeDuration({ count: 512          });
var _256   = makeDuration({ count: 256          });
var _256D  = makeDuration({ count: 256, dots: 1 });
var _128   = makeDuration({ count: 128          });
var _128D  = makeDuration({ count: 128, dots: 1 });
var _64    = makeDuration({ count: 64           });
var _64D   = makeDuration({ count: 64,  dots: 1 });
var _32    = makeDuration({ count: 32           });
var _32D   = makeDuration({ count: 32,  dots: 1 });
var _16    = makeDuration({ count: 16           });
var _16D   = makeDuration({ count: 16,  dots: 1 });
var _16DD  = makeDuration({ count: 16,  dots: 2 });
var _8     = makeDuration({ count: 8            });
var _8D    = makeDuration({ count: 8,   dots: 1 });
var _8DD   = makeDuration({ count: 8,   dots: 2 });
var _4     = makeDuration({ count: 4            });
var _4D    = makeDuration({ count: 4,   dots: 1 });
var _4DD   = makeDuration({ count: 4,   dots: 2 });
var _2     = makeDuration({ count: 2            });
var _2D    = makeDuration({ count: 2,   dots: 1 });
var _2DD   = makeDuration({ count: 2,   dots: 2 }); // Warning: should be included in allNotes depending on TS
var _1     = makeDuration({ count: 1            });
var _1D    = makeDuration({ count: 1,   dots: 1 }); // Warning: should be included in allNotes depending on TS
var _1DD   = makeDuration({ count: 1,   dots: 2 }); // Warning: should be included in allNotes depending on TS
var _05    = makeDuration({ count: 1/2          }); // Warning: should be included in allNotes depending on TS

var allNotes = [_1, _2D, _2,
    _4DD, _4D, _4, _8DD, _8D, _8, _16DD, _16D, _16, _32D,
    _32, _64D, _64, _128D, _128, _256D, _256, _512];

// Adapted from Behind Bars (E. Gould) page 155
var beamingPatterns: {[key: string]: Engine.IChord[]} = {
    "1/16":     [_16                            ],

    "2/16":     [_16,   _16                     ],
    "1/8":      [_8                             ],

    "3/16":     [_8D                            ],

    "4/16":     [_8,    _8                      ],
    "2/8":      [_8,    _8                      ],
    "1/4":      [_4                             ],

    "5/16":     [_8D,   _8                      ],
    "5/16_alt": [_8,    _8D                     ],

    "6/16":     [_8D,   _8D                     ],
    "3/8":      [_4D                            ],

    "4/8":      [_4,    _4                      ],
    "2/4":      [_2                             ],
    "2/4_clean": [_4,    _4                     ],
    "1/2":      [_2                             ],

    "9/16":     [_8D,   _8D,    _8D             ],

    "5/8":      [_4D,   _4                      ],
    "5/8_alt":  [_4,    _4D                     ],

    "12/16":    [_8D,   _8D,    _8D,    _8D     ],
    "6/8":      [_4D,           _4D             ],
    "3/4":      [_2D                            ],  // << XXX: Provided it doesn't give the illusion of 6/8.

    "7/8":      [_4,            _8D             ],
    "7/8_alt":  [_8D,           _4              ],

    "8/8":      [_4D,   _4D,    _4              ],
    "8/8_alt":  [_4D,   _4,     _4D             ],
    "8/8_alt2": [_4,    _4D,    _4D             ],
    "4/4":      [_2,            _2              ],
    "4/4_clean":[_4,    _4,     _4,     _4      ],
    "2/2":      [_2,            _2              ],
    "1/1":      [_1                             ],  // << If only they were all like this...

    "9/8":      [_4D,   _4D,    _4D             ],

    "10/8":     [_2,    _4D,    _4D             ],
    "10/8_alt": [_4D,   _2,     _4D             ],
    "10/8_alt2":[_4D,   _4D,    _2              ],
    "5/4":      [_2D,           _2              ],
    "5/4_alt":  [_2,            _2D             ],

    "12/8":     [_4D,   _4D,    _4D,    _4D     ],
    "6/4":      [_2D,           _2D             ],
    "3/2":      [_2,        _2,      _2         ],

    "7/4":      [_1,            _2D             ],
    "7/4_alt":  [_2D,           _1              ],

    "15/8":     [_4D,  _4D,  _4D,  _4D,  _4D    ],

    "8/4":      [_1,            _1              ],
        // "Or any other combination"...
        // There's a whole bunch, and I think composers using 8/4 are willing
        // to select the correct beaming manually
    "4/2":      [_1,            _1              ],
    "2/1":      [_1,            _1              ],

    "18/8":     [_4D, _4D, _4D, _4D, _4D, _4D   ],
    "9/4":      [_2D,      _2D,      _2D        ]
};

var wholeNotePatterns: {[key: string]: Engine.IChord[]} = {
    "2/16":     [_8                             ],
    "1/8":      [_8                             ],

    "3/16":     [_8D                            ],

    "4/16":     [_4                             ],
    "2/8":      [_4                             ],
    "1/4":      [_4                             ],

    "5/16":     [_8D,   _8                      ],
    "5/16_alt": [_8,    _8D                     ],

    "6/16":     [_4D                            ],
    "3/8":      [_4D                            ],

    "4/8":      [_2                             ],
    "2/4":      [_2                             ],
    "1/2":      [_2                             ],

    "9/16":     [_4D,   _8D                     ],

    "5/8":      [_4D,   _4                      ],
    "5/8_alt":  [_4,    _4D                     ],

    "12/16":    [_2D                            ],
    "6/8":      [_2D                            ],
    "3/4":      [_2D                            ],

    "7/8":      [_2DD                           ],
    "7/8_alt":  [_2DD                           ],

    "8/8":      [_1            ],
    "8/8_alt":  [_1            ],
    "8/8_alt2": [_1            ],
    "4/4":      [_1            ],
    "2/2":      [_1            ],
    "1/1":      [_1                             ],  // << If only they were all like this...

    "9/8":      [_2D,   _4D                     ],

    "10/8":     [_2,    _2D                     ],
    "10/8_alt": [_4D,   _2,     _4D             ],
    "10/8_alt2":[_2D,   _2                      ],
    "5/4":      [_2D,           _2              ],
    "5/4_alt":  [_2,            _2D             ],

    "12/8":     [_1D                            ],
    "6/4":      [_1D                            ],
    "3/2":      [_1D                            ],

    "7/4":      [_1DD                           ],
    "7/4_alt":  [_1DD                           ],

    "15/8":     [_2D,  _2D,  _4D                ],

    "8/4":      [_05                            ],
        // "Or any other combination"...
        // There's a whole bunch, and I think composers using 8/4 are willing
        // to select the correct beaming manually
    "4/2":      [_1,            _1              ],
    "2/1":      [_1,            _1              ],

    "18/8":     [_1D,           _2D             ],
    "9/4":      [_1D,           _2D             ]
};

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
function makeDuration(spec: IRestSpec): Engine.IChord {
    invariant(!spec.timeModification, "timeModification is not implemented in makeDuration");
    return [{
        noteType: {
            duration:       spec.count
        },
        dots:               _.times(spec.dots || 0, () => { return {}; })
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
    count:              number;

    /** 
     * The number of displayed dots, or null.
     */
    dots?:              number;

    /** 
     * The time modification (canonical tuplet), or null.
     */
    timeModification?:  MusicXML.TimeModification
}
