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
function getMeasureSegments(measure) {
    var voiceSegments = lodash_1.flatten(lodash_1.map(lodash_1.values(measure.parts), function (part) { return part.voices; }));
    var staffSegments = lodash_1.flatten(lodash_1.map(lodash_1.values(measure.parts), function (part) { return part.staves; }));
    return lodash_1.filter(voiceSegments.concat(staffSegments), function (s) { return !!s; });
}
exports.getMeasureSegments = getMeasureSegments;
function reduceToShortestInSegments(shortest, segment) {
    return segment.reduce(reduceToShortestInSegment, shortest);
}
exports.reduceToShortestInSegments = reduceToShortestInSegments;
function reduceToShortestInSegment(shortest, model) {
    if (!(model.divCount >= 0)) {
        invariant(model.divCount >= 0, "Counts must exceed 0 in", model);
    }
    var divCount = model && model.divCount ? model.divCount : Number.MAX_VALUE;
    return Math.min(shortest, divCount);
}
exports.reduceToShortestInSegment = reduceToShortestInSegment;
//# sourceMappingURL=document_measure.js.map