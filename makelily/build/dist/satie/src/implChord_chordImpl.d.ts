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
import { Clef, Count, MultipleRest, Note, Stem, StemType, Tremolo, TimeModification } from "musicxml-interfaces";
import { Type } from "./document";
import { IBoundingRect } from "./private_boundingRect";
import { IChord } from "./private_chordUtil";
import { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";
import ChordModel from "./implChord_chordModel";
import { IBeamLayout } from "./implChord_beamLayout";
import NoteImpl from "./implChord_noteImpl";
/**
 * A model that represents 1 or more notes in the same voice, starting on the same beat, and each
 * with the same duration. Any number of these notes may be rests.
 */
declare class ChordModelImpl implements ChordModel.IChordModel, ArrayLike<NoteImpl> {
    /** set in validate */
    divCount: number;
    divisions: number;
    staffIdx: number;
    [key: number]: NoteImpl;
    length: number;
    wholebar: boolean;
    satieStem: {
        direction: number;
        stemHeight: number;
        stemStart: number;
        tremolo?: Tremolo;
    };
    satieFlag: string;
    satieDirection: StemType;
    satieMultipleRest: MultipleRest;
    noteheadGlyph: string[];
    satieUnbeamedTuplet: IBeamLayout;
    _clef: Clef;
    key: string;
    stem: Stem;
    private _layout;
    readonly satieLedger: number[];
    readonly rest: boolean;
    readonly timeModification: TimeModification;
    readonly notes: NoteImpl[];
    readonly count: Count;
    push(...notes: Note[]): number;
    splice(start: number, deleteCount: number, ...replacements: NoteImpl[]): void;
    /**
     * We accept either a Note from musicxml-interfaces, or an IChord, which
     * is an array-like element of Notes. In either case, we create a deep copy.
     */
    constructor(spec?: IChord | Note);
    _init: boolean;
    refresh(cursor: IReadOnlyValidationCursor): void;
    getLayout(cursor: LayoutCursor): ChordModel.IChordLayout;
    toJSON(): any;
    toXML(): string;
    inspect(): string;
    calcWidth(shortest: number): number;
    calcAccidentalWidth(): number;
    calcDotWidth(): number;
    private _implyCountFromPerformanceData(cursor);
    private _getStemHeight(direction, clef);
    private _pickDirection(cursor);
    private _checkMulitpleRest(cursor);
    private _implyNoteheads(cursor);
    private _hasStem();
}
declare module ChordModelImpl {
    class Layout implements ChordModel.IChordLayout {
        model: ChordModel.IDetachedChordModel;
        x: number;
        division: number;
        renderedWidth: number;
        notehead: string;
        minSpaceBefore: number;
        minSpaceAfter: number;
        boundingBoxes: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none" | "centered" | "after";
        satieBeam: IBeamLayout;
        satieStem: {
            direction: number;
            stemHeight: number;
            stemStart: number;
            tremolo?: Tremolo;
        };
        satieFlag: string;
        refresh(baseModel: ChordModelImpl, cursor: LayoutCursor): void;
        private _captureBoundingBoxes();
        private _getMinWidthBefore(cursor);
        private _getMinWidthAfter(cursor);
        private _getLyricWidth(cursor);
        private _detachModelWithContext(cursor, baseModel);
    }
}
export default ChordModelImpl;
