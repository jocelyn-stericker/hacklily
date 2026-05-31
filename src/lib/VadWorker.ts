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
import type { SpeechDecision } from './VadProcessor'
import { SpeechGate, VadStreamProcessor } from './VadProcessor'
import type {
  WorkerEndedMessage,
  PatchFramesMessage,
  VadInitMessage,
} from './workerMessages'

const QUANTUM = 128
const VAD_RATE = 16000
const LOG = '[VadWorker]'

export type VadWorkerInMessage = VadInitMessage | null

export type VadWorkerOutMessage = PatchFramesMessage | WorkerEndedMessage

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

export async function runAnalysis(
  reader: AudioRingReader,
  sampleRate: number,
  timeStepSamples: number,
): Promise<void> {
  const vadResampler = new ResamplerStreamProcessor(sampleRate, VAD_RATE, 50)
  const vadDrainBuf = new Float32Array(256)
  const vad = new VadStreamProcessor()

  // Gate per-frame probabilities into speech decisions. A single gate push (or
  // gate.end) only ever flips a contiguous run of frames to a single value, so
  // we buffer the decisions it emits and forward them as one batched patch.
  // The gate may revise earlier frames (redemption / min-speech); those simply
  // arrive in a later batch covering the affected run.
  const pendingDecisions: SpeechDecision[] = []
  const gate = new SpeechGate(sampleRate / timeStepSamples, (decision) => {
    pendingDecisions.push(decision)
  })

  function flushDecisions() {
    if (pendingDecisions.length === 0) return
    postMessage({
      type: 'patch',
      frames: pendingDecisions.slice(),
    } satisfies PatchFramesMessage)
    pendingDecisions.length = 0
  }

  let samplesPending = 0
  let frameIndex = 0

  // Frames accumulated since the last resampler drain; attached to the next VAD
  // chunk so they are gated only once the corresponding inference completes.
  let accumulatedFrames: number[] = []

  // Sequential chain of VAD inference calls.  Growing it never blocks the
  // ring-reader loop, so the SAB can't overrun even if the model is
  // downloading and the first vad.feed() stalls for several seconds.
  let vadChain: Promise<void> = Promise.resolve()

  function gateFrames(frames: number[], speechProbability: number) {
    for (const fi of frames) {
      gate.push(fi, speechProbability)
      flushDecisions()
    }
  }

  function enqueueVadChunk(buf: Float32Array, frames: number[]) {
    vadChain = vadChain.then(() =>
      vad.feed(buf).then(
        () => gateFrames(frames, vad.speechProbability),
        () => gateFrames(frames, 0),
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
  // stream) get gated using the last known speech probability.
  if (accumulatedFrames.length > 0) {
    const frames = accumulatedFrames
    vadChain = vadChain.then(() => gateFrames(frames, vad.speechProbability))
  }

  // Wait for all queued inference to finish, then close out any open segment.
  await vadChain.catch(() => {})
  gate.end()
  flushDecisions()
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
