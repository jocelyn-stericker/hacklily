// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import type { AnalysisFrame } from '#/lib/analysis/AnalysisFrame'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import {
  computeVoicedRange,
  initialPracticeState,
  practiceReducer,
} from '#/lib/practiceState'

function frame(speechDetected: boolean | null): AnalysisFrame {
  return { speechDetected } as AnalysisFrame
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

describe('computeVoicedRange', () => {
  it('returns zeroed range for all-silence', () => {
    const analysis = [frame(null), frame(false), frame(null)]
    expect(computeVoicedRange(analysis, 0, 3, 0.002, 0)).toEqual({
      startSec: 0,
      endSec: 0,
    })
  })

  it('spans all-speech', () => {
    const analysis = [frame(true), frame(true), frame(true)]
    expect(computeVoicedRange(analysis, 0, 3, 0.01, 0)).toEqual({
      startSec: 0,
      endSec: 0.02,
    })
  })

  it('spans first-to-last voiced frame across silence', () => {
    const analysis = [
      frame(true),
      frame(false),
      frame(false),
      frame(true),
      frame(true),
    ]
    expect(computeVoicedRange(analysis, 0, 5, 0.01, 0)).toEqual({
      startSec: 0,
      endSec: 0.04,
    })
  })

  it('respects fromIdx/toIdx window', () => {
    // The window covers indices 1-3: [true, true, false]
    // last voiced frame is at index 2
    const analysis = [
      frame(true),
      frame(true),
      frame(true),
      frame(false),
      frame(true),
    ]
    expect(computeVoicedRange(analysis, 1, 4, 0.01, 0)).toEqual({
      startSec: 0,
      endSec: 0.01,
    })
  })

  it('applies baseTimeSec offset', () => {
    const analysis = [frame(true), frame(true)]
    expect(computeVoicedRange(analysis, 0, 2, 0.01, 0.5)).toEqual({
      startSec: 0.5,
      endSec: 0.51,
    })
  })

  it('handles leading silence', () => {
    const analysis = [frame(false), frame(true), frame(true)]
    expect(computeVoicedRange(analysis, 0, 3, 0.01, 0)).toEqual({
      startSec: 0.01,
      endSec: 0.02,
    })
  })

  it('handles fromIdx not at zero correctly', () => {
    const analysis = [
      frame(true),
      frame(false),
      frame(false),
      frame(true),
      frame(true),
      frame(false),
    ]
    // Only look at indices 2-5: [false, true, true]
    // last voiced frame is at index 4
    expect(computeVoicedRange(analysis, 2, 5, 0.1, 0.5)).toEqual({
      startSec: 0.6,
      endSec: 0.7,
    })
  })

  it('works with empty analysis array', () => {
    expect(computeVoicedRange([], 0, 0, 0.01, 0)).toEqual({
      startSec: 0,
      endSec: 0,
    })
  })

  it('clamps toIdx to analysis length', () => {
    const analysis = [frame(true)]
    expect(computeVoicedRange(analysis, 0, 10, 0.01, 0)).toEqual({
      startSec: 0,
      endSec: 0,
    })
  })
})

describe('practiceReducer', () => {
  it('has correct initial state', () => {
    const state = initialPracticeState()
    expect(state.takes).toEqual([])
    expect(state.nextTakeId).toBe(1)
    expect(state.referenceTakeId).toBeNull()
    expect(state.recordingStartTime).toBeNull()
    expect(state.playingTakeId).toBeNull()
    expect(state.playingSkipSilence).toBe(false)
    expect(state.sessionPhase).toBe('idle')
    expect(state.voicedStartMs).toBeNull()
    expect(state.pendingRestart).toBe(false)
    expect(state.pendingRecordRestart).toBe(false)
    expect(state.error).toBeNull()
    expect(state.recordingStartFrame).toBe(0)
    expect(state.shuttingDown).toBe(false)
    expect(state.drillIndex).toBe(0)
    expect(state.sentenceCount).toBe(0)
  })

  describe('START_RECORDING', () => {
    it('sets recording to true and resets session state', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      expect(state.recordingStartTime).toBe(1000)
      expect(state.sessionPhase).toBe('recording')
      expect(state.voicedStartMs).toBeNull()
      expect(state.pendingRestart).toBe(false)
      expect(state.recordingStartFrame).toBe(0)
      expect(state.shuttingDown).toBe(false)
    })
  })

  describe('END_TAKE', () => {
    it('creates a new take and adds it to the front of the list', () => {
      const span = mockSpan()
      const voicedRange = { startSec: 0, endSec: 1 }
      const state = practiceReducer(initialPracticeState(), {
        type: 'END_TAKE',
        span,
        voicedRange,
        endTimeSec: 0,
      })

      expect(state.takes).toHaveLength(1)
      expect(state.takes[0]!.id).toBe(1)
      expect(state.takes[0]!.span).toBe(span)
      expect(state.takes[0]!.voicedRange).toEqual(voicedRange)
      expect(state.takes[0]!.endTimeSec).toBe(0)
      expect(state.nextTakeId).toBe(2)
      expect(state.recordingStartTime).toBeNull()
    })

    it('does not auto-set reference on first take', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
      })

      expect(state.referenceTakeId).toBeNull()
    })

    it('keeps existing reference when new take arrives', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
      })
      state = practiceReducer(state, {
        type: 'PIN_TAKE',
        takeId: 1,
      })
      expect(state.referenceTakeId).toBe(1)

      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
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
          type: 'END_TAKE',
          span: mockSpan(),
          voicedRange: { startSec: 0, endSec: 0 },
          endTimeSec: 0,
        })
      }
      expect(state.nextTakeId).toBe(4)
      expect(state.takes).toHaveLength(3)
    })

    it('newest take appears first (newest-first ordering)', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 1 },
        endTimeSec: 0,
      })
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 2 },
        endTimeSec: 0,
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
    it('clears playback state and resets phase', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: true,
      })
      state = practiceReducer(state, { type: 'STOP_PLAYBACK' })
      expect(state.playingTakeId).toBeNull()
      expect(state.playingSkipSilence).toBe(false)
      expect(state.sessionPhase).toBe('idle')
      expect(state.voicedStartMs).toBeNull()
      expect(state.pendingRestart).toBe(false)
      expect(state.shuttingDown).toBe(false)
    })
  })

  describe('PIN_TAKE', () => {
    it('stars a take that is not currently starred', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'PIN_TAKE',
        takeId: 1,
      })
      expect(state.referenceTakeId).toBe(1)
    })

    it('unstars a take that is already starred (toggle)', () => {
      let state = initialPracticeState()
      state = { ...state, referenceTakeId: 1 }
      state = practiceReducer(state, { type: 'PIN_TAKE', takeId: 1 })
      expect(state.referenceTakeId).toBeNull()
    })

    it('switches reference from one take to another', () => {
      let state = initialPracticeState()
      state = { ...state, referenceTakeId: 1 }
      state = practiceReducer(state, { type: 'PIN_TAKE', takeId: 2 })
      expect(state.referenceTakeId).toBe(2)
    })
  })

  describe('CLEAR_SESSION', () => {
    it('resets to initial state', () => {
      let state = initialPracticeState()
      // Build up some state
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
      })
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
      })
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: true,
      })
      state = practiceReducer(state, { type: 'PIN_TAKE', takeId: 1 })

      expect(state.takes).toHaveLength(2)
      expect(state.playingTakeId).toBe(1)

      state = practiceReducer(state, { type: 'CLEAR_SESSION' })
      expect(state).toEqual(initialPracticeState())
    })
  })

  describe('combined scenarios', () => {
    it('recording stops playback', () => {
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
      expect(state.sessionPhase).toBe('recording')
      expect(state.playingTakeId).toBe(null)
    })

    it('clear session during recording stops everything', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      state = practiceReducer(state, { type: 'CLEAR_SESSION' })
      expect(state.sessionPhase).toBe('idle')
      expect(state.recordingStartTime).toBeNull()
      expect(state.takes).toHaveLength(0)
      expect(state.nextTakeId).toBe(1)
    })

    it('clear session resets session phase', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      state = practiceReducer(state, { type: 'UTTERANCE_START' })
      state = practiceReducer(state, { type: 'PENDING_RESTART' })
      state = practiceReducer(state, { type: 'CLEAR_SESSION' })
      expect(state.sessionPhase).toBe('idle')
      expect(state.voicedStartMs).toBeNull()
      expect(state.pendingRestart).toBe(false)
    })
  })

  describe('SET_SESSION_PHASE', () => {
    it('changes session phase', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'SET_SESSION_PHASE',
        phase: 'playback',
      })
      expect(state.sessionPhase).toBe('playback')
    })

    it('does not affect other state', () => {
      let state = initialPracticeState()
      state = {
        ...state,
        sessionPhase: 'recording',
        voicedStartMs: 1000,
        pendingRestart: true,
      }
      state = practiceReducer(state, {
        type: 'SET_SESSION_PHASE',
        phase: 'playback',
      })
      expect(state.sessionPhase).toBe('playback')
      expect(state.voicedStartMs).toBe(1000)
      expect(state.pendingRestart).toBe(true)
    })
  })

  describe('STOP_SESSION', () => {
    it('sets session to idle and resets shuttingDown', () => {
      let state = initialPracticeState()
      state = {
        ...state,
        sessionPhase: 'recording',
        voicedStartMs: 999,
        pendingRestart: true,
        shuttingDown: true,
      }
      state = practiceReducer(state, { type: 'STOP_SESSION' })
      expect(state.sessionPhase).toBe('idle')
      expect(state.voicedStartMs).toBeNull()
      expect(state.pendingRestart).toBe(false)
      expect(state.shuttingDown).toBe(false)
    })

    it('does not affect takes or playback state', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
      })
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      state = practiceReducer(state, { type: 'STOP_SESSION' })
      expect(state.takes).toHaveLength(1)
      expect(state.playingTakeId).toBe(1)
      expect(state.sessionPhase).toBe('idle')
    })
  })

  describe('UTTERANCE_START', () => {
    it('sets voicedStartMs to non-null', () => {
      const before = Date.now()
      const state = practiceReducer(initialPracticeState(), {
        type: 'UTTERANCE_START',
      })
      expect(state.voicedStartMs).not.toBeNull()
      expect(state.voicedStartMs!).toBeGreaterThanOrEqual(before)
    })

    it('is idempotent', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'UTTERANCE_START',
      })
      const first = state.voicedStartMs
      state = practiceReducer(state, { type: 'UTTERANCE_START' })
      expect(state.voicedStartMs).not.toBeNull()
      expect(state.voicedStartMs!).toBeGreaterThanOrEqual(first!)
    })
  })

  describe('PENDING_RESTART', () => {
    it('sets pendingRestart to true', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'PENDING_RESTART',
      })
      expect(state.pendingRestart).toBe(true)
    })
  })

  describe('SET_ERROR', () => {
    it('sets error string', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'SET_ERROR',
        error: 'mic denied',
      })
      expect(state.error).toBe('mic denied')
    })

    it('clears error with null', () => {
      let state = initialPracticeState()
      state = { ...state, error: 'old error' }
      state = practiceReducer(state, { type: 'SET_ERROR', error: null })
      expect(state.error).toBeNull()
    })
  })

  describe('echo state machine integration', () => {
    it('full echo cycle: start → utter → playback → restart', () => {
      let state = initialPracticeState()

      // Start session
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      expect(state.sessionPhase).toBe('recording')
      expect(state.voicedStartMs).toBeNull()

      // Speech detected
      state = practiceReducer(state, { type: 'UTTERANCE_START' })
      expect(state.voicedStartMs).not.toBeNull()

      // Take created, playback starts (auto-restart)
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
      })
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      state = practiceReducer(state, { type: 'PENDING_RESTART' })
      expect(state.pendingRestart).toBe(true)
      expect(state.playingTakeId).toBe(1)

      // Playback ends → restart recording
      state = practiceReducer(state, { type: 'STOP_PLAYBACK' })
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 2000,
      })
      expect(state.sessionPhase).toBe('recording')
      expect(state.pendingRestart).toBe(false) // reset by START_RECORDING
    })

    it('explicit playback does not auto-restart', () => {
      let state = initialPracticeState()

      // Start session and record a take
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
      })

      // Explicit playback (user clicked play on a take)
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      expect(state.pendingRestart).toBe(false)

      // Playback ends → stop session (no auto-restart)
      state = practiceReducer(state, { type: 'STOP_PLAYBACK' })
      state = practiceReducer(state, { type: 'STOP_SESSION' })
      expect(state.sessionPhase).toBe('idle')
    })

    it('stop session during recording saves take', () => {
      let state = initialPracticeState()

      // Start recording
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      state = practiceReducer(state, { type: 'UTTERANCE_START' })

      // End session with speech detected → close pipeline, save take
      state = practiceReducer(state, {
        type: 'SET_SESSION_PHASE',
        phase: 'playback',
      })
      state = practiceReducer(state, {
        type: 'END_TAKE',
        span: mockSpan(),
        voicedRange: { startSec: 0, endSec: 0 },
        endTimeSec: 0,
      })
      state = practiceReducer(state, { type: 'STOP_SESSION' })

      expect(state.takes).toHaveLength(1)
      expect(state.sessionPhase).toBe('idle')
      expect(state.voicedStartMs).toBeNull()
    })
  })

  describe('SET_SHUTTING_DOWN', () => {
    it('sets shuttingDown flag', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, { type: 'SET_SHUTTING_DOWN', value: true })
      expect(state.shuttingDown).toBe(true)
      state = practiceReducer(state, {
        type: 'SET_SHUTTING_DOWN',
        value: false,
      })
      expect(state.shuttingDown).toBe(false)
    })
  })

  describe('SET_DRILL_INDEX', () => {
    it('sets drill index', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'SET_DRILL_INDEX',
        index: 5,
      })
      expect(state.drillIndex).toBe(5)
    })
  })

  describe('SET_SENTENCE_COUNT', () => {
    it('sets sentence count', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'SET_SENTENCE_COUNT',
        count: 42,
      })
      expect(state.sentenceCount).toBe(42)
    })
  })

  describe('DRILL_PREV', () => {
    it('wraps from index 0 to the last sentence', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'SET_SENTENCE_COUNT',
        count: 5,
      })
      state = { ...state, drillIndex: 0 }
      state = practiceReducer(state, { type: 'DRILL_PREV' })
      expect(state.drillIndex).toBe(4)
    })

    it('decrements normally', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'SET_SENTENCE_COUNT',
        count: 5,
      })
      state = { ...state, drillIndex: 3 }
      state = practiceReducer(state, { type: 'DRILL_PREV' })
      expect(state.drillIndex).toBe(2)
    })

    it('is a no-op when sentenceCount is 0', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'DRILL_PREV',
      })
      expect(state.drillIndex).toBe(0)
    })
  })

  describe('DRILL_NEXT', () => {
    it('wraps from the last sentence to index 0', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'SET_SENTENCE_COUNT',
        count: 5,
      })
      state = { ...state, drillIndex: 4 }
      state = practiceReducer(state, { type: 'DRILL_NEXT' })
      expect(state.drillIndex).toBe(0)
    })

    it('increments normally', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'SET_SENTENCE_COUNT',
        count: 5,
      })
      state = { ...state, drillIndex: 2 }
      state = practiceReducer(state, { type: 'DRILL_NEXT' })
      expect(state.drillIndex).toBe(3)
    })

    it('is a no-op when sentenceCount is 0', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'DRILL_NEXT',
      })
      expect(state.drillIndex).toBe(0)
    })
  })

  describe('PLAYBACK_ENDED', () => {
    it('transitions to idle when shuttingDown', () => {
      let state = initialPracticeState()
      state = {
        ...state,
        playingTakeId: 1,
        shuttingDown: true,
        pendingRestart: true,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: false,
      })
      expect(state.playingTakeId).toBeNull()
      expect(state.sessionPhase).toBe('idle')
      expect(state.shuttingDown).toBe(false)
      expect(state.pendingRecordRestart).toBe(false)
    })

    it('transitions to idle when no pending restart', () => {
      let state = initialPracticeState()
      state = { ...state, playingTakeId: 1, pendingRestart: false }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: false,
      })
      expect(state.playingTakeId).toBeNull()
      expect(state.sessionPhase).toBe('idle')
      expect(state.pendingRecordRestart).toBe(false)
    })

    it('sets pendingRecordRestart when restart is pending', () => {
      let state = initialPracticeState()
      state = {
        ...state,
        playingTakeId: 1,
        pendingRestart: true,
        sentenceCount: 5,
        drillIndex: 2,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: false,
      })
      expect(state.pendingRecordRestart).toBe(true)
      expect(state.pendingRestart).toBe(false)
      expect(state.playingTakeId).toBeNull()
      expect(state.drillIndex).toBe(2)
    })

    it('advances drill index when autoAdvance is true', () => {
      let state = initialPracticeState()
      state = {
        ...state,
        playingTakeId: 1,
        pendingRestart: true,
        sentenceCount: 5,
        drillIndex: 2,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: true,
      })
      expect(state.pendingRecordRestart).toBe(true)
      expect(state.drillIndex).toBe(3)
    })

    it('wraps drill index on autoAdvance at last sentence', () => {
      let state = initialPracticeState()
      state = {
        ...state,
        playingTakeId: 1,
        pendingRestart: true,
        sentenceCount: 5,
        drillIndex: 4,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: true,
      })
      expect(state.drillIndex).toBe(0)
    })

    it('does not advance drill when sentenceCount is 0 even with autoAdvance', () => {
      let state = initialPracticeState()
      state = {
        ...state,
        playingTakeId: 1,
        pendingRestart: true,
        sentenceCount: 0,
        drillIndex: 0,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: true,
      })
      expect(state.pendingRecordRestart).toBe(true)
      expect(state.drillIndex).toBe(0)
    })
  })
})
