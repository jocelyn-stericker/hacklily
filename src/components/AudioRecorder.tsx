import { useEffect, useRef } from 'react'

import type { TimelineState } from '#/components/Plot'
import type { AnalysisMessage } from '#/lib/analysis'
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
  const accumulatedAnalysisRef = useRef<AnalysisMessage[]>([])

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
    accumulatedAnalysisRef.current = []

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
      let stream: MediaStream

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
        const sab = new SharedArrayBuffer(8 + 4096 * 4)
        workletNode.port.postMessage({ type: 'init', sab })
        liveWorker.postMessage({ type: 'init', sab, sampleRate })

        liveWorker.onmessage = ({ data }: MessageEvent) => {
          if (data.type === 'pcm') {
            const analysisDuration = accumulatedAnalysisRef.current.reduce(
              (memo, sample) => memo + sample.timeStepSec,
              0,
            )
            const analysisSamples = Math.round(analysisDuration * sampleRate)

            const pcm = data.pcm as Float32Array<ArrayBuffer>
            const buffer = new AudioBuffer({
              length: analysisSamples,
              numberOfChannels: 1,
              sampleRate,
            })
            if (pcm.length > 0) buffer.copyToChannel(pcm, 0)
            onResetRef.current(accumulatedAnalysisRef.current, buffer)
            liveWorker!.terminate()
            liveWorker = null
            return
          }

          const msg = data as AnalysisMessage
          accumulatedAnalysisRef.current.push(msg)
          pendingCursorSecRef.current = onAppend(msg)
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
        // Send flush before disconnecting so any in-flight audio quanta
        // are processed before the flush message arrives at the worker.
        liveWorker?.postMessage({ type: 'flush' })
        sourceNode?.disconnect()
        workletNode?.disconnect()
        context?.close()
        stream.getTracks().forEach((t) => t.stop())
        // liveWorker is terminated inside onmessage after the PCM response arrives.
      }
    }
  }, [onAppend])

  return null
}
