/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {reduce, flatten, map, values, times, maxBy, zipObject, forEach, filter} from "lodash";
import * as invariant from "invariant";

import ISegment from "../../document/segment";
import IMeasurePart from "../../document/measurePart";

import ILayoutOptions from "../../private/layoutOptions";
import ILineBounds from "../../private/lineBounds";
import ILinesLayoutState from "../../private/linesLayoutState";
import ILineLayoutResult from "../../private/lineLayoutResult";
import ILineContext, {createLineContext, reduceToShortestInSegments} from "../../private/lineContext";
import IMeasureLayout, {detach as detachMeasureLayout} from "../../private/measureLayout";
import {scoreParts} from "../../private/part";

import {layoutMeasure} from "./measure";

export function layoutLine$(options: ILayoutOptions, bounds: ILineBounds,
        memo$: ILinesLayoutState): ILineLayoutResult {
    let {measures, attributes} = options;
    let {clean$, reduced$} = memo$;

    let allModels = reduce(measures, function(memo, measure) {
        let voiceSegments$ = <ISegment[]> flatten(map(values<IMeasurePart>(measure.parts),
            part => part.voices));

        let staffSegments$ = <ISegment[]> flatten(map(values<IMeasurePart>(measure.parts),
            part => part.staves));

        let segments = filter(voiceSegments$.concat(staffSegments$), s => !!s);
        return memo.concat(segments);
    }, []);
    let line = createLineContext(allModels, measures.length, options.line, options.lines);

    if (!measures.length) {
        return [];
    }

    let layouts = _layoutDirtyMeasures(options, line, clean$, reduced$, memo$);
    attributes = clean$[measures[measures.length - 1].uuid].attributes; // FIXME: Hack

    let partOrder = map(scoreParts(options.header.partList), t => t.id);
    let staffIdx = 0;

    let topsInOrder = map(partOrder, partID => {
        invariant(attributes[partID][1].staves >= 1,
                "Expected at least 1 staff, but there are %s",
                attributes[partID][1].staves);

        return [null].concat(times(attributes[partID].length - 1, () => {
            ++staffIdx;
            if (staffIdx > 1) {
                memo$.y$ -= 100;
            }

            let paddingTop = maxBy(layouts, mre =>
                mre.paddingTop[staffIdx] || 0).paddingTop[staffIdx] || 0;

            let paddingBottom = maxBy(layouts, mre =>
                mre.paddingBottom[staffIdx] || 0).paddingBottom[staffIdx] || 0;

            let top = memo$.y$ - paddingTop;
            memo$.y$ = top - paddingBottom;
            return top;
        }));
    });
    let tops: {[part: string]: number[]} = <any> zipObject(partOrder, topsInOrder);
    memo$.y$ -= bounds.systemLayout.systemDistance;

    let left = bounds.left;
    forEach(layouts, layout => {
        layout.originY = tops;
        layout.originX = left;
        left = left + layout.width;
    });

    let key = `${options.page$}_${options.line}`;
    if (!memo$.reduced$[key]) {
        let detachedLayouts: IMeasureLayout[] = map(layouts, detachMeasureLayout);
        memo$.reduced$[key] = reduce(options.postprocessors,
            (layouts, filter) => filter(options, bounds, layouts), detachedLayouts);
    }

    return memo$.reduced$[key];
}

function _layoutDirtyMeasures(options: ILayoutOptions, line: ILineContext,
        clean$: {[key: string]: IMeasureLayout}, reduced$: {[key: string]: ILineLayoutResult},
        memo$: ILinesLayoutState) {
    let measures = options.measures;
    let attributes = options.attributes;
    let print = options.print$;
    return map(measures, (measure, measureIdx) => {
        if (options.singleLineMode) {
            // Reset the shortestCount at every measure.
            let voiceSegments$ = <ISegment[]> flatten(map(values<IMeasurePart>(measure.parts),
                part => part.voices));

            let staffSegments$ = <ISegment[]> flatten(map(values<IMeasurePart>(measure.parts),
                part => part.staves));

            let segments = filter(voiceSegments$.concat(staffSegments$), s => !!s);
            line.shortestCount = reduce(segments, reduceToShortestInSegments, Number.MAX_VALUE)/2;
        }

        line.barOnLine$ = measureIdx;
        if (!clean$[measure.uuid]) {
            if (!options.preview) {
                reduced$[`${options.page$}_${options.line}`] = null;
            }

            clean$[measure.uuid] = layoutMeasure({
                document: options.document,
                attributes: attributes,
                print: print,
                factory: options.modelFactory,
                header: options.header,
                line: line,
                measure: measure,
                padEnd: measureIdx !== measures.length - 1,
                x: 0, // Final offset set recorded in justify(...).
                preview: options.preview,
                memo$,
                fixup: options.fixup
            });
        }
        // Update attributes for next measure
        attributes = clean$[measure.uuid].attributes;
        print = clean$[measure.uuid].print;
        return clean$[measure.uuid];
    });
}

