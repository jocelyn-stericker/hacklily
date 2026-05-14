import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisFrame } from '#/lib/analysis'
import { TILE_WIDTH } from '#/lib/tileConfig'

import {
  useAmpToY,
  InCanvas,
  usePlotPad,
  usePlotSize,
  useTimeToX,
} from './Plot'

export interface WaveformHandle {
  /** Call after appending frames [from, analysis.length) to the stored analysis. */
  append: (from: number) => void
  /** Call after mutating frames [from, to) of the stored analysis in-place. */
  patch: (from: number, to: number) => void
}

interface Tile {
  canvas: OffscreenCanvas
  ctx: OffscreenCanvasRenderingContext2D
  startFrame: number
}

interface OffscreenState {
  tiles: Tile[]
  canvasHeight: number
}

function ensureTiles(off: OffscreenState, needed: number): void {
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (off.tiles.length < numTiles) {
    const startFrame = off.tiles.length * TILE_WIDTH
    const canvas = new OffscreenCanvas(TILE_WIDTH, off.canvasHeight)
    const ctx = canvas.getContext('2d')!
    off.tiles.push({ canvas, ctx, startFrame })
  }
}

function paintColumnsToOffscreen(
  off: OffscreenState,
  analysis: AnalysisFrame[],
  from: number,
  to: number,
  ampToY: (amp: number) => number,
): void {
  if (to <= from) return
  const { tiles, canvasHeight } = off
  const firstTile = Math.floor(from / TILE_WIDTH)
  const lastTile = Math.floor((to - 1) / TILE_WIDTH)
  for (let t = firstTile; t <= lastTile && t < tiles.length; t++) {
    const tile = tiles[t]!
    const absFrom = Math.max(from, tile.startFrame)
    const absTo = Math.min(to, tile.startFrame + TILE_WIDTH)
    const localFrom = absFrom - tile.startFrame
    const { ctx } = tile
    ctx.clearRect(localFrom, 0, absTo - absFrom, canvasHeight)
    for (let f = absFrom; f < absTo; f++) {
      const sample = analysis[f]!
      const y0 = ampToY(sample.rms)
      const y1 = ampToY(-sample.rms)
      ctx.fillStyle = sample.voiced
        ? 'rgba(78,205,196,0.82)'
        : 'rgba(100,100,140,0.55)'
      ctx.fillRect(f - tile.startFrame, y0, 1, y1 - y0)
    }
  }
}

function draw(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  off: OffscreenState | null,
  timeToX: (timeSec: number) => number,
  timeStepSec: number,
): void {
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)

  if (!off || timeStepSec <= 0) return

  // Offscreen x = frame_index; timeToX is linear so one timeStepSec = dxPerFrame px.
  // srcX0 is the (possibly fractional) frame index at the left display edge.
  const dxPerFrame = timeToX(timeStepSec) - timeToX(0)
  if (dxPerFrame <= 0) return
  const srcX0 = -timeToX(0) / dxPerFrame
  const srcW = width / dxPerFrame

  for (const tile of off.tiles) {
    const tileSrcX = srcX0 - tile.startFrame
    const clippedSrcX = Math.max(0, tileSrcX)
    const clippedSrcW = Math.min(TILE_WIDTH, tileSrcX + srcW) - clippedSrcX
    if (clippedSrcW <= 0) continue
    const destX = (clippedSrcX - tileSrcX) * dxPerFrame
    const destW = clippedSrcW * dxPerFrame
    ctx.drawImage(
      tile.canvas,
      clippedSrcX,
      0,
      clippedSrcW,
      off.canvasHeight,
      destX,
      0,
      destW,
      height,
    )
  }
}

export function Waveform({
  analysis,
  ref,
}: {
  analysis: AnalysisFrame[]
  ref: RefObject<WaveformHandle | null>
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const plotPad = usePlotPad()
  const { width, height, dpr } = usePlotSize()
  const timeToX = useTimeToX(InCanvas.Yes)
  const ampToY = useAmpToY(InCanvas.Yes)
  const canvasWidth = (width - plotPad.left - plotPad.right) * dpr
  const canvasHeight = (height - plotPad.top - plotPad.bottom) * dpr

  const offRef = useRef<OffscreenState | null>(null)
  const animationFrame = useRef<number | null>(null)
  const triggerDraw = useRef(() => {})
  const fromRef = useRef<number | null>(null)
  const drawFrame = useRef<number | null>(null)

  useEffect(() => {
    if (analysis.length === 0) {
      offRef.current = null
      return
    }
    const off: OffscreenState = { tiles: [], canvasHeight }
    ensureTiles(off, analysis.length)
    offRef.current = off
    paintColumnsToOffscreen(off, analysis, 0, analysis.length, ampToY)
    // Note: this must include everything in the previous effect (none here)
  }, [analysis, canvasHeight, ampToY])

  // ---- FALLS THROUGH TO NEXT EFFECT ----

  useEffect(() => {
    if (!canvas) return

    triggerDraw.current = () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
      animationFrame.current = requestAnimationFrame(() => {
        draw(
          canvas,
          canvasWidth,
          canvasHeight,
          offRef.current,
          timeToX,
          analysis[0]
            ? analysis[0].timeStepSamples / analysis[0].sampleRate
            : 0,
        )
      })
    }

    triggerDraw.current()

    // Note: this must include everything in the previous effect
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
      if (drawFrame.current !== null) cancelAnimationFrame(drawFrame.current)
      drawFrame.current = null
      animationFrame.current = null
    }
  }, [analysis, canvasHeight, ampToY, canvas, canvasWidth, timeToX])

  useImperativeHandle(
    ref,
    () => ({
      append(from) {
        fromRef.current = Math.min(from, fromRef.current ?? Infinity)
        if (drawFrame.current !== null) return
        drawFrame.current = requestAnimationFrame(() => {
          drawFrame.current = null
          const effectiveFrom = fromRef.current!
          fromRef.current = null
          const to = analysis.length
          if (effectiveFrom >= to) return

          if (!offRef.current && canvasHeight > 0) {
            const off: OffscreenState = { tiles: [], canvasHeight }
            ensureTiles(off, to)
            offRef.current = off
            paintColumnsToOffscreen(off, analysis, 0, to, ampToY)
          } else if (offRef.current) {
            ensureTiles(offRef.current, to)
            paintColumnsToOffscreen(
              offRef.current,
              analysis,
              effectiveFrom,
              to,
              ampToY,
            )
          }

          triggerDraw.current()
        })
      },

      patch(from, to) {
        const off = offRef.current
        if (!off) return
        paintColumnsToOffscreen(off, analysis, from, to, ampToY)
        triggerDraw.current()
      },
    }),
    [canvasHeight, analysis, ampToY],
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
