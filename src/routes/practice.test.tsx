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
  sessionPhase: 'idle' | 'recording' | 'playback'
  echoWasHearing: boolean
  echoGateUntilTs: number
  echoAutoRestart: boolean
  error: string | null
  recordingStartFrame: number
  shuttingDown: boolean
  drillIndex: number
  sentenceCount: number
}

type PracticeAction =
  | { type: 'START_RECORDING'; startTime: number }
  | { type: 'STOP_RECORDING'; span: AudioSpan; voicedRanges: VoicedRange[] }
  | { type: 'START_PLAYBACK'; takeId: number; skipSilence: boolean }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'STAR_TAKE'; takeId: number }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_SESSION_PHASE'; phase: PracticeState['sessionPhase'] }
  | { type: 'STOP_SESSION' }
  | { type: 'ECHO_SPEECH_HEARD' }
  | { type: 'ECHO_UTTERANCE_DONE' }
  | { type: 'ECHO_AUTO_RESTART' }
  | { type: 'ECHO_COOLDOWN'; untilTs: number }
  | { type: 'ECHO_GATE_BLOCK' }
  | { type: 'ECHO_RESET_GATE' }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SHUTTING_DOWN'; value: boolean }
  | { type: 'SET_DRILL_INDEX'; index: number }
  | { type: 'SET_SENTENCE_COUNT'; count: number }

function initialPracticeState(): PracticeState {
  return {
    takes: [],
    nextTakeId: 1,
    referenceTakeId: null,
    recording: false,
    recordingStartTime: null,
    playingTakeId: null,
    playingSkipSilence: false,
    sessionPhase: 'idle',
    echoWasHearing: false,
    echoGateUntilTs: 0,
    echoAutoRestart: false,
    error: null,
    recordingStartFrame: 0,
    shuttingDown: false,
    drillIndex: 0,
    sentenceCount: 0,
  }
}

function practiceReducer(
  state: PracticeState,
  action: PracticeAction,
): PracticeState {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        recording: true,
        recordingStartTime: action.startTime,
        sessionPhase: 'recording',
        echoWasHearing: false,
        echoGateUntilTs: 0,
        echoAutoRestart: false,
        recordingStartFrame: 0,
        shuttingDown: false,
      }

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

    case 'SET_SESSION_PHASE':
      return { ...state, sessionPhase: action.phase }

    case 'STOP_SESSION':
      return {
        ...state,
        sessionPhase: 'idle',
        echoWasHearing: false,
        echoGateUntilTs: 0,
        echoAutoRestart: false,
        shuttingDown: false,
      }

    case 'ECHO_SPEECH_HEARD':
      return { ...state, echoWasHearing: true }

    case 'ECHO_UTTERANCE_DONE':
      return { ...state, echoWasHearing: false, echoGateUntilTs: Infinity }

    case 'ECHO_AUTO_RESTART':
      return { ...state, echoAutoRestart: true }

    case 'ECHO_COOLDOWN':
      return { ...state, echoGateUntilTs: action.untilTs }

    case 'ECHO_GATE_BLOCK':
      return { ...state, echoGateUntilTs: Infinity }

    case 'ECHO_RESET_GATE':
      return { ...state, echoGateUntilTs: 0 }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'SET_SHUTTING_DOWN':
      return { ...state, shuttingDown: action.value }

    case 'SET_DRILL_INDEX':
      return { ...state, drillIndex: action.index }

    case 'SET_SENTENCE_COUNT':
      return { ...state, sentenceCount: action.count }
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
    expect(state.sessionPhase).toBe('idle')
    expect(state.echoWasHearing).toBe(false)
    expect(state.echoGateUntilTs).toBe(0)
    expect(state.echoAutoRestart).toBe(false)
    expect(state.error).toBeNull()
    expect(state.recordingStartFrame).toBe(0)
    expect(state.shuttingDown).toBe(false)
    expect(state.drillIndex).toBe(0)
    expect(state.sentenceCount).toBe(0)
  })

  describe('START_RECORDING', () => {
    it('sets recording to true, resets echo state, and sets session phase', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      expect(state.recording).toBe(true)
      expect(state.recordingStartTime).toBe(1000)
      expect(state.sessionPhase).toBe('recording')
      expect(state.echoWasHearing).toBe(false)
      expect(state.echoGateUntilTs).toBe(0)
      expect(state.echoAutoRestart).toBe(false)
      expect(state.recordingStartFrame).toBe(0)
      expect(state.shuttingDown).toBe(false)
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

    it('clear session resets session phase and echo state', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      state = practiceReducer(state, { type: 'ECHO_SPEECH_HEARD' })
      state = practiceReducer(state, { type: 'ECHO_AUTO_RESTART' })
      state = practiceReducer(state, { type: 'CLEAR_SESSION' })
      expect(state.sessionPhase).toBe('idle')
      expect(state.echoWasHearing).toBe(false)
      expect(state.echoGateUntilTs).toBe(0)
      expect(state.echoAutoRestart).toBe(false)
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
        recording: true,
        echoWasHearing: true,
        echoAutoRestart: true,
      }
      state = practiceReducer(state, {
        type: 'SET_SESSION_PHASE',
        phase: 'playback',
      })
      expect(state.sessionPhase).toBe('playback')
      expect(state.recording).toBe(true)
      expect(state.echoWasHearing).toBe(true)
      expect(state.echoAutoRestart).toBe(true)
    })
  })

  describe('STOP_SESSION', () => {
    it('sets session to idle, resets echo state and shuttingDown', () => {
      let state = initialPracticeState()
      state = {
        ...state,
        sessionPhase: 'recording',
        echoWasHearing: true,
        echoGateUntilTs: 999,
        echoAutoRestart: true,
        shuttingDown: true,
      }
      state = practiceReducer(state, { type: 'STOP_SESSION' })
      expect(state.sessionPhase).toBe('idle')
      expect(state.echoWasHearing).toBe(false)
      expect(state.echoGateUntilTs).toBe(0)
      expect(state.echoAutoRestart).toBe(false)
      expect(state.shuttingDown).toBe(false)
    })

    it('does not affect takes or playback state', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
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

  describe('ECHO_SPEECH_HEARD', () => {
    it('sets echoWasHearing to true', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'ECHO_SPEECH_HEARD',
      })
      expect(state.echoWasHearing).toBe(true)
    })

    it('is idempotent', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'ECHO_SPEECH_HEARD',
      })
      state = practiceReducer(state, { type: 'ECHO_SPEECH_HEARD' })
      expect(state.echoWasHearing).toBe(true)
    })
  })

  describe('ECHO_UTTERANCE_DONE', () => {
    it('clears hearing and blocks gate', () => {
      let state = initialPracticeState()
      state = { ...state, echoWasHearing: true, echoGateUntilTs: 0 }
      state = practiceReducer(state, { type: 'ECHO_UTTERANCE_DONE' })
      expect(state.echoWasHearing).toBe(false)
      expect(state.echoGateUntilTs).toBe(Infinity)
    })
  })

  describe('ECHO_AUTO_RESTART', () => {
    it('sets echoAutoRestart to true', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'ECHO_AUTO_RESTART',
      })
      expect(state.echoAutoRestart).toBe(true)
    })
  })

  describe('ECHO_COOLDOWN', () => {
    it('sets the gate timestamp', () => {
      const now = performance.now()
      const state = practiceReducer(initialPracticeState(), {
        type: 'ECHO_COOLDOWN',
        untilTs: now,
      })
      expect(state.echoGateUntilTs).toBe(now)
    })
  })

  describe('ECHO_GATE_BLOCK', () => {
    it('sets gate to Infinity', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'ECHO_GATE_BLOCK',
      })
      expect(state.echoGateUntilTs).toBe(Infinity)
    })
  })

  describe('ECHO_RESET_GATE', () => {
    it('resets gate to 0', () => {
      let state = initialPracticeState()
      state = { ...state, echoGateUntilTs: Infinity }
      state = practiceReducer(state, { type: 'ECHO_RESET_GATE' })
      expect(state.echoGateUntilTs).toBe(0)
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
    it('full echo cycle: start → hear → utter → autoRestart → playback → cooldown', () => {
      let state = initialPracticeState()

      // Start session
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      expect(state.sessionPhase).toBe('recording')
      expect(state.recording).toBe(true)
      expect(state.echoWasHearing).toBe(false)
      expect(state.echoGateUntilTs).toBe(0)

      // Speech detected
      state = practiceReducer(state, { type: 'ECHO_SPEECH_HEARD' })
      expect(state.echoWasHearing).toBe(true)

      // Utterance ends (silence confirmed)
      state = practiceReducer(state, { type: 'ECHO_UTTERANCE_DONE' })
      expect(state.echoWasHearing).toBe(false)
      expect(state.echoGateUntilTs).toBe(Infinity)

      // Take created, playback starts (auto-restart)
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
      })
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      state = practiceReducer(state, { type: 'ECHO_AUTO_RESTART' })
      expect(state.echoAutoRestart).toBe(true)
      expect(state.playingTakeId).toBe(1)

      // Playback ends → restart recording with cooldown
      state = practiceReducer(state, { type: 'STOP_PLAYBACK' })
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 2000,
      })
      const cooldownTs = performance.now() + 250
      state = practiceReducer(state, {
        type: 'ECHO_COOLDOWN',
        untilTs: cooldownTs,
      })
      expect(state.sessionPhase).toBe('recording')
      expect(state.echoAutoRestart).toBe(false) // reset by START_RECORDING
      expect(state.echoGateUntilTs).toBe(cooldownTs)
    })

    it('explicit playback does not auto-restart', () => {
      let state = initialPracticeState()

      // Start session and record a take
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
      })

      // Explicit playback (user clicked play on a take)
      state = practiceReducer(state, { type: 'ECHO_GATE_BLOCK' })
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      expect(state.echoGateUntilTs).toBe(Infinity)
      expect(state.echoAutoRestart).toBe(false)

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
      state = practiceReducer(state, { type: 'ECHO_SPEECH_HEARD' })

      // End session with speech detected → block gate, close pipeline, save take
      state = practiceReducer(state, { type: 'ECHO_GATE_BLOCK' })
      state = practiceReducer(state, {
        type: 'SET_SESSION_PHASE',
        phase: 'playback',
      })
      state = practiceReducer(state, {
        type: 'STOP_RECORDING',
        span: mockSpan(),
        voicedRanges: [],
      })
      state = practiceReducer(state, { type: 'STOP_SESSION' })

      expect(state.takes).toHaveLength(1)
      expect(state.sessionPhase).toBe('idle')
      expect(state.echoWasHearing).toBe(false)
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
})
