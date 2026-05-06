import { useEffect, useRef } from 'react'

import type { TimelineState } from '#/components/Plot'
import type { AnalysisMessage } from '#/lib/analysis'
import audioWorkletUrl from '#/lib/worklet?worker&url'

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
      let analysisSampleCount = 0

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })

        context = new AudioContext({ sampleRate: 44100 })
        console.log('SR', context.sampleRate)
        const sampleRate = context.sampleRate
        await context.audioWorklet.addModule(audioWorkletUrl)

        sourceNode = context.createMediaStreamSource(stream)
        workletNode = new AudioWorkletNode(context, 'voice-processor')
        workletNode.port.onmessage = ({
          data,
        }: MessageEvent<
          | { type: 'start'; currentTime: number }
          | AnalysisMessage
          | { time: number }
        >) => {
          if ('type' in data) {
            workletStartTime = data.currentTime
            return
          }
          if ('time' in data) {
            if (data.time > 10) {
              console.log(`Exceeded budget: ${data.time}ms`)
            }
            console.log(data.inp)
            return
          }
          analysisSampleCount += data.timeStepSec * sampleRate
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

        const recorderNode = new MediaStreamAudioDestinationNode(context, {})

        recorder = new MediaRecorder(recorderNode.stream, {})
        sourceNode.connect(workletNode)
        sourceNode.connect(recorderNode)
        recorder.onstart = (e) => {
          if (!context) {
            return
          }
          // lol this is apparently what we have to work with?
          const differenceBetweenClocks =
            performance.now() / 1000 - context.currentTime
          recorderStartTime = e.timeStamp / 1000 - differenceBetweenClocks
          console.log('start!', recorderStartTime, workletStartTime)
        }
        recorder.start()

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordingChunks.push(e.data)
        }
        recorder.onstop = async () => {
          console.log(recorderStartTime, workletStartTime)
          const blob = new Blob(recordingChunks, { type: recorder!.mimeType })
          const arrayBuffer = await blob.arrayBuffer()
          const ctx = new AudioContext({ sampleRate })
          console.log('SR2', ctx.sampleRate, context!.sampleRate)
          let decodedBuffer = await ctx.decodeAudioData(arrayBuffer)
          if (
            recorderStartTime &&
            workletStartTime &&
            recorderStartTime < workletStartTime
          ) {
            const framesToSkip = Math.round(
              (workletStartTime - recorderStartTime) * sampleRate,
            )
            const trimmedBuffer = ctx.createBuffer(
              decodedBuffer.numberOfChannels,
              Math.max(0, decodedBuffer.length - framesToSkip),
              sampleRate,
            )
            for (let ch = 0; ch < decodedBuffer.numberOfChannels; ch++) {
              const sourceData = decodedBuffer.getChannelData(ch)
              const targetData = trimmedBuffer.getChannelData(ch)
              targetData.set(sourceData.slice(framesToSkip))
            }
            console.log('skipped', framesToSkip)
            decodedBuffer = trimmedBuffer
          }
          console.log('Decoded duration is', decodedBuffer.duration)
          console.log('Analysis duration is', analysisSampleCount / sampleRate)
          onNewBufferRef.current(decodedBuffer)
          await ctx.close()
        }
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
