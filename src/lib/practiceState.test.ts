// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import type { AnalysisFrame } from '#/lib/analysis/AnalysisFrame'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import type { Passage } from '#/lib/passages'
import type { PracticeState } from '#/lib/practiceState'
import {
  computeVoicedRange,
  drillIndexToSegmentIndex,
  initialPracticeState,
  practiceReducer,
  segmentIndexToDrillIndex,
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

// ---------------------------------------------------------------------------
// Test helpers for drill-index mapping
// ---------------------------------------------------------------------------

function passageSegments(
  segments: readonly string[],
  rest?: Partial<Passage>,
): Passage {
  return {
    kind: 'passage',
    id: 'test',
    title: 'Test',
    segments,
    ...rest,
  } as Passage
}

function sentenceLists(
  lists: readonly (readonly string[])[],
  rest?: Partial<Passage>,
): Passage {
  return {
    kind: 'sentenceLists',
    id: 'test',
    title: 'Test',
    lists,
    ...rest,
  } as Passage
}

function blankPassage(rest?: Partial<Passage>): Passage {
  return { kind: 'blank', id: 'test', title: 'Test', ...rest } as Passage
}

// ---------------------------------------------------------------------------
// drillIndexToSegmentIndex / segmentIndexToDrillIndex
// ---------------------------------------------------------------------------

describe('drillIndexToSegmentIndex', () => {
  it('returns drillIndex for passage kind', () => {
    const p = passageSegments(['a', 'b', 'c'])
    const sentences = (p as { segments: readonly string[] }).segments
    expect(drillIndexToSegmentIndex(p, sentences, 0)).toBe(0)
    expect(drillIndexToSegmentIndex(p, sentences, 1)).toBe(1)
    expect(drillIndexToSegmentIndex(p, sentences, 2)).toBe(2)
  })

  it('maps back to flat index for unshuffled sentenceLists', () => {
    const p = sentenceLists([['a', 'b'], ['c']])
    const sentences = ['a', 'b', 'c']
    expect(drillIndexToSegmentIndex(p, sentences, 0)).toBe(0)
    expect(drillIndexToSegmentIndex(p, sentences, 1)).toBe(1)
    expect(drillIndexToSegmentIndex(p, sentences, 2)).toBe(2)
  })

  it('maps shuffled drillIndex to correct flat index', () => {
    // flat = ['a', 'b', 'c'], sentences is shuffled as ['c', 'a', 'b']
    const p = sentenceLists([['a', 'b', 'c']])
    const sentences = ['c', 'a', 'b']
    expect(drillIndexToSegmentIndex(p, sentences, 0)).toBe(2) // 'c' is at flat[2]
    expect(drillIndexToSegmentIndex(p, sentences, 1)).toBe(0) // 'a' is at flat[0]
    expect(drillIndexToSegmentIndex(p, sentences, 2)).toBe(1) // 'b' is at flat[1]
  })

  it('handles multiple list arrays', () => {
    const p = sentenceLists([
      ['a', 'b'],
      ['c', 'd'],
    ])
    const sentences = ['d', 'b', 'a', 'c']
    expect(drillIndexToSegmentIndex(p, sentences, 0)).toBe(3) // 'd' flat[3]
    expect(drillIndexToSegmentIndex(p, sentences, 1)).toBe(1) // 'b' flat[1]
    expect(drillIndexToSegmentIndex(p, sentences, 2)).toBe(0) // 'a' flat[0]
    expect(drillIndexToSegmentIndex(p, sentences, 3)).toBe(2) // 'c' flat[2]
  })

  it('returns 0 for blank passage', () => {
    const p = blankPassage()
    expect(drillIndexToSegmentIndex(p, [], 5)).toBe(0)
  })
})

describe('segmentIndexToDrillIndex', () => {
  it('returns segmentIndex for passage kind', () => {
    const p = passageSegments(['a', 'b', 'c'])
    const sentences = (p as { segments: readonly string[] }).segments
    expect(segmentIndexToDrillIndex(p, sentences, 0, 0)).toBe(0)
    expect(segmentIndexToDrillIndex(p, sentences, 1, 0)).toBe(1)
    expect(segmentIndexToDrillIndex(p, sentences, 2, 0)).toBe(2)
  })

  it('returns segmentIndex for unshuffled sentenceLists', () => {
    const p = sentenceLists([['a', 'b'], ['c']])
    const sentences = ['a', 'b', 'c']
    expect(segmentIndexToDrillIndex(p, sentences, 0, 0)).toBe(0)
    expect(segmentIndexToDrillIndex(p, sentences, 1, 0)).toBe(1)
    expect(segmentIndexToDrillIndex(p, sentences, 2, 0)).toBe(2)
  })

  it('maps flat index to correct shuffled position', () => {
    // flat = ['a', 'b', 'c'], sentences is shuffled as ['c', 'a', 'b']
    const p = sentenceLists([['a', 'b', 'c']])
    const sentences = ['c', 'a', 'b']
    expect(segmentIndexToDrillIndex(p, sentences, 0, 0)).toBe(1) // 'a' at shuffled[1]
    expect(segmentIndexToDrillIndex(p, sentences, 1, 0)).toBe(2) // 'b' at shuffled[2]
    expect(segmentIndexToDrillIndex(p, sentences, 2, 0)).toBe(0) // 'c' at shuffled[0]
  })

  it('round-trips: drillIndex -> segmentIndex -> drillIndex', () => {
    const p = sentenceLists([['a', 'b', 'c', 'd']])
    const sentences = ['d', 'b', 'a', 'c']
    for (let d = 0; d < 4; d++) {
      const seg = drillIndexToSegmentIndex(p, sentences, d)
      const back = segmentIndexToDrillIndex(p, sentences, seg, d)
      expect(back).toBe(d)
    }
  })

  it('returns fallback for out-of-bounds segmentIndex', () => {
    const p = sentenceLists([['a', 'b', 'c']])
    const sentences = ['c', 'a', 'b']
    expect(segmentIndexToDrillIndex(p, sentences, 5, 99)).toBe(99)
    expect(segmentIndexToDrillIndex(p, sentences, -1, 42)).toBe(42)
  })

  it('returns fallback when sentence not in displayed array', () => {
    const p = sentenceLists([['a', 'b', 'c']])
    const sentences = ['x', 'y', 'z']
    // 'a' is at flat[0] but not in sentences -> fallback
    expect(segmentIndexToDrillIndex(p, sentences, 0, 7)).toBe(7)
  })

  it('uses fallback for blank passage', () => {
    const p = blankPassage()
    expect(segmentIndexToDrillIndex(p, [], 3, 42)).toBe(42)
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
    expect(state.referencePlayback).toBeNull()
    expect(state.sessionPhase).toBe('idle')
    expect(state.voicedStartMs).toBeNull()
    expect(state.pendingRestart).toBe(false)
    expect(state.pendingRecordRestart).toBe(false)
    expect(state.pendingReferenceStart).toBe(false)
    expect(state.error).toBeNull()
    expect(state.recordingStartFrame).toBe(0)
    expect(state.shuttingDown).toBe(false)
    expect(state.drillIndex).toBe(0)
    expect(state.sentenceCount).toBe(0)
  })

  describe('START_RECORDING', () => {
    it('clears reference playback (mutual exclusion)', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 0,
        voiceId: 'af_heart',
      })
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      expect(state.referencePlayback).toBeNull()
    })

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

    it('clears reference playback (mutual exclusion)', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 2,
        voiceId: 'af_heart',
      })
      expect(state.referencePlayback).not.toBeNull()
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      expect(state.referencePlayback).toBeNull()
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

  describe('START_REFERENCE', () => {
    it('sets referencePlayback with loading status', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 2,
        voiceId: 'af_heart',
      })
      expect(state.referencePlayback).toEqual({
        passageId: 'rainbow',
        segmentIndex: 2,
        voiceId: 'af_heart',
        status: 'loading',
      })
    })

    it('clears take playback (mutual exclusion)', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 0,
        voiceId: 'af_heart',
      })
      expect(state.playingTakeId).toBeNull()
      expect(state.playingSkipSilence).toBe(false)
      expect(state.referencePlayback).not.toBeNull()
    })

    it('ends active recording (mutual exclusion)', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      expect(state.sessionPhase).toBe('recording')
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 0,
        voiceId: 'af_heart',
      })
      expect(state.sessionPhase).toBe('idle')
      expect(state.recordingStartTime).toBeNull()
      expect(state.referencePlayback).not.toBeNull()
    })
  })

  describe('REFERENCE_STATUS', () => {
    it('updates the status of the current reference', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 1,
        voiceId: 'af_heart',
      })
      state = practiceReducer(state, {
        type: 'REFERENCE_STATUS',
        status: 'playing',
      })
      expect(state.referencePlayback?.status).toBe('playing')
    })

    it('is a no-op when no reference is loaded', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'REFERENCE_STATUS',
        status: 'playing',
      })
      expect(state.referencePlayback).toBeNull()
    })
  })

  describe('STOP_REFERENCE', () => {
    it('clears referencePlayback', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 1,
        voiceId: 'af_heart',
      })
      state = practiceReducer(state, { type: 'STOP_REFERENCE' })
      expect(state.referencePlayback).toBeNull()
    })

    // Regression: Ctrl/Cmd-click arms the reference phase (loopPhase='reference'),
    // then plain-clicking the same sentence stops it. Without clearing loopPhase,
    // loopActive stays true and the mic never closes.
    it('clears loopPhase and pending flags so the loop cannot linger', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'PREPARE_REFERENCE_PHASE',
      })
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 1,
        voiceId: 'af_heart',
      })
      expect(state.loopPhase).toBe('reference')
      state = practiceReducer(state, { type: 'STOP_REFERENCE' })
      expect(state.loopPhase).toBeNull()
      expect(state.pendingReferenceStart).toBe(false)
      expect(state.pendingReferenceRestart).toBe(false)
      expect(state.pendingRecordRestart).toBe(false)
    })
  })

  describe('REFERENCE_ENDED', () => {
    it('clears referencePlayback when no loop is active', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 1,
        voiceId: 'af_heart',
      })
      state = practiceReducer(state, { type: 'REFERENCE_ENDED' })
      expect(state.referencePlayback).toBeNull()
      expect(state.pendingRecordRestart).toBe(false)
      expect(state.loopPhase).toBeNull()
    })

    it('sets pendingRecordRestart when loop is in reference phase', () => {
      let state: PracticeState = {
        ...initialPracticeState(),
        loopPhase: 'reference',
      }
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 1,
        voiceId: 'af_heart',
      })
      state = practiceReducer(state, { type: 'REFERENCE_ENDED' })
      expect(state.referencePlayback).toBeNull()
      expect(state.pendingRecordRestart).toBe(true)
      expect(state.loopPhase).toBeNull()
    })

    it('does not set pendingRecordRestart when loop is in take phase', () => {
      let state: PracticeState = {
        ...initialPracticeState(),
        loopPhase: 'take',
      }
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 1,
        voiceId: 'af_heart',
      })
      state = practiceReducer(state, { type: 'REFERENCE_ENDED' })
      expect(state.referencePlayback).toBeNull()
      expect(state.pendingRecordRestart).toBe(false)
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

    it('clears playback state (defensive mutual exclusion)', () => {
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
      // STOP_SESSION ends the session and defensively clears playback so the
      // invariant (at most one of recording / take / reference active) holds
      // even if a caller forgets to pair it with STOP_PLAYBACK.
      expect(state.takes).toHaveLength(1)
      expect(state.playingTakeId).toBeNull()
      expect(state.referencePlayback).toBeNull()
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
    it('full echo cycle: start -> utter -> playback -> restart', () => {
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

      // Playback ends -> restart recording
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

      // Playback ends -> stop session (no auto-restart)
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

      // End session with speech detected -> close pipeline, save take
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

    it('sets pendingRecordRestart when loopPhase is reference', () => {
      let state: PracticeState = {
        ...initialPracticeState(),
        playingTakeId: 1,
        loopPhase: 'reference',
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: false,
      })
      expect(state.playingTakeId).toBeNull()
      expect(state.loopPhase).toBeNull()
      expect(state.pendingRecordRestart).toBe(true)
      expect(state.drillIndex).toBe(0)
    })

    it('advances drill when loopPhase is take and autoAdvance on', () => {
      let state: PracticeState = {
        ...initialPracticeState(),
        playingTakeId: 1,
        loopPhase: 'take',
        drillIndex: 2,
        sentenceCount: 5,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: true,
      })
      expect(state.playingTakeId).toBeNull()
      expect(state.loopPhase).toBeNull()
      expect(state.drillIndex).toBe(3)
      expect(state.pendingReferenceRestart).toBe(true)
    })

    it('does not advance drill when loopPhase is take and no autoAdvance', () => {
      let state: PracticeState = {
        ...initialPracticeState(),
        playingTakeId: 1,
        loopPhase: 'take',
        drillIndex: 2,
        sentenceCount: 5,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: false,
      })
      expect(state.drillIndex).toBe(2)
      expect(state.pendingReferenceRestart).toBe(true)
    })

    it('does not advance drill when loopPhase is take and a take is pinned', () => {
      let state: PracticeState = {
        ...initialPracticeState(),
        playingTakeId: 1,
        referenceTakeId: 5,
        loopPhase: 'take',
        drillIndex: 2,
        sentenceCount: 5,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: true,
      })
      // Pinned reference suppresses auto-advance even when autoAdvance is on.
      expect(state.drillIndex).toBe(2)
      expect(state.pendingReferenceRestart).toBe(true)
    })

    it('wraps drill when loopPhase is take and autoAdvance at last sentence', () => {
      let state: PracticeState = {
        ...initialPracticeState(),
        playingTakeId: 1,
        loopPhase: 'take',
        drillIndex: 4,
        sentenceCount: 5,
      }
      state = practiceReducer(state, {
        type: 'PLAYBACK_ENDED',
        autoAdvance: true,
      })
      expect(state.drillIndex).toBe(0)
    })
  })

  describe('PREPARE_REFERENCE_PHASE', () => {
    it('arms pendingReferenceStart and sets loopPhase', () => {
      const state = practiceReducer(initialPracticeState(), {
        type: 'PREPARE_REFERENCE_PHASE',
      })
      expect(state.loopPhase).toBe('reference')
      expect(state.pendingReferenceStart).toBe(true)
      expect(state.sessionPhase).toBe('idle')
      expect(state.referencePlayback).toBeNull()
      expect(state.playingTakeId).toBeNull()
    })

    it('clears an active recording and take playback', () => {
      let state = initialPracticeState()
      state = practiceReducer(state, {
        type: 'START_RECORDING',
        startTime: 1000,
      })
      state = practiceReducer(state, { type: 'UTTERANCE_START' })
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
      state = practiceReducer(state, {
        type: 'PREPARE_REFERENCE_PHASE',
      })
      expect(state.recordingStartTime).toBeNull()
      expect(state.playingTakeId).toBeNull()
      expect(state.voicedStartMs).toBeNull()
    })

    it('is cleared by START_REFERENCE', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'PREPARE_REFERENCE_PHASE',
      })
      state = practiceReducer(state, {
        type: 'START_REFERENCE',
        passageId: 'rainbow',
        segmentIndex: 0,
        voiceId: 'af_heart',
      })
      expect(state.pendingReferenceStart).toBe(false)
      expect(state.referencePlayback).not.toBeNull()
    })

    it('is cleared by START_PLAYBACK (pinned-take reference)', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'PREPARE_REFERENCE_PHASE',
      })
      state = practiceReducer(state, {
        type: 'START_PLAYBACK',
        takeId: 1,
        skipSilence: false,
      })
      expect(state.pendingReferenceStart).toBe(false)
      expect(state.playingTakeId).toBe(1)
    })

    it('is cleared by STOP_REFERENCE', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'PREPARE_REFERENCE_PHASE',
      })
      state = practiceReducer(state, { type: 'STOP_REFERENCE' })
      expect(state.pendingReferenceStart).toBe(false)
    })

    it('is cleared by STOP_SESSION', () => {
      let state = practiceReducer(initialPracticeState(), {
        type: 'PREPARE_REFERENCE_PHASE',
      })
      state = practiceReducer(state, { type: 'STOP_SESSION' })
      expect(state.pendingReferenceStart).toBe(false)
      expect(state.loopPhase).toBeNull()
    })
  })
})
