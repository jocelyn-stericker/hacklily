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

import {Component} from "react";
import {ScoreHeader, Pitch} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";

import IDocument from "../document/document";
import {PartBuilder, DocumentBuilder} from "../patch/createPatch";

export type PrivatePatches = {isPatches: boolean};

export interface IProps {
    baseSrc: string;
    patches?: PrivatePatches;

    pageClassName?: string;
    singleLineMode?: boolean;

    onError: (err: Error) => void;
    onLoaded?: () => void;
    onMouseMove?: (path: (string|number)[], pitch: Pitch) => void;
    onMouseClick?: (path: (string|number)[], pitch: Pitch) => void;
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

interface ISong extends Component<IProps, {}> {
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
    getDocument: (patches: {isPatches: boolean}) => IDocument;
    createCanonicalPatch: (...patchSpecs: IPatchSpec[]) => PrivatePatches;
    createPreviewPatch: (...patchSpecs: IPatchSpec[]) => PrivatePatches;

    toSVG: () => string;
    toMusicXML: () => string;

    header: ScoreHeader;
}

export default ISong;
