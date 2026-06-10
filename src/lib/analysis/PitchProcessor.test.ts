// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import { PitchProcessor } from './PitchProcessor'

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

describe('PitchProcessor', () => {
  it('detects a pure 100 Hz sinusoid', () => {
    const sampleRate = 44100
    const signal = generateSinusoid(100, 1, sampleRate)
    const proc = new PitchProcessor(
      { pitchFloorHz: 50, pitchCeilingHz: 300 },
      sampleRate,
    )
    const result = proc.analyze(signal)

    const voiced = result.frames.filter((f) => f.frequencyHz > 0)
    expect(voiced.length).toBeGreaterThan(0)

    const avgFreq =
      voiced.reduce((sum, f) => sum + f.frequencyHz, 0) / voiced.length
    expect(avgFreq).toBeCloseTo(100, 0)
  })

  it('detects a 200 Hz sinusoid', () => {
    const sampleRate = 44100
    const signal = generateSinusoid(200, 1, sampleRate)
    const proc = new PitchProcessor(
      { pitchFloorHz: 75, pitchCeilingHz: 600 },
      sampleRate,
    )
    const result = proc.analyze(signal)

    const voiced = result.frames.filter((f) => f.frequencyHz > 0)
    expect(voiced.length).toBeGreaterThan(0)

    const avgFreq =
      voiced.reduce((sum, f) => sum + f.frequencyHz, 0) / voiced.length
    expect(avgFreq).toBeCloseTo(200, 0)
  })

  it('returns silence for zero signal', () => {
    const sampleRate = 44100
    const signal = new Float32Array(sampleRate)
    const proc = new PitchProcessor(
      { pitchFloorHz: 75, pitchCeilingHz: 600 },
      sampleRate,
    )
    const result = proc.analyze(signal)

    expect(result.frames.length).toBe(0)
  })

  it('marks a low-amplitude frame as unvoiced', () => {
    const sampleRate = 44100
    const signal = new Float32Array(sampleRate)
    // Very small amplitude noise
    for (let i = 0; i < signal.length; i++) {
      signal[i] = 0.0001 * Math.random()
    }

    const proc = new PitchProcessor(
      { pitchFloorHz: 75, pitchCeilingHz: 600, silenceThreshold: 0.05 },
      sampleRate,
    )
    const result = proc.analyze(signal)

    const voiced = result.frames.filter((f) => f.frequencyHz > 0)
    const unvoiced = result.frames.filter((f) => f.frequencyHz === 0)
    // Most frames should be unvoiced for this tiny amplitude
    expect(unvoiced.length).toBeGreaterThan(voiced.length)
  })

  it('respects pitch floor and ceiling', () => {
    const sampleRate = 44100
    const signal = generateSinusoid(150, 1, sampleRate)
    const proc = new PitchProcessor(
      { pitchFloorHz: 200, pitchCeilingHz: 600 },
      sampleRate,
    )
    const result = proc.analyze(signal)

    // 150 Hz is below floor (200 Hz), so should be unvoiced or near zero
    const voiced = result.frames.filter((f) => f.frequencyHz > 0)
    if (voiced.length > 0) {
      const avgFreq =
        voiced.reduce((sum, f) => sum + f.frequencyHz, 0) / voiced.length
      expect(avgFreq).toBeGreaterThanOrEqual(200)
    }
  })

  it('provides consistent timing information', () => {
    const sampleRate = 44100
    const signal = generateSinusoid(100, 1, sampleRate)
    const proc = new PitchProcessor(
      { pitchFloorHz: 75, pitchCeilingHz: 600 },
      sampleRate,
    )
    const result = proc.analyze(signal)

    expect(result.frames.length).toBeGreaterThan(0)
    expect(result.t1Sec).toBeGreaterThanOrEqual(0)
    expect(result.timeStepSec).toBeGreaterThan(0)

    // Frames should have increasing time
    for (let i = 1; i < result.frames.length; i++) {
      expect(result.frames[i]!.timeSec).toBeGreaterThan(
        result.frames[i - 1]!.timeSec,
      )
    }
  })
})
