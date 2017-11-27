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
var private_util_1 = require("./private_util");
var document_1 = require("./document");
/**
 * Given a set of segments, scales divisions so that they are compatible.
 *
 * Returns the division count.
 */
function normalizeDivisionsInPlace(factory, segments, factor) {
    if (factor === void 0) { factor = 0; }
    var divisions = factor || lodash_1.reduce(segments, function (div1, seg) {
        if (!div1) {
            return 1;
        }
        return private_util_1.lcm(div1, seg.divisions);
    }, 0);
    lodash_1.forEach(segments, function (segment) {
        if (!segment) {
            return;
        }
        var ratio = divisions / segment.divisions;
        segment.divisions = divisions;
        lodash_1.forEach(segment, function (model) {
            if (model.divCount) {
                model.divCount *= ratio;
            }
            if (factory.modelHasType(model, document_1.Type.Chord)) {
                lodash_1.forEach(model, function (note) {
                    if (note.duration) {
                        note.duration *= ratio;
                    }
                });
            }
            if (factory.modelHasType(model, document_1.Type.Attributes)) {
                // This could be an attributes item or a note.
                if (model.divisions) {
                    ratio = divisions / model.divisions;
                }
                try {
                    model.divisions = divisions;
                }
                catch (err) {
                    console.warn("Could not set divisions");
                }
            }
        });
    });
    return divisions;
}
exports.normalizeDivisionsInPlace = normalizeDivisionsInPlace;
//# sourceMappingURL=engine_divisions.js.map