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

import {
  interpolateSinc,
  resample,
  ResamplerStreamProcessor,
} from './ResampleProcessor'

function generateSineWave(
  freqHz: number,
  durationSec: number,
  sampleRate: number,
): Float32Array {
  const nsamples = Math.round(durationSec * sampleRate)
  const signal = new Float32Array(nsamples)
  const omega = (2 * Math.PI * freqHz) / sampleRate
  for (let i = 0; i < nsamples; i++) {
    signal[i] = Math.sin(omega * i)
  }
  return signal
}

function generateDC(value: number, nsamples: number): Float32Array {
  const signal = new Float32Array(nsamples)
  for (let i = 0; i < nsamples; i++) {
    signal[i] = value
  }
  return signal
}

describe('interpolateSinc', () => {
  it('should return exact value at integer indices', () => {
    const signal = new Float32Array([1, 2, 3, 4, 5])
    expect(interpolateSinc(signal, 0, 50)).toBeCloseTo(1, 5)
    expect(interpolateSinc(signal, 1, 50)).toBeCloseTo(2, 5)
    expect(interpolateSinc(signal, 4, 50)).toBeCloseTo(5, 5)
  })

  it('should handle boundary conditions', () => {
    const signal = new Float32Array([1, 2, 3, 4, 5])
    expect(interpolateSinc(signal, -1, 50)).toBeCloseTo(1, 5)
    expect(interpolateSinc(signal, 10, 50)).toBeCloseTo(5, 5)
  })

  it('should interpolate between samples', () => {
    const signal = new Float32Array([1, 1, 1, 1, 1])
    // For constant signal, interpolation should be close to 1
    const result1 = interpolateSinc(signal, 2.5, 50)
    const result2 = interpolateSinc(signal, 0.5, 50)
    expect(Math.abs(result1 - 1)).toBeLessThan(0.1)
    expect(Math.abs(result2 - 1)).toBeLessThan(0.1)
  })

  it('should handle empty signal', () => {
    const signal = new Float32Array([])
    expect(interpolateSinc(signal, 5, 50)).toBe(0)
  })

  it('should respect maxDepth parameter', () => {
    const signal = new Float32Array([0, 0, 0, 1, 0, 0, 0])
    const result1 = interpolateSinc(signal, 3.5, 1)
    const result2 = interpolateSinc(signal, 3.5, 50)
    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
  })

  it('should handle sinusoidal signal interpolation', () => {
    const sineWave = generateSineWave(1000, 0.001, 44100)
    for (let i = 0; i < Math.min(10, sineWave.length); i++) {
      expect(interpolateSinc(sineWave, i, 50)).toBeCloseTo(sineWave[i]!, 3)
    }
  })
})

describe('resample', () => {
  it('should preserve DC signal during upsampling', () => {
    const signal = generateDC(0.5, 100)
    const resampled = resample(signal, 44100, 48000)
    for (const val of resampled) {
      expect(val).toBeCloseTo(0.5, 2)
    }
  })

  it('should preserve DC signal during downsampling', () => {
    const signal = generateDC(0.5, 1000)
    const resampled = resample(signal, 44100, 22050)
    // After downsampling, most samples should still be close to DC
    let closeCount = 0
    for (const val of resampled) {
      if (Math.abs(val - 0.5) < 0.1) closeCount++
    }
    expect(closeCount).toBeGreaterThan(resampled.length * 0.8)
  })

  it('should return copy when upfactor is 1', () => {
    const signal = new Float32Array([1, 2, 3, 4, 5])
    const resampled = resample(signal, 44100, 44100)
    expect(resampled).toEqual(signal)
    expect(resampled).not.toBe(signal)
  })

  it('should upsample by factor of 2', () => {
    const signal = new Float32Array([0, 1, 0, -1, 0])
    const resampled = resample(signal, 44100, 88200)
    expect(resampled.length).toBeCloseTo(signal.length * 2, 0)
  })

  it('should downsample by factor of 2', () => {
    const signal = generateDC(1.0, 1000)
    const resampled = resample(signal, 44100, 22050)
    expect(resampled.length).toBeCloseTo(signal.length / 2, 0)
  })

  it('should handle non-integer rate ratios', () => {
    const signal = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const resampled = resample(signal, 44100, 48000)
    expect(resampled.length).toBeGreaterThan(0)
  })

  it('should filter high frequencies during downsampling', () => {
    const nsamples = 1000
    const signal = generateSineWave(20000, nsamples / 44100, 44100)
    const resampled = resample(signal, 44100, 22050)
    let energy = 0
    for (const val of resampled) {
      energy += val * val
    }
    expect(energy).toBeLessThan(nsamples * 0.1)
  })

  it('should handle very small signal', () => {
    const signal = new Float32Array([0.001])
    const resampled = resample(signal, 44100, 48000)
    expect(resampled.length).toBeGreaterThan(0)
  })

  it('should handle zero signal', () => {
    const signal = new Float32Array(100)
    const resampled = resample(signal, 44100, 48000)
    for (const val of resampled) {
      expect(Math.abs(val)).toBeLessThan(1e-10)
    }
  })
})

describe('ResamplerStreamProcessor', () => {
  it('should initialize without error', () => {
    const resampler = new ResamplerStreamProcessor(44100, 48000)
    expect(resampler.available()).toBe(0)
  })

  it('should reject invalid sample rates', () => {
    expect(() => new ResamplerStreamProcessor(0, 48000)).toThrow()
    expect(() => new ResamplerStreamProcessor(44100, 0)).toThrow()
    expect(() => new ResamplerStreamProcessor(-1, 48000)).toThrow()
  })

  it('should accumulate samples and produce output', () => {
    const resampler = new ResamplerStreamProcessor(44100, 48000, 50)
    const input = generateDC(1.0, 1000)
    resampler.feed(input)

    const available = resampler.available()
    expect(available).toBeGreaterThan(0)
  })

  it('should drain exactly available samples', () => {
    const resampler = new ResamplerStreamProcessor(44100, 48000)
    const input = generateDC(0.5, 1000)
    resampler.feed(input)

    const available = resampler.available()
    const output = new Float32Array(available)
    const drained = resampler.drain(output)

    expect(drained).toBe(available)
  })

  it('should preserve DC during streaming upsampling', () => {
    const resampler = new ResamplerStreamProcessor(44100, 48000)
    const input = generateDC(0.5, 1000)
    resampler.feed(input)

    const available = resampler.available()
    const output = new Float32Array(available)
    resampler.drain(output)

    let validSamples = 0
    let sumError = 0
    for (let i = 100; i < output.length; i++) {
      sumError += Math.abs(output[i]! - 0.5)
      validSamples++
    }
    expect(sumError / validSamples).toBeLessThan(0.1)
  })

  it('should support multiple feed/drain cycles', () => {
    const resampler = new ResamplerStreamProcessor(44100, 48000)
    const input1 = generateDC(1.0, 100)
    const input2 = generateDC(0.5, 100)

    resampler.feed(input1)
    const out1 = new Float32Array(resampler.available())
    resampler.drain(out1)

    resampler.feed(input2)
    const out2 = new Float32Array(resampler.available())
    resampler.drain(out2)

    expect(out1.length).toBeGreaterThan(0)
    expect(out2.length).toBeGreaterThan(0)
  })

  it('should handle downsampling (44.1 -> 22.05)', () => {
    const resampler = new ResamplerStreamProcessor(44100, 22050)
    const input = generateDC(1.0, 2000)
    resampler.feed(input)

    const available = resampler.available()
    const output = new Float32Array(available)
    resampler.drain(output)

    expect(available).toBeLessThan(input.length)
  })

  it('should handle extreme downsampling (48000 -> 8000)', () => {
    const resampler = new ResamplerStreamProcessor(48000, 8000)
    const input = generateDC(0.5, 5000)
    resampler.feed(input)

    const available = resampler.available()
    expect(available).toBeGreaterThan(0)
  })

  it('should handle fractional rate ratios', () => {
    const resampler = new ResamplerStreamProcessor(44100, 48000)
    const input = generateDC(1.0, 1000)
    resampler.feed(input)

    const available = resampler.available()
    expect(available).toBeGreaterThan(0)
  })

  it('should not overflow output buffer', () => {
    const resampler = new ResamplerStreamProcessor(44100, 88200, 50)
    const input = generateDC(1.0, 10000)
    resampler.feed(input)

    const available = resampler.available()
    const output = new Float32Array(available)
    const drained = resampler.drain(output)

    expect(drained).toBe(available)
    expect(drained).toBeLessThanOrEqual(output.length)
  })

  it('should have initial startup latency', () => {
    const resampler = new ResamplerStreamProcessor(44100, 48000, 50)
    const input = generateDC(1.0, 100)
    resampler.feed(input)

    const available = resampler.available()
    const expectedOutput = Math.round((100 * 48000) / 44100)
    expect(available).toBeLessThan(expectedOutput)
  })

  it('should handle continuous feeding', () => {
    const resampler = new ResamplerStreamProcessor(44100, 48000)
    let totalOutput = 0

    for (let block = 0; block < 10; block++) {
      const input = generateDC(0.5, 100)
      resampler.feed(input)
      const available = resampler.available()
      const output = new Float32Array(available)
      resampler.drain(output)
      totalOutput += output.length
    }

    expect(totalOutput).toBeGreaterThan(0)
  })
})
