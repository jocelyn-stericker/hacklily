/** 
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

"use strict";

import {Print} from "musicxml-interfaces";
import {map, reduce, flatten, values, find} from "lodash";
import invariant = require("invariant");

import {ILayoutOptions, ILineBounds, ILineLayoutResult, ILinesLayoutState, IWidthInformation}
    from "../options";
import {setCurrentMeasureList} from "../escapeHatch";
import {IMeasurePart, ISegment, IMutableMeasure} from "../measure";
import Context from "../context";
import IAttributes from "../iattributes";
import IModel from "../imodel";
import IPart from "../ipart";

import {approximateLayout as calcApproximateLayout} from "./measure";
import {layoutLine$} from "./line";

export default function layout$(options: ILayoutOptions, memo$: ILinesLayoutState):
        ILineLayoutResult[] {
    setCurrentMeasureList(options.measures);

    // We lay out measures in two passes.
    // First, we calculate the approximate width of measures and assign them to lines.
    // Then, we lay them out properly with a valid line context.

    let measures = options.measures;
    let width$ = memo$.width$;
    let multipleRests$ = memo$.multipleRests$;

    invariant(!!options.print$, "Print not defined");
    let boundsGuess = ILineBounds.calculate(options.print$, options.page$);
    let multipleRest: number = undefined;

    let approximateWidths = map(measures, function layoutMeasure(measure, idx) {
        // Create an array of the IMeasureParts of the previous, current, and next measures
        let neighbourMeasures: IMeasurePart[] = <any> flatten([
            !!measures[idx - 1] ? values(measures[idx - 1].parts) : <IMeasurePart> {
                voices: [],
                staves: []
            },
            values(measure.parts),
            !!measures[idx + 1] ? values(measures[idx + 1].parts) : <IMeasurePart> {
                voices: [],
                staves: []
            }
        ]);
        // Join all of the above models
        let neighbourModels = <ISegment[]> flatten(
            map(neighbourMeasures, m => m.voices.concat(m.staves))
        );
        if (!(measure.uuid in width$)) {
            let specifiedWidth = measure.width; // TODO: Use EngravedStatus
            let numericMeasureWidth = !isNaN(measure.width) && measure.width !== null;
            if (numericMeasureWidth && (measure.width <= 0 || !isFinite(measure.width))) {
                console.warn("Bad measure width %s. Ignoring", measure.width);
                specifiedWidth = undefined;
            }

            let approximateLayout = calcApproximateLayout({
                attributes: options.attributes,
                factory: options.modelFactory,
                header: options.header,
                line: Context.ILine.create(neighbourModels, measures.length, 0, 1),
                measure: measure,
                // staves: map(values(measure.parts), p => p.staves),
                // voices: map(values(measure.parts), p => p.voices),
                x: 0
            });
            let part = IPart.scoreParts(options.header.partList)[0].id;
            // TODO: Only render multiple rests if __all__ visible parts have rests
            let {attributes} = approximateLayout;
            let {measureStyle} = attributes[part][1];
            let multipleRestEl = measureStyle && measureStyle.multipleRest;
            if (multipleRest >= 1) {
                multipleRests$[measure.uuid] = multipleRest;
                approximateLayout.width = 0;
                specifiedWidth = 0;
            } else if (multipleRestEl) {
                multipleRest = multipleRestEl.count;
                multipleRests$[measure.uuid] = multipleRest;
            } else {
                delete multipleRests$[measure.uuid];
            }
            width$[measure.uuid] = {
                width: specifiedWidth || approximateLayout.width,
                attributesWidthStart: IAttributes.approximateWidth(attributes),
                attributesWidthEnd: IAttributes.approximateWidth(attributes, IAttributes.AtEnd.Yes)
            };
        }
        multipleRest = multipleRest > 0 ? multipleRest - 1 : undefined;
        return width$[measure.uuid];
    });

    // Here we assign the lines.
    // It's currently very naive, and could use some work.

    let startingWidth = boundsGuess.right - boundsGuess.left;
    let lineOpts$ = reduce(approximateWidths, <any> reduceToLineOpts, {
        opts: <ILayoutOptions[]>[newLayoutWithoutMeasures(options, options.print$)],
        thisPrint: options.print$,
        options: options,
        remainingWidth: startingWidth,
        startingWidth: startingWidth,
        widthAllocatedForStart: 0,
        widthAllocatedForEnd: 0
    }).opts;

    // layoutLine$ handles the second pass.
    let layout = <ILineLayoutResult[]> map(lineOpts$, <any> secondPass, {
        options: options,
        memo$: memo$
    });

    setCurrentMeasureList(null);
    return layout;
}

interface IReduceOptsMemo {
    options: ILayoutOptions;
    opts: ILayoutOptions[];
    remainingWidth: number;
    startingWidth: number;
    thisPrint: Print;
    widthAllocatedForEnd: number;
    widthAllocatedForStart: number;
}

function reduceToLineOpts(memo: IReduceOptsMemo, width: IWidthInformation, idx: number):
        IReduceOptsMemo {
    let options = memo.options;
    let measures = options.measures;

    memo.thisPrint = updatePrint(options, measures[idx]) || memo.thisPrint;
    memo.opts[memo.opts.length - 1].print$ = memo.thisPrint;
    invariant(!!memo.thisPrint, "No print found");
    if (width.attributesWidthStart > memo.widthAllocatedForStart) {
        memo.remainingWidth -= width.attributesWidthStart - memo.widthAllocatedForStart;
        memo.widthAllocatedForStart = width.attributesWidthStart;
    }
    if (width.attributesWidthEnd > memo.widthAllocatedForEnd) {
        memo.remainingWidth -= width.attributesWidthEnd - memo.widthAllocatedForEnd;
        memo.widthAllocatedForEnd = width.attributesWidthEnd;
    }
    if (memo.remainingWidth > width.width) {
        memo.remainingWidth -= width.width;
    } else {
        memo.opts.push(newLayoutWithoutMeasures(options, memo.thisPrint));
        memo.remainingWidth = memo.startingWidth - width.width -
            width.attributesWidthStart - width.attributesWidthEnd;
        memo.widthAllocatedForStart = width.attributesWidthStart;
        memo.widthAllocatedForEnd = width.attributesWidthEnd;
    }
    memo.opts[memo.opts.length - 1].measures.push(measures[idx]);
    memo.opts[memo.opts.length - 1].line = memo.opts.length - 1;
    return memo;
}

function secondPass(lineOpt$: ILayoutOptions, key: string, lineOpts$: ILayoutOptions[]) {
    lineOpt$.lines = lineOpts$.length;
    lineOpt$.attributes = {}; // FIXME

    let lineBounds = ILineBounds.calculate(lineOpt$.print$, this.options.page$);
    return layoutLine$(lineOpt$, lineBounds, this.memo$);
};

function newLayoutWithoutMeasures(options: ILayoutOptions, print: Print): ILayoutOptions {
    return {
        attributes: null,
        measures: [],
        header: options.header,
        print$: print,
        page$: options.page$,
        modelFactory: options.modelFactory,
        preprocessors: options.preprocessors,
        postprocessors: options.postprocessors
    };
}

function updatePrint(options: ILayoutOptions, measure: IMutableMeasure) {
    let partWithPrint = find(measure.parts, part => !!part.staves[1] &&
            options.modelFactory.search(part.staves[1], 0, IModel.Type.Print).length);
    if (partWithPrint) {
        return <any> options.modelFactory.search(partWithPrint.staves[1], 0,
                IModel.Type.Print)[0];
    }
    return null;
}

