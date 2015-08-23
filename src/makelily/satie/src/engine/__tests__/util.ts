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
 * @file part of Satie test suite
 */

"use strict";

import {gcd, lcm} from "../util";

import {expect} from "chai";

describe("[engine/util.ts]", function() {
    describe("gcd", function() {
        it("handles powers of 2", function() {
            expect(gcd(4, 8)).to.eq(4);
            expect(gcd(8, 16)).to.eq(8);
        });
        it("handles zero", function() {
            expect(gcd(4, 0)).to.eq(4);
            expect(gcd(0, 0)).to.eq(0);
        });
        it("handles negatives", function() {
            expect(gcd(4, -8)).to.eq(4);
            expect(gcd(-8, 4)).to.eq(4);
            expect(gcd(-8, -4)).to.eq(4);
        });
        it("handles primes", function() {
            expect(gcd(7, 101)).to.eq(1);
        });
    });
    describe("lcm", function() {
        it("handles powers of 2", function() {
            expect(lcm(4, 8)).to.eq(8);
            expect(lcm(8, 16)).to.eq(16);
        });
        it("handles zero", function() {
            expect(lcm(4, 0)).to.eq(4);
            expect(lcm(0, 0)).to.eq(0);
        });
        it("handles negatives", function() {
            expect(lcm(4, -8)).to.eq(8);
            expect(lcm(-8, 4)).to.eq(8);
            expect(lcm(-8, -4)).to.eq(8);
        });
        it("handles primes", function() {
            expect(lcm(7, 101)).to.eq(707);
        });
    });
});

