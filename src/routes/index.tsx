/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'

import { Dialogs } from '#/components/Dialogs'
import { Plot } from '#/components/Plot'
import { Spectrogram } from '#/components/Spectrogram'
import type { SpectrogramHandle } from '#/components/Spectrogram'
import { SpeechStrip } from '#/components/SpeechStrip'
import type { SpeechStripHandle } from '#/components/SpeechStrip'
import { Toolbar } from '#/components/Toolbar'
import { useAudioImport } from '#/components/useAudioImport'
import { useAudioPlayback } from '#/components/useAudioPlayback'
import { useMicCapture } from '#/components/useMicCapture'
import { usePreemptibleCallback } from '#/components/usePreemptibleCallback'
import { useTimelineState } from '#/components/useTimelineState'
import { ViewportShade } from '#/components/ViewportShade'
import { VowelChart } from '#/components/VowelChart'
import type { VowelChartHandle } from '#/components/VowelChart'
import { Waveform } from '#/components/Waveform'
import type { WaveformHandle } from '#/components/Waveform'
import { WelcomeModal } from '#/components/WelcomeModal'
import type {
  AnalysisChunk,
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/AnalysisFrame'
import { reconcileVoicingAt, totalFrames } from '#/lib/AnalysisFrame'
import { exportWav } from '#/lib/exportWav'
import { RopeGainCache } from '#/lib/ropeLoudness'
import { SabRope } from '#/lib/SabRope'
import type { SabRopeGrow, SabRopeShare } from '#/lib/SabRope'
import {
  isManualTranscription,
  updateSettings,
  useSettings,
} from '#/lib/settings'
import { consumeBundledCrashFlag } from '#/lib/transcribeBundled'
import {
  chunkAudioFromRopes,
  computeSealResolutions,
  invalidateTranscriptions,
  locateChunkRope,
  reconcileLiveSpans,
  transcribeChunks,
} from '#/lib/transcription'
import type {
  AudioSpan,
  ChunkAudioProvider,
  LiveSpanEntry,
  Viewport,
} from '#/lib/transcription'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const waveformRef = useRef<WaveformHandle>(null)
  const spectrogramRef = useRef<SpectrogramHandle>(null)
  const vowelChartRef = useRef<VowelChartHandle>(null)
  const speechStripRef = useRef<SpeechStripHandle>(null)
  const [analysisMut, replaceAnalysis] = useState<AnalysisChunk[]>([])

  const [showTranscriptionSettings, setShowTranscriptionSettings] =
    useState(false)
  const [showVowelChartSettings, setShowVowelChartSettings] = useState(false)

  const settings = useSettings()

  // Bumped whenever chunk transcriptions change in place (a manual pass
  // progresses, or a model switch clears them). `analysisMut`'s identity is
  // stable across those mutations, so derived render values that scan it (the
  // Transcribe button's disabled state) must read this version to recompute —
  // see project_react_compiler_inplace_mutation.
  const [transcriptionVersion, bumpTranscriptions] = useReducer(
    (x: number) => x + 1,
    0,
  )

  const [ropes, setRopes] = useState<Array<SabRope>>([])
  const {
    status,
    timelineState,
    waveformTimelineState,
    handleAnalyze,
    handleNew: resetTimeline,
    handlePlotScroll,
    handlePlotClick,
    handlePlotHover,
    handlePlotZoom,
    handlePlay,
    handleStart: startRecording,
    handlePause,
    handleBackToStart,
    handleJump,
    handleAcknowledgeError,
    handleRecordingComplete: handleAudioBufferAppended,
    handlePlaybackPositionChanged,
    handleError,
    handleOpenAudioSettings,
    hoverFrame,
  } = useTimelineState(analysisMut)

  const { openFilePicker } = useAudioImport({
    handleAnalyze,
    onStart: () => {
      replaceAnalysis([])
    },
    onImported: ({ analysis: newAnalysis, ropes: newRopes }) => {
      setRopes(newRopes)
      replaceAnalysis(newAnalysis)
    },
  })

  const recordingStartIndexRef = useRef(0)
  const recordingDurationSecRef = useRef(0)

  const [confirmingAction, setConfirmingAction] = useState<
    'new' | 'open' | null
  >(null)

  const doNew = useCallback(() => {
    resetTimeline()
    replaceAnalysis([])
    setRopes([])
    recordingStartIndexRef.current = 0
    recordingDurationSecRef.current = 0
  }, [resetTimeline])

  const hasData =
    ropes.some((rope) => rope.length > 0) ||
    analysisMut.length > 0 ||
    status.value === 'recording'

  const handleNew = useCallback(() => {
    if (hasData) {
      setConfirmingAction('new')
      return
    }
    doNew()
  }, [hasData, doNew])

  const handleCancelNew = useCallback(() => {
    setConfirmingAction(null)
  }, [])

  const handleConfirmNew = useCallback(() => {
    const action = confirmingAction
    if (action === 'new') {
      doNew()
    } else if (action === 'open') {
      openFilePicker()
    }
    setConfirmingAction(null)
  }, [confirmingAction, doNew, openFilePicker])

  const handleOpen = useCallback(() => {
    if (hasData) {
      setConfirmingAction('open')
      return
    }
    openFilePicker()
  }, [hasData, openFilePicker])

  const ampMaxNorm = analysisMut.reduce(
    (memo, chunk) => chunk.frames.reduce((m, f) => Math.max(m, f.rms), memo),
    0,
  )

  const analysisMutRef = useRef(analysisMut)
  useEffect(() => {
    analysisMutRef.current = analysisMut
  })

  // If the previous session was killed while the bundled model was running (most
  // likely an out-of-memory tab crash on a low-memory device), don't silently
  // reload straight back into the same crash: turn transcription off and tell
  // the user why so they can pick a lighter engine. Runs once on mount.
  useEffect(() => {
    if (!consumeBundledCrashFlag()) return
    void updateSettings({ transcriptionMode: 'disabled' })
    setTimeout(() => {
      toast('Transcription was turned off', {
        description:
          'Bundled transcription may have crashed last time, possibly due to insufficient memory',
      })
    })
  }, [])

  // When the selected transcription model turns out not to be downloaded (it was
  // never fetched, or its cached weights were evicted), turn transcription off
  // and tell the user, rather than failing every chunk. Guarded to fire once per
  // mode so a single pass doesn't stack toasts; re-armed when the mode changes.
  const modelUnavailableHandledRef = useRef(false)
  useEffect(() => {
    modelUnavailableHandledRef.current = false
  }, [settings.transcriptionMode])
  const handleModelUnavailable = useCallback(() => {
    if (modelUnavailableHandledRef.current) return
    modelUnavailableHandledRef.current = true
    void updateSettings({ transcriptionMode: 'disabled' })
    toast('Transcription was turned off', {
      description:
        'The selected model isn’t available. Re-enable transcription in settings to download it.',
    })
  }, [])

  const handleStart = useCallback(() => {
    recordingStartIndexRef.current = totalFrames(analysisMutRef.current)
    recordingDurationSecRef.current = analysisMutRef.current.reduce(
      (t, c) => t + (c.frames.length * c.timeStepSamples) / c.sampleRate,
      0,
    )
    startRecording()
  }, [startRecording])

  const ropesRef = useRef<SabRope[]>(ropes)
  useEffect(() => {
    ropesRef.current = ropes
  }, [ropes])

  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Mirror the visible time range into a ref so transcription can read it live
  // on each step and prioritise on-screen chunks, following the viewport as the
  // user scrolls/zooms mid-pass without restarting the scan.
  const viewportRef = useRef<Viewport>({
    leftSec: timelineState.viewportLeftSec,
    rightSec: timelineState.viewportRightSec,
  })
  useEffect(() => {
    viewportRef.current = {
      leftSec: timelineState.viewportLeftSec,
      rightSec: timelineState.viewportRightSec,
    }
  }, [timelineState.viewportLeftSec, timelineState.viewportRightSec])
  const getViewport = useCallback((): Viewport => viewportRef.current, [])

  // Live transcription spans: deferred endTime + abort for each voiced chunk
  // being transcribed during recording. Cleared when the rope is sealed.
  const liveSpansRef = useRef<Map<AnalysisChunk, LiveSpanEntry>>(new Map())
  const [liveChunks, setLiveChunks] = useState<Set<AnalysisChunk>>(new Set())

  const getAudio: ChunkAudioProvider = useCallback(
    (chunk: AnalysisChunk): AudioSpan | null => {
      const live = liveSpansRef.current.get(chunk)
      if (live) {
        const loc = locateChunkRope(
          chunk,
          analysisMutRef.current,
          ropesRef.current,
        )
        if (!loc) return null
        return {
          rope: loc.rope,
          startTime: loc.startSample / loc.rope.sampleRate,
          endTime: live.endTimePromise,
          signal: live.abortController.signal,
        }
      }
      return chunkAudioFromRopes(
        chunk,
        analysisMutRef.current,
        ropesRef.current,
      )
    },
    [],
  )

  // Per-recording loudness-normalization gains, shared between playback and
  // export so the exported file sounds like what was played.
  const [gainCache] = useState(() => new RopeGainCache())

  const [isExporting, setIsExporting] = useState(false)

  const handleExportAudio = useCallback(() => {
    // TODO: support compressed formats
    const currentRopes = ropesRef.current
    if (!currentRopes.some((rope) => rope.length > 0)) return
    setIsExporting(true)
    try {
      exportWav(currentRopes, gainCache.gainsFor(currentRopes))
    } catch (err) {
      handleError(err)
    } finally {
      setIsExporting(false)
    }
  }, [handleError, gainCache])

  const handleRecordingComplete = useCallback(() => {
    // The PCM is already in the ropes; just settle the timeline to the duration
    // accumulated from the analysed frames.
    handleAudioBufferAppended({
      trackDurationSec: recordingDurationSecRef.current,
    })
  }, [handleAudioBufferAppended])

  const handleChunkStart = useCallback((params: AnalysisParams) => {
    const startTimeSec = analysisMutRef.current.reduce(
      (sum, c) => sum + c.frames.length * (c.timeStepSamples / c.sampleRate),
      0,
    )
    analysisMutRef.current.push({
      ...params,
      startTimeSec,
      frames: [],
      voiced: false,
      recordingStart: true,
    })
  }, [])

  const schedulePlaybackPositionChanged = usePreemptibleCallback(
    handlePlaybackPositionChanged,
  )
  const handleAppend = useCallback(
    (frame: AnalysisFrame) => {
      const lastChunk =
        analysisMutRef.current[analysisMutRef.current.length - 1]!
      lastChunk.frames.push(frame)
      lastChunk.voiced ||= frame.speechDetected
      const globalIndex = totalFrames(analysisMutRef.current) - 1
      waveformRef.current?.append(globalIndex)
      spectrogramRef.current?.append(globalIndex)
      vowelChartRef.current?.append(globalIndex)
      speechStripRef.current?.append(globalIndex)
      recordingDurationSecRef.current +=
        lastChunk.timeStepSamples / lastChunk.sampleRate
      schedulePlaybackPositionChanged(recordingDurationSecRef.current)
    },
    [schedulePlaybackPositionChanged],
  )
  const handleSabRopeGrow = useCallback(
    (ev: SabRopeGrow) => {
      ropes[ropes.length - 1]!.grow(ev)
    },
    [ropes],
  )
  const handleSabRopeShare = useCallback(
    (ev: SabRopeShare) => {
      ropes.push(new SabRope(ev))
    },
    [ropes],
  )
  const handleSabRopeSeal = useCallback(() => {
    // Seal our copy too, releasing its spare buffer. The shared flag is already
    // set by the producer; this just drops the local reference.
    ropes[ropes.length - 1]!.seal()

    // Recording audio is complete. Resolve all pending live span endTimes so
    // in-flight transcriptions can finish, then clear the map.
    const resolutions = computeSealResolutions(
      analysisMutRef.current,
      liveSpansRef.current,
      ropesRef.current,
    )
    for (const { span, endTime } of resolutions) {
      span.resolveEndTime(endTime)
    }
    liveSpansRef.current.clear()
    setLiveChunks(new Set())
  }, [ropes])

  // Reconcile live transcription spans after voicing changes during recording:
  // abort spans for chunks that are no longer voiced, resolve endTime for spans
  // whose voiced segment has ended (next chunk is unvoiced), create spans for
  // newly-voiced chunks, and kick off transcription.
  const applyReconciliation = useCallback(() => {
    const mode = settingsRef.current.transcriptionMode
    // Nothing to reconcile when transcription is off, or when the current model
    // only transcribes on demand — manual modes don't transcribe live during
    // recording, so no live spans are created until the user asks.
    if (mode === 'disabled' || isManualTranscription(mode)) return

    const chunks = analysisMutRef.current
    const liveSpans = liveSpansRef.current
    const currentRopes = ropesRef.current

    const result = reconcileLiveSpans(chunks, liveSpans, currentRopes)

    for (const chunk of result.abort) {
      liveSpans.get(chunk)?.abortController.abort()
      liveSpans.delete(chunk)
    }
    for (const { chunk, span, endTime } of result.resolve) {
      span.resolveEndTime(endTime)
      liveSpans.delete(chunk)
    }
    for (const chunk of result.create) {
      let resolveEndTime!: (endTime: number) => void
      const endTimePromise = new Promise<number>((resolve) => {
        resolveEndTime = resolve
      })
      const abortController = new AbortController()
      liveSpans.set(chunk, { abortController, endTimePromise, resolveEndTime })
    }

    setLiveChunks(new Set(liveSpans.keys()))

    transcribeChunks(
      chunks,
      settingsRef.current,
      getAudio,
      () => speechStripRef.current?.refreshTranscriptions(),
      handleModelUnavailable,
      getViewport,
    )
  }, [getAudio, handleModelUnavailable, getViewport])

  const handlePatch = useCallback(
    (from: number, to: number) => {
      const absFrom = recordingStartIndexRef.current + from
      const absTo = recordingStartIndexRef.current + to

      // Re-chunk around each patched frame so every chunk stays uniformly
      // voiced/unvoiced (a VAD patch may flip frames — onset, redemption revert,
      // or min-speech discard). Only re-transcribe if some voicing actually
      // changed.
      let voicingChanged = false
      for (let abs = absFrom; abs < absTo; abs++) {
        if (reconcileVoicingAt(analysisMutRef.current, abs))
          voicingChanged = true
      }
      if (voicingChanged) {
        applyReconciliation()
        speechStripRef.current?.refreshTranscriptions()
      }

      waveformRef.current?.patch(absFrom, absTo)
      spectrogramRef.current?.patch(absFrom, absTo)
      vowelChartRef.current?.patch(absFrom, absTo)
      speechStripRef.current?.patch(absFrom, absTo)
    },
    [applyReconciliation],
  )

  const handleSetUpTranscription = useCallback(() => {
    // When transcription is off, the header's Transcribe button is the prompt to
    // turn it on (it replaces the per-segment buttons that used to live in the
    // SpeechStrip): clicking it opens the transcription settings.
    setShowTranscriptionSettings(true)
  }, [])

  // Manual transcription: kick off a pass over everything recorded/imported so
  // far and report progress in a single toast. Used for models that don't
  // transcribe automatically (see isManualTranscription). Chunks recorded after
  // this runs stay untranscribed until the user triggers it again.
  const transcribeToastSeq = useRef(0)
  const handleTranscribeAll = useCallback(() => {
    const chunks = analysisMutRef.current
    // The chunks transcription is being requested for, captured now. They're
    // mutated in place as results land, so we can read their status to track
    // progress.
    const targets = chunks.filter((c) => c.voiced && !c.transcription)
    if (targets.length === 0) {
      toast('Nothing to transcribe')
      return
    }
    const total = targets.length
    const id = `transcribe-${(transcribeToastSeq.current += 1)}`
    const settled = () =>
      targets.filter(
        (c) => c.transcription && c.transcription.status !== 'pending',
      ).length

    toast.loading(`Transcribing… 0/${total}`, { id })
    transcribeChunks(
      chunks,
      settingsRef.current,
      getAudio,
      () => {
        speechStripRef.current?.refreshTranscriptions()
        bumpTranscriptions()
        const done = settled()
        if (done < total)
          toast.loading(`Transcribing… ${done}/${total}`, { id })
      },
      handleModelUnavailable,
      getViewport,
      () => {
        const done = settled()
        const word = total === 1 ? 'segment' : 'segments'
        if (done >= total) {
          toast.success(`Transcribed ${total} ${word}`, { id })
        } else if (done === 0) {
          // Nothing landed — e.g. the model turned out to be unavailable, which
          // surfaces its own toast and reverts the mode. Drop the progress one.
          toast.dismiss(id)
        } else {
          toast.warning(`Transcribed ${done} of ${total} segments`, { id })
        }
      },
    )
  }, [getAudio, handleModelUnavailable, getViewport])

  useMicCapture({
    enabled: status.value === 'recording',
    onChunkStart: handleChunkStart,
    onAppend: handleAppend,
    onPatch: handlePatch,
    onRecordingComplete: handleRecordingComplete,
    onError: handleError,
    onSabRopeGrow: handleSabRopeGrow,
    onSabRopeShare: handleSabRopeShare,
    onSabRopeSeal: handleSabRopeSeal,
  })

  useAudioPlayback({
    enabled: status.value === 'playing',
    ropes,
    gainCache,
    cursorSec: timelineState.cursorSec,
    onStop: handlePause,
    onPlaybackPositionChanged: handlePlaybackPositionChanged,
    onError: handleError,
  })

  const playDisabled = !ropes.some((rope) => rope.length > 0)
  const exportAudioDisabled = playDisabled || isExporting

  useEffect(() => {
    if (!hasData) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasData])

  const isRecording =
    status.value === 'recording' || status.value === 'analyzing'
  const manualTranscription = isManualTranscription(settings.transcriptionMode)
  // Only meaningful in manual mode. Disable the Transcribe action while
  // recording, when everything voiced is already transcribed (nothing left to
  // do), or while a segment is mid-transcription (a pass is already running).
  // `transcriptionVersion >= 0` is always true; reading it here makes the
  // version a real dependency so in-place transcription mutations (which leave
  // `analysisMut`'s identity untouched) recompute this under the React Compiler.
  const transcribeDisabled =
    transcriptionVersion >= 0 &&
    (isRecording ||
      !analysisMut.some((c) => c.voiced && !c.transcription) ||
      analysisMut.some((c) => c.transcription?.status === 'pending'))

  // The header's Transcribe button does double duty: in a manual model it runs a
  // pass; with transcription off (and once there's audio) it's the prompt to set
  // it up. Automatic models just transcribe, so it's hidden.
  const transcriptionOff = settings.transcriptionMode === 'disabled'
  const showTranscribe = manualTranscription || transcriptionOff
  const onTranscribeClick = manualTranscription
    ? handleTranscribeAll
    : handleSetUpTranscription
  const transcribeTitle = manualTranscription
    ? 'Transcribe (T)'
    : 'Set up transcription'
  const transcribeButtonDisabled = manualTranscription
    ? transcribeDisabled
    : false

  useHotkeys(
    'space',
    (e) => {
      e.preventDefault()
      if (status.value === 'playing' || status.value === 'recording') {
        handlePause()
      } else if (!playDisabled) {
        handlePlay()
      }
    },
    [status, playDisabled, handlePause, handlePlay],
  )
  useHotkeys('shift+arrowleft', handleBackToStart, [handleBackToStart], {
    enabled: status.value !== 'recording' && status.value !== 'analyzing',
  })
  useHotkeys(
    'shift+arrowright',
    (e) => {
      e.preventDefault()
      handleJump(Infinity)
    },
    [handleJump],
    { enabled: status.value !== 'recording' && status.value !== 'analyzing' },
  )
  useHotkeys(
    'arrowleft',
    (e) => {
      e.preventDefault()
      handleJump(-0.5)
    },
    [handleJump],
    { enabled: status.value !== 'recording' && status.value !== 'analyzing' },
  )
  useHotkeys(
    'arrowright',
    (e) => {
      e.preventDefault()
      handleJump(0.5)
    },
    [handleJump],
    { enabled: status.value !== 'recording' && status.value !== 'analyzing' },
  )
  useHotkeys(
    'r',
    () => {
      if (status.value !== 'recording' && status.value !== 'analyzing') {
        handleStart()
      }
    },
    [status, handleStart],
  )
  useHotkeys(
    't',
    () => {
      if (manualTranscription && !transcribeDisabled) handleTranscribeAll()
    },
    [manualTranscription, transcribeDisabled, handleTranscribeAll],
  )
  useHotkeys(
    'mod+o',
    (e) => {
      e.preventDefault()
      handleOpen()
    },
    [handleOpen],
  )
  useHotkeys(
    'mod+e',
    (e) => {
      e.preventDefault()
      if (!exportAudioDisabled) handleExportAudio()
    },
    [exportAudioDisabled, handleExportAudio],
  )
  useHotkeys(
    'mod+comma',
    (e) => {
      e.preventDefault()
      handleOpenAudioSettings()
    },
    [handleOpenAudioSettings],
  )

  const virtualWidthSec =
    Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
    (timelineState.viewportRightSec - timelineState.viewportLeftSec)

  const showWelcome = analysisMut.length === 0 && status.value === 'inactive'
  const noOp = useCallback(() => {}, [])

  // Switching to a different transcription model re-transcribes everything with
  // it: the existing text was produced by another engine, so drop it and let the
  // pass below redo it. Tracks the last *enabled* mode (a ref, not state — this
  // is a transition detector, not rendered) so turning transcription off and
  // back on to the same model keeps its results instead of needlessly re-running
  // (costly for the large model). Declared before the transcribe effect so the
  // clear lands first when both fire on the same settings change.
  const prevEnabledModeRef = useRef(
    settings.transcriptionMode === 'disabled'
      ? null
      : settings.transcriptionMode,
  )
  useEffect(() => {
    const next = settings.transcriptionMode
    // Keep the remembered model (and any existing text) across a disable.
    if (next === 'disabled') return
    const prev = prevEnabledModeRef.current
    prevEnabledModeRef.current = next
    // First enable, or re-selecting the same model: nothing to redo.
    if (prev === null || prev === next) return
    invalidateTranscriptions(analysisMutRef.current)
    speechStripRef.current?.refreshTranscriptions()
    bumpTranscriptions()
  }, [settings.transcriptionMode])

  // Transcribe. Results mutate chunks in place, so we tell the SpeechStrip
  // imperatively to re-render its overlay as they arrive. During recording,
  // transcription is kicked off from reconcileLiveSpans; this effect handles
  // the post-recording pass (imports, re-scans, settings changes).
  useEffect(() => {
    if (isRecording || ropes.length === 0) return
    // Manual modes only transcribe when the user triggers it (the header's
    // Transcribe action / `t`), so the automatic pass stands down here.
    if (isManualTranscription(settings.transcriptionMode)) return
    transcribeChunks(
      analysisMut,
      settings,
      getAudio,
      () => speechStripRef.current?.refreshTranscriptions(),
      handleModelUnavailable,
      getViewport,
    )
  }, [
    analysisMut,
    settings,
    isRecording,
    ropes,
    getAudio,
    handleModelUnavailable,
    getViewport,
  ])

  return (
    <>
      <Dialogs
        status={status}
        onAcknowledgeError={handleAcknowledgeError}
        confirmingNew={confirmingAction !== null}
        onCancelNew={handleCancelNew}
        onConfirmNew={handleConfirmNew}
        showAudioSettings={status.value === 'editAudioSettings'}
        onCloseAudioSettings={handleOpenAudioSettings}
        showTranscriptionSettings={showTranscriptionSettings}
        onCloseTranscriptionSettings={setShowTranscriptionSettings}
        showVowelChartSettings={showVowelChartSettings}
        onCloseVowelChartSettings={setShowVowelChartSettings}
      />
      <main className="h-dvh flex flex-col overflow-hidden">
        <Toolbar
          openFilePicker={handleOpen}
          onNew={handleNew}
          timelineState={timelineState}
          status={status}
          onBackToStart={handleBackToStart}
          onStart={handleStart}
          onPause={handlePause}
          onPlay={handlePlay}
          playDisabled={playDisabled}
          onExportAudio={handleExportAudio}
          exportAudioDisabled={exportAudioDisabled}
          onOpenAudioSettings={handleOpenAudioSettings}
          onOpenTranscriptionSettings={() => setShowTranscriptionSettings(true)}
          onOpenVowelChartSettings={() => setShowVowelChartSettings(true)}
          showTranscribe={showTranscribe}
          onTranscribe={onTranscribeClick}
          transcribeDisabled={transcribeButtonDisabled}
          transcribeTitle={transcribeTitle}
        />
        <div className="relative flex flex-col grow overflow-hidden">
          <Plot
            timelineState={waveformTimelineState}
            xAxisVisible={false}
            yAxisVisible={false}
            yAxis={{
              type: 'amplitude',
              ampMaxNorm: ampMaxNorm || 1,
            }}
            onScroll={noOp}
            onZoom={noOp}
            onClick={isRecording ? noOp : handlePlotClick}
            onHover={handlePlotHover}
            className="h-32 max-h-[15dvh] border-b border-b-gray-500"
            virtualWidthSec={virtualWidthSec}
            hideScrollBar={isRecording}
          >
            <Waveform analysisMut={analysisMut} ref={waveformRef} />
            <ViewportShade
              leftSec={timelineState.viewportLeftSec}
              rightSec={timelineState.viewportRightSec}
            />
          </Plot>
          <div className="flex gap-4 grow">
            <Plot
              timelineState={timelineState}
              xAxisVisible={true}
              yAxisVisible={true}
              yAxis={{
                type: 'freq',
                fMinHz: 50,
                fMaxHz: 5500,
                hover:
                  hoverFrame?.pitchDetected && hoverFrame.speechDetected
                    ? {
                        f0: hoverFrame.f0,
                        f1: hoverFrame.f1,
                        f2: hoverFrame.f2,
                      }
                    : null,
              }}
              onScroll={isRecording ? noOp : handlePlotScroll}
              onZoom={handlePlotZoom}
              onClick={isRecording ? noOp : handlePlotClick}
              onHover={handlePlotHover}
              virtualWidthSec={virtualWidthSec}
              className="flex-1"
              hideScrollBar={isRecording}
              speechStripHeight={20}
            >
              <Spectrogram
                analysisMut={analysisMut}
                ref={spectrogramRef}
                debug={false}
              />
              <SpeechStrip
                analysisMut={analysisMut}
                liveChunks={liveChunks}
                ref={speechStripRef}
              />
              {status.value !== 'recording' && (
                <div
                  className={cn(
                    'absolute z-10 pointer-events-none border border-[#ccccdd] dark:border-[#2a2a3a] right-0 h-40 bottom-auto top-0 left-auto md:right-0 md:w-60 md:h-48',
                    !hoverFrame?.speechDetected && 'hidden',
                  )}
                >
                  <VowelChart
                    analysisMut={analysisMut}
                    cursorSec={
                      timelineState.hoverSec ?? timelineState.cursorSec
                    }
                    ref={vowelChartRef}
                  />
                </div>
              )}
            </Plot>
          </div>
          <WelcomeModal
            open={showWelcome}
            onStartRecording={startRecording}
            onOpenFile={openFilePicker}
          />
        </div>
      </main>
    </>
  )
}
