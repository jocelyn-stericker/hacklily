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

import _                        = require("lodash");

import Engine                   = require("../engine");

/** 
 * Respects the minSpaceBefore and minSpaceAfter of elements. minSpaceBefore and minSpaceAfter
 * are used for things like lyrics.
 * 
 * @returns new end of line
 */
function pad(options: Engine.Options.ILayoutOptions, bounds: Engine.Options.ILineBounds,
        measures$: Engine.Measure.IMeasureLayout[]): Engine.Measure.IMeasureLayout[] {

    let measureOffset = 0;
    _.forEach(measures$, function(measure, measureIdx) {
        measure.originX += measureOffset;

        let maxIdx = _.max(_.map(measure.elements, el => el.length));
        let previousElementEnd = -10;
        let offset = 0;
        _.times(maxIdx, function(j) {
            let spaceNeededBefore = 0;
            let spaceNeededAfter = 0;
            for (let i = 0; i < measure.elements.length; ++i) {
                spaceNeededBefore = Math.max(spaceNeededBefore, measure.elements[i][j].minSpaceBefore || 0);
                spaceNeededAfter = Math.max(spaceNeededAfter, measure.elements[i][j].minSpaceAfter || 0);
                measure.elements[i][j].x$ += offset;
            }
            if (!spaceNeededBefore && !spaceNeededAfter) {
                // Note: we should instead have some sort of flag which means "disregard this element"
                return;
            }
            let thisElementStart = measure.elements[0][j].x$ - spaceNeededBefore;
            let extraSpaceGiven = Math.max(0, previousElementEnd - thisElementStart);

            if (extraSpaceGiven) {
                for (let i = 0; i < measure.elements.length; ++i) {
                    measure.elements[i][j].x$ += extraSpaceGiven;
                }
            }
            offset += extraSpaceGiven;

            // Update for next iteration
            previousElementEnd = measure.elements[0][j].x$ + spaceNeededAfter;
        });
        measure.width += offset;
        measureOffset += offset;
    });

    // TODO(jnetterf): Equalize space as much as possible while fitting in line
    // TODO(jnetterf): Modify layout enging to make sure we don't end up overflowing
    //                 (in which case the Justify handler will squish things again) 

    return measures$;
}

export = pad;

