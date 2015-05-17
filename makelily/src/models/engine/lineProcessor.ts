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

import Options                  = require("./options");
import IChord                   = require("./ichord");
import IModel                   = require("./imodel");
import Measure                  = require("./measure");
import MeasureProcessor         = require("./measureProcessor");
import Ctx                      = require("./ctx");
import Util                     = require("./util");

const UNDERFILLED_EXPANSION_WEIGHT = 0.1;

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
export function justify(options: Options.ILayoutOptions, bounds: Options.ILineBounds,
        measures: Measure.IMeasureLayout[]): Measure.IMeasureLayout[] {

    let measures$: Measure.IMeasureLayout[] = _.map(measures, Measure.IMeasureLayout.detach);

    const x = bounds.left + _.reduce(measures$, (sum, measure) => sum + measure.width, 0);

    // Check for underfilled bars
    const underfilled = _.map(measures$, (measure, idx) => {
        let attr = measures[idx].attributes;
        let divs = IChord.barDivisions(attr);
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
                if (element.expandPolicy === IModel.ExpandPolicy.Centered) {
                    let k = j + 1;
                    while (segment[k + 1] && segment[k].renderClass < IModel.Type.START_OF_VOICE_ELEMENTS) {
                        ++k;
                    }
                    var next: IModel.ILayout = segment[k];

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
        let weight = Util.logistic((avgExpansionGuess - bounds.right / 80) / 20) * 2 / 3;
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
                    if (measure.elements[i][j].expandPolicy === IModel.ExpandPolicy.Centered) {
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

export function layoutLine$(options: Options.ILayoutOptions, bounds: Options.ILineBounds,
        memo$: Options.ILinesLayoutState): Options.ILineLayoutResult {
    let measures = options.measures;
    let attributes = options.attributes;
    let clean$ = memo$.clean$;

    let allModels = _.reduce(measures, function(memo, measure) {
        let voiceSegments$ = <Measure.ISegment[]> _.flatten(_.map(_.values(measure.parts), part => part.voices));
        let staffSegments$ = <Measure.ISegment[]> _.flatten(_.map(_.values(measure.parts), part => part.staves));

        let segments = _.filter(voiceSegments$.concat(staffSegments$), s => !!s);
        return memo.concat(segments);
    }, []);
    let line = Ctx.ILine.create(allModels, measures.length, options.line, options.lines);

    if (!measures.length) {
        return [];
    }

    let layouts = _layoutDirtyMeasures(options, line, clean$);
    attributes = clean$[measures[measures.length - 1].uuid].attributes; // FIXME: Hack

    invariant(attributes.staves >= 1, "Expected at least 1 staff, but there are %s", attributes.staves);
    let tops = [null].concat(_.times(attributes.staves, staffMinusOne => {
        let staffIdx = staffMinusOne + 1;
        if (staffIdx > 1) {
            memo$.y$ -= 100;
        }
        let paddingTop = _.max(layouts, mre => mre.paddingTop[staffIdx]||0).paddingTop[staffIdx]||0;
        let paddingBottom = _.max(layouts, mre => mre.paddingBottom[staffIdx]||0).paddingBottom[staffIdx]||0;
        let top = memo$.y$ - paddingTop;
        memo$.y$ = top - paddingBottom;
        return top;
    }));
    memo$.y$ -= bounds.systemLayout.systemDistance;

    let left                = bounds.left;
    _.forEach(layouts, layout => {
        layout.originY      = tops;
        layout.originX      = left;
        left                = left + layout.width;
    });

    return justify(options, bounds, layouts);
}

function _layoutDirtyMeasures(options: Options.ILayoutOptions, line: Ctx.ILine, clean$: {[key: string]: Measure.IMeasureLayout}) {
    let measures = options.measures;
    let attributes = options.attributes;
    return _.map(measures, (measure, measureIdx) => {
        line.barOnLine$ = measureIdx;
        if (!(measure.uuid in clean$)) {
            clean$[measure.uuid] = MeasureProcessor.layoutMeasure({
                attributes:     attributes,
                factory:        options.modelFactory,
                header:         options.header,
                line:           line,
                measure:        measure,
                padEnd:         measureIdx !== measures.length - 1,
                prevByStaff:    [],    // FIXME: include this.
                x:              0      // Final offset set recorded in justify(...).
            });
        }
        // Update attributes for next measure
        attributes = clean$[measure.uuid].attributes;
        return clean$[measure.uuid];
    });
}

