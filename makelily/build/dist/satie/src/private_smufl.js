"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var private_smufl_bravura_1 = require("./private_smufl_bravura");
var private_smufl_glyphnames_1 = require("./private_smufl_glyphnames");
var private_smufl_bravura_2 = require("./private_smufl_bravura");
exports.bravura = private_smufl_bravura_2.default;
exports.bboxes = lodash_1.keyBy(private_smufl_bravura_1.default.glyphBBoxes, 4);
exports.bboxes["noteheadNull"] = exports.bboxes["noteheadBlack"];
var _getGlyphCode = lodash_1.memoize(function getGlyphCode(name) {
    if (!(name in private_smufl_glyphnames_1.default)) {
        console.warn(name, " is not a valid glyph");
    }
    return private_smufl_glyphnames_1.default[name];
});
function getGlyphCode(name) {
    return _getGlyphCode(name);
}
exports.getGlyphCode = getGlyphCode;
var getAnchor = lodash_1.memoize(function (notehead) { return private_smufl_bravura_1.default.glyphsWithAnchors[notehead]; });
/**
 * Calculates where a notation should begin.
 */
function getFontOffset(notehead, direction) {
    var anchors = getAnchor(notehead);
    switch (true) {
        case !anchors:
            return [0, 0];
        case direction === 1:
            return anchors.stemUpSE || anchors.stemUpNW;
        case direction === -1:
            return anchors.stemDownNW || anchors.stemDownSW;
        default:
            throw new Error("Invalid direction");
    }
}
exports.getFontOffset = getFontOffset;
exports.distances = {
    beam: 0.88,
    hyphen: 12
};
function getWidth(glyph) {
    return exports.bboxes[glyph][0] * 10 - exports.bboxes[glyph][2] * 10;
}
exports.getWidth = getWidth;
function getRight(glyph) {
    return exports.bboxes[glyph][0] * 10;
}
exports.getRight = getRight;
function getLeft(glyph) {
    return exports.bboxes[glyph][2] * 10;
}
exports.getLeft = getLeft;
function getTop(glyph) {
    return exports.bboxes[glyph][1] * 10;
}
exports.getTop = getTop;
function getBottom(glyph) {
    return exports.bboxes[glyph][3] * 10;
}
exports.getBottom = getBottom;
//# sourceMappingURL=private_smufl.js.map