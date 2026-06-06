/*
 * Pure DSP + Viterbi unit tests (no ONNX). Fixtures cross-checked against the
 * C++/Python reference numbers. Part of the BFA TypeScript port (AGPL-3.0-or-later).
 */
import { describe, it, expect } from 'vitest'

import {
  sliceWindows,
  stitchWindowPredictionsFlat,
  calcSpecLenExt,
  logSoftmaxFrames,
  viterbiDecode,
  assortFrames,
  decodeAlignmentsSimple,
  calculateConfidences,
  rmsNormalize,
} from './decoder'

describe('rmsNormalize', () => {
  it('scales to unit RMS', () => {
    const x = new Float32Array([1, -1, 1, -1])
    const y = rmsNormalize(x)
    let ss = 0
    for (const v of y) ss += v * v
    expect(Math.sqrt(ss / y.length)).toBeCloseTo(1, 6)
  })
  it('passes through all-zero input', () => {
    const y = rmsNormalize(new Float32Array([0, 0, 0]))
    expect(Array.from(y)).toEqual([0, 0, 0])
  })
})

describe('sliceWindows', () => {
  it('matches butterfly window count (160000 samples @ 120/80 ms)', () => {
    const audio = new Float32Array(160000)
    const { numWindows, windowSize } = sliceWindows(audio, 16000, 120, 80)
    expect(windowSize).toBe(1920)
    expect(numWindows).toBe(124) // ((160000-1920)/1280)+1
  })
  it('tiles overlapping windows at the configured stride', () => {
    const audio = new Float32Array(4000)
    for (let i = 0; i < audio.length; i++) audio[i] = i // ramp
    const { windows, numWindows, windowSize } = sliceWindows(
      audio,
      16000,
      120,
      80,
    )
    expect(numWindows).toBeGreaterThanOrEqual(2)
    const stride = (80 * 16000) / 1000 // 1280
    // window 0 maps sample i -> audio[i]; window 1 starts at `stride`.
    expect(windows[0]).toBe(0)
    expect(windows[5]).toBe(5)
    expect(windows[windowSize + 0]).toBe(stride) // window1[0] == audio[1280]
    expect(windows[windowSize + 7]).toBe(stride + 7)
  })
})

describe('calcSpecLenExt', () => {
  it('butterfly wav_len 20141 -> 75 frames', () => {
    expect(calcSpecLenExt(20141, 120, 80, 16000, 10)).toBe(75)
  })
  it('short clip (<= window) scales by ceil', () => {
    // wav_len == half a window -> ceil(10 * 0.5) = 5
    expect(calcSpecLenExt(960, 120, 80, 16000, 10)).toBe(5)
  })
})

describe('stitchWindowPredictionsFlat', () => {
  it('produces total_frames = num_windows_total * fpw / 2', () => {
    const numWindows = 124
    const fpw = 10
    const C = 2
    const flat = new Float32Array(numWindows * fpw * C) // zeros
    const { combined, totalFrames } = stitchWindowPredictionsFlat(
      flat,
      numWindows,
      fpw,
      C,
      160000,
      16000,
      120,
      80,
    )
    expect(totalFrames).toBe(620)
    expect(combined.length).toBe(620 * C)
  })

  it('cosine-weighted average recovers a constant signal', () => {
    // All windows carry the same per-class value -> stitched output equals it.
    const numWindows = 4
    const fpw = 10
    const C = 1
    const flat = new Float32Array(numWindows * fpw * C).fill(3)
    const { combined } = stitchWindowPredictionsFlat(
      flat,
      numWindows,
      fpw,
      C,
      // choose an audio length consistent with numWindows so coverage is full
      1920 + 3 * 1280,
      16000,
      120,
      80,
    )
    // Interior frames (fully covered) must equal the constant 3.
    for (let t = 5; t < combined.length - 5; t++) {
      expect(combined[t]).toBeCloseTo(3, 4)
    }
  })
})

describe('logSoftmaxFrames', () => {
  it('rows exponentiate to a probability distribution', () => {
    const C = 3
    const logits = new Float32Array([1, 2, 3, 0, 0, 0])
    const lp = logSoftmaxFrames(logits, 2, C)
    for (let t = 0; t < 2; t++) {
      let sum = 0
      for (let c = 0; c < C; c++) sum += Math.exp(lp[t * C + c]!)
      expect(sum).toBeCloseTo(1, 5)
    }
    // uniform row -> log(1/3)
    expect(lp[3]).toBeCloseTo(Math.log(1 / 3), 5)
  })
})

describe('viterbiDecode + assortFrames + decodeAlignmentsSimple', () => {
  it('aligns a single target across favoring frames', () => {
    const C = 3
    const T = 4
    const blank = 2
    // class 1 favored in the middle frames, blank at the ends
    // frames t0..t3, classes [0,1,blank]
    const logits = new Float32Array([0, 0, 5, 0, 5, 0, 0, 5, 0, 0, 0, 5])
    const lp = logSoftmaxFrames(logits, T, C)
    const segs = decodeAlignmentsSimple(lp, T, C, [1], blank, true)
    expect(segs).toEqual([
      {
        phonemeId: 1,
        startFrame: 1,
        endFrame: 3,
        targetSeqIdx: 0,
        confidence: 0,
      },
    ])
  })

  it('assortFrames splits on phoneme OR target-index change and drops long blanks', () => {
    //   frames:  1 1 | blank(run 12) | 3 3
    const fp = new Int32Array([1, 1, ...Array(12).fill(2), 3, 3])
    const idx = new Int32Array([0, 0, ...Array(12).fill(-1), 1, 1])
    const segs = assortFrames(fp, idx, /*blank*/ 2, /*ignoreNoise*/ true)
    expect(segs).toEqual([
      {
        phonemeId: 1,
        startFrame: 0,
        endFrame: 2,
        targetSeqIdx: 0,
        confidence: 0,
      },
      {
        phonemeId: 3,
        startFrame: 14,
        endFrame: 16,
        targetSeqIdx: 1,
        confidence: 0,
      },
    ])
  })

  it('viterbiDecode returns per-frame ids of the expected length', () => {
    const C = 3
    const T = 3
    const lp = logSoftmaxFrames(
      new Float32Array([0, 1, 0, 0, 1, 0, 0, 0, 1]),
      T,
      C,
    )
    const ctcPath = [2, 1, 2] // blank, phoneme1, blank
    const ctcIdx = [-1, 0, -1]
    const { framePhonemes, framePhonemesIdx } = viterbiDecode(
      lp,
      T,
      C,
      ctcPath,
      3,
      ctcIdx,
      0,
    )
    expect(framePhonemes.length).toBe(T)
    expect(framePhonemesIdx.length).toBe(T)
  })
})

describe('calculateConfidences', () => {
  it('returns high confidence when the target phoneme dominates all frames', () => {
    const C = 3
    const T = 4
    // Class 1 strongly favored at every frame -> log-softmax ~ log(1) = 0
    const logits = new Float32Array([
      -10, 10, -10, -10, 10, -10, -10, 10, -10, -10, 10, -10,
    ])
    const lp = logSoftmaxFrames(logits, T, C)
    const fs = [
      {
        phonemeId: 1,
        startFrame: 0,
        endFrame: 4,
        targetSeqIdx: 0,
        confidence: 0,
      },
    ]
    const result = calculateConfidences(lp, T, C, fs)
    expect(result).toHaveLength(1)
    expect(result[0]!.confidence).toBeGreaterThan(0.9)
    expect(result[0]!.endFrame).toBe(4)
  })

  it('trims endFrame when trailing frames have low probability', () => {
    const C = 3
    const T = 6
    // Class 1 strong in frames 0–2, weak in frames 3–5
    const logits = new Float32Array([
      -10, 10, -10, -10, 10, -10, -10, 10, -10, 10, -10, -10, 10, -10, -10, 10,
      -10, -10,
    ])
    const lp = logSoftmaxFrames(logits, T, C)
    const fs = [
      {
        phonemeId: 1,
        startFrame: 0,
        endFrame: 6,
        targetSeqIdx: 0,
        confidence: 0,
      },
    ]
    const result = calculateConfidences(lp, T, C, fs)
    expect(result).toHaveLength(1)
    expect(result[0]!.endFrame).toBeLessThan(6)
    expect(result[0]!.confidence).toBeGreaterThan(0)
  })

  it('handles single-frame segments', () => {
    const C = 2
    const T = 1
    const logits = new Float32Array([0, 0])
    const lp = logSoftmaxFrames(logits, T, C)
    const fs = [
      {
        phonemeId: 0,
        startFrame: 0,
        endFrame: 1,
        targetSeqIdx: 0,
        confidence: 0,
      },
    ]
    const result = calculateConfidences(lp, T, C, fs)
    expect(result).toHaveLength(1)
    expect(result[0]!.confidence).toBeCloseTo(0.5, 1)
  })
})
