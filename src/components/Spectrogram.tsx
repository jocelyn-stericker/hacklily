// Renders frequency spectrogram with color-mapped intensity and formant markers.

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/AnalysisFrame'
import { getFrame, totalFrames } from '#/lib/AnalysisFrame'
import { nextPow2 } from '#/lib/mathUtils'
import { TILE_WIDTH } from '#/lib/tileConfig'

import { INFERNO_COLOURMAP, WYOR_COLOURMAP } from './colourmap'
import { InCanvas, usePlotPad, usePlotSize, useTimeToX, useHzToY } from './Plot'
import { useColourScheme } from './useColourScheme'

const FPS_WINDOW_MS = 1000

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

export interface SpectrogramHandle {
  /** Call after appending frames [from, analysis.length) to the stored analysis. */
  append: (from: number) => void
  /** Call after mutating frames [from, to) of the stored analysis in-place. */
  patch: (from: number, to: number) => void
}

interface ColorsState {
  // Transposed: data[b * capacity + f] — sequential reads during row-major render.
  data: Uint32Array
  capacity: number
  numFrames: number
  numBins: number
  firstBinHz: number
  freqStepHz: number
  timeStepSamples: number
  sampleRate: number
  dbMin: number
  dbRange: number
  analysis: AnalysisChunk[]
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
  binForY: Int32Array
  canvasHeight: number
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
  // Actual frame index at display pixel 0 (updated to account for integer rounding,
  // keeping rounding error bounded to ±0.5px across frames).
  lastSrcX0: number
  lastDxPerFrame: number
  lastTilesGen: number
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
  state: ColorsState,
  from: number,
  to: number,
  theme: Theme,
): void {
  const { data, capacity, numBins, dbMin, dbRange, analysis } = state
  for (let f = from; f < to; f++) {
    const spectrum = getFrame(analysis, f)!.spectrum
    for (let b = 0; b < numBins; b++) {
      const raw = spectrum[b]!
      const db = LN10_10 * Math.log(raw)
      const norm = Math.max(0, Math.min(1, (db - dbMin) / dbRange))
      data[b * capacity + f] = theme.colourmap[Math.round(norm * 255)]!
    }
  }
}

function ensureColorsCapacity(state: ColorsState, needed: number): void {
  if (state.capacity >= needed) return
  const newCap = nextPow2(needed)
  const newData = new Uint32Array(state.numBins * newCap)
  for (let b = 0; b < state.numBins; b++) {
    newData.set(
      state.data.subarray(
        b * state.capacity,
        b * state.capacity + state.numFrames,
      ),
      b * newCap,
    )
  }
  state.data = newData
  state.capacity = newCap
}

function ensureTiles(
  off: { tiles: Tile[]; canvasHeight: number },
  needed: number,
  theme: Theme,
): void {
  const numTiles = Math.ceil(needed / TILE_WIDTH)
  while (off.tiles.length < numTiles) {
    const startFrame = off.tiles.length * TILE_WIDTH
    const canvas = new OffscreenCanvas(TILE_WIDTH, off.canvasHeight)
    const ctx = canvas.getContext('2d')!
    const imgData = ctx.createImageData(TILE_WIDTH, off.canvasHeight)
    const u32 = new Uint32Array(imgData.data.buffer)
    u32.fill(theme.bgU32)
    off.tiles.push({ canvas, ctx, startFrame, imgData, u32 })
  }
}

function paintColumnsToOffscreen(
  off: OffscreenState,
  colors: ColorsState,
  from: number,
  to: number,
  theme: Theme,
): void {
  if (to <= from) return
  const { tiles, binForY, canvasHeight } = off
  const { data, capacity } = colors
  const firstTile = Math.floor(from / TILE_WIDTH)
  const lastTile = Math.floor((to - 1) / TILE_WIDTH)
  for (let t = firstTile; t <= lastTile && t < tiles.length; t++) {
    const tile = tiles[t]!
    const absFrom = Math.max(from, tile.startFrame)
    const absTo = Math.min(to, tile.startFrame + TILE_WIDTH)
    const numCols = absTo - absFrom
    const localFrom = absFrom - tile.startFrame
    const { imgData, u32 } = tile
    for (let y = 0; y < canvasHeight; y++) {
      const b = binForY[y] ?? -1
      const dst = y * TILE_WIDTH + localFrom
      if (b < 0) {
        u32.fill(theme.bgU32, dst, dst + numCols)
      } else {
        u32.set(
          data.subarray(b * capacity + absFrom, b * capacity + absTo),
          dst,
        )
      }
    }
    tile.ctx.putImageData(imgData, 0, 0, localFrom, 0, numCols, canvasHeight)
  }
}

// Repaint formant tiles from fromTile onward.
// fromFrame: first frame to repaint — pixels before it are left intact so we
//   can skip redrawing historical frames that haven't changed.
// toFrame: exclusive upper bound — frames at or after this index are not
//   touched, letting the caller handle them via appendFormantTiles.
function paintFormantTiles(
  off: FormantOffscreenState,
  analysis: AnalysisChunk[],
  fromTile: number,
  freqToY: (hz: number) => number,
  dpr: number,
  fromFrame = 0,
  toFrame = Infinity,
): void {
  const numFrames = Math.min(totalFrames(analysis), toFrame)
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
      tile.ctx.beginPath()
      let penDown = false
      // Connect from the frame before tileFromFrame (moveTo only — doesn't draw,
      // just anchors the pen so the first lineTo produces a joined segment).
      // For the first tile this lands in the preserved region; for later tiles
      // prevF - tile.startFrame = -1 gives the same cross-tile join as before.
      const prevF = tileFromFrame - 1
      if (prevF >= 0) {
        const prevSample = getFrame(analysis, prevF)
        if (
          prevSample?.pitchDetected &&
          prevSample.speechDetected &&
          prevSample[key] !== null
        ) {
          tile.ctx.moveTo(prevF - tile.startFrame, freqToY(prevSample[key]))
          penDown = true
        }
      }
      for (let f = tileFromFrame; f < frameEnd; f++) {
        const sample = getFrame(analysis, f)!
        if (
          !(sample.pitchDetected && sample.speechDetected) ||
          sample[key] === null
        ) {
          penDown = false
          continue
        }
        const y = freqToY(sample[key])
        const localX = f - tile.startFrame
        if (!penDown) tile.ctx.moveTo(localX, y)
        else tile.ctx.lineTo(localX, y)
        penDown = true
      }
      tile.ctx.lineJoin = 'round'
      tile.ctx.lineCap = 'round'
      tile.ctx.shadowColor = FORMANT_SHADOW_COLOUR
      tile.ctx.shadowBlur = FORMANT_SHADOW_BLUR * dpr
      tile.ctx.strokeStyle = color
      tile.ctx.lineWidth = FORMANT_LINE_WIDTH * dpr
      tile.ctx.stroke()
      tile.ctx.shadowBlur = 0
    }
  }
}

// Additive paint of new frames [from, to) onto existing tile content.
// Does NOT clear tiles, so cost is O(to - from), not O(tile frames). Used by append.
function appendFormantTiles(
  off: FormantOffscreenState,
  analysis: AnalysisChunk[],
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
      tile.ctx.beginPath()
      let penDown = false
      // Connect from the frame before absFrom, which may be in a prior tile.
      // prevF - tile.startFrame evaluates to -1 at a tile boundary, which
      // places the moveTo just off-canvas so the stroke joins at the edge.
      const prevF = absFrom - 1
      if (prevF >= 0) {
        const prevSample = getFrame(analysis, prevF)
        if (
          prevSample?.pitchDetected &&
          prevSample.speechDetected &&
          prevSample[key] !== null
        ) {
          tile.ctx.moveTo(prevF - tile.startFrame, freqToY(prevSample[key]))
          penDown = true
        }
      }
      for (let f = absFrom; f < absTo; f++) {
        const sample = getFrame(analysis, f)!
        if (
          !(sample.pitchDetected && sample.speechDetected) ||
          sample[key] === null
        ) {
          penDown = false
          continue
        }
        const y = freqToY(sample[key])
        const localX = f - tile.startFrame
        if (!penDown) tile.ctx.moveTo(localX, y)
        else tile.ctx.lineTo(localX, y)
        penDown = true
      }
      tile.ctx.lineJoin = 'round'
      tile.ctx.lineCap = 'round'
      tile.ctx.shadowColor = FORMANT_SHADOW_COLOUR
      tile.ctx.shadowBlur = FORMANT_SHADOW_BLUR * dpr
      tile.ctx.strokeStyle = color
      tile.ctx.lineWidth = FORMANT_LINE_WIDTH * dpr
      tile.ctx.stroke()
      tile.ctx.shadowBlur = 0
    }
  }
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

// Paint frames [from, to) into the display buffer without a full repaint.
// Used by append so newly arrived frames appear immediately even if the view is stationary.
function updateDisplayBufForFrames(
  db: DisplayBufState | null,
  off: OffscreenState,
  formantOff: FormantOffscreenState | null,
  from: number,
  to: number,
  theme: Theme,
): void {
  if (!db || isNaN(db.lastSrcX0) || isNaN(db.lastDxPerFrame)) return
  const { lastSrcX0, lastDxPerFrame, width, height } = db
  const x1 = Math.max(
    0,
    Math.floor((from - lastSrcX0) * lastDxPerFrame - lastDxPerFrame),
  )
  const x2 = Math.min(
    width,
    Math.ceil((to - lastSrcX0) * lastDxPerFrame + lastDxPerFrame),
  )
  if (x1 >= x2) return
  const stripSrcX0 = lastSrcX0 + x1 / lastDxPerFrame
  const stripSrcW = (x2 - x1) / lastDxPerFrame
  db.ctx.fillStyle = theme.bgStyle
  db.ctx.fillRect(x1, 0, x2 - x1, height)
  db.ctx.save()
  db.ctx.translate(x1, 0)
  blitTiles(
    db.ctx,
    off.tiles,
    off.canvasHeight,
    stripSrcX0,
    stripSrcW,
    lastDxPerFrame,
    height,
  )
  if (formantOff)
    blitTiles(
      db.ctx,
      formantOff.tiles,
      formantOff.canvasHeight,
      stripSrcX0,
      stripSrcW,
      lastDxPerFrame,
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
  off: OffscreenState | null,
  formantOff: FormantOffscreenState | null,
  timeToX: (timeSec: number) => number,
  timeStepSec: number,
  theme: Theme,
): void {
  if (!off || timeStepSec <= 0) {
    mainCtx.fillStyle = theme.bgStyle
    mainCtx.fillRect(0, 0, width, height)
    return
  }

  // Offscreen x = frame_index; timeToX is linear so one timeStepSec = dxPerFrame px.
  // srcX0 is the (possibly fractional) frame index at the left display edge.
  const dxPerFrame = timeToX(timeStepSec) - timeToX(0)
  if (dxPerFrame <= 0) {
    mainCtx.fillStyle = theme.bgStyle
    mainCtx.fillRect(0, 0, width, height)
    return
  }
  const srcX0 = -timeToX(0) / dxPerFrame
  const srcW = width / dxPerFrame

  // Ensure display buffer matches current canvas dimensions.
  let db = displayBufRef.current
  if (!db || db.width !== width || db.height !== height) {
    const buf = new OffscreenCanvas(width, height)
    const ctx = buf.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    db = {
      buf,
      ctx,
      width,
      height,
      lastSrcX0: NaN,
      lastDxPerFrame: NaN,
      lastTilesGen: -1,
    }
    displayBufRef.current = db
  }

  const sameTiles = db.lastTilesGen === tilesGen
  const sameDx =
    !isNaN(db.lastDxPerFrame) && Math.abs(db.lastDxPerFrame - dxPerFrame) < 1e-6
  const pixelShift =
    sameTiles && sameDx && !isNaN(db.lastSrcX0)
      ? Math.round((db.lastSrcX0 - srcX0) * dxPerFrame)
      : NaN
  const canIncremental = !isNaN(pixelShift) && Math.abs(pixelShift) < width

  if (!canIncremental) {
    // Full repaint: composit spectrogram + formant layers into the display buffer.
    db.ctx.fillStyle = theme.bgStyle
    db.ctx.fillRect(0, 0, width, height)
    blitTiles(
      db.ctx,
      off.tiles,
      off.canvasHeight,
      srcX0,
      srcW,
      dxPerFrame,
      height,
    )
    if (formantOff)
      blitTiles(
        db.ctx,
        formantOff.tiles,
        formantOff.canvasHeight,
        srcX0,
        srcW,
        dxPerFrame,
        height,
      )
    db.lastSrcX0 = srcX0
    db.lastDxPerFrame = dxPerFrame
    db.lastTilesGen = tilesGen
  } else if (pixelShift !== 0) {
    // Incremental scroll: shift existing content and paint only the newly revealed strip.
    // The self-copy is spec-required to snapshot before writing (no aliasing).
    db.ctx.drawImage(db.buf, pixelShift, 0)
    // Track actual buffer position so rounding error stays bounded to ±0.5px per frame.
    db.lastSrcX0 -= pixelShift / dxPerFrame

    const stripX = pixelShift < 0 ? width + pixelShift : 0
    const stripW = Math.abs(pixelShift)
    const stripSrcX0 = srcX0 + stripX / dxPerFrame
    const stripSrcW = stripW / dxPerFrame

    db.ctx.fillStyle = theme.bgStyle
    db.ctx.fillRect(stripX, 0, stripW, height)
    // Translate so blitTiles can use its normal destX = (frame - srcX0)*dxPerFrame logic,
    // which places frame stripSrcX0 at pixel 0 — and our translate shifts that to stripX.
    db.ctx.save()
    db.ctx.translate(stripX, 0)
    blitTiles(
      db.ctx,
      off.tiles,
      off.canvasHeight,
      stripSrcX0,
      stripSrcW,
      dxPerFrame,
      height,
    )
    if (formantOff)
      blitTiles(
        db.ctx,
        formantOff.tiles,
        formantOff.canvasHeight,
        stripSrcX0,
        stripSrcW,
        dxPerFrame,
        height,
      )
    db.ctx.restore()
  }
  // pixelShift === 0: view unchanged, re-blit existing displayBuf as-is.

  mainCtx.drawImage(db.buf, 0, 0)
}

export function Spectrogram({
  analysis,
  dbMin,
  dbRange,
  ref,
  debug = false,
}: {
  analysis: AnalysisChunk[]
  dbMin: number
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

  const colorsRef = useRef<ColorsState | null>(null)
  const offRef = useRef<OffscreenState | null>(null)
  const formantOffRef = useRef<FormantOffscreenState | null>(null)
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

  // Fully recompute colors when analysis changes
  useEffect(() => {
    if (analysis.length === 0) {
      colorsRef.current = null
      offRef.current = null
      formantOffRef.current = null
      return
    }
    const numFrames = totalFrames(analysis)
    const numBins = analysis[0]!.frames[0]!.spectrum.length
    const { firstBinHz, freqStepHz, timeStepSamples, sampleRate } = analysis[0]!
    const capacity = nextPow2(numFrames)
    const colors: ColorsState = {
      data: new Uint32Array(numBins * capacity),
      capacity,
      numFrames,
      numBins,
      firstBinHz,
      freqStepHz,
      timeStepSamples,
      sampleRate,
      dbMin,
      dbRange,
      analysis,
    }
    computeColorsRange(colors, 0, numFrames, theme)
    colorsRef.current = colors
  }, [analysis, dbMin, dbRange, theme])

  // ---- FALLS THROUGH TO NEXT EFFECT ----

  // When freq scale, canvas height, or dpr changes, rebuild tile canvases.
  useEffect(() => {
    const colors = colorsRef.current
    if (!colors || colors.numFrames === 0 || canvasHeight <= 0) return

    const binForY = buildBinForY(
      colors.numBins,
      colors.firstBinHz,
      colors.freqStepHz,
      freqToY,
      canvasHeight,
    )
    const off: OffscreenState = { tiles: [], binForY, canvasHeight }
    ensureTiles(off, colors.numFrames, theme)
    offRef.current = off
    paintColumnsToOffscreen(off, colors, 0, colors.numFrames, theme)

    const formantOff: FormantOffscreenState = { tiles: [], canvasHeight }
    ensureTiles(formantOff, colors.numFrames, theme)
    formantOffRef.current = formantOff
    paintFormantTiles(formantOff, analysis, 0, freqToY, dpr)

    tilesGenRef.current += 1

    // Note: this must include everything in the previous effect
  }, [analysis, dbMin, dbRange, canvasHeight, freqToY, dpr, theme])

  const fromRef = useRef<number | null>(null)
  // Infinity = "to totalFrames" (append pending); explicit number = max patch to
  const pendingToRef = useRef<number>(0)
  const drawFrame = useRef<number | null>(null)

  // ---- FALLS THROUGH TO NEXT EFFECT ----

  useEffect(() => {
    if (!canvas) return

    // Hoist getContext so it isn't re-called on every animation frame.
    const ctx = canvas.getContext('2d')!

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
          offRef.current,
          formantOffRef.current,
          timeToX,
          colorsRef.current
            ? colorsRef.current.timeStepSamples / colorsRef.current.sampleRate
            : 0,
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
    dbMin,
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

      if (!colorsRef.current) {
        if (pendingTo !== Infinity) return // patch with no analysis → bail
        const numFrames = totalFrames(analysis)
        const numBins = analysis[0]!.frames[0]!.spectrum.length
        const { firstBinHz, freqStepHz, timeStepSamples, sampleRate } =
          analysis[0]!
        const capacity = nextPow2(numFrames)
        const colors: ColorsState = {
          data: new Uint32Array(numBins * capacity),
          capacity,
          numFrames,
          numBins,
          firstBinHz,
          freqStepHz,
          timeStepSamples,
          sampleRate,
          dbMin,
          dbRange,
          analysis,
        }
        computeColorsRange(colors, 0, numFrames, theme)
        colorsRef.current = colors
      }

      const colors = colorsRef.current
      const prevNumFrames = colors.numFrames
      const effectiveTo =
        pendingTo === Infinity ? totalFrames(colors.analysis) : pendingTo
      if (effectiveFrom >= effectiveTo) return

      const isExtending = effectiveTo > prevNumFrames
      if (isExtending) ensureColorsCapacity(colors, effectiveTo)
      computeColorsRange(colors, effectiveFrom, effectiveTo, theme)
      if (isExtending) colors.numFrames = effectiveTo

      if (!offRef.current && canvasHeight > 0) {
        const binForY = buildBinForY(
          colors.numBins,
          colors.firstBinHz,
          colors.freqStepHz,
          freqToY,
          canvasHeight,
        )
        const off: OffscreenState = { tiles: [], binForY, canvasHeight }
        ensureTiles(off, effectiveTo, theme)
        offRef.current = off
        paintColumnsToOffscreen(off, colors, 0, effectiveTo, theme)
        const formantOff: FormantOffscreenState = { tiles: [], canvasHeight }
        ensureTiles(formantOff, effectiveTo, theme)
        formantOffRef.current = formantOff
        paintFormantTiles(formantOff, analysis, 0, freqToY, dpr)
        tilesGenRef.current += 1
      } else if (offRef.current) {
        if (isExtending) ensureTiles(offRef.current, effectiveTo, theme)
        paintColumnsToOffscreen(
          offRef.current,
          colors,
          effectiveFrom,
          effectiveTo,
          theme,
        )

        if (!formantOffRef.current) {
          const formantOff: FormantOffscreenState = { tiles: [], canvasHeight }
          ensureTiles(formantOff, effectiveTo, theme)
          formantOffRef.current = formantOff
          paintFormantTiles(formantOff, analysis, 0, freqToY, dpr)
          // formantOff newly created: [0, effectiveFrom) was never painted,
          // so a full repaint is needed to show historical formant lines.
          tilesGenRef.current += 1
        } else {
          if (isExtending)
            ensureTiles(formantOffRef.current, effectiveTo, theme)

          if (isExtending && effectiveFrom >= prevNumFrames) {
            // Pure append: additive paint, then update display buffer for new region.
            appendFormantTiles(
              formantOffRef.current,
              analysis,
              effectiveFrom,
              effectiveTo,
              freqToY,
              dpr,
            )
            updateDisplayBufForFrames(
              displayBufRef.current,
              offRef.current,
              formantOffRef.current,
              effectiveFrom,
              effectiveTo,
              theme,
            )
          } else {
            // Patch or mixed: repaint only the affected range, then append any
            // new frames separately so we skip redrawing unchanged history.
            paintFormantTiles(
              formantOffRef.current,
              analysis,
              Math.floor(effectiveFrom / TILE_WIDTH),
              freqToY,
              dpr,
              effectiveFrom,
              isExtending ? prevNumFrames : undefined,
            )
            if (isExtending) {
              appendFormantTiles(
                formantOffRef.current,
                analysis,
                prevNumFrames,
                effectiveTo,
                freqToY,
                dpr,
              )
            }
            tilesGenRef.current += 1
          }
        }
      }

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
  }, [canvasHeight, analysis, freqToY, dbMin, dbRange, dpr, theme])

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
