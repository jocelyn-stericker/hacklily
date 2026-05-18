// Plots F1/F2 formant pairs on a vowel chart for vowel space visualization.

import { useEffect, useImperativeHandle, useState } from 'react'
import type { RefObject } from 'react'

import type {
  AnalysisChunk,
  AnalysisFrame,
  VoicedAnalysisFrame,
} from '#/lib/analysis'
import { hzToBark } from '#/lib/bark'

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

// CSS-pixel padding
const PAD_L = 38
const PAD_B = 32
const PAD_T = 10
const PAD_R = 10

const TRAIL_LEN = 80

// North American English vowels – Hillenbrand et al. 1995, M+F average
const VOWELS: Array<{ label: string; word: string; f1: number; f2: number }> = [
  { label: 'i', word: 'heed', f1: 390, f2: 2540 },
  { label: 'ɪ', word: 'hid', f1: 455, f2: 2200 },
  { label: 'eɪ', word: 'hayed', f1: 506, f2: 2310 },
  { label: 'ɛ', word: 'head', f1: 656, f2: 1929 },
  { label: 'æ', word: 'had', f1: 629, f2: 2151 },
  { label: 'ɑ', word: 'hod', f1: 852, f2: 1442 },
  { label: 'ɔ', word: 'hawed', f1: 717, f2: 1067 },
  { label: 'oʊ', word: 'hoed', f1: 526, f2: 973 },
  { label: 'ʊ', word: 'hood', f1: 494, f2: 1174 },
  { label: 'u', word: "who'd", f1: 419, f2: 1051 },
  { label: 'ʌ', word: 'hud', f1: 688, f2: 1313 },
  { label: 'ɝ', word: 'heard', f1: 499, f2: 1484 },
]

const F1_TICKS = [200, 300, 400, 500, 600, 700, 800, 900, 1000]
const F2_TICKS = [700, 1000, 1500, 2000, 2500, 3000]

function f1ToY(f1: number, h: number, dpr: number): number {
  const plotH = h - (PAD_T + PAD_B) * dpr
  const frac = (hzToBark(f1) - BARK_F1_MIN) / (BARK_F1_MAX - BARK_F1_MIN)
  return PAD_T * dpr + frac * plotH
}

// High F2 → left (front vowels), low F2 → right (back vowels)
function f2ToX(f2: number, w: number, dpr: number): number {
  const plotW = w - (PAD_L + PAD_R) * dpr
  const frac = 1 - (hzToBark(f2) - BARK_F2_MIN) / (BARK_F2_MAX - BARK_F2_MIN)
  return PAD_L * dpr + frac * plotW
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
): void {
  if (width === 0 || height === 0) return

  const w = Math.round(width * dpr)
  const h = Math.round(height * dpr)
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = '#0e0e14'
  ctx.fillRect(0, 0, w, h)

  const plotX = PAD_L * dpr
  const plotY = PAD_T * dpr
  const plotW = w - (PAD_L + PAD_R) * dpr
  const plotH = h - (PAD_T + PAD_B) * dpr

  // Plot area background
  ctx.fillStyle = '#121218'
  ctx.fillRect(plotX, plotY, plotW, plotH)

  // Grid lines
  ctx.lineWidth = dpr
  for (const f1 of F1_TICKS) {
    const y = f1ToY(f1, h, dpr)
    if (y < plotY || y > plotY + plotH) continue
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.beginPath()
    ctx.moveTo(plotX, y)
    ctx.lineTo(plotX + plotW, y)
    ctx.stroke()
  }
  for (const f2 of F2_TICKS) {
    const x = f2ToX(f2, w, dpr)
    if (x < plotX || x > plotX + plotW) continue
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.beginPath()
    ctx.moveTo(x, plotY)
    ctx.lineTo(x, plotY + plotH)
    ctx.stroke()
  }

  // Vowel reference points
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
    ctx.strokeStyle = 'rgba(180,180,210,0.22)'
    ctx.lineWidth = dpr
    ctx.stroke()

    ctx.fillStyle = 'rgba(200,200,230,0.55)'
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
      ctx.strokeStyle = `rgba(247,143,179,${alpha})`
      ctx.beginPath()
      ctx.moveTo(f2ToX(sp.f2, w, dpr), f1ToY(sp.f1, h, dpr))
      ctx.lineTo(f2ToX(s.f2, w, dpr), f1ToY(s.f1, h, dpr))
      ctx.stroke()
    }
  }

  // Current position dot
  if (trail.length > 0) {
    const s = trail[trail.length - 1]!
    const x = f2ToX(s.f2, w, dpr)
    const y = f1ToY(s.f1, h, dpr)

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 14 * dpr)
    glow.addColorStop(0, 'rgba(247,143,179,0.35)')
    glow.addColorStop(1, 'rgba(247,143,179,0)')
    ctx.beginPath()
    ctx.arc(x, y, 14 * dpr, 0, Math.PI * 2)
    ctx.fillStyle = glow
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2)
    ctx.fillStyle = '#f78fb3'
    ctx.fill()
  }

  // F1 axis tick marks + labels (left)
  ctx.font = `${9 * dpr}px monospace`
  ctx.fillStyle = '#555566'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const f1 of F1_TICKS) {
    const y = f1ToY(f1, h, dpr)
    if (y < plotY || y > plotY + plotH) continue
    ctx.strokeStyle = '#333344'
    ctx.lineWidth = dpr
    ctx.beginPath()
    ctx.moveTo(plotX - 4 * dpr, y)
    ctx.lineTo(plotX, y)
    ctx.stroke()
    ctx.fillText(String(f1), plotX - 6 * dpr, y)
  }

  // F2 axis tick marks + labels (bottom)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const f2 of F2_TICKS) {
    const x = f2ToX(f2, w, dpr)
    if (x < plotX || x > plotX + plotW) continue
    ctx.strokeStyle = '#333344'
    ctx.lineWidth = dpr
    ctx.beginPath()
    ctx.moveTo(x, plotY + plotH)
    ctx.lineTo(x, plotY + plotH + 4 * dpr)
    ctx.stroke()
    ctx.fillStyle = '#555566'
    const label = f2 >= 1000 ? `${f2 / 1000}k` : String(f2)
    ctx.fillText(label, x, plotY + plotH + 6 * dpr)
  }

  // Axis border
  ctx.strokeStyle = '#2a2a3a'
  ctx.lineWidth = dpr
  ctx.beginPath()
  ctx.moveTo(plotX, plotY)
  ctx.lineTo(plotX, plotY + plotH)
  ctx.lineTo(plotX + plotW, plotY + plotH)
  ctx.stroke()

  // Axis title: "F1 (Hz)" top-left inside plot
  ctx.font = `${9 * dpr}px monospace`
  ctx.fillStyle = '#666677'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('F1 (Hz) ↓', plotX + 4 * dpr, plotY + 3 * dpr)

  // Axis title: "← F2 (Hz)" bottom-right
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('← F2 (Hz)', plotX + plotW, h - 2 * dpr)

  // Legend box (top-right corner)
  const lgX = plotX + plotW - 4 * dpr
  const lgY = plotY + 4 * dpr
  const lgLineH = 14 * dpr
  ctx.font = `${9 * dpr}px monospace`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'

  // Reference vowel entry
  ctx.strokeStyle = 'rgba(180,180,210,0.22)'
  ctx.lineWidth = dpr
  ctx.beginPath()
  ctx.arc(lgX - 28 * dpr, lgY + lgLineH * 0, 5 * dpr, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(200,200,230,0.55)'
  ctx.fillText('NA Eng vowels', lgX - 10 * dpr, lgY + lgLineH * 0)

  // Current F1/F2 entry
  ctx.beginPath()
  ctx.arc(lgX - 28 * dpr, lgY + lgLineH * 1, 4 * dpr, 0, Math.PI * 2)
  ctx.fillStyle = '#f78fb3'
  ctx.fill()
  ctx.fillStyle = '#f78fb3'
  ctx.fillText('Current F1/F2', lgX - 10 * dpr, lgY + lgLineH * 1)
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
  analysis,
  cursorSec,
  ref,
}: {
  analysis: AnalysisChunk[]
  cursorSec: number
  ref: RefObject<VowelChartHandle | null>
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const { width, height, dpr } = useCanvasSize(canvas)

  useEffect(() => {
    if (!canvas) return
    drawVowelChart(
      canvas,
      width,
      height,
      dpr,
      framesUpToCursor(analysis, cursorSec),
    )
  }, [canvas, width, height, dpr, analysis, cursorSec])

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
          framesUpToCursor(analysis, cursorSec),
        )
      },
      patch(_from, _to) {
        if (!canvas) return
        drawVowelChart(
          canvas,
          width,
          height,
          dpr,
          framesUpToCursor(analysis, cursorSec),
        )
      },
    }),
    [canvas, width, height, dpr, analysis, cursorSec],
  )

  return <canvas ref={(el) => setCanvas(el)} className="w-full h-96 mt-4" />
}
