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
import { FolderOpen, MicVocal, Pause, Play, SkipBack } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import braatPng from '#/braat.png'
import { AudioPlayback } from '#/components/AudioPlayback'
import { AudioRecorder } from '#/components/AudioRecorder'
import { Plot } from '#/components/Plot'
import { Spectrogram } from '#/components/Spectrogram'
import type { SpectrogramHandle } from '#/components/Spectrogram'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useAudioImport } from '#/components/useAudioImport'
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
} from '#/lib/analysis'
import { totalFrames } from '#/lib/analysis'
import { computeDbBounds, concatAudioBuffers } from '#/lib/audioUiHelpers'

export const Route = createFileRoute('/')({
  component: App,
  headers: () => ({
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }),
})

const DB_MIN_DEFAULT = -93
const DB_MAX_DEFAULT = -23

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

  const virtualWidthSec =
    Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
    (timelineState.viewportRightSec - timelineState.viewportLeftSec)

  const showWelcome = analysis.length === 0 && status.value === 'inactive'

  return (
    <>
      <WelcomeModal
        open={showWelcome}
        onStartRecording={handleStart}
        onOpenFile={openFilePicker}
      />
      <Dialog open={status.value === 'analyzing'}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Analyzing audio…</DialogTitle>
            <DialogDescription>This may take a moment.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Dialog
        open={status.value === 'error'}
        onOpenChange={handleAcknowledgeError}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Something went wrong</DialogTitle>
            <DialogDescription>
              {status.value === 'error' ? status.error : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
      <main className="min-h-screen flex flex-col">
        <header className="flex align-center justify-end gap-1 p-2 flex-wrap">
          <h1 className="text-lg font-bold bg-[#8ace00] mr-2">
            <img src={braatPng} className="h-10" />
          </h1>
          <div className="grow" />
          <Button
            variant="default"
            className="h-10 w-10 cursor-pointer"
            title="Open an audio file"
            onClick={openFilePicker}
          >
            <FolderOpen className="size-6" />
          </Button>
          <Button
            variant="default"
            className="h-10 w-10 cursor-pointer"
            title="Back to start"
            disabled={
              timelineState.cursorSec === 0 &&
              timelineState.viewportLeftSec === 0
            }
            onClick={handleBackToStart}
          >
            <SkipBack className="size-6" />
          </Button>
          <Button
            variant="default"
            className="h-10 w-10 cursor-pointer"
            disabled={
              status.value === 'recording' || status.value === 'analyzing'
            }
            title="Analyze audio from microphone"
            onClick={handleStart}
          >
            <MicVocal className="size-6" />
          </Button>
          {status.value === 'playing' || status.value === 'recording' ? (
            <Button
              variant="default"
              className="h-10 w-10 cursor-pointer"
              title="Pause audio track"
              onClick={handlePause}
            >
              <Pause className="size-6" />
            </Button>
          ) : (
            <Button
              variant="default"
              className="h-10 w-10 cursor-pointer"
              title="Play back audio track"
              onClick={handlePlay}
              disabled={!audioBuffer || audioBuffer.length === 0}
            >
              <Play className="size-6" />
            </Button>
          )}
        </header>
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
              hover: hoverFrame?.voiced
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
          <div className="w-80 flex flex-col border-l border-l-gray-500">
            <VowelChart
              analysis={analysis}
              cursorSec={timelineState.cursorSec}
              ref={vowelChartRef}
            />
          </div>
        </div>
        {status.value === 'recording' ? (
          <AudioRecorder
            onChunkStart={handleChunkStart}
            onAppend={handleAppend}
            onPatch={handlePatch}
            onRecordingComplete={handleRecordingComplete}
            onError={handleError}
          />
        ) : null}
        {status.value === 'playing' && audioBuffer ? (
          <AudioPlayback
            audioBuffer={audioBuffer}
            cursorSec={timelineState.cursorSec}
            onStop={handlePause}
            onPlaybackPositionChanged={handlePlaybackPositionChanged}
          />
        ) : null}
      </main>
    </>
  )
}
