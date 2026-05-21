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

import { preEmphasis } from './preEmphasis'

function computeRMS(signal: Float32Array): number {
  let sum = 0
  for (const val of signal) {
    sum += val * val
  }
  return Math.sqrt(sum / signal.length)
}

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

describe('preEmphasis', () => {
  it('should modify signal in-place', () => {
    const signal = new Float32Array([1, 2, 3, 4, 5])
    const original = new Float32Array(signal)
    preEmphasis(signal, 44100, 50)

    let changed = false
    for (let i = 0; i < signal.length; i++) {
      if (Math.abs(signal[i]! - original[i]!) > 1e-10) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)
  })

  it('should leave first sample unchanged', () => {
    const signal = new Float32Array([1, 2, 3, 4, 5])
    const originalFirst = signal[0]!
    preEmphasis(signal, 44100, 50)

    expect(signal[0]).toBe(originalFirst)
  })

  it('should apply high-pass filtering', () => {
    const lowFreq = generateSineWave(50, 0.1, 44100)
    const lowFreqCopy = new Float32Array(lowFreq)
    preEmphasis(lowFreqCopy, 44100, 50)

    const rmsBefore = computeRMS(lowFreq)
    const rmsAfter = computeRMS(lowFreqCopy)

    expect(rmsAfter).toBeLessThan(rmsBefore)
  })

  it('should attenuate low frequencies more than high frequencies', () => {
    const lowFreq = generateSineWave(100, 0.1, 44100)
    const lowFreqCopy = new Float32Array(lowFreq)
    preEmphasis(lowFreqCopy, 44100, 50)
    const rmsLowAfter = computeRMS(lowFreqCopy)

    const highFreq = generateSineWave(4000, 0.1, 44100)
    const highFreqCopy = new Float32Array(highFreq)
    preEmphasis(highFreqCopy, 44100, 50)
    const rmsHighAfter = computeRMS(highFreqCopy)

    expect(rmsHighAfter).toBeGreaterThan(rmsLowAfter)
  })

  it('should handle DC signal', () => {
    const signal = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5])
    const original = new Float32Array(signal)
    preEmphasis(signal, 44100, 50)

    const rmsBefore = computeRMS(original)
    const rmsAfter = computeRMS(signal)

    expect(rmsAfter).toBeLessThan(rmsBefore * 0.5)
  })

  it('should compute correct filter factor from formula', () => {
    const sampleRate = 44100
    const cutoffHz = 50
    const expectedFactor = Math.exp((-2 * Math.PI * cutoffHz) / sampleRate)

    const signal = new Float32Array([1, 1, 1, 1, 1])
    preEmphasis(signal, sampleRate, cutoffHz)

    const expectedSecond = 1 - expectedFactor
    expect(signal[1]).toBeCloseTo(expectedSecond, 8)
  })

  it('should process backward through signal', () => {
    const signal = new Float32Array([0, 0, 0, 1, 0, 0, 0])
    preEmphasis(signal, 44100, 50)

    // After filtering, signal should be modified
    let changed = false
    for (let i = 1; i < signal.length; i++) {
      if (signal[i] !== 0) changed = true
    }
    expect(changed).toBe(true)
  })

  it('should handle different cutoff frequencies', () => {
    const signal1 = generateSineWave(100, 0.1, 44100)
    const signal1Copy = new Float32Array(signal1)

    const signal2 = generateSineWave(100, 0.1, 44100)
    const signal2Copy = new Float32Array(signal2)

    preEmphasis(signal1Copy, 44100, 10)
    preEmphasis(signal2Copy, 44100, 100)

    const rms1 = computeRMS(signal1Copy)
    const rms2 = computeRMS(signal2Copy)

    expect(rms1).toBeGreaterThan(0)
    expect(rms2).toBeGreaterThan(0)
  })

  it('should handle different sample rates correctly', () => {
    const signal1 = generateSineWave(1000, 0.01, 44100)
    const signal1Copy = new Float32Array(signal1)
    const rms1Before = computeRMS(signal1Copy)

    const signal2 = generateSineWave(1000, 0.01, 96000)
    const signal2Copy = new Float32Array(signal2)
    const rms2Before = computeRMS(signal2Copy)

    preEmphasis(signal1Copy, 44100, 50)
    preEmphasis(signal2Copy, 96000, 50)

    // Both should be filtered (RMS should decrease)
    const rms1After = computeRMS(signal1Copy)
    const rms2After = computeRMS(signal2Copy)
    expect(rms1After).toBeLessThan(rms1Before)
    expect(rms2After).toBeLessThan(rms2Before)
  })

  it('should handle single sample', () => {
    const signal = new Float32Array([1])
    preEmphasis(signal, 44100, 50)
    expect(signal[0]).toBe(1)
  })

  it('should handle very small values', () => {
    const signal = new Float32Array([1e-10, 1e-10, 1e-10, 1e-10])
    preEmphasis(signal, 44100, 50)
    for (const val of signal) {
      expect(isFinite(val)).toBe(true)
    }
  })

  it('should handle large values', () => {
    const signal = new Float32Array([1e6, 1e6, 1e6, 1e6])
    preEmphasis(signal, 44100, 50)
    for (const val of signal) {
      expect(isFinite(val)).toBe(true)
    }
  })

  it('should be reversible with negative cutoff approximation', () => {
    const signal = new Float32Array([0, 1, 0, 0, 0])
    preEmphasis(signal, 44100, 50)

    const factor = Math.exp((-2 * Math.PI * 50) / 44100)

    const expected = new Float32Array([0, 0, 0, 0, 0])
    expected[0] = 0
    expected[1] = 1 - factor * 0
    expected[2] = 0 - factor * 1
    expected[3] = 0 - factor * 0
    expected[4] = 0 - factor * 0

    for (let i = 0; i < signal.length; i++) {
      expect(signal[i]).toBeCloseTo(expected[i]!, 10)
    }
  })

  it('typical speech processing scenario', () => {
    const speech = generateSineWave(200, 0.5, 44100)
    const speechCopy = new Float32Array(speech)

    preEmphasis(speechCopy, 44100, 50)

    const rmsBefore = computeRMS(speech)
    const rmsAfter = computeRMS(speechCopy)

    expect(rmsAfter).toBeLessThan(rmsBefore)
  })
})
