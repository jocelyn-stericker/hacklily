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

import {forEach, max, map, times} from "lodash";

import {IMeasureLayout} from "./private_measureLayout";
import {ILayoutOptions} from "./private_layoutOptions";
import {ILineBounds} from "./private_lineBounds";

/** 
 * Respects the minSpaceBefore and minSpaceAfter of elements. minSpaceBefore and minSpaceAfter
 * are used for things like lyrics.
 * 
 * @returns new end of line
 */
function pad(options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]): IMeasureLayout[] {

    let measureOffset = 0;
    forEach(measures, function(measure, measureIdx) {
        measure.originX += measureOffset;

        let maxIdx = max(map(measure.elements, el => el.length));
        let previousElementEnd = -10;
        let offset = 0;
        times(maxIdx, function(j) {
            // These refer to the space needed before/after this position in all segments.
            let spaceNeededBefore = 0;
            let spaceNeededAfter = 0;

            for (let i = 0; i < measure.elements.length; ++i) {
                let spaceNeededBeforeSegment = measure.elements[i][j].minSpaceBefore || 0;
                let spaceNeededAfterSegment = measure.elements[i][j].minSpaceAfter || 0;

                spaceNeededBefore = Math.max(spaceNeededBefore, spaceNeededBeforeSegment);
                spaceNeededAfter = Math.max(spaceNeededAfter, spaceNeededAfterSegment);
                measure.elements[i][j].x += offset;
            }
            if (!spaceNeededBefore && !spaceNeededAfter) {
                // TODO: we should instead have some sort of flag which means
                // "disregard this element"
                return;
            }
            let thisElementStart = measure.elements[0][j].x - spaceNeededBefore;
            let extraSpaceGiven = Math.max(0, previousElementEnd - thisElementStart);

            if (extraSpaceGiven) {
                for (let i = 0; i < measure.elements.length; ++i) {
                    measure.elements[i][j].x += extraSpaceGiven;
                }
            }
            offset += extraSpaceGiven;

            // Update for next iteration
            previousElementEnd = measure.elements[0][j].x + spaceNeededAfter;
        });
        measure.width += offset;
        measureOffset += offset;
    });

    // TODO(jnetterf): Equalize space as much as possible while fitting in line
    // TODO(jnetterf): Modify layout enging to make sure we don't end up overflowing
    //                 (in which case the Justify handler will squish things again) 

    return measures;
}

export default pad;
