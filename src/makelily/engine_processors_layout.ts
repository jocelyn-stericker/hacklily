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

import {Print} from "musicxml-interfaces";
import {map, reduce, find, last} from "lodash";
import * as invariant from "invariant";

import {IMeasure, getMeasureSegments, Type, reduceToShortestInSegments} from "./document";

import {ILayoutOptions} from "./private_layoutOptions";
import {calculateLineBounds} from "./private_lineBounds";
import {IMeasureLayout} from "./private_measureLayout";

import {layoutLine} from "./engine_processors_line";

const SQUISHINESS = 0.8;

export interface ILinePlacementHint {
    widthByShortest: {[key: number]: number};
    shortestCount: number;
    attributesWidthStart: number;
    attributesWidthEnd: number;
}

interface IReduceOptsMemo {
    options: ILayoutOptions;
    opts: ILayoutOptions[];
    remainingWidth: number;
    startingWidth: number;
    thisPrint: Print;
    widthAllocatedForEnd: number;
    widthAllocatedForStart: number;
    shortest: number;
}

function findPrint(options: ILayoutOptions, measure: IMeasure): Print {
    const partWithPrint = find(measure.parts, part => !!part.staves[1] &&
            options.modelFactory.search(part.staves[1], 0, Type.Print).length);

    if (partWithPrint) {
        return options.modelFactory.search(partWithPrint.staves[1], 0,
                Type.Print)[0] as any;
    }
    return null;
}

/**
 * Reducer that puts measures into lines.
 */
function assignLinesReducer(memo: IReduceOptsMemo, measureInfo: ILinePlacementHint, idx: number, all: ILinePlacementHint[]):
        IReduceOptsMemo {
    let options = memo.options;
    let measures = options.measures;

    memo.thisPrint = findPrint(options, measures[idx]) || memo.thisPrint;
    if (!last(memo.opts).print) {
        last(memo.opts).print = memo.thisPrint;
    }
    invariant(!!memo.thisPrint, "No print found");
    if (!memo.options.singleLineMode) {
        if (measureInfo.attributesWidthStart > memo.widthAllocatedForStart) {
            memo.remainingWidth -= measureInfo.attributesWidthStart - memo.widthAllocatedForStart;
            memo.widthAllocatedForStart = measureInfo.attributesWidthStart;
        }
        if (measureInfo.attributesWidthEnd > memo.widthAllocatedForEnd) {
            memo.remainingWidth -= measureInfo.attributesWidthEnd - memo.widthAllocatedForEnd;
            memo.widthAllocatedForEnd = measureInfo.attributesWidthEnd;
        }
        let retroactiveIncrease = 0;
        if (memo.shortest > measureInfo.shortestCount) {
            const measuresOnLine = last(memo.opts).measures.length;
            const measuresInfo = all.slice(idx - measuresOnLine, idx);
            retroactiveIncrease = measuresInfo.reduce((increase, measure) => {
                return measure.widthByShortest[measureInfo.shortestCount]  - measure.widthByShortest[memo.shortest];
            }, 0);
            memo.shortest = measureInfo.shortestCount;
        }
        const measureWidth = measureInfo.widthByShortest[memo.shortest];
        const totalIncrease = retroactiveIncrease + measureWidth;
        if (memo.remainingWidth > totalIncrease) {
            memo.remainingWidth -= totalIncrease;
        } else {
            memo.opts.push(createEmptyLayout(options, memo.thisPrint));
            memo.remainingWidth = memo.startingWidth - measureWidth -
                measureInfo.attributesWidthStart - measureInfo.attributesWidthEnd;
            memo.widthAllocatedForStart = measureInfo.attributesWidthStart;
            memo.widthAllocatedForEnd = measureInfo.attributesWidthEnd;
        }
    }

    last(memo.opts).measures.push(measures[idx]);

    return memo;
}

function createEmptyLayout(options: ILayoutOptions, print: Print): ILayoutOptions {
    return {
        ...options,
        attributes: null,
        measures: [],
        print: print,
    };
}

export function getApproximateMeasureWidth(measure: IMeasure, shortest: number) {
    return Object.keys(measure.parts).reduce((pwidth, partName) => {
        const vwidth = measure.parts[partName].voices.reduce((vwidth, voice) => {
            if (!voice) {
                return vwidth;
            }
            return voice.reduce((swidth, el) => swidth + el.calcWidth(shortest), vwidth);
        }, 0);
        return Math.max(vwidth, pwidth);
    }, 0);
}

function getLinePlacementHints(measures: IMeasure[]): ReadonlyArray<ILinePlacementHint> {
    const shortestByMeasure: ReadonlyArray<number> = measures.map(measure => {
        const segments = getMeasureSegments(measure);
        return reduce(segments, reduceToShortestInSegments, Number.MAX_VALUE);
    });

    const shortestsObj: {readonly [key: number]: boolean} =
        shortestByMeasure.reduce((shortests, shortest) => {
            shortests[shortest] = true;
            return shortests;
        }, {} as {[key: number]: boolean});

    const shortests = Object.keys(shortestsObj).map(str => parseInt(str, 10));

    return map(measures, function layoutMeasure(measure, idx): ILinePlacementHint {
        const shortestInMeasure = shortestByMeasure[idx];

        let specifiedWidth = measure.width;
        const numericMeasureWidth = !isNaN(measure.width) && measure.width !== null;
        if (numericMeasureWidth && (measure.width <= 0 || !isFinite(measure.width))) {
            console.warn("Bad measure width %s. Ignoring", measure.width);
            specifiedWidth = undefined;
        }
        let widthByShortest = shortests.reduce((shortests, shortest) => {
            if (shortest <= shortestInMeasure) {
                shortests[shortest] = getApproximateMeasureWidth(measure, shortest);
            }
            return shortests;
        }, {} as {[key: number]: number});

        // XXX: multiple rests
        return {
            widthByShortest,
            shortestCount: shortestInMeasure,
            attributesWidthStart: 150, // XXX
            attributesWidthEnd: 50, // XXX
        };
    });

}

export default function layoutSong(options: ILayoutOptions):
        IMeasureLayout[][] {

    invariant(!!options.print, "Print not defined");
    invariant(!options.print._snapshot, "Pass a snapshot of Print to layoutSong, not the actual model!");
    const page = 1; // XXX

    // Estimate the width of each measure, and the space available for each line.
    const boundsGuess = calculateLineBounds(options.print, page);
    const lineWidth = (boundsGuess.right - boundsGuess.left) / SQUISHINESS;
    const linePlacementHints = options.preview ?
        options.document.cleanlinessTracking.linePlacementHints :
        getLinePlacementHints(options.measures);

    options.document.cleanlinessTracking.linePlacementHints = linePlacementHints;

    // Assign measures to lines.
    const layoutOpts = reduce(linePlacementHints, assignLinesReducer, {
        options: options,
        opts: <ILayoutOptions[]>[createEmptyLayout(options, options.print)],
        remainingWidth: lineWidth,
        shortest: Number.MAX_VALUE,
        startingWidth: lineWidth,
        thisPrint: options.print,
        widthAllocatedForEnd: 0,
        widthAllocatedForStart: 0,
    }).opts;

    layoutOpts.forEach((line, idx) => {
        line.lineIndex = idx;
        line.lineCount = layoutOpts.length;
        line.attributes = {};
    });

    if (!options.preview) {
        const oldLineCleanliness = options.document.cleanlinessTracking.lines || [];
        const newLineCleanliness = layoutOpts.map(line => line.measures.map(measure => measure.uuid)) || [];
        for (let i = 0; i < oldLineCleanliness.length || i < newLineCleanliness.length; ++i) {
            const oldLine = oldLineCleanliness[i] || [];
            const newLine = newLineCleanliness[i] || [];
            const isDirty = !oldLine || !newLine || oldLine.length !== newLine.length || oldLine.some((m, k) => newLine[k] !== m);
            if (isDirty) {
                oldLine.concat(newLine).forEach(m => {
                    options.document.cleanlinessTracking.measures[m] = null;
                });
            }
        }
        options.document.cleanlinessTracking.lines = newLineCleanliness;
    }

    // Create the final layout
    const memo = {
        y: calculateLineBounds(layoutOpts[0].print, page).top,
        attributes: {},
    };
    return layoutOpts.map(lineOpt => layoutLine(
        lineOpt,
        calculateLineBounds(lineOpt.print, page),
        memo,
    ));
}
