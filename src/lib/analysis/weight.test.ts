// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import type { AnalysisFrame, AnalysisParams } from './AnalysisFrame'
import { powerToInt8, SILENCE_INT8 } from './AnalysisFrame'
import {
  weight,
  PRE_EMPHASIS_CUTOFF_HZ,
  TILT_LOW_HZ,
  TILT_HIGH_HZ,
} from './weight'

// Mirrors analyzeBuffer / SpectrogramWorker: 2 ms grid, 20 Hz bins to 5.5 kHz.
const PARAMS: AnalysisParams = {
  timeStepSamples: 96, // 2 ms at 48 kHz
  sampleRate: 48000,
  freqStepHz: 20,
  firstBinHz: 10,
}
const NUM_BINS = 275 // bins to 5.5 kHz, matching the shipping spectrogram

// The pre-emphasis power gain weight divides out; tests bake
// it *into* synthetic spectra so the de-emphasized result is a known shape.
function preEmphasisGain(freqHz: number): number {
  const a = Math.exp(
    (-2 * Math.PI * PRE_EMPHASIS_CUTOFF_HZ) / PARAMS.sampleRate,
  )
  return (
    1 + a * a - 2 * a * Math.cos((2 * Math.PI * freqHz) / PARAMS.sampleRate)
  )
}

/** A voiced frame whose *de-emphasized* power at bin frequency f is
 *  `powerAt(f)` (linear), stored the way the frame builders store it:
 *  pre-emphasized, then quantized to int8 dB. */
function frameWithPower(
  powerAt: (freqHz: number) => number,
  pitchDetected = true,
): AnalysisFrame {
  const spectrum = new Int8Array(NUM_BINS)
  for (let k = 0; k < NUM_BINS; k++) {
    const freq = PARAMS.firstBinHz + k * PARAMS.freqStepHz
    const p = powerAt(freq)
    spectrum[k] = p > 0 ? powerToInt8(p * preEmphasisGain(freq)) : SILENCE_INT8
  }
  return {
    spectrum,
    rms: 0.1,
    speechProbability: 1,
    pitchDetected,
    speechDetected: true,
    f0: pitchDetected ? 150 : 0,
    f1: null,
    f2: null,
    f3: null,
    lunaBrightness: null,
    weight: null,
  }
}

describe('weight', () => {
  it('recovers the alpha ratio of a flat spectrum (de-emphasis undone)', () => {
    // Flat de-emphasized power → band energies proportional to bandwidth:
    // 10·log10(4000/950) ≈ +6.24 dB. Bin-centre discretization (20 Hz bins
    // offset 10 Hz from band edges) and ±0.25 dB quantization leave ~0.1 dB
    // of slack against the continuous-bandwidth expectation.
    const flat = frameWithPower(() => 1e-4)
    const tiltDb = weight(flat.spectrum, PARAMS)
    const expected =
      10 *
      Math.log10(
        (TILT_HIGH_HZ[1] - TILT_HIGH_HZ[0]) / (TILT_LOW_HZ[1] - TILT_LOW_HZ[0]),
      )
    expect(tiltDb).not.toBeNull()
    expect(Math.abs(tiltDb! - expected)).toBeLessThan(0.2)
  })

  it('reads steep negative tilt when energy is low-band only', () => {
    const lowOnly = frameWithPower((f) => (f < 800 ? 1e-3 : 1e-9))
    const tiltDb = weight(lowOnly.spectrum, PARAMS)
    expect(tiltDb).not.toBeNull()
    expect(tiltDb!).toBeLessThan(-30)
  })

  it('handles frames with empty spectra (realtime placeholders)', () => {
    const empty: AnalysisFrame = {
      ...frameWithPower(() => 1e-4),
      spectrum: new Int8Array(0),
    }
    expect(weight(empty.spectrum, PARAMS)).toEqual(null)
  })
})
