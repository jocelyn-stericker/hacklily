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
import { Print, ScoreHeader } from "musicxml-interfaces";
import { IAny } from "musicxml-interfaces/operations";
import { VoiceBuilder, StaffBuilder } from "./engine_createPatch";
import { Document, ISegment, IMeasure } from "./document";
import { IFactory } from "./private_factory";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
export interface IReadOnlyValidationCursor {
    readonly segmentInstance: ISegment;
    readonly segmentPosition: number;
    readonly segmentDivision: number;
    readonly staffAttributes: IAttributesSnapshot;
    readonly staffAccidentals: {
        readonly [key: string]: number;
    };
    readonly staffIdx: number;
    readonly measureInstance: IMeasure;
    readonly measureIsLast: boolean;
    readonly print: Print;
    readonly header: ScoreHeader;
    readonly singleLineMode: boolean;
    readonly factory: IFactory;
    readonly fixup: (operations: IAny[]) => void;
    readonly preview: boolean;
    dangerouslyPatchWithoutValidation(builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder | StaffBuilder)): void;
    patch(builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder | StaffBuilder)): void;
}
/**
 * Holds information about the context in which an element is processed.
 * Also contains functions to modify the document when processing an element.
 */
export declare class ValidationCursor {
    document: Document;
    segmentInstance: ISegment;
    segmentPosition: number;
    segmentDivision: number;
    staffAttributes: IAttributesSnapshot;
    staffAccidentals: {
        [key: string]: number;
    };
    staffIdx: number;
    measureInstance: IMeasure;
    measureIsLast: boolean;
    print: Print;
    header: ScoreHeader;
    singleLineMode: boolean;
    factory: IFactory;
    fixup: (operations: IAny[]) => void;
    preview: boolean;
    const(): IReadOnlyValidationCursor;
    constructor(spec: {
        document: Document;
        factory: IFactory;
        fixup: (operations: IAny[]) => void;
        header: ScoreHeader;
        page: number;
        print: Print;
        segment: ISegment;
        staffAttributes: IAttributesSnapshot;
        staffAccidentals: {
            [key: string]: number;
        };
        staffIdx: number;
        preview?: boolean;
        measureInstance: IMeasure;
        measureIsLast: boolean;
        singleLineMode: boolean;
    });
    dangerouslyPatchWithoutValidation(builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder | StaffBuilder)): void;
    patch(builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder | StaffBuilder), dangerous?: boolean): void;
    advance(divs: number): void;
}
export declare class LayoutCursor {
    private _validationCursor?;
    readonly document: Document;
    readonly segmentInstance: ISegment;
    readonly segmentPosition: number;
    readonly segmentDivision: number;
    readonly staffAttributes: IAttributesSnapshot;
    readonly staffAccidentals: {
        [key: string]: number;
    };
    readonly staffIdx: number;
    readonly measureInstance: IMeasure;
    readonly print: Print;
    readonly header: ScoreHeader;
    readonly factory: IFactory;
    readonly preview: boolean;
    lineMaxPaddingTopByStaff: number[];
    lineMaxPaddingBottomByStaff: number[];
    lineShortest: number;
    lineBarOnLine: number;
    lineTotalBarsOnLine: number;
    lineIndex: number;
    lineCount: number;
    measureX: number;
    segmentX: number;
    constructor(spec: {
        validationCursor: ValidationCursor;
        lineShortest: number;
        lineBarOnLine: number;
        lineTotalBarsOnLine: number;
        lineIndex: number;
        lineCount: number;
        x: number;
        measureX: number;
    });
}
