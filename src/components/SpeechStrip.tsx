// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import {
  AlertTriangle,
  Cloud,
  SpeechIcon,
  Loader2,
  Sparkle,
  Sparkles,
} from 'lucide-react'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import {
  VOICED_FILL,
  UNVOICED_FILL,
  VOICED_DARKER10,
  VOICED_LIGHTER10,
} from '#/lib/theme'
import { bestResult, transcriptIndicator } from '#/lib/transcription'

import {
  InCanvas,
  usePlotPad,
  usePlotSize,
  useSpeechStripHeight,
  useTimeToX,
} from './Plot'
import { useAnalysisChunks, useTranscript } from './TranscriptStore'
import type { TranscriptStore } from './TranscriptStore'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { useColourScheme } from './useColourScheme'
import { useSettings } from './useSettings'

export interface SpeechStripHandle {
  append: (from: number) => void
  patch: (from: number, to: number) => void
}

export function SpeechStrip({
  analysisMut,
  store,
  onTranscribe,
  ref,
}: {
  analysisMut: AnalysisChunk[]
  // Render source for the DOM overlay: structural changes and per-chunk
  // transcripts, both subscribed via useSyncExternalStore.
  store: TranscriptStore
  // Transcribe a single chunk on demand (the per-chunk button below).
  onTranscribe?: (chunk: AnalysisChunk) => void
  ref: RefObject<SpeechStripHandle | null>
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const plotPad = usePlotPad()
  const { width, dpr } = usePlotSize()
  const speechStripHeight = useSpeechStripHeight()
  const timeToX = useTimeToX(InCanvas.Yes)

  const canvasWidth = (width - plotPad.left - plotPad.right) * dpr
  const canvasHeight = speechStripHeight * dpr

  const animFrameRef = useRef<number | null>(null)
  const triggerDraw = useRef(() => {})

  const scheme = useColourScheme()
  const bgColor = scheme === 'dark' ? '#000000' : '#ffffff'

  useEffect(() => {
    if (!canvas || canvasWidth <= 0 || canvasHeight <= 0) return
    const ctx = canvas.getContext('2d', { alpha: false })!

    triggerDraw.current = () => {
      if (animFrameRef.current) return
      animFrameRef.current = requestAnimationFrame(() => {
        animFrameRef.current = null
        if (canvas.width !== canvasWidth) canvas.width = canvasWidth
        if (canvas.height !== canvasHeight) canvas.height = canvasHeight
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        const dxPerSec = timeToX(1) - timeToX(0)
        if (dxPerSec <= 0) return

        // Recorded chunks get a coloured bar: teal for voiced, grey for unvoiced.
        // The space beyond recorded chunks remains bgColor (future/unrecorded).
        for (const chunk of analysisMut) {
          const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
          const startSec = chunk.startTimeSec
          const endSec = chunk.startTimeSec + chunk.frames.length * timeStepSec
          const x1 = timeToX(startSec)
          const x2 = timeToX(endSec)
          const cx1 = Math.max(0, x1)
          const cx2 = Math.min(canvasWidth, x2)
          if (cx2 > cx1) {
            ctx.fillStyle = chunk.voiced ? VOICED_FILL : UNVOICED_FILL
            ctx.fillRect(cx1, 0, cx2 - cx1, canvasHeight)
          }
        }
      })
    }

    triggerDraw.current()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
      triggerDraw.current = () => {}
    }
  }, [analysisMut, canvasWidth, canvasHeight, timeToX, canvas, dpr, bgColor])

  useImperativeHandle(
    ref,
    () => ({
      append(_from: number) {
        triggerDraw.current()
      },
      patch(_from: number, _to: number) {
        triggerDraw.current()
      },
    }),
    [],
  )

  const stripTop = plotPad.top - speechStripHeight
  const stripWidth = width - plotPad.left - plotPad.right

  return (
    <>
      <canvas
        ref={setCanvas}
        className="absolute border-b border-black/20 dark:border-white/20"
        style={{
          left: plotPad.left,
          right: 0,
          top: stripTop,
          width: stripWidth,
          height: speechStripHeight,
        }}
      />
      <ChunkOverlayContainer
        store={store}
        stripWidth={stripWidth}
        stripTop={stripTop}
        height={speechStripHeight}
        onTranscribe={onTranscribe}
      />
    </>
  )
}

// One overlay that renders each voiced chunk's icon, transcript text, and
// phoneme labels.
function ChunkOverlayContainer({
  store,
  stripWidth,
  stripTop,
  height,
  onTranscribe,
}: {
  store: TranscriptStore
  stripWidth: number
  stripTop: number
  height: number
  onTranscribe?: (chunk: AnalysisChunk) => void
}) {
  const plotPad = usePlotPad()
  const timeToXDom = useTimeToX(InCanvas.No)

  // Render from the store's immutable snapshot. Its identity changes on each
  // structural change (append / split / merge), which is what drives the
  // re-render -- the live chunks are mutated in place and never change identity.
  const chunks = useAnalysisChunks(store)

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: plotPad.left,
        width: stripWidth,
        top: stripTop,
        height,
      }}
    >
      {chunks.map((chunk, index) => {
        if (!chunk.voiced) return null
        const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
        const startSec = chunk.startTimeSec
        const endSec = startSec + chunk.frames.length * timeStepSec
        const left = timeToXDom(startSec) - plotPad.left
        const right = timeToXDom(endSec) - plotPad.left
        if (right < 0 || left > stripWidth) return null

        return (
          <ChunkOverlay
            key={index}
            chunk={chunk}
            store={store}
            left={left}
            width={Math.max(right - left, 30)}
            height={height}
            onTranscribe={onTranscribe}
          />
        )
      })}
    </div>
  )
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

// One voiced chunk's overlay: a transcribe button, transcript text, and
// phoneme labels. Subscribes to only this chunk's transcript, so a result
// re-renders this row alone rather than the whole strip.
function ChunkOverlay({
  chunk,
  store,
  left,
  width,
  height,
  onTranscribe,
}: {
  chunk: AnalysisChunk
  store: TranscriptStore
  left: number
  width: number
  height: number
  onTranscribe?: (chunk: AnalysisChunk) => void
}) {
  const [settings] = useSettings()
  const plotPad = usePlotPad()
  const timeToXDom = useTimeToX(InCanvas.No)

  const transcript = useTranscript(store, chunk)
  const result = transcript ? bestResult(transcript) : undefined
  const phonemes = result?.phonemes

  const brightness = chunk.frames
    .map((f) => f.lunaBrightness)
    .filter((f) => f != null)
    .reduce((m, a, _, d) => m + a / d.length, 0)

  const topText =
    brightness > 0
      ? `${result?.text} (${toPercent(brightness)} bright)`
      : result?.text

  return (
    <div
      className="absolute overflow-hidden text-black"
      style={{ left, width, top: 0, height }}
    >
      <div className="flex items-center gap-1 px-1" style={{ height: '50%' }}>
        {renderIcon()}
        {result ? (
          <Tooltip>
            <TooltipTrigger
              render={<span className="truncate text-[10px] leading-tight" />}
            >
              {topText}
            </TooltipTrigger>
            <TooltipContent>{topText}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {phonemes && phonemes.length > 0 ? (
        <div className="relative" style={{ height: '50%' }}>
          {phonemes.map((ph, i) => {
            const phLeft = timeToXDom(ph.startMs / 1000) - plotPad.left - left
            const phWidth =
              timeToXDom(ph.endMs / 1000) - timeToXDom(ph.startMs / 1000)
            if (phWidth <= 0) return null

            return (
              <Tooltip key={i}>
                <TooltipTrigger
                  render={
                    <div
                      className="absolute flex items-center justify-center text-[10px] leading-tight overflow-hidden"
                      style={{
                        left: phLeft,
                        width: phWidth,
                        top: 0,
                        height: '100%',
                        backgroundColor:
                          i % 2 === 0 ? VOICED_DARKER10 : VOICED_LIGHTER10,
                      }}
                    />
                  }
                >
                  {ph.phonemeLabel}
                </TooltipTrigger>
                <TooltipContent>{ph.phonemeLabel}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ) : null}
    </div>
  )

  function renderIcon() {
    const indicator = transcriptIndicator(transcript)
    switch (indicator.kind) {
      case 'transcribing':
        return (
          <StdPadding>
            <Loader2 className="size-3 shrink-0 animate-spin" />
          </StdPadding>
        )
      case 'error':
        return (
          <Tooltip>
            <TooltipTrigger render={<StdPadding />}>
              <AlertTriangle className="size-3 shrink-0 text-red-700" />
            </TooltipTrigger>
            <TooltipContent>{indicator.error}</TooltipContent>
          </Tooltip>
        )
      case 'done':
        if (indicator.tier === 'large') {
          return (
            <StdPadding>
              <Sparkles className="size-3" />
            </StdPadding>
          )
        }
        if (indicator.tier === 'cloud') {
          return (
            <StdPadding>
              <Cloud className="size-3" />
            </StdPadding>
          )
        }
        // small: offer an on-demand upgrade in large mode, else just mark it.
        if (settings.transcriptionMode === 'large') {
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    className="cursor-pointer shrink-0 bg-transparent dark:border-white"
                    variant="outline"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTranscribe?.(chunk)
                    }}
                  />
                }
              >
                <Sparkle className="size-3" />
              </TooltipTrigger>
              <TooltipContent>Improve transcription</TooltipContent>
            </Tooltip>
          )
        }
        return (
          <StdPadding>
            <Sparkle className="size-3" />
          </StdPadding>
        )
      case 'none':
        if (settings.transcriptionMode === 'disabled') {
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    className="cursor-pointer shrink-0 bg-transparent dark:border-white"
                    variant="outline"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTranscribe?.(chunk)
                    }}
                  />
                }
              >
                <SpeechIcon className="size-3" />
              </TooltipTrigger>
              <TooltipContent>Set up transcription</TooltipContent>
            </Tooltip>
          )
        }
        return (
          <StdPadding>
            <span />
          </StdPadding>
        )
    }
  }
}

function StdPadding({ children }: { children?: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px border-transparent dark:bg-input/30 dark:/50 size-6 rounded-[min(var(--radius-md),10px)] shrink-0 bg-transparent">
      {children}
    </div>
  )
}
