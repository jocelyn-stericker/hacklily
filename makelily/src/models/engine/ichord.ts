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

/**
 * @file engine/ichord.ts Base type for the chord model
 */

"use strict";

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import ICursor          = require("./icursor");
import IModel           = require("./imodel");
import Util             = require("./util");

interface IChord {
    [key: number]: MusicXML.Note;
    length: number;
    push: (...notes: MusicXML.Note[]) => number;
}

module IChord {
    export function fromModel(model: IModel) {
        var chord = <IChord><any>model;
        invariant(chord.length > 0, "%s is not a chord", model);
        invariant(!!chord[0].pitch || !!chord[0].rest || !!chord[0].unpitched, "%s does not " +
                "have a valid first note", model);
        return chord;
    }

    export function hasAccidental(chord: IChord, cursor: ICursor) {
        return _.any(chord, function(c) {
            return !c.rest && ((c.pitch.alter || 0) !== (cursor.staff.accidentals$[c.pitch.alter] || 0) &&
                    (c.pitch.alter || 0) !==
                        (cursor.staff.accidentals$[c.pitch.alter + c.pitch.octave] || 0) ||
                !!c.accidental);
        });
    }

    export function count(chord: IChord): MusicXML.Count {
        var target = _.find(chord, note => note.noteType);
        if (target) {
            return target.noteType.duration;
        }
        return NaN;
    }

    export function setCount$(chord$: IChord, count: MusicXML.Count) {
        _.forEach(chord$, note$ => {
            note$.noteType = { duration: count};
        });
    }

    export function dots(chord: IChord): number {
        return (_.find(chord, note => note.dots) || {dots: <any[]> []}).dots.length;
    }

    export function setDots$(chord$: IChord, dots: number) {
        _.forEach(chord$, note$ => {
            note$.dots = _.times(dots, () => { return {}; });
        });
    }

    export function timeModification(chord: IChord): MusicXML.TimeModification {
        return (_.find(chord, note => note.timeModification) ||
                {timeModification: <MusicXML.TimeModification> null})
            .timeModification;
    }

    export function setTimeModification$(chord$: IChord, timeModification: MusicXML.TimeModification) {
        _.forEach(chord$, note$ => {
            note$.timeModification = Util.cloneObject(timeModification);
        });
    }

    export function ties(chord: IChord): MusicXML.Tie[] {
        var ties = _.map(chord, note => note.ties && note.ties.length ? note.ties[0] : null);
        return _.filter(ties, t => !!t).length ? ties : null;
    }

    export function setTies$(chord$: IChord, ties: MusicXML.Tie[]) {
        _.forEach(chord$, (note$: MusicXML.Note, i: number) => {
            note$.ties = [ties[i]];
        });
    }

    export function inBeam(chord: IChord): boolean {
        // TODO: not implemented. Will likely involve hacks.
        return false;
    }

    export function hasFlagOrBeam(chord: IChord): boolean {
        // TODO: check if flag/beam forcefully set to "off"
        return _.any(chord, note => note.noteType.duration <= MusicXML.Count.Eighth);
    }

    /**
     * Returns the mean of all the lines, in SMuFL coordinates, where
     * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
     */
    export function averageLine(chord: IChord, clef: MusicXML.Clef): number {
        return _.reduce(linesForClef(chord, clef), (memo: number, line: number) =>
            memo + line, 0) / chord.length;
    }
    /**
     * Returns the minimum of all the lines, in SMuFL coordinates, where
     * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
     */
    export function lowestLine(chord: IChord, clef: MusicXML.Clef) {
        return _.reduce(linesForClef(chord, clef), (memo: number, line: number) =>
            Math.min(memo, line), 10000);
    }
    /**
     * Returns the highest of all the lines, in SMuFL coordinates, where
     * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
     */
    export function highestLine(chord: IChord, clef: MusicXML.Clef) {
        return _.reduce(linesForClef(chord, clef), (memo: number, line: number) =>
            Math.max(memo, line), -10000);
    }
    /**
     * Returns the position where the line starts. For single notes, this is where
     * the notehead appears. For chords, this is where the furthest notehead appears.
     */
    export function startingLine(chord: IChord, direction: number, clef: MusicXML.Clef) {
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
    export function heightDeterminingLine(chord: IChord, direction: number, clef: MusicXML.Clef) {
        if (direction !== -1 && direction !== 1) {
            throw new Error("Direction was not a number");
        }
        return direction === 1 ? highestLine(chord, clef) : lowestLine(chord, clef);
    }

    export function linesForClef(chord: IChord, clef: MusicXML.Clef): Array<number> {
        if (!clef) {
            throw "Exepected a valid clef";
        }
        return _.map(chord, (note: MusicXML.Note) => lineForClef(note, clef));
    };

    export function lineForClef(note: MusicXML.Note, clef: MusicXML.Clef): number {
        if (!clef) {
            throw new Error("Exepected a valid clef");
        }
        if (!note) {
            return 3;
        } else if (!!note.rest) {
            if (note.rest.displayStep) {
                return getClefOffset(clef) +
                        ((parseInt(note.rest.displayOctave, 10) || 0) - 3) * 3.5 +
                    pitchOffsets[note.rest.displayStep];
            } else if (note.noteType.duration === MusicXML.Count.Whole) {
                return 4;
            } else {
                return 3;
            }
        } else if (!!note.unpitched) {
            throw new Error("Not implemnted");
        } else if (!!note.pitch) {
            return IChord.getClefOffset(clef) +
                ((note.pitch.octave || 0) - 3) * 3.5 +
                    IChord.pitchOffsets[note.pitch.step];
        } else {
            throw new Error("Invalid note");
        }
    }

    /**
     * Returns true if a ledger line is needed, and false otherwise.
     * Will be changed once staves with > 5 lines are available.
     */
    export function onLedger(note: MusicXML.Note, clef: MusicXML.Clef) {
        if (!note || note.rest || note.unpitched) {
            return false;
        }
        const line = IChord.lineForClef(note, clef);
        return line < 0.5 || line > 5.5;
    }

    export function rest(chord: IChord): MusicXML.Rest {
        return !chord.length || chord[0].rest;
    }

    export function getClefOffset(clef: MusicXML.Clef) {
        return clefOffsets[clef.sign] + clef.line - defaultClefLines[clef.sign.toUpperCase()]
            - 3.5*parseInt(clef.clefOctaveChange||"0", 10);
    }

    export var IDEAL_STEM_HEIGHT: number = 35;
    export var MIN_STEM_HEIGHT: number = 25;

    export var defaultClefLines: { [key: string]: number} = {
        G:              2,
        F:              4,
        C:              3,
        PERCUSSION:     3,
        TAB:            5,
        NONE:           3
    };

    export var clefOffsets: { [key: string]: number } = {
        G:              -3.5,
        F:               2.5,
        C:              -0.5,
        PERCUSSION:     -0.5,
        TAB:            -0.5,
        NONE:           -0.5
    };

    export var chromaticScale: { [key: string]: number } = {
        c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11
    }; // c:12

    export var countToHasStem: { [key: string]: boolean } = {
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

    export var countToIsBeamable: { [key: string]: boolean } = {
        8: true,
        16: true,
        32: true,
        64: true,
        128: true,
        256: true,
        512: true,
        1024: true
    };

    export var offsetToPitch: { [key: string]: string } = {
        0: "C",
        0.5: "D",
        1: "E",
        1.5: "F",
        2: "G",
        2.5: "A",
        3: "B"
    };

    export var pitchOffsets: { [key: string]: number } = {
        C: 0,
        D: 0.5,
        E: 1,
        F: 1.5,
        G: 2,
        A: 2.5,
        B: 3
    };

}

export = IChord;
