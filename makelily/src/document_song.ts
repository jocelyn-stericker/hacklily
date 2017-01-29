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

import * as React from "react";
import {ScoreHeader, Pitch} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";

import {Document} from "./document";
import {PartBuilder, DocumentBuilder} from "./engine_createPatch";

export type PrivatePatches = {isPatches: boolean};

export interface IMouseEvent {
    /**
     * The JSON0 path to the element under the cursor.
     * If there is no element under the cursor, returns an empty array.
     */
    path: (string|number)[];

    /**
     * The pitch in the staff under the cursor.
     */
    pitch: Pitch;

    /**
     * The position of the mouse cursor in the rendered svg, relative to
     * the top-left.
     */
    pos: {x: number, y: number};

    matchedOriginY: number;

    /**
     * The rendered react component under the element.
     * If there is no element under the cursor, returns null.
     * 
     * Experimental, and will change or be removed without fanfare.
     */
    _private: any;
}

export interface IProps {
    baseSrc: string;
    patches?: PrivatePatches;

    pageClassName?: string;
    singleLineMode?: boolean;
    fixedMeasureWidth?: number;

    onError: (err: Error) => void;
    onLoaded?: () => void;
    onMouseMove?: (event: IMouseEvent) => void;
    onMouseClick?: (event: IMouseEvent) => void;
}

export interface IPatchSpec {
    measure?: number;
    part?: string;
    partBuilder?: (partBuilder: PartBuilder) => PartBuilder;

    // -- or --
    documentBuilder?: (documentBuilder: DocumentBuilder) => DocumentBuilder;

    // -- or --
    raw?: IAny[];

    // -- or --
    isPatches?: boolean;
}

export function specIsRaw(spec: IPatchSpec): spec is {raw: IAny[]} {
    return spec && "raw" in spec;
}

export function specIsDocBuilder(spec: IPatchSpec): spec is
        {documentBuilder: (documentBuilder: DocumentBuilder) => DocumentBuilder} {
    return spec && (spec as any).documentBuilder;
}

export function specIsPartBuilder(spec: IPatchSpec): spec is
        {measure: number, part: string, partBuilder: (partBuilder: PartBuilder) => PartBuilder} {
    return spec && (spec as any).partBuilder;
}

export interface ISong extends React.Component<IProps, {}> {
    /**
     * Returns the document represented by the song. The document represents the
     * current state of the song.
     * 
     *  - The returned document is constant (i.e., do not modify the document)
     *  - The returned document is NOT immutable (i.e., the document may change
     *    after patches are applied), or the song is re-rendered.
     *  - The song may load a new document without warning after any operation.
     *    As such, do not cache the document.
     *  - The document's API is not finalized. If you depend on this function call,
     *    expect breakages.
     */
    getDocument: (patches: {isPatches: boolean}) => Document;
    createCanonicalPatch: (...patchSpecs: IPatchSpec[]) => PrivatePatches;
    createPreviewPatch: (...patchSpecs: IPatchSpec[]) => PrivatePatches;

    toSVG: () => string;
    toMusicXML: () => string;

    header: ScoreHeader;
}

export type ISongClass = React.ComponentClass<IProps> & {
    new(p: IProps): ISong;
};
