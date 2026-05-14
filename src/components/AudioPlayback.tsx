import { useCallback, useEffect, useRef } from 'react'

export function AudioPlayback({
  audioBuffer,
  cursorSec,
  onStop,
  onPlaybackPositionChanged,
}: {
  audioBuffer: AudioBuffer
  cursorSec: number
  onStop: () => void
  onPlaybackPositionChanged: (timeSec: number) => void
}) {
  const mostRecentTime = useRef<number | null>(null)
  const animFrameIdRef = useRef<number | null>(null)

  const source = useRef<AudioBufferSourceNode | null>(null)
  const context = useRef<AudioContext | null>(null)

  const stop = useCallback(() => {
    if (source.current && context.current) {
      try {
        source.current.stop()
        void context.current.close()
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
          animate()
          stop()
          onStop()
        }
      }

      const newCursorSec =
        requestedCursorSec - 0.01 <= newAudioBuffer.duration
          ? requestedCursorSec
          : 0

      mostRecentTime.current = newCursorSec
      const startTimeSec = newCursorSec
      source.current.start(0, newCursorSec)
      const animate = () => {
        if (mostRecentTime.current === null || context.current === null) {
          return
        }

        const timeSec = Math.min(
          context.current.currentTime + startTimeSec,
          newAudioBuffer.duration,
        )
        mostRecentTime.current = timeSec
        onPlaybackPositionChanged(timeSec)
        animFrameIdRef.current = requestAnimationFrame(animate)
      }
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
      animFrameIdRef.current = requestAnimationFrame(animate)
    },
    [stop, onStop, onPlaybackPositionChanged],
  )

  useEffect(() => {
    if (cursorSec !== mostRecentTime.current) {
      play(audioBuffer, cursorSec)
    }
  }, [audioBuffer, play, cursorSec])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return null
}
