import { useEffect, useRef } from 'react'

import type { TimelineState } from '#/components/Plot'
import type { AnalysisMessage } from '#/lib/analysis'
import { createScriptProcessorAnalyzer } from '#/lib/scriptProcessor'
import audioWorkletUrl from '#/lib/worklet?worker&url'

// Enable the legacy ScriptProcessorNode path with ?scriptProcessor in the URL.
// Intended for WebKit browsers that do not support AudioWorklet.
const USE_SCRIPT_PROCESSOR = new URLSearchParams(window.location.search).has(
  'scriptProcessor',
)

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
      let scriptNode: ScriptProcessorNode | null = null
      let recorder: MediaRecorder | null = null
      let stream: MediaStream
      const recordingChunks: Blob[] = []
      let analysisStartTime: number | null = null
      let recorderStartTime: number | null = null
      let analysisTimeSec = 0

      function handleAnalysisMessage(
        data: { type: 'start'; currentTime: number } | AnalysisMessage,
      ) {
        if ('type' in data) {
          analysisStartTime = data.currentTime
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
              const trackDurationSec = Math.max(old.trackDurationSec, cursorSec)
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

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })

        context = new AudioContext({ sampleRate: 44100 })
        sourceNode = context.createMediaStreamSource(stream)

        if (USE_SCRIPT_PROCESSOR) {
          scriptNode = createScriptProcessorAnalyzer(
            context,
            handleAnalysisMessage,
          )
          sourceNode.connect(scriptNode)
          // ScriptProcessorNode must be connected to destination to fire
          // onaudioprocess in WebKit. Output is silenced inside the callback.
          scriptNode.connect(context.destination)
        } else {
          await context.audioWorklet.addModule(audioWorkletUrl)
          workletNode = new AudioWorkletNode(context, 'voice-processor')
          workletNode.port.onmessage = ({
            data,
          }: MessageEvent<
            { type: 'start'; currentTime: number } | AnalysisMessage
          >) => {
            handleAnalysisMessage(data)
          }
          sourceNode.connect(workletNode)
        }

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
            analysisStartTime !== null && recorderStartTime !== null
              ? Math.max(0, recorderStartTime - analysisStartTime)
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
        scriptNode?.disconnect()
        context?.close()
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [onAppend])

  return null
}
