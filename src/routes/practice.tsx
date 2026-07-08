// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// A route for voice practice sessions: read a passage, record takes,
// hear them back -- either automatically when you stop talking (echo mode) or on
// demand -- and load any take into the main analysis view in one click. Mobile is
// the primary target.
//
// Future directions (not implemented):
//  - Reference-clip import (an external file as the pinned reference).
//  - Segment-event adoption in the index route (replacing its run-derivation
//    with `UtteranceTracker`).

import { createFileRoute, useBlocker } from '@tanstack/react-router'
import { Keyboard } from 'lucide-react'
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
import { NavBar } from '#/components/NavBar'
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
import { SHORTCUTS, useActiveScope } from '#/components/shortcuts'
import { useShortcutsHelp } from '#/components/ShortcutsHelp'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { TooltipButton } from '#/components/ui/tooltipButton'
import { useAudioManager } from '#/components/useAudioManager'
import { useReferencePlayer } from '#/components/useReferencePlayer'
import { useSettings } from '#/components/useSettings'
import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import { track } from '#/lib/analytics'
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

  // Refs -- mutable state that shouldn't trigger re-renders
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
  // before paint -- same as the original synchronous call sequence.
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

  // Elapsed timer during recording -- only starts once the first voiced frame is detected
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
    track('practice-take')

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

  // The mic stays open for the whole loop. The loop is considered active
  // whenever we're recording, playing back a take, in any loopPhase,
  // including 'reference' (which may be pending a start), or about to do so
  // (via `pending` flags).
  const loopActive =
    state.loopPhase !== null ||
    state.pendingRecordRestart ||
    state.pendingReferenceRestart ||
    state.pendingReferenceStart
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
  // sentence list. Map the currently displayed sentence back to that
  // original index (different if shuffled).
  const referenceSegmentIndex = useMemo(
    () => drillIndexToSegmentIndex(passage, sentences, state.drillIndex),
    [passage, sentences, state.drillIndex],
  )

  // Inverse of referenceSegmentIndex.
  const segmentIndexToDrillIndex = useCallback(
    (segIdx: number) =>
      segmentToDrill(passage, sentences, segIdx, state.drillIndex),
    [passage, sentences, state.drillIndex],
  )

  const referenceVoiceId = settings.practiceReferenceVoice
  const refPlayback = state.referencePlayback
  const { toggle: refToggle, manifest: referenceManifest } = useReferencePlayer(
    dispatch,
    refPlayback,
    audioManager,
  )
  const referencePlaying =
    (refPlayback !== null &&
      refPlayback.status === 'playing' &&
      refPlayback.passageId === passageId) ||
    (state.playingTakeId !== null && state.loopPhase === 'reference')

  const sessionToolbarActive =
    state.sessionPhase !== 'idle' || state.loopPhase !== null

  // Begin the reference phase of the loop. Note:
  //   - the mic permission prompt surfaces before any reference audio plays;
  //   - the capture pipeline is held open across all three phases of the take
  //     instead of being torn down and rebuilt.
  const prepareReferencePhase = useCallback(() => {
    dispatch({ type: 'PREPARE_REFERENCE_PHASE' })
  }, [])

  // Actually start the reference source for the current sentence.
  const beginReferencePlayback = useCallback(() => {
    if (pinnedTake) {
      track('practice-reference-play/custom')
      dispatch({
        type: 'START_PLAYBACK',
        takeId: pinnedTake.id,
        skipSilence: false,
      })
    } else {
      track(`practice-reference-play/${referenceVoiceId}`)
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
      track(`practice-reference-play/${voiceId}`)
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
      // Outside a continuous reference-before-take loop, a manual tap is a
      // standalone reference play. Clear any leaked loopPhase (e.g. from a
      // Ctrl/Cmd-click that armed the reference phase) so this reference's end
      // doesn't mis-fire a recording and pin the mic open. STOP_REFERENCE
      // clears it for the same-sentence (stop) case; this covers tapping a
      // different sentence, which dispatches START_REFERENCE instead.
      if (!playRefBeforeTake) {
        dispatch({ type: 'SET_LOOP_PHASE', phase: null })
      }
      refToggle(pId, segIdx, voiceId)
    },
    [
      audioManager,
      refToggle,
      saveVoicedTakeIfRecording,
      segmentIndexToDrillIndex,
      playRefBeforeTake,
    ],
  )

  // Ctrl/Cmd+click on a sentence: select it, play its reference, then start
  // recording a take
  const handleReferenceThenTake = useCallback(
    async (_pId: string, segIdx: number, _voiceId: string) => {
      void audioManager?.unlockForGesture()
      await saveVoicedTakeIfRecording()
      dispatch({ type: 'SET_ERROR', error: null })
      dispatch({
        type: 'SET_DRILL_INDEX',
        index: segmentIndexToDrillIndex(segIdx),
      })
      prepareReferencePhase()
    },
    [
      audioManager,
      saveVoicedTakeIfRecording,
      segmentIndexToDrillIndex,
      prepareReferencePhase,
    ],
  )

  // Drive the reference-restart that PLAYBACK_ENDED signals via
  // pendingReferenceRestart when the loop is active.
  useLayoutEffect(() => {
    if (!state.pendingReferenceRestart) return
    prepareReferencePhase()
  }, [state.pendingReferenceRestart, prepareReferencePhase])

  // Fire the actual reference source once the capture pipeline is warm and a
  // start is pending.
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

  // Start session. When the loop setting is on, begin with the reference
  // phase; otherwise go straight to recording as before.
  const handleStartSession = useCallback(() => {
    track('practice-session-start')
    dispatch({ type: 'SET_ERROR', error: null })
    // Unlock the AudioContext synchronously in the gesture. It stays running
    // across the getUserMedia await, so the reference clip (played through the
    // context once the mic is warm) sounds even though it starts after the
    // permission prompt.
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

  // End session (stop mic and playback, but keep takes)
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
      track('practice-playback')
      dispatch({ type: 'STOP_SESSION' })
      dispatch({ type: 'START_PLAYBACK', takeId: take.id, skipSilence })
    },
    [state.playingTakeId, audioManager],
  )

  const handleAnalyzeTake = useCallback(async (take: PracticeTake) => {
    track('practice-analyze-take')
    dispatch({ type: 'STOP_SESSION' })
    const newWindow = window.open('/', '_blank')
    if (!newWindow) return
    const pcm = await readAudioSpan(take.span)
    stashTake({ pcm, sampleRate: take.span.rope.sampleRate })
    newWindow.postMessage('braat:handoff', window.location.origin)
  }, [])

  // Analyze the reference clip for the current sentence: fetch the MP3, decode
  // to PCM, and hand off to the analysis view. Same path as handleAnalyzeTake.
  const handleAnalyzeReference = useCallback(
    async (segmentIndex: number, voiceId: string) => {
      const clip =
        referenceManifest?.passages[passageId]?.segments[segmentIndex]?.clips[
          voiceId
        ]
      if (!clip) return
      track('practice-analyze-reference')
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
      track('practice-setting-change/text-size')
      void updateSettings({ practiceTextSize: size })
    },
    [updateSettings],
  )

  const handlePassageChange = useCallback(
    (id: string | null) => {
      if (id) {
        track('practice-setting-change/passage')
        dispatch({ type: 'SET_DRILL_INDEX', index: 0 })
        void updateSettings({ practicePassageId: id })
      }
    },
    [updateSettings],
  )

  const handleModeChange = useCallback(
    async (m: 'echo' | 'on-demand') => {
      track('practice-setting-change/mode')
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
      track('practice-setting-change/randomize')
      void updateSettings({ practiceRandomize: v })
    },
    [updateSettings],
  )

  const handleAutoAdvanceChange = useCallback(
    (v: boolean) => {
      track('practice-setting-change/auto-advance')
      void updateSettings({ practiceAutoAdvance: v })
    },
    [updateSettings],
  )

  const handleReferenceVoiceChange = useCallback(
    (id: string) => {
      track('practice-setting-change/voice')
      void updateSettings({ practiceReferenceVoice: id })
    },
    [updateSettings],
  )

  const handlePlayReferenceBeforeTakeChange = useCallback(
    (v: boolean) => {
      track('practice-setting-change/play-reference')
      void updateSettings({ practicePlayReferenceBeforeTake: v })
    },
    [updateSettings],
  )

  const handlePinTake = useCallback(
    (takeId: number) => dispatch({ type: 'PIN_TAKE', takeId }),
    [],
  )

  // Practice-scoped shortcuts: only fire while this route is mounted. Keys come
  // from the registry in src/lib/shortcuts.ts.
  useActiveScope('practice')

  useHotkeys(
    SHORTCUTS.practiceAdvance.keys,
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
    { scopes: 'practice' },
  )

  useHotkeys(
    SHORTCUTS.practiceEnd.keys,
    (e) => {
      e.preventDefault()
      void handleEndSession()
    },
    [handleEndSession],
    { scopes: 'practice' },
  )

  const textSizeClass = TEXT_SIZE_CLASS[settings.practiceTextSize]

  useHotkeys(
    SHORTCUTS.practicePrev.keys,
    (e) => {
      if (sentences.length > 0) {
        e.preventDefault()
        dispatch({ type: 'DRILL_PREV' })
      }
    },
    [sentences.length],
    { enabled: sentences.length > 0, scopes: 'practice' },
  )

  useHotkeys(
    SHORTCUTS.practiceNext.keys,
    (e) => {
      if (sentences.length > 0) {
        e.preventDefault()
        dispatch({ type: 'DRILL_NEXT' })
      }
    },
    [sentences.length],
    { enabled: sentences.length > 0, scopes: 'practice' },
  )

  useHotkeys(
    SHORTCUTS.practiceReplayRef.keys,
    (e) => {
      if (sentences.length > 0) {
        e.preventDefault()
        void handleToggleReference(
          passageId,
          referenceSegmentIndex,
          referenceVoiceId,
        )
      }
    },
    [
      sentences.length,
      handleToggleReference,
      passageId,
      referenceSegmentIndex,
      referenceVoiceId,
    ],
    { enabled: sentences.length > 0, scopes: 'practice' },
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
  const { openShortcutsHelp } = useShortcutsHelp()

  // --- Main render ---
  return (
    <main className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      <NavBar
        actions={
          <div className="flex items-center gap-2 min-w-0">
            <TooltipButton
              label="Keyboard shortcuts (?)"
              variant="ghost"
              size="icon"
              // Touch-only devices can't use keyboard shortcuts and have the
              // least header space, so hide this there (fine pointer likely means keyboard).
              className="shrink-0 no-fine-pointer:hidden"
              onClick={openShortcutsHelp}
            >
              <Keyboard className="size-5" />
            </TooltipButton>
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
        }
      />

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
                  onToggleAndRecord={handleReferenceThenTake}
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
                    onToggleAndRecord={handleReferenceThenTake}
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
