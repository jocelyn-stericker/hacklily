// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

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
