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
import { flatten, map, values, filter } from "lodash";
import invariant from "invariant";
export function getMeasureSegments(measure) {
    var voiceSegments = (flatten(map(values(measure.parts), function (part) { return part.voices; })));
    var staffSegments = (flatten(map(values(measure.parts), function (part) { return part.staves; })));
    return filter(voiceSegments.concat(staffSegments), function (s) { return !!s; });
}
export function reduceToShortestInSegments(shortest, segment) {
    return segment.reduce(reduceToShortestInSegment, shortest);
}
export function reduceToShortestInSegment(shortest, model) {
    if (!(model.divCount >= 0)) {
        invariant(model.divCount >= 0, "Counts must exceed 0 in", model);
    }
    var divCount = model && model.divCount ? model.divCount : Number.MAX_VALUE;
    return Math.min(shortest, divCount);
}
//# sourceMappingURL=document_measure.js.map