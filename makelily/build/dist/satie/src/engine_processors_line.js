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
var invariant = require("invariant");
var document_1 = require("./document");
var private_measureLayout_1 = require("./private_measureLayout");
var private_part_1 = require("./private_part");
var engine_processors_measure_1 = require("./engine_processors_measure");
function layoutMeasures(options) {
    var modelFactory = options.modelFactory, header = options.header, preview = options.preview, fixup = options.fixup, document = options.document;
    var measures = options.measures;
    var attributes = options.attributes;
    var print = options.print;
    var measureShortests = measures.map(function (measure) {
        return document_1.getMeasureSegments(measure).reduce(document_1.reduceToShortestInSegments, Number.MAX_VALUE);
    });
    var lineShortest = measureShortests.reduce(function (shortest, measureShortest) {
        return Math.min(measureShortest, shortest);
    }, Number.MAX_VALUE);
    var measureLayouts = lodash_1.map(measures, function (measure, measureIdx) {
        var shortest = options.singleLineMode ? measureShortests[measureIdx] : lineShortest;
        var cleanliness = document.cleanlinessTracking.measures[measure.uuid];
        var layout;
        if (cleanliness && cleanliness.clean) {
            layout = options.preview ? cleanliness.layout : cleanliness.clean;
        }
        else {
            layout = engine_processors_measure_1.layoutMeasure({
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
function layoutLine(options, bounds, memo) {
    var measures = options.measures;
    if (!measures.length) {
        return [];
    }
    options.attributes = memo.attributes;
    var layoutInfo = layoutMeasures(options);
    var layouts = layoutInfo.measureLayouts;
    var initialAttributes = layouts[0].attributes;
    var partOrder = lodash_1.map(private_part_1.scoreParts(options.header.partList), function (t) { return t.id; });
    var staffIdx = 0;
    var topsInOrder = lodash_1.map(partOrder, function (partID) {
        invariant(initialAttributes[partID][1].staves >= 1, "Expected at least 1 staff, but there are %s", initialAttributes[partID][1].staves);
        return [null].concat(lodash_1.times(initialAttributes[partID].length - 1, function () {
            ++staffIdx;
            if (staffIdx > 1) {
                memo.y -= 100;
            }
            var paddingTop = lodash_1.maxBy(layouts, function (mre) {
                return mre.paddingTop[staffIdx] || 0;
            }).paddingTop[staffIdx] || 0;
            var paddingBottom = lodash_1.maxBy(layouts, function (mre) {
                return mre.paddingBottom[staffIdx] || 0;
            }).paddingBottom[staffIdx] || 0;
            var top = memo.y - paddingTop;
            memo.y = top - paddingBottom;
            return top;
        }));
    });
    var tops = lodash_1.zipObject(partOrder, topsInOrder);
    memo.y -= bounds.systemLayout.systemDistance;
    memo.attributes = layoutInfo.attributes;
    var left = bounds.left;
    lodash_1.forEach(layouts, function (layout) {
        layout.originY = tops;
        layout.originX = left;
        left = left + layout.width;
    });
    if (options.preview) {
        return layouts;
    }
    var detachedLayouts = lodash_1.map(layouts, private_measureLayout_1.detach);
    var layout = lodash_1.reduce(options.postprocessors, function (layouts, filter) { return filter(options, bounds, layouts); }, detachedLayouts);
    measures.forEach(function (measure, i) {
        var cleanliness = options.document.cleanlinessTracking.measures[measure.uuid];
        cleanliness.layout = layout[i];
        ++measure.version;
    });
    return layout;
}
exports.layoutLine = layoutLine;
//# sourceMappingURL=engine_processors_line.js.map