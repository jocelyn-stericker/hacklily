// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import { buildWindow, buildFormantGaussianWindow } from './windowFn'

function computeSSQ(window: Float32Array): number {
  let ssq = 0
  for (const val of window) {
    ssq += val * val
  }
  return ssq
}

describe('buildWindow', () => {
  it('should handle square window', () => {
    const nsamp = 100
    const physicalWidth = 100
    const out = new Float32Array(nsamp)
    const ssq = buildWindow('square', nsamp, physicalWidth, out)

    for (let i = 0; i < nsamp; i++) {
      expect(out[i]).toBeCloseTo(1.0, 5)
    }
    expect(ssq).toBeCloseTo(nsamp, 5)
  })

  it('should handle hamming window', () => {
    const nsamp = 100
    const physicalWidth = 100
    const out = new Float32Array(nsamp)
    const ssq = buildWindow('hamming', nsamp, physicalWidth, out)

    expect(out[0]).toBeCloseTo(out[nsamp - 1]!, 2)

    const center = Math.floor(nsamp / 2)
    expect(out[center]!).toBeGreaterThan(0.99)
    expect(ssq).toBeCloseTo(computeSSQ(out), 5)
  })

  it('should handle hanning window', () => {
    const nsamp = 100
    const physicalWidth = 100
    const out = new Float32Array(nsamp)
    const ssq = buildWindow('hanning', nsamp, physicalWidth, out)

    expect(out[0]).toBeCloseTo(out[nsamp - 1]!, 1)

    const center = Math.floor(nsamp / 2)
    expect(out[center]!).toBeCloseTo(1.0, 2)
    expect(ssq).toBeGreaterThan(0)
    expect(ssq).toBeLessThan(nsamp)
  })

  it('should handle bartlett window', () => {
    const nsamp = 100
    const physicalWidth = 100
    const out = new Float32Array(nsamp)
    buildWindow('bartlett', nsamp, physicalWidth, out)

    expect(out[0]).toBeCloseTo(out[nsamp - 1]!, 1)

    const center = Math.floor(nsamp / 2)
    expect(out[center]!).toBeCloseTo(1.0, 1)
  })

  it('should handle welch window', () => {
    const nsamp = 100
    const physicalWidth = 100
    const out = new Float32Array(nsamp)
    buildWindow('welch', nsamp, physicalWidth, out)

    expect(out[0]).toBeCloseTo(out[nsamp - 1]!, 1)

    const center = Math.floor(nsamp / 2)
    expect(out[center]!).toBeCloseTo(1.0, 2)
  })

  it('should handle gaussian window', () => {
    const nsamp = 100
    const physicalWidth = 100
    const out = new Float32Array(nsamp)
    const ssq = buildWindow('gaussian', nsamp, physicalWidth, out)

    const center = Math.floor(nsamp / 2)
    expect(out[center]!).toBeCloseTo(1.0, 2)

    for (let i = 0; i < nsamp / 2; i++) {
      expect(out[i]).toBeCloseTo(out[nsamp - 1 - i]!, 5)
    }

    for (let i = 0; i < nsamp; i++) {
      expect(out[i]!).toBeGreaterThanOrEqual(0)
      expect(out[i]!).toBeLessThanOrEqual(1.0)
    }

    expect(ssq).toBeCloseTo(computeSSQ(out), 5)
  })

  it('should handle very small window', () => {
    const nsamp = 1
    const physicalWidth = 1
    const out = new Float32Array(nsamp)

    const ssq = buildWindow('gaussian', nsamp, physicalWidth, out)
    expect(out[0]).toBeGreaterThanOrEqual(0)
    expect(out[0]).toBeLessThanOrEqual(1.0)
    expect(ssq).toBeCloseTo(out[0]! * out[0]!, 5)
  })

  it('should handle large window', () => {
    const nsamp = 10000
    const physicalWidth = 10000
    const out = new Float32Array(nsamp)

    const ssq = buildWindow('hanning', nsamp, physicalWidth, out)
    expect(ssq).toBeGreaterThan(0)

    expect(out[0]).toBeCloseTo(0.0, 4)
    expect(out[nsamp - 1]!).toBeCloseTo(0.0, 4)
  })

  it('should return correct SSQ for all shapes', () => {
    const nsamp = 100
    const physicalWidth = 100
    const shapes = [
      'square',
      'hamming',
      'hanning',
      'bartlett',
      'welch',
      'gaussian',
    ] as const

    shapes.forEach((shape) => {
      const out = new Float32Array(nsamp)
      const ssq = buildWindow(shape, nsamp, physicalWidth, out)
      const computedSSQ = computeSSQ(out)
      expect(ssq).toBeCloseTo(computedSSQ, 5)
    })
  })

  it('should handle physical width different from nsamp', () => {
    const nsamp = 100
    const physicalWidth = 50
    const out = new Float32Array(nsamp)

    buildWindow('gaussian', nsamp, physicalWidth, out)
    const out2 = new Float32Array(nsamp)
    buildWindow('gaussian', nsamp, 100, out2)

    // Narrower physical width concentrates more at center
    expect(Math.abs(out[Math.floor(nsamp / 2)]!)).toBeLessThan(1.0)
  })
})

describe('buildFormantGaussianWindow', () => {
  it('should produce valid gaussian window', () => {
    const nsamp = 100
    const out = new Float32Array(nsamp)
    buildFormantGaussianWindow(nsamp, out)

    for (let i = 0; i < nsamp; i++) {
      expect(out[i]!).toBeGreaterThanOrEqual(0)
      expect(out[i]!).toBeLessThanOrEqual(1.0)
    }
  })

  it('should be symmetric around center', () => {
    const nsamp = 100
    const out = new Float32Array(nsamp)
    buildFormantGaussianWindow(nsamp, out)

    for (let i = 0; i < nsamp / 2; i++) {
      expect(out[i]).toBeCloseTo(out[nsamp - 1 - i]!, 5)
    }
  })

  it('should peak at center', () => {
    const nsamp = 100
    const out = new Float32Array(nsamp)
    buildFormantGaussianWindow(nsamp, out)

    const center = Math.floor(nsamp / 2)
    const peakVal = out[center]!

    for (let i = 0; i < nsamp; i++) {
      expect(out[i]!).toBeLessThanOrEqual(peakVal)
    }
  })

  it('should handle different window sizes', () => {
    for (const nsamp of [1, 10, 100, 1000]) {
      const out = new Float32Array(nsamp)
      buildFormantGaussianWindow(nsamp, out)

      for (let i = 0; i < nsamp; i++) {
        expect(out[i]!).toBeGreaterThanOrEqual(0)
        expect(out[i]!).toBeLessThanOrEqual(1.0)
      }
    }
  })

  it('should handle edge case of size 1', () => {
    const out = new Float32Array(1)
    buildFormantGaussianWindow(1, out)

    expect(out[0]).toBeGreaterThanOrEqual(0)
    expect(out[0]).toBeLessThanOrEqual(1.0)
  })
})
