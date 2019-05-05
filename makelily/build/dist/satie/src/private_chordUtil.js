"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var _a, _b;
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
var private_util_1 = require("./private_util");
var EMPTY_FROZEN = Object.freeze({});
function hasAccidental(chord, cursor) {
    return lodash_1.some(chord, function (c) {
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
exports.hasAccidental = hasAccidental;
function _isIDurationDescription(chord) {
    return !isNaN(chord.count);
}
function _isIChord(chord) {
    return !isNaN(chord.length);
}
function count(chord) {
    if (_isIChord(chord)) {
        // TODO: typing
        var target = lodash_1.find(chord, function (note) { return note.noteType; });
        return target ? target.noteType.duration : NaN;
    }
    else if (_isIDurationDescription(chord)) {
        return chord.count;
    }
    else {
        throw new Error("count() expected a chord or duration.");
    }
}
exports.count = count;
function dots(chord) {
    if (_isIChord(chord)) {
        return (
        // TODO: typing
        (lodash_1.find(chord, function (note) { return note.dots; }) || { dots: [] }).dots
            .length || 0);
    }
    else if (_isIDurationDescription(chord)) {
        return chord.dots || 0;
    }
    else {
        throw new Error("dots() expected a chord or duration");
    }
}
exports.dots = dots;
function timeModification(chord) {
    if (_isIChord(chord)) {
        return (
        // TODO: typing
        (lodash_1.find(chord, function (note) { return note.timeModification; }) ||
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
exports.timeModification = timeModification;
function ties(chord) {
    var ties = lodash_1.map(chord, function (note) { return (note.ties && note.ties.length ? note.ties[0] : null); });
    return lodash_1.filter(ties, function (t) { return !!t; }).length ? ties : null;
}
exports.ties = ties;
function beams(chord) {
    var target = lodash_1.find(chord, function (note) { return !!note.beams; });
    if (target) {
        return target.beams;
    }
    return null;
}
exports.beams = beams;
function hasFlagOrBeam(chord) {
    // TODO: check if flag/beam forcefully set to "off"
    return lodash_1.some(chord, function (note) { return note.noteType.duration <= musicxml_interfaces_1.Count.Eighth; });
}
exports.hasFlagOrBeam = hasFlagOrBeam;
/**
 * Returns the mean of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
function averageLine(chord, clef) {
    return (lodash_1.reduce(linesForClef(chord, clef), function (memo, line) { return memo + line; }, 0) / chord.length);
}
exports.averageLine = averageLine;
/**
 * Returns the minimum of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
function lowestLine(chord, clef) {
    return lodash_1.reduce(linesForClef(chord, clef), function (memo, line) { return Math.min(memo, line); }, 10000);
}
exports.lowestLine = lowestLine;
/**
 * Returns the highest of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
function highestLine(chord, clef) {
    return lodash_1.reduce(linesForClef(chord, clef), function (memo, line) { return Math.max(memo, line); }, -10000);
}
exports.highestLine = highestLine;
/**
 * Returns the position where the line starts. For single notes, this is where
 * the notehead appears. For chords, this is where the furthest notehead appears.
 */
function startingLine(chord, direction, clef) {
    if (direction !== -1 && direction !== 1) {
        throw new Error("Direction was not a number");
    }
    return direction === 1 ? lowestLine(chord, clef) : highestLine(chord, clef);
}
exports.startingLine = startingLine;
/**
 * The line of the notehead closest to the dangling end of the stem. For single notes,
 * startingLine and heightDeterminingLine are equal.
 *
 * Note: The minimum size of a stem is determinted by this value.
 */
function heightDeterminingLine(chord, direction, clef) {
    if (direction !== -1 && direction !== 1) {
        throw new Error("Direction was not a number");
    }
    return direction === 1 ? highestLine(chord, clef) : lowestLine(chord, clef);
}
exports.heightDeterminingLine = heightDeterminingLine;
function linesForClef(chord, clef) {
    if (!clef) {
        throw new Error("Exepected a valid clef");
    }
    return lodash_1.map(chord, function (note) { return lineForClef(note, clef); });
}
exports.linesForClef = linesForClef;
function lineForClef(note, clef) {
    if (!clef) {
        throw new Error("Exepected a valid clef");
    }
    if (!note) {
        return 3;
    }
    else if (!!note.rest) {
        if (note.rest.displayStep) {
            return lineForClef_(note.rest.displayStep, note.rest.displayOctave, clef);
        }
        else if (note.noteType.duration === musicxml_interfaces_1.Count.Whole) {
            return 4;
        }
        else {
            return 3;
        }
    }
    else if (!!note.unpitched) {
        return lineForClef_(note.unpitched.displayStep, note.unpitched.displayOctave, clef);
    }
    else if (!!note.pitch) {
        return lineForClef_(note.pitch.step, note.pitch.octave, clef);
    }
    else {
        throw new Error("Invalid note");
    }
}
exports.lineForClef = lineForClef;
exports.offsetToPitch = {
    0: "C",
    0.5: "D",
    1: "E",
    1.5: "F",
    2: "G",
    2.5: "A",
    3: "B",
};
exports.pitchOffsets = {
    C: 0,
    D: 0.5,
    E: 1,
    F: 1.5,
    G: 2,
    A: 2.5,
    B: 3,
};
function pitchForClef(relativeY, clef) {
    var line = relativeY / 10 + 3;
    var clefOffset = getClefOffset(clef);
    var offset2x = Math.round((line - clefOffset) * 2);
    var octave = Math.floor(offset2x / 7) + 3;
    var stepQuant = (Math.round(offset2x + 7 * 1000) % 7) / 2;
    if (stepQuant === 3.5) {
        octave = octave + 1;
        stepQuant = 0;
    }
    var step = exports.offsetToPitch[stepQuant];
    return {
        octave: octave,
        step: step,
    };
}
exports.pitchForClef = pitchForClef;
function lineForClef_(step, octave, clef) {
    var octaveNum = parseInt(octave, 10) || 0;
    return getClefOffset(clef) + (octaveNum - 3) * 3.5 + exports.pitchOffsets[step];
}
exports.lineForClef_ = lineForClef_;
/**
 * Returns true if a ledger line is needed, and false otherwise.
 * Will be changed once staves with > 5 lines are available.
 */
function onLedger(note, clef) {
    if (!note || note.rest || note.unpitched) {
        return false;
    }
    var line = lineForClef(note, clef);
    return line < 0.5 || line > 5.5;
}
exports.onLedger = onLedger;
function ledgerLines(chord, clef) {
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
exports.ledgerLines = ledgerLines;
function rest(chord) {
    return !chord.length || chord[0].rest; // TODO
}
exports.rest = rest;
exports.defaultClefLines = {
    G: 2,
    F: 4,
    C: 3,
    PERCUSSION: 3,
    TAB: 5,
    NONE: 3,
};
exports.clefOffsets = {
    G: -3.5,
    F: 2.5,
    C: -0.5,
    PERCUSSION: -0.5,
    TAB: -0.5,
    NONE: -0.5,
};
function getClefOffset(clef) {
    return (exports.clefOffsets[clef.sign] +
        clef.line -
        exports.defaultClefLines[clef.sign.toUpperCase()] -
        3.5 * parseInt(clef.clefOctaveChange || "0", 10));
}
exports.getClefOffset = getClefOffset;
function barDivisionsDI(time, divisions) {
    invariant_1.default(!!divisions, "Expected divisions to be set before calculating bar divisions.");
    if (time.senzaMisura != null) {
        return 1000000 * divisions;
    }
    var quarterNotes = lodash_1.reduce(time.beats, function (memo, timeStr, idx) {
        return memo +
            lodash_1.reduce(timeStr.split("+"), function (memo, timeStr) {
                return memo + (parseInt(timeStr, 10) * 4) / time.beatTypes[idx];
            }, 0);
    }, 0);
    return quarterNotes * divisions || NaN;
}
exports.barDivisionsDI = barDivisionsDI;
function barDivisions(_a) {
    var time = _a.time, divisions = _a.divisions;
    return barDivisionsDI(time, divisions);
}
exports.barDivisions = barDivisions;
exports.IDEAL_STEM_HEIGHT = 35;
exports.MIN_STEM_HEIGHT = 25;
exports.chromaticScale = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11,
}; // c:12
exports.countToHasStem = {
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
exports.countToIsBeamable = {
    8: true,
    16: true,
    32: true,
    64: true,
    128: true,
    256: true,
    512: true,
    1024: true,
};
exports.countToFlag = {
    8: "flag8th",
    16: "flag16th",
    32: "flag32nd",
    64: "flag64th",
    128: "flag128th",
    256: "flag256th",
    512: "flag512th",
    1024: "flag1024th",
};
exports.accidentalGlyphs = (_a = {},
    _a[musicxml_interfaces_1.MxmlAccidental.NaturalFlat] = "accidentalNaturalSharp",
    _a[musicxml_interfaces_1.MxmlAccidental.SharpUp] = "accidentalThreeQuarterTonesSharpArrowUp",
    _a[musicxml_interfaces_1.MxmlAccidental.ThreeQuartersFlat] = "accidentalThreeQuarterTonesFlatZimmermann",
    _a[musicxml_interfaces_1.MxmlAccidental.ThreeQuartersSharp] = "accidentalThreeQuarterTonesSharpStein",
    _a[musicxml_interfaces_1.MxmlAccidental.QuarterFlat] = "accidentalQuarterToneFlatStein",
    _a[musicxml_interfaces_1.MxmlAccidental.Flat] = "accidentalFlat",
    _a[musicxml_interfaces_1.MxmlAccidental.TripleSharp] = "accidentalTripleSharp",
    _a[musicxml_interfaces_1.MxmlAccidental.Flat1] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Flat2] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Flat3] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Flat4] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Flat5] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Sharp1] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Sharp2] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Sharp3] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Sharp4] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.Sharp5] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.SlashQuarterSharp] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.DoubleSlashFlat] = null,
    _a[musicxml_interfaces_1.MxmlAccidental.TripleFlat] = "accidentalTripleFlat",
    _a[musicxml_interfaces_1.MxmlAccidental.Sharp] = "accidentalSharp",
    _a[musicxml_interfaces_1.MxmlAccidental.QuarterSharp] = "accidentalQuarterToneSharpStein",
    _a[musicxml_interfaces_1.MxmlAccidental.SlashFlat] = "accidentalTavenerFlat",
    _a[musicxml_interfaces_1.MxmlAccidental.FlatDown] = "accidentalFlatJohnstonDown",
    _a[musicxml_interfaces_1.MxmlAccidental.NaturalDown] = "accidentalQuarterToneFlatNaturalArrowDown",
    _a[musicxml_interfaces_1.MxmlAccidental.SharpSharp] = "accidentalSharpSharp",
    _a[musicxml_interfaces_1.MxmlAccidental.FlatUp] = "accidentalFlatJohnstonUp",
    _a[musicxml_interfaces_1.MxmlAccidental.DoubleSharp] = "accidentalDoubleSharp",
    _a[musicxml_interfaces_1.MxmlAccidental.Sori] = "accidentalSori",
    _a[musicxml_interfaces_1.MxmlAccidental.SharpDown] = "accidentalQuarterToneSharpArrowDown",
    _a[musicxml_interfaces_1.MxmlAccidental.Koron] = "accidentalKoron",
    _a[musicxml_interfaces_1.MxmlAccidental.NaturalUp] = "accidentalQuarterToneSharpNaturalArrowUp",
    _a[musicxml_interfaces_1.MxmlAccidental.SlashSharp] = "accidentalTavenerSharp",
    _a[musicxml_interfaces_1.MxmlAccidental.NaturalSharp] = "accidentalNaturalSharp",
    _a[musicxml_interfaces_1.MxmlAccidental.FlatFlat] = "accidentalDoubleFlat",
    _a[musicxml_interfaces_1.MxmlAccidental.Natural] = "accidentalNatural",
    _a[musicxml_interfaces_1.MxmlAccidental.DoubleFlat] = "accidentalDoubleFlat",
    _a);
exports.InvalidAccidental = -999;
var CUSTOM_NOTEHEADS = (_b = {},
    _b[musicxml_interfaces_1.NoteheadType.ArrowDown] = [
        "noteheadLargeArrowDownBlack",
        "noteheadLargeArrowDownHalf",
        "noteheadLargeArrowDownWhole",
        "noteheadLargeArrowDownDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.ArrowUp] = [
        "noteheadLargeArrowUpBlack",
        "noteheadLargeArrowUpHalf",
        "noteheadLargeArrowUpWhole",
        "noteheadLargeArrowUpDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.BackSlashed] = [
        "noteheadSlashedBlack2",
        "noteheadSlashedHalf2",
        "noteheadSlashedWhole2",
        "noteheadSlashedDoubleWhole2",
    ],
    _b[musicxml_interfaces_1.NoteheadType.CircleDot] = [
        "noteheadRoundWhiteWithDot",
        "noteheadCircledHalf",
        "noteheadCircledWhole",
        "noteheadCircledDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.CircleX] = [
        "noteheadCircledXLarge",
        "noteheadCircledXLarge",
        "noteheadCircledXLarge",
        "noteheadCircledXLarge",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Cluster] = [
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Cross] = [
        "noteheadPlusBlack",
        "noteheadPlusHalf",
        "noteheadPlusWhole",
        "noteheadPlusDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.InvertedTriangle] = [
        "noteheadTriangleDownBlack",
        "noteheadTriangleDownHalf",
        "noteheadTriangleDownWhole",
        "noteheadTriangleDownDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.LeftTriangle] = [
        "noteheadTriangleRightBlack",
        "noteheadTriangleRightHalf",
        "noteheadTriangleRightWhole",
        "noteheadTriangleRightDoubleWhole",
    ],
    // Finale has a different idea about what left means
    _b[musicxml_interfaces_1.NoteheadType.None] = [
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Slash] = [
        "noteheadSlashHorizontalEnds",
        "noteheadSlashWhiteHalf",
        "noteheadSlashWhiteWhole",
        "noteheadDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Slashed] = [
        "noteheadSlashedBlack1",
        "noteheadSlashedHalf1",
        "noteheadSlashedWhole1",
        "noteheadSlashedDoubleWhole1",
    ],
    _b[musicxml_interfaces_1.NoteheadType.X] = [
        "noteheadXBlack",
        "noteheadXHalf",
        "noteheadXWhole",
        "noteheadXDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Do] = [
        "noteheadTriangleUpBlack",
        "noteheadTriangleUpHalf",
        "noteheadTriangleUpWhole",
        "noteheadTriangleUpDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Triangle] = [
        "noteheadTriangleUpBlack",
        "noteheadTriangleUpHalf",
        "noteheadTriangleUpWhole",
        "noteheadTriangleUpDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Re] = [
        "noteheadMoonBlack",
        "noteheadMoonWhite",
        "noteheadMoonWhite",
        "noteheadMoonWhite",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Mi] = [
        "noteheadDiamondBlack",
        "noteheadDiamondHalf",
        "noteheadDiamondWhole",
        "noteheadDiamondDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Diamond] = [
        "noteheadDiamondBlack",
        "noteheadDiamondHalf",
        "noteheadDiamondWhole",
        "noteheadDiamondDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Fa] = [
        "noteheadTriangleUpRightBlack",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
    ],
    _b[musicxml_interfaces_1.NoteheadType.FaUp] = [
        "noteheadTriangleUpRightBlack",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
    ],
    _b[musicxml_interfaces_1.NoteheadType.So] = [
        "noteheadBlack",
        "noteheadHalf",
        "noteheadWhole",
        "noteheadDoubleWhole",
    ],
    _b[musicxml_interfaces_1.NoteheadType.La] = [
        "noteheadSquareBlack",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Square] = [
        "noteheadSquareBlack",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Rectangle] = [
        "noteheadSquareBlack",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
        "noteheadSquareWhite",
    ],
    _b[musicxml_interfaces_1.NoteheadType.Ti] = [
        "noteheadTriangleRoundDownBlack",
        "noteheadTriangleRoundDownWhite",
        "noteheadTriangleRoundDownWhite",
        "noteheadTriangleRoundDownWhite",
    ],
    _b);
function getNoteheadGlyph(notehead, stdGlyph) {
    var type = notehead ? notehead.type : musicxml_interfaces_1.NoteheadType.Normal;
    if (type === musicxml_interfaces_1.NoteheadType.Normal) {
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
exports.getNoteheadGlyph = getNoteheadGlyph;
function notationObj(n) {
    invariant_1.default(!n.notations || n.notations.length === 1, "Deprecated notations format");
    return n.notations ? n.notations[0] : EMPTY_FROZEN;
}
exports.notationObj = notationObj;
function articulationObj(n) {
    return notationObj(n).articulations
        ? notationObj(n).articulations[0]
        : Object.freeze({});
}
exports.articulationObj = articulationObj;
function tieds(n) {
    return lodash_1.chain(n)
        .map(function (n) { return notationObj(n).tieds; })
        .map(function (t) { return (t && t.length ? t[0] : null); })
        .value();
}
exports.tieds = tieds;
var FractionalDivisionsException = /** @class */ (function () {
    function FractionalDivisionsException(requiredDevisions) {
        this.requiredDivisions = requiredDevisions;
    }
    return FractionalDivisionsException;
}());
exports.FractionalDivisionsException = FractionalDivisionsException;
function divisions(chord, attributes, allowFractional) {
    if (_isIChord(chord) && lodash_1.some(chord, function (note) { return note.grace; })) {
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
    invariant_1.default(!!attributesTime, "A time signature must be specified.");
    if (chordCount === -1 || chordCount <= 1) {
        // TODO: What if beatType isn't consistent?
        var tsBeats = lodash_1.reduce(attributesTime.beats, function (memo, durr) {
            return memo + lodash_1.reduce(durr.split("+"), function (m, l) { return m + parseInt(l, 10); }, 0);
        }, 0);
        var tsBeatType = attributesTime.beatTypes.reduce(function (memo, bt) { return (memo === bt ? bt : NaN); }, attributesTime.beatTypes[0]);
        invariant_1.default(!isNaN(tsBeatType), "Time signature must be consistent");
        var total_1 = (attributeDivisions * tsBeats * 4) / tsBeatType;
        return total_1;
    }
    if ((attributeDivisions * 4) % chordCount > 0 && !allowFractional) {
        var newDivisions = private_util_1.lcm(attributeDivisions * 4, chordCount) / 4;
        throw new FractionalDivisionsException(newDivisions);
    }
    var base = (attributeDivisions * 4) / chordCount;
    var tmFactor = chordTM ? chordTM.normalNotes / chordTM.actualNotes : 1.0;
    var dotFactor = lodash_1.times(chordDots, function (d) { return 1 / Math.pow(2, d + 1); }).reduce(function (m, i) { return m + i; }, 1);
    var total = base * tmFactor * dotFactor;
    invariant_1.default(!isNaN(total), "calcDivisions must return a number. %s is not a number.", total);
    return total;
}
exports.divisions = divisions;
//# sourceMappingURL=private_chordUtil.js.map