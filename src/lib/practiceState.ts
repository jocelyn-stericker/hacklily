// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AudioSpan } from './audio/AudioSpan'

export type VoicedRange = {
  startSec: number
  endSec: number
}

export type PracticeTake = {
  id: number
  span: AudioSpan
  endTimeSec: number
  createdAt: number
  voicedRanges: VoicedRange[]
}

export type PracticeState = {
  takes: PracticeTake[]
  nextTakeId: number
  referenceTakeId: number | null
  recording: boolean
  recordingStartTime: number | null
  playingTakeId: number | null
  playingSkipSilence: boolean
  sessionPhase: 'idle' | 'recording' | 'playback'
  echoWasHearing: boolean
  echoGateUntilTs: number
  pendingRestart: boolean
  error: string | null
  recordingStartFrame: number
  shuttingDown: boolean
  drillIndex: number
  sentenceCount: number
}

export type PracticeAction =
  | { type: 'START_RECORDING'; startTime: number }
  | {
      type: 'STOP_RECORDING'
      span: AudioSpan
      voicedRanges: VoicedRange[]
      endTimeSec: number
    }
  | { type: 'START_PLAYBACK'; takeId: number; skipSilence: boolean }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'PIN_TAKE'; takeId: number }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_SESSION_PHASE'; phase: PracticeState['sessionPhase'] }
  | { type: 'STOP_SESSION' }
  | { type: 'ECHO_SPEECH_HEARD' }
  | { type: 'ECHO_UTTERANCE_DONE' }
  | { type: 'PENDING_RESTART' }
  | { type: 'ECHO_COOLDOWN'; untilTs: number }
  | { type: 'ECHO_GATE_BLOCK' }
  | { type: 'ECHO_RESET_GATE' }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SHUTTING_DOWN'; value: boolean }
  | { type: 'SET_DRILL_INDEX'; index: number }
  | { type: 'SET_SENTENCE_COUNT'; count: number }

export function initialPracticeState(): PracticeState {
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
    pendingRestart: false,
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
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        recording: true,
        recordingStartTime: action.startTime,
        sessionPhase: 'recording',
        echoWasHearing: false,
        echoGateUntilTs: 0,
        pendingRestart: false,
        recordingStartFrame: 0,
        shuttingDown: false,
      }

    case 'STOP_RECORDING': {
      const newTake: PracticeTake = {
        id: state.nextTakeId,
        span: action.span,
        endTimeSec: action.endTimeSec,
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
        echoWasHearing: false,
        echoGateUntilTs: 0,
        pendingRestart: false,
        shuttingDown: false,
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
        echoWasHearing: false,
        echoGateUntilTs: 0,
        pendingRestart: false,
        shuttingDown: false,
      }

    case 'ECHO_SPEECH_HEARD':
      return { ...state, echoWasHearing: true }

    case 'ECHO_UTTERANCE_DONE':
      return {
        ...state,
        echoWasHearing: false,
        echoGateUntilTs: Infinity,
      }

    case 'PENDING_RESTART':
      return { ...state, pendingRestart: true }

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
