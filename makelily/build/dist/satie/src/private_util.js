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
/**
 * @file private/util.ts Math and other utilites used privately by the engine.
 */
var invariant_1 = __importDefault(require("invariant"));
/**
 * Finds the positive greatest common factor of two numbers by using Euclid's algorithm.
 */
function gcd(a, b) {
    var t;
    while (b !== 0) {
        t = b;
        b = a % b;
        a = t;
    }
    return Math.abs(a);
}
exports.gcd = gcd;
/**
 * Calculates modified lcm. This functions handles zero and negatives.
 */
function lcm(a, b) {
    invariant_1.default(isFinite(a), "%s is not finite", a);
    invariant_1.default(isFinite(b), "%s is not finite", b);
    a = Math.abs(a);
    b = Math.abs(b);
    return Math.max(a, b, (a * b) / gcd(a, b) || 0);
}
exports.lcm = lcm;
/**
 * Very efficient way of cloning a plain JavaScript object (i.e., one without prototypes, getters, or setters)
 */
function cloneObject(obj) {
    if (obj === undefined || obj === null) {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
}
exports.cloneObject = cloneObject;
exports.MAX_SAFE_INTEGER = 9007199254740991;
//# sourceMappingURL=private_util.js.map