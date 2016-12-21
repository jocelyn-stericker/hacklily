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

export const VERSION = process.env.SATIE_VERSION || "";

/* The web application API */
export {default as Application} from "./engine/application";

/* Root-scope interfaces: Songs, documents, models */
export {default as IHandler} from "./engine/application";
export {default as Song} from "./engine/song";

export {default as IDocument} from "./document/document";
export {default as IModel} from "./document/model";
export {default as Type} from "./document/types";
export {default as IMeasure} from "./document/measure";
export {IMouseEvent} from "./document/song";

/* Experimental addons */
import {getGlyphCode as eGetGlyphCode} from "./private/smufl";
import {pageSizes as ePageSizes} from "./private/renderUtil";

import EClef from "./implAttributes/clefView";
import EKeySignature from "./implAttributes/keySignatureView";
import ETimeSignature from "./implAttributes/timeSignatureView";

/* Patches */
import eCreatePatch from "./patch/createPatch";

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

// Expose MusicXML in build (but not in types).
// This means you can use MusicXML as an external in webpack.
// See satie/webapp/webpack.config.js as an example.
/* tslint:disable */
module.exports.MusicXML = require("musicxml-interfaces");
module.exports.MusicXML_Operations = require("musicxml-interfaces/operations");
module.exports.MusicXML_Builders = require("musicxml-interfaces/builders");
/* tslint: enable */
