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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
var D = __importStar(require("./private_metre_metreDurations"));
var private_metre_getTSString_1 = __importDefault(require("./private_metre_getTSString"));
// Adapted from Behind Bars (E. Gould) page 155
var BEAMING_PATTERNS = {
    "1/16": [D._16],
    "2/16": [D._16, D._16],
    "1/8": [D._8],
    "3/16": [D._8D],
    "4/16": [D._8, D._8],
    "2/8": [D._8, D._8],
    "1/4": [D._4],
    "5/16": [D._8D, D._8],
    "5/16_alt": [D._8, D._8D],
    "6/16": [D._8D, D._8D],
    "3/8": [D._4D],
    "4/8": [D._4, D._4],
    "2/4": [D._2],
    "2/4_clean": [D._4, D._4],
    "1/2": [D._2],
    "9/16": [D._8D, D._8D, D._8D],
    "5/8": [D._4D, D._4],
    "5/8_alt": [D._4, D._4D],
    "12/16": [D._8D, D._8D, D._8D, D._8D],
    "6/8": [D._4D, D._4D],
    "3/4": [D._2D],
    "7/8": [D._2, D._4D],
    "7/8_alt": [D._4D, D._2],
    "8/8": [D._4D, D._4D, D._4],
    "8/8_alt": [D._4D, D._4, D._4D],
    "8/8_alt2": [D._4, D._4D, D._4D],
    "4/4": [D._2, D._2],
    "4/4_clean": [D._4, D._4, D._4, D._4],
    "2/2": [D._2, D._2],
    "1/1": [D._1],
    "9/8": [D._4D, D._4D, D._4D],
    "10/8": [D._2, D._4D, D._4D],
    "10/8_alt": [D._4D, D._2, D._4D],
    "10/8_alt2": [D._4D, D._4D, D._2],
    "5/4": [D._2D, D._2],
    "5/4_alt": [D._2, D._2D],
    "12/8": [D._4D, D._4D, D._4D, D._4D],
    "6/4": [D._2D, D._2D],
    "3/2": [D._2, D._2, D._2],
    "7/4": [D._1, D._2D],
    "7/4_alt": [D._2D, D._1],
    "15/8": [D._4D, D._4D, D._4D, D._4D, D._4D],
    "8/4": [D._1, D._1],
    "4/2": [D._1, D._1],
    "2/1": [D._1, D._1],
    "18/8": [D._4D, D._4D, D._4D, D._4D, D._4D, D._4D],
    "9/4": [D._2D, D._2D, D._2D],
};
function getBeamingPattern(time, alt) {
    var pattern = BEAMING_PATTERNS[private_metre_getTSString_1.default(time) + (alt ? "_" + alt : "")];
    var factors = {
        4: [4, 3, 2, 1],
        8: [12, 8, 4, 3, 2, 1],
        16: [4, 3, 2, 1],
    };
    if (time.senzaMisura != null) {
        return [];
    }
    if (!pattern) {
        // TODO: Partial & Mixed
        pattern = [];
        // TODO: Varying denominators will err for the remainder of this function
        var beatsToAdd_1 = lodash_1.reduce(time.beats, function (memo, beat) {
            return memo + lodash_1.reduce(beat.split("+"), function (m, b) { return m + parseInt(b, 10); }, 0);
        }, 0);
        var ownFactors = factors[time.beatTypes[0]];
        lodash_1.forEach(ownFactors, function (factor) {
            while (beatsToAdd_1 >= factor) {
                pattern = pattern.concat(BEAMING_PATTERNS[factor + "/" + time.beatTypes[0]]);
                beatsToAdd_1 -= factor;
            }
        });
    }
    invariant_1.default(!!pattern, "Unknown beaming pattern");
    return pattern;
}
exports.getBeamingPattern = getBeamingPattern;
//# sourceMappingURL=private_metre_checkBeaming.js.map