// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useEffect, useLayoutEffect, useRef } from 'react'

import { useSettings } from '#/components/useSettings'
import { AudioPlaybackPipeline } from '#/lib/audio/AudioPlaybackPipeline'
import type { AudioRope } from '#/lib/audio/AudioRope'
import {
  getOrCreateSharedAudioContext,
  resumeSharedAudioContext,
} from '#/lib/audio/sharedAudioContext'
import type { RopeGainCache } from '#/lib/loudness/ropeLoudness'
import { preferredSampleRate } from '#/lib/settings'

export function useAudioPlayback({
  enabled,
  ropes,
  gainCache,
  cursorSec,
  endAtSec,
  onStop,
  onPlaybackPositionChanged,
  onError,
}: {
  enabled: boolean
  ropes: Array<AudioRope>
  gainCache: RopeGainCache
  cursorSec: number
  endAtSec?: number
  onStop: () => void
  onPlaybackPositionChanged: (timeSec: number) => void
  onError?: (error: string) => void
}) {
  const onStopRef = useRef(onStop)
  const onPlaybackPositionChangedRef = useRef(onPlaybackPositionChanged)
  const onErrorRef = useRef(onError)

  useLayoutEffect(() => {
    onStopRef.current = onStop
    onPlaybackPositionChangedRef.current = onPlaybackPositionChanged
    onErrorRef.current = onError
  })

  // Re-resume after a UA-initiated suspension (tab switch, app backgrounding).
  // Returning to the tab is treated as sufficient user interaction on iOS Safari
  // for a context that was previously gesture-unlocked, so no new gesture needed.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) resumeSharedAudioContext()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const [audioSettings] = useSettings()
  const preferredRate = preferredSampleRate(audioSettings)

  const playbackRef = useRef<{
    ctrl: AbortController
    // Furthest-forward cursor we've accepted as the display catching up to the
    // playhead. Echoes are monotonic, so a cursor behind this is a backward seek.
    lastEchoed: number
    // Highest position the pipeline has reported -- its authoritative playhead.
    // Updated synchronously each frame, so it's always at or ahead of the
    // cursor value a (necessarily lagging) re-render is committing.
    reportedHighWater: number
  } | null>(null)

  useEffect(() => {
    if (!enabled || ropes.length === 0) {
      playbackRef.current?.ctrl.abort()
      playbackRef.current = null
      return
    }

    // Distinguish a real seek from the cursor display merely catching up to the
    // live playhead. The pipeline owns position while playing: it only moves
    // forward, from startAtSec up to reportedHighWater. So a cursor that lands
    // forward of our last echo and at-or-behind the high-water mark is the
    // display falling behind -- not a seek -- and must not tear down the graph.
    // A cursor behind lastEchoed (scrub back) or ahead of the high-water mark
    // (scrub forward past what's played) is a genuine seek and rebuilds.
    //
    // TODO: this infers seek-vs-echo because cursorSec has two writers (the
    // playhead and the user) with no source tag -- same root issue as the scroll
    // area. The proper fix is to make the playhead display-only and route user
    // seeks through their own signal in useTimelineState, so the effect restarts
    // only on a real seek and nothing has to be inferred. Until then this
    // envelope check has a ~1-frame blind spot (a seek landing between lastEchoed
    // and the live playhead reads as an echo).
    const playback = playbackRef.current
    if (
      playback &&
      cursorSec >= playback.lastEchoed &&
      cursorSec <= playback.reportedHighWater
    ) {
      playback.lastEchoed = cursorSec
      return
    }

    playbackRef.current?.ctrl.abort()

    const ctrl = new AbortController()
    playbackRef.current = {
      ctrl,
      lastEchoed: cursorSec,
      reportedHighWater: cursorSec,
    }

    // Fallback context creation: the caller should have called
    // getOrCreateSharedAudioContext() in a gesture handler before enabling
    // playback, but this ensures we always have a context to work with.
    const { context, playbackModuleReady } =
      getOrCreateSharedAudioContext(preferredRate)

    const pipeline = new AudioPlaybackPipeline({
      ropes,
      gains: gainCache.gainsFor(ropes),
      startAtSec: cursorSec,
      endAtSec,
      signal: ctrl.signal,
      context,
      moduleReady: playbackModuleReady,
    })

    const listenerOpts = { signal: pipeline.stopSignal }

    pipeline.addEventListener(
      'positionChanged',
      (e) => {
        if (playbackRef.current?.ctrl === ctrl) {
          playbackRef.current.reportedHighWater = Math.max(
            playbackRef.current.reportedHighWater,
            e.detail.timeSec,
          )
        }
        onPlaybackPositionChangedRef.current(e.detail.timeSec)
      },
      listenerOpts,
    )

    pipeline.addEventListener(
      'stop',
      () => {
        if (playbackRef.current?.ctrl === ctrl) {
          playbackRef.current = null
        }
        onStopRef.current()
      },
      listenerOpts,
    )

    pipeline.addEventListener(
      'error',
      (e) => onErrorRef.current?.(e.detail.error),
      listenerOpts,
    )
  }, [enabled, ropes, gainCache, preferredRate, cursorSec, endAtSec])

  // Unmount cleanup -- the main effect intentionally has no cleanup return
  // so the pipeline survives across cursorSec feedback-loop re-runs.
  useEffect(() => {
    return () => {
      playbackRef.current?.ctrl.abort()
      playbackRef.current = null
    }
  }, [])
}
