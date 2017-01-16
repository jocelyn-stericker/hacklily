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

import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {cloneObject} from "./private_util";

/** 
 * Properties that apply to all elements within a staff in a
 * given measure at given division.
 */
export interface IStaffContext {
    previous: IStaffContext;

    attributes: IAttributesSnapshot;
    totalDivisions: number;

    accidentals$: {[key: string]: number};

    idx: number;
}

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
