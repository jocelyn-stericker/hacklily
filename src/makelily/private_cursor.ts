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

import createPatch, {VoiceBuilder, StaffBuilder} from "./patch_createPatch";

import {IDocument} from "./document_document";
import {ISegment} from "./document_measure";
import Type from "./document_types";

import {IFactory} from "./private_factory";
import {ILineContext} from "./private_lineContext";
import {ILinesLayoutState} from "./private_linesLayoutState";
import {IMeasureContext} from "./private_measureContext";
import {IStaffContext, detachStaffContext} from "./private_staffContext";
import {cloneObject} from "./private_util";

export interface ICursor {
    document: IDocument;

    segment: ISegment;
    idx$: number;

    staff: IStaffContext;
    measure: IMeasureContext;
    line: ILineContext;

    division$: number;
    x$: number;
    print$: Print;
    header: ScoreHeader;
    minXBySmallest$?: {[key: number]: number};
    /**
     * By staff
     */
    maxPaddingTop$: number[];
    /**
     * By staff
     */
    maxPaddingBottom$: number[];

    /**
     * Only available in second layout$
     */
    page$: number;

    approximate: boolean;
    detached: boolean;
    factory: IFactory;

    hiddenCounter$?: number;
    fixup: (operations: IAny[]) => void;
    patch: (builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder | StaffBuilder)) => void;
    advance: (divs: number) => void;
}

/**
 * Holds information about the context in which an element is processed.
 * Also contains functions to modify the document when processing an element.
 */
export default class Cursor implements ICursor {
    document: IDocument;

    segment: ISegment;
    idx$: number;

    staff: IStaffContext;
    measure: IMeasureContext;
    line: ILineContext;

    division$: number;
    x$: number;
    print$: Print;
    header: ScoreHeader;
    minXBySmallest$: {[key: number]: number};
    /**
     * By staff
     */
    maxPaddingTop$: number[];
    /**
     * By staff
     */
    maxPaddingBottom$: number[];

    /**
     * Only available in second layout$
     */
    page$: number;

    approximate: boolean;
    detached: boolean;
    factory: IFactory;

    hiddenCounter$: number;
    preview: boolean;
    fixup: (operations: IAny[]) => void;

    constructor(spec: {
                document: IDocument;
                _approximate: boolean;
                _detached: boolean;
                factory: IFactory;
                fixup?: (operations: IAny[]) => void;
                header: ScoreHeader,
                line: ILineContext;
                measure: IMeasureContext;
                memo$: ILinesLayoutState;
                page: number;
                print: Print;
                segment: ISegment;
                staff: IStaffContext;
                preview?: boolean;
                x: number;
            }) {
        this.document = spec.document;
        this.approximate = spec._approximate;
        this.detached = spec._detached;
        this.division$ = 0;
        this.factory = spec.factory;
        this.header = spec.header;
        this.idx$ = 0;
        this.line = spec.line;
        this.maxPaddingBottom$ = [];
        this.maxPaddingTop$ = [];
        this.measure = spec.measure;
        this.print$ = spec.print;
        this.segment = spec.segment;
        this.staff = detachStaffContext(spec.staff);
        this.preview = !!spec.preview;
        this.x$ = spec.x;
        this.page$ = spec.page;
        this.fixup = spec.fixup;
    }

    patch(builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder & StaffBuilder)) {
        // Create the patch based on whether the current context is a staff context or a voice context.
        let patch = createPatch(this.preview, this.document, this.measure.uuid,
             this.segment.part, part => {
                 if (this.segment.ownerType === "staff") {
                     return part.staff(this.segment.owner, builder, this.idx$);
                 } else if (this.segment.ownerType === "voice") {
                     return part.voice(this.segment.owner, builder, this.idx$);
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
        invariant(this.segment.ownerType === "staff", "Only valid in staff context");
        this.division$ += divs;
        this.fixup([{
            p: [
                String(this.measure.uuid),
                "parts",
                this.segment.part,
                "staves",
                this.segment.owner,
                this.idx$
            ],
            li: {
                _class: Type[Type.Spacer],
                divCount: divs
            }
        }]);
    }
}
