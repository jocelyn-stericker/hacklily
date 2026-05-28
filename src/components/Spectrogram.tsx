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

// Renders frequency spectrogram with color-mapped intensity and formant markers.

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk, AnalysisFrame } from '#/lib/AnalysisFrame'
import { frameDbMax, frameTimeSec, totalFrames } from '#/lib/AnalysisFrame'

import { INFERNO_COLOURMAP, WYOR_COLOURMAP } from './colourmap'
import { InCanvas, usePlotPad, usePlotSize, useTimeToX, useHzToY } from './Plot'
import { useColourScheme } from './useColourScheme'

const FPS_WINDOW_MS = 1000

// GPU canvas tiles: staying under browser width limits while streaming real-time spectral data.
// Each tile holds up to TILE_WIDTH frames before overflow to the next tile.
export const TILE_WIDTH = 4096

// Width of the shared scratch ImageData used by paintColumnsToOffscreen.
// Narrower than TILE_WIDTH so a single allocation serves all tiles without
// holding a full tile's worth of pixel data in memory.
const SCRATCH_WIDTH = 256

interface Theme {
  // Assumes little-endian byte order (all browser-targeted CPUs). Each entry is
  // the RGBA pixel packed as a Uint32: low byte = R, high byte = A.
  colourmap: Uint32Array
  bgU32: number
  bgStyle: string
}

function buildTheme(isDark: boolean): Theme {
  const colourmap = new Uint32Array(256)
  const map = isDark ? INFERNO_COLOURMAP : WYOR_COLOURMAP
  for (let i = 0; i < 256; i++) {
    const r = map[i * 3]!
    const g = map[i * 3 + 1]!
    const b = map[i * 3 + 2]!
    colourmap[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
  }
  return {
    colourmap,
    bgU32: (isDark ? 0xff000000 : 0xff21f9f0) >>> 0,
    bgStyle: isDark ? '#000000' : '#ffffff',
  }
}

const DARK_THEME = buildTheme(true)
const LIGHT_THEME = buildTheme(false)

const LN10_10 = 10 / Math.log(10)
const DB_MAX_DEFAULT = -16

function chunkDbMax(chunk: AnalysisChunk): number {
  let max = DB_MAX_DEFAULT
  for (const frame of chunk.frames) {
    max = Math.max(frameDbMax(frame) ?? max, max)
  }
  return max
}

export interface SpectrogramHandle {
  /** Call after appending frames [from, analysis.length) to the stored analysis. */
  append: (from: number) => void
  /** Call after mutating frames [from, to) of the stored analysis in-place. */
  patch: (from: number, to: number) => void
}

// Per-tile color data. Transposed layout: data[b * TILE_WIDTH + localF].
interface ColorTile {
  data: Uint32Array // numBins * TILE_WIDTH
}

// Per-chunk color data split into fixed-size tiles matching the canvas tile structure.
// Eliminates capacity doubling: each new tile is a fresh TILE_WIDTH-column allocation.
interface ChunkColorsState {
  chunk: AnalysisChunk
  colorTiles: ColorTile[]
  numFrames: number
  numBins: number
  dbMax: number
}

interface Tile {
  canvas: OffscreenCanvas
  ctx: OffscreenCanvasRenderingContext2D
  startFrame: number
}

interface OffscreenState {
  tiles: Tile[]
  binForY: Int32Array
  canvasHeight: number
  // Shared scratch buffer for paintColumnsToOffscreen — written then immediately
  // pushed via putImageData, never read back. One per OffscreenState so it
  // survives across calls without reallocating.
  scratchData: ImageData
  scratchU32: Uint32Array
}

interface FormantOffscreenState {
  tiles: Tile[]
  canvasHeight: number
}

interface DisplayBufState {
  buf: OffscreenCanvas
  ctx: OffscreenCanvasRenderingContext2D
  width: number
  height: number
  // Time in seconds at display pixel 0 (updated to account for integer rounding,
  // keeping rounding error bounded to ±0.5px across frames).
  lastSrcTimeSec: number
  lastDxPerSec: number
  lastTilesGen: number
  // True when updateDisplayBufForFrames has written to buf since the last blit.
  dirty: boolean
}

const FORMANT_TRACKS = [
  { key: 'f0' as const, color: '#ffffff' },
  { key: 'f1' as const, color: '#00e5ff' },
  { key: 'f2' as const, color: '#00e5ff' },
]

// Soft glow behind each formant line for contrast against both light and dark
// spectrogram regions. shadowBlur is a gaussian spread in device pixels.
const FORMANT_SHADOW_COLOUR = 'rgba(0,0,0,0.8)'
const FORMANT_SHADOW_BLUR = 5
const FORMANT_LINE_WIDTH = 1.5

function buildBinForY(
  numBins: number,
  firstBinHz: number,
  freqStepHz: number,
  freqToY: (hz: number) => number,
  canvasHeight: number,
): Int32Array {
  const freqToYArr = new Int32Array(numBins + 1)
  let fHz = firstBinHz - freqStepHz / 2
  for (let i = 0; i <= numBins; i++) {
    freqToYArr[i] = Math.round(freqToY(fHz))
    fHz += freqStepHz
  }
  const binForY = new Int32Array(canvasHeight).fill(-1)
  for (let b = 0; b < numBins; b++) {
    const yFrom = Math.max(0, freqToYArr[b + 1]!)
    const yTo = Math.min(canvasHeight - 1, freqToYArr[b]!)
    for (let y = yFrom; y <= yTo; y++) binForY[y] = b
  }
  return binForY
}

function computeColorsRange(
  state: ChunkColorsState,
  from: number,
  to: number,
  theme: Theme,
  dbRange: number,
): void {
  const { colorTiles, numBins, dbMax, chunk } = state
  for (let f = from; f < to; f++) {
    const spectrum = chunk.frames[f]!.spectrum
    const tileIdx = Math.floor(f / TILE_WIDTH)
    const localF = f - tileIdx * TILE_WIDTH
    const tileData = colorTiles[tileIdx]!.data
    for (let b = 0; b < numBins; b++) {
      const raw = spectrum[b]!
      const db = LN10_10 * Math.log(raw)
      const norm = Math.max(0, Math.min(1, (db - (dbMax - dbRange)) / dbRange))
      tileData[b * TILE_WIDTH + localF] =
        theme.colourmap[Math.round(norm * 255)]!
    }
  }
}

function ensureColorTiles(state: ChunkColorsState, needed: number): void {
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (state.colorTiles.length < numTiles) {
    state.colorTiles.push({ data: new Uint32Array(state.numBins * TILE_WIDTH) })
  }
}

function ensureTiles(
  off: { tiles: Tile[]; canvasHeight: number },
  needed: number,
  alpha = true,
  bgStyle?: string,
): void {
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (off.tiles.length < numTiles) {
    const startFrame = off.tiles.length * TILE_WIDTH
    const canvas = new OffscreenCanvas(TILE_WIDTH, off.canvasHeight)
    const ctx = canvas.getContext('2d', { alpha })!
    if (bgStyle) {
      ctx.fillStyle = bgStyle
      ctx.fillRect(0, 0, TILE_WIDTH, off.canvasHeight)
    }
    off.tiles.push({ canvas, ctx, startFrame })
  }
}

function paintColumnsToOffscreen(
  off: OffscreenState,
  colors: ChunkColorsState,
  from: number,
  to: number,
  theme: Theme,
): void {
  if (to <= from) return
  const { tiles, binForY, canvasHeight, scratchData, scratchU32 } = off
  const { colorTiles } = colors
  const firstTile = Math.floor(from / TILE_WIDTH)
  const lastTile = Math.floor((to - 1) / TILE_WIDTH)
  for (let t = firstTile; t <= lastTile && t < tiles.length; t++) {
    const tile = tiles[t]!
    const colorTile = colorTiles[t]!
    const localFrom = Math.max(from, tile.startFrame) - tile.startFrame
    const localTo = Math.min(to, tile.startFrame + TILE_WIDTH) - tile.startFrame
    for (
      let batchStart = localFrom;
      batchStart < localTo;
      batchStart += SCRATCH_WIDTH
    ) {
      const batchEnd = Math.min(localTo, batchStart + SCRATCH_WIDTH)
      const numBatchCols = batchEnd - batchStart
      for (let y = 0; y < canvasHeight; y++) {
        const b = binForY[y] ?? -1
        const dstBase = y * SCRATCH_WIDTH
        if (b < 0) {
          scratchU32.fill(theme.bgU32, dstBase, dstBase + numBatchCols)
        } else {
          scratchU32.set(
            colorTile.data.subarray(
              b * TILE_WIDTH + batchStart,
              b * TILE_WIDTH + batchEnd,
            ),
            dstBase,
          )
        }
      }
      tile.ctx.putImageData(
        scratchData,
        batchStart,
        0,
        0,
        0,
        numBatchCols,
        canvasHeight,
      )
    }
  }
}

// Repaint formant tiles from fromTile onward.
// fromFrame: first frame to repaint — pixels before it are left intact so we
//   can skip redrawing historical frames that haven't changed.
// toFrame: exclusive upper bound — frames at or after this index are not
//   touched, letting the caller handle them via appendFormantTiles.
// frames: the chunk-local frames array.
function paintFormantTiles(
  off: FormantOffscreenState,
  frames: AnalysisFrame[],
  fromTile: number,
  freqToY: (hz: number) => number,
  dpr: number,
  fromFrame = 0,
  toFrame = Infinity,
): void {
  const numFrames = Math.min(frames.length, toFrame)
  for (let t = fromTile; t < off.tiles.length; t++) {
    const tile = off.tiles[t]!
    const frameEnd = Math.min(numFrames, tile.startFrame + TILE_WIDTH)
    if (frameEnd <= tile.startFrame) break
    // For the first tile, skip frames before fromFrame and preserve their
    // pixels. For subsequent tiles, repaint from the tile edge as usual.
    const tileFromFrame = Math.max(tile.startFrame, fromFrame)
    const clearX = tileFromFrame - tile.startFrame
    tile.ctx.clearRect(
      clearX,
      0,
      frameEnd - tile.startFrame - clearX,
      off.canvasHeight,
    )
    for (const { key, color } of FORMANT_TRACKS) {
      const r = FORMANT_LINE_WIDTH * dpr
      tile.ctx.beginPath()
      for (let f = tileFromFrame; f < frameEnd; f++) {
        const sample = frames[f]!
        if (
          !(sample.pitchDetected && sample.speechDetected) ||
          sample[key] === null
        )
          continue
        const x = f - tile.startFrame + 0.5
        const y = freqToY(sample[key])
        tile.ctx.moveTo(x + r, y)
        tile.ctx.arc(x, y, r, 0, Math.PI * 2)
      }
      tile.ctx.shadowColor = FORMANT_SHADOW_COLOUR
      tile.ctx.shadowBlur = FORMANT_SHADOW_BLUR * dpr
      tile.ctx.fillStyle = color
      tile.ctx.fill()
      tile.ctx.shadowBlur = 0
    }
  }
}

// Additive paint of new frames [from, to) onto existing tile content.
// Does NOT clear tiles, so cost is O(to - from), not O(tile frames). Used by append.
// frames: the chunk-local frames array.
function appendFormantTiles(
  off: FormantOffscreenState,
  frames: AnalysisFrame[],
  from: number,
  to: number,
  freqToY: (hz: number) => number,
  dpr: number,
): void {
  if (to <= from) return
  const firstTile = Math.floor(from / TILE_WIDTH)
  const lastTile = Math.floor((to - 1) / TILE_WIDTH)
  for (let t = firstTile; t <= lastTile && t < off.tiles.length; t++) {
    const tile = off.tiles[t]!
    const absFrom = Math.max(from, tile.startFrame)
    const absTo = Math.min(to, tile.startFrame + TILE_WIDTH)
    for (const { key, color } of FORMANT_TRACKS) {
      const r = FORMANT_LINE_WIDTH * dpr
      tile.ctx.beginPath()
      for (let f = absFrom; f < absTo; f++) {
        const sample = frames[f]!
        if (
          !(sample.pitchDetected && sample.speechDetected) ||
          sample[key] === null
        )
          continue
        const x = f - tile.startFrame + 0.5
        const y = freqToY(sample[key])
        tile.ctx.moveTo(x + r, y)
        tile.ctx.arc(x, y, r, 0, Math.PI * 2)
      }
      tile.ctx.shadowColor = FORMANT_SHADOW_COLOUR
      tile.ctx.shadowBlur = FORMANT_SHADOW_BLUR * dpr
      tile.ctx.fillStyle = color
      tile.ctx.fill()
      tile.ctx.shadowBlur = 0
    }
  }
}

// Maps a global frame range [globalFrom, globalTo) to per-chunk local ranges.
function globalRangeToChunkRanges(
  analysis: AnalysisChunk[],
  globalFrom: number,
  globalTo: number,
): Array<{ chunkIdx: number; localFrom: number; localTo: number }> {
  const result: Array<{
    chunkIdx: number
    localFrom: number
    localTo: number
  }> = []
  let offset = 0
  for (let i = 0; i < analysis.length; i++) {
    const chunk = analysis[i]!
    const chunkEnd = offset + chunk.frames.length
    if (globalFrom < chunkEnd && globalTo > offset) {
      const localFrom = Math.max(0, globalFrom - offset)
      const localTo = Math.min(chunk.frames.length, globalTo - offset)
      if (localFrom < localTo) {
        result.push({ chunkIdx: i, localFrom, localTo })
      }
    }
    offset = chunkEnd
  }
  return result
}

function blitTiles(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  tiles: Tile[],
  canvasHeight: number,
  srcX0: number,
  srcW: number,
  dxPerFrame: number,
  displayHeight: number,
): void {
  for (const tile of tiles) {
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
      canvasHeight,
      destX,
      0,
      destW,
      displayHeight,
    )
  }
}

// Blit all per-chunk spectrogram and formant tiles into ctx.
// srcTimeSec: time at display pixel 0.
// srcWidthSec: time span of the display.
function blitChunks(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  offs: (OffscreenState | null)[],
  formantOffs: (FormantOffscreenState | null)[],
  analysis: AnalysisChunk[],
  srcTimeSec: number,
  srcWidthSec: number,
  dxPerSec: number,
  displayHeight: number,
): void {
  for (let i = 0; i < offs.length; i++) {
    const off = offs[i]
    const chunk = analysis[i]
    if (!off || !chunk) continue
    const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
    const dxPerFrame = dxPerSec * timeStepSec
    if (dxPerFrame <= 0) continue
    // chunkSrcX0: the (possibly fractional) chunk-local frame index at display pixel 0.
    const chunkSrcX0 = (srcTimeSec - chunk.startTimeSec) / timeStepSec
    const chunkSrcW = srcWidthSec / timeStepSec
    blitTiles(
      ctx,
      off.tiles,
      off.canvasHeight,
      chunkSrcX0,
      chunkSrcW,
      dxPerFrame,
      displayHeight,
    )
    const formantOff = formantOffs[i]
    if (formantOff) {
      blitTiles(
        ctx,
        formantOff.tiles,
        formantOff.canvasHeight,
        chunkSrcX0,
        chunkSrcW,
        dxPerFrame,
        displayHeight,
      )
    }
  }
}

// Paint frames in [fromTimeSec, toTimeSec) into the display buffer without a full repaint.
// Used by append so newly arrived frames appear immediately even if the view is stationary.
// fromTimeSec should be frameTimeSec(analysis, effectiveFrom - 1) to include the moveTo anchor.
function updateDisplayBufForFrames(
  db: DisplayBufState | null,
  offs: (OffscreenState | null)[],
  formantOffs: (FormantOffscreenState | null)[],
  analysis: AnalysisChunk[],
  fromTimeSec: number,
  toTimeSec: number,
  theme: Theme,
): void {
  if (!db || isNaN(db.lastSrcTimeSec) || isNaN(db.lastDxPerSec)) return
  const { lastSrcTimeSec, lastDxPerSec, width, height } = db
  const x1 = Math.max(
    0,
    Math.floor((fromTimeSec - lastSrcTimeSec) * lastDxPerSec) - 1,
  )
  const x2 = Math.min(
    width,
    Math.ceil((toTimeSec - lastSrcTimeSec) * lastDxPerSec) + 1,
  )
  if (x1 >= x2) return
  db.dirty = true
  const stripSrcTimeSec = lastSrcTimeSec + x1 / lastDxPerSec
  const stripWidthSec = (x2 - x1) / lastDxPerSec
  db.ctx.fillStyle = theme.bgStyle
  db.ctx.fillRect(x1, 0, x2 - x1, height)
  db.ctx.save()
  db.ctx.translate(x1, 0)
  blitChunks(
    db.ctx,
    offs,
    formantOffs,
    analysis,
    stripSrcTimeSec,
    stripWidthSec,
    lastDxPerSec,
    height,
  )
  db.ctx.restore()
}

function draw(
  mainCtx: CanvasRenderingContext2D,
  displayBufRef: { current: DisplayBufState | null },
  tilesGen: number,
  width: number,
  height: number,
  offs: (OffscreenState | null)[],
  formantOffs: (FormantOffscreenState | null)[],
  analysis: AnalysisChunk[],
  timeToX: (timeSec: number) => number,
  theme: Theme,
): void {
  if (offs.length === 0) {
    mainCtx.fillStyle = theme.bgStyle
    mainCtx.fillRect(0, 0, width, height)
    return
  }

  // timeToX is linear so dxPerSec is uniform across all chunks.
  const dxPerSec = timeToX(1) - timeToX(0)
  if (dxPerSec <= 0) {
    mainCtx.fillStyle = theme.bgStyle
    mainCtx.fillRect(0, 0, width, height)
    return
  }
  const srcTimeSec = -timeToX(0) / dxPerSec
  const srcWidthSec = width / dxPerSec

  // Ensure display buffer matches current canvas dimensions.
  let db = displayBufRef.current
  if (!db || db.width !== width || db.height !== height) {
    const buf = new OffscreenCanvas(width, height)
    const ctx = buf.getContext('2d', { alpha: false })!
    ctx.imageSmoothingEnabled = false
    db = {
      buf,
      ctx,
      width,
      height,
      lastSrcTimeSec: NaN,
      lastDxPerSec: NaN,
      lastTilesGen: -1,
      dirty: false,
    }
    displayBufRef.current = db
  }

  const sameTiles = db.lastTilesGen === tilesGen
  const sameDx =
    !isNaN(db.lastDxPerSec) && Math.abs(db.lastDxPerSec - dxPerSec) < 1e-6
  const pixelShift =
    sameTiles && sameDx && !isNaN(db.lastSrcTimeSec)
      ? Math.round((db.lastSrcTimeSec - srcTimeSec) * dxPerSec)
      : NaN
  const canIncremental = !isNaN(pixelShift) && Math.abs(pixelShift) < width

  if (!canIncremental) {
    // Full repaint: composite all chunk layers into the display buffer.
    db.ctx.fillStyle = theme.bgStyle
    db.ctx.fillRect(0, 0, width, height)
    blitChunks(
      db.ctx,
      offs,
      formantOffs,
      analysis,
      srcTimeSec,
      srcWidthSec,
      dxPerSec,
      height,
    )
    db.lastSrcTimeSec = srcTimeSec
    db.lastDxPerSec = dxPerSec
    db.lastTilesGen = tilesGen
  } else if (pixelShift !== 0) {
    // Incremental scroll: shift existing content and paint only the newly revealed strip.
    // The self-copy is spec-required to snapshot before writing (no aliasing).
    db.ctx.drawImage(db.buf, pixelShift, 0)
    // Track actual buffer position so rounding error stays bounded to ±0.5px per frame.
    db.lastSrcTimeSec -= pixelShift / dxPerSec

    const stripX = pixelShift < 0 ? width + pixelShift : 0
    const stripW = Math.abs(pixelShift)
    const stripSrcTimeSec = srcTimeSec + stripX / dxPerSec
    const stripWidthSec = stripW / dxPerSec

    db.ctx.fillStyle = theme.bgStyle
    db.ctx.fillRect(stripX, 0, stripW, height)
    // Translate so blitChunks can use its normal coord logic
    // (place time stripSrcTimeSec at pixel 0) and our translate shifts that to stripX.
    db.ctx.save()
    db.ctx.translate(stripX, 0)
    blitChunks(
      db.ctx,
      offs,
      formantOffs,
      analysis,
      stripSrcTimeSec,
      stripWidthSec,
      dxPerSec,
      height,
    )
    db.ctx.restore()
  }
  // pixelShift === 0: skip the blit unless updateDisplayBufForFrames wrote new content.
  if (!canIncremental || pixelShift !== 0 || db.dirty) {
    mainCtx.drawImage(db.buf, 0, 0)
    db.dirty = false
  }
}

export function Spectrogram({
  analysis,
  dbRange,
  ref,
  debug = false,
}: {
  analysis: AnalysisChunk[]
  dbRange: number
  ref: RefObject<SpectrogramHandle | null>
  debug?: boolean
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const plotPad = usePlotPad()
  const { width, height, dpr } = usePlotSize()
  const timeToX = useTimeToX(InCanvas.Yes)
  const freqToY = useHzToY(InCanvas.Yes)
  const canvasWidth = (width - plotPad.left - plotPad.right) * dpr
  const canvasHeight = (height - plotPad.top - plotPad.bottom) * dpr

  const scheme = useColourScheme()
  const theme = scheme === 'dark' ? DARK_THEME : LIGHT_THEME

  const allColorsRef = useRef<ChunkColorsState[]>([])
  const allOffRef = useRef<(OffscreenState | null)[]>([])
  const allFormantOffRef = useRef<(FormantOffscreenState | null)[]>([])
  const displayBufRef = useRef<DisplayBufState | null>(null)
  const tilesGenRef = useRef(0)

  // For actually rendering the offscreen buffer(s) to the screen
  const animationFrame = useRef<number | null>(null)
  const triggerDraw = useRef(() => {})

  const fpsFrameTimesRef = useRef<number[]>([])
  const [fps, setFps] = useState(0)

  useEffect(() => {
    if (debug) {
      const id = setInterval(() => {
        const now = performance.now()
        const times = fpsFrameTimesRef.current
        while (times.length > 0 && now - times[0]! > FPS_WINDOW_MS)
          times.shift()
        setFps(times.length)
      }, 500)
      return () => clearInterval(id)
    }
  }, [debug])

  // Fully recompute colors for all chunks when analysis reference changes (import).
  useEffect(() => {
    if (analysis.length === 0) {
      allColorsRef.current = []
      allOffRef.current = []
      allFormantOffRef.current = []
      return
    }
    const newColors: ChunkColorsState[] = []
    for (const chunk of analysis) {
      const numFrames = chunk.frames.length
      const numBins = chunk.frames[0]!.spectrum.length
      const maxDb = chunkDbMax(chunk)
      const colors: ChunkColorsState = {
        chunk,
        colorTiles: [],
        numFrames,
        numBins,
        dbMax: maxDb,
      }
      ensureColorTiles(colors, numFrames)
      computeColorsRange(colors, 0, numFrames, theme, dbRange)
      newColors.push(colors)
    }
    allColorsRef.current = newColors
  }, [analysis, dbRange, theme])

  // ---- FALLS THROUGH TO NEXT EFFECT ----

  // When freq scale, canvas height, or dpr changes, rebuild tile canvases.
  useEffect(() => {
    const allColors = allColorsRef.current
    if (allColors.length === 0 || canvasHeight <= 0) return

    const newOff: (OffscreenState | null)[] = []
    const newFormantOff: (FormantOffscreenState | null)[] = []

    for (const colors of allColors) {
      const { chunk } = colors

      const binForY = buildBinForY(
        colors.numBins,
        chunk.firstBinHz,
        chunk.freqStepHz,
        freqToY,
        canvasHeight,
      )
      const scratchData = new ImageData(SCRATCH_WIDTH, canvasHeight)
      const off: OffscreenState = {
        tiles: [],
        binForY,
        canvasHeight,
        scratchData,
        scratchU32: new Uint32Array(scratchData.data.buffer),
      }
      ensureTiles(off, colors.numFrames, false, theme.bgStyle)
      newOff.push(off)
      paintColumnsToOffscreen(off, colors, 0, colors.numFrames, theme)

      const formantOff: FormantOffscreenState = { tiles: [], canvasHeight }
      ensureTiles(formantOff, colors.numFrames)
      newFormantOff.push(formantOff)
      paintFormantTiles(formantOff, chunk.frames, 0, freqToY, dpr)
    }

    allOffRef.current = newOff
    allFormantOffRef.current = newFormantOff
    tilesGenRef.current += 1

    // Note: this must include everything in the previous effect
  }, [analysis, dbRange, canvasHeight, freqToY, dpr, theme])

  const fromRef = useRef<number | null>(null)
  // Infinity = "to totalFrames" (append pending); explicit number = max patch to
  const pendingToRef = useRef<number>(0)
  const drawFrame = useRef<number | null>(null)

  // ---- FALLS THROUGH TO NEXT EFFECT ----

  useEffect(() => {
    if (!canvas) return

    // Hoist getContext so it isn't re-called on every animation frame.
    const ctx = canvas.getContext('2d', { alpha: false })!
    ctx.imageSmoothingEnabled = false

    triggerDraw.current = () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }

      animationFrame.current = requestAnimationFrame(() => {
        // Resize the canvas element if needed (resets its drawing state).
        if (canvas.width !== canvasWidth) canvas.width = canvasWidth
        if (canvas.height !== canvasHeight) canvas.height = canvasHeight
        draw(
          ctx,
          displayBufRef,
          tilesGenRef.current,
          canvasWidth,
          canvasHeight,
          allOffRef.current,
          allFormantOffRef.current,
          analysis,
          timeToX,
          theme,
        )
        if (debug) {
          fpsFrameTimesRef.current.push(performance.now())
        }
      })
    }

    triggerDraw.current()

    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
      if (drawFrame.current !== null) cancelAnimationFrame(drawFrame.current)
      drawFrame.current = null
      animationFrame.current = null
    }
    // Note: this must include everything in the previous effect
  }, [
    analysis,
    dbRange,
    canvasHeight,
    freqToY,
    dpr,
    canvas,
    canvasWidth,
    timeToX,
    debug,
    theme,
  ])

  useImperativeHandle(ref, () => {
    function handleFrame() {
      drawFrame.current = null
      const effectiveFrom = fromRef.current!
      const pendingTo = pendingToRef.current // Infinity = append, number = patch to
      fromRef.current = null
      pendingToRef.current = 0

      const allColors = allColorsRef.current
      const allOff = allOffRef.current
      const allFormantOff = allFormantOffRef.current

      // Lazily grow per-chunk state for any new chunks that have received frames.
      while (allColors.length < analysis.length) {
        const i = allColors.length
        const chunk = analysis[i]!
        if (!chunk.frames[0]) break // no frames yet, can't determine numBins
        const numBins = chunk.frames[0].spectrum.length
        const colors: ChunkColorsState = {
          chunk,
          colorTiles: [],
          numFrames: 0,
          numBins,
          dbMax: DB_MAX_DEFAULT,
        }
        allColors.push(colors)
        allOff.push(null)
        allFormantOff.push(null)
      }

      if (allColors.length === 0) return

      const globalTotal =
        pendingTo === Infinity ? totalFrames(analysis) : pendingTo
      const ranges = globalRangeToChunkRanges(
        analysis,
        effectiveFrom,
        globalTotal,
      )
      if (ranges.length === 0) return

      let needFullRedraw = false

      for (const { chunkIdx, localFrom, localTo } of ranges) {
        const colors = allColors[chunkIdx]
        if (!colors) continue
        const chunk = analysis[chunkIdx]!

        const prevNumFrames = colors.numFrames
        const isExtending = localTo > prevNumFrames

        // Scan newly appended frames for a new peak (monotonic — old frames
        // already contributed to dbMax). Also scan any patched existing frames.
        let fullChunkRecolor = false
        if (isExtending) {
          for (let f = prevNumFrames; f < localTo; f++) {
            const frameMax = frameDbMax(chunk.frames[f]!)
            if (frameMax !== null && frameMax > colors.dbMax) {
              colors.dbMax = frameMax
              fullChunkRecolor = true
            }
          }
        }
        for (let f = localFrom; f < Math.min(localTo, prevNumFrames); f++) {
          const frameMax = frameDbMax(chunk.frames[f]!)
          if (frameMax !== null && frameMax > colors.dbMax) {
            colors.dbMax = frameMax
            fullChunkRecolor = true
          }
        }

        if (isExtending) ensureColorTiles(colors, localTo)

        computeColorsRange(
          colors,
          fullChunkRecolor ? 0 : localFrom,
          localTo,
          theme,
          dbRange,
        )
        if (isExtending) colors.numFrames = localTo

        let off = allOff[chunkIdx] ?? null
        let formantOff = allFormantOff[chunkIdx] ?? null

        if (!off && canvasHeight > 0) {
          // First time this chunk has tiles — create from scratch.
          const binForY = buildBinForY(
            colors.numBins,
            chunk.firstBinHz,
            chunk.freqStepHz,
            freqToY,
            canvasHeight,
          )
          const scratchData = new ImageData(SCRATCH_WIDTH, canvasHeight)
          off = {
            tiles: [],
            binForY,
            canvasHeight,
            scratchData,
            scratchU32: new Uint32Array(scratchData.data.buffer),
          }
          ensureTiles(off, localTo, false, theme.bgStyle)
          allOff[chunkIdx] = off
          paintColumnsToOffscreen(off, colors, 0, localTo, theme)

          formantOff = { tiles: [], canvasHeight }
          ensureTiles(formantOff, localTo)
          allFormantOff[chunkIdx] = formantOff
          paintFormantTiles(formantOff, chunk.frames, 0, freqToY, dpr)
          needFullRedraw = true
        } else if (off) {
          if (isExtending) ensureTiles(off, localTo, false, theme.bgStyle)
          paintColumnsToOffscreen(
            off,
            colors,
            fullChunkRecolor ? 0 : localFrom,
            localTo,
            theme,
          )
          if (fullChunkRecolor) needFullRedraw = true

          if (!formantOff) {
            formantOff = { tiles: [], canvasHeight }
            ensureTiles(formantOff, localTo)
            allFormantOff[chunkIdx] = formantOff
            paintFormantTiles(formantOff, chunk.frames, 0, freqToY, dpr)
            // formantOff newly created: full repaint needed to show historical lines.
            needFullRedraw = true
          } else {
            if (isExtending) ensureTiles(formantOff, localTo)

            if (isExtending && localFrom >= prevNumFrames) {
              // Pure append: additive paint, then update display buffer for new region.
              appendFormantTiles(
                formantOff,
                chunk.frames,
                localFrom,
                localTo,
                freqToY,
                dpr,
              )
              // fromTimeSec goes one frame back so the moveTo anchor is included in the strip.
              const fromTimeSec = frameTimeSec(analysis, effectiveFrom - 1)
              const toTimeSec =
                chunk.startTimeSec +
                localTo * (chunk.timeStepSamples / chunk.sampleRate)
              updateDisplayBufForFrames(
                displayBufRef.current,
                allOff,
                allFormantOff,
                analysis,
                fromTimeSec,
                toTimeSec,
                theme,
              )
            } else {
              // Patch or mixed: repaint only the affected range, then append any
              // new frames separately so we skip redrawing unchanged history.
              paintFormantTiles(
                formantOff,
                chunk.frames,
                Math.floor(localFrom / TILE_WIDTH),
                freqToY,
                dpr,
                localFrom,
                isExtending ? prevNumFrames : undefined,
              )
              if (isExtending) {
                appendFormantTiles(
                  formantOff,
                  chunk.frames,
                  prevNumFrames,
                  localTo,
                  freqToY,
                  dpr,
                )
              }
              needFullRedraw = true
            }
          }
        }
      }

      if (needFullRedraw) tilesGenRef.current += 1
      triggerDraw.current()
    }

    return {
      append(from) {
        fromRef.current = Math.min(from, fromRef.current ?? Infinity)
        pendingToRef.current = Infinity // sentinel: resolve to totalFrames at execution
        if (drawFrame.current !== null) return
        drawFrame.current = requestAnimationFrame(handleFrame)
      },

      patch(from, to) {
        fromRef.current = Math.min(from, fromRef.current ?? Infinity)
        // Math.max(to, Infinity) = Infinity, so a pending append keeps priority
        pendingToRef.current = Math.max(to, pendingToRef.current)
        if (drawFrame.current !== null) return
        drawFrame.current = requestAnimationFrame(handleFrame)
      },
    }
  }, [canvasHeight, analysis, freqToY, dbRange, dpr, theme])

  return (
    <>
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
      {debug ? (
        <div
          className="absolute"
          style={{
            left: plotPad.left + 6,
            top: plotPad.top + 6,
            color: 'white',
            fontSize: 11,
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.55)',
            padding: '1px 5px',
            borderRadius: 3,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {fps} fps
        </div>
      ) : null}
    </>
  )
}
