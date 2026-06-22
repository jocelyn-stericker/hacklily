// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// A route for voice practice sessions: read a passage, record takes,
// hear them back — either automatically when you stop talking (echo mode) or on
// demand — and load any take into the main analysis view in one click. Mobile is
// the primary target.
//
// Future directions (not implemented):
//  - Persistence of takes across reloads (take model is already serialization-
//    friendly; needs OPFS/IndexedDB + quota + privacy copy).
//  - Reference-clip import (an external file as the ★ reference).
//  - Segment-event adoption in the index route (replacing its run-derivation
//    with `UtteranceTracker`).
//  - Rope segmentation for unbounded sessions (§5 option (a)).
//  - A single VAD "sensitivity" knob (item 3 of the `TODO(vad)` list).

import { createFileRoute, Link, useBlocker } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { PracticeCurrentSentence } from '#/components/PracticeCurrentSentence'
import { PracticeDialogs } from '#/components/PracticeDialogs'
import { PracticeDrillPager } from '#/components/PracticeDrillPager'
import { PracticePassageFooter } from '#/components/PracticePassageFooter'
import {
  PracticeReferenceDrillButton,
  PracticeReferenceText,
} from '#/components/PracticeReferenceText'
import {
  PracticeSettings,
  TEXT_SIZE_CLASS,
} from '#/components/PracticeSettings'
import { PracticeStatusRow } from '#/components/PracticeStatusRow'
import {
  PracticeTakesDrawer,
  PracticeTakesSidebar,
} from '#/components/PracticeTakes'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useAudioManager } from '#/components/useAudioManager'
import { useReferencePlayer } from '#/components/useReferencePlayer'
import { useSettings } from '#/components/useSettings'
import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import type {
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import { AudioRope } from '#/lib/audio/AudioRope'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import { readAudioSpan } from '#/lib/audio/AudioSpan'
import { RopeGainCache } from '#/lib/loudness/ropeLoudness'
import { mediaUrl } from '#/lib/mediaConfig'
import { registerMemSource } from '#/lib/memProbe'
import { passages } from '#/lib/passages'
import { stashTake } from '#/lib/practiceHandoff'
import {
  computeVoicedRange,
  drillIndexToSegmentIndex,
  initialPracticeState,
  practiceReducer,
  segmentIndexToDrillIndex as segmentToDrill,
} from '#/lib/practiceState'
import type { PracticeTake } from '#/lib/practiceState'
import type { PracticeTextSize } from '#/lib/settings'
import { assertUnreachable, cn, shuffleArray } from '#/lib/utils'

const PAGE_TITLE = 'Practice — Braat'

function Practice() {
  const [settings, updateSettings] = useSettings()
  const [state, dispatch] = useReducer(
    practiceReducer,
    undefined,
    initialPracticeState,
  )

  const [elapsedMs, setElapsedMs] = useState(0)

  // UI toggles
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [takesDrawerOpen, setTakesDrawerOpen] = useState(false)
  const [confirmingClearSession, setConfirmingClearSession] = useState(false)

  const blocker = useBlocker({
    shouldBlockFn: () => state.takes.length > 0,
    enableBeforeUnload: true,
    withResolver: true,
  })

  // Refs — mutable state that shouldn't trigger re-renders
  const sessionRopeRef = useRef<AudioRope | null>(null)
  const analysisRef = useRef<AnalysisFrame[]>([])
  const paramsRef = useRef<AnalysisParams | null>(null)
  const [gainCache] = useState(() => new RopeGainCache())
  const pipelineDoneResolveRef = useRef<(() => void) | null>(null)

  const passageId = settings.practicePassageId
  const autoAdvance = settings.practiceAutoAdvance
  const randomize = settings.practiceRandomize

  const passage = passages.find((p) => p.id === passageId) ?? passages[0]!

  // The pinned take (if any) acts as the reference source for the loop.
  const pinnedTake =
    state.referenceTakeId !== null
      ? (state.takes.find((t) => t.id === state.referenceTakeId) ?? null)
      : null

  const playRefBeforeTake =
    pinnedTake !== null ||
    (passage.kind !== 'blank' && settings.practicePlayReferenceBeforeTake)

  // Start mic pipeline + new recording
  const startPipelineAndRecord = useCallback(() => {
    analysisRef.current = []
    sessionRopeRef.current = null
    paramsRef.current = null
    dispatch({ type: 'START_RECORDING', startTime: Date.now() })
  }, [])

  // Drive the record-restart that PLAYBACK_ENDED signals via pendingRecordRestart.
  // useLayoutEffect so the ref resets and START_RECORDING dispatch are committed
  // before paint — same as the original synchronous call sequence.
  useLayoutEffect(() => {
    if (!state.pendingRecordRestart) return
    startPipelineAndRecord()
  }, [state.pendingRecordRestart, startPipelineAndRecord])

  // Tear down mic pipeline, resolving once VAD is fully computed
  const closePipeline = useCallback(() => {
    return new Promise<void>((resolve) => {
      pipelineDoneResolveRef.current = resolve
      dispatch({ type: 'SET_SESSION_PHASE', phase: 'playback' })
    })
  }, [])

  const handlePlaybackEnd = useCallback(() => {
    dispatch({ type: 'PLAYBACK_ENDED', autoAdvance })
  }, [autoAdvance])

  const playbackTake =
    state.playingTakeId !== null
      ? (state.takes.find((t) => t.id === state.playingTakeId) ?? null)
      : null

  const playbackCursorSec = useMemo(() => {
    if (!playbackTake) return 0
    const vr = playbackTake.voicedRange
    return vr.startSec
  }, [playbackTake])

  const playbackEndAtSec = useMemo(() => {
    if (!playbackTake) return undefined
    const vr = playbackTake.voicedRange
    return vr.endSec
  }, [playbackTake])

  const playbackRopes = useMemo<AudioRope[]>(
    () => (playbackTake ? [playbackTake.span.rope] : []),
    [playbackTake],
  )

  // Document title
  useEffect(() => {
    document.title = PAGE_TITLE
    return () => {
      document.title = 'Braat'
    }
  }, [])

  // Dev-only: report practice route state to the memory probe.
  useEffect(() => {
    return registerMemSource('practice-route', 'Practice route state', () => {
      // Single pass over analysisRef.current to avoid repeated iteration and
      // the temporary array that .filter(...).length would allocate.
      let analysisSpectrumBytes = 0
      let speechDetectedCount = 0
      for (const f of analysisRef.current) {
        analysisSpectrumBytes += f.spectrum.byteLength
        if (f.speechDetected === true) speechDetectedCount += 1
      }
      return {
        takeCount: state.takes.length,
        takeBytes: state.takes.reduce((s, t) => s + t.span.rope.length * 2, 0),
        analysisFrameCount: analysisRef.current.length,
        analysisSpectrumBytes,
        speechDetectedCount,
        sessionPhase: ({ idle: 0, recording: 1, playback: 2 } as const)[
          state.sessionPhase
        ],
      }
    })
  }, [state.takes, state.sessionPhase])

  // Elapsed timer during recording — only starts once the first voiced frame is detected
  useEffect(() => {
    if (state.sessionPhase !== 'recording' || state.voicedStartMs === null)
      return
    const tick = () => setElapsedMs(Date.now() - state.voicedStartMs!)
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [state.sessionPhase, state.voicedStartMs])

  // Mic capture callbacks
  const handleChunkStart = useCallback((params: AnalysisParams) => {
    paramsRef.current = params
  }, [])

  // Close the mic pipeline and, if any voiced audio was captured, dispatch
  // END_TAKE with the recorded span. No-op when not recording or nothing was
  // voiced. Used by handleEndSession, handleNextTake, and handleToggleReference
  // so a recording is never silently dropped when playback switches.
  const saveVoicedTakeIfRecording = useCallback(async () => {
    if (state.sessionPhase !== 'recording') return false
    if (state.voicedStartMs === null) return false

    const startFrame = state.recordingStartFrame
    const params = paramsRef.current
    const rope = sessionRopeRef.current
    if (!rope || !params) return false

    await closePipeline()

    const timePerFrame = params.timeStepSamples / params.sampleRate
    const baseTimeSec = startFrame * timePerFrame
    const endTimeSec = analysisRef.current.length * timePerFrame
    const voicedRange = computeVoicedRange(
      analysisRef.current,
      startFrame,
      analysisRef.current.length,
      timePerFrame,
      baseTimeSec,
    )
    const span: AudioSpan = {
      rope,
      startTime: baseTimeSec,
      endTime: Promise.resolve(endTimeSec),
      signal: new AbortController().signal,
    }
    dispatch({ type: 'END_TAKE', span, voicedRange, endTimeSec })
    return true
  }, [
    closePipeline,
    state.sessionPhase,
    state.voicedStartMs,
    state.recordingStartFrame,
  ])

  // Finish current take, tear down pipeline, then play back
  const handleNextTake = useCallback(async () => {
    if (state.sessionPhase !== 'recording') return

    const takeId = state.nextTakeId
    const saved = await saveVoicedTakeIfRecording()
    if (!saved) return

    if (playRefBeforeTake) {
      // Loop active: the take's playback is the 'take' phase. When it ends,
      // PLAYBACK_ENDED will advance/repeat and start the reference phase.
      dispatch({ type: 'SET_LOOP_PHASE', phase: 'take' })
      dispatch({ type: 'START_PLAYBACK', takeId, skipSilence: true })
    } else {
      dispatch({ type: 'START_PLAYBACK', takeId, skipSilence: true })
      dispatch({ type: 'PENDING_RESTART' })
    }
  }, [
    state.sessionPhase,
    state.nextTakeId,
    saveVoicedTakeIfRecording,
    playRefBeforeTake,
  ])

  const handleAppend = useCallback(
    (frame: AnalysisFrame) => {
      analysisRef.current.push(frame)
      if (state.audioStartMs === null) {
        dispatch({ type: 'AUDIO_START' })
      }

      if (frame.speechDetected === true) {
        if (state.voicedStartMs === null) {
          dispatch({ type: 'UTTERANCE_START' })
        }
      } else if (
        frame.speechDetected == false &&
        state.voicedStartMs !== null &&
        settings.practiceMode === 'echo'
      ) {
        void handleNextTake()
      }
    },
    [
      settings.practiceMode,
      handleNextTake,
      state.voicedStartMs,
      state.audioStartMs,
    ],
  )

  const handlePatch = useCallback(
    (from: number, to: number) => {
      let decision: boolean | null = null
      for (let i = from; i < to; i += 1) {
        const frame = analysisRef.current[i]!
        if (frame.speechDetected === true) {
          if (state.voicedStartMs === null) {
            decision = true
          }
        } else if (
          frame.speechDetected === false &&
          state.voicedStartMs !== null &&
          settings.practiceMode === 'echo'
        ) {
          decision = false
        }
      }
      if (decision === true) {
        dispatch({ type: 'UTTERANCE_START' })
      } else if (decision === false) {
        void handleNextTake()
      }
    },
    [settings.practiceMode, handleNextTake, state.voicedStartMs],
  )

  const handleRecordingComplete = useCallback(() => {
    pipelineDoneResolveRef.current?.()
    pipelineDoneResolveRef.current = null
  }, [])

  const handleAudioRopeShare = useCallback((share: AudioRopeShare) => {
    sessionRopeRef.current = new AudioRope(share)
  }, [])

  const handleAudioRopeGrow = useCallback((grow: AudioRopeGrow) => {
    sessionRopeRef.current?.grow(grow)
  }, [])

  const handleAudioRopeSeal = useCallback((_seal: AudioRopeSeal) => {
    sessionRopeRef.current?.seal()
  }, [])

  const handleNotification = useCallback((message: string) => {
    toast(message)
  }, [])

  // The mic stays open for the whole loop (reference → record → playback) so
  // the capture pipeline isn't torn down and rebuilt between phases. The loop
  // is considered active whenever we're recording, playing back a take, or in
  // any loopPhase — including 'reference' (which may be pending a start).
  const loopActive = state.loopPhase !== null
  const audioManager = useAudioManager({
    active:
      settings.persistentMic || state.sessionPhase !== 'idle' || loopActive,
    recording: state.sessionPhase === 'recording',
    captureFeatures: {
      spectrogram: false,
      formant: false,
      vad: {
        redemptionMs: settings.practiceMode === 'on-demand' ? 80 : 1500,
        prerollMs: 500,
      },
    },
    onCaptureAppend: handleAppend,
    onCaptureChunkStart: handleChunkStart,
    onCapturePatch: handlePatch,
    onCaptureComplete: handleRecordingComplete,
    onError: (err) => dispatch({ type: 'SET_ERROR', error: err }),
    onCaptureNotification: handleNotification,
    onAudioRopeGrow: handleAudioRopeGrow,
    onAudioRopeShare: handleAudioRopeShare,
    onAudioRopeSeal: handleAudioRopeSeal,
    playing: state.playingTakeId !== null,
    playbackRopes: playbackRopes,
    playbackGainCache: gainCache,
    playbackCursorSec: playbackCursorSec,
    playbackEndSec: playbackEndAtSec,
    onPlaybackStop: handlePlaybackEnd,
    onPlaybackPositionChanged: () => {},
  })

  // --- Derived data ---

  const sentences: readonly string[] = useMemo(() => {
    if (passage.kind === 'passage') return [...passage.segments]
    if (passage.kind === 'sentenceLists') {
      const raw = passage.lists.flat()
      return randomize ? shuffleArray(raw) : raw
    }
    return []
  }, [passage, randomize])

  // Reference clips are indexed by position in the passage's flattened
  // sentence list as the synth script wrote it — for passages that's just
  // `passage.segments` (unshuffled), for drills it's `lists.flat()` (which
  // shuffling reorders). Map the currently displayed sentence back to that
  // original index so the right clip plays.
  const referenceSegmentIndex = useMemo(
    () => drillIndexToSegmentIndex(passage, sentences, state.drillIndex),
    [passage, sentences, state.drillIndex],
  )

  // Inverse of referenceSegmentIndex: map an original (synth-script) segment
  // index (e.g. from tapping a passage sentence) back to the drillIndex into
  // the displayed (possibly shuffled) `sentences` array.
  const segmentIndexToDrillIndex = useCallback(
    (segIdx: number) =>
      segmentToDrill(passage, sentences, segIdx, state.drillIndex),
    [passage, sentences, state.drillIndex],
  )

  // Reference clip player. The reducer is the single source of truth for
  // which clip is loaded (`state.referencePlayback`); the hook drives the
  // HTMLAudioElement to match it and reports status back via dispatch.
  const referenceVoiceId = settings.practiceReferenceVoice
  const refPlayback = state.referencePlayback
  const { toggle: refToggle, manifest: referenceManifest } = useReferencePlayer(
    dispatch,
    refPlayback,
    audioManager,
  )
  // True when a reference is audibly playing: either a synth clip for the
  // current passage, or — when a take is pinned as the reference source — that
  // take playing during the loop's reference phase.
  const referencePlaying =
    (refPlayback !== null &&
      refPlayback.status === 'playing' &&
      refPlayback.passageId === passageId) ||
    (state.playingTakeId !== null && state.loopPhase === 'reference')

  // The session toolbar only leaves its neutral state for playback that leads
  // into recording: an active recording/playback session, or the loop's
  // reference phase. A standalone preview (tap a sentence, or play a take) keeps
  // the toolbar neutral — its stop control lives on the inline play/stop button.
  const sessionToolbarActive =
    state.sessionPhase !== 'idle' || state.loopPhase !== null

  // Begin the reference phase of the loop. We dispatch PREPARE_REFERENCE_PHASE
  // rather than starting the clip right away: this arms `pendingReferenceStart`
  // so the route can fire the actual reference dispatch (START_REFERENCE or a
  // pinned-take START_PLAYBACK) only once the mic pipeline reports it's warm.
  // Two effects follow from that ordering:
  //   - the mic permission prompt surfaces before any reference audio plays;
  //   - the capture pipeline is held open across all three phases of the take
  //     (reference → record → playback) instead of being torn down and rebuilt.
  const prepareReferencePhase = useCallback(() => {
    dispatch({ type: 'PREPARE_REFERENCE_PHASE' })
  }, [])

  // Actually start the reference source for the current sentence: a synth clip
  // via START_REFERENCE, or — if a take is pinned — that take's rope audio via
  // START_PLAYBACK. Called by the pendingReferenceStart watcher once the mic
  // pipeline is warm (or immediately if the loop feature is off and the user
  // tapped a sentence, which bypasses the prepare/begin split).
  const beginReferencePlayback = useCallback(() => {
    if (pinnedTake) {
      dispatch({
        type: 'START_PLAYBACK',
        takeId: pinnedTake.id,
        skipSilence: false,
      })
    } else {
      dispatch({
        type: 'START_REFERENCE',
        passageId,
        segmentIndex: referenceSegmentIndex,
        voiceId: referenceVoiceId,
      })
    }
  }, [pinnedTake, passageId, referenceSegmentIndex, referenceVoiceId])

  const handleToggleReference = useCallback(
    async (pId: string, segIdx: number, voiceId: string) => {
      // Unlock the AudioContext synchronously in the gesture; it stays running
      // across the await below, so the reference (played via the context) sounds
      // even though refToggle's playback starts after it.
      void audioManager?.unlockForGesture()
      // If recording with voiced audio, save the take before switching to
      // reference playback — never silently drop a recording.
      await saveVoicedTakeIfRecording()
      // Manual tap-to-play selects that sentence as the current sentence so
      // the loop (if active) resumes from it next cycle. segIdx is an index
      // into the original (synth-script) sentence list, so translate it to a
      // drillIndex for the displayed (possibly shuffled) `sentences` array.
      dispatch({
        type: 'SET_DRILL_INDEX',
        index: segmentIndexToDrillIndex(segIdx),
      })
      refToggle(pId, segIdx, voiceId)
    },
    [
      audioManager,
      refToggle,
      saveVoicedTakeIfRecording,
      segmentIndexToDrillIndex,
    ],
  )

  // Drive the reference-restart that PLAYBACK_ENDED signals via
  // pendingReferenceRestart when the loop is active. This goes through
  // prepareReferencePhase so the mic stays open and the permission prompt
  // (if any) is surfaced before the next reference clip plays.
  useLayoutEffect(() => {
    if (!state.pendingReferenceRestart) return
    prepareReferencePhase()
  }, [state.pendingReferenceRestart, prepareReferencePhase])

  // Fire the actual reference source once the capture pipeline is warm and a
  // start is pending. useAudioManager keeps the mic open for the whole loop
  // (see `active` below), so this usually resolves on the first stateChanged
  // after PREPARE_REFERENCE_PHASE. On a cold start — the very first take of a
  // session — the AudioContext is created and the mic is opened here, which is
  // what surfaces the permission prompt before the reference plays.
  useEffect(() => {
    if (!state.pendingReferenceStart) return
    if (!audioManager) return

    const isWarm =
      audioManager.getState().capture === 'warm' ||
      audioManager.getState().capture === 'recording'
    if (isWarm) {
      beginReferencePlayback()
      return
    }
    const onChange = () => {
      const { capture } = audioManager.getState()
      if (capture === 'warm' || capture === 'recording') {
        audioManager.removeEventListener('stateChanged', onChange)
        beginReferencePlayback()
      }
    }
    audioManager.addEventListener('stateChanged', onChange)
    return () => {
      audioManager.removeEventListener('stateChanged', onChange)
    }
  }, [state.pendingReferenceStart, audioManager, beginReferencePlayback])

  // Leaving the passage stops the reference so the active-sentence highlight
  // never points at a sentence that isn't on screen.
  useEffect(() => {
    dispatch({ type: 'STOP_REFERENCE' })
  }, [passageId])

  // Start session — when the loop setting is on, begin with the reference
  // phase; otherwise go straight to recording as before.
  const handleStartSession = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null })
    // Unlock the AudioContext synchronously in the gesture. It stays running
    // across the getUserMedia await, so the reference clip (played through the
    // context once the mic is warm) sounds even though it starts after the
    // permission prompt — no per-element autoplay gating to fight.
    void audioManager?.unlockForGesture()
    if (playRefBeforeTake) {
      prepareReferencePhase()
    } else {
      startPipelineAndRecord()
    }
  }, [
    startPipelineAndRecord,
    audioManager,
    playRefBeforeTake,
    prepareReferencePhase,
  ])

  // End session — stop mic and playback, but keep takes
  const handleEndSession = useCallback(async () => {
    if (state.shuttingDown) return
    dispatch({ type: 'SET_SHUTTING_DOWN', value: true })

    await saveVoicedTakeIfRecording()

    dispatch({ type: 'STOP_SESSION' })
    setElapsedMs(0)
  }, [state.shuttingDown, saveVoicedTakeIfRecording])

  // Play a take
  const handlePlayTake = useCallback(
    (take: PracticeTake, skipSilence: boolean) => {
      if (state.playingTakeId === take.id) {
        dispatch({ type: 'STOP_PLAYBACK' })
        return
      }
      void audioManager?.unlockForGesture()
      dispatch({ type: 'STOP_SESSION' })
      dispatch({ type: 'START_PLAYBACK', takeId: take.id, skipSilence })
    },
    [state.playingTakeId, audioManager],
  )

  const handleAnalyzeTake = useCallback(async (take: PracticeTake) => {
    dispatch({ type: 'STOP_SESSION' })
    const newWindow = window.open('/', '_blank')
    if (!newWindow) return
    const pcm = await readAudioSpan(take.span)
    stashTake({ pcm, sampleRate: take.span.rope.sampleRate })
    newWindow.postMessage('braat:handoff', window.location.origin)
  }, [])

  // Analyze the reference clip for the current sentence: fetch the MP3, decode
  // to PCM, and hand off to the analysis view — same path as handleAnalyzeTake.
  const handleAnalyzeReference = useCallback(
    async (segmentIndex: number, voiceId: string) => {
      const clip =
        referenceManifest?.passages[passageId]?.segments[segmentIndex]?.clips[
          voiceId
        ]
      if (!clip) return
      dispatch({ type: 'STOP_SESSION' })
      const newWindow = window.open('/', '_blank')
      if (!newWindow) return
      const resp = await fetch(mediaUrl(clip.url))
      const arrayBuf = await resp.arrayBuffer()
      const ctx = new AudioContext()
      try {
        const decoded = await ctx.decodeAudioData(arrayBuf)
        const pcm = decoded.getChannelData(0)
        stashTake({
          pcm: new Float32Array(pcm),
          sampleRate: decoded.sampleRate,
          passageId,
        })
        newWindow.postMessage('braat:handoff', window.location.origin)
      } catch (err) {
        void ctx.close()
        throw err
      }
      void ctx.close()
    },
    [referenceManifest, passageId],
  )

  // Clear session
  const doClearSession = useCallback(() => {
    dispatch({ type: 'CLEAR_SESSION' })
    analysisRef.current = []
    setConfirmingClearSession(false)
  }, [])

  const handleClearSession = useCallback(() => {
    setTakesDrawerOpen(false)
    setConfirmingClearSession(true)
  }, [])

  const handleCancelClearSession = useCallback(() => {
    setConfirmingClearSession(false)
  }, [])

  const handleTextSizeChange = useCallback(
    (size: PracticeTextSize) => {
      void updateSettings({ practiceTextSize: size })
    },
    [updateSettings],
  )

  const handlePassageChange = useCallback(
    (id: string | null) => {
      if (id) {
        dispatch({ type: 'SET_DRILL_INDEX', index: 0 })
        void updateSettings({ practicePassageId: id })
      }
    },
    [updateSettings],
  )

  const handleModeChange = useCallback(
    async (m: 'echo' | 'on-demand') => {
      await handleEndSession()
      void updateSettings({ practiceMode: m })
    },
    [updateSettings, handleEndSession],
  )

  const handleOpenAudioSettings = useCallback(async () => {
    await handleEndSession()
    setAudioSettingsOpen(true)
  }, [handleEndSession])

  const handleRandomizeChange = useCallback(
    (v: boolean) => {
      void updateSettings({ practiceRandomize: v })
    },
    [updateSettings],
  )

  const handleAutoAdvanceChange = useCallback(
    (v: boolean) => {
      void updateSettings({ practiceAutoAdvance: v })
    },
    [updateSettings],
  )

  const handleReferenceVoiceChange = useCallback(
    (id: string) => {
      void updateSettings({ practiceReferenceVoice: id })
    },
    [updateSettings],
  )

  const handlePlayReferenceBeforeTakeChange = useCallback(
    (v: boolean) => {
      void updateSettings({ practicePlayReferenceBeforeTake: v })
    },
    [updateSettings],
  )

  const handlePinTake = useCallback(
    (takeId: number) => dispatch({ type: 'PIN_TAKE', takeId }),
    [],
  )

  useHotkeys(
    'space',
    (e) => {
      e.preventDefault()
      if (state.sessionPhase === 'idle') {
        handleStartSession()
      } else if (state.sessionPhase === 'recording') {
        if (state.voicedStartMs === null) {
          void handleEndSession()
        } else {
          void handleNextTake()
        }
      }
    },
    [handleStartSession, handleEndSession, handleNextTake],
  )

  useHotkeys(
    'esc',
    (e) => {
      e.preventDefault()
      void handleEndSession()
    },
    [handleEndSession],
  )

  const textSizeClass = TEXT_SIZE_CLASS[settings.practiceTextSize]

  useHotkeys(
    'arrowleft',
    (e) => {
      if (sentences.length > 0) {
        e.preventDefault()
        dispatch({ type: 'DRILL_PREV' })
      }
    },
    [sentences.length],
    { enabled: sentences.length > 0 },
  )

  useHotkeys(
    'arrowright',
    (e) => {
      if (sentences.length > 0) {
        e.preventDefault()
        dispatch({ type: 'DRILL_NEXT' })
      }
    },
    [sentences.length],
    { enabled: sentences.length > 0 },
  )

  // Keep sentence count in the reducer for the playback-end handler
  useLayoutEffect(() => {
    dispatch({ type: 'SET_SENTENCE_COUNT', count: sentences.length })
  }, [sentences.length])

  // Current-sentence slot for the takes sidebar/drawer: shown when no take is
  // pinned, surfaces the sentence the loop is on with play/prev/next controls.
  const currentSentenceSlot = useMemo(() => {
    if (sentences.length === 0) return undefined
    return (
      <PracticeCurrentSentence
        sentence={sentences[state.drillIndex] ?? null}
        sentenceIndex={state.drillIndex}
        sentenceCount={sentences.length}
        playing={referencePlaying}
        loading={refPlayback?.status === 'loading'}
        compact={passage.kind === 'sentenceLists'}
        onPlay={() =>
          handleToggleReference(
            passageId,
            referenceSegmentIndex,
            referenceVoiceId,
          )
        }
        onAnalyze={() =>
          void handleAnalyzeReference(referenceSegmentIndex, referenceVoiceId)
        }
        onPrevious={() => dispatch({ type: 'DRILL_PREV' })}
        onNext={() => dispatch({ type: 'DRILL_NEXT' })}
      />
    )
  }, [
    sentences,
    state.drillIndex,
    referencePlaying,
    refPlayback,
    passage,
    handleToggleReference,
    handleAnalyzeReference,
    passageId,
    referenceSegmentIndex,
    referenceVoiceId,
  ])

  const selectedTitle = passage.title

  // --- Main render ---
  return (
    <main className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border p-2 shrink-0">
        <Tooltip>
          <TooltipTrigger>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-base text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="size-6" />
              <span className="hidden sm:inline">Braat</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>Back to analysis</TooltipContent>
        </Tooltip>
        <h1 className="text-lg font-bold shrink-0">Practice</h1>
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <Select value={passageId} onValueChange={handlePassageChange}>
            <SelectTrigger className="w-62 min-w-0 shrink">
              <SelectValue>{selectedTitle}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {passages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PracticeSettings
            textSize={settings.practiceTextSize}
            onTextSizeChange={handleTextSizeChange}
            mode={settings.practiceMode}
            onModeChange={handleModeChange}
            onOpenAudioSettings={handleOpenAudioSettings}
            autoAdvance={autoAdvance}
            onAutoAdvanceChange={handleAutoAdvanceChange}
            randomize={randomize}
            onRandomizeChange={handleRandomizeChange}
            referenceVoice={settings.practiceReferenceVoice}
            onReferenceVoiceChange={handleReferenceVoiceChange}
            playReferenceBeforeTake={playRefBeforeTake}
            onPlayReferenceBeforeTakeChange={
              handlePlayReferenceBeforeTakeChange
            }
          />
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 overflow-y-auto lg:pb-32">
          {passage.kind === 'passage' ? (
            <div className="mx-auto max-w-3xl px-4 py-6">
              <div
                className={cn(
                  'leading-relaxed text-justify hyphens-auto font-serif',
                  textSizeClass,
                )}
              >
                <PracticeReferenceText
                  segments={passage.segments}
                  passageId={passageId}
                  voiceId={referenceVoiceId}
                  activePassageId={refPlayback?.passageId ?? null}
                  activeSegmentIndex={refPlayback?.segmentIndex ?? null}
                  currentSentenceIndex={state.drillIndex}
                  playing={referencePlaying}
                  loading={refPlayback?.status === 'loading'}
                  onToggle={handleToggleReference}
                />
              </div>
              <PracticePassageFooter
                source={passage.source}
                sourceUrl={passage.sourceUrl}
                attribution={passage.attribution}
              />
            </div>
          ) : passage.kind === 'sentenceLists' ? (
            <div className="mx-auto max-w-3xl px-4 py-6">
              <div className="flex flex-col items-center justify-center min-h-64">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'text-center font-serif leading-relaxed py-8',
                      textSizeClass,
                    )}
                  >
                    {sentences[state.drillIndex]}
                  </div>
                  <PracticeReferenceDrillButton
                    passageId={passageId}
                    segmentIndex={referenceSegmentIndex}
                    voiceId={referenceVoiceId}
                    activePassageId={refPlayback?.passageId ?? null}
                    activeSegmentIndex={refPlayback?.segmentIndex ?? null}
                    playing={referencePlaying}
                    loading={refPlayback?.status === 'loading'}
                    onToggle={handleToggleReference}
                  />
                </div>
              </div>
              <PracticeDrillPager
                sentenceIndex={state.drillIndex}
                sentenceCount={sentences.length}
                onPrevious={() => dispatch({ type: 'DRILL_PREV' })}
                onNext={() => dispatch({ type: 'DRILL_NEXT' })}
              />
              <PracticePassageFooter
                source={passage.source}
                sourceUrl={passage.sourceUrl}
                attribution={passage.attribution}
              />
            </div>
          ) : // eslint-disable-next-line no-unnecessary-condition
          passage.kind === 'blank' ? null : (
            assertUnreachable(passage)
          )}
        </div>

        <div className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border">
          <PracticeTakesSidebar
            takes={state.takes}
            referenceTakeId={state.referenceTakeId}
            playingTakeId={state.playingTakeId}
            takeCount={state.takes.length}
            onPlayTake={(take) => handlePlayTake(take, true)}
            onAnalyzeTake={handleAnalyzeTake}
            onPinTake={handlePinTake}
            onClearSession={handleClearSession}
            currentSentenceSlot={currentSentenceSlot}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <PracticeTakesDrawer
          open={takesDrawerOpen}
          onOpenChange={setTakesDrawerOpen}
          takes={state.takes}
          referenceTakeId={state.referenceTakeId}
          playingTakeId={state.playingTakeId}
          takeCount={state.takes.length}
          onPlayTake={(take) => handlePlayTake(take, true)}
          onAnalyzeTake={handleAnalyzeTake}
          onPinTake={handlePinTake}
          onClearSession={handleClearSession}
          currentSentenceSlot={currentSentenceSlot}
        />
      </div>

      <AudioSettingsModal
        open={audioSettingsOpen}
        onOpenChange={setAudioSettingsOpen}
      />

      {state.error && (
        <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
          <Button
            variant="link"
            className="ml-2 underline text-red-700 dark:text-red-300"
            onClick={() => dispatch({ type: 'SET_ERROR', error: null })}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div
        className={cn(
          'shrink-0 border-t border-border',
          sessionToolbarActive &&
            'lg:fixed lg:bottom-4 lg:left-4 lg:z-20 lg:w-80 lg:rounded-xl lg:border lg:bg-background lg:shadow-lg',
        )}
      >
        <PracticeStatusRow
          phase={state.sessionPhase}
          playing={state.playingTakeId !== null}
          audioActive={state.audioStartMs !== null}
          timerActive={state.voicedStartMs !== null}
          elapsedMs={elapsedMs}
          onStartSession={handleStartSession}
          onNextTake={handleNextTake}
          onEndSession={handleEndSession}
          numTakes={state.takes.length}
          playReferenceBeforeTake={playRefBeforeTake}
          referencePlaying={sessionToolbarActive && referencePlaying}
          referenceLoading={
            sessionToolbarActive && refPlayback?.status === 'loading'
          }
          onStopReference={() => {
            if (
              state.loopPhase === 'reference' &&
              state.playingTakeId !== null
            ) {
              dispatch({ type: 'STOP_PLAYBACK' })
            }
            dispatch({ type: 'SET_LOOP_PHASE', phase: null })
            dispatch({ type: 'STOP_REFERENCE' })
          }}
        />
      </div>

      <PracticeDialogs
        blocked={blocker.status === 'blocked'}
        onResetBlocker={() => {
          blocker.reset?.()
        }}
        onLeave={() => {
          blocker.proceed?.()
        }}
        confirmingClearSession={confirmingClearSession}
        onConfirmClearSession={doClearSession}
        onCancelClearSession={handleCancelClearSession}
      />
    </main>
  )
}

export const Route = createFileRoute('/practice')({
  component: Practice,
})
