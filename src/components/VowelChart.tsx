// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Plots F1/F2 formant pairs on a vowel chart for vowel space visualization.

import { useEffect, useImperativeHandle, useMemo, useState } from 'react'
import type { RefObject } from 'react'

import { useSettings } from '#/components/useSettings'
import { hasPlottableFormants } from '#/lib/analysis/AnalysisFrame'
import type {
  AnalysisChunk,
  PlottableFormantFrame,
} from '#/lib/analysis/AnalysisFrame'
import { HILLENBRAND } from '#/lib/analysis/hillenbrand'
import { hzToBark } from '#/lib/dsp/bark'
import type { VowelChartAverages } from '#/lib/settings'
import { VOWEL_CHART_DARK_THEME, VOWEL_CHART_LIGHT_THEME } from '#/lib/theme'
import type { VowelChartTheme } from '#/lib/theme'

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

type Vowel = { label: string; f1: number; f2: number }

const VOWEL_CHART_GROUP_MAP: Record<
  Exclude<VowelChartAverages, 'hidden'>,
  string
> = {
  women: 'w',
  men: 'm',
  adults: 'a',
  children: 'c',
}

function vowelsForGroup(group: string | null): Vowel[] {
  if (!group) return []
  return Object.values(HILLENBRAND)
    .filter((measures) => measures.group === group)
    .map(({ ipa, f1, f2 }) => ({ label: ipa, f1, f2 }))
}

const TRAIL_LEN = 80

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

// Fractional position of a formant within the plot area, independent of the
// canvas size or DPR.
export function f1ToFraction(f1: number): number {
  return (hzToBark(f1) - BARK_F1_MIN) / (BARK_F1_MAX - BARK_F1_MIN)
}

export function f2ToFraction(f2: number): number {
  return 1 - (hzToBark(f2) - BARK_F2_MIN) / (BARK_F2_MAX - BARK_F2_MIN)
}

// Pixel Y for a formant, from the plot height alone, independent of width.
export function f1ToY(f1: number, h: number, dpr: number): number {
  const pad = PAD * dpr
  return pad + f1ToFraction(f1) * (h - 2 * pad)
}

// Pixel X for a formant, from the plot width alone (high F2 -> left/front, low
// F2 -> right/back). Independent of height, mirroring f1ToY. Exported for testing.
export function f2ToX(f2: number, w: number, dpr: number): number {
  const pad = PAD * dpr
  return pad + f2ToFraction(f2) * (w - 2 * pad)
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
  symbolScale: number,
  trail: PlottableFormantFrame[],
  theme: VowelChartTheme,
  vowels: Vowel[],
): void {
  if (width === 0 || height === 0) return

  const w = Math.round(width * dpr)
  const h = Math.round(height * dpr)
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d', { alpha: false })!
  const pad = PAD * dpr
  // Device pixels scaled by the chart's zoom, so markers, labels, dots and line
  // widths grow with the panel instead of staying tiny. Vowel *positions* still
  // come from f2ToX/f1ToY (plot geometry), so they spread out with the box; only
  // the drawn symbol sizes use glyphUnit.
  const glyphUnit = dpr * symbolScale
  const plotX = pad
  const plotY = pad
  const plotW = w - 2 * pad
  const plotH = h - 2 * pad

  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, w, h)

  if (vowels.length > 0) {
    function getVowel(label: string) {
      return vowels.find((v) => v.label === label)
    }

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
    ctx.lineWidth = glyphUnit
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
    ctx.font = `${11 * glyphUnit}px Georgia, "Times New Roman", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const v of vowels) {
      const x = f2ToX(v.f2, w, dpr)
      const y = f1ToY(v.f1, h, dpr)
      if (x < plotX || x > plotX + plotW || y < plotY || y > plotY + plotH)
        continue

      ctx.beginPath()
      ctx.arc(x, y, 11 * glyphUnit, 0, Math.PI * 2)
      ctx.strokeStyle = theme.vowelCircle
      ctx.fillStyle = theme.bg100
      ctx.lineWidth = glyphUnit
      ctx.stroke()
      ctx.fill()

      ctx.fillStyle = theme.vowelText
      ctx.fillText(v.label, x, y)
    }
  }

  // Trail of recent voiced frames (already filtered + tail-bounded by caller)
  if (trail.length > 1) {
    ctx.lineWidth = 1.5 * glyphUnit
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

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 14 * glyphUnit)
    glow.addColorStop(0, `rgba(${theme.trailRgb},0.35)`)
    glow.addColorStop(1, `rgba(${theme.trailRgb},0)`)
    ctx.beginPath()
    ctx.arc(x, y, 14 * glyphUnit, 0, Math.PI * 2)
    ctx.fillStyle = glow
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, 5 * glyphUnit, 0, Math.PI * 2)
    ctx.fillStyle = theme.dot
    ctx.fill()
  }

  // Axis labels with long canvas-drawn arrows showing direction
  ctx.font = `${8 * glyphUnit}px monospace`
  ctx.fillStyle = theme.label
  ctx.strokeStyle = theme.label
  ctx.lineWidth = glyphUnit
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
    4 * glyphUnit,
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
    4 * glyphUnit,
  )

  ctx.lineCap = 'butt'
}

export interface VowelChartHandle {
  append: (from: number) => void
  patch: (from: number, to: number) => void
}

// We only ever draw a trail of the last TRAIL_LEN voiced frames up to the
// cursor, so walk backwards from the cursor and stop once the trail is full
// instead of scanning (and allocating) the whole recording. The output array is
// reused across redraws and bounded by TRAIL_LEN. The common live-recording
// case (cursor at the end) only touches the last TRAIL_LEN voiced frames.
const trailOut: PlottableFormantFrame[] = []

export function voicedTrailUpToCursor(
  analysis: AnalysisChunk[],
  cursorSec: number,
  // When true, keep pitched frames the VAD marks as non-speech (issue #16), so
  // a held tone still leaves a trail. Default false = speech-only (isVoiced).
  includeUnvoiced = false,
): PlottableFormantFrame[] {
  trailOut.length = 0

  // Locate the chunk holding the cursor via each chunk's authoritative
  // startTimeSec (chunk scan, a frame scan is too slow).
  let ci = analysis.length - 1
  for (let c = 0; c < analysis.length; c++) {
    const chunk = analysis[c]!
    const chunkDur =
      (chunk.frames.length * chunk.timeStepSamples) / chunk.sampleRate
    if (cursorSec < chunk.startTimeSec + chunkDur) {
      ci = c
      break
    }
  }
  if (ci < 0) return trailOut

  // Frame at the cursor (inclusive): the first frame whose elapsed time reaches
  // it, matching the old forward scan.
  const cursorChunk = analysis[ci]!
  const stepSec = cursorChunk.timeStepSamples / cursorChunk.sampleRate
  // fi may be -1 when cursorChunk has no frames yet (e.g. a new recording chunk
  // pushed before any frames arrive). The backward scan loop starts at -1 and
  // immediately exits, falling through to the preceding chunk.
  const fi = Math.min(
    Math.ceil((cursorSec - cursorChunk.startTimeSec) / stepSec) - 1,
    cursorChunk.frames.length - 1,
  )

  // Collect voiced frames backwards until full, then restore chronological order.
  outer: for (let c = ci; c >= 0; c--) {
    const frames = analysis[c]!.frames
    for (let f = c === ci ? fi : frames.length - 1; f >= 0; f--) {
      const frame = frames[f]!
      if (hasPlottableFormants(frame, !includeUnvoiced)) {
        trailOut.push(frame)
        if (trailOut.length >= TRAIL_LEN) break outer
      }
    }
  }
  trailOut.reverse()
  return trailOut
}

export function VowelChart({
  analysisMut,
  cursorSec,
  ref,
}: {
  analysisMut: AnalysisChunk[]
  cursorSec: number
  ref?: RefObject<VowelChartHandle | null>
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const { width, height, dpr } = useCanvasSize(canvas)
  const scheme = useColourScheme()
  const theme =
    scheme === 'dark' ? VOWEL_CHART_DARK_THEME : VOWEL_CHART_LIGHT_THEME
  const [settings] = useSettings()
  const symbolScale = settings.vowelChartScale
  const includeUnvoiced = settings.showFormantsWithoutSpeech

  const group =
    settings.vowelChartAverages === 'hidden'
      ? null
      : VOWEL_CHART_GROUP_MAP[settings.vowelChartAverages]

  const vowels = useMemo(() => vowelsForGroup(group), [group])

  useEffect(() => {
    if (!canvas) return
    drawVowelChart(
      canvas,
      width,
      height,
      dpr,
      symbolScale,
      voicedTrailUpToCursor(analysisMut, cursorSec, includeUnvoiced),
      theme,
      vowels,
    )
  }, [
    canvas,
    width,
    height,
    dpr,
    symbolScale,
    includeUnvoiced,
    analysisMut,
    cursorSec,
    theme,
    vowels,
  ])

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
          symbolScale,
          voicedTrailUpToCursor(analysisMut, cursorSec, includeUnvoiced),
          theme,
          vowels,
        )
      },
      patch(_from, _to) {
        if (!canvas) return
        drawVowelChart(
          canvas,
          width,
          height,
          dpr,
          symbolScale,
          voicedTrailUpToCursor(analysisMut, cursorSec, includeUnvoiced),
          theme,
          vowels,
        )
      },
    }),
    [
      canvas,
      width,
      height,
      dpr,
      symbolScale,
      includeUnvoiced,
      analysisMut,
      cursorSec,
      theme,
      vowels,
    ],
  )

  return <canvas ref={(el) => setCanvas(el)} className="w-full h-full" />
}
