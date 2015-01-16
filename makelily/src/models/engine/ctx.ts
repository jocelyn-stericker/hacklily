/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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
 * @file engine/ctx.ts Layout and validation contexts for measures, staves, and voices
 */

"use strict";

import MusicXML     = require("musicxml-interfaces");
import _            = require("lodash");

import Measure      = require("./measure");
import Util         = require("./util");

export interface IMeasure {
    /** 
     * The index of a given bar, starting from 1. This may not be the same as number.
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
    attributes$: MusicXML.Attributes;

    /** 
     * A string uniquely identifying this bar, for collaboration
     * among other things.
     */
    uuid: number;
}

export module IMeasure {
    export function detach(measure: IMutableMeasure, x: number): IMeasure {
        return {
            idx: measure.idx,
            uuid: measure.uuid,

            implicit: measure.implicit,
            attributes$: null,
            nonControlling: measure.nonControlling,
            number: measure.number,
            x: x
        };
    }
}

export interface IAccidentals {
    [key: string]:      number
}

/** 
 * Properties that apply to all elements within a staff in a
 * given measure at given division.
 */
export interface IStaff {
    previous: IStaff;

    attributes: MusicXML.Attributes;
    totalDivisions: number;

    accidentals$: IAccidentals;

    idx: number;
}

export module IStaff {
    /** 
     * Creates a semi-shallow copy of a staffCtx. It does
     * not clone attributes or previous, since they are immutable.
     */
    export function detach(sctx: IStaff): IStaff {
        if (!sctx) {
            return null;
        }
        var attributes: MusicXML.Attributes;

        if (Object.isFrozen(sctx.attributes)) {
            attributes = sctx.attributes;
        } else {
            attributes = Object.create(sctx.attributes);
            Object.freeze(attributes);
        }

        var previous: IStaff;
        if (!sctx.previous || Object.isFrozen(sctx.previous)) {
            previous = sctx.previous;
        } else {
            previous = Object.create(sctx.previous);
            Object.freeze(previous);
        }

        return {
            previous: previous,
            attributes: attributes,
            totalDivisions: NaN,
            accidentals$: Util.cloneObject(sctx.accidentals$),
            idx: sctx.idx
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
    export function detatch(vctx: IVoice): IVoice {
        return {};
    }
}

export interface IMutableMeasure /* matches everything in MusicXML.Measure except for parts! */ {
    idx:             number;
    uuid:            number;
    number:          string;
    implicit?:       boolean;
    width?:          number;
    nonControlling?: boolean;
    parts: {
        [x: string]: {
            voices:  Measure.ISegmentRef[];
            staves:  Measure.ISegmentRef[];
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
     */
    shortestCount: number;

    barOnLine: number;
}

export module ILine {
    export function create(segments: Measure.ISegmentRef[]): ILine {
        return {
            barOnLine: 0,
            shortestCount: _.reduce(segments, (shortest, segment) =>
                segment ? _.reduce((segment.voiceSegment || segment.staffSegment).models, (shortest, model) =>
                    Math.min(shortest, model && model.divCount ? model.divCount : Number.MAX_VALUE),
                shortest) : shortest,
            Number.MAX_VALUE)
        };
    }
}
