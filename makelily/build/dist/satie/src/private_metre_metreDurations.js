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
import { times } from "lodash";
import invariant from "invariant";
import { divisions } from "./private_chordUtil";
/**
 * Creates a simple realization of an IChord
 *
 * @param spec
 */
function _makeDuration(spec) {
    invariant(!spec.timeModification, "timeModification is not implemented in makeDuration");
    return [
        {
            dots: times(spec.dots || 0, function () {
                return {};
            }),
            noteType: {
                duration: spec.count,
            },
            _class: "Note",
        },
    ];
}
export function makeDuration(divPerQuarter, time, divisionsInDuration) {
    for (var count = 1; count <= 512; ++count) {
        for (var dots = 0; dots < 3; ++dots) {
            var spec = { count: count, dots: dots };
            if (divisions(spec, { time: time, divisions: divPerQuarter }, true) ===
                divisionsInDuration) {
                return _makeDuration(spec);
            }
        }
    }
    throw new Error("Unknown duration " + divisionsInDuration + " at " +
        (divPerQuarter + " divs per quarter"));
}
export var _512 = _makeDuration({ count: 512 });
export var _256 = _makeDuration({ count: 256 });
export var _256D = _makeDuration({ count: 256, dots: 1 });
export var _128 = _makeDuration({ count: 128 });
export var _128D = _makeDuration({ count: 128, dots: 1 });
export var _64 = _makeDuration({ count: 64 });
export var _64D = _makeDuration({ count: 64, dots: 1 });
export var _32 = _makeDuration({ count: 32 });
export var _32D = _makeDuration({ count: 32, dots: 1 });
export var _16 = _makeDuration({ count: 16 });
export var _16D = _makeDuration({ count: 16, dots: 1 });
export var _16DD = _makeDuration({ count: 16, dots: 2 });
export var _8 = _makeDuration({ count: 8 });
export var _8D = _makeDuration({ count: 8, dots: 1 });
export var _8DD = _makeDuration({ count: 8, dots: 2 });
export var _4 = _makeDuration({ count: 4 });
export var _4D = _makeDuration({ count: 4, dots: 1 });
export var _4DD = _makeDuration({ count: 4, dots: 2 });
export var _2 = _makeDuration({ count: 2 });
export var _2D = _makeDuration({ count: 2, dots: 1 });
export var _2DD = _makeDuration({ count: 2, dots: 2 });
export var _1 = _makeDuration({ count: 1 });
export var _1D = _makeDuration({ count: 1, dots: 1 });
export var _1DD = _makeDuration({ count: 1, dots: 2 });
export var _05 = _makeDuration({ count: 1 / 2 });
//# sourceMappingURL=private_metre_metreDurations.js.map