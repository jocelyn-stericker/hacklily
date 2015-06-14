/**
 * Utilities for interacting with SMuFL-format musical fonts.
 * 
 * SMuFL is a specification that provides a standard way of mapping
 * the thousands of musical symbols required by conventional music
 * notation into the Private Use Area in Unicode’s Basic Multilingual
 * Plane for a single (format-independent) font.
 * 
 * See http://smufl.org for more details.
 */

"use strict";

import _ = require("lodash");
import invariant = require("react/lib/invariant");

export import bravura = require("./smufl/bravura");
import glyphNames = require("./smufl/glyphnames");

export var bboxes: {[key:string]: any[];} = <any> _.indexBy(bravura.glyphBBoxes, 4);

export function getGlyphCode(name: string) {
    if (!(name in glyphNames)) {
        console.warn(name, " is not a valid glyph");
    }
    return String.fromCharCode(parseInt(
        glyphNames[name].substring(2), 16));
}

const getAnchor = _.memoize((notehead: string) => (<any>bravura.glyphsWithAnchors)[notehead]);

/**
 * Calculates where a notation should begin.
 */
export function getFontOffset(notehead: string, direction: number) {
    "use strict";
    var anchors = getAnchor(notehead);

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

export var distances = {
    beam: 0.88,
    hyphen: 12
};

export function getWidth(glyph: string) {
     return bboxes[glyph][0]*10 - bboxes[glyph][2]*10;
}
