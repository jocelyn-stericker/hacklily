/* Braat, adapted from Praat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 1992-2008,2010-2012,2014-2021,2024-2026 Paul Boersma
 * Copyright (C) 1993-2020 David Weenink
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
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
 * Burg's method for autoregressive (LPC) coefficient estimation.
 *
 * Source: N. Anderson in Childers (ed.), Modern Spectrum Analysis,
 * IEEE Press, 1978, pp. 252-255.  Ported from dwsys/NUM2.cpp VECburg().
 *
 * The resulting analysis polynomial is:
 *   P(z) = z^order − coeffs[0]·z^(order−1) − coeffs[1]·z^(order−2) − ⋯ − coeffs[order−1]
 * Its roots are the LPC poles; formant frequencies come from poles with positive
 * imaginary part and angle in [safetyHz, nyquist − safetyHz].
 *
 * @param frame    Windowed, pre-emphasised mono samples, 0-indexed, length `frameLen`.
 * @param frameLen Number of valid samples in `frame`.
 * @param order    LPC order (= 2 * maxFormants).
 * @param coeffs   Output: LPC prediction coefficients, length = order. Overwritten.
 * @param b1       Scratch: forward prediction errors, length ≥ frameLen.
 * @param b2       Scratch: backward prediction errors, length ≥ frameLen.
 * @param aa       Scratch: previous Levinson coefficients, length ≥ order.
 * @returns        Residual mean-square power. 0 if ill-conditioned or silent.
 */
export function burgLpc(
  frame: Float32Array,
  frameLen: number,
  order: number,
  coeffs: Float32Array,
  b1: Float32Array,
  b2: Float32Array,
  aa: Float32Array,
): number {
  for (let j = 0; j < order; j++) coeffs[j] = 0
  if (frameLen <= 2) {
    coeffs[0] = -1.0
    return frameLen === 2
      ? 0.5 * (frame[0]! ** 2 + frame[1]! ** 2)
      : frame[0]! ** 2
  }

  // (3) Total power
  let p = 0
  for (let j = 0; j < frameLen; j++) p += frame[j]! * frame[j]!
  let xms = p / frameLen
  if (xms <= 0) return 0

  // (9) Initialise forward/backward prediction error vectors:
  //   b1[j] = x[j],   b2[j] = x[j+1]   for j = 0..frameLen-2
  b1[0] = frame[0]!
  for (let j = 1; j < frameLen - 1; j++) {
    b1[j] = frame[j]!
    b2[j - 1] = frame[j]!
  }
  b2[frameLen - 2] = frame[frameLen - 1]!

  for (let ii = 0; ii < order; ii++) {
    // (7) Reflection coefficient via Burg's estimate
    const active = frameLen - ii - 1
    let num = 0,
      denom = 0
    for (let j = 0; j < active; j++) {
      num += b1[j]! * b2[j]!
      denom += b1[j]! * b1[j]! + b2[j]! * b2[j]!
    }
    if (denom <= 0) return 0
    coeffs[ii] = (2.0 * num) / denom

    // (10) Update residual power
    xms *= 1.0 - coeffs[ii]! * coeffs[ii]!

    // (5) Levinson recursion: update lower-order coefficients
    //   a[j] = aa[j] − a[ii] * aa[ii−1−j]  for j = 0 .. ii−1
    for (let j = 0; j < ii; j++)
      coeffs[j] = aa[j]! - coeffs[ii]! * aa[ii - 1 - j]!

    if (ii < order - 1) {
      // (8) Save current coefficients; update error vectors.
      //   Note: coeffs[ii] (the reflection coeff) was not touched by step (5).
      for (let j = 0; j <= ii; j++) aa[j] = coeffs[j]!
      const rc = aa[ii]! // reflection coefficient
      const bound = active - 1
      for (let j = 0; j < bound; j++) {
        b1[j]! -= rc * b2[j]!
        b2[j] = b2[j + 1]! - rc * b1[j + 1]! // b1[j+1] is the old value — correct since j+1 > j
      }
    }
  }
  return xms
}

/**
 * Evaluates the LPC analysis polynomial and its derivative at complex z using Horner's method.
 *
 * Polynomial: P(z) = z^n − c[0]·z^(n−1) − c[1]·z^(n−2) − ⋯ − c[n−1]
 * where c = `lpcCoeffs` (output of burgLpc).
 *
 * Writes [P.re, P.im, P'.re, P'.im] into `out[0..3]`.
 */
function evalLpcPoly(
  zRe: number,
  zIm: number,
  lpcCoeffs: Float32Array,
  order: number,
  out: Float32Array,
): void {
  let pRe = 1.0,
    pIm = 0.0,
    dpRe = 0.0,
    dpIm = 0.0
  for (let k = 0; k < order; k++) {
    // P' = P'·z + P  (before updating P)
    const ndpRe = dpRe * zRe - dpIm * zIm + pRe
    const ndpIm = dpRe * zIm + dpIm * zRe + pIm
    dpRe = ndpRe
    dpIm = ndpIm
    // P = P·z − c[k]
    const npRe = pRe * zRe - pIm * zIm - lpcCoeffs[k]!
    const npIm = pRe * zIm + pIm * zRe
    pRe = npRe
    pIm = npIm
  }
  out[0] = pRe
  out[1] = pIm
  out[2] = dpRe
  out[3] = dpIm
}

/**
 * Finds all roots of the LPC analysis polynomial using the Durand-Kerner (Weierstrass)
 * method, then polishes each root with Newton-Raphson.
 *
 * Source (polish): Roots.cpp Roots_Polynomial_polish().
 *
 * @param lpcCoeffs  LPC coefficients from burgLpc(), length = order.
 * @param order      Polynomial degree (LPC order = 2 * maxFormants).
 * @param rootsRe    Output: root real parts, length ≥ order. Overwritten.
 * @param rootsIm    Output: root imaginary parts, length ≥ order. Overwritten.
 * @param peval      Scratch: [pRe, pIm, dpRe, dpIm], length ≥ 4.
 * @returns          true if Durand-Kerner converged within iteration limit.
 */
export function findLpcRoots(
  lpcCoeffs: Float32Array,
  order: number,
  rootsRe: Float32Array,
  rootsIm: Float32Array,
  peval: Float32Array,
): boolean {
  // Initialise roots evenly spaced on a circle inside the unit disk
  for (let k = 0; k < order; k++) {
    const angle = (2 * Math.PI * (k + 0.5)) / order
    rootsRe[k] = 0.9 * Math.cos(angle)
    rootsIm[k] = 0.9 * Math.sin(angle)
  }

  // Durand-Kerner (Gauss-Seidel: update each root immediately)
  let converged = false
  for (let iter = 0; iter < 80 && !converged; iter++) {
    let maxStep2 = 0
    for (let k = 0; k < order; k++) {
      evalLpcPoly(rootsRe[k]!, rootsIm[k]!, lpcCoeffs, order, peval)
      // Denominator = ∏_{j≠k} (z[k] − z[j])
      let denRe = 1.0,
        denIm = 0.0
      for (let j = 0; j < order; j++) {
        if (j === k) continue
        const dRe = rootsRe[k]! - rootsRe[j]!,
          dIm = rootsIm[k]! - rootsIm[j]!
        const nRe = denRe * dRe - denIm * dIm
        denIm = denRe * dIm + denIm * dRe
        denRe = nRe
      }
      const d2 = denRe * denRe + denIm * denIm
      if (d2 === 0) continue
      const stepRe = (peval[0]! * denRe + peval[1]! * denIm) / d2
      const stepIm = (peval[1]! * denRe - peval[0]! * denIm) / d2
      rootsRe[k]! -= stepRe
      rootsIm[k]! -= stepIm
      const s2 = stepRe * stepRe + stepIm * stepIm
      if (s2 > maxStep2) maxStep2 = s2
    }
    if (maxStep2 < 1e-20) converged = true
  }

  // Newton-Raphson polish (up to 80 iterations per root, matching Praat)
  for (let k = 0; k < order; k++) {
    let bestRe = rootsRe[k]!,
      bestIm = rootsIm[k]!
    evalLpcPoly(bestRe, bestIm, lpcCoeffs, order, peval)
    let ymin = Math.hypot(peval[0]!, peval[1]!)

    for (let iter = 0; iter < 80; iter++) {
      evalLpcPoly(rootsRe[k]!, rootsIm[k]!, lpcCoeffs, order, peval)
      const fabsy = Math.hypot(peval[0]!, peval[1]!)
      if (fabsy >= ymin) {
        rootsRe[k] = bestRe
        rootsIm[k] = bestIm
        break
      }
      ymin = fabsy
      bestRe = rootsRe[k]!
      bestIm = rootsIm[k]!
      const dp2 = peval[2]! * peval[2]! + peval[3]! * peval[3]!
      if (dp2 === 0) break
      rootsRe[k]! -= (peval[0]! * peval[2]! + peval[1]! * peval[3]!) / dp2
      rootsIm[k]! -= (peval[1]! * peval[2]! - peval[0]! * peval[3]!) / dp2
    }
  }
  return converged
}

/**
 * Projects roots outside the unit circle to their inverse: z → 1/conj(z).
 * Source: Roots.cpp Roots_fixIntoUnitCircle()
 */
export function fixIntoUnitCircle(
  rootsRe: Float32Array,
  rootsIm: Float32Array,
  n: number,
): void {
  for (let i = 0; i < n; i++) {
    const n2 = rootsRe[i]! * rootsRe[i]! + rootsIm[i]! * rootsIm[i]!
    if (n2 > 1.0) {
      rootsRe[i]! /= n2
      rootsIm[i] = -rootsIm[i]! / n2
    }
  }
}
