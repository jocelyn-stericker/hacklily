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
import { Clef, Count, MultipleRest, Note, Stem, StemType, Tremolo, TimeModification } from "musicxml-interfaces";
import { Type } from "./document";
import { IBoundingRect } from "./private_boundingRect";
import { IChord } from "./private_chordUtil";
import { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";
import { IChordModel, IChordLayout, IDetachedChordModel } from "./implChord_chordModel";
import { IBeamLayout } from "./implChord_beamLayout";
import NoteImpl from "./implChord_noteImpl";
export declare class Layout implements IChordLayout {
    model: IDetachedChordModel;
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
    _captureBoundingBoxes(): IBoundingRect[];
    _getMinWidthBefore(cursor: LayoutCursor): number;
    _getMinWidthAfter(cursor: LayoutCursor): number;
    _getLyricWidth(_cursor: LayoutCursor): number;
    _detachModelWithContext(_cursor: LayoutCursor, baseModel: ChordModelImpl): IDetachedChordModel;
}
/**
 * A model that represents 1 or more notes in the same voice, starting on the same beat, and each
 * with the same duration. Any number of these notes may be rests.
 */
declare class ChordModelImpl implements IChordModel, ArrayLike<NoteImpl> {
    /** set in validate */
    divCount: number;
    divisions: number;
    get staffIdx(): number;
    set staffIdx(_n: number);
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
    get satieLedger(): number[];
    get rest(): boolean;
    get timeModification(): TimeModification;
    get notes(): NoteImpl[];
    get count(): Count;
    push(...notes: Note[]): number;
    splice(start: number, deleteCount: number, ...replacements: NoteImpl[]): void;
    /**
     * We accept either a Note from musicxml-interfaces, or an IChord, which
     * is an array-like element of Notes. In either case, we create a deep copy.
     */
    constructor(spec?: IChord | Note);
    _init: boolean;
    refresh(cursor: IReadOnlyValidationCursor): void;
    getLayout(cursor: LayoutCursor): IChordLayout;
    toJSON(): any;
    toXML(): string;
    inspect(): string;
    calcWidth(shortest: number): number;
    calcAccidentalWidth(): number;
    calcDotWidth(): number;
    private _implyCountFromPerformanceData;
    private _getStemHeight;
    private _pickDirection;
    private _checkMulitpleRest;
    private _implyNoteheads;
    private _hasStem;
    static Layout: typeof Layout;
}
export default ChordModelImpl;
