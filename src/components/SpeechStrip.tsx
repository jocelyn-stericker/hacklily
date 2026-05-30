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

import { AlertTriangle, Captions, Loader2 } from 'lucide-react'
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { ReactNode, RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/AnalysisFrame'
import { useSettings } from '#/lib/settings'

import {
  InCanvas,
  usePlotPad,
  usePlotSize,
  useSpeechStripHeight,
  useTimeToX,
} from './Plot'
import { Button } from './ui/button'
import { useColourScheme } from './useColourScheme'

const VOICED_FILL = 'rgba(78,205,196,1.0)'

export interface SpeechStripHandle {
  append: (from: number) => void
  patch: (from: number, to: number) => void
  // Re-render the DOM overlay (transcriptions/spinners) after a chunk's
  // transcription field is mutated in place. Unlike append/patch, this is a
  // React re-render, not a canvas redraw, since the text lives in the DOM.
  refreshTranscriptions: () => void
}

export function SpeechStrip({
  analysisMut,
  onTranscribe,
  ref,
}: {
  analysisMut: AnalysisChunk[]
  onTranscribe?: (chunkIndex: number) => void
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

  // Bumped via the imperative handle when a chunk's transcription is updated in
  // place. analysisMut is mutated, not replaced, so the React Compiler would
  // otherwise serve a cached overlay; keying the overlay on this version (below)
  // makes it a real dependency and re-renders the subtree.
  const [transcriptionVersion, refreshTranscriptions] = useReducer(
    (x: number) => x + 1,
    0,
  )

  const scheme = useColourScheme()
  const bgColor = scheme === 'dark' ? '#000000' : '#ffffff'

  const transcriptionMode = useSettings().transcriptionMode
  const transcriptionDisabled = transcriptionMode === 'disabled'

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

        // Voiced chunks get a coloured bar. The transcription text itself is
        // rendered in the DOM (see below) so it can be ellipsised and carry a
        // tooltip.
        for (const chunk of analysisMut) {
          if (!chunk.voiced) continue
          const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
          const startSec = chunk.startTimeSec
          const endSec = chunk.startTimeSec + chunk.frames.length * timeStepSec
          const x1 = timeToX(startSec)
          const x2 = timeToX(endSec)
          const cx1 = Math.max(0, x1)
          const cx2 = Math.min(canvasWidth, x2)
          if (cx2 > cx1) {
            ctx.fillStyle = VOICED_FILL
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
      refreshTranscriptions() {
        refreshTranscriptions()
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
      <SpeechStripDOMOverlay
        key={transcriptionVersion}
        analysisMut={analysisMut}
        stripWidth={stripWidth}
        stripTop={stripTop}
        transcriptionDisabled={transcriptionDisabled}
        onTranscribe={onTranscribe}
      />
    </>
  )
}

function SpeechStripDOMOverlay({
  analysisMut,
  onTranscribe,
  stripWidth,
  stripTop,
  transcriptionDisabled,
}: {
  analysisMut: AnalysisChunk[]
  onTranscribe?: (chunkIndex: number) => void
  stripWidth: number
  stripTop: number
  transcriptionDisabled: boolean
}) {
  const plotPad = usePlotPad()
  const speechStripHeight = useSpeechStripHeight()
  const timeToXDom = useTimeToX(InCanvas.No)

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: plotPad.left,
        width: stripWidth,
        top: stripTop,
        height: speechStripHeight,
      }}
    >
      {analysisMut.map((chunk, index) => {
        if (!chunk.voiced) return null
        const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
        const startSec = chunk.startTimeSec
        const endSec = startSec + chunk.frames.length * timeStepSec
        const left = timeToXDom(startSec) - plotPad.left
        const right = timeToXDom(endSec) - plotPad.left
        if (right < 0 || left > stripWidth) return null

        // With transcription disabled, the only affordance is a button that
        // opens the transcription settings.
        if (transcriptionDisabled) {
          return (
            <TranscribeButton
              key={index}
              // Account for the 2px inset on each side of the chunk.
              availableWidth={right - left - 4}
              rightOffset={stripWidth - right + 2}
              height={speechStripHeight - 4}
              onClick={() => onTranscribe?.(index)}
            />
          )
        }

        return (
          <ChunkTranscription
            key={index}
            chunk={chunk}
            left={left}
            width={right - left}
            height={speechStripHeight}
          />
        )
      })}
    </div>
  )
}

// Renders a chunk's transcription (or a spinner while it's pending) clipped to
// the chunk's on-screen width, with the full text available as a tooltip.
function ChunkTranscription({
  chunk,
  left,
  width,
  height,
}: {
  chunk: AnalysisChunk
  left: number
  width: number
  height: number
}) {
  const t = chunk.transcription

  let inner: ReactNode = null
  let title: string | undefined
  if (t?.status === 'pending') {
    inner = <Loader2 className="size-3 shrink-0 animate-spin" />
  } else if (t?.status === 'done') {
    inner = <span className="truncate">{t.text}</span>
    title = t.text
  } else if (t?.status === 'error') {
    inner = <AlertTriangle className="size-3 shrink-0 text-red-700" />
    title = t.error
  } else {
    // Not transcribed yet: nothing to show.
    return null
  }

  return (
    <div
      title={title}
      className="absolute flex items-center gap-1 overflow-hidden px-1 text-[10px] leading-none text-black/70"
      style={{ left, width, top: 0, height }}
    >
      {inner}
    </div>
  )
}

// Renders a transcribe button right-aligned within a chunk, but only if the
// button's intrinsic width fits in the available chunk space. It measures
// itself after layout and removes itself when there isn't room.
function TranscribeButton({
  availableWidth,
  rightOffset,
  height,
  onClick,
}: {
  availableWidth: number
  rightOffset: number
  height: number
  onClick: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [fits, setFits] = useState(false)

  // The button stays mounted (just hidden) when it doesn't fit, so it can be
  // re-measured and reappear once the chunk is wide enough — e.g. after zooming.
  useLayoutEffect(() => {
    if (ref.current) setFits(ref.current.offsetWidth <= availableWidth)
  }, [availableWidth])

  return (
    <Button
      ref={ref}
      type="button"
      variant="secondary"
      size="icon-sm"
      title="Transcribe this segment"
      onClick={onClick}
      className="absolute h-auto rounded px-1.5 py-0 text-[10px] leading-none"
      style={{
        top: 2,
        right: rightOffset,
        height,
        visibility: fits ? 'visible' : 'hidden',
      }}
    >
      <Captions />
    </Button>
  )
}
