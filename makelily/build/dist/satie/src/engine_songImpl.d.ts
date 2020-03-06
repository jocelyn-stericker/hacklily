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
import { Component } from "react";
import { ReactElement } from "react";
import { ScoreHeader } from "musicxml-interfaces";
import { Document, ISong, IPatchSpec, IProps, IMouseEvent } from "./document";
import { IFactory } from "./private_factory";
export declare type Handler = (ev: IMouseEvent) => void;
export interface IState {
    document?: Document;
    factory?: IFactory;
}
/**
 * Represents a song as:
 *  - some MusicXML, as a string
 *  - a series of patches applied on top of the MusicXML.
 *
 * The class can be used:
 *  - as a React component, to render to the DOM.
 *  - as a simple class (in this case call song.run() to load or update the document) to
 *    export to MusicXML (toMusicXML()) or SVG (toSVG()).
 *
 * Note: toMusicXML and toSVG can also be used when Song is used as a React component
 * (e.g., <Song ... ref={song => console.log(song.toMusicXML())} />)
 */
export default class SongImpl extends Component<IProps, IState> implements ISong {
    state: IState;
    private _docPatches;
    private _isRunningWithoutDOM;
    private _page1;
    private _pt;
    private _svg;
    render(): ReactElement<any>;
    shouldComponentUpdate(nextProps: IProps): boolean;
    UNSAFE_componentWillReceiveProps(nextProps: IProps): void;
    UNSAFE_componentWillMount(): void;
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
     *  - This API call will eventually be removed and replaced with higher-level
     *    functions.
     */
    getDocument: (operations: {
        isPatches: boolean;
    }) => Document;
    get header(): ScoreHeader;
    set header(_header: ScoreHeader);
    /**
     * Given a set of OT diffs, returns something the "patches" prop can be set to.
     */
    createCanonicalPatch: (...patchSpecs: IPatchSpec[]) => {
        isPatches: boolean;
    };
    /**
     * Given a set of operations, returns a set of operations that the "preview" prop can
     * be set to.
     */
    createPreviewPatch: (...patchSpecs: IPatchSpec[]) => {
        isPatches: boolean;
    };
    toSVG: () => string;
    toMusicXML: () => string;
    run(): void;
    private _createPatch;
    private _rectify$;
    private _rectifyAppendCanonical;
    private _rectifyAppendPreview;
    private _update$;
    private _preRender;
    private _syncSVG;
    private _getPos;
    private _handleCursorPosition;
    private _handleMouseMove;
    private _handleClick;
    private _loadXML;
}
