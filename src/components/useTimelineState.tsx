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

import { useCallback, useMemo, useState } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { checkFeatures } from '#/lib/browserFeatures'

export interface TimelineState {
  viewportLeftSec: number
  viewportRightSec: number
  cursorSec: number
  hoverSec: number | null
  trackDurationSec: number
}

export type Status =
  | { value: 'inactive' }
  | { value: 'recording' }
  | { value: 'analyzing' }
  | { value: 'playing' }
  | { value: 'error'; error: string }
  | { value: 'editAudioSettings' }

/**
 * Manages timeline state including viewport, cursor position, and playback status.
 * Provides handlers for user interactions (scroll, click, zoom, play/pause) and
 * responds to recording/playback events.
 */
export function useTimelineState(analysis: AnalysisChunk[]) {
  const [status, setStatus] = useState<Status>(() => {
    const missingFeatures = checkFeatures()
    return missingFeatures
      ? { value: 'error', error: missingFeatures }
      : { value: 'inactive' }
  })

  const [timelineState, setTimelineState] = useState<TimelineState>({
    viewportLeftSec: 0,
    viewportRightSec: 10,
    cursorSec: 0,
    hoverSec: null,
    trackDurationSec: 0,
  })

  const handleAnalyze = useCallback(
    async (cb: () => Promise<{ trackDurationSec: number }>) => {
      try {
        setStatus({ value: 'analyzing' })
        const { trackDurationSec } = await cb()
        setTimelineState({
          cursorSec: 0,
          hoverSec: null,
          trackDurationSec,
          viewportLeftSec: 0,
          viewportRightSec: 10,
        })
        setStatus({ value: 'inactive' })
      } catch (err) {
        console.error(err)
        setStatus({
          value: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      }
    },
    [],
  )

  const handlePlotScroll = useCallback(
    (tSec: number) =>
      setTimelineState((timeline) => {
        const viewportWidth =
          timeline.viewportRightSec - timeline.viewportLeftSec
        const viewportLeftSec = Math.min(
          Math.max(0, tSec),
          Math.floor(timeline.trackDurationSec / 30 + 1) * 30,
        )
        return {
          ...timeline,
          viewportLeftSec,
          viewportRightSec: viewportLeftSec + viewportWidth,
        }
      }),
    [],
  )
  const handlePlotClick = useCallback(
    (tSec: number) =>
      setTimelineState((timeline) => {
        const { viewportLeftSec, viewportRightSec } = timeline
        if (tSec < viewportLeftSec || tSec > viewportRightSec) {
          const viewportWidth = viewportRightSec - viewportLeftSec
          const maxLeft = Math.floor(timeline.trackDurationSec / 30 + 1) * 30
          const newLeft = Math.max(
            0,
            Math.min(tSec - viewportWidth / 2, maxLeft),
          )
          return {
            ...timeline,
            cursorSec: tSec,
            viewportLeftSec: newLeft,
            viewportRightSec: newLeft + viewportWidth,
          }
        }
        return {
          ...timeline,
          cursorSec: tSec,
        }
      }),
    [],
  )
  const handlePlotHover = useCallback(
    (tSec: number | null) =>
      setTimelineState((timeline) => {
        if (timeline.hoverSec === tSec) return timeline
        return {
          ...timeline,
          hoverSec: tSec,
        }
      }),
    [],
  )
  // `factor` scales the visible span multiplicatively: > 1 zooms out, < 1 zooms
  // in. `p` (0..1) is the focal point along the viewport that stays pinned, so
  // the time under the cursor/fingers doesn't drift while zooming.
  const handlePlotZoom = useCallback((p: number, factor: number) => {
    setTimelineState((timeline) => {
      const span = timeline.viewportRightSec - timeline.viewportLeftSec
      const maxSpan = Math.floor(timeline.trackDurationSec / 30 + 1) * 30
      const minSpan = 0.5
      const newSpan = Math.min(Math.max(span * factor, minSpan), maxSpan)

      if (newSpan === span) {
        return timeline
      }

      const focusSec = timeline.viewportLeftSec + p * span
      const viewportLeftSec = Math.max(0, focusSec - p * newSpan)

      return {
        ...timeline,
        viewportLeftSec,
        viewportRightSec: viewportLeftSec + newSpan,
      }
    })
  }, [])

  const handleNew = useCallback(() => {
    setStatus({ value: 'inactive' })
    setTimelineState({
      viewportLeftSec: 0,
      viewportRightSec: 10,
      cursorSec: 0,
      hoverSec: null,
      trackDurationSec: 0,
    })
  }, [])

  const handlePlay = useCallback(() => {
    setTimelineState((prev) => {
      if (prev.cursorSec + 0.1 >= prev.trackDurationSec) {
        return { ...prev, cursorSec: 0 }
      }
      return prev
    })
    setStatus({ value: 'playing' })
  }, [])

  const handleStart = useCallback(() => {
    setStatus({ value: 'recording' })
  }, [])

  const handlePause = useCallback(() => {
    setStatus((oldStatus) =>
      oldStatus.value === 'recording' || oldStatus.value === 'playing'
        ? { value: 'inactive' }
        : oldStatus,
    )
  }, [])

  const handleBackToStart = useCallback(() => {
    setTimelineState((prev) => {
      const width = prev.viewportRightSec - prev.viewportLeftSec
      return {
        ...prev,
        cursorSec: 0,
        viewportLeftSec: 0,
        viewportRightSec: width,
      }
    })
  }, [])

  const handleJump = useCallback((deltaSec: number) => {
    setTimelineState((timeline) => {
      const tSec = Math.max(
        0,
        Math.min(timeline.cursorSec + deltaSec, timeline.trackDurationSec),
      )
      const { viewportLeftSec, viewportRightSec } = timeline
      if (tSec < viewportLeftSec || tSec > viewportRightSec) {
        const viewportWidth = viewportRightSec - viewportLeftSec
        const maxLeft = Math.floor(timeline.trackDurationSec / 30 + 1) * 30
        const newLeft = Math.max(0, Math.min(tSec - viewportWidth / 2, maxLeft))
        return {
          ...timeline,
          cursorSec: tSec,
          viewportLeftSec: newLeft,
          viewportRightSec: newLeft + viewportWidth,
        }
      }
      return { ...timeline, cursorSec: tSec }
    })
  }, [])

  const handleAcknowledgeError = useCallback(() => {
    setStatus({ value: 'inactive' })
  }, [])

  const handleRecordingComplete = useCallback(
    ({ trackDurationSec }: { trackDurationSec: number }) => {
      setTimelineState((prevTimeline) => ({
        ...prevTimeline,
        trackDurationSec,
        cursorSec: trackDurationSec,
      }))
      setStatus((oldStatus) =>
        oldStatus.value === 'recording' ? { value: 'inactive' } : oldStatus,
      )
    },
    [],
  )

  const handlePlaybackPositionChanged = useCallback((cursorSec: number) => {
    setTimelineState((old) => {
      const windowSec = old.viewportRightSec - old.viewportLeftSec
      // TODO: only while recording?
      const trackDurationSec = Math.max(old.trackDurationSec, cursorSec)
      if (
        trackDurationSec === old.trackDurationSec &&
        cursorSec === old.cursorSec
      ) {
        return old
      }
      if (
        old.viewportLeftSec + windowSec * 0.9 < cursorSec ||
        cursorSec < old.viewportLeftSec
      ) {
        const newViewportLeftSec = Math.max(0, cursorSec - windowSec * 0.1)
        return {
          ...old,
          trackDurationSec,
          viewportLeftSec: newViewportLeftSec,
          viewportRightSec: newViewportLeftSec + windowSec,
          cursorSec,
        }
      } else {
        return { ...old, trackDurationSec, cursorSec }
      }
    })
  }, [])

  const handleError = useCallback((error: unknown) => {
    console.log(error)
    setStatus({
      value: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
  }, [])

  const handleOpenAudioSettings = useCallback((open: boolean = true) => {
    setStatus({
      value: open ? 'editAudioSettings' : 'inactive',
    })
  }, [])

  const waveformTimelineState = useMemo(
    (): TimelineState => ({
      ...timelineState,
      viewportLeftSec: 0,
      viewportRightSec:
        Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
        (timelineState.viewportRightSec - timelineState.viewportLeftSec),
    }),
    [timelineState],
  )

  const hoverFrame = useMemo(() => {
    const hoverSec = timelineState.hoverSec ?? timelineState.cursorSec
    let timeSec = 0
    for (const chunk of analysis) {
      const stepSec = chunk.timeStepSamples / chunk.sampleRate
      for (const frame of chunk.frames) {
        timeSec += stepSec
        if (timeSec > hoverSec) return frame
      }
    }
  }, [analysis, timelineState.cursorSec, timelineState.hoverSec])

  return {
    status,
    timelineState,
    waveformTimelineState,
    handleAnalyze,
    handleNew,
    handlePlotScroll,
    handlePlotClick,
    handlePlotHover,
    handlePlotZoom,
    handlePlay,
    handleStart,
    handlePause,
    handleBackToStart,
    handleJump,
    handleAcknowledgeError,
    handleRecordingComplete,
    handleError,
    handlePlaybackPositionChanged,
    handleOpenAudioSettings,
    hoverFrame,
  }
}
