/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
import { keyBy, memoize } from "lodash";
import bravura from "./private_smufl_bravura";
import glyphNames from "./private_smufl_glyphnames";
export { default as bravura } from "./private_smufl_bravura";
export var bboxes = keyBy(bravura.glyphBBoxes, 4);
bboxes["noteheadNull"] = bboxes["noteheadBlack"];
var _getGlyphCode = memoize(function getGlyphCode(name) {
    if (!(name in glyphNames)) {
        console.warn(name, " is not a valid glyph");
    }
    return glyphNames[name];
});
export function getGlyphCode(name) {
    return _getGlyphCode(name);
}
var getAnchor = memoize(function (notehead) { return bravura.glyphsWithAnchors[notehead]; });
/**
 * Calculates where a notation should begin.
 */
export function getFontOffset(notehead, direction) {
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
export var distances = {
    beam: 0.88,
    hyphen: 12,
};
export function getWidth(glyph) {
    return bboxes[glyph][0] * 10 - bboxes[glyph][2] * 10;
}
export function getRight(glyph) {
    return bboxes[glyph][0] * 10;
}
export function getLeft(glyph) {
    return bboxes[glyph][2] * 10;
}
export function getTop(glyph) {
    return bboxes[glyph][1] * 10;
}
export function getBottom(glyph) {
    return bboxes[glyph][3] * 10;
}
//# sourceMappingURL=private_smufl.js.map