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

import {Print, ScoreHeader} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import * as invariant from "invariant";

import createPatch, {VoiceBuilder, StaffBuilder} from "./engine_createPatch";

import {Document, ISegment, IMeasure, Type} from "./document";

import {IFactory} from "./private_factory";
import {cloneObject} from "./private_util";
import {IAttributesSnapshot} from "./private_attributesSnapshot";

export interface IReadOnlyValidationCursor {
    readonly segmentInstance: ISegment;
    readonly segmentPosition: number;
    readonly segmentDivision: number;

    readonly staffAttributes: IAttributesSnapshot;
    readonly staffAccidentals: {readonly [key: string]: number};
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
export class ValidationCursor {
    document: Document;

    segmentInstance: ISegment;
    segmentPosition: number;
    segmentDivision: number;

    staffAttributes: IAttributesSnapshot;
    staffAccidentals: {[key: string]: number};
    staffIdx: number;

    measureInstance: IMeasure;
    measureIsLast: boolean;

    print: Print;
    header: ScoreHeader;
    singleLineMode: boolean;

    factory: IFactory;
    fixup: (operations: IAny[]) => void;

    preview: boolean;

    const(): IReadOnlyValidationCursor {
        return this;
    }

    constructor(spec: {
                document: Document;
                factory: IFactory;
                fixup: (operations: IAny[]) => void;
                header: ScoreHeader,
                page: number;
                print: Print;
                segment: ISegment;
                staffAttributes: IAttributesSnapshot;
                staffAccidentals: {[key: string]: number};
                staffIdx: number
                preview?: boolean;
                measureInstance: IMeasure;
                measureIsLast: boolean;
                singleLineMode: boolean;
            }) {
        this.document = spec.document;
        this.segmentDivision = 0;
        this.factory = spec.factory;
        this.header = spec.header;
        this.segmentPosition = 0;
        this.print = spec.print;
        this.segmentInstance = spec.segment;
        this.staffAttributes = spec.staffAttributes;
        this.staffAccidentals = spec.staffAccidentals;

        this.measureInstance = spec.measureInstance;
        this.measureIsLast = spec.measureIsLast;

        this.staffIdx = spec.staffIdx;
        this.preview = !!spec.preview;
        this.fixup = spec.fixup;
        this.singleLineMode = spec.singleLineMode;
    }

    dangerouslyPatchWithoutValidation(builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder | StaffBuilder)) {
        // Create the patch based on whether the current context is a staff context or a voice context.
        let patch = createPatch(true, this.document, this.measureInstance.uuid,
             this.segmentInstance.part, part => {
                 if (this.segmentInstance.ownerType === "staff") {
                     return part.staff(this.segmentInstance.owner, builder as any, this.segmentPosition);
                 } else if (this.segmentInstance.ownerType === "voice") {
                     return part.voice(this.segmentInstance.owner, builder as any, this.segmentPosition);
                 } else {
                     throw new Error("Not reached");
                 }
             }
        );
        // All patches must be serializable, so we can:
        //   - Send them over a network
        //   - Invert them
        this.fixup(cloneObject(patch));
    }

    patch(builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder | StaffBuilder), dangerous?: boolean) {
        // Create the patch based on whether the current context is a staff context or a voice context.
        let patch = createPatch(this.preview, this.document, this.measureInstance.uuid,
             this.segmentInstance.part, part => {
                 if (this.segmentInstance.ownerType === "staff") {
                     return part.staff(this.segmentInstance.owner, builder as any, this.segmentPosition);
                 } else if (this.segmentInstance.ownerType === "voice") {
                     return part.voice(this.segmentInstance.owner, builder as any, this.segmentPosition);
                 } else {
                     throw new Error("Not reached");
                 }
             }
        );
        // All patches must be serializable, so we can:
        //   - Send them over a network
        //   - Invert them
        this.fixup(cloneObject(patch));
    }

    advance(divs: number) {
        invariant(this.segmentInstance.ownerType === "staff", "Only valid in staff context");
        this.segmentDivision += divs;
        this.fixup([{
            p: [
                String(this.measureInstance.uuid),
                "parts",
                this.segmentInstance.part,
                "staves",
                this.segmentInstance.owner,
                this.segmentPosition
            ],
            li: {
                _class: Type[Type.Spacer],
                divCount: divs
            }
        }]);
    }
}

export class LayoutCursor {
    private _validationCursor?: ValidationCursor;
    // ...extends readonly ValidationCursor {
    get document() {
        return this._validationCursor.document;
    }

    get segmentInstance() {
        return this._validationCursor.segmentInstance;
    }
    get segmentPosition() {
        return this._validationCursor.segmentPosition;
    }
    get segmentDivision() {
        return this._validationCursor.segmentDivision;
    }

    get staffAttributes(): IAttributesSnapshot {
        return this._validationCursor.staffAttributes;
    }
    get staffAccidentals(): {[key: string]: number} {
        return this._validationCursor.staffAccidentals;
    }
    get staffIdx(): number {
        return this._validationCursor.staffIdx;
    }

    get measureInstance(): IMeasure {
        return this._validationCursor.measureInstance;
    }

    get print(): Print {
        return this._validationCursor.print;
    }
    get header(): ScoreHeader {
        return this._validationCursor.header;
    }

    get factory(): IFactory {
        return this._validationCursor.factory;
    }

    get preview(): boolean {
        return this._validationCursor.preview;
    }
    // }

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
            }) {

        this._validationCursor = spec.validationCursor;

        this.segmentX = spec.x;
        this.measureX = spec.measureX;
        this.lineShortest = spec.lineShortest;
        this.lineBarOnLine = spec.lineBarOnLine;
        this.lineTotalBarsOnLine = spec.lineTotalBarsOnLine;
        this.lineIndex = spec.lineIndex;
        this.lineCount = spec.lineCount;
        this.lineMaxPaddingBottomByStaff = [];
        this.lineMaxPaddingTopByStaff = [];
    }
}
