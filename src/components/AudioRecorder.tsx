import { useEffect, useRef } from 'react'

import type { TimelineState } from '#/components/Plot'
import type { AnalysisMessage } from '#/lib/analysis'
import ImportWorker from '#/lib/importWorker?worker'
import LiveWorker from '#/lib/liveWorker?worker'
import audioWorkletUrl from '#/lib/worklet?worker&url'

export function AudioRecorder({
  onAppend,
  onReset,
  onTimelineStateChanged,
  onError,
}: {
  onAppend: (analysis: AnalysisMessage) => number
  onReset: (analysis: AnalysisMessage[], buffer: AudioBuffer) => void
  onTimelineStateChanged: React.Dispatch<React.SetStateAction<TimelineState>>
  onError: (error: string) => void
}) {
  const pendingCursorSecRef = useRef<number | null>(null)
  const cursorRafRef = useRef<number | null>(null)
  const onTimelineStateChangedRef = useRef(onTimelineStateChanged)
  const onResetRef = useRef(onReset)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onTimelineStateChangedRef.current = onTimelineStateChanged
  }, [onTimelineStateChanged])
  useEffect(() => {
    onResetRef.current = onReset
  }, [onReset])
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
      let liveWorker: Worker | null = null
      let recorder: MediaRecorder | null = null
      let stream: MediaStream
      const recordingChunks: Blob[] = []

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })

        context = new AudioContext({ sampleRate: 44100 })
        const sampleRate = context.sampleRate
        await context.audioWorklet.addModule(audioWorkletUrl)

        sourceNode = context.createMediaStreamSource(stream)
        workletNode = new AudioWorkletNode(context, 'voice-processor')

        // Wire a MessageChannel between the worklet (sender) and liveWorker (receiver).
        liveWorker = new LiveWorker()
        const mc = new MessageChannel()
        workletNode.port.postMessage({ type: 'init', workerPort: mc.port2 }, [
          mc.port2,
        ])

        liveWorker.postMessage(
          { type: 'init', audioPort: mc.port1, sampleRate },
          [mc.port1],
        )

        liveWorker.onmessage = ({ data }: MessageEvent<AnalysisMessage>) => {
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

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordingChunks.push(e.data)
        }

        recorder.onstop = async () => {
          const blob = new Blob(recordingChunks, { type: recorder!.mimeType })
          const arrayBuffer = await blob.arrayBuffer()
          const ctx = new AudioContext({ sampleRate })
          let decodedBuffer: AudioBuffer
          try {
            decodedBuffer = await ctx.decodeAudioData(arrayBuffer)
          } catch (err) {
            onErrorRef.current((err as Error).message)
            await ctx.close()
            return
          }
          await ctx.close()

          // Mix to mono for analysis
          const { length, numberOfChannels } = decodedBuffer
          const mono = new Float32Array(length)
          for (let c = 0; c < numberOfChannels; c++) {
            const ch = decodedBuffer.getChannelData(c)
            for (let i = 0; i < length; i++)
              mono[i]! += ch[i]! / numberOfChannels
          }

          // Re-analyze the recorded audio with the batch analyzer
          const worker = new ImportWorker()
          worker.postMessage({ mono, fileSampleRate: sampleRate }, [
            mono.buffer,
          ])
          worker.onmessage = ({
            data,
          }: MessageEvent<{ ok: AnalysisMessage[] } | { error: string }>) => {
            worker.terminate()
            if ('ok' in data) {
              onResetRef.current(data.ok, decodedBuffer)
            } else {
              onErrorRef.current(data.error)
            }
          }
        }

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
        if (cursorRafRef.current !== null) {
          cancelAnimationFrame(cursorRafRef.current)
          cursorRafRef.current = null
        }
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop()
        }
        sourceNode?.disconnect()
        workletNode?.disconnect()
        liveWorker?.terminate()
        context?.close()
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [onAppend])

  return null
}
