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

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/AnalysisFrame'

import {
  InCanvas,
  usePlotPad,
  usePlotSize,
  useSpeechStripHeight,
  useTimeToX,
} from './Plot'
import { useColourScheme } from './useColourScheme'

const VOICED_FILL = 'rgba(78,205,196,1.0)'

export interface SpeechStripHandle {
  append: (from: number) => void
  patch: (from: number, to: number) => void
}

export function SpeechStrip({
  analysisMut,
  ref,
}: {
  analysisMut: AnalysisChunk[]
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

        ctx.font = `${Math.round(canvasHeight * 0.65)}px monospace`
        ctx.textBaseline = 'middle'

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
            ctx.save()
            ctx.beginPath()
            ctx.rect(cx1, 0, cx2 - cx1, canvasHeight)
            ctx.clip()
            ctx.fillStyle = 'rgba(0,0,0,0.55)'
            ctx.fillText('<speech>', x1 + 2 * dpr, canvasHeight / 2)
            ctx.restore()
          }
        }

        ctx.strokeStyle = 'red'
        ctx.lineWidth = 5
        for (let i = 1; i < analysisMut.length; i++) {
          const x = Math.round(timeToX(analysisMut[i]!.startTimeSec)) - 0.5
          if (x >= 0 && x <= canvasWidth) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, canvasHeight)
            ctx.stroke()
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

  return (
    <canvas
      ref={setCanvas}
      className="absolute border-b border-black/20 dark:border-white/20"
      style={{
        left: plotPad.left,
        right: 0,
        top: plotPad.top - speechStripHeight,
        width: width - plotPad.left - plotPad.right,
        height: speechStripHeight,
      }}
    />
  )
}
