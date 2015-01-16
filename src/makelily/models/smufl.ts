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

import _                        = require("lodash");

export import bravura           = require("./smufl/bravura");
import glyphNames           	= require("./smufl/glyphnames");

export var bboxes: {[key:string]: any[];} = <any> _.indexBy(bravura.glyphBBoxes, 4);

export function getGlyphCode(name: string) {
    if (!(name in glyphNames)) {
        console.warn(name, " is not a valid glyph");
    }
    return String.fromCharCode(parseInt(
        glyphNames[name].substring(2), 16));
}

export var distances = {
    beam: 0.88,
    hyphen: 12
};
