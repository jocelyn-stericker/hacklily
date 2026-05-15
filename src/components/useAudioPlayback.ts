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

import { useEffect, useLayoutEffect, useRef } from 'react'

import { AudioPlaybackPipeline } from '#/lib/AudioPlaybackPipeline'

export function useAudioPlayback({
  enabled,
  audioBuffer,
  cursorSec,
  onStop,
  onPlaybackPositionChanged,
}: {
  enabled: boolean
  audioBuffer: AudioBuffer | null
  cursorSec: number
  onStop: () => void
  onPlaybackPositionChanged: (timeSec: number) => void
}) {
  const onStopRef = useRef(onStop)
  const onPlaybackPositionChangedRef = useRef(onPlaybackPositionChanged)

  useLayoutEffect(() => {
    onStopRef.current = onStop
    onPlaybackPositionChangedRef.current = onPlaybackPositionChanged
  })

  const playbackRef = useRef<{
    ctrl: AbortController
    mostRecentTimeSec: number
  } | null>(null)

  useEffect(() => {
    if (!enabled || !audioBuffer) {
      playbackRef.current?.ctrl.abort()
      playbackRef.current = null
      return
    }

    // Skip if cursorSec matches our last-reported position (feedback loop prevention)
    if (cursorSec === playbackRef.current?.mostRecentTimeSec) {
      return
    }

    playbackRef.current?.ctrl.abort()

    const ctrl = new AbortController()
    playbackRef.current = { ctrl, mostRecentTimeSec: cursorSec }

    const pipeline = new AudioPlaybackPipeline({
      audioBuffer,
      startAtSec: cursorSec,
      signal: ctrl.signal,
    })

    const listenerOpts = { signal: pipeline.stopSignal }

    pipeline.addEventListener(
      'positionChanged',
      (e) => {
        if (playbackRef.current?.ctrl === ctrl) {
          playbackRef.current.mostRecentTimeSec = e.detail.timeSec
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
  }, [enabled, audioBuffer, cursorSec])

  // Unmount cleanup — the main effect intentionally has no cleanup return
  // so the pipeline survives across cursorSec feedback-loop re-runs.
  useEffect(() => {
    return () => {
      playbackRef.current?.ctrl.abort()
      playbackRef.current = null
    }
  }, [])
}
