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
import { Time, Beam, TimeModification, Direction } from "musicxml-interfaces";
import { IAny } from "musicxml-interfaces/operations";
import { INoteBuilder, IBarlineBuilder, IAttributesBuilder, IDirectionBuilder, IPrintBuilder } from "musicxml-interfaces/builders";
import { Document, IMeasure, IMeasurePart, ISegment, Type, IModel } from "./document";
export declare class StaffBuilder {
    private _segment;
    private _patches;
    private _document;
    private _idx;
    get patches(): IAny[];
    constructor(segment: ISegment, document: Document, idx?: number);
    at(idx: number): this;
    next(): this;
    atDiv(div: number, type: Type): this;
    setDivCount(divCount: number): this;
    barline(builder: (build: IBarlineBuilder) => IBarlineBuilder): this;
    insertBarline(builder: (build: IBarlineBuilder) => IBarlineBuilder): this;
    attributes(builder: (builder: IAttributesBuilder) => IAttributesBuilder): this;
    insertAttributes(builder: (build: IAttributesBuilder) => IAttributesBuilder): this;
    direction(builder: (builder: IDirectionBuilder) => IDirectionBuilder): this;
    insertDirection(builder: Direction | ((build: IDirectionBuilder) => IDirectionBuilder)): this;
    print(builder: (builder: IPrintBuilder) => IPrintBuilder): this;
    insertPrint(builder: (build: IPrintBuilder) => IPrintBuilder): this;
    insertSpacer(divs: number): this;
    remove(): this;
}
export declare class VoiceBuilder {
    private _segment;
    private _patches;
    private _document;
    private _idx;
    get patches(): IAny[];
    constructor(segment: ISegment, document: Document, idx?: number);
    at(idx: number): this;
    next(): this;
    addVisualCursor(): this;
    note(noteIDX: number, builder: (build: INoteBuilder) => INoteBuilder): this;
    insertChord(builders: ((build: INoteBuilder) => INoteBuilder)[]): this;
    insertNote(position: number, builder: (builder: INoteBuilder) => INoteBuilder): this;
    remove(): this;
}
export declare class PartBuilder {
    private _part;
    private _patches;
    private _document;
    get patches(): IAny[];
    constructor(part: IMeasurePart, document: Document);
    voice(voiceID: number, builder: (build: VoiceBuilder) => VoiceBuilder, idx?: number): this;
    staff(staffID: number, builder: (build: StaffBuilder) => StaffBuilder, idx?: number): this;
}
export declare class MeasureBuilder {
    private _measure;
    private _patches;
    private _document;
    get patches(): IAny[];
    constructor(measure: IMeasure, document: Document);
    part(partID: string, builder: (build: PartBuilder) => PartBuilder): this;
}
export declare class DocumentBuilder {
    private _doc;
    private _patches;
    get patches(): IAny[];
    constructor(doc: Document);
    measure(measureUUID: number, builder: (build: MeasureBuilder) => MeasureBuilder): this;
    insertMeasure(measureIndex: number, builder: (build: MeasureBuilder) => MeasureBuilder, uuid?: number): this;
    removeMeasure(measureIndex: number): this;
}
export declare class ModelMetreMutationSpec {
    idx: number;
    oldIdx: number;
    start: number;
    previousDivisions: number;
    newDivisions: number;
    newCount: number;
    newDots: number;
    newTimeModification: TimeModification;
    time: Time;
    rest: boolean;
    forced: boolean;
    beam: Beam[];
    touched: boolean;
    private _originalModel;
    constructor(spec: {
        idx: number;
        oldIdx: number;
        start: number;
        previousDivisions: number;
        newDivisions: number;
        newCount: number;
        newDots: number;
        newTimeModification: TimeModification;
        time: Time;
        rest: boolean;
        forced: boolean;
        beam: Beam[];
        touched: boolean;
    }, originalModel?: IModel);
    toSpec(): IModel;
}
export default function createPatch(isPreview: boolean, document: Document, measure: number, part: string, builder: (partBuilder: PartBuilder) => PartBuilder): IAny[];
export default function createPatch(isPreview: boolean, document: Document, builder: (build: DocumentBuilder) => DocumentBuilder): IAny[];
export default function createPatch(isPreview: boolean, document: Document, operations: IAny[]): IAny[];
