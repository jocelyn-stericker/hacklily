// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import { FftTables, complexFFTForward, complexFFTInverse } from './fft'

describe('FftTables', () => {
  it('constructs valid twiddle factors for power-of-2 sizes', () => {
    const tables = new FftTables(8)
    expect(tables.N).toBe(8)
    expect(tables.cosTable.length).toBe(4)
    expect(tables.sinTable.length).toBe(4)
    expect(tables.bitRev.length).toBe(8)
  })

  it('rejects non-power-of-2 sizes', () => {
    expect(() => new FftTables(3)).toThrow()
    expect(() => new FftTables(5)).toThrow()
    expect(() => new FftTables(7)).toThrow()
    expect(() => new FftTables(100)).toThrow()
  })

  it('rejects N < 2', () => {
    expect(() => new FftTables(0)).toThrow()
    expect(() => new FftTables(1)).toThrow()
  })

  it('computes correct twiddle factors', () => {
    const tables = new FftTables(4)
    expect(tables.cosTable[0]).toBeCloseTo(1, 5)
    expect(tables.sinTable[0]).toBeCloseTo(0, 5)
    expect(tables.cosTable[1]).toBeCloseTo(0, 5)
    expect(tables.sinTable[1]).toBeCloseTo(-1, 5)
  })

  it('computes correct bit-reversal permutation', () => {
    const tables = new FftTables(8)
    const expectedBitRev = [0, 4, 2, 6, 1, 5, 3, 7]
    for (let i = 0; i < 8; i++) {
      expect(tables.bitRev[i]).toBe(expectedBitRev[i])
    }
  })

  it('constructs tables for large power-of-2 sizes', () => {
    const tables = new FftTables(1024)
    expect(tables.N).toBe(1024)
    expect(tables.cosTable.length).toBe(512)
    expect(tables.sinTable.length).toBe(512)
  })
})

describe('complexFFTForward and complexFFTInverse', () => {
  it('performs FFT on real sinusoid', () => {
    const N = 16
    const tables = new FftTables(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)

    for (let i = 0; i < N; i++) {
      re[i] = Math.sin((2 * Math.PI * 2 * i) / N)
    }

    complexFFTForward(re, im, tables)

    let maxPower = 0
    let maxBin = 0
    for (let k = 0; k < N; k++) {
      const power = re[k]! * re[k]! + im[k]! * im[k]!
      if (power > maxPower) {
        maxPower = power
        maxBin = k
      }
    }
    expect([2, 14]).toContain(maxBin)
  })

  it('reconstructs signal from FFT (round-trip test)', () => {
    const N = 32
    const tables = new FftTables(N)
    const original = new Float32Array(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)

    for (let i = 0; i < N; i++) {
      original[i] = (i + 1) * 0.1
      re[i] = original[i]!
    }

    complexFFTForward(re, im, tables)
    complexFFTInverse(re, im, tables)

    const scale = 1.0 / N
    for (let i = 0; i < N; i++) {
      expect(re[i]! * scale).toBeCloseTo(original[i]!, 4)
      expect(im[i]! * scale).toBeCloseTo(0, 5)
    }
  })

  it('handles DC component correctly', () => {
    const N = 8
    const tables = new FftTables(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)

    for (let i = 0; i < N; i++) {
      re[i] = 5
    }

    complexFFTForward(re, im, tables)

    const dcPower = re[0]! * re[0]!
    for (let k = 1; k < N; k++) {
      const power = re[k]! * re[k]! + im[k]! * im[k]!
      expect(power).toBeLessThan(dcPower * 0.1)
    }
  })

  it('detects zero signal', () => {
    const N = 16
    const tables = new FftTables(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)

    complexFFTForward(re, im, tables)

    for (let k = 0; k < N; k++) {
      expect(Math.abs(re[k]!)).toBeLessThan(1e-6)
      expect(Math.abs(im[k]!)).toBeLessThan(1e-6)
    }
  })

  it('performs IFFT on frequency-domain data', () => {
    const N = 16
    const tables = new FftTables(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)

    re[3] = 8
    im[3] = 0

    complexFFTInverse(re, im, tables)

    let sum = 0,
      maxVal = 0
    for (let i = 0; i < N; i++) {
      sum += Math.abs(re[i]!)
      maxVal = Math.max(maxVal, Math.abs(re[i]!))
    }
    expect(sum).toBeGreaterThan(1)
    expect(maxVal).toBeLessThan(100)
  })

  it('is in-place (modifies input arrays)', () => {
    const N = 8
    const tables = new FftTables(N)
    const re = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8])
    const im = new Float32Array(8)
    const originalRe = new Float32Array(re)

    complexFFTForward(re, im, tables)

    let changed = false
    for (let i = 0; i < N; i++) {
      if (re[i] !== originalRe[i]) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)
  })

  it('handles complex input correctly', () => {
    const N = 8
    const tables = new FftTables(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)

    const k = 2
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N
      re[n] = Math.cos(angle)
      im[n] = Math.sin(angle)
    }

    complexFFTForward(re, im, tables)

    const maxPower = Math.max(
      ...[...Array(N).keys()].map((i) => re[i]! * re[i]! + im[i]! * im[i]!),
    )
    const binKPower = re[k]! * re[k]! + im[k]! * im[k]!
    expect(binKPower).toBeGreaterThan(maxPower * 0.5)
  })

  it('round-trip with complex data', () => {
    const N = 32
    const tables = new FftTables(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)
    const origRe = new Float32Array(N)
    const origIm = new Float32Array(N)

    for (let i = 0; i < N; i++) {
      re[i] = origRe[i] = Math.sin(i * 0.7)
      im[i] = origIm[i] = Math.cos(i * 0.3)
    }

    complexFFTForward(re, im, tables)
    complexFFTInverse(re, im, tables)

    const scale = 1.0 / N
    for (let i = 0; i < N; i++) {
      expect(re[i]! * scale).toBeCloseTo(origRe[i]!, 4)
      expect(im[i]! * scale).toBeCloseTo(origIm[i]!, 4)
    }
  })

  it('Parseval equality holds (energy conservation)', () => {
    const N = 64
    const tables = new FftTables(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)

    const mean = N / 2
    const sigma = N / 6
    for (let i = 0; i < N; i++) {
      const x = (i - mean) / sigma
      re[i] = Math.exp(-0.5 * x * x)
    }

    let timeEnergy = 0
    for (let i = 0; i < N; i++) {
      timeEnergy += re[i]! * re[i]!
    }

    complexFFTForward(re, im, tables)

    let freqEnergy = 0
    for (let k = 0; k < N; k++) {
      freqEnergy += re[k]! * re[k]! + im[k]! * im[k]!
    }
    freqEnergy /= N

    expect(freqEnergy).toBeCloseTo(timeEnergy, 3)
  })

  it('symmetric FFT for real input (conjugate symmetry)', () => {
    const N = 16
    const tables = new FftTables(N)
    const re = new Float32Array(N)
    const im = new Float32Array(N)

    for (let i = 0; i < N; i++) {
      re[i] = i + 1
    }

    complexFFTForward(re, im, tables)

    for (let k = 1; k < N / 2; k++) {
      const reK = re[k]!
      const imK = im[k]!
      const reNMinusK = re[N - k]!
      const imNMinusK = im[N - k]!
      expect(reK).toBeCloseTo(reNMinusK, 3)
      expect(-imK).toBeCloseTo(imNMinusK, 3)
    }
  })
})
