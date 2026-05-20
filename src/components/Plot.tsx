// Generic plot container.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { hzToBark } from '#/lib/bark'
import { cn } from '#/lib/utils'

import type { TimelineState } from './useTimelineState'
import { VirtualScrollArea } from './VirtualScrollArea'

export const PLOT_PAD_B = 44
export const PLOT_PAD_L = 72
export const PLOT_PAD_T = 0

export interface YAxisFreq {
  type: 'freq'
  fMinHz: number
  fMaxHz: number
  hover: { f0: number; f1: number | null; f2: number | null } | null
}

export interface YAxisAmplitude {
  type: 'amplitude'
  ampMaxNorm: number
}

export type YAxis = YAxisFreq | YAxisAmplitude

export interface Padding {
  left: number
  right: 0
  top: number
  bottom: number
}

export interface Props {
  onScroll: (t: number) => void
  onZoom: (xPercentage: number, amount: number) => void
  onClick: (t: number) => void
  onHover: (t: number | null) => void
  yAxis: YAxis
  yAxisVisible: boolean
  xAxisVisible: boolean
  timelineState: TimelineState
  debug?: boolean
  className?: string
  children: React.ReactNode
  virtualWidthSec: number
}

function useTargetSize(element: HTMLElement | null) {
  const [dpr, setDpr] = useState(() =>
    typeof devicePixelRatio === 'undefined' ? 1 : devicePixelRatio,
  )
  const [clientWidth, setClientWidth] = useState(
    () => element?.clientWidth ?? 0,
  )
  const [clientHeight, setClientHeight] = useState(
    () => element?.clientHeight ?? 0,
  )

  useEffect(() => {
    const mqString = `(resolution: ${dpr}dppx)`
    const media = matchMedia(mqString)
    const updateDpr = () => setDpr(window.devicePixelRatio)
    media.addEventListener('change', updateDpr)
    return () => media.removeEventListener('change', updateDpr)
  }, [dpr])

  useEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(() => {
      setClientHeight(element.clientHeight)
      setClientWidth(element.clientWidth)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, dpr])

  return { height: clientHeight, width: clientWidth, dpr }
}

function formatFreq(hz: number) {
  return hz >= 1000 ? `${Math.round(hz / 100) / 10}kHz` : `${Math.round(hz)}Hz`
}

function formatAmp(norm: number) {
  return String(norm)
}

function formatTime(sec: number) {
  return `${Math.round(sec * 100) / 100}s`
}

const CANDIDATE_GRID_HZ = [
  20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 700, 1000,
  1200, 1500, 2000, 2500, 3000, 4000, 5000, 7000, 10000, 12000, 15000, 20000,
]

export function generateGridHz({
  fMinHz,
  fMaxHz,
  height,
  plotPad,
  dpr = 1,
}: {
  fMinHz: number
  fMaxHz: number
  height: number
  plotPad: Padding
  dpr?: number
}): number[] {
  const minSepPx = 40 * dpr
  const inRange = CANDIDATE_GRID_HZ.filter((f) => f > fMinHz && f < fMaxHz)
  const result: number[] = []

  for (const f of inRange) {
    const y = hzToY({
      freqHz: f,
      height: height,
      dpr,
      fMinHz,
      fMaxHz,
      plotPad,
    })
    if (
      result.every(
        (e) =>
          Math.abs(
            hzToY({
              freqHz: e,
              height: height,
              dpr,
              fMinHz,
              fMaxHz,
              plotPad,
            }) - y,
          ) >= minSepPx,
      )
    ) {
      result.push(f)
    }
  }
  return result
}

const CANDIDATE_STEP_S: [number, ...number[]] = [
  0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60,
]

function getStepSec(tMinSec: number, tMaxSec: number): number {
  const approxStep = (tMaxSec - tMinSec) / 10
  let bestStep = CANDIDATE_STEP_S[0]
  let bestDiff = Infinity
  for (const step of CANDIDATE_STEP_S) {
    const diff = Math.abs(approxStep - step)
    if (diff < bestDiff) {
      bestDiff = diff
      bestStep = step
    }
  }
  return bestStep
}

interface TimeGuide {
  t: number
  type: 'cursor' | 'hover' | 'step'
}

export function generateGridSec({
  tMinSec,
  tMaxSec,
  cursorSec,
  hoverSec,
  width,
  dpr = 1,
}: {
  tMinSec: number
  tMaxSec: number
  cursorSec: number
  hoverSec: number | null
  width: number
  dpr?: number
}): TimeGuide[] {
  const minSepPx = 60 * dpr
  const stepSec = getStepSec(tMinSec, tMaxSec)

  const inRange = []
  for (
    let s = (Math.ceil(tMinSec / stepSec) - 1) * stepSec;
    s < tMaxSec;
    s += stepSec
  ) {
    if (s >= 0) {
      inRange.push(s)
    }
  }
  const result: TimeGuide[] = []

  const secPerPx = (tMaxSec - tMinSec) / width

  for (const t of inRange) {
    const x = (t - tMinSec) / secPerPx
    if (
      result.every(
        (e) => Math.abs((e.t - tMinSec) / secPerPx - x) >= minSepPx,
      ) &&
      t > 0
    ) {
      result.push({ t, type: 'step' })
    }
  }

  if (cursorSec >= tMinSec && cursorSec < tMaxSec) {
    result.push({ t: cursorSec, type: 'cursor' })
  }
  if (hoverSec != null && hoverSec >= tMinSec && hoverSec < tMaxSec) {
    result.push({ t: hoverSec, type: 'hover' })
  }

  return result
}

export function ampToY({
  ampNorm,
  height,
  dpr = 1,
  ampMaxNorm,
  plotPad,
}: {
  ampNorm: number
  height: number
  dpr?: number
  ampMaxNorm: number
  plotPad: Padding
}): number {
  // Amplitude is centered: 0 is at mid-height, ±ampMaxNorm at top/bottom.
  // frac = 0.5 ± (ampNorm / 2*ampMaxNorm) maps [0..ampMaxNorm] to [0.5..1] and [-ampMaxNorm..0] to [0..0.5].
  const frac = ampNorm / ampMaxNorm / 2 + 0.5
  return (
    plotPad.top * dpr +
    frac * (height * dpr - plotPad.top * dpr - plotPad.bottom * dpr)
  )
}

export function hzToY({
  freqHz,
  height,
  dpr = 1,
  fMinHz,
  fMaxHz,
  plotPad,
}: {
  freqHz: number
  height: number
  dpr?: number
  fMinHz: number
  fMaxHz: number
  plotPad: Padding
}): number {
  // Bark scale maps frequency nonlinearly to perceptual pitch (log-like).
  // Y-axis is inverted: lower freq = higher y-pixel, so frac is subtracted from 1.
  const frac =
    1 -
    (hzToBark(freqHz) - hzToBark(fMinHz)) /
      (hzToBark(fMaxHz) - hzToBark(fMinHz))
  return (
    plotPad.top * dpr +
    frac * (height * dpr - plotPad.top * dpr - plotPad.bottom * dpr)
  )
}

export function timeToX({
  timeSec,
  width,
  dpr = 1,
  tMinSec,
  tMaxSec,
  plotPad,
}: {
  timeSec: number
  width: number
  dpr?: number
  tMinSec: number
  tMaxSec: number
  plotPad: Padding
}): number {
  const secPerPx = (tMaxSec - tMinSec) / (width * dpr - plotPad.left * dpr)
  return plotPad.left * dpr + (timeSec - tMinSec) / secPerPx
}

// ── Context ───────────────────────────────────────────────────────────────────

interface PlotContextValue {
  plotPad: Padding
  height: number
  width: number
  tMinSec: number
  tMaxSec: number
  dpr: number
  cursorSec: number
  hoverSec: number | null
  yAxis: YAxis
}

const PlotCtx = createContext<PlotContextValue | null>(null)

function usePlot(): PlotContextValue {
  const ctx = useContext(PlotCtx)
  if (!ctx) throw new Error('usePlot must be used within a Plot')
  return ctx
}

// ── Conversion hooks ──────────────────────────────────────────────────────────

export function usePlotPad(): Padding {
  return usePlot().plotPad
}

export function usePlotSize() {
  const plot = usePlot()
  return { width: plot.width, height: plot.height, dpr: plot.dpr }
}

export enum InCanvas {
  No = 0,
  Yes = 1,
}

const NO_PADDING: Padding = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
}

export function useTimeToX(inCanvas: InCanvas): (timeSec: number) => number {
  const { width, tMinSec, tMaxSec, plotPad, dpr } = usePlot()
  return useCallback(
    (timeSec: number) =>
      timeToX({
        timeSec,
        width: inCanvas ? width - plotPad.left - plotPad.right : width,
        tMinSec,
        tMaxSec,
        plotPad: inCanvas ? NO_PADDING : plotPad,
        dpr: inCanvas ? dpr : 1,
      }),
    [width, tMinSec, tMaxSec, plotPad, dpr, inCanvas],
  )
}

export function useXToTime(inCanvas: InCanvas): (x: number) => number {
  const { width, tMinSec, tMaxSec, plotPad, dpr } = usePlot()
  return useCallback(
    (x: number) => {
      const secPerPx =
        (tMaxSec - tMinSec) / (inCanvas ? width * dpr : width - plotPad.left)
      return tMinSec + (x - (inCanvas ? plotPad.left : 0)) * secPerPx
    },
    [width, tMinSec, tMaxSec, plotPad, dpr, inCanvas],
  )
}

export function useHzToY(inCanvas: InCanvas): (freqHz: number) => number {
  const { height, plotPad, yAxis, dpr } = usePlot()
  const fMinHz = yAxis.type === 'freq' ? yAxis.fMinHz : 0
  const fMaxHz = yAxis.type === 'freq' ? yAxis.fMaxHz : 1
  const fn = useCallback(
    (freqHz: number) =>
      hzToY({
        freqHz,
        height: inCanvas ? height - plotPad.top - plotPad.bottom : height,
        fMinHz,
        fMaxHz,
        plotPad: inCanvas ? NO_PADDING : plotPad,
        dpr: inCanvas ? dpr : 1,
      }),
    [height, plotPad, fMinHz, fMaxHz, dpr, inCanvas],
  )
  if (yAxis.type !== 'freq') throw new Error('useHzToY requires a freq yAxis')
  return fn
}

export function useAmpToY(inCanvas: InCanvas): (ampNorm: number) => number {
  const { height, plotPad, yAxis, dpr } = usePlot()
  const ampMaxNorm = yAxis.type === 'amplitude' ? yAxis.ampMaxNorm : 1
  const fn = useCallback(
    (ampNorm: number) =>
      ampToY({
        ampNorm,
        height,
        ampMaxNorm,
        plotPad: inCanvas ? NO_PADDING : plotPad,
        dpr: inCanvas ? dpr : 1,
      }),
    [height, plotPad, ampMaxNorm, dpr, inCanvas],
  )
  if (yAxis.type !== 'amplitude')
    throw new Error('useAmpToY requires an amplitude yAxis')
  return fn
}

function useToY(inCanvas: InCanvas): (value: number) => number {
  const { height, plotPad, yAxis, dpr } = usePlot()
  return useCallback(
    (value: number) => {
      if (yAxis.type === 'freq') {
        return hzToY({
          freqHz: value,
          height,
          fMinHz: yAxis.fMinHz,
          fMaxHz: yAxis.fMaxHz,
          plotPad,
        })
      }
      return ampToY({
        ampNorm: value,
        height,
        ampMaxNorm: yAxis.ampMaxNorm,
        plotPad,
        dpr: inCanvas ? dpr : 1,
      })
    },
    [yAxis, height, plotPad, inCanvas, dpr],
  )
}

// ── Internal sub-components ───────────────────────────────────────────────────

function YAxisTickAndLabel({
  hzOrAmp,
  tickClassName,
  labelClassName,
}: {
  hzOrAmp: number
  tickClassName: string
  labelClassName: string
}) {
  const { yAxis } = usePlot()
  const toY = useToY(InCanvas.No)

  return (
    <div
      className="absolute left-0 right-0"
      style={{
        top: toY(hzOrAmp),
        transform: 'translateY(-50%)',
      }}
    >
      {/* Frequency label */}
      <span
        className={cn(
          'absolute right-2.5 font-mono text-md leading-none',
          labelClassName,
        )}
        style={{ transform: 'translateY(-50%)', top: '50%' }}
      >
        {yAxis.type === 'freq' ? formatFreq(hzOrAmp) : formatAmp(hzOrAmp)}
      </span>

      {/* Tick mark */}
      <div
        className={cn(
          'absolute right-0 h-px w-2 translate-x-1/2 -translate-y-1/2',
          tickClassName,
        )}
      />
    </div>
  )
}

function YAxisStrip({ gridHzOrAmp }: { gridHzOrAmp: number[] }) {
  const { plotPad, yAxis } = usePlot()

  return (
    <div
      className="absolute inset-y-0 left-0 select-none"
      style={{ width: plotPad.left }}
    >
      {/* Dark background strip */}
      <div className="absolute inset-0 bg-white dark:bg-[#0e0e14]" />

      {/* Right-edge vertical border */}
      <div
        className="absolute right-0 bg-[#2a2a3a]"
        style={{ top: plotPad.top, bottom: plotPad.bottom, width: 1 }}
      />

      {/* Grid lines + ticks */}
      {gridHzOrAmp.map((hzOrAmp) => {
        return (
          <YAxisTickAndLabel
            key={hzOrAmp}
            hzOrAmp={hzOrAmp}
            labelClassName="text-[#555566] "
            tickClassName="bg-[#333344]"
          />
        )
      })}
      {yAxis.type === 'freq' && yAxis.hover ? (
        <>
          {yAxis.hover.f0 ? (
            <YAxisTickAndLabel
              labelClassName="text-black dark:text-white bg-white dark:bg-black"
              tickClassName="bg-black dark:bg-white w-3 h-3 rounded-full"
              hzOrAmp={yAxis.hover.f0}
            />
          ) : null}
          {yAxis.hover.f1 ? (
            <YAxisTickAndLabel
              hzOrAmp={yAxis.hover.f1}
              labelClassName="text-[#00e5ff] bg-white dark:bg-black"
              tickClassName="bg-[#00e5ff] w-3 h-3 rounded-full"
            />
          ) : null}
          {yAxis.hover.f2 ? (
            <YAxisTickAndLabel
              hzOrAmp={yAxis.hover.f2}
              labelClassName="text-[#00e5ff] bg-white dark:bg-black"
              tickClassName="bg-[#00e5ff] w-3 h-3 rounded-full"
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function XAxisTickAndLabel({ guide }: { guide: TimeGuide }) {
  const { plotPad } = usePlot()
  const toX = useTimeToX(InCanvas.No)

  return (
    <div
      className="absolute top-0 bottom-0"
      style={{
        left: toX(guide.t) - plotPad.left,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Time label */}
      <span
        className={cn(
          'absolute top-2.5 font-mono text-lg leading-none -translate-x-1/2 text-nowrap',
          guide.type === 'step' && 'text-[#555566]',
          guide.type === 'cursor' &&
            'text-white dark:text-black bg-black dark:bg-white',
          guide.type === 'hover' &&
            'dark:text-[#00000099] dark:bg-[#ffffff99] text-[#ffffff99] bg-black',
        )}
      >
        {formatTime(guide.t)}
      </span>
      {/* Tick mark */}
      <div
        className={cn(
          'absolute right-0 left-0 w-px h-2',
          guide.type === 'step' && 'bg-[#333344]',
          guide.type === 'cursor' && 'bg-black w-0.5',
        )}
      />
    </div>
  )
}

function XAxisStrip({ grid }: { grid: TimeGuide[] }) {
  const { plotPad } = usePlot()

  return (
    <div
      className="absolute inset-y-0 bottom-0 select-none w-full top-auto"
      style={{ height: plotPad.bottom }}
    >
      {/* Dark background strip */}
      <div
        className="absolute inset-0 bg-white dark:bg-[#0e0e14] overflow-hidden"
        style={{ left: plotPad.left }}
      >
        {grid
          .filter((guide) => guide.type === 'step')
          .map((guide) => (
            <XAxisTickAndLabel key={guide.t + guide.type} guide={guide} />
          ))}
      </div>
      {/* Ticks & labels to not clip */}
      <div className="absolute inset-0" style={{ left: plotPad.left }}>
        {grid
          .filter((guide) => guide.type !== 'step')
          .map((guide) => (
            <XAxisTickAndLabel key={guide.t + guide.type} guide={guide} />
          ))}
      </div>

      {/* Top-edge horizontal border */}
      <div
        className="absolute right-0 bg-[#2a2a3a]"
        style={{ bottom: plotPad.bottom, left: plotPad.left, height: 1 }}
      />
    </div>
  )
}

export function HorizGridLines({ gridHzOrAmp }: { gridHzOrAmp: number[] }) {
  const { plotPad } = usePlot()
  const toY = useToY(InCanvas.No)

  return (
    <div className="absolute inset-0" style={{ left: plotPad.left }}>
      {gridHzOrAmp.map((hzOrAmp) => (
        <div
          key={hzOrAmp}
          className="absolute left-0 right-0 h-px bg-white/[0.2]"
          style={{ top: toY(hzOrAmp) }}
        />
      ))}
    </div>
  )
}

function CursorLine({ tSec, className }: { tSec: number; className: string }) {
  const { plotPad } = usePlot()
  const toX = useTimeToX(InCanvas.No)
  const left = toX(tSec)

  return (
    <div
      className="overflow-hidden absolute"
      style={{
        left: plotPad.left,
        right: 0,
        top: plotPad.top,
        bottom: plotPad.bottom,
      }}
    >
      <div
        className={cn('absolute top-0 bottom-0', className)}
        style={{
          left: left - plotPad.left,
          top: 0,
          bottom: 0,
        }}
      />
    </div>
  )
}

export function Plot({
  yAxis,
  yAxisVisible,
  xAxisVisible,
  timelineState: {
    viewportLeftSec: tMinSec,
    viewportRightSec: tMaxSec,
    cursorSec,
    hoverSec,
  },
  onScroll,
  onZoom,
  onClick,
  onHover,
  className,
  children,
  virtualWidthSec,
  debug = false,
}: Props) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const { width, height, dpr } = useTargetSize(root)

  const plotPad = useMemo(
    (): Padding => ({
      top: xAxisVisible ? PLOT_PAD_T : 0,
      bottom: xAxisVisible ? PLOT_PAD_B : 0,
      left: yAxisVisible ? PLOT_PAD_L : 0,
      right: 0,
    }),
    [yAxisVisible, xAxisVisible],
  )

  const ctxValue = useMemo<PlotContextValue>(
    () => ({
      plotPad,
      height,
      width,
      tMinSec,
      tMaxSec,
      dpr,
      cursorSec,
      hoverSec,
      yAxis,
    }),
    [plotPad, height, width, tMinSec, tMaxSec, dpr, cursorSec, hoverSec, yAxis],
  )

  const gridHzOrAmp =
    yAxis.type === 'freq'
      ? generateGridHz({
          fMinHz: yAxis.fMinHz,
          fMaxHz: yAxis.fMaxHz,
          height,
          plotPad,
        })
      : [0]

  const xGrid = generateGridSec({
    tMinSec,
    tMaxSec,
    width,
    cursorSec,
    hoverSec,
  })
  const secPerPx = (tMaxSec - tMinSec) / (width - plotPad.left)

  const handleScroll = useCallback(
    (x: number) => {
      onScroll(secPerPx * x)
    },
    [onScroll, secPerPx],
  )

  const handleClick = useCallback(
    (x: number) => {
      onClick(secPerPx * x)
    },
    [onClick, secPerPx],
  )

  const handleHover = useCallback(
    (x: number | null) => {
      onHover(x == null ? x : secPerPx * x)
    },
    [onHover, secPerPx],
  )

  return (
    <div
      className={cn(
        'w-full relative bg-white dark:bg-black  border border-(--bg-base)',
        className,
      )}
      ref={setRoot}
    >
      <PlotCtx.Provider value={ctxValue}>{renderContent()}</PlotCtx.Provider>
    </div>
  )

  function renderContent() {
    if (!height) {
      return null
    }

    return (
      <>
        {children}
        {yAxisVisible ? <YAxisStrip gridHzOrAmp={gridHzOrAmp} /> : null}
        <HorizGridLines gridHzOrAmp={gridHzOrAmp} />
        {xAxisVisible ? <XAxisStrip grid={xGrid} /> : null}
        <CursorLine className="bg-black dark:bg-white w-0.5" tSec={cursorSec} />
        {hoverSec != null ? (
          <CursorLine className="bg-[#555566] w-px" tSec={hoverSec} />
        ) : null}
        <VirtualScrollArea
          style={{
            top: plotPad.top,
            bottom: plotPad.bottom,
            left: plotPad.left,
            right: plotPad.right,
          }}
          scrollX={tMinSec / secPerPx}
          virtualWidth={virtualWidthSec / secPerPx}
          onScrollX={handleScroll}
          onZoom={onZoom}
          onClick={handleClick}
          onHover={handleHover}
          debug={debug}
        />
        {debug ? (
          <div className="absolute text-white">
            {tMinSec} / {tMaxSec} / {width}
          </div>
        ) : null}
      </>
    )
  }
}
