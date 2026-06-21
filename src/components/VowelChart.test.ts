// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'

import type { AnalysisChunk, AnalysisFrame } from '#/lib/analysis/AnalysisFrame'
import { framesVoiced } from '#/lib/analysis/AnalysisFrame'

import { voicedTrailUpToCursor } from './VowelChart'

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
