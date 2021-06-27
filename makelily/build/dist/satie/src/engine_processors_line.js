/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
import { reduce, map, times, maxBy, zipObject, forEach } from "lodash";
import invariant from "invariant";
import { getMeasureSegments, reduceToShortestInSegments } from "./document";
import { detach as detachMeasureLayout, } from "./private_measureLayout";
import { scoreParts } from "./private_part";
import { layoutMeasure } from "./engine_processors_measure";
function layoutMeasures(options) {
    var modelFactory = options.modelFactory, header = options.header, preview = options.preview, fixup = options.fixup, document = options.document;
    var measures = options.measures;
    var attributes = options.attributes;
    var print = options.print;
    var measureShortests = measures.map(function (measure) {
        return getMeasureSegments(measure).reduce(reduceToShortestInSegments, Number.MAX_VALUE);
    });
    var lineShortest = measureShortests.reduce(function (shortest, measureShortest) { return Math.min(measureShortest, shortest); }, Number.MAX_VALUE);
    var measureLayouts = map(measures, function (measure, measureIdx) {
        var shortest = options.singleLineMode
            ? measureShortests[measureIdx]
            : lineShortest;
        var cleanliness = document.cleanlinessTracking.measures[measure.uuid];
        var layout;
        if (cleanliness && cleanliness.clean) {
            layout = options.preview ? cleanliness.layout : cleanliness.clean;
        }
        else {
            layout = layoutMeasure({
                attributes: attributes,
                document: document,
                factory: modelFactory,
                fixup: fixup,
                header: header,
                lineBarOnLine: measureIdx,
                lineCount: options.lineCount,
                lineIndex: options.lineIndex,
                lineShortest: shortest,
                lineTotalBarsOnLine: measures.length,
                measure: measure,
                preview: preview,
                print: print,
                x: 0,
                singleLineMode: options.singleLineMode,
            });
        }
        // Update attributes for next measure
        attributes = layout.attributes;
        print = layout.print;
        return layout;
    });
    return {
        measureLayouts: measureLayouts,
        attributes: attributes,
    };
}
export function layoutLine(options, bounds, memo) {
    var measures = options.measures;
    if (!measures.length) {
        return [];
    }
    options.attributes = memo.attributes;
    var layoutInfo = layoutMeasures(options);
    var layouts = layoutInfo.measureLayouts;
    var initialAttributes = layouts[0].attributes;
    var partOrder = map(scoreParts(options.header.partList), function (t) { return t.id; });
    var staffIdx = 0;
    var topsInOrder = map(partOrder, function (partID) {
        invariant(initialAttributes[partID][1].staves >= 1, "Expected at least 1 staff, but there are %s", initialAttributes[partID][1].staves);
        return [null].concat(times(initialAttributes[partID].length - 1, function () {
            ++staffIdx;
            if (staffIdx > 1) {
                memo.y -= 100;
            }
            var paddingTop = maxBy(layouts, function (mre) { return mre.paddingTop[staffIdx] || 0; }).paddingTop[staffIdx] || 0;
            var paddingBottom = maxBy(layouts, function (mre) { return mre.paddingBottom[staffIdx] || 0; }).paddingBottom[staffIdx] || 0;
            var top = memo.y - paddingTop;
            memo.y = top - paddingBottom;
            return top;
        }));
    });
    var tops = (zipObject(partOrder, topsInOrder));
    memo.y -= bounds.systemLayout.systemDistance;
    memo.attributes = layoutInfo.attributes;
    var left = bounds.left;
    forEach(layouts, function (layout) {
        layout.originY = tops;
        layout.originX = left;
        left = left + layout.width;
    });
    if (options.preview) {
        return layouts;
    }
    var detachedLayouts = map(layouts, detachMeasureLayout);
    var layout = reduce(options.postprocessors, function (layouts, filter) { return filter(options, bounds, layouts); }, detachedLayouts);
    measures.forEach(function (measure, i) {
        var cleanliness = options.document.cleanlinessTracking.measures[measure.uuid];
        cleanliness.layout = layout[i];
        ++measure.version;
    });
    return layout;
}
//# sourceMappingURL=engine_processors_line.js.map