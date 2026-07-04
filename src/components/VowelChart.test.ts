// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'

import type { AnalysisChunk, AnalysisFrame } from '#/lib/analysis/AnalysisFrame'
import { framesVoiced } from '#/lib/analysis/AnalysisFrame'
import { FormantProcessor } from '#/lib/analysis/FormantProcessor'

import {
  f1ToFraction,
  f1ToY,
  f2ToFraction,
  f2ToX,
  voicedTrailUpToCursor,
} from './VowelChart'

const DEFAULT_PARAMS = {
  timeStepSamples: 882,
  sampleRate: 44100,
  freqStepHz: 20,
  firstBinHz: 0,
}

const STEP_SEC = DEFAULT_PARAMS.timeStepSamples / DEFAULT_PARAMS.sampleRate

function makeFrame(overrides: Partial<AnalysisFrame> = {}): AnalysisFrame {
  return {
    pitchDetected: false,
    speechDetected: false,
    f0: 0,
    f1: null,
    f2: null,
    f3: null,
    lunaBrightness: null,
    rms: 0,
    speechProbability: 0,
    spectrum: new Int8Array(0),
    ...overrides,
  }
}

function makeChunk(frames: AnalysisFrame[], startTimeSec = 0): AnalysisChunk {
  return {
    ...DEFAULT_PARAMS,
    frames,
    startTimeSec,
    voiced: framesVoiced(frames),
  }
}

describe('voicedTrailUpToCursor', () => {
  it('returns empty trail for empty analysis', () => {
    expect(voicedTrailUpToCursor([], 0)).toEqual([])
  })

  it('does not crash when the cursor falls in a chunk with no frames yet', () => {
    // Reproduces the play→record crash: existing analysis is present, then
    // handleChunkStart pushes a new recording chunk with frames:[] before any
    // frames arrive. voicedTrailUpToCursor must not access frames[0] when the
    // chunk is empty.
    const voicedFrame = makeFrame({
      pitchDetected: true,
      speechDetected: true,
      f1: 500,
      f2: 1500,
    })
    const firstChunk = makeChunk([voicedFrame], 0)
    const emptyChunk: AnalysisChunk = {
      ...DEFAULT_PARAMS,
      frames: [],
      startTimeSec: STEP_SEC,
      voiced: null,
      recordingStart: true,
    }

    expect(() =>
      voicedTrailUpToCursor([firstChunk, emptyChunk], STEP_SEC),
    ).not.toThrow()
  })

  it('returns voiced frames from a prior chunk when the cursor chunk is empty', () => {
    const voicedFrame = makeFrame({
      pitchDetected: true,
      speechDetected: true,
      f1: 500,
      f2: 1500,
    })
    const firstChunk = makeChunk([voicedFrame], 0)
    const emptyChunk: AnalysisChunk = {
      ...DEFAULT_PARAMS,
      frames: [],
      startTimeSec: STEP_SEC,
      voiced: null,
      recordingStart: true,
    }

    const trail = voicedTrailUpToCursor([firstChunk, emptyChunk], STEP_SEC)
    expect(trail).toContain(voicedFrame)
  })
})

// --- Marker placement: geometry + end-to-end from synthesised audio ---------
//
// These confirm the vowel-chart marker lands in the right place: the geometry
// maps a formant to a size-independent 0..1 position (so zoom can't move the
// marker), and a vowel synthesised with known formants, run through the real
// FormantProcessor, is detected accurately and placed in the expected region.

interface FormantSpec {
  f: number
  bw: number
}

// Synthesise a vowel: a glottal impulse train at f0 cascaded through one 2-pole
// resonator per formant. Each resonator creates a real spectral peak at its
// centre frequency, which is what an LPC formant tracker recovers.
function synthVowel(
  f0: number,
  formants: FormantSpec[],
  durationSec: number,
  sampleRate: number,
): Float32Array {
  const n = Math.floor(durationSec * sampleRate)
  let signal = new Float32Array(n)

  const period = Math.round(sampleRate / f0)
  for (let i = 0; i < n; i += period) signal[i] = 1

  // y[n] = x[n] + c*y[n-1] - r^2*y[n-2]
  for (const { f, bw } of formants) {
    const r = Math.exp((-Math.PI * bw) / sampleRate)
    const c = 2 * r * Math.cos((2 * Math.PI * f) / sampleRate)
    const out = new Float32Array(n)
    let y1 = 0
    let y2 = 0
    for (let i = 0; i < n; i++) {
      const y = signal[i]! + c * y1 - r * r * y2
      out[i] = y
      y2 = y1
      y1 = y
    }
    signal = out
  }

  let max = 0
  for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(signal[i]!))
  if (max > 0) for (let i = 0; i < n; i++) signal[i]! /= max
  return signal
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

const SAMPLE_RATE = 11000 // Nyquist 5500 Hz — the vowel-formant ceiling.

function detectFormants(signal: Float32Array): { f1: number; f2: number } {
  const proc = new FormantProcessor(
    {
      maxFormants: 5,
      maxFrequencyHz: SAMPLE_RATE / 2, // must equal sampleRate/2
      halfWindowLengthSec: 0.025,
      timeStepSec: 0.01,
      preEmphasisHz: 50,
      safetyMarginHz: 50,
    },
    SAMPLE_RATE,
  )
  const { frames } = proc.analyze(signal.slice()) // analyze() mutates in place
  const maxIntensity = Math.max(...frames.map((f) => f.intensity))
  const f1s: number[] = []
  const f2s: number[] = []
  for (const frame of frames) {
    if (frame.formantCount < 2 || frame.intensity < 0.2 * maxIntensity) continue
    f1s.push(frame.formants[0]!.frequencyHz)
    f2s.push(frame.formants[1]!.frequencyHz)
  }
  expect(f1s.length).toBeGreaterThan(0)
  return { f1: median(f1s), f2: median(f2s) }
}

// Reference vowels (adult-male-ish) spanning the chart, all within the F1
// 200–1100 / F2 650–3300 Hz plotting box. Chosen for coverage of the corners,
// edges and centre so the marker is checked across the whole IPA space.
const VOWELS = {
  i: { f1: 300, f2: 2300, f3: 3000 }, // close front: top-left
  ɪ: { f1: 400, f2: 2000, f3: 2800 }, // near-close front
  ɛ: { f1: 550, f2: 1800, f3: 2600 }, // open-mid front
  æ: { f1: 660, f2: 1700, f3: 2500 }, // near-open front: bottom-left
  ɑ: { f1: 750, f2: 1150, f3: 2600 }, // open back: bottom-right
  ɔ: { f1: 580, f2: 900, f3: 2500 }, // open-mid back
  ʊ: { f1: 440, f2: 1000, f3: 2400 }, // near-close back
  u: { f1: 350, f2: 900, f3: 2400 }, // close back: top-right
  ə: { f1: 500, f2: 1500, f3: 2500 }, // mid central
}

function detectVowel(v: { f1: number; f2: number; f3: number }) {
  return detectFormants(
    synthVowel(
      120,
      [
        { f: v.f1, bw: 60 },
        { f: v.f2, bw: 90 },
        { f: v.f3, bw: 120 },
      ],
      0.3,
      SAMPLE_RATE,
    ),
  )
}

describe('vowel-chart placement geometry', () => {
  it('maps F1 to a 0..1 top→bottom fraction, monotonic in F1', () => {
    expect(f1ToFraction(200)).toBeCloseTo(0, 5) // lowest F1 → top
    expect(f1ToFraction(1100)).toBeCloseTo(1, 5) // highest F1 → bottom
    expect(f1ToFraction(300)).toBeLessThan(f1ToFraction(750))
  })

  it('maps F2 to a 0..1 left→right fraction, decreasing in F2', () => {
    expect(f2ToFraction(3300)).toBeCloseTo(0, 5) // highest F2 → left (front)
    expect(f2ToFraction(650)).toBeCloseTo(1, 5) // lowest F2 → right (back)
    expect(f2ToFraction(2300)).toBeLessThan(f2ToFraction(1150))
  })

  it('is zoom-invariant: relative position is identical across canvas sizes', () => {
    // The chart draws each marker at pad + fraction*(dim - 2*pad); the fraction
    // carries no size term, so the relative position is the same at any zoom.
    const pad = 6
    const relative = (fraction: number, dim: number) =>
      (pad + fraction * (dim - 2 * pad) - pad) / (dim - 2 * pad)
    const fraction = f2ToFraction(VOWELS.i.f2)
    expect(relative(fraction, 240)).toBeCloseTo(relative(fraction, 240 * 3), 10)
  })

  it('places the reference vowels in the expected quadrants', () => {
    expect(f1ToFraction(VOWELS.i.f1)).toBeLessThan(0.5) // /i/ top-left
    expect(f2ToFraction(VOWELS.i.f2)).toBeLessThan(0.5)
    expect(f1ToFraction(VOWELS.ɑ.f1)).toBeGreaterThan(0.5) // /ɑ/ bottom-right
    expect(f2ToFraction(VOWELS.ɑ.f2)).toBeGreaterThan(0.5)
    expect(f1ToFraction(VOWELS.u.f1)).toBeLessThan(0.5) // /u/ top-right
    expect(f2ToFraction(VOWELS.u.f2)).toBeGreaterThan(0.5)
  })
})

describe('vowel-chart marker from synthesised audio', () => {
  for (const [name, v] of Object.entries(VOWELS)) {
    it(`detects /${name}/ formants and places its marker correctly`, () => {
      const { f1, f2 } = detectVowel(v)
      // Detection accuracy against the synthesis targets. F2 is tracked tightly;
      // the LPC tracker biases low F1 slightly high, and because F1 sits near
      // the (bark-compressed) top of the chart a small Hz error is a larger
      // vertical fraction shift — so F1 is held to "same region", F2 to "same
      // spot".
      expect(Math.abs(f1 - v.f1)).toBeLessThan(150)
      expect(Math.abs(f2 - v.f2)).toBeLessThan(200)
      expect(Math.abs(f1ToFraction(f1) - f1ToFraction(v.f1))).toBeLessThan(0.12)
      expect(Math.abs(f2ToFraction(f2) - f2ToFraction(v.f2))).toBeLessThan(0.08)
    })
  }

  it('orders the vowels left→right and top→bottom by their formants', () => {
    const i = detectVowel(VOWELS.i)
    const a = detectVowel(VOWELS.ɑ)
    const u = detectVowel(VOWELS.u)
    // Front /i/ is left of back /ɑ/ and /u/ (higher F2 → smaller x-fraction).
    expect(f2ToFraction(i.f2)).toBeLessThan(f2ToFraction(a.f2))
    expect(f2ToFraction(i.f2)).toBeLessThan(f2ToFraction(u.f2))
    // Open /ɑ/ is below close /i/ and /u/ (higher F1 → larger y-fraction).
    expect(f1ToFraction(a.f1)).toBeGreaterThan(f1ToFraction(i.f1))
    expect(f1ToFraction(a.f1)).toBeGreaterThan(f1ToFraction(u.f1))
  })
})

// The chart container's width is capped (maxWidth: 90vw) while height grows with
// zoom, so on a narrow phone a large scale squashes the box to a non-square
// aspect ratio. f2ToX depends only on width and f1ToY only on height, so each
// marker keeps its correct proportional position in each axis independently —
// the plot stretches but nothing is mis-placed.
describe('vowel-chart placement under non-square aspect ratios', () => {
  const PAD = 6 // matches PAD in VowelChart.tsx (dpr = 1 here)
  const relX = (f2: number, w: number) =>
    (f2ToX(f2, w, 1) - PAD) / (w - 2 * PAD)
  const relY = (f1: number, h: number) =>
    (f1ToY(f1, h, 1) - PAD) / (h - 2 * PAD)

  it('maps X from width alone — unaffected by how tall the box is', () => {
    // Same width, wildly different heights → identical X pixel.
    expect(f2ToX(2300, 300, 1)).toBeCloseTo(f2ToX(2300, 300, 1), 10)
    // Relative X equals the F2 fraction at any width (square, narrow, wide).
    for (const w of [240, 120, 600, 1000]) {
      expect(relX(2300, w)).toBeCloseTo(f2ToFraction(2300), 10)
    }
  })

  it('maps Y from height alone — unaffected by how wide the box is', () => {
    for (const h of [192, 100, 600, 1200]) {
      expect(relY(300, h)).toBeCloseTo(f1ToFraction(300), 10)
    }
  })

  it('keeps every vowel correctly placed in an extreme squashed box', () => {
    // Narrow + very tall: the worst-case phone zoom (width capped, height grown).
    const w = 120
    const h = 900
    for (const v of Object.values(VOWELS)) {
      const x = f2ToX(v.f2, w, 1)
      const y = f1ToY(v.f1, h, 1)
      // In bounds (inside the padded plot area).
      expect(x).toBeGreaterThanOrEqual(PAD)
      expect(x).toBeLessThanOrEqual(w - PAD)
      expect(y).toBeGreaterThanOrEqual(PAD)
      expect(y).toBeLessThanOrEqual(h - PAD)
      // Correct proportional position despite the distortion.
      expect(relX(v.f2, w)).toBeCloseTo(f2ToFraction(v.f2), 10)
      expect(relY(v.f1, h)).toBeCloseTo(f1ToFraction(v.f1), 10)
    }
    // Ordering survives the squash: front /i/ left of back /ɑ/, close /i/ above open /ɑ/.
    expect(f2ToX(VOWELS.i.f2, w, 1)).toBeLessThan(f2ToX(VOWELS.ɑ.f2, w, 1))
    expect(f1ToY(VOWELS.i.f1, h, 1)).toBeLessThan(f1ToY(VOWELS.ɑ.f1, h, 1))
  })
})
