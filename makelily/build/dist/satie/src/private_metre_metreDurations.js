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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
var private_chordUtil_1 = require("./private_chordUtil");
/**
 * Creates a simple realization of an IChord
 *
 * @param spec
 */
function _makeDuration(spec) {
    invariant_1.default(!spec.timeModification, "timeModification is not implemented in makeDuration");
    return [
        {
            dots: lodash_1.times(spec.dots || 0, function () {
                return {};
            }),
            noteType: {
                duration: spec.count,
            },
            _class: "Note",
        },
    ];
}
function makeDuration(divPerQuarter, time, divisionsInDuration) {
    for (var count = 1; count <= 512; ++count) {
        for (var dots = 0; dots < 3; ++dots) {
            var spec = { count: count, dots: dots };
            if (private_chordUtil_1.divisions(spec, { time: time, divisions: divPerQuarter }, true) ===
                divisionsInDuration) {
                return _makeDuration(spec);
            }
        }
    }
    throw new Error("Unknown duration " + divisionsInDuration + " at " +
        (divPerQuarter + " divs per quarter"));
}
exports.makeDuration = makeDuration;
exports._512 = _makeDuration({ count: 512 });
exports._256 = _makeDuration({ count: 256 });
exports._256D = _makeDuration({ count: 256, dots: 1 });
exports._128 = _makeDuration({ count: 128 });
exports._128D = _makeDuration({ count: 128, dots: 1 });
exports._64 = _makeDuration({ count: 64 });
exports._64D = _makeDuration({ count: 64, dots: 1 });
exports._32 = _makeDuration({ count: 32 });
exports._32D = _makeDuration({ count: 32, dots: 1 });
exports._16 = _makeDuration({ count: 16 });
exports._16D = _makeDuration({ count: 16, dots: 1 });
exports._16DD = _makeDuration({ count: 16, dots: 2 });
exports._8 = _makeDuration({ count: 8 });
exports._8D = _makeDuration({ count: 8, dots: 1 });
exports._8DD = _makeDuration({ count: 8, dots: 2 });
exports._4 = _makeDuration({ count: 4 });
exports._4D = _makeDuration({ count: 4, dots: 1 });
exports._4DD = _makeDuration({ count: 4, dots: 2 });
exports._2 = _makeDuration({ count: 2 });
exports._2D = _makeDuration({ count: 2, dots: 1 });
exports._2DD = _makeDuration({ count: 2, dots: 2 });
exports._1 = _makeDuration({ count: 1 });
exports._1D = _makeDuration({ count: 1, dots: 1 });
exports._1DD = _makeDuration({ count: 1, dots: 2 });
exports._05 = _makeDuration({ count: 1 / 2 });
//# sourceMappingURL=private_metre_metreDurations.js.map