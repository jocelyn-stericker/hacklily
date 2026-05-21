// Renders waveform visualization from analysis frames with configurable amplitude scaling.

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/AnalysisFrame'
import { getFrame, totalFrames } from '#/lib/AnalysisFrame'
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
  imgData: ImageData
  u32: Uint32Array
}

interface OffscreenState {
  tiles: Tile[]
  canvasHeight: number
  numFrames: number
}

function ensureTiles(off: OffscreenState, needed: number): void {
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (off.tiles.length < numTiles) {
    const startFrame = off.tiles.length * TILE_WIDTH
    const canvas = new OffscreenCanvas(TILE_WIDTH, off.canvasHeight)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const imgData = ctx.createImageData(TILE_WIDTH, off.canvasHeight)
    const u32 = new Uint32Array(imgData.data.buffer)
    off.tiles.push({ canvas, ctx, startFrame, imgData, u32 })
  }
}

// Assumes little-endian byte order (all browser-targeted CPUs). Each value is
// the RGBA pixel packed as a Uint32: low byte = R, high byte = A.
const SPEECH_U32 = ((209 << 24) | (196 << 16) | (205 << 8) | 78) >>> 0 // rgba(78,205,196,0.82)
const SILENCE_U32 = ((140 << 24) | (140 << 16) | (100 << 8) | 100) >>> 0 // rgba(100,100,140,0.55)

function paintColumnsToOffscreen(
  off: OffscreenState,
  analysis: AnalysisChunk[],
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
    const numCols = absTo - absFrom
    const localFrom = absFrom - tile.startFrame
    const { imgData, u32 } = tile
    for (let f = absFrom; f < absTo; f++) {
      const localX = f - tile.startFrame
      const sample = getFrame(analysis, f)!
      const y0 = Math.max(
        0,
        Math.min(canvasHeight, Math.round(ampToY(-sample.rms))),
      )
      const y1 = Math.max(
        0,
        Math.min(canvasHeight, Math.round(ampToY(sample.rms))),
      )
      const color = sample.speechDetected ? SPEECH_U32 : SILENCE_U32
      for (let y = 0; y < canvasHeight; y++) {
        u32[y * TILE_WIDTH + localX] = y >= y0 && y < y1 ? color : 0
      }
    }
    tile.ctx.putImageData(imgData, 0, 0, localFrom, 0, numCols, canvasHeight)
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
  analysis: AnalysisChunk[]
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
  const pendingToRef = useRef<number>(0)
  const patchToRef = useRef<number>(0)
  const drawFrame = useRef<number | null>(null)

  useEffect(() => {
    if (analysis.length === 0) {
      offRef.current = null
      return
    }
    const numFrames = totalFrames(analysis)
    const off: OffscreenState = { tiles: [], canvasHeight, numFrames }
    ensureTiles(off, numFrames)
    offRef.current = off
    paintColumnsToOffscreen(off, analysis, 0, numFrames, ampToY)
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
            : 0, // assumes uniform params across chunks
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

  useImperativeHandle(ref, () => {
    function handleFrame() {
      drawFrame.current = null
      const effectiveFrom = fromRef.current!
      const pendingTo = pendingToRef.current
      const patchTo = patchToRef.current
      fromRef.current = null
      pendingToRef.current = 0
      patchToRef.current = 0

      if (!offRef.current && canvasHeight > 0) {
        if (pendingTo !== Infinity) return
        const to = totalFrames(analysis)
        const off: OffscreenState = { tiles: [], canvasHeight, numFrames: to }
        ensureTiles(off, to)
        offRef.current = off
        paintColumnsToOffscreen(off, analysis, 0, to, ampToY)
      } else if (offRef.current) {
        const off = offRef.current
        if (pendingTo === Infinity) {
          const prevNumFrames = off.numFrames
          const to = totalFrames(analysis)
          ensureTiles(off, to)
          // Paint patched range [effectiveFrom, patchTo) and new frames [prevNumFrames, to)
          // separately to skip the unchanged gap [patchTo, prevNumFrames).
          paintColumnsToOffscreen(off, analysis, effectiveFrom, patchTo, ampToY)
          paintColumnsToOffscreen(off, analysis, prevNumFrames, to, ampToY)
          off.numFrames = to
        } else {
          if (effectiveFrom < pendingTo) {
            paintColumnsToOffscreen(
              off,
              analysis,
              effectiveFrom,
              pendingTo,
              ampToY,
            )
          }
        }
      }

      triggerDraw.current()
    }

    return {
      append(from) {
        fromRef.current = Math.min(from, fromRef.current ?? Infinity)
        pendingToRef.current = Infinity
        if (drawFrame.current !== null) return
        drawFrame.current = requestAnimationFrame(handleFrame)
      },

      patch(from, to) {
        fromRef.current = Math.min(from, fromRef.current ?? Infinity)
        // Math.max(to, Infinity) = Infinity, so a pending append keeps priority
        pendingToRef.current = Math.max(to, pendingToRef.current)
        patchToRef.current = Math.max(to, patchToRef.current)
        if (drawFrame.current !== null) return
        drawFrame.current = requestAnimationFrame(handleFrame)
      },
    }
  }, [canvasHeight, analysis, ampToY])

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
