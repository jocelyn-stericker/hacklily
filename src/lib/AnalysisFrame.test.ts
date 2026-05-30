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
import {
  computeDbMax,
  frameTimeSec,
  framesVoiced,
  totalFrames,
  getFrame,
  frameDbMax,
} from './AnalysisFrame'

const DEFAULT_PARAMS = {
  timeStepSamples: 882,
  sampleRate: 44100,
  freqStepHz: 20,
  firstBinHz: 0,
}

function makeChunk(frames: AnalysisFrame[], startTimeSec = 0): AnalysisChunk {
  return {
    ...DEFAULT_PARAMS,
    frames,
    startTimeSec,
    voiced: framesVoiced(frames),
  }
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

describe('computeDbMax', () => {
  describe('basic dB conversion', () => {
    it('converts spectrum values to dB correctly', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([1.0]))]),
      ])
      expect(result).toBeCloseTo(0, 2)
    })

    it('converts power values using correct formula', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([100.0]))]),
      ])
      expect(result).toBeCloseTo(20, 1)
    })
  })

  describe('edge cases', () => {
    it('returns null for empty frames array', () => {
      const result = computeDbMax([])
      expect(result).toBeNull()
    })

    it('returns null when all spectrum values are zero or negative', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([0, -1, -100]))]),
      ])
      expect(result).toBeNull()
    })

    it('ignores zero and negative values in spectrum', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([1.0, 0, -5, 10.0, -0.5]))]),
      ])
      expect(result).toBeCloseTo(10, 1)
    })

    it('handles single frame with no valid spectrum values', () => {
      const result = computeDbMax([
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
      const result = computeDbMax([chunk], 1, 2)
      expect(result).toBeCloseTo(20, 1)
    })

    it('handles from=to (empty range)', () => {
      const result = computeDbMax(
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
      const result = computeDbMax([makeChunk(frames)])
      expect(result).not.toBeNull()
      expect(isFinite(result!)).toBe(true)
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

      const voicedResult = computeDbMax([makeChunk([voicedFrame])])
      const unvoicedResult = computeDbMax([makeChunk([unvoicedFrame])])

      expect(voicedResult).toBeCloseTo(unvoicedResult ?? 0, 2)
    })
  })

  describe('numerical edge cases', () => {
    it('handles very large spectrum values', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([1e10]))]),
      ])
      expect(result).not.toBeNull()
      expect(isFinite(result!)).toBe(true)
    })

    it('handles mixed positive and negative values (ignoring negatives)', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([0.1, -10, 10, -100, 100]))]),
      ])
      expect(result).toBeCloseTo(20, 1)
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

describe('totalFrames', () => {
  const emptyFrame = makeFrame(new Float32Array(1))

  it('returns 0 for empty chunks array', () => {
    expect(totalFrames([])).toBe(0)
  })

  it('returns frame count for single chunk', () => {
    const chunk = makeChunk([emptyFrame, emptyFrame, emptyFrame])
    expect(totalFrames([chunk])).toBe(3)
  })

  it('sums frames across multiple chunks', () => {
    const chunk1 = makeChunk([emptyFrame, emptyFrame])
    const chunk2 = makeChunk([emptyFrame, emptyFrame, emptyFrame])
    const chunk3 = makeChunk([emptyFrame])
    expect(totalFrames([chunk1, chunk2, chunk3])).toBe(6)
  })
})

describe('getFrame', () => {
  const f1 = makeFrame(new Float32Array([1]))
  const f2 = makeFrame(new Float32Array([2]))
  const f3 = makeFrame(new Float32Array([3]))
  const f4 = makeFrame(new Float32Array([4]))
  const f5 = makeFrame(new Float32Array([5]))

  it('returns undefined for empty chunks', () => {
    expect(getFrame([], 0)).toBeUndefined()
  })

  it('returns first frame from first chunk', () => {
    const chunk = makeChunk([f1, f2, f3])
    const frame = getFrame([chunk], 0)
    expect(frame?.spectrum[0]).toBe(1)
  })

  it('returns frame within single chunk', () => {
    const chunk = makeChunk([f1, f2, f3])
    const frame = getFrame([chunk], 2)
    expect(frame?.spectrum[0]).toBe(3)
  })

  it('returns undefined for index past all frames', () => {
    const chunk = makeChunk([f1, f2])
    expect(getFrame([chunk], 10)).toBeUndefined()
  })

  it('spans multiple chunks correctly', () => {
    const chunk1 = makeChunk([f1, f2])
    const chunk2 = makeChunk([f3, f4, f5])
    expect(getFrame([chunk1, chunk2], 0)?.spectrum[0]).toBe(1)
    expect(getFrame([chunk1, chunk2], 1)?.spectrum[0]).toBe(2)
    expect(getFrame([chunk1, chunk2], 2)?.spectrum[0]).toBe(3)
    expect(getFrame([chunk1, chunk2], 4)?.spectrum[0]).toBe(5)
  })

  it('returns undefined when index exceeds all frames across chunks', () => {
    const chunk1 = makeChunk([f1, f2])
    const chunk2 = makeChunk([f3])
    expect(getFrame([chunk1, chunk2], 5)).toBeUndefined()
  })
})

describe('frameDbMax', () => {
  it('returns null for frame with no positive spectrum values', () => {
    const frame = makeFrame(new Float32Array([0, -1, -100]))
    expect(frameDbMax(frame)).toBeNull()
  })

  it('converts single value to dB correctly', () => {
    const frame = makeFrame(new Float32Array([1.0]))
    expect(frameDbMax(frame)).toBeCloseTo(0, 2)
  })

  it('finds maximum dB value among positive spectrum values', () => {
    const frame = makeFrame(new Float32Array([1.0, 10.0, 100.0, 5.0]))
    expect(frameDbMax(frame)).toBeCloseTo(10 * Math.log10(100.0), 1)
  })

  it('ignores zero and negative values', () => {
    const frame = makeFrame(new Float32Array([0.1, 0, -5, 10.0, -100, 1.0]))
    expect(frameDbMax(frame)).toBeCloseTo(10 * Math.log10(10.0), 1)
  })

  it('handles very small positive values', () => {
    const frame = makeFrame(new Float32Array([0.00001]))
    expect(frameDbMax(frame)).toBeLessThan(0)
  })

  it('handles very large values', () => {
    const frame = makeFrame(new Float32Array([1e10]))
    const result = frameDbMax(frame)
    expect(result).not.toBeNull()
    expect(isFinite(result!)).toBe(true)
    expect(result).toBeGreaterThan(50)
  })
})
