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

import IAttributesSnapshot from "./attributesSnapshot";
import {cloneObject} from "./util";

/** 
 * Properties that apply to all elements within a staff in a
 * given measure at given division.
 */
interface IStaffContext {
    previous: IStaffContext;

    attributes: IAttributesSnapshot;
    totalDivisions: number;

    accidentals$: {[key: string]: number};

    idx: number;
}

export default IStaffContext;

/** 
 * Creates a semi-shallow copy of a staffCtx. It does
 * not clone attributes or previous, since they are immutable.
 */
export function detachStaffContext(oldContext: IStaffContext): IStaffContext {
    if (!oldContext) {
        return null;
    }

    let previous: IStaffContext;
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
