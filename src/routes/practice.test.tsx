// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import type { AudioSpan } from '#/lib/audio/AudioSpan'

function computeVoicedRanges(
  decisions: boolean[],
  fromIdx: number,
  toIdx: number,
  timePerFrame: number,
  baseTimeSec: number,
): Array<{ startSec: number; endSec: number }> {
  const ranges: Array<{ startSec: number; endSec: number }> = []
  let runStart = -1
  const end = Math.min(toIdx, decisions.length)
  for (let i = fromIdx; i < end; i++) {
    if (decisions[i]) {
      if (runStart === -1) runStart = i
    } else if (runStart !== -1) {
      ranges.push({
        startSec: baseTimeSec + (runStart - fromIdx) * timePerFrame,
        endSec: baseTimeSec + (i - fromIdx) * timePerFrame,
      })
      runStart = -1
    }
  }
  if (runStart !== -1) {
    ranges.push({
      startSec: baseTimeSec + (runStart - fromIdx) * timePerFrame,
      endSec: baseTimeSec + (end - fromIdx) * timePerFrame,
    })
  }
  return ranges
}

// ---------------------------------------------------------------------------
// Take model — matches the shape used by the practice reducer
// ---------------------------------------------------------------------------

type VoicedRange = { startSec: number; endSec: number }

type Take = {
  id: number
  span: AudioSpan
  createdAt: number
  voicedRanges: VoicedRange[]
}

type PracticeState = {
  takes: Take[]
  nextTakeId: number
  referenceTakeId: number | null
  recording: boolean
  recordingStartTime: number | null
  playingTakeId: number | null
  playingSkipSilence: boolean
}

type PracticeAction =
  | { type: 'START_RECORDING'; startTime: number }
  | { type: 'STOP_RECORDING'; span: AudioSpan; voicedRanges: VoicedRange[] }
  | { type: 'START_PLAYBACK'; takeId: number; skipSilence: boolean }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'STAR_TAKE'; takeId: number }
  | { type: 'CLEAR_SESSION' }

function initialPracticeState(): PracticeState {
  return {
    takes: [],
    nextTakeId: 1,
    referenceTakeId: null,
    recording: false,
    recordingStartTime: null,
    playingTakeId: null,
    playingSkipSilence: false,
  }
}

function practiceReducer(
  state: PracticeState,
  action: PracticeAction,
): PracticeState {
  switch (action.type) {
    case 'START_RECORDING':
      return { ...state, recording: true, recordingStartTime: action.startTime }

    case 'STOP_RECORDING': {
      const newTake: Take = {
        id: state.nextTakeId,
        span: action.span,
        createdAt: Date.now(),
        voicedRanges: action.voicedRanges,
      }
      const takes = [newTake, ...state.takes]
      return {
        ...state,
        takes,
        nextTakeId: state.nextTakeId + 1,
        recording: false,
        recordingStartTime: null,
        referenceTakeId: state.referenceTakeId ?? newTake.id,
      }
    }

    case 'START_PLAYBACK':
      return {
        ...state,
        playingTakeId: action.takeId,
        playingSkipSilence: action.skipSilence,
      }

    case 'STOP_PLAYBACK':
      return { ...state, playingTakeId: null, playingSkipSilence: false }

    case 'STAR_TAKE':
      return {
        ...state,
        referenceTakeId:
          state.referenceTakeId === action.takeId ? null : action.takeId,
      }

    case 'CLEAR_SESSION':
      return initialPracticeState()
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function mockSpan(): AudioSpan {
  const aborter = new AbortController()
  return {
    rope: {} as AudioSpan['rope'],
    startTime: 0,
    endTime: Promise.resolve(1),
    signal: aborter.signal,
  }
}

describe('computeVoicedRanges', () => {
  it('returns empty for all-silence', () => {
    const decisions = [false, false, false]
    expect(computeVoicedRanges(decisions, 0, 3, 0.002, 0)).toEqual([])
  })

  it('returns one range for all-speech', () => {
    const decisions = [true, true, true]
    expect(computeVoicedRanges(decisions, 0, 3, 0.01, 0)).toEqual([
      { startSec: 0, endSec: 0.03 },
    ])
  })

  it('returns multiple ranges separated by silence', () => {
    const decisions = [true, false, false, true, true]
    expect(computeVoicedRanges(decisions, 0, 5, 0.01, 0)).toEqual([
      { startSec: 0, endSec: 0.01 },
      { startSec: 0.03, endSec: 0.05 },
    ])
  })

  it('respects fromIdx/toIdx window', () => {
    const decisions = [true, true, true, false, true]
    expect(computeVoicedRanges(decisions, 1, 4, 0.01, 0)).toEqual([
      { startSec: 0, endSec: 0.02 },
    ])
  })

  it('applies baseTimeSec offset', () => {
    const decisions = [true, true]
    expect(computeVoicedRanges(decisions, 0, 2, 0.01, 0.5)).toEqual([
      { startSec: 0.5, endSec: 0.52 },
    ])
  })

  it('closes final run even if end is at decisions length', () => {
    const decisions = [false, true, true]
    expect(computeVoicedRanges(decisions, 0, 3, 0.01, 0)).toEqual([
      { startSec: 0.01, endSec: 0.03 },
    ])
  })

  it('handles fromIdx not at zero correctly', () => {
    const decisions = [true, false, false, true, true, false]
    // Only look at indices 2-5: [false, true, true]
    expect(computeVoicedRanges(decisions, 2, 5, 0.1, 0.5)).toEqual([
      { startSec: 0.6, endSec: 0.8 },
    ])
  })

  it('works with empty decisions array', () => {
    expect(computeVoicedRanges([], 0, 0, 0.01, 0)).toEqual([])
  })

  it('clamps toIdx to decisions length', () => {
    const decisions = [true]
    expect(computeVoicedRanges(decisions, 0, 10, 0.01, 0)).toEqual([
      { startSec: 0, endSec: 0.01 },
    ])
  })
})

describe('practiceReducer', () => {
  it('has correct initial state', () => {
    const state = initialPracticeState()
    expect(state.takes).toEqual([])
    expect(state.nextTakeId).toBe(1)
    expect(state.referenceTakeId).toBeNull()
    expect(state.recording).toBe(false)
    expect(state.recordingStartTime).toBeNull()
    expect(state.playingTakeId).toBeNull()
    expect(state.playingSkipSilence).toBe(false)
  })

  describe('START_RECORDING', () => {
    it('sets recording to true and stores start time', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      expect(state.recording).toBe(true)
      expect(state.recordingStartTime).toBe(1000)
    })
  })

  describe('STOP_RECORDING', () => {
    it('creates a new take and adds it to the front of the list', () => {
      const span = mockSpan()
      const voicedRanges = [{ startSec: 0, endSec: 1 }]
      const state = practiceReducer(initialPracticeState(), {
        type: 'STOP_RECORDING',
        span,
        voicedRanges,
      })

      expect(state.takes).toHaveLength(1)
      expect(state.takes[0]!.id).toBe(1)
      expect(state.takes[0]!.span).toBe(span)
      expect(state.takes[0]!.voicedRanges).toEqual(voicedRanges)
      expect(state.nextTakeId).toBe(2)
      expect(state.recording).toBe(false)
      expect(state.recordingStartTime).toBeNull()
    })

    it('auto-stars the first take as reference', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
      })

      expect(state.referenceTakeId).toBe(1)
    })

    it('keeps existing reference when new take arrives', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
      })
      expect(state.referenceTakeId).toBe(1)

      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
      })
      // Reference should still be the first take
      expect(state.referenceTakeId).toBe(1)
      expect(state.takes).toHaveLength(2)
      expect(state.takes[0]!.id).toBe(2)
      expect(state.takes[1]!.id).toBe(1)
    })

    it('increments nextTakeId', () => {
      let state = initialPracticeState()
      for (let i = 0; i < 3; i++) {
        state = practiceReducer(state, {
          type: 'STOP_RECORDING',
          span: mockSpan(),
          voicedRanges: [],
        })
      }
      expect(state.nextTakeId).toBe(4)
      expect(state.takes).toHaveLength(3)
    })

    it('newest take appears first (newest-first ordering)', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [{ startSec: 0, endSec: 1 }],
      })
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [{ startSec: 0, endSec: 2 }],
      })
      expect(state.takes[0]!.id).toBe(2)
      expect(state.takes[1]!.id).toBe(1)
    })
  })

  describe('START_PLAYBACK', () => {
    it('sets playingTakeId and skipSilence flag', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: true,
      })
      expect(state.playingTakeId).toBe(1)
      expect(state.playingSkipSilence).toBe(true)
    })
  })

  describe('STOP_PLAYBACK', () => {
    it('clears playback state', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: true,
      })
      state = practiceReducer(state, { type: 'STOP_PLAYBACK' })
      expect(state.playingTakeId).toBeNull()
      expect(state.playingSkipSilence).toBe(false)
    })
  })

  describe('STAR_TAKE', () => {
    it('stars a take that is not currently starred', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'STAR_TAKE',
        takeId: 1,
      })
      expect(state.referenceTakeId).toBe(1)
    })

    it('unstars a take that is already starred (toggle)', () => {
      let state = initialPracticeState()
      state = { ...state, referenceTakeId: 1 }
      state = practiceReducer(state, { type: 'STAR_TAKE', takeId: 1 })
      expect(state.referenceTakeId).toBeNull()
    })

    it('switches reference from one take to another', () => {
      let state = initialPracticeState()
      state = { ...state, referenceTakeId: 1 }
      state = practiceReducer(state, { type: 'STAR_TAKE', takeId: 2 })
      expect(state.referenceTakeId).toBe(2)
    })
  })

  describe('CLEAR_SESSION', () => {
    it('resets to initial state', () => {
      let state = initialPracticeState()
      // Build up some state
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
      })
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
      })
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: true,
      })
      state = practiceReducer(state, { type: 'STAR_TAKE', takeId: 1 })

      expect(state.takes).toHaveLength(2)
      expect(state.playingTakeId).toBe(1)

      state = practiceReducer(state, { type: 'CLEAR_SESSION' })
      expect(state).toEqual(initialPracticeState())
    })
  })

  describe('combined scenarios', () => {
    it('recording does not interact with playback state', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      expect(state.recording).toBe(true)
      expect(state.playingTakeId).toBe(1)
    })

    it('clear session during recording stops everything', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      state = practiceReducer(state, { type: 'CLEAR_SESSION' })
      expect(state.recording).toBe(false)
      expect(state.recordingStartTime).toBeNull()
      expect(state.takes).toHaveLength(0)
      expect(state.nextTakeId).toBe(1)
    })
  })
})
