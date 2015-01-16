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
 * @file engine/util.ts Math and other utilites used privately by the engine.
 */

"use strict";

import invariant                = require("react/lib/invariant");

/** 
 * Finds the positive greatest common factor of two numbers by using Euclid's algorithm.
 */
export function gcd(a: number, b: number) {
    var t: number;
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
 * Evaluates S(t), the logistic function. Used to create aesthetic transitions.
 * For example, the upper half of the logistic function is used to compute how much
 * spacing should be on the final line of a song.
 */
export function logistic(t: number) {
    return 1/(1 + Math.exp(-t));
}

/** 
 * Very efficient way of cloning a plain JavaScript object (i.e., one without prototypes)
 */
export function cloneObject<T>(obj: T): T {
    return <T>JSON.parse(JSON.stringify(obj));
}

export function findIndex<T>(arr: T[], predicate: (v: T, i?: number, arr?: T[]) => boolean,
        startAt: number = 0) {
    var len = arr.length;
    for (var i = startAt; i < len; ++i) {
        if (predicate(arr[i], i, arr)) {
            return i;
        }
    }
    return -1;
}
