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

// Plots F1/F2 formant pairs on a vowel chart for vowel space visualization.

import { useEffect, useImperativeHandle, useState } from 'react'
import type { RefObject } from 'react'

import type {
  AnalysisChunk,
  AnalysisFrame,
  VoicedAnalysisFrame,
} from '#/lib/AnalysisFrame'
import { hzToBark } from '#/lib/bark'
import { HILLENBRAND } from '#/lib/hillenbrand'

import { useColourScheme } from './useColourScheme'

// F1/F2 ranges for North American English vowels (Hz), per Hillenbrand et al. 1995.
// These define the vowel plot boundaries; Bark scale is used for perceptually-uniform spacing.
const F1_MIN = 200
const F1_MAX = 1100
const F2_MIN = 650
const F2_MAX = 3300
const BARK_F1_MIN = hzToBark(F1_MIN)
const BARK_F1_MAX = hzToBark(F1_MAX)
const BARK_F2_MIN = hzToBark(F2_MIN)
const BARK_F2_MAX = hzToBark(F2_MAX)

const PAD = 6 // uniform CSS-pixel padding on all sides

const TRAIL_LEN = 80

const VOWELS: Array<{ label: string; f1: number; f2: number }> = Object.values(
  HILLENBRAND,
)
  .filter((measures) => measures.group === 'a')
  .map(({ ipa, f1, f2 }) => ({ label: ipa, f1, f2 }))

function getVowel(vowelLabel: string) {
  return VOWELS.find((vowel) => vowel.label === vowelLabel)
}

interface VowelChartTheme {
  bg: string
  bg100: string
  guideLine: string
  vowelCircle: string
  vowelText: string
  trailRgb: string
  dot: string
  label: string
}

const DARK_THEME: VowelChartTheme = {
  bg: 'rgba(14,14,20,0.88)',
  bg100: 'rgba(14,14,20,1.0)',
  guideLine: 'rgba(200,200,220,0.15)',
  vowelCircle: 'rgba(180,180,210,0.25)',
  vowelText: 'rgba(200,200,230,0.65)',
  trailRgb: '00,229,255',
  dot: '#00e5ff',
  label: 'rgba(100,100,120,0.8)',
}

const LIGHT_THEME: VowelChartTheme = {
  bg: 'rgba(248,248,255,0.92)',
  bg100: 'rgba(248,248,255,1.0)',
  guideLine: 'rgba(60,60,100,0.12)',
  vowelCircle: 'rgba(60,60,130,0.22)',
  vowelText: 'rgba(40,40,110,0.75)',
  trailRgb: '00,229,255',
  dot: '#00e5ff',
  label: 'rgba(110,110,135,0.9)',
}

function strokeArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  headSize: number,
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const spread = Math.PI / 5
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineTo(
    x2 - headSize * Math.cos(angle - spread),
    y2 - headSize * Math.sin(angle - spread),
  )
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headSize * Math.cos(angle + spread),
    y2 - headSize * Math.sin(angle + spread),
  )
  ctx.stroke()
}

function f1ToY(f1: number, h: number, dpr: number): number {
  const pad = PAD * dpr
  const frac = (hzToBark(f1) - BARK_F1_MIN) / (BARK_F1_MAX - BARK_F1_MIN)
  return pad + frac * (h - 2 * pad)
}

// High F2 → left (front vowels), low F2 → right (back vowels)
function f2ToX(f2: number, w: number, dpr: number): number {
  const pad = PAD * dpr
  const frac = 1 - (hzToBark(f2) - BARK_F2_MIN) / (BARK_F2_MAX - BARK_F2_MIN)
  return pad + frac * (w - 2 * pad)
}

function useCanvasSize(canvas: HTMLCanvasElement | null) {
  const [dpr, setDpr] = useState(() => window.devicePixelRatio)
  const [clientWidth, setClientWidth] = useState(() => canvas?.clientWidth ?? 0)
  const [clientHeight, setClientHeight] = useState(
    () => canvas?.clientHeight ?? 0,
  )

  useEffect(() => {
    const mq = matchMedia(`(resolution: ${dpr}dppx)`)
    const update = () => setDpr(window.devicePixelRatio)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [dpr])

  useEffect(() => {
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      setClientWidth(canvas.clientWidth)
      setClientHeight(canvas.clientHeight)
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [canvas, dpr])

  return { width: clientWidth, height: clientHeight, dpr }
}

function drawVowelChart(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
  history: AnalysisFrame[],
  theme: VowelChartTheme,
): void {
  if (width === 0 || height === 0) return

  const w = Math.round(width * dpr)
  const h = Math.round(height * dpr)
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d', { alpha: false })!
  const pad = PAD * dpr
  const plotX = pad
  const plotY = pad
  const plotW = w - 2 * pad
  const plotH = h - 2 * pad

  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, w, h)

  // Guide lines approximating an academic vowel chart
  // conntect e,^, eI, ou
  const vow_i = getVowel('i')!
  const vow_ɑ = getVowel('ɑ')!
  const vow_u = getVowel('u')!
  const vow_eɪ = getVowel('eɪ')!
  const vow_oʊ = getVowel('oʊ')!
  const vow_ɛ = getVowel('ɛ')!
  const vow_ʌ = getVowel('ʌ')!
  ctx.strokeStyle = theme.guideLine
  ctx.lineWidth = dpr
  ctx.beginPath()
  ctx.moveTo(f2ToX(vow_i.f2, w, dpr), f1ToY(vow_i.f1, h, dpr))
  ctx.lineTo(f2ToX(vow_ɑ.f2, w, dpr), f1ToY(vow_ɑ.f1, h, dpr))
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(f2ToX(vow_i.f2, w, dpr), f1ToY(vow_i.f1, h, dpr))
  ctx.lineTo(f2ToX(vow_u.f2, w, dpr), f1ToY(vow_u.f1, h, dpr))
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(f2ToX(vow_u.f2, w, dpr), f1ToY(vow_u.f1, h, dpr))
  ctx.lineTo(f2ToX(vow_ɑ.f2, w, dpr), f1ToY(vow_ɑ.f1, h, dpr))
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(f2ToX(vow_ɛ.f2, w, dpr), f1ToY(vow_ɛ.f1, h, dpr))
  ctx.lineTo(f2ToX(vow_ʌ.f2, w, dpr), f1ToY(vow_ʌ.f1, h, dpr))
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(f2ToX(vow_eɪ.f2, w, dpr), f1ToY(vow_eɪ.f1, h, dpr))
  ctx.lineTo(f2ToX(vow_oʊ.f2, w, dpr), f1ToY(vow_oʊ.f1, h, dpr))
  ctx.stroke()

  // Vowel reference markers
  ctx.font = `${11 * dpr}px Georgia, "Times New Roman", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const v of VOWELS) {
    const x = f2ToX(v.f2, w, dpr)
    const y = f1ToY(v.f1, h, dpr)
    if (x < plotX || x > plotX + plotW || y < plotY || y > plotY + plotH)
      continue

    ctx.beginPath()
    ctx.arc(x, y, 11 * dpr, 0, Math.PI * 2)
    ctx.strokeStyle = theme.vowelCircle
    ctx.fillStyle = theme.bg100
    ctx.lineWidth = dpr
    ctx.stroke()
    ctx.fill()

    ctx.fillStyle = theme.vowelText
    ctx.fillText(v.label, x, y)
  }

  // Trail of recent voiced frames
  const voiced = history.filter(
    (s): s is VoicedAnalysisFrame =>
      s.pitchDetected && s.speechDetected && s.f1 !== null && s.f2 !== null,
  )
  const trail = voiced.slice(-TRAIL_LEN)

  if (trail.length > 1) {
    ctx.lineWidth = 1.5 * dpr
    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.5
      const s = trail[i]!
      const sp = trail[i - 1]!
      ctx.strokeStyle = `rgba(${theme.trailRgb},${alpha})`
      ctx.beginPath()
      ctx.moveTo(f2ToX(sp.f2, w, dpr), f1ToY(sp.f1, h, dpr))
      ctx.lineTo(f2ToX(s.f2, w, dpr), f1ToY(s.f1, h, dpr))
      ctx.stroke()
    }
  }

  // Current position dot with glow
  if (trail.length > 0) {
    const s = trail[trail.length - 1]!
    const x = f2ToX(s.f2, w, dpr)
    const y = f1ToY(s.f1, h, dpr)

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 14 * dpr)
    glow.addColorStop(0, `rgba(${theme.trailRgb},0.35)`)
    glow.addColorStop(1, `rgba(${theme.trailRgb},0)`)
    ctx.beginPath()
    ctx.arc(x, y, 14 * dpr, 0, Math.PI * 2)
    ctx.fillStyle = glow
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2)
    ctx.fillStyle = theme.dot
    ctx.fill()
  }

  // Axis labels with long canvas-drawn arrows showing direction
  ctx.font = `${8 * dpr}px monospace`
  ctx.fillStyle = theme.label
  ctx.strokeStyle = theme.label
  ctx.lineWidth = dpr
  ctx.lineCap = 'round'

  // "F1" label at top-left, long downward arrow below it
  const f1ArrowX = plotX + 10 * dpr
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('F1', f1ArrowX, plotY + 3 * dpr)
  strokeArrow(
    ctx,
    f1ArrowX,
    plotY + 15 * dpr,
    f1ArrowX,
    plotY + plotH * 0.86,
    4 * dpr,
  )

  // "F2" label at bottom-right, long leftward arrow to its left
  const f2LabelY = plotY + plotH - 10 * dpr
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText('F2', plotX + plotW - 4 * dpr, f2LabelY)
  const f2W = ctx.measureText('F2').width
  strokeArrow(
    ctx,
    plotX + plotW - 4 * dpr - f2W - 6 * dpr,
    f2LabelY,
    plotX + 20 * dpr,
    f2LabelY,
    4 * dpr,
  )

  ctx.lineCap = 'butt'
}

export interface VowelChartHandle {
  append: (from: number) => void
  patch: (from: number, to: number) => void
}

function framesUpToCursor(
  analysis: AnalysisChunk[],
  cursorSec: number,
): AnalysisFrame[] {
  let elapsed = 0
  const result: AnalysisFrame[] = []
  outer: for (const chunk of analysis) {
    const stepSec = chunk.timeStepSamples / chunk.sampleRate
    for (const frame of chunk.frames) {
      result.push(frame)
      elapsed += stepSec
      if (elapsed >= cursorSec) break outer
    }
  }
  return result
}

export function VowelChart({
  analysisMut,
  cursorSec,
  ref,
}: {
  analysisMut: AnalysisChunk[]
  cursorSec: number
  ref: RefObject<VowelChartHandle | null>
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const { width, height, dpr } = useCanvasSize(canvas)
  const scheme = useColourScheme()
  const theme = scheme === 'dark' ? DARK_THEME : LIGHT_THEME

  useEffect(() => {
    if (!canvas) return
    drawVowelChart(
      canvas,
      width,
      height,
      dpr,
      framesUpToCursor(analysisMut, cursorSec),
      theme,
    )
  }, [canvas, width, height, dpr, analysisMut, cursorSec, theme])

  useImperativeHandle(
    ref,
    () => ({
      append(_from) {
        if (!canvas) return
        drawVowelChart(
          canvas,
          width,
          height,
          dpr,
          framesUpToCursor(analysisMut, cursorSec),
          theme,
        )
      },
      patch(_from, _to) {
        if (!canvas) return
        drawVowelChart(
          canvas,
          width,
          height,
          dpr,
          framesUpToCursor(analysisMut, cursorSec),
          theme,
        )
      },
    }),
    [canvas, width, height, dpr, analysisMut, cursorSec, theme],
  )

  return <canvas ref={(el) => setCanvas(el)} className="w-full h-full" />
}
