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

import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { ReactNode, RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { VOICED_FILL, UNVOICED_FILL } from '#/lib/theme'

import {
  InCanvas,
  usePlotPad,
  usePlotSize,
  useSpeechStripHeight,
  useTimeToX,
} from './Plot'
import { useColourScheme } from './useColourScheme'

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
  liveChunks,
  ref,
}: {
  analysisMut: AnalysisChunk[]
  liveChunks?: Set<AnalysisChunk>
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
        liveChunks={liveChunks}
      />
    </>
  )
}

function SpeechStripDOMOverlay({
  analysisMut,
  stripWidth,
  stripTop,
  liveChunks,
}: {
  analysisMut: AnalysisChunk[]
  stripWidth: number
  stripTop: number
  liveChunks?: Set<AnalysisChunk>
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

        return (
          <ChunkTranscription
            key={index}
            chunk={chunk}
            left={left}
            width={right - left}
            height={speechStripHeight}
            isLive={liveChunks?.has(chunk) ?? false}
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
  isLive,
}: {
  chunk: AnalysisChunk
  left: number
  width: number
  height: number
  isLive: boolean
}) {
  const t = chunk.transcription

  let inner: ReactNode = null
  let title: string | undefined
  if (t?.status === 'pending') {
    if (isLive) return null
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
