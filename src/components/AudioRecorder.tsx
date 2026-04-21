import { useEffect, useRef } from 'react'

import type { TimelineState } from '#/components/Plot'
import type { AnalysisMessage } from '#/lib/analysis'

export function AudioRecorder({
  onAppend,
  onNewBuffer,
  onTimelineStateChanged,
  onError,
}: {
  onAppend: (analysis: AnalysisMessage) => number
  onNewBuffer: (buffer: AudioBuffer) => void
  onTimelineStateChanged: React.Dispatch<React.SetStateAction<TimelineState>>
  onError: (error: string) => void
}) {
  const pendingCursorSecRef = useRef<number | null>(null)
  const cursorRafRef = useRef<number | null>(null)
  const onTimelineStateChangedRef = useRef(onTimelineStateChanged)
  const onNewBufferRef = useRef(onNewBuffer)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onTimelineStateChangedRef.current = onTimelineStateChanged
  }, [onTimelineStateChanged])
  useEffect(() => {
    onNewBufferRef.current = onNewBuffer
  }, [onNewBuffer])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    // If cleanup runs before setup finishes, this defers the teardown
    // until setup completes so all resources are properly released.
    let shouldTeardown = false
    let teardown: (() => void) | null = null

    spinup()

    return () => {
      if (teardown) {
        teardown()
      } else {
        shouldTeardown = true
      }
    }

    async function spinup() {
      let context: AudioContext | null = null
      let sourceNode: MediaStreamAudioSourceNode | null = null
      let workletNode: AudioWorkletNode | null = null
      let recorder: MediaRecorder | null = null
      let stream: MediaStream
      const recordingChunks: Blob[] = []
      let workletStartTime: number | null = null
      let recorderStartTime: number | null = null
      let analysisTimeSec = 0

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })

        context = new AudioContext({ sampleRate: 44100 })
        await context.audioWorklet.addModule(
          new URL('../lib/worklet.ts', import.meta.url),
        )

        sourceNode = context.createMediaStreamSource(stream)
        workletNode = new AudioWorkletNode(context, 'voice-processor')
        workletNode.port.onmessage = ({
          data,
        }: MessageEvent<
          { type: 'start'; currentTime: number } | AnalysisMessage
        >) => {
          if ('type' in data) {
            workletStartTime = data.currentTime
            return
          }
          analysisTimeSec += data.timeStepSec
          pendingCursorSecRef.current = onAppend(data)
          if (cursorRafRef.current === null) {
            cursorRafRef.current = requestAnimationFrame(() => {
              cursorRafRef.current = null
              const cursorSec = pendingCursorSecRef.current!
              onTimelineStateChangedRef.current((old) => {
                const windowSec = old.viewportRightSec - old.viewportLeftSec
                const trackDurationSec = Math.max(
                  old.trackDurationSec,
                  cursorSec,
                )
                if (
                  old.viewportLeftSec + windowSec * 0.9 < cursorSec ||
                  cursorSec < old.viewportLeftSec
                ) {
                  const newViewportLeftSec = Math.max(
                    0,
                    cursorSec - windowSec * 0.1,
                  )
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
            })
          }
        }

        sourceNode.connect(workletNode)

        recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordingChunks.push(e.data)
        }
        recorder.onstop = async () => {
          const blob = new Blob(recordingChunks, { type: recorder!.mimeType })
          const arrayBuffer = await blob.arrayBuffer()
          const ctx = new AudioContext({ sampleRate: 44100 })
          const decodedBuffer = await ctx.decodeAudioData(arrayBuffer)

          const offsetSec =
            workletStartTime !== null && recorderStartTime !== null
              ? Math.max(0, recorderStartTime - workletStartTime)
              : 0
          const offsetSamples = Math.round(offsetSec * 44100)

          const analysisSamples = Math.round(analysisTimeSec * 44100)

          const targetSamples = Math.min(
            analysisSamples,
            decodedBuffer.length + offsetSamples,
          )
          if (targetSamples > 0) {
            let newBuffer = decodedBuffer

            if (
              offsetSamples > 0 ||
              decodedBuffer.length + offsetSamples > targetSamples
            ) {
              newBuffer = ctx.createBuffer(
                decodedBuffer.numberOfChannels,
                targetSamples,
                44100,
              )
              for (let c = 0; c < decodedBuffer.numberOfChannels; c++) {
                const src = decodedBuffer.getChannelData(c)
                const dst = newBuffer.getChannelData(c)
                const copyLen = Math.min(
                  src.length,
                  targetSamples - offsetSamples,
                )
                if (copyLen > 0)
                  dst.set(src.subarray(0, copyLen), offsetSamples)
              }
            }

            onNewBufferRef.current(newBuffer)
          }

          await ctx.close()
        }
        recorderStartTime = context.currentTime
        recorder.start()
      } catch (err) {
        if (!shouldTeardown) {
          onErrorRef.current((err as Error).message)
          console.error(err)
        } else {
          doTeardown()
        }
        return
      }

      if (shouldTeardown) {
        doTeardown()
      } else {
        teardown = doTeardown
      }

      function doTeardown() {
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop()
        }
        sourceNode?.disconnect()
        workletNode?.disconnect()
        context?.close()
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [onAppend])

  return null
}
