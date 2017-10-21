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

import {reduce, map, times, maxBy, zipObject, forEach} from "lodash";
import * as invariant from "invariant";

import {getMeasureSegments, reduceToShortestInSegments} from "./document";

import {ILayoutOptions} from "./private_layoutOptions";
import {ILineBounds} from "./private_lineBounds";
import {IMeasureLayout, detach as detachMeasureLayout} from "./private_measureLayout";
import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {scoreParts} from "./private_part";

import {layoutMeasure} from "./engine_processors_measure";

function layoutMeasures(options: ILayoutOptions) {
    const {modelFactory, header, preview, fixup, document} = options;
    let measures = options.measures;
    let attributes = options.attributes;
    let print = options.print;
    const measureShortests = measures.map(measure =>
        getMeasureSegments(measure).reduce(reduceToShortestInSegments, Number.MAX_VALUE));
    const lineShortest = measureShortests.reduce((shortest, measureShortest) =>
            Math.min(measureShortest, shortest), Number.MAX_VALUE);

    let measureLayouts = map(measures, (measure, measureIdx) => {
        const shortest = options.singleLineMode ? measureShortests[measureIdx] : lineShortest;
        let cleanliness = document.cleanlinessTracking.measures[measure.uuid];
        let layout: IMeasureLayout;
        if (cleanliness && cleanliness.clean) {
            layout = options.preview ? cleanliness.layout : cleanliness.clean;
        } else {
            layout = layoutMeasure({
                attributes,
                document,
                factory: modelFactory,
                fixup,
                header,
                lineBarOnLine: measureIdx,
                lineCount: options.lineCount,
                lineIndex: options.lineIndex,
                lineShortest: shortest,
                lineTotalBarsOnLine: measures.length,
                measure,
                preview,
                print,
                x: 0, // Final offset set recorded in justify(...).
                singleLineMode: options.singleLineMode,
            });
        }

        // Update attributes for next measure
        attributes = layout.attributes;
        print = layout.print;
        return layout;
    });
    return {
        measureLayouts,
        attributes,
    };
}

export function layoutLine(options: ILayoutOptions, bounds: ILineBounds, memo: {y: number,
        attributes: {[part: string]: IAttributesSnapshot[]}}): IMeasureLayout[] {

    let {measures} = options;

    if (!measures.length) {
        return [];
    }

    options.attributes = memo.attributes;
    const layoutInfo = layoutMeasures(options);
    const layouts = layoutInfo.measureLayouts;

    const initialAttributes = layouts[0].attributes;

    let partOrder = map(scoreParts(options.header.partList), t => t.id);
    let staffIdx = 0;

     let topsInOrder = map(partOrder, partID => {
        invariant(initialAttributes[partID][1].staves >= 1,
                "Expected at least 1 staff, but there are %s",
                initialAttributes[partID][1].staves);

        return [null].concat(times(initialAttributes[partID].length - 1, () => {
            ++staffIdx;
            if (staffIdx > 1) {
                memo.y -= 100;
            }

            let paddingTop = maxBy(layouts, mre =>
                mre.paddingTop[staffIdx] || 0).paddingTop[staffIdx] || 0;

            let paddingBottom = maxBy(layouts, mre =>
                mre.paddingBottom[staffIdx] || 0).paddingBottom[staffIdx] || 0;

            let top = memo.y - paddingTop;
            memo.y = top - paddingBottom;
            return top;
        }));
    });
    let tops: {[part: string]: number[]} = <any> zipObject(partOrder, topsInOrder);
    memo.y -= bounds.systemLayout.systemDistance;
    memo.attributes = layoutInfo.attributes;

    let left = bounds.left;
    forEach(layouts, layout => {
        layout.originY = tops;
        layout.originX = left;
        left = left + layout.width;
    });

    if (options.preview) {
        return layouts;
    }

    let detachedLayouts: IMeasureLayout[] = map(layouts, detachMeasureLayout);
    const layout = reduce(options.postprocessors,
        (layouts, filter) => filter(options, bounds, layouts), detachedLayouts);
    measures.forEach((measure, i) => {
        const cleanliness = options.document.cleanlinessTracking.measures[measure.uuid];
        cleanliness.layout = layout[i];
        ++measure.version;
    });

    return layout;
}
