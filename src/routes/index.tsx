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
import { updateSettings, useSettings } from '#/lib/settings'
import { consumeBundledCrashFlag } from '#/lib/transcribeBundled'
import { chunkPcmFromRopes, transcribeChunks } from '#/lib/transcription'
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

  const settings = useSettings()

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
          'Bundled transcription may have crashed last time, which can happen on lower-memory devices.',
      })
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

  const handlePatch = useCallback((from: number, to: number) => {
    const absFrom = recordingStartIndexRef.current + from
    const absTo = recordingStartIndexRef.current + to

    // Re-chunk around each patched frame so every chunk stays uniformly
    // voiced/unvoiced (a VAD patch may flip frames — onset, redemption revert,
    // or min-speech discard). Only re-transcribe if some voicing actually
    // changed.
    let voicingChanged = false
    for (let abs = absFrom; abs < absTo; abs++) {
      if (reconcileVoicingAt(analysisMutRef.current, abs)) voicingChanged = true
    }
    if (voicingChanged) {
      speechStripRef.current?.refreshTranscriptions()
    }

    waveformRef.current?.patch(absFrom, absTo)
    spectrogramRef.current?.patch(absFrom, absTo)
    vowelChartRef.current?.patch(absFrom, absTo)
    speechStripRef.current?.patch(absFrom, absTo)
  }, [])

  const handleTranscribe = useCallback(() => {
    // We automatically transcribe things if transcription is enabled. Before it's enabled,
    // we show a button to enable transcription, and that's what this handles.
    setShowTranscriptionSettings(true)
  }, [])

  useMicCapture({
    enabled: status.value === 'recording',
    onChunkStart: handleChunkStart,
    onAppend: handleAppend,
    onPatch: handlePatch,
    onRecordingComplete: handleRecordingComplete,
    onError: handleError,
    onSabRopeGrow: handleSabRopeGrow,
    onSabRopeShare: handleSabRopeShare,
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

  const virtualWidthSec =
    Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
    (timelineState.viewportRightSec - timelineState.viewportLeftSec)

  const isRecording =
    status.value === 'recording' || status.value === 'analyzing'
  const noOp = useCallback(() => {}, [])

  // Transcribe. Results mutate chunks in place, so we tell the SpeechStrip
  // imperatively to re-render its overlay as they arrive.
  useEffect(() => {
    if (isRecording || ropes.length === 0) return
    transcribeChunks(
      analysisMut,
      settings,
      (chunk) => chunkPcmFromRopes(chunk, analysisMut, ropes),
      () => speechStripRef.current?.refreshTranscriptions(),
    )
  }, [analysisMut, settings, isRecording, ropes])

  return (
    <>
      <Dialogs
        analysisMut={analysisMut}
        status={status}
        onAcknowledgeError={handleAcknowledgeError}
        onStartRecording={startRecording}
        openFilePicker={openFilePicker}
        confirmingNew={confirmingAction !== null}
        onCancelNew={handleCancelNew}
        onConfirmNew={handleConfirmNew}
        showAudioSettings={status.value === 'editAudioSettings'}
        onCloseAudioSettings={handleOpenAudioSettings}
        showTranscriptionSettings={showTranscriptionSettings}
        onCloseTranscriptionSettings={setShowTranscriptionSettings}
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
        />
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
                  ? { f0: hoverFrame.f0, f1: hoverFrame.f1, f2: hoverFrame.f2 }
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
              onTranscribe={handleTranscribe}
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
                  cursorSec={timelineState.hoverSec ?? timelineState.cursorSec}
                  ref={vowelChartRef}
                />
              </div>
            )}
          </Plot>
        </div>
      </main>
    </>
  )
}
