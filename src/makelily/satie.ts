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

export const VERSION = process.env.SATIE_VERSION || "";

import SongImpl from "./engine_songImpl";
import {ISongClass} from "./document_song";

/* The web application API */
export {default as Application} from "./engine_application";

/* Root-scope interfaces: Songs, documents, models */
export {default as IHandler} from "./engine_application";

export {IDocument} from "./document_document";
export {IModel} from "./document_model";
export {default as Type} from "./document_types";
export {IMeasure} from "./document_measure";
export {ISong, ISongClass, IMouseEvent} from "./document_song";
export const Song: ISongClass = SongImpl;

/* Experimental addons */
import {getGlyphCode as eGetGlyphCode} from "./private_smufl";
import {pageSizes as ePageSizes} from "./private_renderUtil";

import EClef from "./implAttributes_clefView";
import EKeySignature from "./implAttributes_keySignatureView";
import ETimeSignature from "./implAttributes_timeSignatureView";

/* Patches */
import eCreatePatch from "./patch_createPatch";

export module Addons {
    export const getGlyphCode = eGetGlyphCode;
    export const pageSizes = ePageSizes;

    export const Clef = EClef;
    export const KeySignature = EKeySignature;
    export const TimeSignature = ETimeSignature;
}

export module Patch {
    export const createPatch = eCreatePatch;
}
