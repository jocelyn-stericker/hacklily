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

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { PracticeDialogs } from '#/components/PracticeDialogs'
import { PracticeDrillPager } from '#/components/PracticeDrillPager'
import { PracticePassageFooter } from '#/components/PracticePassageFooter'
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
import { useAudioPlayback } from '#/components/useAudioPlayback'
import { useMicCapture } from '#/components/useMicCapture'
import { useSettings } from '#/components/useSettings'
import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import type {
  AudioRope,
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import { AudioRope as AudioRopeClass } from '#/lib/audio/AudioRope'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import { readAudioSpan } from '#/lib/audio/AudioSpan'
import { getOrCreateSharedAudioContext } from '#/lib/audio/sharedAudioContext'
import { RopeGainCache } from '#/lib/loudness/ropeLoudness'
import { passages } from '#/lib/passages'
import { stashTake } from '#/lib/practiceHandoff'
import { initialPracticeState, practiceReducer } from '#/lib/practiceState'
import type { PracticeTake, VoicedRange } from '#/lib/practiceState'
import type { PracticeTextSize } from '#/lib/settings'
import { preferredSampleRate } from '#/lib/settings'
import { assertUnreachable, cn, shuffleArray } from '#/lib/utils'

const PAGE_TITLE = 'Practice — Braat'

function computeVoicedRanges(
  decisions: boolean[],
  fromIdx: number,
  toIdx: number,
  timePerFrame: number,
  baseTimeSec: number,
): VoicedRange[] {
  const ranges: VoicedRange[] = []
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

function Practice() {
  const [settings, updateSettings] = useSettings()
  const [state, dispatch] = useReducer(
    practiceReducer,
    undefined,
    initialPracticeState,
  )
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  })
  const [, forceRender] = useState(0)

  const micActive = state.sessionPhase === 'recording'
  const [voicedStartMs, setVoicedStartMs] = useState<number | null>(null)
  const voicedStartMsRef = useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [displayLevel, setDisplayLevel] = useState({
    intensity: 0,
    voiced: false,
  })

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
  const sessionRopeRef = useRef<AudioRopeClass | null>(null)
  const frameCountRef = useRef(0)
  const decisionsRef = useRef<boolean[]>([])
  const paramsRef = useRef<AnalysisParams | null>(null)
  const levelRef = useRef({ rms: 0, speechDetected: false })
  const [gainCache] = useState(() => new RopeGainCache())
  const pipelineDoneResolveRef = useRef<(() => void) | null>(null)
  const modeRef = useRef<'echo' | 'on-demand'>('echo')
  const handleNextTakeRef = useRef<(() => Promise<void>) | null>(null)

  const passageId = settings.practicePassageId
  const autoAdvance = settings.practiceAutoAdvance
  const mode = settings.practiceMode
  const randomize = settings.practiceRandomize

  // Start mic pipeline + new recording
  const startPipelineAndRecord = useCallback(() => {
    frameCountRef.current = 0
    decisionsRef.current = []
    sessionRopeRef.current = null
    paramsRef.current = null
    levelRef.current = { rms: 0, speechDetected: false }
    voicedStartMsRef.current = null
    setVoicedStartMs(null)
    dispatch({ type: 'START_RECORDING', startTime: Date.now() })
  }, [])

  // Tear down mic pipeline, resolving once VAD is fully computed
  const closePipeline = useCallback(() => {
    return new Promise<void>((resolve) => {
      pipelineDoneResolveRef.current = resolve
      dispatch({ type: 'SET_SESSION_PHASE', phase: 'playback' })
    })
  }, [])

  // When playback ends, either shut down or restart pipeline for next take
  const handlePlaybackEnd = useCallback(() => {
    if (stateRef.current.shuttingDown) {
      dispatch({ type: 'SET_SHUTTING_DOWN', value: false })
      dispatch({ type: 'STOP_PLAYBACK' })
      return
    }
    dispatch({ type: 'STOP_PLAYBACK' })
    const pendingRestart = stateRef.current.pendingRestart
    if (pendingRestart) {
      if (autoAdvance && stateRef.current.sentenceCount > 0) {
        const next =
          (stateRef.current.drillIndex + 1) % stateRef.current.sentenceCount
        dispatch({ type: 'SET_DRILL_INDEX', index: next })
      }
      startPipelineAndRecord()
      dispatch({
        type: 'ECHO_COOLDOWN',
        untilTs: performance.now() + 250,
      })
    } else {
      dispatch({ type: 'STOP_SESSION' })
    }
  }, [autoAdvance, startPipelineAndRecord])

  const preferredRate = preferredSampleRate(settings)

  const playbackTake =
    state.playingTakeId !== null
      ? (state.takes.find((t) => t.id === state.playingTakeId) ?? null)
      : null

  const playbackCursorSec = useMemo(() => {
    if (!playbackTake) return 0
    const vr = playbackTake.voicedRanges
    return vr.length > 0 ? vr[0]!.startSec : playbackTake.span.startTime
  }, [playbackTake])

  const playbackEndAtSec = useMemo(() => {
    if (!playbackTake) return undefined
    const vr = playbackTake.voicedRanges
    return vr.length > 0 ? vr[vr.length - 1]!.endSec : playbackTake.endTimeSec
  }, [playbackTake])

  const playbackRopes = useMemo<AudioRope[]>(
    () => (playbackTake ? [playbackTake.span.rope] : []),
    [playbackTake],
  )

  useAudioPlayback({
    enabled: state.playingTakeId !== null,
    ropes: playbackRopes,
    gainCache,
    cursorSec: playbackCursorSec,
    endAtSec: playbackEndAtSec,
    onStop: handlePlaybackEnd,
    onPlaybackPositionChanged: () => {},
  })

  // Document title
  useEffect(() => {
    document.title = PAGE_TITLE
    return () => {
      document.title = 'Braat'
    }
  }, [])

  // Level meter polling
  useEffect(() => {
    if (!micActive) return
    const id = setInterval(() => {
      const { rms, speechDetected } = levelRef.current
      const intensity = Math.min(1, Math.sqrt(rms) * 5)
      if (speechDetected && voicedStartMsRef.current === null) {
        voicedStartMsRef.current = Date.now()
        setVoicedStartMs(voicedStartMsRef.current)
      }
      setDisplayLevel({ intensity, voiced: speechDetected })
    }, 60)
    return () => clearInterval(id)
  }, [micActive])

  // Elapsed timer during recording — only starts once the first voiced frame is detected
  useEffect(() => {
    if (!state.recording || voicedStartMs === null) return
    const tick = () => setElapsedMs(Date.now() - voicedStartMs)
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [state.recording, voicedStartMs])

  // Mic capture callbacks
  const handleChunkStart = useCallback((params: AnalysisParams) => {
    paramsRef.current = params
  }, [])

  const handleAppend = useCallback((frame: AnalysisFrame) => {
    const idx = frameCountRef.current
    frameCountRef.current = idx + 1
    // Ensure decisions array is large enough
    while (decisionsRef.current.length <= idx) {
      decisionsRef.current.push(false)
    }
    decisionsRef.current[idx] = frame.speechDetected
    // Update level meter
    levelRef.current = { rms: frame.rms, speechDetected: frame.speechDetected }

    // Echo mode: auto-detect utterance end
    if (modeRef.current === 'echo') {
      if (frame.speechDetected) {
        if (!stateRef.current.echoWasHearing) {
          dispatch({ type: 'ECHO_SPEECH_HEARD' })
        }
      } else if (
        stateRef.current.echoWasHearing &&
        performance.now() > stateRef.current.echoGateUntilTs
      ) {
        dispatch({ type: 'ECHO_UTTERANCE_DONE' })
        void handleNextTakeRef.current?.()
      }
    }
  }, [])

  const handlePatch = useCallback((_from: number, _to: number) => {
    // Frames in the pipeline are mutated in-place. With redemptionMs=1500,
    // patches revert optimistic speech→silence after the 1.5s window. Our
    // decisionsRef values from onAppend go stale for those frames, so
    // voicedRanges computed at STOP will be slightly too large until the
    // pipeline API emits updated speechDetected values in patch events.
  }, [])

  const handleRecordingComplete = useCallback(() => {
    pipelineDoneResolveRef.current?.()
    pipelineDoneResolveRef.current = null
  }, [])

  const handleError = useCallback((err: string) => {
    dispatch({ type: 'SET_ERROR', error: err })
  }, [])

  const handleAudioRopeShare = useCallback((share: AudioRopeShare) => {
    sessionRopeRef.current = new AudioRopeClass(share)
  }, [])

  const handleAudioRopeGrow = useCallback((grow: AudioRopeGrow) => {
    sessionRopeRef.current?.grow(grow)
  }, [])

  const handleAudioRopeSeal = useCallback((_seal: AudioRopeSeal) => {
    sessionRopeRef.current?.seal()
  }, [])

  // useMicCapture — runs for the whole session
  useMicCapture({
    enabled: micActive,
    features: {
      spectrogram: false,
      formant: false,
      vad: {
        redemptionMs: settings.practiceMode === 'on-demand' ? 80 : 1500,
        prerollMs: 500,
      },
    },
    onAppend: handleAppend,
    onChunkStart: handleChunkStart,
    onPatch: handlePatch,
    onRecordingComplete: handleRecordingComplete,
    onError: handleError,
    onAudioRopeGrow: handleAudioRopeGrow,
    onAudioRopeShare: handleAudioRopeShare,
    onAudioRopeSeal: handleAudioRopeSeal,
  })

  // Start session — immediately begin recording the first take
  const handleStartSession = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null })
    getOrCreateSharedAudioContext(preferredRate)
    startPipelineAndRecord()
  }, [startPipelineAndRecord, preferredRate])

  // End session — stop mic and playback, but keep takes
  const handleEndSession = useCallback(() => {
    if (stateRef.current.shuttingDown) return
    dispatch({ type: 'SET_SHUTTING_DOWN', value: true })
    dispatch({ type: 'STOP_PLAYBACK' })
    dispatch({ type: 'ECHO_GATE_BLOCK' })

    void (async () => {
      if (
        stateRef.current.recording &&
        (stateRef.current.echoWasHearing || modeRef.current === 'on-demand')
      ) {
        await closePipeline()

        const startFrame = stateRef.current.recordingStartFrame
        const endFrame = frameCountRef.current
        const params = paramsRef.current
        const rope = sessionRopeRef.current
        const decisions = decisionsRef.current.slice()

        if (rope && params) {
          const timePerFrame = params.timeStepSamples / params.sampleRate
          const baseTimeSec = startFrame * timePerFrame
          const endTimeSec = endFrame * timePerFrame
          const voicedRanges = computeVoicedRanges(
            decisions,
            startFrame,
            endFrame,
            timePerFrame,
            baseTimeSec,
          )
          const span: AudioSpan = {
            rope,
            startTime: baseTimeSec,
            endTime: Promise.resolve(endTimeSec),
            signal: new AbortController().signal,
          }
          dispatch({ type: 'STOP_RECORDING', span, voicedRanges, endTimeSec })
          forceRender((n) => n + 1)
        }
      }

      dispatch({ type: 'STOP_SESSION' })
      setElapsedMs(0)
    })()
  }, [closePipeline])

  // Finish current take, tear down pipeline, then play back
  const handleNextTake = useCallback(async () => {
    if (!state.recording) return

    const startFrame = stateRef.current.recordingStartFrame
    const endFrame = frameCountRef.current
    const params = paramsRef.current
    const rope = sessionRopeRef.current
    const decisions = decisionsRef.current.slice()

    if (!rope || !params) return

    await closePipeline()

    const timePerFrame = params.timeStepSamples / params.sampleRate
    const baseTimeSec = startFrame * timePerFrame
    const endTimeSec = endFrame * timePerFrame
    const voicedRanges = computeVoicedRanges(
      decisions,
      startFrame,
      endFrame,
      timePerFrame,
      baseTimeSec,
    )

    const span: AudioSpan = {
      rope,
      startTime: baseTimeSec,
      endTime: Promise.resolve(endTimeSec),
      signal: new AbortController().signal,
    }

    const takeId = state.nextTakeId
    dispatch({ type: 'STOP_RECORDING', span, voicedRanges, endTimeSec })
    dispatch({ type: 'START_PLAYBACK', takeId, skipSilence: true })
    dispatch({ type: 'PENDING_RESTART' })
    forceRender((n) => n + 1)
  }, [state.recording, state.nextTakeId, closePipeline])

  // Play a take
  const handlePlayTake = useCallback(
    (take: PracticeTake, skipSilence: boolean) => {
      if (state.playingTakeId === take.id) {
        dispatch({ type: 'STOP_PLAYBACK' })
        dispatch({ type: 'ECHO_RESET_GATE' })
        return
      }
      getOrCreateSharedAudioContext(preferredRate)
      dispatch({ type: 'ECHO_GATE_BLOCK' })
      dispatch({ type: 'START_PLAYBACK', takeId: take.id, skipSilence })
    },
    [state.playingTakeId, preferredRate],
  )

  // Star a take as reference
  const handleStarTake = useCallback((takeId: number) => {
    dispatch({ type: 'PIN_TAKE', takeId })
  }, [])

  const handleAnalyzeTake = useCallback(async (take: PracticeTake) => {
    const newWindow = window.open('/', '_blank')
    if (!newWindow) return
    const pcm = await readAudioSpan(take.span)
    stashTake({ pcm, sampleRate: take.span.rope.sampleRate })
    newWindow.postMessage('braat:handoff', window.location.origin)
  }, [])

  // Clear session
  const doClearSession = useCallback(() => {
    dispatch({ type: 'CLEAR_SESSION' })
    frameCountRef.current = 0
    decisionsRef.current = []
    levelRef.current = { rms: 0, speechDetected: false }
    forceRender((n) => n + 1)
    setConfirmingClearSession(false)
  }, [])

  const handleClearSession = useCallback(() => {
    setTakesDrawerOpen(false)
    setConfirmingClearSession(true)
  }, [])

  const handleCancelClearSession = useCallback(() => {
    setConfirmingClearSession(false)
  }, [])

  // --- Derived data ---
  const passage = passages.find((p) => p.id === passageId) ?? passages[0]!

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
    (m: 'echo' | 'on-demand') => {
      void updateSettings({ practiceMode: m })
    },
    [updateSettings],
  )

  const handleOpenAudioSettings = useCallback(() => {
    setAudioSettingsOpen(true)
  }, [])

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

  const handleDrillPrev = useCallback(() => {
    const prev =
      (stateRef.current.drillIndex + stateRef.current.sentenceCount - 1) %
      stateRef.current.sentenceCount
    dispatch({
      type: 'SET_DRILL_INDEX',
      index: prev,
    })
  }, [])

  const handleDrillNext = useCallback(() => {
    if (stateRef.current.sentenceCount > 0) {
      const next =
        (stateRef.current.drillIndex + 1) % stateRef.current.sentenceCount
      dispatch({
        type: 'SET_DRILL_INDEX',
        index: next,
      })
    }
  }, [])

  useHotkeys(
    'space',
    (e) => {
      e.preventDefault()
      if (stateRef.current.sessionPhase === 'idle') {
        handleStartSession()
      } else if (stateRef.current.recording) {
        if (voicedStartMsRef.current === null) {
          handleEndSession()
        } else {
          void handleNextTake()
        }
      }
    },
    [stateRef, handleStartSession, handleEndSession, handleNextTake],
  )

  useHotkeys(
    'esc',
    (e) => {
      e.preventDefault()
      handleEndSession()
    },
    [handleEndSession],
  )

  useHotkeys(
    'arrowleft',
    (e) => {
      if (passage.kind === 'sentenceLists') {
        e.preventDefault()
        handleDrillPrev()
      }
    },
    [passage.kind, handleDrillPrev],
    { enabled: passage.kind === 'sentenceLists' },
  )

  useHotkeys(
    'arrowright',
    (e) => {
      if (passage.kind === 'sentenceLists') {
        e.preventDefault()
        handleDrillNext()
      }
    },
    [passage.kind, handleDrillNext],
    { enabled: passage.kind === 'sentenceLists' },
  )

  const textSizeClass = TEXT_SIZE_CLASS[settings.practiceTextSize]

  const sentences: readonly string[] = useMemo(() => {
    const raw = passage.kind === 'sentenceLists' ? passage.lists.flat() : []
    return randomize ? shuffleArray(raw) : raw
  }, [passage, randomize])

  // Keep sentence count in the reducer for the playback-end handler
  useLayoutEffect(() => {
    dispatch({ type: 'SET_SENTENCE_COUNT', count: sentences.length })
  }, [sentences.length])
  useLayoutEffect(() => {
    modeRef.current = mode
  })
  useLayoutEffect(() => {
    handleNextTakeRef.current = handleNextTake
  })

  const selectedTitle = passage.title

  // --- Main render ---
  return (
    <main className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2 shrink-0">
        <Tooltip>
          <TooltipTrigger>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Braat</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>Back to analysis</TooltipContent>
        </Tooltip>
        <h1 className="text-sm font-medium shrink-0">Practice</h1>
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <Select value={passageId} onValueChange={handlePassageChange}>
            <SelectTrigger size="sm" className="w-62 min-w-0 shrink">
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
            mode={mode}
            onModeChange={handleModeChange}
            onOpenAudioSettings={handleOpenAudioSettings}
            autoAdvance={autoAdvance}
            onAutoAdvanceChange={handleAutoAdvanceChange}
            randomize={randomize}
            onRandomizeChange={handleRandomizeChange}
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
                {passage.passage}
              </div>
              <PracticePassageFooter
                source={passage.source}
                sourceUrl={passage.sourceUrl}
                attribution={passage.attribution}
              />
            </div>
          ) : passage.kind === 'sentenceLists' ? (
            <div className="mx-auto max-w-3xl px-4 py-6">
              <div className="flex flex-col justify-center min-h-64">
                <div
                  className={cn(
                    'text-center font-serif leading-relaxed py-8',
                    textSizeClass,
                  )}
                >
                  {sentences[state.drillIndex]}
                </div>
              </div>
              <PracticeDrillPager
                sentenceIndex={state.drillIndex}
                sentenceCount={sentences.length}
                onPrevious={handleDrillPrev}
                onNext={handleDrillNext}
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
            onStarTake={handleStarTake}
            onClearSession={handleClearSession}
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
          onStarTake={handleStarTake}
          onClearSession={handleClearSession}
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
          state.sessionPhase !== 'idle' &&
            'lg:fixed lg:bottom-4 lg:left-4 lg:z-20 lg:w-80 lg:rounded-xl lg:border lg:bg-background lg:shadow-lg',
        )}
      >
        <PracticeStatusRow
          phase={state.sessionPhase}
          playing={state.playingTakeId !== null}
          timerActive={voicedStartMs !== null}
          elapsedMs={elapsedMs}
          level={displayLevel.intensity}
          voiced={displayLevel.voiced}
          onStartSession={handleStartSession}
          onNextTake={handleNextTake}
          onEndSession={handleEndSession}
          numTakes={state.takes.length}
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
