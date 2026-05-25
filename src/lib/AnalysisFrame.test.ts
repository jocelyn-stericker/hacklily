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

import type { AnalysisChunk, AnalysisFrame } from './AnalysisFrame'
import { computeDbBounds, frameTimeSec } from './AnalysisFrame'

const DEFAULT_PARAMS = {
  timeStepSamples: 882,
  sampleRate: 44100,
  freqStepHz: 20,
  firstBinHz: 0,
}

function makeChunk(frames: AnalysisFrame[], startTimeSec = 0): AnalysisChunk {
  return { ...DEFAULT_PARAMS, frames, startTimeSec }
}

function makeFrame(
  spectrum: Float32Array,
  overrides: Partial<AnalysisFrame> = {},
): AnalysisFrame {
  return {
    pitchDetected: false,
    speechDetected: false,
    f0: 0,
    f1: null,
    f2: null,
    f3: null,
    rms: 0,
    speechProbability: 0,
    spectrum,
    ...overrides,
  }
}

describe('computeDbBounds', () => {
  describe('basic dB conversion', () => {
    it('converts spectrum values to dB correctly', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([1.0]))]),
      ])
      expect(result).not.toBeNull()
      expect(result?.min).toBeCloseTo(0, 2)
      expect(result?.max).toBeCloseTo(0, 2)
    })

    it('converts power values using correct formula', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([100.0]))]),
      ])
      expect(result?.max).toBeCloseTo(20, 1)
    })
  })

  describe('edge cases', () => {
    it('returns null for empty frames array', () => {
      const result = computeDbBounds([])
      expect(result).toBeNull()
    })

    it('returns null when all spectrum values are zero or negative', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([0, -1, -100]))]),
      ])
      expect(result).toBeNull()
    })

    it('ignores zero and negative values in spectrum', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([1.0, 0, -5, 10.0, -0.5]))]),
      ])
      expect(result).not.toBeNull()
      expect(result?.min).toBeCloseTo(0, 2)
      expect(result?.max).toBeCloseTo(10, 1)
    })

    it('caps minimum dB at -120', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([1e-15]))]),
      ])
      expect(result?.min).toBeCloseTo(-120, 1)
    })

    it('handles single frame with no valid spectrum values', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([0, 0, 0]))]),
      ])
      expect(result).toBeNull()
    })
  })

  describe('range specification', () => {
    it('respects from and to range parameters', () => {
      const chunk = makeChunk([
        makeFrame(new Float32Array([1.0])),
        makeFrame(new Float32Array([100.0])),
        makeFrame(new Float32Array([1000.0])),
      ])
      const result = computeDbBounds([chunk], 1, 2)
      expect(result?.max).toBeCloseTo(20, 1)
    })

    it('handles from=to (empty range)', () => {
      const result = computeDbBounds(
        [makeChunk([makeFrame(new Float32Array([100.0]))])],
        0,
        0,
      )
      expect(result).toBeNull()
    })

    it('processes multiple frames with varying spectrum values', () => {
      const frames = Array.from({ length: 10 }, (_, i) =>
        makeFrame(new Float32Array([10 ** (i / 10)])),
      )
      const result = computeDbBounds([makeChunk(frames)])
      expect(result).not.toBeNull()
      expect(result!.max).toBeGreaterThan(result!.min)
    })
  })

  describe('voiced and unvoiced frames', () => {
    it('processes both voiced and unvoiced frames equally', () => {
      const spectrum = new Float32Array([50.0])
      const voicedFrame = makeFrame(spectrum, {
        pitchDetected: true,
        speechDetected: true,
        rms: 0.5,
        f0: 200,
        f1: 700,
        f2: 1200,
        f3: 2500,
      })
      const unvoicedFrame = makeFrame(spectrum, { rms: 0.3 })

      const voicedResult = computeDbBounds([makeChunk([voicedFrame])])
      const unvoicedResult = computeDbBounds([makeChunk([unvoicedFrame])])

      expect(voicedResult?.max).toBeCloseTo(unvoicedResult?.max ?? 0, 2)
      expect(voicedResult?.min).toBeCloseTo(unvoicedResult?.min ?? 0, 2)
    })
  })

  describe('numerical edge cases', () => {
    it('handles very large spectrum values', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([1e10]))]),
      ])
      expect(result).not.toBeNull()
      expect(isFinite(result?.max ?? 0)).toBe(true)
    })

    it('handles mixed positive and negative values (ignoring negatives)', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([0.1, -10, 10, -100, 100]))]),
      ])
      expect(result?.max).toBeCloseTo(20, 1)
      expect(result?.min).toBeCloseTo(-10, 1)
    })
  })
})

// timeStepSec = 882 / 44100 = 0.02s per frame
const STEP = DEFAULT_PARAMS.timeStepSamples / DEFAULT_PARAMS.sampleRate

describe('frameTimeSec', () => {
  const empty = makeFrame(new Float32Array(1))

  it('returns 0 for empty chunks array', () => {
    expect(frameTimeSec([], 0)).toBe(0)
  })

  it('returns correct time for first frame of single chunk', () => {
    const chunk = makeChunk([empty, empty, empty], 0)
    expect(frameTimeSec([chunk], 0)).toBeCloseTo(0)
  })

  it('returns correct time for a mid-chunk frame', () => {
    const chunk = makeChunk([empty, empty, empty], 5)
    expect(frameTimeSec([chunk], 2)).toBeCloseTo(5 + 2 * STEP)
  })

  it('returns end-of-chunk time when index equals chunk length (boundary falls to next chunk)', () => {
    const chunk0 = makeChunk([empty, empty], 0)
    const chunk1 = makeChunk([empty, empty], 2 * STEP)
    // globalIndex 2 == end of chunk0 == start of chunk1
    expect(frameTimeSec([chunk0, chunk1], 2)).toBeCloseTo(2 * STEP)
  })

  it('correctly indexes into second chunk', () => {
    const chunk0 = makeChunk([empty, empty], 0)
    const chunk1 = makeChunk([empty, empty], 2 * STEP)
    expect(frameTimeSec([chunk0, chunk1], 3)).toBeCloseTo(2 * STEP + 1 * STEP)
  })

  it('returns total duration when index is past all frames', () => {
    const chunk = makeChunk([empty, empty], 0)
    expect(frameTimeSec([chunk], 10)).toBeCloseTo(2 * STEP)
  })
})
