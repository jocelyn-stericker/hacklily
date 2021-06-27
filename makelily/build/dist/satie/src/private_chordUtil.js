/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
var _a, _b;
import { Count, MxmlAccidental, NoteheadType, } from "musicxml-interfaces";
import { some, find, map, reduce, filter, chain, times } from "lodash";
import invariant from "invariant";
import { lcm } from "./private_util";
var EMPTY_FROZEN = Object.freeze({});
export function hasAccidental(chord, cursor) {
    return some(chord, function (c) {
        if (!c.pitch) {
            return false;
        }
        var accidental = cursor.staffAccidentals[c.pitch.alter] || 0;
        return (((c.pitch.alter || 0) !== accidental &&
            (c.pitch.alter || 0) !==
                (cursor.staffAccidentals[c.pitch.alter + c.pitch.octave] || 0)) ||
            !!c.accidental);
    });
}
function _isIDurationDescription(chord) {
    return !isNaN(chord.count);
}
function _isIChord(chord) {
    return !isNaN(chord.length);
}
export function count(chord) {
    if (_isIChord(chord)) {
        // TODO: typing
        var target = find(chord, function (note) { return note.noteType; });
        return target ? target.noteType.duration : NaN;
    }
    else if (_isIDurationDescription(chord)) {
        return chord.count;
    }
    else {
        throw new Error("count() expected a chord or duration.");
    }
}
export function dots(chord) {
    if (_isIChord(chord)) {
        return (
        // TODO: typing
        (find(chord, function (note) { return note.dots; }) || { dots: [] }).dots
            .length || 0);
    }
    else if (_isIDurationDescription(chord)) {
        return chord.dots || 0;
    }
    else {
        throw new Error("dots() expected a chord or duration");
    }
}
export function timeModification(chord) {
    if (_isIChord(chord)) {
        return (
        // TODO: typing
        (find(chord, function (note) { return note.timeModification; }) ||
            {
                timeModification: null,
            }).timeModification || null);
    }
    else if (_isIDurationDescription(chord)) {
        return chord.timeModification || null;
    }
    else {
        throw new Error("timeModification() expected a chord or duration");
    }
}
export function ties(chord) {
    var ties = map(chord, function (note) {
        return note.ties && note.ties.length ? note.ties[0] : null;
    });
    return filter(ties, function (t) { return !!t; }).length ? ties : null;
}
export function beams(chord) {
    var target = find(chord, function (note) { return !!note.beams; });
    if (target) {
        return target.beams;
    }
    return null;
}
export function hasFlagOrBeam(chord) {
    // TODO: check if flag/beam forcefully set to "off"
    return some(chord, function (note) { return note.noteType.duration <= Count.Eighth; });
}
/**
 * Returns the mean of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export function averageLine(chord, clef) {
    return (reduce(linesForClef(chord, clef), function (memo, line) { return memo + line; }, 0) / chord.length);
}
/**
 * Returns the minimum of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export function lowestLine(chord, clef) {
    return reduce(linesForClef(chord, clef), function (memo, line) { return Math.min(memo, line); }, 10000);
}
/**
 * Returns the highest of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export function highestLine(chord, clef) {
    return reduce(linesForClef(chord, clef), function (memo, line) { return Math.max(memo, line); }, -10000);
}
/**
 * Returns the position where the line starts. For single notes, this is where
 * the notehead appears. For chords, this is where the furthest notehead appears.
 */
export function startingLine(chord, direction, clef) {
    if (direction !== -1 && direction !== 1) {
        throw new Error("Direction was not a number");
    }
    return direction === 1 ? lowestLine(chord, clef) : highestLine(chord, clef);
}
/**
 * The line of the notehead closest to the dangling end of the stem. For single notes,
 * startingLine and heightDeterminingLine are equal.
 *
 * Note: The minimum size of a stem is determinted by this value.
 */
export function heightDeterminingLine(chord, direction, clef) {
    if (direction !== -1 && direction !== 1) {
        throw new Error("Direction was not a number");
    }
    return direction === 1 ? highestLine(chord, clef) : lowestLine(chord, clef);
}
export function linesForClef(chord, clef) {
    if (!clef) {
        throw new Error("Exepected a valid clef");
    }
    return map(chord, function (note) { return lineForClef(note, clef); });
}
export function lineForClef(note, clef) {
    if (!clef) {
        throw new Error("Exepected a valid clef");
    }
    if (!note) {
        return 3;
    }
    else if (note.rest) {
        if (note.rest.displayStep) {
            return lineForClef_(note.rest.displayStep, note.rest.displayOctave, clef);
        }
        else if (note.noteType.duration === Count.Whole) {
            return 4;
        }
        else {
            return 3;
        }
    }
    else if (note.unpitched) {
        return lineForClef_(note.unpitched.displayStep, note.unpitched.displayOctave, clef);
    }
    else if (note.pitch) {
        return lineForClef_(note.pitch.step, note.pitch.octave, clef);
    }
    else {
        throw new Error("Invalid note");
    }
}
export var offsetToPitch = {
    0: "C",
    0.5: "D",
    1: "E",
    1.5: "F",
    2: "G",
    2.5: "A",
    3: "B",
};
export var pitchOffsets = {
    C: 0,
    D: 0.5,
    E: 1,
    F: 1.5,
    G: 2,
    A: 2.5,
    B: 3,
};
export function pitchForClef(relativeY, clef) {
    var line = relativeY / 10 + 3;
    var clefOffset = getClefOffset(clef);
    var offset2x = Math.round((line - clefOffset) * 2);
    var octave = Math.floor(offset2x / 7) + 3;
    var stepQuant = (Math.round(offset2x + 7 * 1000) % 7) / 2;
    if (stepQuant === 3.5) {
        octave = octave + 1;
        stepQuant = 0;
    }
    var step = offsetToPitch[stepQuant];
    return {
        octave: octave,
        step: step,
    };
}
export function lineForClef_(step, octave, clef) {
    var octaveNum = parseInt(octave, 10) || 0;
    return getClefOffset(clef) + (octaveNum - 3) * 3.5 + pitchOffsets[step];
}
/**
 * Returns true if a ledger line is needed, and false otherwise.
 * Will be changed once staves with > 5 lines are available.
 */
export function onLedger(note, clef) {
    if (!note || note.rest || note.unpitched) {
        return false;
    }
    var line = lineForClef(note, clef);
    return line < 0.5 || line > 5.5;
}
export function ledgerLines(chord, clef) {
    var low = lowestLine(chord, clef);
    var high = highestLine(chord, clef);
    var lines = [];
    for (var i = 6; i <= high; ++i) {
        lines.push(i);
    }
    for (var i = 0; i >= low; --i) {
        lines.push(i);
    }
    return lines;
}
export function rest(chord) {
    return !chord.length || chord[0].rest; // TODO
}
export var defaultClefLines = {
    G: 2,
    F: 4,
    C: 3,
    PERCUSSION: 3,
    TAB: 5,
    NONE: 3,
};
export var clefOffsets = {
    G: -3.5,
    F: 2.5,
    C: -0.5,
    PERCUSSION: -0.5,
    TAB: -0.5,
    NONE: -0.5,
};
export function getClefOffset(clef) {
    return (clefOffsets[clef.sign] +
        clef.line -
        defaultClefLines[clef.sign.toUpperCase()] -
        3.5 * parseInt(clef.clefOctaveChange || "0", 10));
}
export function barDivisionsDI(time, divisions) {
    invariant(!!divisions, "Expected divisions to be set before calculating bar divisions.");
    if (time.senzaMisura != null) {
        return 1000000 * divisions;
    }
    var quarterNotes = reduce(time.beats, function (memo, timeStr, idx) {
        return memo +
            reduce(timeStr.split("+"), function (memo, timeStr) {
                return memo + (parseInt(timeStr, 10) * 4) / time.beatTypes[idx];
            }, 0);
    }, 0);
    return quarterNotes * divisions || NaN;
}
export function barDivisions(_a) {
    var time = _a.time, divisions = _a.divisions;
    return barDivisionsDI(time, divisions);
}
export var IDEAL_STEM_HEIGHT = 35;
export var MIN_STEM_HEIGHT = 25;
export var chromaticScale = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11,
}; // c:12
export var countToHasStem = {
    0.25: true,
    0.5: false,
    1: false,
    2: true,
    4: true,
    8: true,
    16: true,
    32: true,
    64: true,
    128: true,
    256: true,
    512: true,
    1024: true,
};
export var countToIsBeamable = {
    8: true,
    16: true,
    32: true,
    64: true,
    128: true,
    256: true,
    512: true,
    1024: true,
};
export var countToFlag = {
    8: "flag8th",
    16: "flag16th",
    32: "flag32nd",
    64: "flag64th",
    128: "flag128th",
    256: "flag256th",
    512: "flag512th",
    1024: "flag1024th",
};
export var accidentalGlyphs = (_a = {},
    _a[MxmlAccidental.NaturalFlat] = "accidentalNaturalSharp",
    _a[MxmlAccidental.SharpUp] = "accidentalThreeQuarterTonesSharpArrowUp",
    _a[MxmlAccidental.ThreeQuartersFlat] = "accidentalThreeQuarterTonesFlatZimmermann",
    _a[MxmlAccidental.ThreeQuartersSharp] = "accidentalThreeQuarterTonesSharpStein",
    _a[MxmlAccidental.QuarterFlat] = "accidentalQuarterToneFlatStein",
    _a[MxmlAccidental.Flat] = "accidentalFlat",
    _a[MxmlAccidental.TripleSharp] = "accidentalTripleSharp",
    _a[MxmlAccidental.Flat1] = null,
    _a[MxmlAccidental.Flat2] = null,
    _a[MxmlAccidental.Flat3] = null,
    _a[MxmlAccidental.Flat4] = null,
    _a[MxmlAccidental.Flat5] = null,
    _a[MxmlAccidental.Sharp1] = null,
    _a[MxmlAccidental.Sharp2] = null,
    _a[MxmlAccidental.Sharp3] = null,
    _a[MxmlAccidental.Sharp4] = null,
    _a[MxmlAccidental.Sharp5] = null,
    _a[MxmlAccidental.SlashQuarterSharp] = null,
    _a[MxmlAccidental.DoubleSlashFlat] = null,
    _a[MxmlAccidental.TripleFlat] = "accidentalTripleFlat",
    _a[MxmlAccidental.Sharp] = "accidentalSharp",
    _a[MxmlAccidental.QuarterSharp] = "accidentalQuarterToneSharpStein",
    _a[MxmlAccidental.SlashFlat] = "accidentalTavenerFlat",
    _a[MxmlAccidental.FlatDown] = "accidentalFlatJohnstonDown",
    _a[MxmlAccidental.NaturalDown] = "accidentalQuarterToneFlatNaturalArrowDown",
    _a[MxmlAccidental.SharpSharp] = "accidentalSharpSharp",
    _a[MxmlAccidental.FlatUp] = "accidentalFlatJohnstonUp",
    _a[MxmlAccidental.DoubleSharp] = "accidentalDoubleSharp",
    _a[MxmlAccidental.Sori] = "accidentalSori",
    _a[MxmlAccidental.SharpDown] = "accidentalQuarterToneSharpArrowDown",
    _a[MxmlAccidental.Koron] = "accidentalKoron",
    _a[MxmlAccidental.NaturalUp] = "accidentalQuarterToneSharpNaturalArrowUp",
    _a[MxmlAccidental.SlashSharp] = "accidentalTavenerSharp",
    _a[MxmlAccidental.NaturalSharp] = "accidentalNaturalSharp",
    _a[MxmlAccidental.FlatFlat] = "accidentalDoubleFlat",
    _a[MxmlAccidental.Natural] = "accidentalNatural",
    _a[MxmlAccidental.DoubleFlat] = "accidentalDoubleFlat",
    _a);
export var InvalidAccidental = -999;
var CUSTOM_NOTEHEADS = (_b = {},
    _b[NoteheadType.ArrowDown] = [
        "noteheadLargeArrowDownBlack",
        "noteheadLargeArrowDownHalf",
        "noteheadLargeArrowDownWhole",
        "noteheadLargeArrowDownDoubleWhole",
    ],
    _b[NoteheadType.ArrowUp] = [
        "noteheadLargeArrowUpBlack",
        "noteheadLargeArrowUpHalf",
        "noteheadLargeArrowUpWhole",
        "noteheadLargeArrowUpDoubleWhole",
    ],
    _b[NoteheadType.BackSlashed] = [
        "noteheadSlashedBlack2",
        "noteheadSlashedHalf2",
        "noteheadSlashedWhole2",
        "noteheadSlashedDoubleWhole2",
    ],
    _b[NoteheadType.CircleDot] = [
        "noteheadRoundWhiteWithDot",
        "noteheadCircledHalf",
        "noteheadCircledWhole",
        "noteheadCircledDoubleWhole",
    ],
    _b[NoteheadType.CircleX] = [
        "noteheadCircledXLarge",
        "noteheadCircledXLarge",
        "noteheadCircledXLarge",
        "noteheadCircledXLarge",
    ],
    _b[NoteheadType.Cluster] = [
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
    ],
    _b[NoteheadType.Cross] = [
        "noteheadPlusBlack",
        "noteheadPlusHalf",
        "noteheadPlusWhole",
        "noteheadPlusDoubleWhole",
    ],
    _b[NoteheadType.InvertedTriangle] = [
        "noteheadTriangleDownBlack",
        "noteheadTriangleDownHalf",
        "noteheadTriangleDownWhole",
        "noteheadTriangleDownDoubleWhole",
    ],
    _b[NoteheadType.LeftTriangle] = [
        "noteheadTriangleRightBlack",
        "noteheadTriangleRightHalf",
        "noteheadTriangleRightWhole",
        "noteheadTriangleRightDoubleWhole",
    ],
    // Finale has a different idea about what left means
    _b[NoteheadType.None] = [
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
    ],
    _b[NoteheadType.Slash] = [
        "noteheadSlashHorizontalEnds",
        "noteheadSlashWhiteHalf",
        "noteheadSlashWhiteWhole",
        "noteheadDoubleWhole",
    ],
    _b[NoteheadType.Slashed] = [
        "noteheadSlashedBlack1",
        "noteheadSlashedHalf1",
        "noteheadSlashedWhole1",
        "noteheadSlashedDoubleWhole1",
    ],
    _b[NoteheadType.X] = [
        "noteheadXBlack",
        "noteheadXHalf",
        "noteheadXWhole",
        "noteheadXDoubleWhole",
    ],
    _b[NoteheadType.Do] = [
        "noteheadTriangleUpBlack",
        "noteheadTriangleUpHalf",
        "noteheadTriangleUpWhole",
        "noteheadTriangleUpDoubleWhole",
    ],
    _b[NoteheadType.Triangle] = [
        "noteheadTriangleUpBlack",
        "noteheadTriangleUpHalf",
        "noteheadTriangleUpWhole",
        "noteheadTriangleUpDoubleWhole",
    ],
    _b[NoteheadType.Re] = [
        "noteheadMoonBlack",
        "noteheadMoonWhite",
        "noteheadMoonWhite",
        "noteheadMoonWhite",
    ],
    _b[NoteheadType.Mi] = [
        "noteheadDiamondBlack",
        "noteheadDiamondHalf",
        "noteheadDiamondWhole",
        "noteheadDiamondDoubleWhole",
    ],
    _b[NoteheadType.Diamond] = [
        "noteheadDiamondBlack",
        "noteheadDiamondHalf",
        "noteheadDiamondWhole",
        "noteheadDiamondDoubleWhole",
    ],
    _b[NoteheadType.Fa] = [
        "noteheadTriangleUpRightBlack",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
    ],
    _b[NoteheadType.FaUp] = [
        "noteheadTriangleUpRightBlack",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
    ],
    _b[NoteheadType.So] = [
        "noteheadBlack",
        "noteheadHalf",
        "noteheadWhole",
        "noteheadDoubleWhole",
    ],
    _b[NoteheadType.La] = [
        "noteheadSquareBlack",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
    ],
    _b[NoteheadType.Square] = [
        "noteheadSquareBlack",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
    ],
    _b[NoteheadType.Rectangle] = [
        "noteheadSquareBlack",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
    ],
    _b[NoteheadType.Ti] = [
        "noteheadTriangleRoundDownBlack",
        "noteheadTriangleRoundDownWhite",
        "noteheadTriangleRoundDownWhite",
        "noteheadTriangleRoundDownWhite",
    ],
    _b);
export function getNoteheadGlyph(notehead, stdGlyph) {
    var type = notehead ? notehead.type : NoteheadType.Normal;
    if (type === NoteheadType.Normal) {
        return stdGlyph;
    }
    else {
        var noteheads = CUSTOM_NOTEHEADS[type];
        if (noteheads) {
            if (noteheads[0] && stdGlyph === "noteheadBlack") {
                return noteheads[0];
            }
            else if (noteheads[1] && stdGlyph === "noteheadHalf") {
                return noteheads[1];
            }
            else if (noteheads[2] && stdGlyph === "noteheadWhole") {
                return noteheads[2];
            }
            else if (noteheads[3] && stdGlyph === "noteheadDoubleWhole") {
                return noteheads[3];
            }
        }
    }
    console.warn("The custom notehead with ID " + type + " cannot replace " +
        (notehead + ", probably because it's not implemented."));
    return stdGlyph;
}
export function notationObj(n) {
    invariant(!n.notations || n.notations.length === 1, "Deprecated notations format");
    return n.notations ? n.notations[0] : EMPTY_FROZEN;
}
export function articulationObj(n) {
    return notationObj(n).articulations
        ? notationObj(n).articulations[0]
        : Object.freeze({});
}
export function tieds(n) {
    return chain(n)
        .map(function (n) { return notationObj(n).tieds; })
        .map(function (t) { return (t && t.length ? t[0] : null); })
        .value();
}
var FractionalDivisionsException = /** @class */ (function () {
    function FractionalDivisionsException(requiredDevisions) {
        this.requiredDivisions = requiredDevisions;
    }
    return FractionalDivisionsException;
}());
export { FractionalDivisionsException };
export function divisions(chord, attributes, allowFractional) {
    if (_isIChord(chord) && some(chord, function (note) { return note.grace; })) {
        return 0;
    }
    var chordCount = count(chord);
    var chordDots = dots(chord);
    var chordTM = timeModification(chord);
    var attributesTime = attributes.time.senzaMisura === undefined
        ? attributes.time
        : {
            beatTypes: [4],
            beats: ["1000"],
        };
    var attributeDivisions = attributes.divisions;
    invariant(!!attributesTime, "A time signature must be specified.");
    if (chordCount === -1 || chordCount <= 1) {
        // TODO: What if beatType isn't consistent?
        var tsBeats = reduce(attributesTime.beats, function (memo, durr) {
            return memo + reduce(durr.split("+"), function (m, l) { return m + parseInt(l, 10); }, 0);
        }, 0);
        var tsBeatType = attributesTime.beatTypes.reduce(function (memo, bt) { return (memo === bt ? bt : NaN); }, attributesTime.beatTypes[0]);
        invariant(!isNaN(tsBeatType), "Time signature must be consistent");
        var total_1 = (attributeDivisions * tsBeats * 4) / tsBeatType;
        return total_1;
    }
    if ((attributeDivisions * 4) % chordCount > 0 && !allowFractional) {
        var newDivisions = lcm(attributeDivisions * 4, chordCount) / 4;
        throw new FractionalDivisionsException(newDivisions);
    }
    var base = (attributeDivisions * 4) / chordCount;
    var tmFactor = chordTM ? chordTM.normalNotes / chordTM.actualNotes : 1.0;
    var dotFactor = times(chordDots, function (d) { return 1 / Math.pow(2, d + 1); }).reduce(function (m, i) { return m + i; }, 1);
    var total = base * tmFactor * dotFactor;
    invariant(!isNaN(total), "calcDivisions must return a number. %s is not a number.", total);
    return total;
}
//# sourceMappingURL=private_chordUtil.js.map