// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AnalysisFrame } from './analysis/AnalysisFrame'
import type { AudioSpan } from './audio/AudioSpan'
import type { Passage } from './passages'

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

/**
 * Reference clip playback state. At most one of `playingTakeId` (a recorded
 * take) and `referencePlayback` (a synthesised reference clip) is non-null at
 * any time — `START_PLAYBACK`/`START_RECORDING` null `referencePlayback`, and
 * `START_REFERENCE` nulls `playingTakeId`. The reducer is the single source of
 * truth for which clip is loaded; `useReferencePlayer` watches this field to
 * drive its `HTMLAudioElement` and reports status back via `REFERENCE_STATUS`.
 *
 * `voiceId` is carried so a reference can later be pinned as a take (decoded to
 * PCM and handed off to the analysis view) and still know which voice produced
 * it.
 */
export type ReferencePlayback = {
  passageId: string
  segmentIndex: number
  voiceId: string
  status: 'loading' | 'playing'
}

/**
 * Which phase the reference-before-take loop is in, so the reducer knows what
 * to do when a clip/take ends. `null` when the loop feature is off or no loop
 * is running — in that case PLAYBACK_ENDED/REFERENCE_ENDED behave as before.
 *
 *   'reference' — the loop is playing the reference for the current sentence
 *                (either a synth clip via referencePlayback, or a pinned take
 *                via playingTakeId). When it ends, the loop starts recording.
 *   'take'      — the loop is playing back the user's just-recorded take. When
 *                it ends, the loop advances/repeats and starts the reference.
 */
export type LoopPhase = 'reference' | 'take' | null

export type PracticeState = {
  takes: PracticeTake[]
  nextTakeId: number
  referenceTakeId: number | null
  recordingStartTime: number | null
  playingTakeId: number | null
  playingSkipSilence: boolean
  referencePlayback: ReferencePlayback | null
  /** Drives the reference→record→playback loop when practicePlayReferenceBeforeTake is on. */
  loopPhase: LoopPhase
  sessionPhase: 'idle' | 'recording' | 'playback'
  audioStartMs: number | null
  voicedStartMs: number | null
  pendingRestart: boolean
  pendingRecordRestart: boolean
  pendingReferenceRestart: boolean
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
  | {
      type: 'START_REFERENCE'
      passageId: string
      segmentIndex: number
      voiceId: string
    }
  | { type: 'REFERENCE_STATUS'; status: ReferencePlayback['status'] }
  | { type: 'STOP_REFERENCE' }
  | { type: 'REFERENCE_ENDED' }
  | { type: 'PLAYBACK_ENDED'; autoAdvance: boolean }
  | { type: 'PIN_TAKE'; takeId: number }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_SESSION_PHASE'; phase: PracticeState['sessionPhase'] }
  | { type: 'SET_LOOP_PHASE'; phase: LoopPhase }
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
    referencePlayback: null,
    loopPhase: null,
    sessionPhase: 'idle',
    voicedStartMs: null,
    audioStartMs: null,
    pendingRestart: false,
    pendingRecordRestart: false,
    pendingReferenceRestart: false,
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
        pendingReferenceRestart: false,
        recordingStartFrame: 0,
        shuttingDown: false,
        playingTakeId: null,
        playingSkipSilence: false,
        referencePlayback: null,
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
        referencePlayback: null,
        pendingReferenceRestart: false,
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

    case 'START_REFERENCE':
      // Starting a reference clip ends any active recording or take playback so
      // only one of the three is ever active. Mirrors START_RECORDING/START_PLAYBACK.
      return {
        ...state,
        sessionPhase: 'idle',
        recordingStartTime: null,
        voicedStartMs: null,
        audioStartMs: null,
        pendingRestart: false,
        pendingRecordRestart: false,
        pendingReferenceRestart: false,
        shuttingDown: false,
        playingTakeId: null,
        playingSkipSilence: false,
        referencePlayback: {
          passageId: action.passageId,
          segmentIndex: action.segmentIndex,
          voiceId: action.voiceId,
          status: 'loading',
        },
      }

    case 'REFERENCE_STATUS':
      return state.referencePlayback
        ? {
            ...state,
            referencePlayback: {
              ...state.referencePlayback,
              status: action.status,
            },
          }
        : state

    case 'STOP_REFERENCE':
      return { ...state, referencePlayback: null }

    case 'REFERENCE_ENDED': {
      // Natural end of a reference clip. When the loop is active and we were
      // in the reference phase, start recording next. Otherwise behave like
      // STOP_REFERENCE (manual stop / feature off). No autoAdvance here:
      // sentence advancing is owned by PLAYBACK_ENDED at the end of the take.
      const base = { ...state, referencePlayback: null }
      if (state.loopPhase === 'reference') {
        return {
          ...base,
          loopPhase: null,
          pendingRecordRestart: true,
        }
      }
      return base
    }

    case 'PLAYBACK_ENDED': {
      const base = {
        ...state,
        playingTakeId: null,
        playingSkipSilence: false,
      }
      // Loop active, reference phase: the pinned take (used as reference)
      // finished playing. Start recording.
      if (state.loopPhase === 'reference') {
        return {
          ...base,
          loopPhase: null,
          pendingRecordRestart: true,
        }
      }
      // Loop active, take phase: the take just finished. Advance/repeat the
      // sentence and start the reference phase next, unless a pinned take is
      // the reference source — in that case no auto-advance.
      if (state.loopPhase === 'take') {
        const pinned = state.referenceTakeId !== null
        const drillIndex =
          action.autoAdvance && state.sentenceCount > 0 && !pinned
            ? (state.drillIndex + 1) % state.sentenceCount
            : state.drillIndex
        return {
          ...base,
          loopPhase: null,
          drillIndex,
          audioStartMs: null,
          pendingRestart: false,
          pendingRecordRestart: false,
          pendingReferenceRestart: true,
        }
      }
      // Loop inactive: original behaviour.
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

    case 'SET_LOOP_PHASE':
      return { ...state, loopPhase: action.phase }

    case 'STOP_SESSION':
      return {
        ...state,
        sessionPhase: 'idle',
        voicedStartMs: null,
        audioStartMs: null,
        pendingRestart: false,
        pendingRecordRestart: false,
        pendingReferenceRestart: false,
        shuttingDown: false,
        loopPhase: null,
        // Defensive: STOP_SESSION ends the recording session, so any dangling
        // playback state is also cleared. Callers normally pair this with an
        // explicit STOP_PLAYBACK/STOP_REFERENCE, but the reducer keeps the
        // invariant on its own.
        playingTakeId: null,
        playingSkipSilence: false,
        referencePlayback: null,
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

/**
 * Given a drillIndex into the displayed (possibly shuffled) `sentences` array,
 * return the corresponding index into the original (synth-script) segment list.
 *
 * For `passage` kind the drill space is the same as the segment space (identity).
 * For `sentenceLists` kind the drill space may be shuffled; this translates back
 * to the flat index used by reference clips.
 */
export function drillIndexToSegmentIndex(
  passage: Passage,
  sentences: readonly string[],
  drillIndex: number,
): number {
  if (passage.kind === 'passage') return drillIndex
  if (passage.kind === 'sentenceLists') {
    const flat = passage.lists.flat()
    const current = sentences[drillIndex]
    return Math.max(0, flat.indexOf(current ?? ''))
  }
  return 0
}

/**
 * Inverse of `drillIndexToSegmentIndex`: given an original segment index
 * (e.g. from tapping a passage sentence), return the corresponding drillIndex
 * into the displayed (possibly shuffled) `sentences` array.
 *
 * `fallbackDrillIndex` is used when the segment index is out of bounds, or
 * when the sentence cannot be found in the displayed array (duplicate
 * sentences always match the first occurrence, which may not be the intended
 * one; callers should generally avoid this case).
 *
 * For `passage` kind the two index spaces are identical.
 * For `sentenceLists` kind the result respects the shuffle order.
 */
export function segmentIndexToDrillIndex(
  passage: Passage,
  sentences: readonly string[],
  segmentIndex: number,
  fallbackDrillIndex: number,
): number {
  if (passage.kind === 'passage') return segmentIndex
  if (passage.kind === 'sentenceLists') {
    const flat = passage.lists.flat()
    const sentence = flat[segmentIndex]
    if (sentence === undefined) return fallbackDrillIndex
    const idx = sentences.indexOf(sentence)
    return idx === -1 ? fallbackDrillIndex : idx
  }
  return fallbackDrillIndex
}
