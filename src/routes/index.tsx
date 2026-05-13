import { createFileRoute } from '@tanstack/react-router'
import { FolderOpen, MicVocal, Pause, Play, SkipBack } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import braatPng from '#/braat.png'
import { AudioPlayback } from '#/components/AudioPlayback'
import { AudioRecorder } from '#/components/AudioRecorder'
import { Plot, useTimeToX, usePlotPad, InCanvas } from '#/components/Plot'
import type { TimelineState } from '#/components/Plot'
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
import { VowelChart } from '#/components/VowelChart'
import type { VowelChartHandle } from '#/components/VowelChart'
import { Waveform } from '#/components/Waveform'
import type { WaveformHandle } from '#/components/Waveform'
import { WelcomeModal } from '#/components/WelcomeModal'
import type { AnalysisMessage } from '#/lib/analysis'
import {
  computeDbBounds,
  concatAudioBuffers,
  importAudioFile,
} from '#/lib/audioUiHelpers'

export const Route = createFileRoute('/')({ component: App })

function ViewportShade({
  leftSec,
  rightSec,
}: {
  leftSec: number
  rightSec: number
}) {
  const toX = useTimeToX(InCanvas.No)
  const plotPad = usePlotPad()
  const x1 = toX(leftSec)
  const x2 = toX(rightSec)
  return (
    <div
      className="absolute overflow-hidden pointer-events-none"
      style={{
        left: plotPad.left,
        right: 0,
        top: plotPad.top,
        bottom: plotPad.bottom,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: x1 - plotPad.left,
          width: Math.max(0, x2 - x1),
          top: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.08)',
          borderLeft: '1px solid rgba(255,255,255,0.25)',
          borderRight: '1px solid rgba(255,255,255,0.25)',
        }}
      />
    </div>
  )
}

const DB_MIN_DEFAULT = -93
const DB_MAX_DEFAULT = -23

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const waveformRef = useRef<WaveformHandle>(null)
  const spectrogramRef = useRef<SpectrogramHandle>(null)
  const vowelChartRef = useRef<VowelChartHandle>(null)
  const [analysis, setAnalysis] = useState<AnalysisMessage[]>([])
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)

  useEffect(() => {
    // For debugging!
    ;(window as any).analysis = analysis
  }, [analysis])

  const [status, setStatus] = useState<
    | { value: 'inactive' }
    | { value: 'recording' }
    | { value: 'analyzing' }
    | { value: 'playing' }
    | { value: 'error'; error: string }
  >({ value: 'inactive' })

  const lastScannedRef = useRef(0)
  const [dbBounds, setDbBounds] = useState({
    min: DB_MIN_DEFAULT,
    max: DB_MAX_DEFAULT,
  })

  const handleOpenClicked = useCallback(() => fileInputRef.current?.click(), [])
  const [timelineState, setTimelineState] = useState<TimelineState>({
    viewportLeftSec: 0,
    viewportRightSec: 10,
    cursorSec: 0,
    hoverSec: null,
    trackDurationSec: 0,
  })

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setAnalysis([])
        lastScannedRef.current = 0
        setDbBounds({ min: DB_MIN_DEFAULT, max: DB_MAX_DEFAULT })
        setStatus({ value: 'analyzing' })
        try {
          const {
            analysis: newAnalysis,
            dbBounds: bounds,
            buffer: newAudioBuffer,
          } = await importAudioFile(file)

          if (bounds) setDbBounds(bounds)
          lastScannedRef.current = newAnalysis.length

          setAudioBuffer(newAudioBuffer)
          setTimelineState({
            cursorSec: 0,
            hoverSec: 0,
            trackDurationSec: newAudioBuffer.duration,
            viewportLeftSec: 0,
            viewportRightSec: 10,
          })
          setAnalysis(newAnalysis)
          setStatus({ value: 'inactive' })
        } catch (err) {
          console.log(err)
          setStatus({ value: 'error', error: String(err) })
        }
      }
      e.target.value = ''
    },
    [],
  )

  const hoverFrame = useMemo(() => {
    const hoverSec = timelineState.hoverSec ?? timelineState.cursorSec

    let timeSec = 0
    for (const frame of analysis) {
      timeSec += frame.timeStepSec
      if (timeSec > hoverSec) {
        return frame
      }
    }
  }, [analysis, timelineState.cursorSec, timelineState.hoverSec])

  const handlePlotScroll = useCallback(
    (tSec: number) =>
      setTimelineState((timeline) => {
        const viewportWidth =
          timeline.viewportRightSec - timeline.viewportLeftSec
        const viewportLeftSec = Math.min(
          Math.max(0, tSec),
          Math.floor(timeline.trackDurationSec / 30 + 1) * 30,
        )
        return {
          ...timeline,
          viewportLeftSec,
          viewportRightSec: viewportLeftSec + viewportWidth,
        }
      }),
    [],
  )
  const handlePlotClick = useCallback(
    (tSec: number) =>
      setTimelineState((timeline) => {
        const { viewportLeftSec, viewportRightSec } = timeline
        if (tSec < viewportLeftSec || tSec > viewportRightSec) {
          const viewportWidth = viewportRightSec - viewportLeftSec
          const maxLeft = Math.floor(timeline.trackDurationSec / 30 + 1) * 30
          const newLeft = Math.max(
            0,
            Math.min(tSec - viewportWidth / 2, maxLeft),
          )
          return {
            ...timeline,
            cursorSec: tSec,
            viewportLeftSec: newLeft,
            viewportRightSec: newLeft + viewportWidth,
          }
        }
        return {
          ...timeline,
          cursorSec: tSec,
        }
      }),
    [],
  )
  const handlePlotHover = useCallback(
    (tSec: number | null) =>
      setTimelineState((timeline) => {
        return {
          ...timeline,
          hoverSec: tSec,
        }
      }),
    [],
  )
  const handlePlotZoom = useCallback((p: number, z: number) => {
    setTimelineState((timeline) => {
      const viewportLeftSec = Math.min(
        Math.max(0, timeline.viewportLeftSec - p * (z / 10)),
        Math.floor(timeline.trackDurationSec / 30 + 1) * 30,
      )
      const viewportRightSec = Math.min(
        Math.max(timeline.viewportRightSec + (1 - p) * (z / 10)),
        Math.floor(timeline.trackDurationSec / 30 + 1) * 30,
      )

      if (viewportRightSec - viewportLeftSec < 0.5) {
        return timeline
      }

      return {
        ...timeline,
        viewportLeftSec: viewportLeftSec,
        viewportRightSec: viewportRightSec,
      }
    })
  }, [])

  const handlePlay = useCallback(() => {
    setTimelineState((prev) => {
      if (prev.cursorSec + 0.1 >= prev.trackDurationSec) {
        return { ...prev, cursorSec: 0 }
      }
      return prev
    })
    setStatus({ value: 'playing' })
  }, [])

  const recordingStartIndexRef = useRef(0)

  const handleStart = useCallback(() => {
    recordingStartIndexRef.current = analysis.length
    setStatus({ value: 'recording' })
  }, [analysis])

  const handlePause = useCallback(() => {
    setStatus({ value: 'inactive' })
  }, [])

  const handleBackToStart = useCallback(() => {
    setTimelineState((prev) => {
      const width = prev.viewportRightSec - prev.viewportLeftSec
      return {
        ...prev,
        cursorSec: 0,
        viewportLeftSec: 0,
        viewportRightSec: width,
      }
    })
  }, [])

  const waveformTimelineState = useMemo(
    (): TimelineState => ({
      ...timelineState,
      viewportLeftSec: 0,
      viewportRightSec:
        Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
        (timelineState.viewportRightSec - timelineState.viewportLeftSec),
    }),
    [timelineState],
  )

  const ampMaxNorm = analysis.reduce(
    (memo, frame) => Math.max(memo, frame.rms),
    0,
  )

  const analysisRef = useRef(analysis)
  useEffect(() => {
    analysisRef.current = analysis
  })

  const audioBufferRef = useRef<AudioBuffer | null>(null)
  useEffect(() => {
    audioBufferRef.current = audioBuffer
  }, [audioBuffer])

  const handleReset = useCallback(
    (newAnalysis: AnalysisMessage[], newBuffer: AudioBuffer) => {
      const startIndex = recordingStartIndexRef.current
      const full = [...analysisRef.current.slice(0, startIndex), ...newAnalysis]
      lastScannedRef.current = startIndex
      setAnalysis(full)

      const prev = audioBufferRef.current
      const combined =
        prev && prev.length > 0 && startIndex > 0
          ? concatAudioBuffers(prev, newBuffer)
          : newBuffer
      audioBufferRef.current = combined
      setAudioBuffer(combined)
      setTimelineState((prevTimeline) => ({
        ...prevTimeline,
        trackDurationSec: combined.duration,
        cursorSec: combined.duration,
      }))
      setStatus({ value: 'inactive' })
    },
    [],
  )

  // returns total track time
  const handleAppend = useCallback((data: AnalysisMessage) => {
    analysisRef.current.push(data)
    waveformRef.current?.append(analysisRef.current.length - 1)
    spectrogramRef.current?.append(analysisRef.current.length - 1)
    vowelChartRef.current?.append(analysisRef.current.length - 1)
    return analysisRef.current.length * data.timeStepSec
  }, [])

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
      const to = data.length
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

  const showWelcome = analysis.length === 0 && status.value === 'inactive'

  return (
    <>
      <WelcomeModal
        open={showWelcome}
        onStartRecording={handleStart}
        onOpenFile={handleOpenClicked}
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
        onOpenChange={() => setStatus({ value: 'inactive' })}
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
            onClick={handleOpenClicked}
          >
            <FolderOpen className="size-6" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,audio/wav,audio/mpeg"
            className="hidden"
            onChange={handleFileSelected}
          />
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
            // @ts-expect-error prevent restoring "disabled" state on Firefox refresh
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1847798
            autoComplete="off"
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
              // @ts-expect-error prevent restoring "disabled" state on Firefox refresh
              // https://bugzilla.mozilla.org/show_bug.cgi?id=1847798
              autoComplete="off"
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
          virtualWidthSec={
            Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
            (timelineState.viewportRightSec - timelineState.viewportLeftSec)
          }
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
            onAppend={handleAppend}
            onPatch={handlePatch}
            onReset={handleReset}
            onTimelineStateChanged={setTimelineState}
            onError={(error) => {
              console.log(error)
              setStatus({ value: 'error', error })
            }}
          />
        ) : null}
        {status.value === 'playing' && audioBuffer ? (
          <AudioPlayback
            audioBuffer={audioBuffer}
            timelineState={timelineState}
            onStop={handlePause}
            onTimelineStateChanged={setTimelineState}
          />
        ) : null}
      </main>
    </>
  )
}
