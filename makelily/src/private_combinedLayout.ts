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

import * as invariant from "invariant";

import {Type, ILayout} from "./document";

export interface ICombinedLayout {
    x: number;
    division: number;
    renderClass: Type;
    expandPolicy?: "none" | "centered" | "after";
    renderedWidth?: number;
}

export function combineLayout(layout: ILayout): ICombinedLayout {
    let detached: ICombinedLayout = {
        x: layout.x,
        division: layout.division,
        renderClass: layout.renderClass
    };
    detached.expandPolicy = layout.expandPolicy;
    if (layout.expandPolicy === "centered") {
        invariant(!isNaN(layout.renderedWidth),
            "renderedWidth must be a number for centered objects, but it's %s",
            layout.renderedWidth);
    }
    if (!isNaN(layout.renderedWidth)) {
        detached.renderedWidth = layout.renderedWidth;
    }
    return detached;
}

export function reattachLayout(layout: ICombinedLayout): ILayout {
    let attached: ILayout = {
        model: null,
        x: layout.x,
        division: layout.division,
        renderClass: layout.renderClass
    };
    attached.expandPolicy = layout.expandPolicy;
    if (layout.expandPolicy === "centered") {
        invariant(!isNaN(layout.renderedWidth),
            "renderedWidth must be a number for centered objects, but it's %s",
            layout.renderedWidth);
    }
    if (!isNaN(layout.renderedWidth)) {
        attached.renderedWidth = layout.renderedWidth;
    }

    return attached;
}

/** 
 * Helper to line up two streams that have some overlap.
 * Divisions in each segment must be the same.
 * 
 * @code
 * let memo = reduce(segments, mergeSegmentsInPlace, []);
 * reduce(segments, mergeSegmentsInPlace, memo);
 */
export function mergeSegmentsInPlace(
        segment1: ICombinedLayout[],
        segment2: ILayout[]): ICombinedLayout[] {

    let s1_idx = 0;
    let s2_idx = 0;
    let x = 0;

    while (s1_idx < segment1.length || s2_idx < segment2.length) {
        let item1 = segment1[s1_idx];
        let item2 = segment2[s2_idx];

        let div1 = !!item1 ? item1.division : Number.MAX_VALUE;
        let pri1 = !!item1 ? item1.renderClass : Number.MAX_VALUE;
        let div2 = !!item2 ? item2.division : Number.MAX_VALUE;
        let pri2 = !!item2 ? item2.renderClass : Number.MAX_VALUE;

        if (div1 < div2 || div1 === div2 && pri1 < pri2) {
            x = item1.x;
            invariant(!!segment2, "Segment2 must be defined");
            segment2.splice(s2_idx, 0, reattachLayout(item1));
        } else if (div2 < div1 || div2 === div1 && pri2 < pri1) {
            x = item2.x;
            segment1.splice(s1_idx, 0, combineLayout(item2));
        } else {
            invariant(!!item1,
                "div2 must be defined and have a valid division (is %s) & renderClass (is %s)",
                div2, pri2);
            invariant(!!item2,
                "div1 must be defined and have a valid division (is %s) & renderClass (is %s)",
                div1, pri1);
            invariant(pri1 === pri2, "invalid priority: %s must equal %s", pri1, pri2);
            invariant(div1 === div2, "invalid division");
            item1.x = item2.x = x = Math.max(item1.x || 0, item2.x || 0, x);
        }
        ++s1_idx;
        ++s2_idx;
    };
    return segment1;
}
