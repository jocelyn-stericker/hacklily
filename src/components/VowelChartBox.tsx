// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Alison Jenkins <alison.juliet.jenkins@gmail.com>

// The interactive frame around the vowel chart: discoverability handle,
// focus/idle-blur lifecycle, and the three zoom gestures (scroll wheel, +/-
// hotkeys, touch pinch). The chart-drawing itself lives in VowelChart; this box
// only owns the container behaviour that used to clutter the timeline route.

import { ScatterChart } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { SHORTCUTS } from '#/components/shortcuts'
import { useSettings } from '#/components/useSettings'
import { VowelChart } from '#/components/VowelChart'
import type { VowelChartHandle } from '#/components/VowelChart'
import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import {
  clampVowelChartScale,
  updateSettings,
  VOWEL_CHART_SCALE_STEP,
} from '#/lib/settings'
import { cn } from '#/lib/utils'

// A focused-but-untouched chart blurs itself after this long so the focus ring
// and pointer-capturing zoom don't linger over the spectrogram.
const IDLE_BLUR_MS = 4000

export function VowelChartBox({
  analysisMut,
  cursorSec,
  speechDetected,
  recording,
  chartRef,
}: {
  analysisMut: AnalysisChunk[]
  cursorSec: number
  speechDetected: boolean
  /** The chart is meaningless while recording; the box hides then. */
  recording: boolean
  /** Forwarded to the inner VowelChart so the timeline route's audio pipeline
   *  can drive its imperative append()/patch(). */
  chartRef: RefObject<VowelChartHandle | null>
}) {
  const [settings] = useSettings()
  const boxRef = useRef<HTMLDivElement>(null)
  const [chartFocused, setChartFocused] = useState(false)
  const [mouseOverChart, setMouseOverChart] = useState(false)

  // Pinch-to-zoom state: the two-finger distance and the chart scale captured
  // when the pinch began; the live scale is read from a ref so the touch
  // listener never re-attaches mid-gesture.
  const pinchStartDistRef = useRef(0)
  const pinchStartScaleRef = useRef(1)
  const vowelScaleRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The box renders (and captures gestures) only when not recording and the
  // averages layer is shown; otherwise it collapses to nothing.
  const active = !recording && settings.vowelChartAverages !== 'hidden'

  const bumpIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      boxRef.current?.blur()
    }, IDLE_BLUR_MS)
  }, [])

  useEffect(() => {
    if (chartFocused) {
      bumpIdle()
    } else if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [chartFocused, bumpIdle])

  // When the box collapses (recording / averages hidden) the container element
  // is removed, so onBlur never fires -- force-clear the focus flag to avoid a
  // stale focus ring when it reappears.
  useEffect(() => {
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    if (!active) setChartFocused(false)
  }, [active])

  // Give the box real DOM focus whenever focus is turned on (handle click or a
  // body click), so the ring, Escape and click-away-to-blur all work.
  useEffect(() => {
    if (chartFocused) boxRef.current?.focus()
  }, [chartFocused])

  const resize = useCallback(
    (direction: 1 | -1) => {
      void updateSettings({
        vowelChartScale: clampVowelChartScale(
          settings.vowelChartScale + direction * VOWEL_CHART_SCALE_STEP,
        ),
      })
      if (chartFocused) bumpIdle()
    },
    [settings.vowelChartScale, chartFocused, bumpIdle],
  )

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    // React has passive event handlers, so we can't block page scrolling via prop!
    const onWheel = (e: WheelEvent) => {
      if (!chartFocused) return
      e.preventDefault()
      resize(e.deltaY < 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [active, chartFocused, resize])

  // Keep the live scale in a ref so the pinch listener (attached once per mount)
  // reads the current value without re-attaching on every zoom tick.
  useEffect(() => {
    vowelScaleRef.current = settings.vowelChartScale
  }, [settings.vowelChartScale])

  // Pinch-to-zoom (touch): two fingers on the chart scale it by the change in
  // finger distance. Native non-passive listeners so we can preventDefault the
  // browser's page pinch-zoom. Re-attaches when the box (un)collapses.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const distance = (t: TouchList) =>
      Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      setChartFocused(true)
      bumpIdle()
      pinchStartDistRef.current = distance(e.touches)
      pinchStartScaleRef.current = vowelScaleRef.current
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDistRef.current === 0) return
      e.preventDefault()
      const ratio = distance(e.touches) / pinchStartDistRef.current
      void updateSettings({
        vowelChartScale: clampVowelChartScale(
          pinchStartScaleRef.current * ratio,
        ),
      })
      bumpIdle()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDistRef.current = 0
    }
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [active, bumpIdle])

  useHotkeys(
    SHORTCUTS.vowelChartBigger.keys,
    (e) => {
      e.preventDefault()
      resize(1)
    },
    [resize],
    { scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.vowelChartSmaller.keys,
    (e) => {
      e.preventDefault()
      resize(-1)
    },
    [resize],
    { scopes: 'timeline' },
  )

  if (!active) return null

  // The chart is on screen while hovering voiced audio, while the pointer is
  // over it, or while focused. When it's off screen, a handle is shown to open
  // it -- otherwise it's undiscoverable that the chart exists or is interactive.
  const visible = speechDetected || mouseOverChart || chartFocused

  return (
    <>
      {/* Handle shown when the chart is off screen: an always-there affordance
          so users discover the (otherwise hover-only) vowel chart and that it
          opens for zooming. */}
      {!visible && (
        <button
          type="button"
          title="Vowel chart — open to zoom"
          aria-label="Open vowel chart"
          onClick={() => setChartFocused(true)}
          className="absolute z-10 top-0 right-0 m-1 flex items-center justify-center rounded-md border border-border bg-background/70 p-1 text-muted-foreground backdrop-blur-sm transition-colors cursor-pointer hover:text-foreground hover:bg-background/90"
        >
          <ScatterChart className="size-4" />
        </button>
      )}
      <div
        ref={boxRef}
        tabIndex={0}
        role="group"
        aria-label="Vowel chart"
        title="Click to focus, then scroll, +/- or pinch to zoom"
        onMouseEnter={() => setMouseOverChart(true)}
        onMouseLeave={() => setMouseOverChart(false)}
        onFocus={() => setChartFocused(true)}
        onBlur={() => setChartFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') boxRef.current?.blur()
        }}
        className={cn(
          'absolute z-10 border border-[#ccccdd] dark:border-[#2a2a3a] right-0 bottom-auto top-0 left-auto md:right-0 outline-none',
          chartFocused
            ? 'ring-2 ring-sky-400 cursor-default'
            : 'cursor-zoom-in',
          !visible && 'hidden',
        )}
        style={{
          width: 240 * settings.vowelChartScale,
          height: 192 * settings.vowelChartScale,
          maxWidth: '90vw',
          maxHeight: '80vh',
        }}
      >
        <VowelChart
          analysisMut={analysisMut}
          cursorSec={cursorSec}
          ref={chartRef}
        />
      </div>
    </>
  )
}
