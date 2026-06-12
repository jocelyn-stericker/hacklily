// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'

import { Dialogs } from '#/components/Dialogs'
import { Plot } from '#/components/Plot'
import { Spectrogram } from '#/components/Spectrogram'
import type { SpectrogramHandle } from '#/components/Spectrogram'
import { SpeechStrip } from '#/components/SpeechStrip'
import type { SpeechStripHandle } from '#/components/SpeechStrip'
import { Toolbar } from '#/components/Toolbar'
import { TranscriptStore } from '#/components/TranscriptStore'
import { useAudioImport } from '#/components/useAudioImport'
import { useAudioPlayback } from '#/components/useAudioPlayback'
import { autoTier, useChunkWorkQueue } from '#/components/useChunkWorkQueue'
import { useMicCapture } from '#/components/useMicCapture'
import { usePreemptibleCallback } from '#/components/usePreemptibleCallback'
import { useSettings } from '#/components/useSettings'
import { useTimelineState } from '#/components/useTimelineState'
import { useUpgradeVisibleTranscriptions } from '#/components/useUpgradeVisibleTranscriptions'
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
} from '#/lib/analysis/AnalysisFrame'
import { reconcileVoicingAt, totalFrames } from '#/lib/analysis/AnalysisFrame'
import { AudioRope } from '#/lib/audio/AudioRope'
import type { AudioRopeGrow, AudioRopeShare } from '#/lib/audio/AudioRope'
import { exportWav } from '#/lib/audio/exportWav'
import { getOrCreateSharedAudioContext } from '#/lib/audio/sharedAudioContext'
import type { Viewport } from '#/lib/jobs/schedule'
import { RopeGainCache } from '#/lib/loudness/ropeLoudness'
import { preferredSampleRate, updateSettings } from '#/lib/settings'
import { consumeBundledCrashFlag } from '#/lib/transcription/transcribeBundled'
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

  const [settings] = useSettings()

  // Restore the base title on (client-side) navigation back to the app; tool
  // pages like /ipa set their own document.title and the head isn't reloaded.
  useEffect(() => {
    document.title = 'Braat'
  }, [])

  const [ropes, setRopes] = useState<Array<AudioRope>>([])
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
    handlePlay: triggerPlay,
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

  const preferredRate = preferredSampleRate(settings)

  const handlePlay = useCallback(() => {
    // Unlock the shared AudioContext synchronously in the gesture handler so
    // iOS Safari starts it in a running state.
    getOrCreateSharedAudioContext(preferredRate)
    triggerPlay()
  }, [triggerPlay, preferredRate])

  const handleStart = useCallback(() => {
    // Unlock here too so playback after a recording session needs no further gesture.
    getOrCreateSharedAudioContext(preferredRate)
    recordingStartIndexRef.current = totalFrames(analysisMutRef.current)
    recordingDurationSecRef.current = analysisMutRef.current.reduce(
      (t, c) => t + (c.frames.length * c.timeStepSamples) / c.sampleRate,
      0,
    )
    startRecording()
  }, [startRecording, preferredRate])

  const ropesRef = useRef<AudioRope[]>(ropes)
  useEffect(() => {
    ropesRef.current = ropes
  }, [ropes])

  // Per-recording loudness-normalization gains, shared between playback and
  // export so the exported file sounds like what was played.
  const [gainCache] = useState(() => new RopeGainCache())

  // External store the SpeechStrip overlay subscribes to: chunks are mutated in
  // place, so structural changes and (later) per-chunk transcripts are surfaced
  // to React through here rather than through prop identity.
  const [transcriptStore] = useState(() => new TranscriptStore())

  // Publish chunk-list changes that swap the array identity (import, New, a
  // finished recording) to the overlay. In-place growth during recording is
  // published imperatively from the append/patch handlers below.
  useEffect(() => {
    transcriptStore.publishChunkList(analysisMut)
  }, [analysisMut, transcriptStore])

  // Mirror the visible range into a ref so the queue can prioritise on-screen
  // chunks, following the viewport without restarting its pass.
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

  // When the selected model turns out not to be downloaded, turn transcription
  // off and tell the user rather than failing every chunk. Guarded to fire once
  // per mode; re-armed when the mode changes.
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

  const { request: requestTranscription, onSeal: handleTranscriptionSeal } =
    useChunkWorkQueue({
      store: transcriptStore,
      analysisMutRef,
      ropesRef,
      getViewport,
      transcriptionMode: settings.transcriptionMode,
      onModelUnavailable: handleModelUnavailable,
    })

  const handleTranscribeButton = useCallback(
    (chunk: AnalysisChunk) => {
      if (settings.transcriptionMode === 'disabled') {
        setShowTranscriptionSettings(true)
      } else {
        requestTranscription(chunk)
      }
    },
    [requestTranscription, settings.transcriptionMode],
  )

  const upgradeVisibleTranscriptions = useUpgradeVisibleTranscriptions(
    transcriptStore,
    timelineState.viewportLeftSec,
    timelineState.viewportRightSec,
    autoTier(settings.transcriptionMode, true),
    requestTranscription,
  )
  const hasUpgradableVisible =
    settings.transcriptionMode === 'large' && !!upgradeVisibleTranscriptions

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

  const handleChunkStart = useCallback(
    (params: AnalysisParams) => {
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
      transcriptStore.publishChunkList(analysisMutRef.current)
    },
    [transcriptStore],
  )

  const schedulePlaybackPositionChanged = usePreemptibleCallback(
    handlePlaybackPositionChanged,
  )
  const handleAppend = useCallback(
    (frame: AnalysisFrame) => {
      const lastChunk =
        analysisMutRef.current[analysisMutRef.current.length - 1]!
      const wasVoiced = lastChunk.voiced
      lastChunk.frames.push(frame)
      lastChunk.voiced ||= frame.speechDetected
      const globalIndex = totalFrames(analysisMutRef.current) - 1
      waveformRef.current?.append(globalIndex)
      spectrogramRef.current?.append(globalIndex)
      vowelChartRef.current?.append(globalIndex)
      speechStripRef.current?.append(globalIndex)
      // Only a structural change needs a publish: a chunk turning voiced adds a
      // button. Pure growth of an already-voiced chunk doesn't -- the snapshot
      // holds the live chunk objects, so the next render (e.g. the viewport
      // auto-scrolling) already reads the new extent. Skipping it avoids a
      // redundant overlay re-render on every recorded frame.
      if (!wasVoiced && lastChunk.voiced) {
        transcriptStore.publishChunkList(analysisMutRef.current)
      }
      recordingDurationSecRef.current +=
        lastChunk.timeStepSamples / lastChunk.sampleRate
      schedulePlaybackPositionChanged(recordingDurationSecRef.current)
    },
    [schedulePlaybackPositionChanged, transcriptStore],
  )
  const handleAudioRopeGrow = useCallback(
    (ev: AudioRopeGrow) => {
      ropes[ropes.length - 1]!.grow(ev)
    },
    [ropes],
  )
  const handleAudioRopeShare = useCallback(
    (ev: AudioRopeShare) => {
      ropes.push(new AudioRope(ev))
    },
    [ropes],
  )
  const handleAudioRopeSeal = useCallback(() => {
    // Seal our copy too, releasing its spare buffer. The shared flag is already
    // set by the producer; this just drops the local reference.
    ropes[ropes.length - 1]!.seal()
    // Publish the final chunk dimensions: during recording, frames were appended
    // in place without publishing (to avoid re-rendering every frame). The DOM
    // overlay needs the updated extent before transcripts arrive.
    transcriptStore.publishChunkList(analysisMutRef.current)
    // Recording audio is complete: let the queue finish its live spans.
    handleTranscriptionSeal()
  }, [ropes, handleTranscriptionSeal, transcriptStore])

  const handlePatch = useCallback(
    (from: number, to: number) => {
      const absFrom = recordingStartIndexRef.current + from
      const absTo = recordingStartIndexRef.current + to

      // Re-chunk around each patched frame so every chunk stays uniformly
      // voiced/unvoiced (a VAD patch may flip frames -- onset, redemption revert,
      // or min-speech discard). The VAD revises the tail on nearly every frame,
      // but the chunk structure rarely changes, so only publish when it does.
      let voicingChanged = false
      for (let abs = absFrom; abs < absTo; abs++) {
        if (reconcileVoicingAt(analysisMutRef.current, abs))
          voicingChanged = true
      }

      waveformRef.current?.patch(absFrom, absTo)
      spectrogramRef.current?.patch(absFrom, absTo)
      vowelChartRef.current?.patch(absFrom, absTo)
      speechStripRef.current?.patch(absFrom, absTo)
      // Only a split/merge/voicing flip changes which chunks the overlay shows.
      if (voicingChanged) {
        // Re-chunking shifted boundaries: any chunk overlapping the patched range
        // now spans different audio than its transcript covered, so drop those
        // transcripts (the queue re-transcribes them).
        let offset = 0
        for (const c of analysisMutRef.current) {
          const end = offset + c.frames.length
          if (offset < absTo && end > absFrom)
            transcriptStore.clearTranscript(c)
          offset = end
        }
        transcriptStore.publishChunkList(analysisMutRef.current)
      }
    },
    [transcriptStore],
  )

  useMicCapture({
    enabled: status.value === 'recording',
    onChunkStart: handleChunkStart,
    onAppend: handleAppend,
    onPatch: handlePatch,
    onRecordingComplete: handleRecordingComplete,
    onError: handleError,
    onAudioRopeGrow: handleAudioRopeGrow,
    onAudioRopeShare: handleAudioRopeShare,
    onAudioRopeSeal: handleAudioRopeSeal,
    features: {
      spectrogram: true,
      formant: true,
      vad: true,
    },
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
  useHotkeys(
    't',
    () => {
      if (settings.transcriptionMode === 'large' && hasUpgradableVisible) {
        upgradeVisibleTranscriptions()
      }
    },
    [
      settings.transcriptionMode,
      hasUpgradableVisible,
      upgradeVisibleTranscriptions,
    ],
  )

  const virtualWidthSec =
    Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
    (timelineState.viewportRightSec - timelineState.viewportLeftSec)

  const showWelcome = analysisMut.length === 0 && status.value === 'inactive'
  const noOp = useCallback(() => {}, [])

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
          showUpgradeAll={settings.transcriptionMode === 'large'}
          onUpgradeAll={upgradeVisibleTranscriptions}
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
                        f3: hoverFrame.f3,
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
              speechStripHeight={60}
            >
              <Spectrogram
                analysisMut={analysisMut}
                ref={spectrogramRef}
                debug={false}
              />
              <SpeechStrip
                analysisMut={analysisMut}
                store={transcriptStore}
                onTranscribe={handleTranscribeButton}
                ref={speechStripRef}
              />
              {status.value !== 'recording' &&
                settings.vowelChartAverages !== 'hidden' && (
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
