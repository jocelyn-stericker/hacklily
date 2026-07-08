// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import {
  AlertTriangle,
  Cloud,
  Pencil,
  Save,
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
  phonemeBrightnessStyle,
} from '#/lib/theme'
import { bestResult, transcriptIndicator } from '#/lib/transcription'

import {
  InCanvas,
  usePlotPad,
  usePlotSize,
  useSpeechStripHeight,
  useTimeToX,
} from './Plot'
import {
  useAnalysisChunks,
  useChunkDerived,
  useTranscript,
} from './TranscriptStore'
import type { TranscriptStore } from './TranscriptStore'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
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
  onOpenTranscriptionSettings,
  onManualSave,
  ref,
}: {
  analysisMut: AnalysisChunk[]
  // Render source for the DOM overlay: structural changes and per-chunk
  // transcripts, both subscribed via useSyncExternalStore.
  store: TranscriptStore
  // Upgrade a single chunk's transcription to the active tier (the popover's
  // "Improve transcription" button).
  onTranscribe?: (chunk: AnalysisChunk) => void
  // Open the transcription settings modal (the popover's "Set up
  // transcription" button, shown when transcription is disabled).
  onOpenTranscriptionSettings?: () => void
  // Invoked after a manual transcript is saved, so the caller can wake the
  // job queue (manual changes don't reach it through the chunk-list stream).
  onManualSave?: () => void
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
        onOpenTranscriptionSettings={onOpenTranscriptionSettings}
        onManualSave={onManualSave}
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
  onOpenTranscriptionSettings,
  onManualSave,
}: {
  store: TranscriptStore
  stripWidth: number
  stripTop: number
  height: number
  onTranscribe?: (chunk: AnalysisChunk) => void
  onOpenTranscriptionSettings?: () => void
  onManualSave?: () => void
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
            onOpenTranscriptionSettings={onOpenTranscriptionSettings}
            onManualSave={onManualSave}
          />
        )
      })}
    </div>
  )
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

// One voiced chunk's overlay: a status icon, transcript text, and
// phoneme labels. Subscribes to only this chunk's transcript, so a result
// re-renders this row alone rather than the whole strip.
function ChunkOverlay({
  chunk,
  store,
  left,
  width,
  height,
  onTranscribe,
  onOpenTranscriptionSettings,
  onManualSave,
}: {
  chunk: AnalysisChunk
  store: TranscriptStore
  left: number
  width: number
  height: number
  onTranscribe?: (chunk: AnalysisChunk) => void
  onOpenTranscriptionSettings?: () => void
  onManualSave?: () => void
}) {
  const [settings] = useSettings()
  const plotPad = usePlotPad()
  const timeToXDom = useTimeToX(InCanvas.No)

  const transcript = useTranscript(store, chunk)
  const { brightness, medianF0, phonemeBrightness, weightDb } = useChunkDerived(
    store,
    chunk,
  )
  const result = transcript ? bestResult(transcript) : undefined
  const phonemes = result?.phonemes
  const indicator = transcriptIndicator(transcript)

  // Editor state for the popover. Resets from the current best result each
  // time the popover opens, so an in-flight upgrade that lands while the
  // popover is closed is reflected on reopen.
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editableText, setEditableText] = useState('')

  const handlePopoverOpenChange = (open: boolean) => {
    setPopoverOpen(open)
    if (open) {
      setEditableText(result?.text?.trim() ?? '')
    }
  }

  const handleSave = () => {
    store.setManualTranscript(chunk, editableText.trim())
    setPopoverOpen(false)
    onManualSave?.()
  }

  const handleImprove = () => {
    setPopoverOpen(false)
    onTranscribe?.(chunk)
  }

  const handleSetUpTranscription = () => {
    setPopoverOpen(false)
    onOpenTranscriptionSettings?.()
  }

  let topText: React.ReactNode = result?.text?.trim() ?? null

  if (!topText) {
    topText = <span className="italic">Voiced</span>
  }

  const alignmentEnabled = settings.forcedAlignment

  let icon: React.ReactNode
  switch (indicator.kind) {
    case 'transcribing':
      icon = (
        <StdPadding>
          <Loader2 className="size-3 shrink-0 animate-spin" />
        </StdPadding>
      )
      break
    case 'error':
      icon = (
        <Tooltip>
          <TooltipTrigger render={<StdPadding />}>
            <AlertTriangle className="size-3 shrink-0 text-red-700" />
          </TooltipTrigger>
          <TooltipContent>{indicator.error}</TooltipContent>
        </Tooltip>
      )
      break
    case 'done':
      if (indicator.tier === 'manual') {
        icon = (
          <StdPadding>
            <Pencil className="size-3" />
          </StdPadding>
        )
        break
      }
      if (indicator.tier === 'large') {
        icon = (
          <StdPadding>
            <Sparkles className="size-3" />
          </StdPadding>
        )
        break
      }
      if (indicator.tier === 'cloud') {
        icon = (
          <StdPadding>
            <Cloud className="size-3" />
          </StdPadding>
        )
        break
      }
      // small: the "Improve transcription" affordance lives in the popover,
      // so the icon is purely a status mark here.
      icon = (
        <StdPadding>
          <Sparkle className="size-3" />
        </StdPadding>
      )
      break
    case 'none':
      if (settings.transcriptionMode === 'disabled') {
        icon = (
          <StdPadding>
            <SpeechIcon className="size-3" />
          </StdPadding>
        )
        break
      }
      icon = (
        <StdPadding>
          <span />
        </StdPadding>
      )
      break
  }

  return (
    <div
      className="absolute overflow-hidden text-black"
      style={{ left, width, top: 0, height }}
    >
      <div
        className="flex items-center gap-1 px-1"
        style={{ height: alignmentEnabled ? '50%' : '100%' }}
      >
        {icon}
        {topText || medianF0 > 0 || brightness > 0 ? (
          <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger
              render={
                <button className="truncate text-[10px] leading-tight underline cursor-pointer" />
              }
            >
              {topText}
            </PopoverTrigger>
            <PopoverContent className="w-70">
              {medianF0 > 0 || weightDb !== 0 || brightness > 0 ? (
                <div className="flex flex-row gap-3 text-sm">
                  {medianF0 > 0 ? <div>{medianF0} Hz</div> : null}
                  {weightDb !== 0 ? <div>{weightDb} dB weight</div> : null}
                  {brightness > 0 ? (
                    <div>{`${toPercent(brightness)} bright`}</div>
                  ) : null}
                </div>
              ) : null}
              {indicator.kind === 'error' ? (
                <div className="mb-2 flex items-start gap-1.5 overflow-hidden rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <span className="min-w-0 wrap-break-word leading-snug">
                    {indicator.error}
                  </span>
                </div>
              ) : null}
              <textarea
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                rows={2}
                spellCheck={false}
                placeholder="Type a transcription…"
                className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
              <div className="flex flex-row justify-end gap-1.5">
                {indicator.kind === 'done' &&
                indicator.tier === 'small' &&
                settings.transcriptionMode === 'large' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="justify-start"
                    onClick={handleImprove}
                  >
                    <Sparkles className="size-3" />
                    Improve transcription
                  </Button>
                ) : null}
                {settings.transcriptionMode === 'disabled' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="justify-start"
                    onClick={handleSetUpTranscription}
                  >
                    Set up transcription
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="xs"
                  className="justify-start"
                  onClick={handleSave}
                >
                  <Save className="size-3" />
                  Save
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {alignmentEnabled && phonemes && phonemes.length > 0 ? (
        <div className="relative" style={{ height: '50%' }}>
          {phonemes.map((ph, i) => {
            const phLeft = timeToXDom(ph.startMs / 1000) - plotPad.left - left
            const phWidth =
              timeToXDom(ph.endMs / 1000) - timeToXDom(ph.startMs / 1000)
            if (phWidth <= 0) return null

            // Included vowels (used in the chunk brightness) are coloured by
            // their per-phoneme median on the brown→yellow ramp; everything
            // else keeps the zebra stripe. See docs/brightness.md.
            const median = phonemeBrightness[i]
            const included = median !== undefined && !Number.isNaN(median)
            const fill: { backgroundColor: string; color?: string } = included
              ? phonemeBrightnessStyle(median)
              : {
                  backgroundColor:
                    i % 2 === 0 ? VOICED_DARKER10 : VOICED_LIGHTER10,
                }

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
                        ...fill,
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
}

function StdPadding({ children }: { children?: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px border-transparent dark:bg-input/30 dark:/50 size-6 rounded-[min(var(--radius-md),10px)] shrink-0 bg-transparent">
      {children}
    </div>
  )
}
