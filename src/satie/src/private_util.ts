// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file private/util.ts Math and other utilites used privately by the engine.
 */

import invariant from "invariant";

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
  return Math.max(a, b, (a * b) / gcd(a, b) || 0);
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
