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

import _ = require("lodash");
import invariant = require("react/lib/invariant");

import {
    ILayoutOptions, ILineBounds, ILinesLayoutState, ILineLayoutResult,
    IPart, ISegment, IMeasureLayout, Context } from "../../engine";

import {layoutMeasure} from "./measure";

export function layoutLine$(options: ILayoutOptions, bounds: ILineBounds,
        memo$: ILinesLayoutState): ILineLayoutResult {
    let {measures, attributes} = options;
    let {clean$} = memo$;

    let allModels = _.reduce(measures, function(memo, measure) {
        let voiceSegments$ = <ISegment[]>
            _.flatten(_.map(_.values(measure.parts), part => part.voices));

        let staffSegments$ = <ISegment[]>
            _.flatten(_.map(_.values(measure.parts), part => part.staves));

        let segments = _.filter(voiceSegments$.concat(staffSegments$), s => !!s);
        return memo.concat(segments);
    }, []);
    let line = Context.ILine.create(allModels, measures.length, options.line, options.lines);

    if (!measures.length) {
        return [];
    }

    let layouts = _layoutDirtyMeasures(options, line, clean$);
    attributes = clean$[measures[measures.length - 1].uuid].attributes; // FIXME: Hack

    let partOrder: string[] = _.pluck(IPart.scoreParts(options.header.partList), "id");
    let staffIdx = 0;

    let topsInOrder = _.map(partOrder, partID => {
        invariant(attributes[partID][1].staves >= 1,
                "Expected at least 1 staff, but there are %s",
                attributes[partID][1].staves);

        return [null].concat(_.times(attributes[partID].length - 1, () => {
            ++staffIdx;
            if (staffIdx > 1) {
                memo$.y$ -= 100;
            }

            let paddingTop = _.max(layouts, mre =>
                mre.paddingTop[staffIdx]||0).paddingTop[staffIdx]||0;

            let paddingBottom = _.max(layouts, mre =>
                mre.paddingBottom[staffIdx]||0).paddingBottom[staffIdx]||0;

            let top = memo$.y$ - paddingTop;
            memo$.y$ = top - paddingBottom;
            return top;
        }));
    });
    let tops: {[part: string]: number[]} = <any> _.zipObject(partOrder, topsInOrder);
    memo$.y$ -= bounds.systemLayout.systemDistance;

    let left = bounds.left;
    _.forEach(layouts, layout => {
        layout.originY = tops;
        layout.originX = left;
        left = left + layout.width;
    });

    let detachedLayouts: IMeasureLayout[] = _.map(layouts, IMeasureLayout.detach);
    return _.reduce(options.postprocessors,
        (layouts, filter) => filter(options, bounds, detachedLayouts), layouts);
}

function _layoutDirtyMeasures(options: ILayoutOptions, line: Context.ILine,
        clean$: {[key: string]: IMeasureLayout}) {
    let measures = options.measures;
    let attributes = options.attributes;
    return _.map(measures, (measure, measureIdx) => {
        line.barOnLine$ = measureIdx;
        if (!(measure.uuid in clean$)) {
            clean$[measure.uuid] = layoutMeasure({
                attributes: attributes,
                factory: options.modelFactory,
                header: options.header,
                line: line,
                measure: measure,
                padEnd: measureIdx !== measures.length - 1,
                prevByStaff: [], // FIXME: include this.
                x: 0 // Final offset set recorded in justify(...).
            });
        }
        // Update attributes for next measure
        attributes = clean$[measure.uuid].attributes;
        return clean$[measure.uuid];
    });
}

