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

import {reduce} from "lodash";
import * as invariant from "invariant";

import {IModel} from "./document_model";
import {ISegment} from "./document_measure";

/** 
 * Properties that are true throughout a line.
 */
export interface ILineContext {
    /** 
     * The number of beats in the shortest duration on this line.
     * 
     * This is given in terms of beats, __not__ divisions because divisions.
     * As such, this value should be used only for geometry, not where accuracy is important.
     *
     * This is an estimate during validate passes and the first layout pass.
     */
    shortestCount: number;

    /**
     * The bar currently being processed.
     *
     * Zero-indexed. Only valid in the final layout pass.
     */
    barOnLine$: number;

    /**
     * The number of bars on the current line.
     *
     * Only valid in the final layout pass.
     */
    barsOnLine: number;

    /**
     * The line number. Note that this is not per-page, it's for the entire song.
     *
     * Zero-indexed. Only valid in the final layout pass.
     */
    line: number;

    /**
     * The total number of lines. Note that this is not per-page, it's for the entire song.
     *
     * Only valid in the final layout pass.
     */
    lines: number;
}

export function createLineContext(
        segments: ISegment[],
        bars: number,
        line: number,
        lines: number): ILineContext {

    return {
        barOnLine$: 0,
        barsOnLine: bars,
        line: line,
        lines: lines,
        shortestCount: reduce(segments, reduceToShortestInSegments, Number.MAX_VALUE)
    };
}

export function reduceToShortestInSegments(shortest: number, segment: ISegment) {
    if (!segment) {
        return shortest;
    }
    return reduce(segment, reduceToShortestInSegment, shortest);
}

export function reduceToShortestInSegment(shortest: number, model: IModel) {
    if (!(model.divCount >= 0)) {
        invariant(model.divCount >= 0, "Counts must exceed 0 in", model);
    }
    let divCount = model && model.divCount ? model.divCount : Number.MAX_VALUE;
    return Math.min(shortest, divCount);
}
