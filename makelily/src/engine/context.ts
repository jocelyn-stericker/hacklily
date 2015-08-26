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

/**
 * @file engine/context.ts Layout and validation contexts for measures, staves, and voices
 */

"use strict";

import {reduce} from "lodash";
import invariant = require("invariant");

import IAttributes from "./iattributes";
import IModel from "./imodel";
import {ISegment} from "./measure";
import {cloneObject} from "./util";

module Context {

export interface IMeasure {
    /** 
     * The index of a given bar, starting from 0. This may not be the same as number.
     */
    idx: number;

    /** 
     * The string that is displayed at the start of the measure in some cases.
     */
    number: string;

    /** 
     * If true, the measure number should never be rendered.
     */
    implicit: boolean;

    /** 
     * If true, this measure does not start at beat 0 of other parts.
     * 
     * Satie does not support this attribute yet. It is here so we don't lose information when
     * we load and save from MusicXML.
     */
    nonControlling: boolean;

    /** 
     * Starting position.
     */
    x: number;

    /** 
     * Attributes from previous measure.
     */
    attributes: IAttributes.ISnapshot;

    /** 
     * A string uniquely identifying this bar, for collaboration
     * among other things.
     */
    uuid: number;

    parent: IMutableMeasure;
}

export module IMeasure {
    export function detach(measure: IMutableMeasure, x: number): IMeasure {
        return {
            idx: measure.idx,
            uuid: measure.uuid,

            implicit: measure.implicit,
            attributes: null,
            nonControlling: measure.nonControlling,
            number: measure.number,
            x: x,

            parent: measure
        };
    }
}

export interface IAccidentals {
    [key: string]: number;
}

/** 
 * Properties that apply to all elements within a staff in a
 * given measure at given division.
 */
export interface IStaff {
    previous: IStaff;

    attributes: IAttributes.ISnapshot;
    totalDivisions: number;

    accidentals$: IAccidentals;

    idx: number;
}

export module IStaff {
    /** 
     * Creates a semi-shallow copy of a staffCtx. It does
     * not clone attributes or previous, since they are immutable.
     */
    export function detach(oldContext: IStaff): IStaff {
        if (!oldContext) {
            return null;
        }

        let previous: IStaff;
        if (!oldContext.previous || Object.isFrozen(oldContext.previous)) {
            previous = oldContext.previous;
        } else {
            previous = Object.create(oldContext.previous);
            Object.freeze(previous);
        }

        return {
            previous: previous,
            attributes: oldContext.attributes,
            totalDivisions: NaN,
            accidentals$: cloneObject(oldContext.accidentals$),
            idx: oldContext.idx
        };
    }
}

/** 
 * Properties that apply to all elements within a staff in a
 * given measure at a given division.
 */
export interface IVoice {
}

export module IVoice {
    /** 
     * For completeness.
     */
    export function detatch(oldContext: IVoice): IVoice {
        return {};
    }
}

export interface IMutableMeasure /* matches everything in Measure except for parts! */ {
    idx: number;
    uuid: number;
    number: string;
    implicit?: boolean;
    width?: number;
    nonControlling?: boolean;
    parts: {
        [x: string]: {
            voices: ISegment[];
            staves: ISegment[];
        }
    };
}

/** 
 * Properties that are true throughout a line.
 */
export interface ILine {
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

export module ILine {
    export function create(segments: ISegment[], bars: number, line: number, lines: number): ILine {
        return {
            barOnLine$: 0,
            barsOnLine: bars,
            line: line,
            lines: lines,
            shortestCount: reduce(segments, reduceToShortestInSegments, Number.MAX_VALUE)
        };
    }
}

function reduceToShortestInSegments(shortest: number, segment: ISegment) {
    if (!segment) {
        return shortest;
    }
    return reduce(segment, reduceToShortestInSegment, shortest);
}

function reduceToShortestInSegment(shortest: number, model: IModel) {
    if (!(model.divCount >= 0)) {
        invariant(model.divCount >= 0, "Counts must exceed 0 in", model);
    }
    let divCount = model && model.divCount ? model.divCount : Number.MAX_VALUE;
    return Math.min(shortest, divCount);
}

}

export default Context;
