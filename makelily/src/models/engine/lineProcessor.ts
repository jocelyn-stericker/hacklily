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
import Measure                  = require("./measure");
import MeasureProcessor         = require("./measureProcessor");
import Ctx                      = require("./ctx");
import Util                     = require("./util");

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
export function justify(options: Options.ILayoutOptions, bounds: Options.ILineBounds,
        measures: Measure.IMeasureLayout[]): Measure.IMeasureLayout[] {

    let measures$ = _.map(measures, Measure.IMeasureLayout.detach);

    const x = bounds.left + _.reduce(measures$, (sum, measure) => sum + measure.width, 0);

    // x > enX is possible if a single bar's minimum size exceeds maxX, or if our
    // guess for a measure width was too liberal. In either case, we're shortening
    // the measure width here, and our partial algorithm doesn't work with negative
    // padding.
    let partial = x < bounds.right && options.line + 1 === options.lines;

    let expandableCount = _.reduce(measures$, function(memo, measure$) {
        // Precondition: all layouts at a given index have the same "expandable" value.
        return _.reduce(measure$.elements[0], function(memo, element$) {
            return memo + (element$.expandable ? 1 : 0);
        }, memo);
    }, 0);

    let avgExpansion: number;
    if (!expandableCount) { // case 1: nothing to expand
        avgExpansion = 0;
    } else if (partial) { // case 2: expanding, but not full width
        let expansionRemainingGuess = bounds.right - 3 - x;
        let avgExpansionGuess = expansionRemainingGuess / expandableCount;
        let weight = Util.logistic((avgExpansionGuess - bounds.right / 80) / 20) * 2 / 3;
        avgExpansion = (1 - weight)*avgExpansionGuess;
    } else { // case 3: expanding or contracting to full width
        let exp = bounds.right - x;
        avgExpansion = exp/expandableCount;
    }

    let anyExpandable = false;
    let totalExpCount = 0;
    let lineExpansion = 0;
    _.forEach(measures$, function(measure) {
        let elementArr = measure.elements[0];
        let measureExpansion = 0;
        _.forEach(elementArr, function(element, j) {
            for (let i = 0; i < measure.elements.length; ++i) {
                measure.elements[i][j].x$ += measureExpansion;
            }
            for (let i = 0; i < measure.elements.length; ++i) {
                if (measure.elements[i][j].expandable) {
                    anyExpandable = true;
                    measureExpansion += avgExpansion;
                    ++totalExpCount;
                    break;
                }
            }
        });

        measure.width += measureExpansion;
        measure.originX += lineExpansion;
        lineExpansion += measureExpansion;
    });

    invariant(totalExpCount === expandableCount, "Expected %s expandable items, got %s",
        expandableCount, totalExpCount);
    // TODO: center whole bar rests

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

    let layouts = _.map(measures, (measure, measureIdx) => {
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

    let paddingTop          = _.max(layouts, mre => mre.paddingTop).paddingTop;
    let top                 = memo$.y$ - paddingTop;
    let nextPaddingBottom   = _.max(layouts, mre => mre.paddingBottom).paddingBottom;
    memo$.y$                = top - nextPaddingBottom - bounds.systemLayout.systemDistance;
    let left                = bounds.left;
    _.forEach(layouts, layout => {
        layout.originY      = top;
        layout.originX      = left;
        left                = left + layout.width;
    });

    return justify(options, bounds, layouts);
}

