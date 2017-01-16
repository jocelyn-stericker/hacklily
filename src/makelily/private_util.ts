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

/**
 * @file private/util.ts Math and other utilites used privately by the engine.
 */

import * as invariant from "invariant";

/** 
 * Finds the positive greatest common factor of two numbers by using Euclid's algorithm.
 */
export function gcd(a: number, b: number) {
    let t: number;
    while (b !== 0) {
        t = b;
        b = a % b;
        a = t;
    }
    return Math.abs(a);
}

/** 
 * Calculates modified lcm. This functions handles zero and negatives.
 */
export function lcm(a: number, b: number) {
    invariant(isFinite(a), "%s is not finite", a);
    invariant(isFinite(b), "%s is not finite", b);
    a = Math.abs(a);
    b = Math.abs(b);
    return Math.max(a, b, a * b / gcd(a, b) || 0);
}

/** 
 * Very efficient way of cloning a plain JavaScript object (i.e., one without prototypes, getters, or setters)
 */
export function cloneObject<T>(obj: T): T {
    if (obj === undefined || obj === null) {
        return obj;
    }

    return JSON.parse(JSON.stringify(obj)) as T;
}

export const MAX_SAFE_INTEGER = 9007199254740991;
