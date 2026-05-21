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

// Main application page with audio import, microphone recording, playback controls, and visualization.

import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { Dialogs } from '#/components/Dialogs'
import { Plot } from '#/components/Plot'
import { Spectrogram } from '#/components/Spectrogram'
import type { SpectrogramHandle } from '#/components/Spectrogram'
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
import { totalFrames } from '#/lib/AnalysisFrame'
import { computeDbBounds, concatAudioBuffers } from '#/lib/audioUiHelpers'
import { exportWav } from '#/lib/exportWav.ts'

export const Route = createFileRoute('/')({
  component: App,
})

const DB_MIN_DEFAULT = -120
const DB_MAX_DEFAULT = -16
const SHOW_VOWEL_CHART = localStorage.SHOW_VOWEL_CHART === 'true'

function App() {
  const waveformRef = useRef<WaveformHandle>(null)
  const spectrogramRef = useRef<SpectrogramHandle>(null)
  const vowelChartRef = useRef<VowelChartHandle>(null)
  const [analysis, setAnalysis] = useState<AnalysisChunk[]>([])

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
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
    handleAcknowledgeError,
    handleRecordingComplete: handleAudioBufferAppended,
    handlePlaybackPositionChanged,
    handleError,
    handleOpenAudioSettings,
    hoverFrame,
  } = useTimelineState(analysis)

  const lastScannedRef = useRef(0)
  const [dbBounds, setDbBounds] = useState({
    min: DB_MIN_DEFAULT,
    max: DB_MAX_DEFAULT,
  })

  const { openFilePicker } = useAudioImport({
    handleAnalyze,
    onStart: () => {
      setAnalysis([])
      lastScannedRef.current = 0
      setDbBounds({ min: DB_MIN_DEFAULT, max: DB_MAX_DEFAULT })
    },
    onImported: ({
      analysis: newAnalysis,
      dbBounds: bounds,
      audioBuffer: newAudioBuffer,
    }) => {
      if (bounds) setDbBounds(bounds)
      lastScannedRef.current = totalFrames(newAnalysis)
      setAudioBuffer(newAudioBuffer)
      setAnalysis(newAnalysis)
    },
  })

  const recordingStartIndexRef = useRef(0)
  const recordingDurationSecRef = useRef(0)

  const handleNew = useCallback(() => {
    resetTimeline()
    setAnalysis([])
    setAudioBuffer(null)
    setDbBounds({ min: DB_MIN_DEFAULT, max: DB_MAX_DEFAULT })
    lastScannedRef.current = 0
    recordingStartIndexRef.current = 0
    recordingDurationSecRef.current = 0
  }, [resetTimeline])

  const ampMaxNorm = analysis.reduce(
    (memo, chunk) => chunk.frames.reduce((m, f) => Math.max(m, f.rms), memo),
    0,
  )

  const analysisRef = useRef(analysis)
  useEffect(() => {
    analysisRef.current = analysis
  })

  const handleStart = useCallback(() => {
    recordingStartIndexRef.current = totalFrames(analysisRef.current)
    recordingDurationSecRef.current = analysisRef.current.reduce(
      (t, c) => t + (c.frames.length * c.timeStepSamples) / c.sampleRate,
      0,
    )
    startRecording()
  }, [startRecording])

  const audioBufferRef = useRef<AudioBuffer | null>(null)
  useEffect(() => {
    audioBufferRef.current = audioBuffer
  }, [audioBuffer])

  const [isExporting, setIsExporting] = useState(false)

  const handleExportAudio = useCallback(() => {
    // TODO: support compressed formats
    const buf = audioBufferRef.current
    if (!buf || buf.length === 0) return
    setIsExporting(true)
    try {
      exportWav(buf)
    } catch (err) {
      handleError(err)
    } finally {
      setIsExporting(false)
    }
  }, [handleError])

  const handleRecordingComplete = useCallback(
    (newBuffer: AudioBuffer) => {
      lastScannedRef.current = recordingStartIndexRef.current

      const prev = audioBufferRef.current
      const combined =
        prev && prev.length > 0
          ? concatAudioBuffers(prev, newBuffer)
          : newBuffer
      audioBufferRef.current = combined
      setAudioBuffer(combined)
      handleAudioBufferAppended({ trackDurationSec: combined.duration })
    },
    [handleAudioBufferAppended],
  )

  const handleChunkStart = useCallback((params: AnalysisParams) => {
    analysisRef.current.push({ ...params, frames: [] })
  }, [])

  const schedulePlaybackPositionChanged = usePreemptibleCallback(
    handlePlaybackPositionChanged,
  )
  const handleAppend = useCallback(
    (frame: AnalysisFrame) => {
      const lastChunk = analysisRef.current[analysisRef.current.length - 1]!
      lastChunk.frames.push(frame)
      const globalIndex = totalFrames(analysisRef.current) - 1
      waveformRef.current?.append(globalIndex)
      spectrogramRef.current?.append(globalIndex)
      vowelChartRef.current?.append(globalIndex)
      recordingDurationSecRef.current +=
        lastChunk.timeStepSamples / lastChunk.sampleRate
      schedulePlaybackPositionChanged(recordingDurationSecRef.current)
    },
    [schedulePlaybackPositionChanged],
  )

  const handlePatch = useCallback((frameIndex: number) => {
    const absIndex = recordingStartIndexRef.current + frameIndex
    waveformRef.current?.patch(absIndex, absIndex + 1)
    spectrogramRef.current?.patch(absIndex, absIndex + 1)
    vowelChartRef.current?.patch(absIndex, absIndex + 1)
  }, [])

  // Poll every 2s to expand db range with newly arrived frames
  useEffect(() => {
    const timer = setInterval(() => {
      const data = analysisRef.current
      const from = lastScannedRef.current
      const to = totalFrames(data)
      if (from >= to) return
      const newBounds = computeDbBounds(data, from, to)
      lastScannedRef.current = to
      if (!newBounds) return
      setDbBounds((prev) => ({
        min: Math.min(prev.min, newBounds.min),
        max: Math.max(prev.max, newBounds.max),
      }))
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  useMicCapture({
    enabled: status.value === 'recording',
    onChunkStart: handleChunkStart,
    onAppend: handleAppend,
    onPatch: handlePatch,
    onRecordingComplete: handleRecordingComplete,
    onError: handleError,
  })

  useAudioPlayback({
    enabled: status.value === 'playing',
    audioBuffer,
    cursorSec: timelineState.cursorSec,
    onStop: handlePause,
    onPlaybackPositionChanged: handlePlaybackPositionChanged,
  })

  const virtualWidthSec =
    Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
    (timelineState.viewportRightSec - timelineState.viewportLeftSec)

  return (
    <>
      <Dialogs
        analysis={analysis}
        status={status}
        onAcknowledgeError={handleAcknowledgeError}
        onStartRecording={startRecording}
        openFilePicker={openFilePicker}
      />
      <AudioSettingsModal
        open={status.value === 'editAudioSettings'}
        onOpenChange={handleOpenAudioSettings}
      />
      <main className="min-h-screen flex flex-col">
        <Toolbar
          openFilePicker={openFilePicker}
          onNew={handleNew}
          timelineState={timelineState}
          status={status}
          onBackToStart={handleBackToStart}
          onStart={handleStart}
          onPause={handlePause}
          onPlay={handlePlay}
          playDisabled={!audioBuffer || audioBuffer.length === 0}
          onExportAudio={handleExportAudio}
          exportAudioDisabled={
            !audioBuffer || audioBuffer.length === 0 || isExporting
          }
          onOpenAudioSettings={handleOpenAudioSettings}
        />
        <Plot
          timelineState={waveformTimelineState}
          xAxisVisible={false}
          yAxisVisible={false}
          yAxis={{
            type: 'amplitude',
            ampMaxNorm: ampMaxNorm || 1,
          }}
          onScroll={() => {}}
          onZoom={() => {}}
          onClick={handlePlotClick}
          onHover={handlePlotHover}
          className="h-32 border-b border-b-gray-500"
          virtualWidthSec={virtualWidthSec}
        >
          <Waveform analysis={analysis} ref={waveformRef} />
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
            onScroll={handlePlotScroll}
            onZoom={handlePlotZoom}
            onClick={handlePlotClick}
            onHover={handlePlotHover}
            virtualWidthSec={
              Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
              (timelineState.viewportRightSec - timelineState.viewportLeftSec)
            }
            className="flex-1"
          >
            <Spectrogram
              analysis={analysis}
              dbMin={dbBounds.min}
              dbRange={dbBounds.max - dbBounds.min}
              ref={spectrogramRef}
              debug={false}
            />
          </Plot>
          {SHOW_VOWEL_CHART ? (
            <div className="w-80 flex flex-col border-l border-l-gray-500">
              <VowelChart
                analysis={analysis}
                cursorSec={timelineState.cursorSec}
                ref={vowelChartRef}
              />
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}
