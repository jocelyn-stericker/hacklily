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
var invariant = require("invariant");
var document_1 = require("./document");
/**
 * Centers elements marked as such
 *
 * @returns new end of line
 */
function center(options, bounds, measures) {
    lodash_1.forEach(measures, function (measure, measureIdx) {
        var maxIdx = lodash_1.max(lodash_1.map(measure.elements, function (el) { return el.length; }));
        lodash_1.times(maxIdx, function (j) {
            for (var i = 0; i < measure.elements.length; ++i) {
                if (measure.elements[i][j].expandPolicy === "centered") {
                    var intrinsicWidth = measure.elements[i][j].renderedWidth;
                    invariant(isFinite(intrinsicWidth), "Intrinsic width must be set on centered items");
                    var measureSpaceRemaining = void 0;
                    var attribIdx = lodash_1.findIndex(measure.elements[0], function (el) { return el.renderClass === document_1.Type.Attributes && el.renderedWidth > 0; });
                    var base = 0;
                    if (attribIdx !== -1 && attribIdx < j) {
                        base = measure.elements[0][attribIdx].overrideX +
                            measure.elements[0][attribIdx].renderedWidth;
                        measureSpaceRemaining = lodash_1.last(measure.elements[i]).overrideX - base;
                    }
                    else if (measures[measureIdx - 1]) {
                        measureSpaceRemaining = lodash_1.last(measure.elements[i]).overrideX -
                            (measures[measureIdx - 1].width -
                                lodash_1.last(measures[measureIdx - 1].elements[0]).overrideX);
                    }
                    else {
                        measureSpaceRemaining = lodash_1.last(measure.elements[i]).overrideX;
                    }
                    if (measures[measureIdx + 1] && measures[measureIdx + 1].width === 0) {
                        measureSpaceRemaining += 16.6;
                    }
                    measure.elements[i][j].x =
                        base + measureSpaceRemaining / 2 -
                            intrinsicWidth / 2;
                }
            }
        });
    });
    return measures;
}
exports.default = center;
//# sourceMappingURL=implLine_centerPostprocessor.js.map