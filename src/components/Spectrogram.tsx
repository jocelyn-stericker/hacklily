// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Renders the frequency spectrogram with color-mapped intensity and formant markers.

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk, AnalysisFrame } from '#/lib/analysis/AnalysisFrame'
import { frameDbMax, totalFrames } from '#/lib/analysis/AnalysisFrame'
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

// GPU canvas tiles; each holds up to TILE_WIDTH frames.
export const TILE_WIDTH = 256

// Scratch ImageData for paintColumnsToOffscreen; narrower than TILE_WIDTH so one allocation serves all tiles.
const SCRATCH_WIDTH = 256

// Budget for materialized spec + formant canvas tiles (combined). Off-screen
// tiles are evicted and re-rendered on demand from the retained color data
// (spec) and analysis frames (formants), which together cost far less than the
// rendered canvases. Sized to comfortably hold a couple of viewport-widths of
// both layers so scrolling reuses cached tiles instead of thrashing. See
// docs/memory-improvements.md item 1.
const MAX_TILE_CANVAS_BYTES = 48 * 1024 * 1024

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

// Per-chunk color data split into fixed-size tiles; each new tile is a fresh TILE_WIDTH-column allocation.
interface ChunkColorsState {
  chunk: AnalysisChunk
  colorTiles: ColorTile[]
  numFrames: number
  numBins: number
  dbMax: number
}

// canvas/ctx are null when the tile has been evicted (or not yet rendered).
// They're rebuilt on demand by renderTile (spectrogram colours + formant arcs)
// from the retained color data / frames when the tile scrolls into view.
interface Tile {
  canvas: OffscreenCanvas | null
  ctx: OffscreenCanvasRenderingContext2D | null
  startFrame: number
}

// LRU over materialized canvas tiles (spec + formant share one budget). Tiles
// are keyed by identity; insertion order in the Set is the LRU order (front =
// least recently used). Re-rendering a tile is cheap, so evicting an
// off-screen one and rebuilding it on scroll-back is a good memory trade.
class TileLru {
  private order = new Set<Tile>()
  private tileBytes = 0
  private capBytes = 0
  // Bytes of tiles touched since the last evict() — i.e. what the current
  // frame is actually drawing. evict() never drops below this, so on-screen
  // tiles are never evicted out from under the draw (no thrash when the
  // visible set alone exceeds the cap, e.g. fully zoomed out).
  private touchedBytes = 0
  totalBytes = 0

  // tileBytes depends on canvas height (dpr/resize); a change invalidates the
  // byte accounting, so drop everything and let the draw path re-render.
  configure(tileBytes: number, capBytes: number): void {
    if (tileBytes !== this.tileBytes) {
      this.clear()
      this.tileBytes = tileBytes
    }
    this.capBytes = capBytes
  }

  clear(): void {
    this.order.clear()
    this.totalBytes = 0
    this.touchedBytes = 0
  }

  // Record a freshly materialized tile and mark it most-recently-used.
  register(tile: Tile): void {
    if (!this.order.has(tile)) this.totalBytes += this.tileBytes
    this.order.delete(tile)
    this.order.add(tile)
    this.touchedBytes += this.tileBytes
  }

  // Mark an already-materialized tile most-recently-used.
  touch(tile: Tile): void {
    this.order.delete(tile)
    this.order.add(tile)
    this.touchedBytes += this.tileBytes
  }

  // Drop a tile from accounting without freeing its canvas (caller is
  // discarding the tile object entirely, e.g. on chunk truncation).
  forget(tile: Tile): void {
    if (this.order.delete(tile)) this.totalBytes -= this.tileBytes
  }

  // Free least-recently-used canvases until under budget. The budget is at
  // least the bytes touched this frame, so most-recently-used (on-screen)
  // tiles survive. Call once per draw.
  evict(): void {
    const floor = Math.max(this.capBytes, this.touchedBytes)
    this.touchedBytes = 0
    if (floor <= 0) return
    for (const tile of this.order) {
      if (this.totalBytes <= floor) break
      tile.canvas = null
      tile.ctx = null
      this.order.delete(tile)
      this.totalBytes -= this.tileBytes
    }
  }
}

interface OffscreenState {
  tiles: Tile[]
  binForY: Int32Array
  canvasHeight: number
  // Shared scratch for paintColumnsToOffscreen; written then pushed via putImageData,
  // never read back. Lives on OffscreenState to avoid reallocating across calls.
  scratchData: ImageData
  scratchU32: Uint32Array
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

function computeColorsRange(
  state: ChunkColorsState,
  from: number,
  to: number,
  theme: SpectrogramTheme,
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

// Grow the tile array with empty (unrendered) placeholders. Canvases are
// allocated lazily by renderTile when a tile is blitted.
function ensureTiles(off: { tiles: Tile[] }, needed: number): void {
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (off.tiles.length < numTiles) {
    off.tiles.push({
      canvas: null,
      ctx: null,
      startFrame: off.tiles.length * TILE_WIDTH,
    })
  }
}

// Forget and truncate tiles at/after newLen (the tile objects are being
// discarded). Keeps LRU byte accounting in sync.
function truncateTiles(lru: TileLru, tiles: Tile[], newLen: number): void {
  for (let i = newLen; i < tiles.length; i++) lru.forget(tiles[i]!)
  tiles.length = newLen
}

// Draw formant arcs for frames [startFrame, endFrame) on top of an
// already-painted opaque tile. The caller must have painted the spectrogram
// colours underneath first; arcs sit on top. This replaces the old separate
// transparent formant tile (composited as a second drawImage) — each chunk now
// keeps a single canvas tile. See docs/memory-improvements.md item 1b.
function drawFormantArcs(
  ctx: OffscreenCanvasRenderingContext2D,
  startFrame: number,
  endFrame: number,
  frames: AnalysisFrame[],
  freqToY: (hz: number) => number,
  dpr: number,
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
      const x = f - startFrame + 0.5
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

// Paint a materialized tile in full: background, spectrogram colours (a
// putImageData blit from the retained colour data — no per-bin recompute), then
// formant arcs on top. Cheap enough that it's also the patch/append path: any
// change to a tile's frames or colours repaints the whole tile rather than
// surgically editing arcs over colours (which a merged opaque tile can't do
// without re-blitting the colours underneath anyway).
function paintTile(
  off: OffscreenState,
  colors: ChunkColorsState,
  frames: AnalysisFrame[],
  t: number,
  theme: SpectrogramTheme,
  freqToY: (hz: number) => number,
  dpr: number,
): void {
  const tile = off.tiles[t]
  const ctx = tile?.ctx
  if (!tile || !ctx) return
  const start = tile.startFrame
  ctx.fillStyle = theme.bgStyle
  ctx.fillRect(0, 0, TILE_WIDTH, off.canvasHeight)
  paintColumnsToOffscreen(
    off,
    colors,
    start,
    Math.min(start + TILE_WIDTH, colors.numFrames),
    theme,
  )
  drawFormantArcs(
    ctx,
    start,
    Math.min(frames.length, start + TILE_WIDTH),
    frames,
    freqToY,
    dpr,
  )
}

// Materialize a tile's canvas (if evicted/unrendered) and mark it MRU. A
// rendered tile carries both the spectrogram colours and its formant arcs.
function renderTile(
  off: OffscreenState,
  colors: ChunkColorsState,
  frames: AnalysisFrame[],
  t: number,
  theme: SpectrogramTheme,
  freqToY: (hz: number) => number,
  dpr: number,
  lru: TileLru,
): void {
  const tile = off.tiles[t]
  if (!tile) return
  if (tile.canvas) {
    lru.touch(tile)
    return
  }
  const canvas = new OffscreenCanvas(TILE_WIDTH, off.canvasHeight)
  const ctx = canvas.getContext('2d', { alpha: false })!
  tile.canvas = canvas
  tile.ctx = ctx
  lru.register(tile)
  paintTile(off, colors, frames, t, theme, freqToY, dpr)
}

// Repaint a tile in place if it's currently materialized; no-op otherwise (an
// evicted/unrendered tile rebuilds lazily on its next blit). Used by the
// append/patch path to refresh on-screen tiles after their frames/colours change.
function repaintTile(
  off: OffscreenState,
  colors: ChunkColorsState,
  frames: AnalysisFrame[],
  t: number,
  theme: SpectrogramTheme,
  freqToY: (hz: number) => number,
  dpr: number,
  lru: TileLru,
): void {
  const tile = off.tiles[t]
  if (!tile || !tile.canvas) return
  paintTile(off, colors, frames, t, theme, freqToY, dpr)
  lru.touch(tile)
}

function paintColumnsToOffscreen(
  off: OffscreenState,
  colors: ChunkColorsState,
  from: number,
  to: number,
  theme: SpectrogramTheme,
): void {
  if (to <= from) return
  const { tiles, binForY, canvasHeight, scratchData, scratchU32 } = off
  const { colorTiles } = colors
  const firstTile = Math.floor(from / TILE_WIDTH)
  const lastTile = Math.floor((to - 1) / TILE_WIDTH)
  for (let t = firstTile; t <= lastTile && t < tiles.length; t++) {
    const tile = tiles[t]!
    const ctx = tile.ctx
    if (!ctx) continue // evicted/unrendered: rebuilt lazily
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
      ctx.putImageData(
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
  allColors: ChunkColorsState[]
  theme: SpectrogramTheme
  freqToY: (hz: number) => number
  dpr: number
  lru: TileLru
}

// Blit one layer's tiles. `ensure(t)` materializes tile t (and marks it MRU)
// before it's drawn; it's only called for tiles that actually overlap the
// visible source range, so off-screen tiles stay evicted.
function blitLayer(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  tiles: Tile[],
  canvasHeight: number,
  srcX0: number,
  srcW: number,
  dxPerFrame: number,
  displayHeight: number,
  ensure: (t: number) => void,
): void {
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
  for (let i = 0; i < offs.length; i++) {
    const off = offs[i]
    const chunk = analysis[i]
    const colors = bc.allColors[i]
    if (!off || !chunk || !colors) continue
    const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
    const dxPerFrame = dxPerSec * timeStepSec
    if (dxPerFrame <= 0) continue
    // chunkSrcX0: the (possibly fractional) chunk-local frame index at display pixel 0.
    const chunkSrcX0 = (srcTimeSec - chunk.startTimeSec) / timeStepSec
    const chunkSrcW = srcWidthSec / timeStepSec
    blitLayer(
      ctx,
      off.tiles,
      off.canvasHeight,
      chunkSrcX0,
      chunkSrcW,
      dxPerFrame,
      displayHeight,
      (t) =>
        renderTile(
          off,
          colors,
          chunk.frames,
          t,
          bc.theme,
          bc.freqToY,
          bc.dpr,
          bc.lru,
        ),
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
  tilesGen: number,
  width: number,
  height: number,
  offs: (OffscreenState | null)[],
  analysis: AnalysisChunk[],
  timeToX: (timeSec: number) => number,
  bc: BlitContext,
): void {
  bc.lru.configure(TILE_WIDTH * height * 4, MAX_TILE_CANVAS_BYTES)
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
  }
  // pixelShift === 0: skip the blit unless updateDisplayBufForFrames wrote new content.
  if (!canIncremental || pixelShift !== 0 || db.dirty) {
    mainCtx.drawImage(db.buf, 0, 0)
    db.dirty = false
  }
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

  const allColorsRef = useRef<ChunkColorsState[]>([])
  const allOffRef = useRef<(OffscreenState | null)[]>([])
  const displayBufRef = useRef<DisplayBufState | null>(null)
  const tilesGenRef = useRef(0)
  const tileLruRef = useRef(new TileLru())

  // Dev-only: report retained tile memory to the probe. colorTiles are the
  // retained source (one Uint32Array per tile); canvas tiles are an
  // LRU-bounded cache (see docs/memory-improvements.md item 1). Each tile now
  // carries both the spectrogram and its formant arcs (item 1b), so `tiles`
  // counts only the materialized combined canvases, not the placeholders.
  useEffect(() => {
    return registerMemSource(
      'spectrogram',
      'Spectrogram retained tiles',
      () => {
        let colorTiles = 0
        let colorBytes = 0
        for (const c of allColorsRef.current) {
          colorTiles += c.colorTiles.length
          for (const t of c.colorTiles) colorBytes += t.data.byteLength
        }
        let tiles = 0
        let tileCanvasBytes = 0
        for (const o of allOffRef.current) {
          if (!o) continue
          for (const t of o.tiles) {
            if (!t.canvas) continue
            tiles += 1
            tileCanvasBytes += t.canvas.width * t.canvas.height * 4
          }
        }
        const db = displayBufRef.current
        const displayBufBytes = db ? db.buf.width * db.buf.height * 4 : 0
        return {
          colorTiles,
          colorBytes,
          tiles,
          tileCanvasBytes,
          displayBufBytes,
        }
      },
    )
  }, [])

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

  useEffect(() => {
    if (analysisMut.length === 0) {
      allColorsRef.current = []
      allOffRef.current = []
      tileLruRef.current.clear()
      return
    }
    const newColors: ChunkColorsState[] = []
    for (const chunk of analysisMut) {
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
  }, [analysisMut, dbRange, theme])

  // ---- FALLS THROUGH TO NEXT EFFECT ----

  // When freq scale, canvas height, or dpr changes, rebuild tile containers.
  // Tiles start empty (no canvas); the draw path materializes the visible ones
  // lazily and the LRU evicts the rest, so we don't paint anything here.
  useEffect(() => {
    const allColors = allColorsRef.current
    if (allColors.length === 0 || canvasHeight <= 0) return

    // Old tile objects are about to be replaced; drop their LRU accounting.
    tileLruRef.current.clear()

    const newOff: (OffscreenState | null)[] = []

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
      ensureTiles(off, colors.numFrames)
      newOff.push(off)
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
          tilesGenRef.current,
          canvasWidth,
          canvasHeight,
          allOffRef.current,
          analysisMut,
          timeToX,
          {
            allColors: allColorsRef.current,
            theme,
            freqToY,
            dpr,
            lru: tileLruRef.current,
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

      const allColors = allColorsRef.current
      const allOff = allOffRef.current

      let needFullRedraw = false

      // Resync caches on structural change (e.g. reconcileVoicingAt may merge or reorder
      // chunks). Find the first diverged index by identity, drop the tail, and widen
      // the repaint to the predecessor's start so lazy-grow + range paint below
      // rebuilds everything in one pass.
      let structuralResync = false
      {
        let firstDiverged = allColors.length
        let predecessorStart = 0
        let acc = 0
        for (let i = 0; i < allColors.length; i++) {
          if (
            i >= analysisMut.length ||
            allColors[i]!.chunk !== analysisMut[i]
          ) {
            firstDiverged = i
            break
          }
          predecessorStart = acc
          acc += analysisMut[i]!.frames.length
        }
        if (firstDiverged < allColors.length) {
          // Drop LRU accounting for tiles in the chunks being discarded.
          for (let i = firstDiverged; i < allOff.length; i++) {
            const o = allOff[i]
            if (o) truncateTiles(tileLruRef.current, o.tiles, 0)
          }
          allColors.length = firstDiverged
          allOff.length = firstDiverged
          effectiveFrom = Math.min(effectiveFrom, predecessorStart)
          needFullRedraw = true
          structuralResync = true
        }
      }

      for (let i = 0; i < allColors.length && i < analysisMut.length; i++) {
        const colors = allColors[i]!
        const chunk = analysisMut[i]!
        if (colors.numFrames > chunk.frames.length) {
          const tileCount = Math.ceil(chunk.frames.length / TILE_WIDTH)
          colors.numFrames = chunk.frames.length
          colors.colorTiles.length = tileCount
          colors.dbMax = chunkDbMax(chunk)
          const off = allOff[i]
          if (off) truncateTiles(tileLruRef.current, off.tiles, tileCount)
          needFullRedraw = true
        }
      }

      // Lazily grow per-chunk state for any new chunks that have received frames.
      while (allColors.length < analysisMut.length) {
        const i = allColors.length
        const chunk = analysisMut[i]!
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
      }

      if (allColors.length === 0) return

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
        const colors = allColors[chunkIdx]
        if (!colors) continue
        const chunk = analysisMut[chunkIdx]!

        const prevNumFrames = colors.numFrames
        const isExtending = localTo > prevNumFrames

        // Scan newly appended frames for a new peak (monotonic -- old frames
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

        if (!off && canvasHeight > 0) {
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
          // Tiles start empty; the redraw below materializes the visible ones
          // (each paints spectrogram colours + formant arcs together).
          ensureTiles(off, localTo)
          allOff[chunkIdx] = off
          needFullRedraw = true
        } else if (off) {
          if (isExtending) ensureTiles(off, localTo)

          // colorTiles (the spec source) were updated above by computeColorsRange.
          // Repaint the affected materialized tiles in full — each repaint
          // re-blits the colours and redraws the formant arcs on top, so a merged
          // opaque tile stays correct without surgically editing one layer. A
          // recolor (new dbMax) repaints the whole chunk; otherwise just the
          // changed range. Off-screen/unmaterialized tiles rebuild lazily on blit.
          const repaintFromFrame = fullChunkRecolor ? 0 : localFrom
          const firstTile = Math.floor(repaintFromFrame / TILE_WIDTH)
          const lastTile = Math.floor((localTo - 1) / TILE_WIDTH)
          for (let t = firstTile; t <= lastTile; t++) {
            repaintTile(
              off,
              colors,
              chunk.frames,
              t,
              theme,
              freqToY,
              dpr,
              tileLruRef.current,
            )
          }
          if (fullChunkRecolor) needFullRedraw = true

          // Refresh the on-screen strip for the changed time range without a full
          // repaint. Start one frame early so a formant arc's left-bleeding
          // shadow at the edge is included.
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
              allColors,
              theme,
              freqToY,
              dpr,
              lru: tileLruRef.current,
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
