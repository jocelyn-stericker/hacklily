// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Renders the waveform overview from analysis frames with configurable amplitude
// scaling.
//
// The waveform is a full-track overview (always fully zoomed out, with a
// viewport shade marking the spectrogram's window), so — unlike the
// spectrogram — every part is always on-screen. Holding frame-resolution canvas
// tiles only to draw them downscaled to ~viewport width wasted memory that grew
// with recording length. Instead we render straight into the visible canvas at
// display resolution: for each display column we take the peak RMS of the frames
// that map to it. That bounds retained memory to a single viewport-sized canvas
// regardless of recording length. See docs/memory-improvements.md item 1a.

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { getFrame, totalFrames } from '#/lib/analysis/AnalysisFrame'
import { registerMemSource } from '#/lib/memProbe'
import { UNVOICED_FILL, VOICED_FILL } from '#/lib/theme'

import {
  useAmpToY,
  InCanvas,
  usePlotPad,
  usePlotSize,
  useTimeToX,
} from './Plot'
import { useColourScheme } from './useColourScheme'

export interface WaveformHandle {
  /** Call after appending frames [from, analysis.length) to the stored analysis. */
  append: (from: number) => void
  /** Call after mutating frames [from, to) of the stored analysis in-place. */
  patch: (from: number, to: number) => void
}

// Mapping snapshot of the last render, used to decide whether the next render
// can be incremental (same scale, more frames at the right edge) or needs a full
// repaint (scale change, e.g. crossing a 30 s overview boundary or a resize).
interface RenderMap {
  x0: number // device x of frame 0 (= timeToX(0))
  dxPerFrame: number // device px per analysis frame
  paintedFrames: number // frames already rasterized into the canvas
  w: number
  h: number
}

// Repaint display columns [xLo, xHi] from the analysis frames that map to them.
// Each column shows the peak RMS envelope of its frames; the column is cleared
// to the background first so stale content from a previous frame can't linger.
function drawColumns(
  ctx: CanvasRenderingContext2D,
  analysis: AnalysisChunk[],
  ampToY: (amp: number) => number,
  bgColor: string,
  x0: number,
  dxPerFrame: number,
  width: number,
  height: number,
  numFrames: number,
  xLo: number,
  xHi: number,
): void {
  if (dxPerFrame <= 0) return
  const lo = Math.max(0, xLo)
  const hi = Math.min(width - 1, xHi)
  for (let x = lo; x <= hi; x++) {
    ctx.fillStyle = bgColor
    ctx.fillRect(x, 0, 1, height)

    // Frames f with floor(x0 + f*dxPerFrame) === x, i.e.
    //   x <= x0 + f*dxPerFrame < x + 1.
    let fStart = Math.ceil((x - x0) / dxPerFrame)
    let fEnd = Math.ceil((x + 1 - x0) / dxPerFrame)
    if (fStart < 0) fStart = 0
    if (fEnd > numFrames) fEnd = numFrames
    if (fEnd <= fStart) continue

    let maxRms = 0
    let speech = false
    for (let f = fStart; f < fEnd; f++) {
      const sample = getFrame(analysis, f)!
      if (sample.rms > maxRms) {
        maxRms = sample.rms
        speech = sample.speechDetected === true
      }
    }
    if (maxRms <= 0) continue

    const yA = Math.round(ampToY(-maxRms))
    const yB = Math.round(ampToY(maxRms))
    let top = yA < yB ? yA : yB
    let bot = yA < yB ? yB : yA
    if (top < 0) top = 0
    if (bot > height) bot = height
    if (bot <= top) continue
    ctx.fillStyle = speech ? VOICED_FILL : UNVOICED_FILL
    ctx.fillRect(x, top, 1, bot - top)
  }
}

export function Waveform({
  analysisMut,
  ref,
}: {
  analysisMut: AnalysisChunk[]
  ref: RefObject<WaveformHandle | null>
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const plotPad = usePlotPad()
  const { width, height, dpr } = usePlotSize()
  const timeToX = useTimeToX(InCanvas.Yes)
  const ampToY = useAmpToY(InCanvas.Yes)
  const canvasWidth = (width - plotPad.left - plotPad.right) * dpr
  const canvasHeight = (height - plotPad.top - plotPad.bottom) * dpr

  const scheme = useColourScheme()
  const bgColor = scheme === 'dark' ? '#000000' : '#ffffff'

  const mapRef = useRef<RenderMap | null>(null)
  const animationFrame = useRef<number | null>(null)
  const triggerDraw = useRef(() => {})
  // Pending changed frame range [dirtyFrom, dirtyTo). dirtyTo === Infinity means
  // "to the current end" (a pending append). null dirtyFrom means no pending work.
  const dirtyFromRef = useRef<number | null>(null)
  const dirtyToRef = useRef<number>(0)
  // Forces a full repaint on the next render — set whenever the draw effect
  // re-runs (amp scale, theme, size, analysis identity all changed).
  const forceFullRef = useRef(true)

  // Dev-only: report the single retained overview canvas to the probe.
  useEffect(() => {
    return registerMemSource('waveform', 'Waveform overview canvas', () => {
      const m = mapRef.current
      return { canvasBytes: m ? m.w * m.h * 4 : 0 }
    })
  }, [])

  useEffect(() => {
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })!
    // Deps changed (size, amp scale, theme, or a new analysis array): repaint all.
    forceFullRef.current = true

    triggerDraw.current = () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
      animationFrame.current = requestAnimationFrame(() => {
        animationFrame.current = null

        if (canvas.width !== canvasWidth) {
          canvas.width = canvasWidth
          forceFullRef.current = true
        }
        if (canvas.height !== canvasHeight) {
          canvas.height = canvasHeight
          forceFullRef.current = true
        }
        ctx.imageSmoothingEnabled = false

        const w = canvasWidth
        const h = canvasHeight
        const numFrames = totalFrames(analysisMut)
        const timeStepSec = analysisMut[0]
          ? analysisMut[0].timeStepSamples / analysisMut[0].sampleRate
          : 0 // assumes uniform params across chunks

        if (w <= 0 || h <= 0 || numFrames === 0 || timeStepSec <= 0) {
          ctx.fillStyle = bgColor
          ctx.fillRect(0, 0, Math.max(0, w), Math.max(0, h))
          mapRef.current = null
          dirtyFromRef.current = null
          dirtyToRef.current = 0
          forceFullRef.current = false
          return
        }

        // timeToX is linear, so one frame is a constant dxPerFrame px wide.
        const dxPerSec = timeToX(1) - timeToX(0)
        const dxPerFrame = dxPerSec * timeStepSec
        const x0 = timeToX(0)
        const prev = mapRef.current

        const needFull =
          forceFullRef.current ||
          !prev ||
          prev.w !== w ||
          prev.h !== h ||
          numFrames < prev.paintedFrames ||
          Math.abs(prev.x0 - x0) > 1e-3 ||
          Math.abs(prev.dxPerFrame - dxPerFrame) > 1e-9

        let xLo: number
        let xHi: number
        if (needFull) {
          xLo = 0
          xHi = w - 1
        } else {
          // needFull includes !prev, so prev is non-null here.
          const base = prev
          let fLo =
            dirtyFromRef.current !== null
              ? dirtyFromRef.current
              : base.paintedFrames
          let fHi =
            dirtyToRef.current === Infinity
              ? numFrames
              : Math.min(dirtyToRef.current, numFrames)
          if (numFrames > base.paintedFrames) {
            fHi = Math.max(fHi, numFrames)
            fLo = Math.min(fLo, base.paintedFrames)
          }
          if (fHi <= fLo) {
            mapRef.current = { x0, dxPerFrame, paintedFrames: numFrames, w, h }
            dirtyFromRef.current = null
            dirtyToRef.current = 0
            forceFullRef.current = false
            return
          }
          if (fLo < 0) fLo = 0
          // Start one frame earlier so the column straddling the previous edge
          // (which may have gained frames) is recomputed too.
          const startFrame = fLo > 0 ? fLo - 1 : 0
          xLo = Math.floor(x0 + startFrame * dxPerFrame)
          xHi = Math.floor(x0 + (fHi - 1) * dxPerFrame)
        }

        drawColumns(
          ctx,
          analysisMut,
          ampToY,
          bgColor,
          x0,
          dxPerFrame,
          w,
          h,
          numFrames,
          xLo,
          xHi,
        )

        mapRef.current = { x0, dxPerFrame, paintedFrames: numFrames, w, h }
        dirtyFromRef.current = null
        dirtyToRef.current = 0
        forceFullRef.current = false
      })
    }

    triggerDraw.current()

    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }
  }, [analysisMut, canvas, canvasWidth, canvasHeight, timeToX, ampToY, bgColor])

  useImperativeHandle(
    ref,
    () => ({
      append(from) {
        dirtyFromRef.current = Math.min(from, dirtyFromRef.current ?? Infinity)
        dirtyToRef.current = Infinity
        triggerDraw.current()
      },
      patch(from, to) {
        dirtyFromRef.current = Math.min(from, dirtyFromRef.current ?? Infinity)
        // Math.max(to, Infinity) = Infinity, so a pending append keeps priority.
        dirtyToRef.current = Math.max(to, dirtyToRef.current)
        triggerDraw.current()
      },
    }),
    [],
  )

  return (
    <canvas
      ref={setCanvas}
      style={{
        left: plotPad.left,
        right: plotPad.right,
        top: plotPad.top,
        bottom: plotPad.bottom,
        width: width - plotPad.left - plotPad.right,
        height: height - plotPad.top - plotPad.bottom,
      }}
      className="absolute"
    />
  )
}
