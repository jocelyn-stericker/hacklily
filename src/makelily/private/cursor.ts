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

import {Print, ScoreHeader} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";

import createPatch, {VoiceBuilder, StaffBuilder} from "../patch/createPatch";

import IDocument from "../document/document";
import ISegment from "../document/segment";
import OwnerType from "../document/ownerTypes";
import Type from "../document/types";

import IFactory from "./factory";
import ILineContext from "./lineContext";
import ILinesLayoutState from "./linesLayoutState";
import IMeasureContext from "./measureContext";
import IStaffContext, {detachStaffContext} from "./staffContext";
import IVoiceContext from "./voiceContext";
import {cloneObject} from "./util";

export interface ICursor {
    document: IDocument;

    segment: ISegment;
    idx$: number;

    voice: IVoiceContext;
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

    voice: IVoiceContext;
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
                voice: IVoiceContext;
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
        this.voice = spec.voice;
        this.x$ = spec.x;
        this.page$ = spec.page;
        this.fixup = spec.fixup;
    }

    patch(builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder & StaffBuilder)) {
        // Creat the patch based on wheter the current context is a staff context or a voice context.
        let patch = createPatch(false, this.document, this.measure.uuid,
             this.segment.part, part => {
                 if (this.segment.ownerType === OwnerType.Staff) {
                     return part.staff(this.segment.owner, builder, this.idx$);
                 } else if (this.segment.ownerType === OwnerType.Voice) {
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
        invariant(this.segment.ownerType === OwnerType.Staff, "Only valid in staff context");
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
