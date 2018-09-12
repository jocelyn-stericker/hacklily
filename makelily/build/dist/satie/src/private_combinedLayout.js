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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var invariant_1 = __importDefault(require("invariant"));
function combineLayout(layout) {
    var detached = {
        x: layout.x,
        division: layout.division,
        renderClass: layout.renderClass
    };
    detached.expandPolicy = layout.expandPolicy;
    if (layout.expandPolicy === "centered") {
        invariant_1.default(!isNaN(layout.renderedWidth), "renderedWidth must be a number for centered objects, but it's %s", layout.renderedWidth);
    }
    if (!isNaN(layout.renderedWidth)) {
        detached.renderedWidth = layout.renderedWidth;
    }
    return detached;
}
exports.combineLayout = combineLayout;
function reattachLayout(layout) {
    var attached = {
        model: null,
        x: layout.x,
        division: layout.division,
        renderClass: layout.renderClass
    };
    attached.expandPolicy = layout.expandPolicy;
    if (layout.expandPolicy === "centered") {
        invariant_1.default(!isNaN(layout.renderedWidth), "renderedWidth must be a number for centered objects, but it's %s", layout.renderedWidth);
    }
    if (!isNaN(layout.renderedWidth)) {
        attached.renderedWidth = layout.renderedWidth;
    }
    return attached;
}
exports.reattachLayout = reattachLayout;
/**
 * Helper to line up two streams that have some overlap.
 * Divisions in each segment must be the same.
 *
 * @code
 * let memo = reduce(segments, mergeSegmentsInPlace, []);
 * reduce(segments, mergeSegmentsInPlace, memo);
 */
function mergeSegmentsInPlace(segment1, segment2) {
    var s1_idx = 0;
    var s2_idx = 0;
    var x = 0;
    while (s1_idx < segment1.length || s2_idx < segment2.length) {
        var item1 = segment1[s1_idx];
        var item2 = segment2[s2_idx];
        var div1 = !!item1 ? item1.division : Number.MAX_VALUE;
        var pri1 = !!item1 ? item1.renderClass : Number.MAX_VALUE;
        var div2 = !!item2 ? item2.division : Number.MAX_VALUE;
        var pri2 = !!item2 ? item2.renderClass : Number.MAX_VALUE;
        if (div1 < div2 || div1 === div2 && pri1 < pri2) {
            x = item1.x;
            invariant_1.default(!!segment2, "Segment2 must be defined");
            segment2.splice(s2_idx, 0, reattachLayout(item1));
        }
        else if (div2 < div1 || div2 === div1 && pri2 < pri1) {
            x = item2.x;
            segment1.splice(s1_idx, 0, combineLayout(item2));
        }
        else {
            invariant_1.default(!!item1, "div2 must be defined and have a valid division (is %s) & renderClass (is %s)", div2, pri2);
            invariant_1.default(!!item2, "div1 must be defined and have a valid division (is %s) & renderClass (is %s)", div1, pri1);
            invariant_1.default(pri1 === pri2, "invalid priority: %s must equal %s", pri1, pri2);
            invariant_1.default(div1 === div2, "invalid division");
            item1.x = item2.x = x = Math.max(item1.x || 0, item2.x || 0, x);
        }
        ++s1_idx;
        ++s2_idx;
    }
    return segment1;
}
exports.mergeSegmentsInPlace = mergeSegmentsInPlace;
//# sourceMappingURL=private_combinedLayout.js.map