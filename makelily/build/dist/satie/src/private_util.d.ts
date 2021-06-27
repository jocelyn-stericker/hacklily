/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
 * Finds the positive greatest common factor of two numbers by using Euclid's algorithm.
 */
export declare function gcd(a: number, b: number): number;
/**
 * Calculates modified lcm. This functions handles zero and negatives.
 */
export declare function lcm(a: number, b: number): number;
/**
 * Very efficient way of cloning a plain JavaScript object (i.e., one without prototypes, getters, or setters)
 */
export declare function cloneObject<T>(obj: T): T;
export declare const MAX_SAFE_INTEGER = 9007199254740991;
