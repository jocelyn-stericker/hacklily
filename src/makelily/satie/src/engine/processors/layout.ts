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
import {map, reduce, flatten, values, find, mapValues, union} from "lodash";
import * as invariant from "invariant";

import IMeasure from "../../document/measure";
import ISegment from "../../document/segment";
import IMeasurePart from "../../document/measurePart";
import Type from "../../document/types";

import ILayoutOptions from "../../private/layoutOptions";
import ILineLayoutResult from "../../private/lineLayoutResult";
import ILinesLayoutState, {ILinePlacementState} from "../../private/linesLayoutState";
import {calculate as calculateLineBounds} from "../../private/lineBounds";
import {createLineContext} from "../../private/lineContext";
import {scoreParts} from "../../private/part";

import {AtEnd, approximateWidth} from "../../implAttributes/attributesData";

import {approximateLayout as calcApproximateLayout} from "./measure";
import {layoutLine$} from "./line";

const SQUISHINESS = 0.75;

export default function layoutSong(options: ILayoutOptions, memo$: ILinesLayoutState):
        ILineLayoutResult[] {
    // We lay out measures in two passes.
    // First, we calculate the approximate width of measures and assign them to lines.
    // Then, we lay them out properly with a valid line context.

    const measures = options.measures;
    const linePlacement$ = memo$.linePlacement$;
    const previousLines = mapValues(linePlacement$, p => p.line);

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
        const neighbourModels = <ISegment[]> flatten(
            map(neighbourMeasures, m => m.voices.concat(m.staves))
        );

        let specifiedWidth$ = measure.width;
        const numericMeasureWidth = !isNaN(measure.width) && measure.width !== null;
        if (numericMeasureWidth && (measure.width <= 0 || !isFinite(measure.width))) {
            console.warn("Bad measure width %s. Ignoring", measure.width);
            specifiedWidth$ = undefined;
        }

        const line = createLineContext(neighbourModels, measures.length, 0, 1);

        const placementDefined = linePlacement$[measure.uuid];
        const previousShortest = placementDefined ? linePlacement$[measure.uuid].shortest : NaN;
        const placementClean = previousShortest === line.shortestCount;
        if (placementClean || options.preview) {
            if (multipleRest >= 1) {
                multipleRest = multipleRest > 0 ? multipleRest - 1 : undefined;
            }
            return linePlacement$[measure.uuid];
        }

        // calcApproximateLayout kills the state, sadly.
        let approximateLayout = calcApproximateLayout({
            document: options.document,
            attributes: options.attributes,
            print: options.print$,
            factory: options.modelFactory,
            header: options.header,
            line,
            measure: measure,
            x: 0,
            preview: options.preview,
            memo$,
            fixup: options.fixup
        });

        const part = scoreParts(options.header.partList)[0].id;
        // TODO: Only render multiple rests if __all__ visible parts have rests
        const {attributes} = approximateLayout;
        const {measureStyle} = attributes[part][1];
        const multipleRestEl = measureStyle && measureStyle.multipleRest;
        if (multipleRest >= 1) {
            memo$.multipleRests$[measure.uuid] = multipleRest;
            approximateLayout.width = 0;
            specifiedWidth$ = 0;
        } else if (multipleRestEl) {
            multipleRest = multipleRestEl.count;
            memo$.multipleRests$[measure.uuid] = multipleRest;
        } else {
            delete memo$.multipleRests$[measure.uuid];
        }
        linePlacement$[measure.uuid] = {
            shortest: line.shortestCount,
            width: specifiedWidth$ || approximateLayout.width,
            attributesWidthStart: approximateWidth(attributes[part][1]),
            attributesWidthEnd: approximateWidth(attributes[part][1], AtEnd.Yes),
            line: null,
        };

        multipleRest = multipleRest > 0 ? multipleRest - 1 : undefined;
        return linePlacement$[measure.uuid];
    });

    // Here we assign the lines.
    // It's currently very naive, and could use some work.

    let startingWidth = (boundsGuess.right - boundsGuess.left) / SQUISHINESS;
    let lineOpts$ = reduce(approximateWidths, fitIntoLines, {
        opts: <ILayoutOptions[]>[createEmptyLayout(options, options.print$)],
        thisPrint: options.print$,
        options: options,
        remainingWidth: startingWidth,
        startingWidth: startingWidth,
        widthAllocatedForStart: 0,
        widthAllocatedForEnd: 0,
    }).opts;

    lineOpts$.forEach(line$ => {
        line$.lines = lineOpts$.length;
        line$.attributes = {};
    });

    // If a measure has moved to another line, the entire line is dirty.
    // Likewise, if a measure was removed from a line, the entire line is dirty.
    const shouldUpdateLine: {[line: number]: boolean} = {};
    union(Object.keys(linePlacement$), Object.keys(previousLines)).forEach((measureUUID) => {
        const lineIsDirty =
            !linePlacement$[measureUUID] ||
            isNaN(previousLines[measureUUID]) ||
            previousLines[measureUUID] !== linePlacement$[measureUUID].line;
        if (lineIsDirty) {
            invariant(!options.preview, `Cannot move measure during preview`);
            if (!isNaN(previousLines[measureUUID])) {
                shouldUpdateLine[previousLines[measureUUID]] = true;
            }
            if (linePlacement$[measureUUID]) {
                shouldUpdateLine[linePlacement$[measureUUID].line] = true;
            }
        }
    });
    Object.keys(linePlacement$).forEach(measure => {
        const line = linePlacement$[measure].line;
        if (shouldUpdateLine[line]) {
            delete memo$.clean$[measure];
            memo$.reduced$ = {}; // XXX: we should only need to remove dirty lines!
        }
    });

    // Now we need to assign an exact layout to each line.
    // layoutLine$ handles the second pass.
    return map(
        lineOpts$,
        lineOpt => layoutExact(lineOpt, options, memo$)
    );
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

/**
 * Reducer that puts measures into lines.
 */
function fitIntoLines(memo$: IReduceOptsMemo, linePlacement$: ILinePlacementState, idx: number):
        IReduceOptsMemo {
    let options = memo$.options;
    let measures = options.measures;

    memo$.thisPrint = getPrintInMeasure(options, measures[idx]) || memo$.thisPrint;
    if (!memo$.opts[memo$.opts.length - 1].print$) {
        memo$.opts[memo$.opts.length - 1].print$ = memo$.thisPrint;
    }
    invariant(!!memo$.thisPrint, "No print found");
    if (!memo$.options.singleLineMode) {
        if (linePlacement$.attributesWidthStart > memo$.widthAllocatedForStart) {
            memo$.remainingWidth -= linePlacement$.attributesWidthStart - memo$.widthAllocatedForStart;
            memo$.widthAllocatedForStart = linePlacement$.attributesWidthStart;
        }
        if (linePlacement$.attributesWidthEnd > memo$.widthAllocatedForEnd) {
            memo$.remainingWidth -= linePlacement$.attributesWidthEnd - memo$.widthAllocatedForEnd;
            memo$.widthAllocatedForEnd = linePlacement$.attributesWidthEnd;
        }
        if (memo$.remainingWidth > linePlacement$.width) {
            memo$.remainingWidth -= linePlacement$.width;
        } else {
            memo$.opts.push(createEmptyLayout(options, memo$.thisPrint));
            memo$.remainingWidth = memo$.startingWidth - linePlacement$.width -
                linePlacement$.attributesWidthStart - linePlacement$.attributesWidthEnd;
            memo$.widthAllocatedForStart = linePlacement$.attributesWidthStart;
            memo$.widthAllocatedForEnd = linePlacement$.attributesWidthEnd;
        }
    }
    memo$.opts[memo$.opts.length - 1].measures.push(measures[idx]);

    const line = memo$.opts.length - 1;
    memo$.opts[memo$.opts.length - 1].line = line;
    linePlacement$.line = line;

    return memo$;
}

function layoutExact(lineOpt$: ILayoutOptions, options: ILayoutOptions, memo$: ILinesLayoutState) {
    return layoutLine$(
        lineOpt$,
        calculateLineBounds(lineOpt$.print$, options.page$),
        memo$
    );
};

function createEmptyLayout(options: ILayoutOptions, print: Print): ILayoutOptions {
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

function getPrintInMeasure(options: ILayoutOptions, measure: IMeasure): Print {
    let partWithPrint = find(measure.parts, part => !!part.staves[1] &&
            options.modelFactory.search(part.staves[1], 0, Type.Print).length);
    if (partWithPrint) {
        return options.modelFactory.search(partWithPrint.staves[1], 0,
                Type.Print)[0] as any;
    }
    return null;
}
