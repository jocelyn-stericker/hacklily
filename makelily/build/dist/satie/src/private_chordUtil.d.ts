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
import { Note, Count, TimeModification, Tie, Clef, Rest, Time, Notehead, Notations, Articulations, Tied, Pitch, Beam } from "musicxml-interfaces";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
import { ValidationCursor, LayoutCursor } from "./private_cursor";
export interface IChord {
    [key: number]: Note;
    length: number;
    push: (...notes: Note[]) => number;
    _class?: string;
}
export interface IDurationDescription {
    count: number;
    dots?: number;
    timeModification?: TimeModification;
}
export declare function hasAccidental(chord: IChord, cursor: ValidationCursor | LayoutCursor): boolean;
export declare function count(chord: IChord): Count;
export declare function count(duration: IDurationDescription): Count;
export declare function count(chord: IChord | IDurationDescription): Count;
export declare function dots(chord: IChord): number;
export declare function dots(duration: IDurationDescription): number;
export declare function dots(chord: IChord | IDurationDescription): number;
export declare function timeModification(chord: IChord): TimeModification;
export declare function timeModification(duration: IDurationDescription): TimeModification;
export declare function timeModification(chord: IChord | IDurationDescription): TimeModification;
export declare function ties(chord: IChord): Tie[];
export declare function beams(chord: IChord): Beam[];
export declare function hasFlagOrBeam(chord: IChord): boolean;
/**
 * Returns the mean of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export declare function averageLine(chord: IChord, clef: Clef): number;
/**
 * Returns the minimum of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export declare function lowestLine(chord: IChord, clef: Clef): number;
/**
 * Returns the highest of all the lines, in SMuFL coordinates, where
 * 3 is the middle line. (SMuFL coordinates are 10x MusicXML coordinates)
 */
export declare function highestLine(chord: IChord, clef: Clef): number;
/**
 * Returns the position where the line starts. For single notes, this is where
 * the notehead appears. For chords, this is where the furthest notehead appears.
 */
export declare function startingLine(chord: IChord, direction: number, clef: Clef): number;
/**
 * The line of the notehead closest to the dangling end of the stem. For single notes,
 * startingLine and heightDeterminingLine are equal.
 *
 * Note: The minimum size of a stem is determinted by this value.
 */
export declare function heightDeterminingLine(chord: IChord, direction: number, clef: Clef): number;
export declare function linesForClef(chord: IChord, clef: Clef): Array<number>;
export declare function lineForClef(note: Note, clef: Clef): number;
export declare let offsetToPitch: {
    [key: string]: string;
};
export declare let pitchOffsets: {
    [key: string]: number;
};
export declare function pitchForClef(relativeY: number, clef: Clef): Pitch;
export declare function lineForClef_(step: string, octave: string | number, clef: Clef): number;
/**
 * Returns true if a ledger line is needed, and false otherwise.
 * Will be changed once staves with > 5 lines are available.
 */
export declare function onLedger(note: Note, clef: Clef): boolean;
export declare function ledgerLines(chord: IChord, clef: Clef): number[];
export declare function rest(chord: IChord): Rest;
export declare let defaultClefLines: {
    [key: string]: number;
};
export declare let clefOffsets: {
    [key: string]: number;
};
export declare function getClefOffset(clef: Clef): number;
export declare function barDivisionsDI(time: Time, divisions: number): number;
export declare function barDivisions({time, divisions}: IAttributesSnapshot): number;
export declare let IDEAL_STEM_HEIGHT: number;
export declare let MIN_STEM_HEIGHT: number;
export declare let chromaticScale: {
    [key: string]: number;
};
export declare let countToHasStem: {
    [key: string]: boolean;
};
export declare let countToIsBeamable: {
    [key: string]: boolean;
};
export declare let countToFlag: {
    [key: string]: string;
};
export declare let accidentalGlyphs: {
    [key: number]: string;
};
export declare let InvalidAccidental: number;
export declare function getNoteheadGlyph(notehead: Notehead, stdGlyph: string): string;
export declare function notationObj(n: Note): Notations;
export declare function articulationObj(n: Note): Articulations;
export declare function tieds(n: Note[]): Tied[];
export declare class FractionalDivisionsException {
    requiredDivisions: number;
    constructor(requiredDevisions: number);
}
export declare function divisions(chord: IChord | IDurationDescription, attributes: {
    time: Time;
    divisions: number;
}, allowFractional?: boolean): number;
