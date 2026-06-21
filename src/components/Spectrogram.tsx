// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Renders the frequency spectrogram with color-mapped intensity and formant markers.

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk, AnalysisFrame } from '#/lib/analysis/AnalysisFrame'
import { frameDbMax, int8ToDb, totalFrames } from '#/lib/analysis/AnalysisFrame'
import { registerMemSource } from '#/lib/memProbe'
import {
  SPECTROGRAM_DARK_THEME,
  SPECTROGRAM_LIGHT_THEME,
  FORMANT_TRACKS,
  FORMANT_SHADOW_COLOUR,
  FORMANT_SHADOW_BLUR,
  FORMANT_LINE_WIDTH,
} from '#/lib/theme'
import type { SpectrogramTheme } from '#/lib/theme'

import { InCanvas, usePlotPad, usePlotSize, useTimeToX, useHzToY } from './Plot'
import { useColourScheme } from './useColourScheme'

const FPS_WINDOW_MS = 1000

// GPU canvas tiles; each holds up to TILE_WIDTH source frames.
export const TILE_WIDTH = 256

// Scratch ImageData for the column paint path; one allocation serves all tiles
// (tile widths shrink with the level of detail, never exceeding TILE_WIDTH).
const SCRATCH_WIDTH = 256

// Budget for materialized spec + formant canvas tiles (combined). Off-screen
// tiles are evicted and re-rendered on demand from the retained level data
// (spec) and analysis frames (formants), which together cost far less than the
// rendered canvases. Sized to comfortably hold a couple of viewport-widths of
// both layers so scrolling reuses cached tiles instead of thrashing. See
// docs/memory-improvements.md item 1.
const MAX_TILE_CANVAS_BYTES = 48 * 1024 * 1024

// Coarsest level of detail: each canvas column reduces 2^MAX_LOD source frames.
// 6 → 64 frames/col, ample for the ~90 s fully-zoomed-out span. See item 1c.
const MAX_LOD = 6

// Formant arcs become connected lines once a column spans 2^FORMANT_LINE_LOD
// frames; below that, sub-pixel dots merge and track peaks vanish into the smear.
const FORMANT_LINE_LOD = 2

// LOD hysteresis: keep the current lod while dxPerCol (display px per canvas
// column) stays in this band, so a slow pinch across a boundary doesn't rebuild
// tiles every frame. The band is wider than the [~0.71, 1.41] a fresh pick
// yields, giving overlap on both sides.
const LOD_DXCOL_LO = 0.5
const LOD_DXCOL_HI = 1.5

// While the zoom is actively changing, we re-blit already-materialized tiles
// rescaled (a "proxy", possibly soft) instead of materializing a new lod each
// frame — that materialization churn is what spikes GC during a pinch. Once the
// zoom has been still this long, a refine draw materializes the target lod crisply.
const ZOOM_REFINE_MS = 90

const DB_MAX_DEFAULT = -16

// Pick the level of detail for the current zoom: target one canvas column per
// display pixel (dxPerCol ≈ 1). `lod` is the number of frame halvings; lod 0 is
// full resolution (zoomed in). Hysteresis keeps `prevLod` unless dxPerCol leaves
// the band, avoiding rebuild thrash mid-pinch.
function selectLod(dxPerFrame: number, prevLod: number): number {
  if (dxPerFrame <= 0) return 0
  if (prevLod >= 0) {
    const dxPerCol = dxPerFrame * (1 << prevLod)
    if (dxPerCol >= LOD_DXCOL_LO && dxPerCol <= LOD_DXCOL_HI) return prevLod
  }
  const lod = Math.round(Math.log2(1 / dxPerFrame))
  return Math.max(0, Math.min(MAX_LOD, lod))
}

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

// Per-tile dB-level data (0–255), the retained colour source. Transposed
// layout: data[b * TILE_WIDTH + localF]. Uint8 (not RGBA) so it's 4× smaller
// and reduces correctly by max in the level/dB domain when building coarse LOD
// tiles; the colourmap lookup happens at paint time. This is item 11's "quantize
// spectra → int8" applied to the display source. See docs/memory-improvements.md
// items 1c and 11.
interface LevelTile {
  data: Uint8Array // numBins * TILE_WIDTH
}

// Per-chunk level data split into fixed-size tiles; each new tile is a fresh TILE_WIDTH-column allocation.
interface ChunkLevelsState {
  chunk: AnalysisChunk
  levelTiles: LevelTile[]
  numFrames: number
  numBins: number
  dbMax: number
}

// canvas/ctx are null when the tile has been evicted (or not yet rendered).
// They're rebuilt on demand by renderTile (spectrogram colours + formant arcs)
// from the retained level data / frames when the tile scrolls into view. A tile
// covers TILE_WIDTH source frames but rasterizes into a `cols`-wide canvas
// (cols = TILE_WIDTH >> lod), each column reducing 2^lod frames by max.
interface Tile {
  canvas: OffscreenCanvas | null
  ctx: OffscreenCanvasRenderingContext2D | null
  startFrame: number
  lod: number
  cols: number
}

interface PooledCanvas {
  canvas: OffscreenCanvas
  ctx: OffscreenCanvasRenderingContext2D
}

// LRU over materialized canvas tiles (spec + formant share one budget; tiles of
// any lod share it too). Tiles are keyed by identity; insertion order in the Set
// is the LRU order (front = least recently used). Tile sizes vary by lod, so
// per-tile bytes are tracked in `byteOf`. Re-rendering a tile is cheap, so
// evicting an off-screen one and rebuilding it on scroll-back is a good trade.
//
// Evicted canvases are recycled into `free` (keyed by column width) rather than
// dropped, so the heavy churn of pinch-zoom — which crosses LOD boundaries and
// would otherwise allocate/GC a fresh OffscreenCanvas per visible tile each
// transition — reuses backing buffers instead. `acquire`/`recycle` are the pool;
// the free list is bounded by the same byte cap and cleared on height change.
class TileLru {
  private order = new Set<Tile>()
  private byteOf = new Map<Tile, number>()
  private capBytes = 0
  // Bytes of tiles touched since the last evict() — i.e. what the current
  // frame is actually drawing. evict() never drops below this, so on-screen
  // tiles are never evicted out from under the draw (no thrash when the
  // visible set alone exceeds the cap, e.g. fully zoomed out).
  private touchedBytes = 0
  totalBytes = 0

  // Recycled canvases keyed by column width (height is uniform — the pool is
  // cleared whenever canvas height changes). Bounded by `freeBytes <= capBytes`.
  private free = new Map<number, PooledCanvas[]>()
  private freeBytes = 0

  configure(capBytes: number): void {
    this.capBytes = capBytes
  }

  clear(): void {
    this.order.clear()
    this.byteOf.clear()
    this.totalBytes = 0
    this.touchedBytes = 0
    this.free.clear()
    this.freeBytes = 0
  }

  // Bytes currently held in the recycle pool (dev mem probe counts these too).
  get pooledBytes(): number {
    return this.freeBytes
  }

  // Borrow a `cols × height` canvas from the pool, or allocate one. The caller
  // fully repaints it (paintTile clears with a bg fillRect), so no clear here.
  acquire(cols: number, height: number): PooledCanvas {
    const list = this.free.get(cols)
    while (list && list.length) {
      const pooled = list.pop()!
      this.freeBytes -= tileBytes(cols, pooled.canvas.height)
      // Height is uniform (pool cleared on height change); guard defensively.
      if (pooled.canvas.height === height) return pooled
    }
    const canvas = new OffscreenCanvas(cols, height)
    const ctx = canvas.getContext('2d', { alpha: false })!
    return { canvas, ctx }
  }

  // Return a canvas to the pool (dropped if it would exceed the byte cap).
  private recycle(
    canvas: OffscreenCanvas,
    ctx: OffscreenCanvasRenderingContext2D,
  ): void {
    const bytes = canvas.width * canvas.height * 4
    if (this.freeBytes + bytes > this.capBytes) return
    let list = this.free.get(canvas.width)
    if (!list) {
      list = []
      this.free.set(canvas.width, list)
    }
    list.push({ canvas, ctx })
    this.freeBytes += bytes
  }

  // Record a freshly materialized tile (of `bytes` size) and mark it MRU.
  register(tile: Tile, bytes: number): void {
    if (!this.order.has(tile)) this.totalBytes += bytes
    this.order.delete(tile)
    this.order.add(tile)
    this.byteOf.set(tile, bytes)
    this.touchedBytes += bytes
  }

  // Mark an already-materialized tile most-recently-used.
  touch(tile: Tile): void {
    const bytes = this.byteOf.get(tile) ?? 0
    this.order.delete(tile)
    this.order.add(tile)
    this.touchedBytes += bytes
  }

  // Drop a tile from accounting, recycling its canvas (caller is discarding the
  // tile object entirely, e.g. on chunk truncation).
  forget(tile: Tile): void {
    if (this.order.delete(tile)) {
      this.totalBytes -= this.byteOf.get(tile) ?? 0
      this.byteOf.delete(tile)
    }
    if (tile.canvas && tile.ctx) this.recycle(tile.canvas, tile.ctx)
    tile.canvas = null
    tile.ctx = null
  }

  // Free least-recently-used canvases until under budget, recycling them into
  // the pool. The budget is at least the bytes touched this frame, so
  // most-recently-used (on-screen) tiles survive. Call once per draw.
  evict(): void {
    const floor = Math.max(this.capBytes, this.touchedBytes)
    this.touchedBytes = 0
    if (floor <= 0) return
    for (const tile of this.order) {
      if (this.totalBytes <= floor) break
      if (tile.canvas && tile.ctx) this.recycle(tile.canvas, tile.ctx)
      tile.canvas = null
      tile.ctx = null
      this.order.delete(tile)
      this.totalBytes -= this.byteOf.get(tile) ?? 0
      this.byteOf.delete(tile)
    }
  }
}

interface OffscreenState {
  // lod → tile array. Each array indexes tiles by tileIdx (= startFrame /
  // TILE_WIDTH); a tile covers the same frame range at every lod, just at a
  // different column resolution. Lazily populated as zoom levels are visited.
  tilesByLod: Map<number, Tile[]>
  binForY: Int32Array
  canvasHeight: number
  numBins: number
  // Shared scratch for the column paint path; written then pushed via
  // putImageData, never read back. Lives on OffscreenState to avoid reallocating.
  scratchData: ImageData
  scratchU32: Uint32Array
  // Reused per-bin × per-column reduced levels for coarse (lod > 0) tiles
  // (numBins × TILE_WIDTH, only the first numBins × cols used). Avoids a fresh
  // allocation per tile paint.
  reduceScratch: Uint8Array
}

const colsForLod = (lod: number): number => TILE_WIDTH >> lod

const tileBytes = (cols: number, canvasHeight: number): number =>
  cols * canvasHeight * 4

// The lod's tile array, created empty on first use.
function tilesForLod(off: OffscreenState, lod: number): Tile[] {
  let tiles = off.tilesByLod.get(lod)
  if (!tiles) {
    tiles = []
    off.tilesByLod.set(lod, tiles)
  }
  return tiles
}

interface DisplayBufState {
  buf: OffscreenCanvas
  ctx: OffscreenCanvasRenderingContext2D
  width: number
  height: number
  // Time at display pixel 0; updated on scroll to keep rounding error less than 0.5px.
  lastSrcTimeSec: number
  lastDxPerSec: number
  lastTilesGen: number
  // True when updateDisplayBufForFrames has written to buf since the last blit.
  dirty: boolean
  // True when the last paint was a zoom proxy (soft, wrong-lod). The next still
  // frame must force a crisp full repaint at the target lod.
  lastProxy: boolean
}

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

// Quantize spectra to Uint8 dB-levels (0–255). The colourmap lookup is deferred
// to paint time so coarse tiles can reduce levels by max first (item 1c).
//
// Spectrum bins are Int8Array of quantized dB: 0.5 dB steps with a -32 dB offset,
// covering [-96, +31.5] dB over [-128, 127] (see AnalysisFrame.ts). Silence
// (power <= 0) is -128 = -96 dB, which sits below the default display floor
// (-86 dB = dbMax -16 - dbRange 70), so it renders as level 0 (the colourmap
// floor) without a special case. The +31.5 dB ceiling is enough for
// pre-emphasized peaks; values above clip to level 255.
function computeLevelsRange(
  state: ChunkLevelsState,
  from: number,
  to: number,
  dbRange: number,
): void {
  const { levelTiles, numBins, dbMax, chunk } = state
  const dbFloor = dbMax - dbRange
  for (let f = from; f < to; f++) {
    const spectrum = chunk.frames[f]!.spectrum
    const tileIdx = Math.floor(f / TILE_WIDTH)
    const localF = f - tileIdx * TILE_WIDTH
    const tileData = levelTiles[tileIdx]!.data
    for (let b = 0; b < numBins; b++) {
      const db = int8ToDb(spectrum[b]!)
      const norm = Math.max(0, Math.min(1, (db - dbFloor) / dbRange))
      tileData[b * TILE_WIDTH + localF] = Math.round(norm * 255)
    }
  }
}

function ensureLevelTiles(state: ChunkLevelsState, needed: number): void {
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (state.levelTiles.length < numTiles) {
    state.levelTiles.push({ data: new Uint8Array(state.numBins * TILE_WIDTH) })
  }
}

// Grow one lod's tile array with empty (unrendered) placeholders. Canvases are
// allocated lazily by renderTile when a tile is blitted.
function ensureTiles(off: OffscreenState, lod: number, needed: number): void {
  const tiles = tilesForLod(off, lod)
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (tiles.length < numTiles) {
    tiles.push({
      canvas: null,
      ctx: null,
      startFrame: tiles.length * TILE_WIDTH,
      lod,
      cols: colsForLod(lod),
    })
  }
}

// Forget and truncate one lod's tiles at/after newLen (the tile objects are
// being discarded). Keeps LRU byte accounting in sync.
function truncateTiles(lru: TileLru, tiles: Tile[], newLen: number): void {
  for (let i = newLen; i < tiles.length; i++) lru.forget(tiles[i]!)
  tiles.length = newLen
}

// Truncate every lod's tile array to newTileLen (e.g. on chunk truncation or
// structural resync, which affect all resolutions).
function truncateAllLods(
  lru: TileLru,
  off: OffscreenState,
  newTileLen: number,
): void {
  for (const tiles of off.tilesByLod.values()) {
    truncateTiles(lru, tiles, newTileLen)
  }
}

// Draw formants for frames [startFrame, endFrame) on top of an already-painted
// opaque tile (the caller paints the spectrogram colours underneath first). The
// tile's x-axis is in canvas columns, so a frame at `f` lands at (f - startFrame)
// / step. At fine lods (step small) we draw dots, as before; at coarse lods the
// dots would be sub-pixel and merge, so we switch to connected lines per track so
// peaks survive (item 1c). Replaces the old separate transparent formant tile —
// each chunk keeps a single canvas tile (item 1b).
function drawFormants(
  ctx: OffscreenCanvasRenderingContext2D,
  startFrame: number,
  endFrame: number,
  frames: AnalysisFrame[],
  freqToY: (hz: number) => number,
  dpr: number,
  lod: number,
): void {
  const step = 1 << lod
  if (lod >= FORMANT_LINE_LOD) {
    drawFormantLines(ctx, startFrame, endFrame, frames, freqToY, dpr, step)
  } else {
    drawFormantDots(ctx, startFrame, endFrame, frames, freqToY, dpr, step)
  }
}

function drawFormantDots(
  ctx: OffscreenCanvasRenderingContext2D,
  startFrame: number,
  endFrame: number,
  frames: AnalysisFrame[],
  freqToY: (hz: number) => number,
  dpr: number,
  step: number,
): void {
  for (const { key, color } of FORMANT_TRACKS) {
    const r = FORMANT_LINE_WIDTH * dpr
    ctx.beginPath()
    for (let f = startFrame; f < endFrame; f++) {
      const sample = frames[f]!
      if (
        !(sample.pitchDetected && sample.speechDetected) ||
        sample[key] === null
      )
        continue
      const x = (f - startFrame + 0.5) / step
      const y = freqToY(sample[key])
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.shadowColor = FORMANT_SHADOW_COLOUR
    ctx.shadowBlur = FORMANT_SHADOW_BLUR * dpr
    ctx.fillStyle = color
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawFormantLines(
  ctx: OffscreenCanvasRenderingContext2D,
  startFrame: number,
  endFrame: number,
  frames: AnalysisFrame[],
  freqToY: (hz: number) => number,
  dpr: number,
  step: number,
): void {
  for (const { key, color } of FORMANT_TRACKS) {
    ctx.beginPath()
    // Break the polyline across unvoiced/absent runs so we don't bridge gaps.
    let pen = false
    for (let f = startFrame; f < endFrame; f++) {
      const sample = frames[f]!
      if (
        !(sample.pitchDetected && sample.speechDetected) ||
        sample[key] === null
      ) {
        pen = false
        continue
      }
      const x = (f - startFrame + 0.5) / step
      const y = freqToY(sample[key])
      if (pen) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
      pen = true
    }
    ctx.shadowColor = FORMANT_SHADOW_COLOUR
    ctx.shadowBlur = FORMANT_SHADOW_BLUR * dpr
    ctx.strokeStyle = color
    ctx.lineWidth = FORMANT_LINE_WIDTH * dpr
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.shadowBlur = 0
  }
}

// Paint a materialized tile in full at its lod: background, per-column reduced
// spectrogram colours, then formants on top. Cheap enough that it's also the
// patch/append path: any change to a tile's frames or levels repaints the whole
// tile rather than surgically editing arcs over colours (which a merged opaque
// tile can't do without re-blitting the colours underneath anyway).
function paintTile(
  off: OffscreenState,
  levels: ChunkLevelsState,
  frames: AnalysisFrame[],
  lod: number,
  t: number,
  theme: SpectrogramTheme,
  freqToY: (hz: number) => number,
  dpr: number,
): void {
  const tile = off.tilesByLod.get(lod)?.[t]
  const ctx = tile?.ctx
  if (!tile || !ctx) return
  const start = tile.startFrame
  ctx.fillStyle = theme.bgStyle
  ctx.fillRect(0, 0, tile.cols, off.canvasHeight)
  paintLevelColumns(off, levels, lod, t, theme)
  drawFormants(
    ctx,
    start,
    Math.min(frames.length, start + TILE_WIDTH),
    frames,
    freqToY,
    dpr,
    lod,
  )
}

// Materialize a tile's canvas (if evicted/unrendered) and mark it MRU. A
// rendered tile carries both the spectrogram colours and its formants.
function renderTile(
  off: OffscreenState,
  levels: ChunkLevelsState,
  frames: AnalysisFrame[],
  lod: number,
  t: number,
  theme: SpectrogramTheme,
  freqToY: (hz: number) => number,
  dpr: number,
  lru: TileLru,
): void {
  const tile = tilesForLod(off, lod)[t]
  if (!tile) return
  if (tile.canvas) {
    lru.touch(tile)
    return
  }
  const { canvas, ctx } = lru.acquire(tile.cols, off.canvasHeight)
  tile.canvas = canvas
  tile.ctx = ctx
  lru.register(tile, tileBytes(tile.cols, off.canvasHeight))
  paintTile(off, levels, frames, lod, t, theme, freqToY, dpr)
}

// Repaint a tile in place if it's currently materialized; no-op otherwise (an
// evicted/unrendered tile rebuilds lazily on its next blit). Used by the
// append/patch path to refresh on-screen tiles after their frames/levels change.
function repaintTile(
  off: OffscreenState,
  levels: ChunkLevelsState,
  frames: AnalysisFrame[],
  lod: number,
  t: number,
  theme: SpectrogramTheme,
  freqToY: (hz: number) => number,
  dpr: number,
  lru: TileLru,
): void {
  const tile = off.tilesByLod.get(lod)?.[t]
  if (!tile || !tile.canvas) return
  paintTile(off, levels, frames, lod, t, theme, freqToY, dpr)
  lru.touch(tile)
}

// Fill a tile's valid columns from the retained level data. For lod > 0 each
// canvas column is the per-bin max over 2^lod source frames (reduced in the
// level/dB domain — monotonic, so correct — then colourmapped), the Praat-style
// per-column reduction. lod 0 reads the level tile directly (one frame/col).
function paintLevelColumns(
  off: OffscreenState,
  levels: ChunkLevelsState,
  lod: number,
  t: number,
  theme: SpectrogramTheme,
): void {
  const tile = off.tilesByLod.get(lod)?.[t]
  const ctx = tile?.ctx
  if (!tile || !ctx) return
  const {
    binForY,
    canvasHeight,
    scratchData,
    scratchU32,
    reduceScratch,
    numBins,
  } = off
  const framesInTile = Math.min(TILE_WIDTH, levels.numFrames - tile.startFrame)
  if (framesInTile <= 0) return
  const step = 1 << lod
  const validCols = Math.ceil(framesInTile / step)
  const levelData = levels.levelTiles[t]!.data

  // Reduce to per-bin × per-column levels. lod 0 needs no reduction, so read the
  // level tile directly (stride TILE_WIDTH); coarser lods max into reduceScratch.
  let reduced: Uint8Array
  let stride: number
  if (lod === 0) {
    reduced = levelData
    stride = TILE_WIDTH
  } else {
    reduced = reduceScratch
    stride = colsForLod(lod)
    for (let b = 0; b < numBins; b++) {
      const srcBase = b * TILE_WIDTH
      const dstBase = b * stride
      for (let c = 0; c < validCols; c++) {
        const f0 = c * step
        const f1 = Math.min(f0 + step, framesInTile)
        let m = 0
        for (let f = f0; f < f1; f++) {
          const v = levelData[srcBase + f]!
          if (v > m) m = v
        }
        reduced[dstBase + c] = m
      }
    }
  }

  // Expand bins → canvas rows via binForY, batched into putImageData.
  const { colourmap, bgU32 } = theme
  for (
    let batchStart = 0;
    batchStart < validCols;
    batchStart += SCRATCH_WIDTH
  ) {
    const batchEnd = Math.min(validCols, batchStart + SCRATCH_WIDTH)
    const n = batchEnd - batchStart
    for (let y = 0; y < canvasHeight; y++) {
      const b = binForY[y] ?? -1
      const dstBase = y * SCRATCH_WIDTH
      if (b < 0) {
        scratchU32.fill(bgU32, dstBase, dstBase + n)
      } else {
        const rBase = b * stride + batchStart
        for (let i = 0; i < n; i++) {
          scratchU32[dstBase + i] = colourmap[reduced[rBase + i]!]!
        }
      }
    }
    ctx.putImageData(scratchData, batchStart, 0, 0, 0, n, canvasHeight)
  }
}

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

// Context the blit path needs to lazily (re)render tiles that scroll into view.
interface BlitContext {
  allLevels: ChunkLevelsState[]
  theme: SpectrogramTheme
  freqToY: (hz: number) => number
  dpr: number
  lru: TileLru
  // Level of detail to blit this draw (target lod normally; the frozen proxy lod
  // while zooming). Set by `draw`.
  lod: number
  // When false (active zoom), blit only already-materialized tiles of `lod`
  // rescaled — no new materialization. When true, materialize as needed.
  materialize: boolean
}

// Blit one layer's tiles at the active lod. `ensure(t)` materializes tile t (and
// marks it MRU) before it's drawn; it's only called for tiles that actually
// overlap the visible source range, so off-screen tiles stay evicted. Source
// coords are in frames; the tile canvas is in columns (frames / 2^lod), so the
// source rect is scaled by 1/step while the destination (display px) is not.
function blitLayer(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  tiles: Tile[],
  canvasHeight: number,
  srcX0: number,
  srcW: number,
  dxPerFrame: number,
  displayHeight: number,
  lod: number,
  ensure: (t: number) => void,
): void {
  const step = 1 << lod
  for (let t = 0; t < tiles.length; t++) {
    const tile = tiles[t]!
    const tileSrcX = srcX0 - tile.startFrame
    const clippedSrcX = Math.max(0, tileSrcX)
    const clippedSrcW = Math.min(TILE_WIDTH, tileSrcX + srcW) - clippedSrcX
    if (clippedSrcW <= 0) continue
    ensure(t)
    if (!tile.canvas) continue
    const destX = (clippedSrcX - tileSrcX) * dxPerFrame
    const destW = clippedSrcW * dxPerFrame
    ctx.drawImage(
      tile.canvas,
      clippedSrcX / step,
      0,
      clippedSrcW / step,
      canvasHeight,
      destX,
      0,
      destW,
      displayHeight,
    )
  }
}

// Blit all chunk tiles; srcTimeSec = time at pixel 0, srcWidthSec = display span.
function blitChunks(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  offs: (OffscreenState | null)[],
  analysis: AnalysisChunk[],
  srcTimeSec: number,
  srcWidthSec: number,
  dxPerSec: number,
  displayHeight: number,
  bc: BlitContext,
): void {
  // Guard against the unset sentinel (-1) reaching `1 << lod`; a real draw
  // always sets a non-negative lod first.
  const lod = Math.max(0, bc.lod)
  for (let i = 0; i < offs.length; i++) {
    const off = offs[i]
    const chunk = analysis[i]
    const levels = bc.allLevels[i]
    if (!off || !chunk || !levels) continue
    const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
    const dxPerFrame = dxPerSec * timeStepSec
    if (dxPerFrame <= 0) continue
    // Grow the active lod's tile array to cover the chunk (placeholders only;
    // canvases materialize lazily in renderTile when actually visible).
    ensureTiles(off, lod, levels.numFrames)
    // chunkSrcX0: the (possibly fractional) chunk-local frame index at display pixel 0.
    const chunkSrcX0 = (srcTimeSec - chunk.startTimeSec) / timeStepSec
    const chunkSrcW = srcWidthSec / timeStepSec
    const tiles = tilesForLod(off, lod)
    blitLayer(
      ctx,
      tiles,
      off.canvasHeight,
      chunkSrcX0,
      chunkSrcW,
      dxPerFrame,
      displayHeight,
      lod,
      bc.materialize
        ? (t) =>
            renderTile(
              off,
              levels,
              chunk.frames,
              lod,
              t,
              bc.theme,
              bc.freqToY,
              bc.dpr,
              bc.lru,
            )
        : // Proxy (active zoom): blit only what's already materialized, rescaled.
          // Touch it so eviction keeps the on-screen proxy alive through the gesture.
          (t) => {
            const tile = tiles[t]
            if (tile?.canvas) bc.lru.touch(tile)
          },
    )
  }
}

// Paint [fromTimeSec, toTimeSec) into the display buffer without a full repaint.
// fromTimeSec should be one frame before effectiveFrom to include the arc moveTo anchor.
function updateDisplayBufForFrames(
  db: DisplayBufState | null,
  offs: (OffscreenState | null)[],
  analysis: AnalysisChunk[],
  fromTimeSec: number,
  toTimeSec: number,
  bc: BlitContext,
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
  db.ctx.fillStyle = bc.theme.bgStyle
  db.ctx.fillRect(x1, 0, x2 - x1, height)
  db.ctx.save()
  db.ctx.translate(x1, 0)
  blitChunks(
    db.ctx,
    offs,
    analysis,
    stripSrcTimeSec,
    stripWidthSec,
    lastDxPerSec,
    height,
    bc,
  )
  db.ctx.restore()
}

function draw(
  mainCtx: CanvasRenderingContext2D,
  displayBufRef: { current: DisplayBufState | null },
  lodRef: { current: number },
  renderLodRef: { current: number },
  scheduleRefine: () => void,
  tilesGen: number,
  width: number,
  height: number,
  offs: (OffscreenState | null)[],
  analysis: AnalysisChunk[],
  timeToX: (timeSec: number) => number,
  bc: BlitContext,
): void {
  bc.lru.configure(MAX_TILE_CANVAS_BYTES)
  if (offs.length === 0) {
    mainCtx.fillStyle = bc.theme.bgStyle
    mainCtx.fillRect(0, 0, width, height)
    return
  }

  // timeToX is linear so dxPerSec is uniform across all chunks.
  const dxPerSec = timeToX(1) - timeToX(0)
  if (dxPerSec <= 0) {
    mainCtx.fillStyle = bc.theme.bgStyle
    mainCtx.fillRect(0, 0, width, height)
    return
  }
  const srcTimeSec = -timeToX(0) / dxPerSec
  const srcWidthSec = width / dxPerSec

  // Choose the level of detail from the zoom (params are uniform across chunks,
  // like the waveform). Hysteresis (via lodRef) avoids rebuild thrash mid-pinch.
  const timeStepSec = analysis[0]
    ? analysis[0].timeStepSamples / analysis[0].sampleRate
    : 0.002
  const targetLod = selectLod(dxPerSec * timeStepSec, lodRef.current)
  lodRef.current = targetLod

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
      lastProxy: false,
    }
    displayBufRef.current = db
  }

  // While the zoom is actively crossing toward a *finer* lod, don't materialize
  // the new (larger, expensive) tiles every frame — that's the pinch GC. Instead
  // blit the last settled coarser lod rescaled (a soft but gapless proxy, since a
  // coarser lod covers the shrinking viewport) and schedule a refine to
  // materialize the target once the zoom stops. Zooming *out* is materialized
  // directly: coarser target tiles are small, hysteresis limits it to octave
  // boundaries, and proxying a finer lod outward would leave the newly revealed
  // edges blank. Same-lod zooms and scrolls also materialize normally.
  const dxChanged =
    !isNaN(db.lastDxPerSec) && Math.abs(db.lastDxPerSec - dxPerSec) >= 1e-6
  const proxy =
    dxChanged && renderLodRef.current >= 0 && targetLod < renderLodRef.current
  bc.materialize = !proxy
  bc.lod = proxy ? renderLodRef.current : targetLod

  const sameTiles = db.lastTilesGen === tilesGen
  const sameDx =
    !isNaN(db.lastDxPerSec) && Math.abs(db.lastDxPerSec - dxPerSec) < 1e-6
  // A proxy frame, or the first still frame after one, must fully repaint (the
  // buffer holds soft/wrong-lod content that the incremental paths would keep).
  const forceFull = proxy || db.lastProxy
  const pixelShift =
    !forceFull && sameTiles && sameDx && !isNaN(db.lastSrcTimeSec)
      ? Math.round((db.lastSrcTimeSec - srcTimeSec) * dxPerSec)
      : NaN
  const canIncremental = !isNaN(pixelShift) && Math.abs(pixelShift) < width

  if (!canIncremental) {
    // Full repaint: composite all chunk layers into the display buffer.
    db.ctx.fillStyle = bc.theme.bgStyle
    db.ctx.fillRect(0, 0, width, height)
    blitChunks(
      db.ctx,
      offs,
      analysis,
      srcTimeSec,
      srcWidthSec,
      dxPerSec,
      height,
      bc,
    )
    db.lastSrcTimeSec = srcTimeSec
    db.lastDxPerSec = dxPerSec
    db.lastTilesGen = tilesGen
    db.lastProxy = proxy
    if (!proxy) renderLodRef.current = targetLod
  } else if (pixelShift !== 0) {
    // Incremental scroll: shift content, repaint new strip. Self-copy snapshots before write (no aliasing).
    db.ctx.drawImage(db.buf, pixelShift, 0)
    // Track actual buffer position so rounding error stays bounded to 0.5px per frame.
    db.lastSrcTimeSec -= pixelShift / dxPerSec

    const stripX = pixelShift < 0 ? width + pixelShift : 0
    const stripW = Math.abs(pixelShift)
    const stripSrcTimeSec = srcTimeSec + stripX / dxPerSec
    const stripWidthSec = stripW / dxPerSec

    db.ctx.fillStyle = bc.theme.bgStyle
    db.ctx.fillRect(stripX, 0, stripW, height)
    // translate shifts stripX to pixel 0 for blitChunks' coord logic.
    db.ctx.save()
    db.ctx.translate(stripX, 0)
    blitChunks(
      db.ctx,
      offs,
      analysis,
      stripSrcTimeSec,
      stripWidthSec,
      dxPerSec,
      height,
      bc,
    )
    db.ctx.restore()
    db.lastProxy = false
    renderLodRef.current = targetLod
  } else {
    // pixelShift === 0: nothing scrolled; the buffer already holds the target lod.
    renderLodRef.current = targetLod
  }
  // pixelShift === 0: skip the blit unless updateDisplayBufForFrames wrote new content.
  if (!canIncremental || pixelShift !== 0 || db.dirty) {
    mainCtx.drawImage(db.buf, 0, 0)
    db.dirty = false
  }
  // Materializing the target lod is deferred until the zoom is still; nudge a
  // refine draw to crisp-paint once it settles.
  if (proxy) scheduleRefine()
  // Free off-screen tiles that pushed us over budget. Tiles drawn this frame are
  // MRU, so they survive.
  bc.lru.evict()
}

export function Spectrogram({
  analysisMut,
  dbRange = 70,
  ref,
  debug = false,
}: {
  analysisMut: AnalysisChunk[]
  dbRange?: number
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
  const theme =
    scheme === 'dark' ? SPECTROGRAM_DARK_THEME : SPECTROGRAM_LIGHT_THEME

  const allLevelsRef = useRef<ChunkLevelsState[]>([])
  const allOffRef = useRef<(OffscreenState | null)[]>([])
  const displayBufRef = useRef<DisplayBufState | null>(null)
  const tilesGenRef = useRef(0)
  const tileLruRef = useRef(new TileLru())
  // Active level of detail, carried across draws for hysteresis (-1 = unset).
  const lodRef = useRef(-1)
  // The last lod actually materialized on screen; the zoom proxy blits this
  // (rescaled) while a pinch crosses into a different lod (-1 = nothing yet).
  const renderLodRef = useRef(-1)
  // Pending zoom-settle refine timer (see ZOOM_REFINE_MS).
  const refineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dev-only: report retained tile memory to the probe. levelTiles are the
  // retained source (one Uint8Array per tile, the quantized spectra); canvas
  // tiles are an LRU-bounded cache of display-resolution LOD tiles (items 1, 1c).
  // Each canvas tile carries both the spectrogram and its formants (item 1b), so
  // `tiles` counts only the materialized canvases across all lods, not placeholders.
  useEffect(() => {
    return registerMemSource(
      'spectrogram',
      'Spectrogram retained tiles',
      () => {
        let levelTiles = 0
        let levelBytes = 0
        for (const c of allLevelsRef.current) {
          levelTiles += c.levelTiles.length
          for (const t of c.levelTiles) levelBytes += t.data.byteLength
        }
        let tiles = 0
        let tileCanvasBytes = 0
        for (const o of allOffRef.current) {
          if (!o) continue
          for (const arr of o.tilesByLod.values()) {
            for (const t of arr) {
              if (!t.canvas) continue
              tiles += 1
              tileCanvasBytes += t.canvas.width * t.canvas.height * 4
            }
          }
        }
        const db = displayBufRef.current
        const displayBufBytes = db ? db.buf.width * db.buf.height * 4 : 0
        return {
          levelTiles,
          levelBytes,
          tiles,
          tileCanvasBytes,
          pooledBytes: tileLruRef.current.pooledBytes,
          displayBufBytes,
        }
      },
    )
  }, [])

  const animationFrame = useRef<number | null>(null)
  const triggerDraw = useRef(() => {})

  // Debounced: fire a draw once the zoom has been still for ZOOM_REFINE_MS, so a
  // proxy paint gets replaced by a crisp target-lod materialization. Stable (refs).
  const scheduleRefine = useRef(() => {
    if (refineTimerRef.current != null) clearTimeout(refineTimerRef.current)
    refineTimerRef.current = setTimeout(() => {
      refineTimerRef.current = null
      triggerDraw.current()
    }, ZOOM_REFINE_MS)
  })

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

  useEffect(() => {
    if (analysisMut.length === 0) {
      allLevelsRef.current = []
      allOffRef.current = []
      tileLruRef.current.clear()
      renderLodRef.current = -1
      return
    }
    const newLevels: ChunkLevelsState[] = []
    for (const chunk of analysisMut) {
      const numFrames = chunk.frames.length
      const numBins = chunk.frames[0]!.spectrum.length
      const maxDb = chunkDbMax(chunk)
      const levels: ChunkLevelsState = {
        chunk,
        levelTiles: [],
        numFrames,
        numBins,
        dbMax: maxDb,
      }
      ensureLevelTiles(levels, numFrames)
      computeLevelsRange(levels, 0, numFrames, dbRange)
      newLevels.push(levels)
    }
    allLevelsRef.current = newLevels
  }, [analysisMut, dbRange])

  // ---- FALLS THROUGH TO NEXT EFFECT ----

  // When freq scale, canvas height, or dpr changes, rebuild tile containers.
  // Tiles start empty (no canvas); the draw path materializes the visible ones
  // lazily and the LRU evicts the rest, so we don't paint anything here.
  useEffect(() => {
    const allLevels = allLevelsRef.current
    if (allLevels.length === 0 || canvasHeight <= 0) return

    // Old tile objects are about to be replaced; drop their LRU accounting. The
    // proxy lod no longer has materialized tiles, so reset it (forces the next
    // draw to materialize crisply rather than proxy from stale tiles).
    tileLruRef.current.clear()
    renderLodRef.current = -1

    const newOff: (OffscreenState | null)[] = []

    for (const levels of allLevels) {
      const { chunk } = levels

      const binForY = buildBinForY(
        levels.numBins,
        chunk.firstBinHz,
        chunk.freqStepHz,
        freqToY,
        canvasHeight,
      )
      const scratchData = new ImageData(SCRATCH_WIDTH, canvasHeight)
      newOff.push({
        tilesByLod: new Map(),
        binForY,
        canvasHeight,
        numBins: levels.numBins,
        scratchData,
        scratchU32: new Uint32Array(scratchData.data.buffer),
        reduceScratch: new Uint8Array(levels.numBins * TILE_WIDTH),
      })
    }

    allOffRef.current = newOff
    tilesGenRef.current += 1

    // Note: this must include everything in the previous effect
  }, [analysisMut, dbRange, canvasHeight, freqToY, dpr, theme])

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
          lodRef,
          renderLodRef,
          scheduleRefine.current,
          tilesGenRef.current,
          canvasWidth,
          canvasHeight,
          allOffRef.current,
          analysisMut,
          timeToX,
          {
            allLevels: allLevelsRef.current,
            theme,
            freqToY,
            dpr,
            lru: tileLruRef.current,
            lod: lodRef.current,
            materialize: true,
          },
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
      if (refineTimerRef.current != null) clearTimeout(refineTimerRef.current)
      refineTimerRef.current = null
      drawFrame.current = null
      animationFrame.current = null
    }
    // Note: this must include everything in the previous effect
  }, [
    analysisMut,
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
      let effectiveFrom = fromRef.current!
      const pendingTo = pendingToRef.current // Infinity = append, number = patch to
      fromRef.current = null
      pendingToRef.current = 0

      const allLevels = allLevelsRef.current
      const allOff = allOffRef.current

      let needFullRedraw = false

      // Resync caches on structural change (e.g. reconcileVoicingAt may merge or reorder
      // chunks). Find the first diverged index by identity, drop the tail, and widen
      // the repaint to the predecessor's start so lazy-grow + range paint below
      // rebuilds everything in one pass.
      let structuralResync = false
      {
        let firstDiverged = allLevels.length
        let predecessorStart = 0
        let acc = 0
        for (let i = 0; i < allLevels.length; i++) {
          if (
            i >= analysisMut.length ||
            allLevels[i]!.chunk !== analysisMut[i]
          ) {
            firstDiverged = i
            break
          }
          predecessorStart = acc
          acc += analysisMut[i]!.frames.length
        }
        if (firstDiverged < allLevels.length) {
          // Drop LRU accounting for tiles in the chunks being discarded.
          for (let i = firstDiverged; i < allOff.length; i++) {
            const o = allOff[i]
            if (o) truncateAllLods(tileLruRef.current, o, 0)
          }
          allLevels.length = firstDiverged
          allOff.length = firstDiverged
          effectiveFrom = Math.min(effectiveFrom, predecessorStart)
          needFullRedraw = true
          structuralResync = true
        }
      }

      for (let i = 0; i < allLevels.length && i < analysisMut.length; i++) {
        const levels = allLevels[i]!
        const chunk = analysisMut[i]!
        if (levels.numFrames > chunk.frames.length) {
          const tileCount = Math.ceil(chunk.frames.length / TILE_WIDTH)
          levels.numFrames = chunk.frames.length
          levels.levelTiles.length = tileCount
          levels.dbMax = chunkDbMax(chunk)
          const off = allOff[i]
          if (off) truncateAllLods(tileLruRef.current, off, tileCount)
          needFullRedraw = true
        }
      }

      // Lazily grow per-chunk state for any new chunks that have received frames.
      while (allLevels.length < analysisMut.length) {
        const i = allLevels.length
        const chunk = analysisMut[i]!
        if (!chunk.frames[0]) break // no frames yet, can't determine numBins
        const numBins = chunk.frames[0].spectrum.length
        const levels: ChunkLevelsState = {
          chunk,
          levelTiles: [],
          numFrames: 0,
          numBins,
          dbMax: DB_MAX_DEFAULT,
        }
        allLevels.push(levels)
        allOff.push(null)
      }

      if (allLevels.length === 0) return

      // After a structural resync the rebuilt tail can extend past the patched
      // range, so repaint through the end of the (re-chunked) timeline.
      const globalTotal =
        pendingTo === Infinity || structuralResync
          ? totalFrames(analysisMut)
          : pendingTo
      const ranges = globalRangeToChunkRanges(
        analysisMut,
        effectiveFrom,
        globalTotal,
      )
      if (ranges.length === 0) {
        if (needFullRedraw) {
          tilesGenRef.current += 1
          triggerDraw.current()
        }
        return
      }

      for (const { chunkIdx, localFrom, localTo } of ranges) {
        const levels = allLevels[chunkIdx]
        if (!levels) continue
        const chunk = analysisMut[chunkIdx]!

        const prevNumFrames = levels.numFrames
        const isExtending = localTo > prevNumFrames

        // Scan newly appended frames for a new peak (monotonic -- old frames
        // already contributed to dbMax). Also scan any patched existing frames.
        let fullChunkRecolor = false
        if (isExtending) {
          for (let f = prevNumFrames; f < localTo; f++) {
            const frameMax = frameDbMax(chunk.frames[f]!)
            if (frameMax !== null && frameMax > levels.dbMax) {
              levels.dbMax = frameMax
              fullChunkRecolor = true
            }
          }
        }
        for (let f = localFrom; f < Math.min(localTo, prevNumFrames); f++) {
          const frameMax = frameDbMax(chunk.frames[f]!)
          if (frameMax !== null && frameMax > levels.dbMax) {
            levels.dbMax = frameMax
            fullChunkRecolor = true
          }
        }

        if (isExtending) ensureLevelTiles(levels, localTo)

        computeLevelsRange(
          levels,
          fullChunkRecolor ? 0 : localFrom,
          localTo,
          dbRange,
        )
        if (isExtending) levels.numFrames = localTo

        const off = allOff[chunkIdx] ?? null

        if (!off && canvasHeight > 0) {
          const binForY = buildBinForY(
            levels.numBins,
            chunk.firstBinHz,
            chunk.freqStepHz,
            freqToY,
            canvasHeight,
          )
          const scratchData = new ImageData(SCRATCH_WIDTH, canvasHeight)
          // Tiles materialize lazily per lod in the redraw below; just the
          // container here (each tile paints colours + formants together).
          allOff[chunkIdx] = {
            tilesByLod: new Map(),
            binForY,
            canvasHeight,
            numBins: levels.numBins,
            scratchData,
            scratchU32: new Uint32Array(scratchData.data.buffer),
            reduceScratch: new Uint8Array(levels.numBins * TILE_WIDTH),
          }
          needFullRedraw = true
        } else if (off) {
          // levelTiles (the spec source) were updated above by computeLevelsRange.
          // Repaint the affected materialized tiles in full — each repaint reduces
          // + re-colours and redraws formants on top, so a merged opaque tile stays
          // correct without surgically editing one layer. A recolor (new dbMax)
          // repaints the whole chunk; otherwise just the changed range. Only the
          // active lod is materialized, but repaint every resident lod (no-op for
          // unmaterialized tiles) so a kept other-lod tile stays consistent.
          const repaintFromFrame = fullChunkRecolor ? 0 : localFrom
          const firstTile = Math.floor(repaintFromFrame / TILE_WIDTH)
          const lastTile = Math.floor((localTo - 1) / TILE_WIDTH)
          for (const lod of off.tilesByLod.keys()) {
            if (isExtending) ensureTiles(off, lod, localTo)
            for (let t = firstTile; t <= lastTile; t++) {
              repaintTile(
                off,
                levels,
                chunk.frames,
                lod,
                t,
                theme,
                freqToY,
                dpr,
                tileLruRef.current,
              )
            }
          }
          if (fullChunkRecolor) needFullRedraw = true

          // Refresh the on-screen strip for the changed time range without a full
          // repaint. Start one frame early so a formant's left-bleeding shadow at
          // the edge is included.
          const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
          const updateFromLocal = fullChunkRecolor
            ? 0
            : Math.max(0, localFrom - 1)
          const fromTimeSec = chunk.startTimeSec + updateFromLocal * timeStepSec
          const toTimeSec = chunk.startTimeSec + localTo * timeStepSec
          updateDisplayBufForFrames(
            displayBufRef.current,
            allOff,
            analysisMut,
            fromTimeSec,
            toTimeSec,
            {
              allLevels,
              theme,
              freqToY,
              dpr,
              lru: tileLruRef.current,
              lod: lodRef.current,
              materialize: true,
            },
          )
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
  }, [canvasHeight, analysisMut, freqToY, dbRange, dpr, theme])

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
