import { useCallback, useEffect, useRef } from 'react'

import type { TimelineState } from './Plot'

export function AudioPlayback({
  audioBuffer,
  timelineState,
  onStop,
  onTimelineStateChanged,
}: {
  audioBuffer: AudioBuffer
  timelineState: TimelineState
  onStop: () => void
  onTimelineStateChanged: (state: React.SetStateAction<TimelineState>) => void
}) {
  const mostRecentTime = useRef<number | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const mostRecentTimeCb = useRef<
    (state: React.SetStateAction<TimelineState>) => void
  >(onTimelineStateChanged)

  // only applied going forward
  useEffect(() => {
    mostRecentTimeCb.current = onTimelineStateChanged
  }, [onTimelineStateChanged])

  const source = useRef<AudioBufferSourceNode | null>(null)
  const context = useRef<AudioContext | null>(null)

  const stop = useCallback(() => {
    if (source.current && context.current) {
      try {
        source.current.stop()
        context.current.close()
      } catch (err) {
        console.log(err)
        // already stopped!
      }
      source.current = null
      context.current = null
      mostRecentTime.current = null
    }
  }, [])

  const play = useCallback(
    (newAudioBuffer: AudioBuffer, requestedCursorSec: number) => {
      stop()

      context.current = new AudioContext({ sampleRate: 44100 })
      const thisSource = context.current.createBufferSource()
      source.current = thisSource
      source.current.buffer = newAudioBuffer
      source.current.connect(context.current.destination)
      thisSource.onended = () => {
        if (source.current === thisSource) {
          stop()
          onStop()
        }
      }

      const cursorSec =
        requestedCursorSec - 0.01 <= newAudioBuffer.duration
          ? requestedCursorSec
          : 0

      mostRecentTime.current = cursorSec
      const startTimeSec = cursorSec
      source.current.start(0, cursorSec)
      const animate = () => {
        if (mostRecentTime.current === null || context.current === null) {
          return
        }

        const timeSec = context.current.currentTime + startTimeSec
        mostRecentTimeCb.current((oldTimelineState) => {
          mostRecentTime.current = timeSec
          const windowSec =
            oldTimelineState.viewportRightSec - oldTimelineState.viewportLeftSec

          if (
            oldTimelineState.viewportLeftSec + windowSec * 0.9 < timeSec ||
            timeSec < oldTimelineState.viewportLeftSec
          ) {
            const newViewportLeftSec = Math.max(0, timeSec - windowSec * 0.1)
            return {
              ...oldTimelineState,
              viewportLeftSec: newViewportLeftSec,
              viewportRightSec: newViewportLeftSec + windowSec,
              cursorSec: timeSec,
            }
          } else {
            return { ...oldTimelineState, cursorSec: timeSec }
          }
        })

        animFrameIdRef.current = requestAnimationFrame(animate)
      }
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
      animFrameIdRef.current = requestAnimationFrame(animate)
    },
    [stop, onStop],
  )

  useEffect(() => {
    if (timelineState.cursorSec !== mostRecentTime.current) {
      play(audioBuffer, timelineState.cursorSec)
    }
  }, [audioBuffer, play, timelineState.cursorSec])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return null
}
