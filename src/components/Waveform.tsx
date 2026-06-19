// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Renders waveform visualization from analysis frames with configurable amplitude scaling.

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { getFrame, totalFrames } from '#/lib/analysis/AnalysisFrame'
import { registerMemSource } from '#/lib/memProbe'
import { SPEECH_U32, UNVOICED_U32 } from '#/lib/theme'

import {
  useAmpToY,
  InCanvas,
  usePlotPad,
  usePlotSize,
  useTimeToX,
} from './Plot'
import { useColourScheme } from './useColourScheme'

// GPU canvas tiles: staying under browser width limits while streaming real-time spectral data.
// Each tile holds up to TILE_WIDTH frames before overflow to the next tile.
export const TILE_WIDTH = 4096

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
  numFrames: number
  // Shared write-only scratch for paintColumnsToOffscreen — one tile-wide
  // ImageData reused across all tiles, never read back, so it doesn't need to
  // be retained per tile.
  scratch: ImageData
  scratchU32: Uint32Array
}

function makeOffscreenState(
  canvasHeight: number,
  numFrames: number,
): OffscreenState {
  const scratch = new ImageData(TILE_WIDTH, canvasHeight)
  return {
    tiles: [],
    canvasHeight,
    numFrames,
    scratch,
    scratchU32: new Uint32Array(scratch.data.buffer),
  }
}

function ensureTiles(
  off: OffscreenState,
  needed: number,
  bgStyle: string,
): void {
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (off.tiles.length < numTiles) {
    const startFrame = off.tiles.length * TILE_WIDTH
    const canvas = new OffscreenCanvas(TILE_WIDTH, off.canvasHeight)
    const ctx = canvas.getContext('2d', { alpha: false })!
    ctx.imageSmoothingEnabled = false
    if (bgStyle) {
      ctx.fillStyle = bgStyle
      ctx.fillRect(0, 0, TILE_WIDTH, off.canvasHeight)
    }
    off.tiles.push({ canvas, ctx, startFrame })
  }
}

function paintColumnsToOffscreen(
  off: OffscreenState,
  analysis: AnalysisChunk[],
  from: number,
  to: number,
  ampToY: (amp: number) => number,
  bgColor: string,
): void {
  const bgU32 = parseInt(bgColor.replace('#', '').padEnd(8, 'ff'), 16)
  if (to <= from) return
  const { tiles, canvasHeight, scratch: imgData, scratchU32: u32 } = off
  const firstTile = Math.floor(from / TILE_WIDTH)
  const lastTile = Math.floor((to - 1) / TILE_WIDTH)
  for (let t = firstTile; t <= lastTile && t < tiles.length; t++) {
    const tile = tiles[t]!
    const absFrom = Math.max(from, tile.startFrame)
    const absTo = Math.min(to, tile.startFrame + TILE_WIDTH)
    const numCols = absTo - absFrom
    const localFrom = absFrom - tile.startFrame
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
      const color = sample.speechDetected ? SPEECH_U32 : UNVOICED_U32
      for (let y = 0; y < canvasHeight; y++) {
        u32[y * TILE_WIDTH + localX] = y >= y0 && y < y1 ? color : bgU32
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
  bgStyle: string,
): void {
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })!
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = bgStyle
  ctx.fillRect(0, 0, width, height)

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

  const offRef = useRef<OffscreenState | null>(null)
  const animationFrame = useRef<number | null>(null)
  const triggerDraw = useRef(() => {})
  const fromRef = useRef<number | null>(null)
  const pendingToRef = useRef<number>(0)
  const patchToRef = useRef<number>(0)
  const drawFrame = useRef<number | null>(null)

  const scheme = useColourScheme()
  const bgColor = scheme === 'dark' ? '#000000' : '#ffffff'

  // Dev-only: report retained tile memory to the probe.
  useEffect(() => {
    return registerMemSource('waveform', 'Waveform retained tiles', () => {
      const off = offRef.current
      if (!off) {
        return { tiles: 0, canvasBytes: 0, imgDataBytes: 0 }
      }
      let canvasBytes = 0
      for (const t of off.tiles) {
        canvasBytes += t.canvas.width * t.canvas.height * 4
      }
      return {
        tiles: off.tiles.length,
        canvasBytes,
        // One shared scratch buffer (was previously retained per tile).
        imgDataBytes: off.scratch.data.byteLength,
      }
    })
  }, [])

  useEffect(() => {
    if (analysisMut.length === 0) {
      offRef.current = null
      return
    }
    const numFrames = totalFrames(analysisMut)
    const off = makeOffscreenState(canvasHeight, numFrames)
    ensureTiles(off, numFrames, bgColor)
    offRef.current = off
    paintColumnsToOffscreen(off, analysisMut, 0, numFrames, ampToY, bgColor)
    // Note: this must include everything in the previous effect (none here)
  }, [analysisMut, canvasHeight, ampToY, bgColor])

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
          analysisMut[0]
            ? analysisMut[0].timeStepSamples / analysisMut[0].sampleRate
            : 0, // assumes uniform params across chunks
          bgColor,
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
  }, [analysisMut, canvasHeight, ampToY, canvas, canvasWidth, timeToX, bgColor])

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
        const to = totalFrames(analysisMut)
        const off = makeOffscreenState(canvasHeight, to)
        ensureTiles(off, to, bgColor)
        offRef.current = off
        paintColumnsToOffscreen(off, analysisMut, 0, to, ampToY, bgColor)
      } else if (offRef.current) {
        const off = offRef.current
        if (pendingTo === Infinity) {
          const prevNumFrames = off.numFrames
          const to = totalFrames(analysisMut)
          ensureTiles(off, to, bgColor)
          // Paint patched range [effectiveFrom, patchTo) and new frames [prevNumFrames, to)
          // separately to skip the unchanged gap [patchTo, prevNumFrames).
          paintColumnsToOffscreen(
            off,
            analysisMut,
            effectiveFrom,
            patchTo,
            ampToY,
            bgColor,
          )
          paintColumnsToOffscreen(
            off,
            analysisMut,
            prevNumFrames,
            to,
            ampToY,
            bgColor,
          )
          off.numFrames = to
        } else {
          if (effectiveFrom < pendingTo) {
            paintColumnsToOffscreen(
              off,
              analysisMut,
              effectiveFrom,
              pendingTo,
              ampToY,
              bgColor,
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
  }, [canvasHeight, analysisMut, ampToY, bgColor])

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
