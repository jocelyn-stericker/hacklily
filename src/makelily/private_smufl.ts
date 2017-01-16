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

import {keyBy, memoize} from "lodash";
import * as invariant from "invariant";

import bravura from "./private_smufl_bravura";
import glyphNames from "./private_smufl_glyphnames";

export {default as bravura} from "./private_smufl_bravura";
export let bboxes: {[key: string]: any[]; } = <any> keyBy(bravura.glyphBBoxes, 4);
bboxes["noteheadNull"] = bboxes["noteheadBlack"];

export let getGlyphCode = memoize(function getGlyphCode(name: string) {
    if (!(name in glyphNames)) {
        console.warn(name, " is not a valid glyph");
    }
    return glyphNames[name];
});

const getAnchor = memoize((notehead: string) => (<any>bravura.glyphsWithAnchors)[notehead]);

/**
 * Calculates where a notation should begin.
 */
export function getFontOffset(notehead: string, direction: number) {
    let anchors = getAnchor(notehead);

    switch (true) {
        case !anchors:
            return [0, 0];
        case direction === 1:
            return anchors.stemUpSE || anchors.stemUpNW;
        case direction === -1:
            return anchors.stemDownNW || anchors.stemDownSW;
        default:
            invariant(false, "Invalid direction");
    }
}

export let distances = {
    beam: 0.88,
    hyphen: 12
};

export function getWidth(glyph: string) {
    return bboxes[glyph][0] * 10 - bboxes[glyph][2] * 10;
}

export function getRight(glyph: string) {
    return bboxes[glyph][0] * 10;
}

export function getLeft(glyph: string) {
    return bboxes[glyph][2] * 10;
}

export function getTop(glyph: string) {
    return bboxes[glyph][1] * 10;
}

export function getBottom(glyph: string) {
    return bboxes[glyph][3] * 10;
}
