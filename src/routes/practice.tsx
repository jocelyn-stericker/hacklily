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
import { useAudioManager } from '#/components/useAudioManager'
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
import { passages } from '#/lib/passages'
import { stashTake } from '#/lib/practiceHandoff'
import {
  computeVoicedRange,
  initialPracticeState,
  practiceReducer,
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

  // Finish current take, tear down pipeline, then play back
  const handleNextTake = useCallback(async () => {
    if (state.sessionPhase !== 'recording') return

    const startFrame = state.recordingStartFrame
    const params = paramsRef.current
    const rope = sessionRopeRef.current

    if (!rope || !params) return

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

    const takeId = state.nextTakeId
    dispatch({ type: 'END_TAKE', span, voicedRange, endTimeSec })
    dispatch({ type: 'START_PLAYBACK', takeId, skipSilence: true })
    dispatch({ type: 'PENDING_RESTART' })
  }, [
    state.sessionPhase,
    state.nextTakeId,
    state.recordingStartFrame,
    closePipeline,
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

  const audioManager = useAudioManager({
    active: settings.persistentMic || state.sessionPhase !== 'idle',
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

  // Start session — immediately begin recording the first take
  const handleStartSession = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null })
    void audioManager?.unlockForGesture()
    startPipelineAndRecord()
  }, [startPipelineAndRecord, audioManager])

  // End session — stop mic and playback, but keep takes
  const handleEndSession = useCallback(async () => {
    if (state.shuttingDown) return
    dispatch({ type: 'SET_SHUTTING_DOWN', value: true })

    if (state.sessionPhase === 'recording' && state.voicedStartMs !== null) {
      await closePipeline()

      const startFrame = state.recordingStartFrame
      const params = paramsRef.current
      const rope = sessionRopeRef.current

      if (rope && params) {
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
      }
    }

    dispatch({ type: 'STOP_SESSION' })
    setElapsedMs(0)
  }, [
    closePipeline,
    state.voicedStartMs,
    state.sessionPhase,
    state.shuttingDown,
    state.recordingStartFrame,
  ])

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

  useHotkeys(
    'arrowleft',
    (e) => {
      if (passage.kind === 'sentenceLists') {
        e.preventDefault()
        dispatch({ type: 'DRILL_PREV' })
      }
    },
    [passage.kind],
    { enabled: passage.kind === 'sentenceLists' },
  )

  useHotkeys(
    'arrowright',
    (e) => {
      if (passage.kind === 'sentenceLists') {
        e.preventDefault()
        dispatch({ type: 'DRILL_NEXT' })
      }
    },
    [passage.kind],
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
            mode={settings.practiceMode}
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
          audioActive={state.audioStartMs !== null}
          timerActive={state.voicedStartMs !== null}
          elapsedMs={elapsedMs}
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
