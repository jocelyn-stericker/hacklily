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

import {Print} from "musicxml-interfaces";
import {map, reduce, flatten, values, find} from "lodash";
import * as invariant from "invariant";

import IMeasure from "../../document/measure";
import ISegment from "../../document/segment";
import IMeasurePart from "../../document/measurePart";
import Type from "../../document/types";

import ILayoutOptions from "../../private/layoutOptions";
import ILineLayoutResult from "../../private/lineLayoutResult";
import ILinesLayoutState from "../../private/linesLayoutState";
import IWidthInformation from "../../private/widthInformation";
import {calculate as calculateLineBounds} from "../../private/lineBounds";
import {createLineContext} from "../../private/lineContext";
import {scoreParts} from "../../private/part";

import {AtEnd, approximateWidth} from "../../implAttributes/attributesData";

import {setCurrentMeasureList} from "../measureList";
import {approximateLayout as calcApproximateLayout} from "./measure";
import {layoutLine$} from "./line";

export default function layout(options: ILayoutOptions, memo$: ILinesLayoutState):
        ILineLayoutResult[] {
    setCurrentMeasureList(options.measures);

    // We lay out measures in two passes.
    // First, we calculate the approximate width of measures and assign them to lines.
    // Then, we lay them out properly with a valid line context.

    let measures = options.measures;
    let width$ = memo$.width$;
    let multipleRests$ = memo$.multipleRests$;

    invariant(!!options.print$, "Print not defined");
    let boundsGuess = calculateLineBounds(options.print$, options.page$);
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
                document: options.document,
                attributes: options.attributes,
                print: options.print$,
                factory: options.modelFactory,
                header: options.header,
                line: createLineContext(neighbourModels, measures.length, 0, 1),
                measure: measure,
                // staves: map(values(measure.parts), p => p.staves),
                // voices: map(values(measure.parts), p => p.voices),
                x: 0,
                preview: options.preview,
                memo$,
                fixup: options.fixup
            });
            let part = scoreParts(options.header.partList)[0].id;
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
                attributesWidthStart: approximateWidth(attributes[part][1]),
                attributesWidthEnd: approximateWidth(attributes[part][1], AtEnd.Yes)
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
        widthAllocatedForEnd: 0,
    }).opts;

    // layoutLine$ handles the second pass.
    let layout = <ILineLayoutResult[]> map(lineOpts$, lineOpt => secondPass(lineOpt, lineOpts$, options, memo$));

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
    if (!memo.opts[memo.opts.length - 1].print$) {
        memo.opts[memo.opts.length - 1].print$ = memo.thisPrint;
    }
    invariant(!!memo.thisPrint, "No print found");
    if (!memo.options.singleLineMode) {
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
    }
    memo.opts[memo.opts.length - 1].measures.push(measures[idx]);
    memo.opts[memo.opts.length - 1].line = memo.opts.length - 1;
    return memo;
}

function secondPass(lineOpt$: ILayoutOptions, lineOpts$: ILayoutOptions[], options: ILayoutOptions, memo$: ILinesLayoutState) {
    lineOpt$.lines = lineOpts$.length;
    lineOpt$.attributes = {}; // FIXME

    let lineBounds = calculateLineBounds(lineOpt$.print$, options.page$);
    return layoutLine$(lineOpt$, lineBounds, memo$);
};

function newLayoutWithoutMeasures(options: ILayoutOptions, print: Print): ILayoutOptions {
    return {
        document: options.document,
        attributes: null,
        preview: options.preview,
        measures: [],
        header: options.header,
        print$: print,
        page$: options.page$,
        modelFactory: options.modelFactory,
        preprocessors: options.preprocessors,
        postprocessors: options.postprocessors,
        fixup: options.fixup,
        singleLineMode: options.singleLineMode
    };
}

function updatePrint(options: ILayoutOptions, measure: IMeasure) {
    let partWithPrint = find(measure.parts, part => !!part.staves[1] &&
            options.modelFactory.search(part.staves[1], 0, Type.Print).length);
    if (partWithPrint) {
        return <any> options.modelFactory.search(partWithPrint.staves[1], 0,
                Type.Print)[0];
    }
    return null;
}
