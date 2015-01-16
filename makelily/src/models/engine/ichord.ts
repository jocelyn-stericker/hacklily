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

    export function lines(chord: IChord, cursor: ICursor): Array<number> {
        return _.map(chord, note => {
            if (!!note.rest) {
                if (chord.length && note.rest.displayStep) {
                    return getClefOffset(cursor.staff.attributes.clefs[0]) +
                            ((parseInt(note.rest.displayOctave, 10) || 0) - 3) * 3.5 +
                        pitchOffsets[note.rest.displayStep];
                } else if (note.noteType.duration === MusicXML.Count.Whole) {
                    return 4;
                } else {
                    return 3;
                }
            }
        });
    };

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

    export var countToFlag: { [key: string]: string } = {
        8: "flag8th",
        16: "flag16th",
        32: "flag32nd",
        64: "flag64th",
        128: "flag128th",
        256: "flag256th",
        512: "flag512th",
        1024: "flag1024th"
    };

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

    export var countToNotehead: { [key: number]: string } = {
        9992: "noteheadDoubleWhole",
        9991: "noteheadDoubleWhole",
        9990: "noteheadDoubleWhole",
        1: "noteheadWhole",
        2: "noteheadHalf",
        4: "noteheadBlack",
        8: "noteheadBlack",
        16: "noteheadBlack",
        32: "noteheadBlack",
        64: "noteheadBlack",
        128: "noteheadBlack",
        256: "noteheadBlack",
        512: "noteheadBlack",
        1024: "noteheadBlack"
    };

    export var countToRest: { [key: number]: string } = {
        9992: "restLonga",
        9991: "restLonga",
        9990: "restDoubleWhole",
        1: "restWhole",
        2: "restHalf",
        4: "restQuarter",
        8: "rest8th",
        16: "rest16th",
        32: "rest32nd",
        64: "rest64th",
        128: "rest128th",
        256: "rest256th",
        512: "rest512th",
        1024: "rest1024th"
    };

    export var getAverageLine = (chord: IChord, cursor$: ICursor) => {
        return _.reduce(lines(chord, cursor$),
            (memo, line) => memo + line/lines.length, 0);
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
