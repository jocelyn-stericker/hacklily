// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AnalysisFrame } from './analysis/AnalysisFrame'
import type { AudioSpan } from './audio/AudioSpan'

export type Range = {
  startSec: number
  endSec: number
}

export type PracticeTake = {
  id: number
  span: AudioSpan
  endTimeSec: number
  createdAt: number
  voicedRange: Range
}

export type PracticeState = {
  takes: PracticeTake[]
  nextTakeId: number
  referenceTakeId: number | null
  recordingStartTime: number | null
  playingTakeId: number | null
  playingSkipSilence: boolean
  sessionPhase: 'idle' | 'recording' | 'playback'
  audioStartMs: number | null
  voicedStartMs: number | null
  pendingRestart: boolean
  pendingRecordRestart: boolean
  error: string | null
  recordingStartFrame: number
  shuttingDown: boolean
  drillIndex: number
  sentenceCount: number
}

export type PracticeAction =
  | { type: 'START_RECORDING'; startTime: number }
  | {
      type: 'END_TAKE'
      span: AudioSpan
      voicedRange: Range
      endTimeSec: number
    }
  | { type: 'START_PLAYBACK'; takeId: number; skipSilence: boolean }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'PLAYBACK_ENDED'; autoAdvance: boolean }
  | { type: 'PIN_TAKE'; takeId: number }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_SESSION_PHASE'; phase: PracticeState['sessionPhase'] }
  | { type: 'STOP_SESSION' }
  | { type: 'AUDIO_START' }
  | { type: 'UTTERANCE_START' }
  | { type: 'PENDING_RESTART' }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SHUTTING_DOWN'; value: boolean }
  | { type: 'SET_DRILL_INDEX'; index: number }
  | { type: 'SET_SENTENCE_COUNT'; count: number }
  | { type: 'DRILL_PREV' }
  | { type: 'DRILL_NEXT' }

export function computeVoicedRange(
  analysis: AnalysisFrame[],
  fromIdx: number,
  toIdx: number,
  timePerFrame: number,
  baseTimeSec: number,
): Range {
  let firstVoicedIdx = -1
  let lastVoicedIdx = -1
  const end = Math.min(toIdx, analysis.length)
  for (let i = fromIdx; i < end; i++) {
    if (analysis[i]?.speechDetected) {
      if (firstVoicedIdx === -1) firstVoicedIdx = i
      lastVoicedIdx = i
    }
  }
  return {
    startSec:
      firstVoicedIdx !== -1
        ? baseTimeSec + (firstVoicedIdx - fromIdx) * timePerFrame
        : 0,
    endSec:
      lastVoicedIdx !== -1
        ? baseTimeSec + (lastVoicedIdx - fromIdx) * timePerFrame
        : 0,
  }
}

export function initialPracticeState(): PracticeState {
  return {
    takes: [],
    nextTakeId: 1,
    referenceTakeId: null,
    recordingStartTime: null,
    playingTakeId: null,
    playingSkipSilence: false,
    sessionPhase: 'idle',
    voicedStartMs: null,
    audioStartMs: null,
    pendingRestart: false,
    pendingRecordRestart: false,
    error: null,
    recordingStartFrame: 0,
    shuttingDown: false,
    drillIndex: 0,
    sentenceCount: 0,
  }
}

export function practiceReducer(
  state: PracticeState,
  action: PracticeAction,
): PracticeState {
  console.log(action)
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        recordingStartTime: action.startTime,
        sessionPhase: 'recording',
        voicedStartMs: null,
        audioStartMs: null,
        pendingRestart: false,
        pendingRecordRestart: false,
        recordingStartFrame: 0,
        shuttingDown: false,
        playingTakeId: null,
        playingSkipSilence: false,
      }

    case 'END_TAKE': {
      const newTake: PracticeTake = {
        id: state.nextTakeId,
        span: action.span,
        endTimeSec: action.endTimeSec,
        createdAt: Date.now(),
        voicedRange: action.voicedRange,
      }
      const takes = [newTake, ...state.takes]
      return {
        ...state,
        takes,
        nextTakeId: state.nextTakeId + 1,
        recordingStartTime: null,
      }
    }

    case 'START_PLAYBACK':
      return {
        ...state,
        playingTakeId: action.takeId,
        playingSkipSilence: action.skipSilence,
      }

    case 'STOP_PLAYBACK':
      return {
        ...state,
        playingTakeId: null,
        playingSkipSilence: false,
        sessionPhase: 'idle',
        voicedStartMs: null,
        audioStartMs: null,
        pendingRestart: false,
        pendingRecordRestart: false,
        shuttingDown: false,
      }

    case 'PLAYBACK_ENDED': {
      const base = {
        ...state,
        playingTakeId: null,
        playingSkipSilence: false,
      }
      if (state.shuttingDown || !state.pendingRestart) {
        return {
          ...base,
          sessionPhase:
            state.sessionPhase === 'playback' ? 'idle' : state.sessionPhase,
          voicedStartMs: null,
          audioStartMs: null,
          pendingRestart: false,
          pendingRecordRestart: false,
          shuttingDown: false,
        }
      }
      const drillIndex =
        action.autoAdvance && state.sentenceCount > 0
          ? (state.drillIndex + 1) % state.sentenceCount
          : state.drillIndex
      return {
        ...base,
        drillIndex,
        audioStartMs: null,
        pendingRestart: false,
        pendingRecordRestart: true,
      }
    }

    case 'PIN_TAKE':
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
        voicedStartMs: null,
        audioStartMs: null,
        pendingRestart: false,
        pendingRecordRestart: false,
        shuttingDown: false,
      }

    case 'AUDIO_START':
      return { ...state, audioStartMs: Date.now() }

    case 'UTTERANCE_START':
      return { ...state, voicedStartMs: Date.now() }

    case 'PENDING_RESTART':
      return { ...state, pendingRestart: true }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'SET_SHUTTING_DOWN':
      return { ...state, shuttingDown: action.value }

    case 'SET_DRILL_INDEX':
      return { ...state, drillIndex: action.index }

    case 'SET_SENTENCE_COUNT':
      return { ...state, sentenceCount: action.count }

    case 'DRILL_PREV':
      return {
        ...state,
        drillIndex:
          state.sentenceCount > 0
            ? (state.drillIndex + state.sentenceCount - 1) % state.sentenceCount
            : state.drillIndex,
      }

    case 'DRILL_NEXT':
      return {
        ...state,
        drillIndex:
          state.sentenceCount > 0
            ? (state.drillIndex + 1) % state.sentenceCount
            : state.drillIndex,
      }
  }
}
