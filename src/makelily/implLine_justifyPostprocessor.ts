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

import {reduce, map, max, times, last, forEach} from "lodash";

import {IMeasureLayout} from "./private_measureLayout";
import {ILayoutOptions} from "./private_layoutOptions";
import {ILineBounds} from "./private_lineBounds";
import {MAX_SAFE_INTEGER} from "./private_util";
import {barDivisions} from "./private_chordUtil";
import {scoreParts} from "./private_part";

const UNDERFILLED_EXPANSION_WEIGHT = 0.1;

/** 
 * Evaluates S(t), the logistic function. Used to create aesthetic transitions.
 * For example, the upper half of the logistic function is used to compute how much
 * spacing should be on the final line of a song.
 */
function logistic(t: number) {
    return 1 / (1 + Math.exp(-t));
}

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
function justify(options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]): IMeasureLayout[] {

    if (options.singleLineMode) {
        // Skip: note that in this case, we set the shortestCount in each measure to half what it
        // needs to be to fake justification in each measure.
        return measures;
    }

    const x = bounds.left + reduce(measures, (sum, measure) => sum + measure.width, 0);

    // Check for underfilled bars
    const underfilled = map(measures, (measure, idx) => {
        let attr = measures[idx].attributes;
        let firstPart = scoreParts(options.header.partList)[0].id;
        let divs = barDivisions(attr[firstPart][1]);
        let maxDivs = measure.maxDivisions;
        return maxDivs < divs;
    });

    let smallest = Number.POSITIVE_INFINITY;
    forEach(measures, function(measure, measureIdx) {
        let maxIdx = max(map(measure.elements, el => el.length));
        times(maxIdx, function(j) {
            for (let i = 0; i < measure.elements.length; ++i) {
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
    let partial = x < bounds.right && options.lineIndex + 1 === options.lineCount;
    let underfilledCount = 0;

    let expandableCount = reduce(measures, function(memo, measure$, idx) {
        // Precondition: all layouts at a given index have the same "expandable" value.
        return reduce(last(measure$.elements), function(memo, element$) {
            if (underfilled[idx] && element$.expandPolicy !== "none") {
                ++underfilledCount;
            }
            if (!element$.model || !element$.model.divCount) {
                return memo;
            }
            let expandBy = 0;

            if (element$.expandPolicy !== "none") {
                expandBy = (Math.log(element$.model.divCount) - Math.log(smallest) + 1);
            }

            return memo + expandBy * (underfilled[idx] ? UNDERFILLED_EXPANSION_WEIGHT : 1.0);
        }, memo);
    }, 0);

    let avgExpansion: number;
    if (!expandableCount) { // case 1: nothing to expand
        avgExpansion = 0;
    } else if (partial) { // case 2: expanding, but not full width
        let expansionRemainingGuess = bounds.right - 3 - x;
        let avgExpansionGuess = expansionRemainingGuess /
            (expandableCount + (1 - UNDERFILLED_EXPANSION_WEIGHT) * underfilledCount);
        let weight = logistic((avgExpansionGuess - bounds.right / 80) / 20) * 2 / 3;
        avgExpansion = (1 - weight) * avgExpansionGuess;
    } else { // case 3: expanding or contracting to full width
        let exp = bounds.right - x;
        avgExpansion = exp / expandableCount;
    }

    let anyExpandable = false;
    let totalExpCount = 0;
    let lineExpansion = 0;
    forEach(measures, function(measure, measureIdx) {
        measure.originX += lineExpansion;

        let measureExpansion = 0;
        let maxIdx = max(map(measure.elements, el => el.length));
        times(maxIdx, function(j) {
            for (let i = 0; i < measure.elements.length; ++i) {
                measure.elements[i][j].x += measureExpansion;
            }
            let expandOne = false;
            let minRatio = MAX_SAFE_INTEGER;
            for (let i = 0; i < measure.elements.length; ++i) {
                if (measure.elements[i][j].expandPolicy !== "none") {
                    anyExpandable = true;
                    if (!measure.elements[i][j].model || !measure.elements[i][j].model.divCount) {
                        continue;
                    }

                    let divCount = measure.elements[i][j].model.divCount;
                    let ratio = (Math.log(divCount) - Math.log(smallest) + 1) *
                        (underfilled[measureIdx] ? UNDERFILLED_EXPANSION_WEIGHT : 1.0);

                    minRatio = Math.min(minRatio, ratio);
                    expandOne = true;
                }
            }
            if (expandOne) {
                // FIXME: We can overshoot, like on Lily 23f. 
                measureExpansion += avgExpansion * minRatio;
                totalExpCount += minRatio;
            }
        });

        measure.width += measureExpansion;
        lineExpansion += measureExpansion;
    });

    return measures;
}

export default justify;
