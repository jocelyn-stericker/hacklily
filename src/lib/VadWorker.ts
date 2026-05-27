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
/// <reference lib="webworker" />

import { AudioRingReader } from './AudioRingReader'
import { ResamplerStreamProcessor } from './ResampleProcessor'
import { VadStreamProcessor } from './VadProcessor'
import type {
  WorkerEndedMessage,
  PatchFrameMessage,
  VadInitMessage,
} from './workerMessages'

const QUANTUM = 128
const VAD_RATE = 16000
const LOG = '[VadWorker]'
const PREROLL_MS = 50
const POSITIVE_THRESHOLD = 0.3
const NEGATIVE_THRESHOLD = 0.25

export type VadWorkerInMessage = VadInitMessage | null

export type VadWorkerOutMessage = PatchFrameMessage | WorkerEndedMessage

export type VadWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: VadWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<VadWorkerOutMessage>) => any) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<VadWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

declare function postMessage(message: VadWorkerOutMessage): void

self.onmessage = async ({ data }: MessageEvent<VadWorkerInMessage>) => {
  if (data?.type !== 'init') return

  const reader = new AudioRingReader(data.sab, data.bufSamples, QUANTUM)
  reader.onOverrun = (dropped) => {
    console.warn(LOG, `ring buffer overrun: ${dropped} samples lost`)
  }

  await runAnalysis(reader, data.sampleRate, data.timeStepSamples)
  postMessage({ type: 'ended' })
  console.log(LOG, 'complete')
}

interface PendingFrame {
  frameIndex: number
  speechProbability: number
}

export async function runAnalysis(
  reader: AudioRingReader,
  sampleRate: number,
  timeStepSamples: number,
): Promise<void> {
  const vadResampler = new ResamplerStreamProcessor(sampleRate, VAD_RATE, 50)
  const vadDrainBuf = new Float32Array(256)
  const vad = new VadStreamProcessor()

  // How many frames to hold before flushing unvoiced patches.
  // Holding for PREROLL_MS means voicing onset retroactively claims those frames.
  const prerollFrames = Math.ceil(
    (PREROLL_MS / 1000) * (sampleRate / timeStepSamples),
  )

  let speaking = false
  let samplesPending = 0
  let frameIndex = 0
  const pending: PendingFrame[] = []

  // Frames accumulated since the last resampler drain; attached to the next
  // VAD chunk so patches are emitted only after the corresponding inference.
  let accumulatedFrames: number[] = []

  // Sequential chain of VAD inference calls.  Growing it never blocks the
  // ring-reader loop, so the SAB can't overrun even if the model is
  // downloading and the first vad.feed() stalls for several seconds.
  let vadChain: Promise<void> = Promise.resolve()

  function emitFrames(frames: number[], speechProb: number) {
    for (const fi of frames) {
      if (speaking) {
        // Retroactively emit all held frames as voiced (pre-roll)
        for (const pf of pending) {
          postMessage({
            type: 'patch',
            frameIndex: pf.frameIndex,
            speechDetected: true,
            speechProbability: pf.speechProbability,
          } satisfies PatchFrameMessage)
        }
        pending.length = 0

        postMessage({
          type: 'patch',
          frameIndex: fi,
          speechDetected: true,
          speechProbability: speechProb,
        } satisfies PatchFrameMessage)
      } else {
        // Hold this frame: it may fall within the pre-roll of upcoming voicing
        pending.push({ frameIndex: fi, speechProbability: speechProb })

        // Flush the oldest frame once the window exceeds PREROLL_MS
        while (pending.length > prerollFrames) {
          const pf = pending.shift()!
          postMessage({
            type: 'patch',
            frameIndex: pf.frameIndex,
            speechDetected: false,
            speechProbability: pf.speechProbability,
          } satisfies PatchFrameMessage)
        }
      }
    }
  }

  function enqueueVadChunk(buf: Float32Array, frames: number[]) {
    vadChain = vadChain.then(() =>
      vad.feed(buf).then(
        () => {
          if (vad.speechProbability >= POSITIVE_THRESHOLD) speaking = true
          else if (vad.speechProbability < NEGATIVE_THRESHOLD) speaking = false
          emitFrames(frames, vad.speechProbability)
        },
        () => {
          emitFrames(frames, 0)
        },
      ),
    )
  }

  for await (const inp of reader) {
    vadResampler.feed(inp)
    const n = vadResampler.drain(vadDrainBuf)

    samplesPending += inp.length
    while (samplesPending > timeStepSamples) {
      accumulatedFrames.push(frameIndex)
      frameIndex++
      samplesPending -= timeStepSamples
    }

    if (n > 0) {
      enqueueVadChunk(vadDrainBuf.slice(0, n), accumulatedFrames)
      accumulatedFrames = []
    }
  }

  // Any frames not yet assigned to a VAD chunk (resampler lag at end of
  // stream) get emitted using the last known speaking state.
  if (accumulatedFrames.length > 0) {
    const frames = accumulatedFrames
    vadChain = vadChain.then(() => {
      emitFrames(frames, vad.speechProbability)
    })
  }

  // Wait for all queued inference to finish before flushing.
  await vadChain.catch(() => {})

  // Flush any remaining held frames as unvoiced
  for (const pf of pending) {
    postMessage({
      type: 'patch',
      frameIndex: pf.frameIndex,
      speechDetected: false,
      speechProbability: pf.speechProbability,
    } satisfies PatchFrameMessage)
  }
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
