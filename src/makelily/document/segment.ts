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

import {reduce, forEach} from "lodash";
import {lcm} from "../private/util";

import IModel from "./model";
import OwnerType from "./ownerTypes";

interface ISegment extends Array<IModel> {
    owner: number;
    ownerType: OwnerType;
    divisions: number;
    part?: string;
}

export default ISegment;

/** 
 * Given a set of segments, scales divisions so that they are compatible.
 * 
 * Returns the division count.
 */
export function normalizeDivisionsInPlace(segments$: ISegment[], factor: number = 0): number {
    let divisions: number = reduce(segments$, (div1, seg) => {
        if (!div1) {
            return 1;
        }

        return lcm(div1, seg.divisions);
    }, factor);

    forEach(segments$, segment => {
        if (!segment) {
            return;
        }

        let ratio = divisions / segment.divisions;
        segment.divisions = divisions;

        forEach(segment, (model: IModel) => {
            if (model.divCount) {
                model.divCount *= ratio;
            }

            if (model.divisions) {
                ratio = divisions / model.divisions;
                model.divisions = divisions;
            }
        });
    });

    return divisions;
};
