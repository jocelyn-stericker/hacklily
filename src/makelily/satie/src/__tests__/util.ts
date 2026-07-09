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
 * @file part of Satie test suite
 */

import { gcd, lcm } from "../private_util";

describe("[engine/util.ts]", function () {
  describe("gcd", function () {
    it("handles powers of 2", function () {
      expect(gcd(4, 8)).toEqual(4);
      expect(gcd(8, 16)).toEqual(8);
    });
    it("handles zero", function () {
      expect(gcd(4, 0)).toEqual(4);
      expect(gcd(0, 0)).toEqual(0);
    });
    it("handles negatives", function () {
      expect(gcd(4, -8)).toEqual(4);
      expect(gcd(-8, 4)).toEqual(4);
      expect(gcd(-8, -4)).toEqual(4);
    });
    it("handles primes", function () {
      expect(gcd(7, 101)).toEqual(1);
    });
  });
  describe("lcm", function () {
    it("handles powers of 2", function () {
      expect(lcm(4, 8)).toEqual(8);
      expect(lcm(8, 16)).toEqual(16);
    });
    it("handles zero", function () {
      expect(lcm(4, 0)).toEqual(4);
      expect(lcm(0, 0)).toEqual(0);
    });
    it("handles negatives", function () {
      expect(lcm(4, -8)).toEqual(8);
      expect(lcm(-8, 4)).toEqual(8);
      expect(lcm(-8, -4)).toEqual(8);
    });
    it("handles primes", function () {
      expect(lcm(7, 101)).toEqual(707);
    });
  });
});
