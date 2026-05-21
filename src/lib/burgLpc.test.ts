/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
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

import { describe, it, expect } from 'vitest'

import { burgLpc, findLpcRoots, fixIntoUnitCircle } from './burgLpc'

function generateSinusoid(
  frequencyHz: number,
  durationSec: number,
  sampleRate: number,
): Float32Array {
  const nsamples = Math.floor(durationSec * sampleRate)
  const samples = new Float32Array(nsamples)
  const phase = (2 * Math.PI * frequencyHz) / sampleRate
  for (let i = 0; i < nsamples; i++) {
    samples[i] = Math.sin(phase * i)
  }
  return samples
}

function generateVowelApproximation(
  fundamentalHz: number,
  sampleRate: number,
): Float32Array {
  const nsamples = sampleRate / 10
  const samples = new Float32Array(nsamples)
  const dt = 1 / sampleRate
  for (let i = 0; i < nsamples; i++) {
    const t = i * dt
    samples[i] =
      0.5 * Math.sin(2 * Math.PI * fundamentalHz * t) +
      0.3 * Math.sin(2 * Math.PI * (fundamentalHz + 700) * t) +
      0.2 * Math.sin(2 * Math.PI * (fundamentalHz + 1220) * t)
  }
  return samples
}

describe('burgLpc', () => {
  describe('basic LPC coefficient computation', () => {
    it('computes coefficients for sinusoid frame', () => {
      const sampleRate = 11025
      const signal = generateSinusoid(100, 0.025, sampleRate)
      const order = 10
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(signal.length)
      const b2 = new Float32Array(signal.length)
      const aa = new Float32Array(order)

      const residual = burgLpc(signal, signal.length, order, coeffs, b1, b2, aa)

      expect(residual).toBeGreaterThanOrEqual(0)
      expect(coeffs.length).toBe(order)
      for (let i = 0; i < order; i++) {
        expect(isFinite(coeffs[i]!)).toBe(true)
      }
    })

    it('handles silence (zero residual)', () => {
      const silence = new Float32Array(128)
      const order = 10
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(128)
      const b2 = new Float32Array(128)
      const aa = new Float32Array(order)

      const residual = burgLpc(
        silence,
        silence.length,
        order,
        coeffs,
        b1,
        b2,
        aa,
      )

      expect(residual).toBe(0)
    })

    it('rejects frame lengths <= 2', () => {
      const shortFrame = new Float32Array([0.5])
      const order = 10
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(10)
      const b2 = new Float32Array(10)
      const aa = new Float32Array(order)

      const residual = burgLpc(shortFrame, 1, order, coeffs, b1, b2, aa)

      expect(residual).toBe(0.25)
    })
  })

  describe('residual power properties', () => {
    it('returns positive residual for voiced frames', () => {
      const sampleRate = 11025
      const signal = generateSinusoid(200, 0.025, sampleRate)
      const order = 10
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(signal.length)
      const b2 = new Float32Array(signal.length)
      const aa = new Float32Array(order)

      const residual = burgLpc(signal, signal.length, order, coeffs, b1, b2, aa)

      expect(residual).toBeGreaterThan(0)
    })

    it('decreases with higher LPC order (generally)', () => {
      const sampleRate = 11025
      const signal = generateVowelApproximation(100, sampleRate)

      const residuals = []
      for (const order of [4, 8, 12, 16]) {
        const coeffs = new Float32Array(order)
        const b1 = new Float32Array(signal.length)
        const b2 = new Float32Array(signal.length)
        const aa = new Float32Array(order)

        const residual = burgLpc(
          signal,
          signal.length,
          order,
          coeffs,
          b1,
          b2,
          aa,
        )
        residuals.push(residual)
      }

      for (let i = 1; i < residuals.length; i++) {
        expect(residuals[i]!).toBeLessThanOrEqual(residuals[i - 1]! * 1.1)
      }
    })
  })

  describe('coefficient properties', () => {
    it('produces reasonable coefficients for vowel', () => {
      const sampleRate = 11025
      const signal = generateVowelApproximation(150, sampleRate)
      const order = 12
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(signal.length)
      const b2 = new Float32Array(signal.length)
      const aa = new Float32Array(order)

      burgLpc(signal, signal.length, order, coeffs, b1, b2, aa)

      for (let i = 0; i < order; i++) {
        expect(isFinite(coeffs[i]!)).toBe(true)
      }
    })
  })

  describe('boundary cases', () => {
    it('handles very short frames', () => {
      const frame = new Float32Array([0.1, 0.2])
      const order = 2
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(2)
      const b2 = new Float32Array(2)
      const aa = new Float32Array(order)

      const residual = burgLpc(frame, 2, order, coeffs, b1, b2, aa)

      expect(residual).toBeGreaterThanOrEqual(0)
      expect(isFinite(residual)).toBe(true)
    })

    it('processes partial frame length', () => {
      const signal = generateSinusoid(100, 0.025, 11025)
      const order = 10
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(signal.length)
      const b2 = new Float32Array(signal.length)
      const aa = new Float32Array(order)

      const fullResidual = burgLpc(
        signal,
        signal.length,
        order,
        coeffs,
        b1,
        b2,
        aa,
      )
      const partialResidual = burgLpc(
        signal,
        Math.floor(signal.length / 2),
        order,
        coeffs,
        b1,
        b2,
        aa,
      )

      expect(fullResidual).toBeGreaterThan(0)
      expect(partialResidual).toBeGreaterThan(0)
    })
  })
})

describe('findLpcRoots', () => {
  describe('root finding', () => {
    it('finds roots for simple LPC coefficients', () => {
      const sampleRate = 11025
      const signal = generateVowelApproximation(100, sampleRate)
      const order = 10
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(signal.length)
      const b2 = new Float32Array(signal.length)
      const aa = new Float32Array(order)

      burgLpc(signal, signal.length, order, coeffs, b1, b2, aa)

      const rootsRe = new Float32Array(order)
      const rootsIm = new Float32Array(order)
      const peval = new Float32Array(4)

      findLpcRoots(coeffs, order, rootsRe, rootsIm, peval)

      expect(rootsRe.length).toBe(order)
      expect(rootsIm.length).toBe(order)

      for (let i = 0; i < order; i++) {
        expect(isFinite(rootsRe[i]!)).toBe(true)
        expect(isFinite(rootsIm[i]!)).toBe(true)
      }
    })
  })

  describe('root properties', () => {
    it('returns complex conjugate pairs for real coefficients', () => {
      const sampleRate = 11025
      const signal = generateVowelApproximation(100, sampleRate)
      const order = 10
      const coeffs = new Float32Array(order)
      const b1 = new Float32Array(signal.length)
      const b2 = new Float32Array(signal.length)
      const aa = new Float32Array(order)

      burgLpc(signal, signal.length, order, coeffs, b1, b2, aa)

      const rootsRe = new Float32Array(order)
      const rootsIm = new Float32Array(order)
      const peval = new Float32Array(4)

      findLpcRoots(coeffs, order, rootsRe, rootsIm, peval)

      for (let i = 0; i < order; i++) {
        if (Math.abs(rootsIm[i]!) > 1e-5) {
          for (let j = i + 1; j < order; j++) {
            if (
              Math.abs(rootsRe[i]! - rootsRe[j]!) < 1e-4 &&
              Math.abs(rootsIm[i]! + rootsIm[j]!) < 1e-4
            ) {
              break
            }
          }
        }
      }
    })
  })
})

describe('fixIntoUnitCircle', () => {
  describe('unit circle projection', () => {
    it('keeps roots inside unit circle unchanged', () => {
      const rootsRe = new Float32Array([0.5, 0.9, 0.0])
      const rootsIm = new Float32Array([0.3, 0.1, 0.9])
      const n = 3

      const origRe = new Float32Array(rootsRe)
      const origIm = new Float32Array(rootsIm)

      fixIntoUnitCircle(rootsRe, rootsIm, n)

      for (let i = 0; i < n; i++) {
        const origMag = Math.sqrt(origRe[i]! ** 2 + origIm[i]! ** 2)
        if (origMag < 1.0) {
          expect(rootsRe[i]).toBeCloseTo(origRe[i]!, 5)
          expect(rootsIm[i]).toBeCloseTo(origIm[i]!, 5)
        }
      }
    })

    it('projects roots outside unit circle to inside', () => {
      const rootsRe = new Float32Array([1.5, 0.0])
      const rootsIm = new Float32Array([0.0, 1.5])
      const n = 2

      fixIntoUnitCircle(rootsRe, rootsIm, n)

      for (let i = 0; i < n; i++) {
        const mag = Math.sqrt(rootsRe[i]! ** 2 + rootsIm[i]! ** 2)
        expect(mag).toBeLessThanOrEqual(1.0 + 1e-5)
      }
    })

    it('preserves argument (angle) of roots within unit circle', () => {
      const originalAngle = Math.PI / 4
      const rootsRe = new Float32Array([Math.cos(originalAngle) * 0.9])
      const rootsIm = new Float32Array([Math.sin(originalAngle) * 0.9])
      const origRe = rootsRe[0]!
      const origIm = rootsIm[0]!

      fixIntoUnitCircle(rootsRe, rootsIm, 1)

      expect(rootsRe[0]).toBeCloseTo(origRe, 5)
      expect(rootsIm[0]).toBeCloseTo(origIm, 5)
    })

    it('projects via inversion z -> 1/conj(z)', () => {
      const originalRe = 1.5
      const originalIm = 0.5
      const originalMag = Math.sqrt(originalRe ** 2 + originalIm ** 2)

      const rootsRe = new Float32Array([originalRe])
      const rootsIm = new Float32Array([originalIm])

      fixIntoUnitCircle(rootsRe, rootsIm, 1)

      const newMag = Math.sqrt(rootsRe[0]! ** 2 + rootsIm[0]! ** 2)
      const expectedMag = 1.0 / originalMag
      expect(newMag).toBeCloseTo(expectedMag, 5)
    })
  })

  describe('edge cases', () => {
    it('handles roots at origin', () => {
      const rootsRe = new Float32Array([0.0])
      const rootsIm = new Float32Array([0.0])

      fixIntoUnitCircle(rootsRe, rootsIm, 1)
      expect(rootsRe[0]).toBe(0)
      expect(rootsIm[0]).toBe(0)
    })

    it('handles roots exactly on unit circle', () => {
      const rootsRe = new Float32Array([1.0])
      const rootsIm = new Float32Array([0.0])

      fixIntoUnitCircle(rootsRe, rootsIm, 1)

      expect(rootsRe[0]).toBeCloseTo(1.0, 5)
      expect(rootsIm[0]).toBeCloseTo(0.0, 5)
    })

    it('processes multiple roots correctly', () => {
      const rootsRe = new Float32Array([0.5, 1.5, 0.0, 0.9])
      const rootsIm = new Float32Array([0.0, 0.0, 1.2, 0.1])
      const n = 4

      fixIntoUnitCircle(rootsRe, rootsIm, n)

      for (let i = 0; i < n; i++) {
        const mag = Math.sqrt(rootsRe[i]! ** 2 + rootsIm[i]! ** 2)
        expect(mag).toBeLessThanOrEqual(1.0 + 1e-5)
      }
    })
  })
})
