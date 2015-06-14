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

    let partOrder: string[] = _.pluck(options.header.partList.scoreParts, "id");
    let staffIdx = 0;

    let topsInOrder = _.map(partOrder, partID => {
        invariant(attributes[partID].staves >= 1, "Expected at least 1 staff, but there are %s", attributes[partID].staves);
        return [null].concat(_.times(attributes[partID].staves, () => {
            ++staffIdx;
            if (staffIdx > 1) {
                memo$.y$ -= 100;
            }
            let paddingTop = _.max(layouts, mre => mre.paddingTop[staffIdx]||0).paddingTop[staffIdx]||0;
            let paddingBottom = _.max(layouts, mre => mre.paddingBottom[staffIdx]||0).paddingBottom[staffIdx]||0;
            let top = memo$.y$ - paddingTop;
            memo$.y$ = top - paddingBottom;
            return top;
        }));
    });
    let tops: {[part: string]: number[]} = <any> _.zipObject(partOrder, topsInOrder);
    memo$.y$ -= bounds.systemLayout.systemDistance;

    let left                = bounds.left;
    _.forEach(layouts, layout => {
        layout.originY      = tops;
        layout.originX      = left;
        left                = left + layout.width;
    });

    let detachedLayouts: Measure.IMeasureLayout[] = _.map(layouts, Measure.IMeasureLayout.detach);
    return _.reduce(options.postProcessors, (layouts, filter) => filter(options, bounds, detachedLayouts), layouts);
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

