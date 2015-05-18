/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import _                        = require("lodash");
import invariant                = require("react/lib/invariant");

import Engine                   = require("../engine");

const UNDERFILLED_EXPANSION_WEIGHT = 0.1;

/** 
 * Evaluates S(t), the logistic function. Used to create aesthetic transitions.
 * For example, the upper half of the logistic function is used to compute how much
 * spacing should be on the final line of a song.
 */
function logistic(t: number) {
    return 1/(1 + Math.exp(-t));
}

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
function justify(options: Engine.Options.ILayoutOptions, bounds: Engine.Options.ILineBounds,
        measures: Engine.Measure.IMeasureLayout[]): Engine.Measure.IMeasureLayout[] {

    let measures$: Engine.Measure.IMeasureLayout[] = _.map(measures, Engine.Measure.IMeasureLayout.detach);

    const x = bounds.left + _.reduce(measures$, (sum, measure) => sum + measure.width, 0);

    // Check for underfilled bars
    const underfilled = _.map(measures$, (measure, idx) => {
        let attr = measures[idx].attributes;
        let divs = Engine.IChord.barDivisions(attr);
        let maxDivs = measure.maxDivisions;
        return maxDivs < divs;
    });

    // Center things (TODO: write tests)
    _.forEach(measures$, function centerThings(measure, idx) {
        if (underfilled[idx]) {
            return;
        }
        _.forEach(measure.elements, function(segment, si) {
            _.forEach(segment, function(element, j) {
                if (element.expandPolicy === Engine.IModel.ExpandPolicy.Centered) {
                    let k = j + 1;
                    while (segment[k + 1] && segment[k].renderClass < Engine.IModel.Type.START_OF_VOICE_ELEMENTS) {
                        ++k;
                    }
                    var next: Engine.IModel.ILayout = segment[k];

                    if (next) {
                        let x = next.x$;
                        for (let sj = 0; sj < measure.elements.length; ++sj) {
                            x = Math.max(x, measure.elements[sj][k].x$);
                        }
                        const totalWidth: number = element.totalWidth;
                        invariant(!isNaN(totalWidth), "%s must be a number", totalWidth);

                        element.x$ = (element.x$ + next.x$)/2 - totalWidth/2;
                    }
                }
            });
        });
    });

    // x > enX is possible if a single bar's minimum size exceeds maxX, or if our
    // guess for a measure width was too liberal. In either case, we're shortening
    // the measure width here, and our partial algorithm doesn't work with negative
    // padding.
    let partial = x < bounds.right && options.line + 1 === options.lines;
    let underfilledCount = 0;

    let expandableCount = _.reduce(measures$, function(memo, measure$, idx) {
        // Precondition: all layouts at a given index have the same "expandable" value.
        return _.reduce(measure$.elements[0], function(memo, element$) {
            if (underfilled[idx] && element$.expandPolicy) {
                ++underfilledCount;
            }
            return memo + (element$.expandPolicy ? 1 : 0)*(underfilled[idx] ? UNDERFILLED_EXPANSION_WEIGHT : 1.0);
        }, memo);
    }, 0);

    let avgExpansion: number;
    if (!expandableCount) { // case 1: nothing to expand
        avgExpansion = 0;
    } else if (partial) { // case 2: expanding, but not full width
        let expansionRemainingGuess = bounds.right - 3 - x;
        let avgExpansionGuess = expansionRemainingGuess / (expandableCount + (1-UNDERFILLED_EXPANSION_WEIGHT)*underfilledCount);
        let weight = logistic((avgExpansionGuess - bounds.right / 80) / 20) * 2 / 3;
        avgExpansion = (1 - weight)*avgExpansionGuess;
    } else { // case 3: expanding or contracting to full width
        let exp = bounds.right - x;
        avgExpansion = exp/expandableCount;
    }

    let anyExpandable = false;
    let totalExpCount = 0;
    let lineExpansion = 0;
    _.forEach(measures$, function(measure, measureIdx) {
        let measureExpansion = 0;
        let maxIdx = _.max(_.map(measure.elements, el => el.length));
        _.times(maxIdx, function(j) {
            for (let i = 0; i < measure.elements.length; ++i) {
                measure.elements[i][j].x$ += measureExpansion;
            }
            let expandOne = false;
            for (let i = 0; i < measure.elements.length; ++i) {
                if (measure.elements[i][j].expandPolicy) {
                    anyExpandable = true;
                    let ratio = underfilled[measureIdx] ? UNDERFILLED_EXPANSION_WEIGHT : 1.0;
                    if (measure.elements[i][j].expandPolicy === Engine.IModel.ExpandPolicy.Centered) {
                        measure.elements[i][j].x$ += avgExpansion/2*ratio;
                    }
                    if (!expandOne) {
                        measureExpansion += avgExpansion*ratio;
                        totalExpCount += ratio;
                    }
                    expandOne = true;
                }
            }
        });

        measure.width += measureExpansion;
        measure.originX += lineExpansion;
        lineExpansion += measureExpansion;
    });

    invariant(totalExpCount - expandableCount < 0.01, "Expected %s expandable items, got %s",
        expandableCount, totalExpCount);

    return measures$;
}

export = justify;

