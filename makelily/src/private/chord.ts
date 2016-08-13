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
 * @file private/ichord.ts Base type for the chord model
 */

import {Note, Count, TimeModification, Tie, Clef, Rest, Time, MxmlAccidental,
    Notehead, NoteheadType, Notations, Articulations, Tied, Pitch, Beam} from "musicxml-interfaces";
import {some, find, forEach, times, map, reduce, filter, chain} from "lodash";
import * as invariant from "invariant";

import IModel from "../document/model";

import IAttributesSnapshot from "./attributesSnapshot";
import {ICursor} from "./cursor";
import {cloneObject} from "./util";

interface IChord {
    [key: number]: Note;
    length: number;
    push: (...notes: Note[]) => number;
    _class?: string;
}

export default IChord;

const EMPTY_FROZEN = Object.freeze({});

export function fromModel(model: IModel) {
    let chord = <IChord><any>model;
    invariant(chord.length > 0, "%s is not a chord", model);
    invariant(!!chord[0].pitch || !!chord[0].rest || !!chord[0].unpitched,
        "%s does not have a valid first note", model);
    return chord;
}

export function hasAccidental(chord: IChord, cursor: ICursor) {
    return some(chord, function(c) {
        if (!c.pitch) {
            return false;
        }
        let accidental = (cursor.staff.accidentals$[c.pitch.alter] || 0);
        return ((c.pitch.alter || 0) !== accidental &&
                (c.pitch.alter || 0) !==
                    (cursor.staff.accidentals$[c.pitch.alter + c.pitch.octave] || 0) ||
            !!c.accidental);
    });
}

export function count(chord: IChord): Count {
    let target = find(chord, note => note.noteType);
    if (target) {
        return target.noteType.duration;
    }
    return NaN;
}

export function setCount$(chord$: IChord, count: Count) {
    forEach(chord$, note$ => {
        note$.noteType = { duration: count};
    });
}

export function dots(chord: IChord): number {
    return (find(chord, note => note.dots) || {dots: <any[]> []}).dots.length;
}

export function setDots$(chord$: IChord, dots: number) {
    forEach(chord$, note$ => {
        note$.dots = times(dots, () => { return {}; });
    });
}

export function timeModification(chord: IChord): TimeModification {
    return (find(chord, note => note.timeModification) ||
            {timeModification: <TimeModification> null})
        .timeModification;
}

export function setTimeModification$(chord$: IChord,
        timeModification: TimeModification) {
    forEach(chord$, note$ => {
        note$.timeModification = cloneObject(timeModification);
    });
}

export function ties(chord: IChord): Tie[] {
    let ties = map(chord, note => note.ties && note.ties.length ? note.ties[0] : null);
    return filter(ties, t => !!t).length ? ties : null;
}

export function setTies$(chord$: IChord, ties: Tie[]) {
    forEach(chord$, (note$: Note, i: number) => {
        note$.ties = [ties[i]];
    });
}

export function beams(chord: IChord): Beam[] {
    let target = find(chord, note => !!note.beams);
    if (target) {
        return target.beams;
    }
    return null;
}

export function hasFlagOrBeam(chord: IChord): boolean {
    // TODO: check if flag/beam forcefully set to "off"
    return some(chord, note => note.noteType.duration <= Count.Eighth);
}

/**
 * Returns the mean of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export function averageLine(chord: IChord, clef: Clef): number {
    return reduce(linesForClef(chord, clef), (memo: number, line: number) =>
        memo + line, 0) / chord.length;
}

/**
 * Returns the minimum of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export function lowestLine(chord: IChord, clef: Clef) {
    return reduce(linesForClef(chord, clef), (memo: number, line: number) =>
        Math.min(memo, line), 10000);
}

/**
 * Returns the highest of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export function highestLine(chord: IChord, clef: Clef) {
    return reduce(linesForClef(chord, clef), (memo: number, line: number) =>
        Math.max(memo, line), -10000);
}

/**
 * Returns the position where the line starts. For single notes, this is where
 * the notehead appears. For chords, this is where the furthest notehead appears.
 */
export function startingLine(chord: IChord, direction: number, clef: Clef) {
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
export function heightDeterminingLine(chord: IChord, direction: number, clef: Clef) {
    if (direction !== -1 && direction !== 1) {
        throw new Error("Direction was not a number");
    }
    return direction === 1 ? highestLine(chord, clef) : lowestLine(chord, clef);
}

export function linesForClef(chord: IChord, clef: Clef): Array<number> {
    if (!clef) {
        throw new Error("Exepected a valid clef");
    }
    return map(chord, (note: Note) => lineForClef(note, clef));
};

export function lineForClef(note: Note, clef: Clef): number {
    if (!clef) {
        throw new Error("Exepected a valid clef");
    }
    if (!note) {
        return 3;
    } else if (!!note.rest) {
        if (note.rest.displayStep) {
            return lineForClef_(note.rest.displayStep, note.rest.displayOctave, clef);
        } else if (note.noteType.duration === Count.Whole) {
            return 4;
        } else {
            return 3;
        }
    } else if (!!note.unpitched) {
        return lineForClef_(note.unpitched.displayStep, note.unpitched.displayOctave, clef);
    } else if (!!note.pitch) {
        return lineForClef_(note.pitch.step, note.pitch.octave, clef);
    } else {
        throw new Error("Invalid note");
    }
}

export let offsetToPitch: { [key: string]: string } = {
    0: "C",
    0.5: "D",
    1: "E",
    1.5: "F",
    2: "G",
    2.5: "A",
    3: "B"
};

export let pitchOffsets: { [key: string]: number } = {
    C: 0,
    D: 0.5,
    E: 1,
    F: 1.5,
    G: 2,
    A: 2.5,
    B: 3
};

export function pitchForClef(relativeY: number, clef: Clef): Pitch {
    let line = relativeY / 10 + 3;
    let clefOffset = getClefOffset(clef);
    let octave = Math.floor((-clefOffset + 3 * 3.5 + line) / 3.5);
    let stepQuant = Math.round((line + clefOffset - (octave - 5) * 3.5) * 2) / 2;
    if (stepQuant === 3.5) {
        octave = octave + 1;
        stepQuant = 0;
    }
    let step = offsetToPitch[stepQuant];

    return {
        octave,
        step
    };
}

export function lineForClef_(step: string, octave: string | number,
        clef: Clef): number {

    let octaveNum = (parseInt(<string> octave, 10) || 0);
    return getClefOffset(clef) + (octaveNum - 3) * 3.5 + pitchOffsets[step];
}

/**
 * Returns true if a ledger line is needed, and false otherwise.
 * Will be changed once staves with > 5 lines are available.
 */
export function onLedger(note: Note, clef: Clef) {
    if (!note || note.rest || note.unpitched) {
        return false;
    }
    const line = lineForClef(note, clef);
    return line < 0.5 || line > 5.5;
}

export function ledgerLines(chord: IChord, clef: Clef) {
    let low = lowestLine(chord, clef);
    let high = highestLine(chord, clef);
    let lines: number[] = [];
    for (let i = 6; i <= high; ++i) {
        lines.push(i);
    }
    for (let i = 0; i >= low; --i) {
        lines.push(i);
    }
    return lines;
}

export function rest(chord: IChord): Rest {
    return !chord.length || chord[0].rest;
}

export let defaultClefLines: { [key: string]: number} = {
    G: 2,
    F: 4,
    C: 3,
    PERCUSSION: 3,
    TAB: 5,
    NONE: 3
};

export let clefOffsets: { [key: string]: number } = {
    G: -3.5,
    F: 2.5,
    C: -0.5,
    PERCUSSION: -0.5,
    TAB: -0.5,
    NONE: -0.5
};

export function getClefOffset(clef: Clef) {
    return clefOffsets[clef.sign] + clef.line - defaultClefLines[clef.sign.toUpperCase()]
        - 3.5 * parseInt(clef.clefOctaveChange || "0", 10);
}

export function barDivisionsDI(time: Time, divisions: number) {
    invariant(!!divisions,
        "Expected divisions to be set before calculating bar divisions.");

    if (time.senzaMisura != null) {
        return 1000000 * divisions;
    }

    const quarterNotes = reduce(time.beats, (memo, timeStr, idx) => memo +
        reduce(timeStr.split("+"), (memo, timeStr) => memo +
            parseInt(timeStr, 10) * 4 / time.beatTypes[idx], 0), 0);

    return quarterNotes * divisions || NaN;
}

export function barDivisions({time, divisions}: IAttributesSnapshot) {
    return barDivisionsDI(time, divisions);
}

export let IDEAL_STEM_HEIGHT: number = 35;
export let MIN_STEM_HEIGHT: number = 25;

export let chromaticScale: { [key: string]: number } = {
    c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11
}; // c:12

export let countToHasStem: { [key: string]: boolean } = {
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
    1024: true
};

export let countToIsBeamable: { [key: string]: boolean } = {
    8: true,
    16: true,
    32: true,
    64: true,
    128: true,
    256: true,
    512: true,
    1024: true
};

export let countToFlag: { [key: string]: string } = {
    8: "flag8th",
    16: "flag16th",
    32: "flag32nd",
    64: "flag64th",
    128: "flag128th",
    256: "flag256th",
    512: "flag512th",
    1024: "flag1024th"
};

export let accidentalGlyphs: { [key: number]: string } = {
    [MxmlAccidental.NaturalFlat]: "accidentalNaturalSharp",
    [MxmlAccidental.SharpUp]: "accidentalThreeQuarterTonesSharpArrowUp",
    [MxmlAccidental.ThreeQuartersFlat]: "accidentalThreeQuarterTonesFlatZimmermann",
    [MxmlAccidental.ThreeQuartersSharp]: "accidentalThreeQuarterTonesSharpStein",
    [MxmlAccidental.QuarterFlat]: "accidentalQuarterToneFlatStein",
    [MxmlAccidental.Flat]: "accidentalFlat",
    [MxmlAccidental.TripleSharp]: "accidentalTripleSharp",
    [MxmlAccidental.Flat1]: null,
    [MxmlAccidental.Flat2]: null,
    [MxmlAccidental.Flat3]: null,
    [MxmlAccidental.Flat4]: null,
    [MxmlAccidental.Flat5]: null,
    [MxmlAccidental.Sharp1]: null,
    [MxmlAccidental.Sharp2]: null,
    [MxmlAccidental.Sharp3]: null,
    [MxmlAccidental.Sharp4]: null,
    [MxmlAccidental.Sharp5]: null,
    [MxmlAccidental.SlashQuarterSharp]: null,
    [MxmlAccidental.DoubleSlashFlat]: null,
    [MxmlAccidental.TripleFlat]: "accidentalTripleFlat",
    [MxmlAccidental.Sharp]: "accidentalSharp",
    [MxmlAccidental.QuarterSharp]: "accidentalQuarterToneSharpStein",
    [MxmlAccidental.SlashFlat]: "accidentalTavenerFlat",
    [MxmlAccidental.FlatDown]: "accidentalFlatJohnstonDown",
    [MxmlAccidental.NaturalDown]: "accidentalQuarterToneFlatNaturalArrowDown",
    [MxmlAccidental.SharpSharp]: "accidentalSharpSharp",
    [MxmlAccidental.FlatUp]: "accidentalFlatJohnstonUp",
    [MxmlAccidental.DoubleSharp]: "accidentalDoubleSharp",
    [MxmlAccidental.Sori]: "accidentalSori",
    [MxmlAccidental.SharpDown]: "accidentalQuarterToneSharpArrowDown",
    [MxmlAccidental.Koron]: "accidentalKoron",
    [MxmlAccidental.NaturalUp]: "accidentalQuarterToneSharpNaturalArrowUp",
    [MxmlAccidental.SlashSharp]: "accidentalTavenerSharp",
    [MxmlAccidental.NaturalSharp]: "accidentalNaturalSharp",
    [MxmlAccidental.FlatFlat]: "accidentalDoubleFlat",
    [MxmlAccidental.Natural]: "accidentalNatural",
    [MxmlAccidental.DoubleFlat]: "accidentalDoubleFlat"
};

export let InvalidAccidental = -999;

const CUSTOM_NOTEHEADS: {[key: number]: string[]} = {
    [NoteheadType.ArrowDown]: [
        "noteheadLargeArrowDownBlack",
        "noteheadLargeArrowDownHalf",
        "noteheadLargeArrowDownWhole",
        "noteheadLargeArrowDownDoubleWhole"],
    [NoteheadType.ArrowUp]: ["noteheadLargeArrowUpBlack", "noteheadLargeArrowUpHalf",
        "noteheadLargeArrowUpWhole", "noteheadLargeArrowUpDoubleWhole"],
    [NoteheadType.BackSlashed]: ["noteheadSlashedBlack2", "noteheadSlashedHalf2",
        "noteheadSlashedWhole2", "noteheadSlashedDoubleWhole2"],
    [NoteheadType.CircleDot]: ["noteheadRoundWhiteWithDot", "noteheadCircledHalf",
        "noteheadCircledWhole", "noteheadCircledDoubleWhole"],
    [NoteheadType.CircleX]: ["noteheadCircledXLarge", "noteheadCircledXLarge",
        "noteheadCircledXLarge", "noteheadCircledXLarge"],
    [NoteheadType.Cluster]: ["noteheadNull", "noteheadNull",
        "noteheadNull", "noteheadNull"], // TODO
    [NoteheadType.Cross]: ["noteheadPlusBlack", "noteheadPlusHalf",
        "noteheadPlusWhole", "noteheadPlusDoubleWhole"],
    [NoteheadType.InvertedTriangle]: [
        "noteheadTriangleDownBlack",
        "noteheadTriangleDownHalf",
        "noteheadTriangleDownWhole",
        "noteheadTriangleDownDoubleWhole"],
    [NoteheadType.LeftTriangle]: [
        "noteheadTriangleRightBlack",
        "noteheadTriangleRightHalf",
        "noteheadTriangleRightWhole",
        "noteheadTriangleRightDoubleWhole"],
        // Finale has a different idea about what left means
    [NoteheadType.None]: [
        "noteheadNull",
        "noteheadNull",
        "noteheadNull",
        "noteheadNull"],
    [NoteheadType.Slash]: ["noteheadSlashHorizontalEnds", "noteheadSlashWhiteHalf",
        "noteheadSlashWhiteWhole", "noteheadDoubleWhole"],
    [NoteheadType.Slashed]: ["noteheadSlashedBlack1", "noteheadSlashedHalf1",
        "noteheadSlashedWhole1", "noteheadSlashedDoubleWhole1"],

    [NoteheadType.X]: ["noteheadXBlack", "noteheadXHalf",
        "noteheadXWhole", "noteheadXDoubleWhole"],

    [NoteheadType.Do]: ["noteheadTriangleUpBlack", "noteheadTriangleUpHalf",
        "noteheadTriangleUpWhole", "noteheadTriangleUpDoubleWhole"],
    [NoteheadType.Triangle]: ["noteheadTriangleUpBlack", "noteheadTriangleUpHalf",
        "noteheadTriangleUpWhole", "noteheadTriangleUpDoubleWhole"],

    [NoteheadType.Re]: ["noteheadMoonBlack", "noteheadMoonWhite",
        "noteheadMoonWhite", "noteheadMoonWhite"],

    [NoteheadType.Mi]: ["noteheadDiamondBlack", "noteheadDiamondHalf",
        "noteheadDiamondWhole", "noteheadDiamondDoubleWhole"],
    [NoteheadType.Diamond]: ["noteheadDiamondBlack", "noteheadDiamondHalf",
        "noteheadDiamondWhole", "noteheadDiamondDoubleWhole"],

    [NoteheadType.Fa]: ["noteheadTriangleUpRightBlack", "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite", "noteheadTriangleUpRightWhite"],
    [NoteheadType.FaUp]: [
        "noteheadTriangleUpRightBlack",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite"],

    [NoteheadType.So]: ["noteheadBlack", "noteheadHalf",
        "noteheadWhole", "noteheadDoubleWhole"],

    [NoteheadType.La]: ["noteheadSquareBlack", "noteheadSquareWhite",
        "noteheadSquareWhite", "noteheadSquareWhite"],
    [NoteheadType.Square]: ["noteheadSquareBlack", "noteheadSquareWhite",
        "noteheadSquareWhite", "noteheadSquareWhite"],
    [NoteheadType.Rectangle]: ["noteheadSquareBlack", "noteheadSquareWhite",
        "noteheadSquareWhite", "noteheadSquareWhite"],

    [NoteheadType.Ti]: [
        "noteheadTriangleRoundDownBlack",
        "noteheadTriangleRoundDownWhite",
        "noteheadTriangleRoundDownWhite",
        "noteheadTriangleRoundDownWhite"]
};

export function getNoteheadGlyph(notehead: Notehead, stdGlyph: string) {
    let type = notehead ? notehead.type : NoteheadType.Normal;

    if (type === NoteheadType.Normal) {
        return stdGlyph;
    } else {
        let noteheads = CUSTOM_NOTEHEADS[type];
        if (noteheads) {
            if (noteheads[0] && stdGlyph === "noteheadBlack") {
                return noteheads[0];
            } else if (noteheads[1] && stdGlyph === "noteheadHalf") {
                return noteheads[1];
            } else if (noteheads[2] && stdGlyph === "noteheadWhole") {
                return noteheads[2];
            } else if (noteheads[3] && stdGlyph === "noteheadDoubleWhole") {
                return noteheads[3];
            }
        }
    }
    console.warn(`The custom notehead with ID ${type} cannot replace ` +
        `${this.props.notehead}, probably because it's not implemented.`);
    return this.props.notehead;
}

export function notationObj(n: Note): Notations {
    invariant(!n.notations || n.notations.length === 1, "Deprecated notations format");
    return n.notations ? n.notations[0] : EMPTY_FROZEN;
}

export function articulationObj(n: Note): Articulations {
    return notationObj(n).articulations ?
        notationObj(n).articulations[0] : Object.freeze({});
}

export function tieds(n: Note[]): Tied[] {
    return chain(n)
        .map(n => notationObj(n).tieds)
        .map(t => t && t.length ? t[0] : null)
        .value();
}
