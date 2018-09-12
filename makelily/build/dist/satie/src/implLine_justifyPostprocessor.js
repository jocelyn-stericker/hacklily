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
var private_chordUtil_1 = require("./private_chordUtil");
var private_part_1 = require("./private_part");
var UNDERFILLED_EXPANSION_WEIGHT = 0.1;
/**
 * Evaluates S(t), the logistic function. Used to create aesthetic transitions.
 * For example, the upper half of the logistic function is used to compute how much
 * spacing should be on the final line of a song.
 */
function logistic(t) {
    return 1 / (1 + Math.exp(-t));
}
/**
 * Lays out measures within a bar & justifies.
 *
 * @returns new end of line
 */
function justify(options, bounds, measures) {
    if (options.singleLineMode && !options.fixedMeasureWidth) {
        // Skip: note that in this case, we set the shortestCount in each measure to half what it
        // needs to be to fake justification in each measure.
        return measures;
    }
    var x = bounds.left + lodash_1.reduce(measures, function (sum, measure) { return sum + measure.width; }, 0);
    // Check for underfilled bars
    var underfilled = lodash_1.map(measures, function (measure, idx) {
        var attr = measures[idx].attributes;
        var firstPart = private_part_1.scoreParts(options.header.partList)[0].id;
        var divs = private_chordUtil_1.barDivisions(attr[firstPart][1]);
        var maxDivs = measure.maxDivisions;
        return maxDivs < divs;
    });
    var smallest = Number.POSITIVE_INFINITY;
    lodash_1.forEach(measures, function (measure, measureIdx) {
        var maxIdx = lodash_1.max(lodash_1.map(measure.elements, function (el) { return el.length; }));
        lodash_1.times(maxIdx, function (j) {
            for (var i = 0; i < measure.elements.length; ++i) {
                if (measure.elements[i][j].expandPolicy !== "none") {
                    if (measure.elements[i][j].model && measure.elements[i][j].model.divCount) {
                        smallest = Math.min(measure.elements[i][j].model.divCount, smallest);
                    }
                }
            }
        });
    });
    // x > enX is possible if a single bar's minimum size exceeds maxX, or if our
    // guess for a measure width was too liberal. In either case, we're shortening
    // the measure width here, and our partial algorithm doesn't work with negative
    // padding.
    var partial = x < bounds.right && options.lineIndex + 1 === options.lineCount;
    var underfilledCount = 0;
    var expandableCount = lodash_1.reduce(measures, function (memo, measure$, idx) {
        // Precondition: all layouts at a given index have the same "expandable" value.
        return lodash_1.reduce(lodash_1.last(measure$.elements), function (memo, element$) {
            if (underfilled[idx] && element$.expandPolicy !== "none") {
                ++underfilledCount;
            }
            if (!element$.model || !element$.model.divCount) {
                return memo;
            }
            var expandBy = 0;
            if (element$.expandPolicy !== "none") {
                expandBy = (Math.log(element$.model.divCount) - Math.log(smallest) + 1);
            }
            return memo + expandBy * (underfilled[idx] ? UNDERFILLED_EXPANSION_WEIGHT : 1.0);
        }, memo);
    }, 0);
    var avgExpansion;
    if (!expandableCount) { // case 1: nothing to expand
        avgExpansion = 0;
    }
    else if (partial) { // case 2: expanding, but not full width
        var expansionRemainingGuess = bounds.right - 3 - x;
        var avgExpansionGuess = expansionRemainingGuess /
            (expandableCount + (1 - UNDERFILLED_EXPANSION_WEIGHT) * underfilledCount);
        var weight = logistic((avgExpansionGuess - bounds.right / 80) / 20) * 2 / 3;
        avgExpansion = (1 - weight) * avgExpansionGuess;
    }
    else { // case 3: expanding or contracting to full width
        var exp = bounds.right - x;
        avgExpansion = exp / expandableCount;
    }
    var lineExpansion = 0;
    lodash_1.forEach(measures, function (measure, measureIdx) {
        measure.originX += lineExpansion;
        var measureExpansion = 0;
        var maxIdx = lodash_1.max(lodash_1.map(measure.elements, function (el) { return el.length; }));
        if (options.fixedMeasureWidth) {
            var expandable_1 = lodash_1.times(maxIdx, function (j) {
                var expand = false;
                for (var i = 0; i < measure.elements.length; ++i) {
                    if (measure.elements[i][j].expandPolicy !== "none") {
                        expand = true;
                    }
                }
                return expand;
            });
            var count = expandable_1.filter(function (n) { return n; }).length;
            var expansionPerElement_1 = (options.fixedMeasureWidth - measure.width) / count;
            lodash_1.times(maxIdx, function (j) {
                for (var i = 0; i < measure.elements.length; ++i) {
                    measure.elements[i][j].x += measureExpansion;
                }
                if (expandable_1[j]) {
                    measureExpansion += expansionPerElement_1;
                }
            });
        }
        else {
            lodash_1.times(maxIdx, function (j) {
                for (var i = 0; i < measure.elements.length; ++i) {
                    measure.elements[i][j].x += measureExpansion;
                }
                var expandOne = false;
                var minRatio = private_util_1.MAX_SAFE_INTEGER;
                for (var i = 0; i < measure.elements.length; ++i) {
                    if (measure.elements[i][j].expandPolicy !== "none") {
                        if (!measure.elements[i][j].model || !measure.elements[i][j].model.divCount) {
                            continue;
                        }
                        var divCount = measure.elements[i][j].model.divCount;
                        var ratio = (Math.log(divCount) - Math.log(smallest) + 1) *
                            (underfilled[measureIdx] ? UNDERFILLED_EXPANSION_WEIGHT : 1.0);
                        minRatio = Math.min(minRatio, ratio);
                        expandOne = true;
                    }
                }
                if (expandOne) {
                    // FIXME: We can overshoot, like on Lily 23f.
                    measureExpansion += avgExpansion * minRatio;
                }
            });
        }
        measure.width += measureExpansion;
        lineExpansion += measureExpansion;
    });
    return measures;
}
exports.default = justify;
//# sourceMappingURL=implLine_justifyPostprocessor.js.map