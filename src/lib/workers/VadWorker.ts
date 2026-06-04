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

import { ResamplerStreamProcessor } from '#/lib/analysis/ResampleProcessor'
import type { SpeechDecision } from '#/lib/analysis/VadProcessor'
import {
  SpeechGate,
  VadStreamProcessor,
  VAD_CHUNK,
} from '#/lib/analysis/VadProcessor'
import { AudioRingReader } from '#/lib/audio/AudioRingReader'

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

  // Per-VAD-chunk speech probability, indexed by chunk. Each chunk c covers
  // 16 kHz samples [c·VAD_CHUNK, (c+1)·VAD_CHUNK), i.e. absolute time
  // [c·CHUNK_SEC, (c+1)·CHUNK_SEC). A frame is gated against the chunk covering
  // its midpoint, identical to analyzeBuffer's frame→probability mapping; here
  // it is applied incrementally as chunk probabilities arrive.
  const CHUNK_SEC = VAD_CHUNK / VAD_RATE
  const timeStepSec = timeStepSamples / sampleRate
  const vadProbs: number[] = []

  let samplesPending = 0
  let frameIndex = 0 // total frames generated so far
  let nextFrame = 0 // next frame not yet pushed to the gate
  let vadSamplesFed = 0 // total 16 kHz samples handed to vad.feed

  // Cheap per-frame energy above ONSET_HP_HZ for onset backtracking in the gate
  // (see SpeechGate). A one-pole high-pass removes F0/rumble but keeps a flat
  // passband above the cutoff, so the broadband aspiration of weak fricatives
  // (/f/, /h/, /θ/) counts, not just sibilant HF. Mean-squared per frame, in
  // lockstep with frameIndex so frameHfEnergy[f] is set as frame f completes.
  const ONSET_HP_HZ = 300
  const hpCoeff = 1 / (1 + (2 * Math.PI * ONSET_HP_HZ) / sampleRate)
  const frameHfEnergy: number[] = []
  let hpPrevIn = 0
  let hpPrevOut = 0
  let hfAcc = 0
  let hfCount = 0

  // Gate every frame whose covering chunk's probability is already known. The
  // covering chunk is non-decreasing in frame index, so once one frame's chunk
  // is missing, so are all later frames'.
  function gateReadyFrames() {
    while (nextFrame < frameIndex) {
      const coveringChunk = Math.floor(
        ((nextFrame + 0.5) * timeStepSec) / CHUNK_SEC,
      )
      if (coveringChunk >= vadProbs.length) break
      gate.push(
        nextFrame,
        vadProbs[coveringChunk]!,
        frameHfEnergy[nextFrame] ?? NaN,
      )
      flushDecisions()
      nextFrame++
    }
  }

  // Sequential chain of VAD inference calls.  Growing it never blocks the
  // ring-reader loop, so the SAB can't overrun even if the model is
  // downloading and the first vad.feed() stalls for several seconds.
  let vadChain: Promise<void> = Promise.resolve()

  function enqueueVadChunk(buf: Float32Array) {
    vadSamplesFed += buf.length
    const expectedChunks = Math.floor(vadSamplesFed / VAD_CHUNK)
    vadChain = vadChain.then(() =>
      vad
        .feed(buf, (prob) => vadProbs.push(prob))
        .then(gateReadyFrames, () => {
          // Inference unavailable (e.g. the model failed to load): treat the
          // chunks that should have completed as silence so their frames still
          // gate, mirroring the old per-feed `prob = 0` fallback.
          while (vadProbs.length < expectedChunks) vadProbs.push(0)
          gateReadyFrames()
        }),
    )
  }

  for await (const inp of reader) {
    vadResampler.feed(inp)
    const n = vadResampler.drain(vadDrainBuf)

    // Count frames and accumulate per-frame HF energy per input sample, so the
    // two stay aligned. Draining one timeStepSamples at a time per sample yields
    // the same frame count as adding inp.length then draining in bulk.
    for (const x of inp) {
      const hp = hpCoeff * (hpPrevOut + x - hpPrevIn)
      hpPrevIn = x
      hpPrevOut = hp
      hfAcc += hp * hp
      hfCount++
      samplesPending += 1
      if (samplesPending > timeStepSamples) {
        samplesPending -= timeStepSamples
        frameHfEnergy[frameIndex] = hfCount > 0 ? hfAcc / hfCount : 0
        frameIndex++
        hfAcc = 0
        hfCount = 0
      }
    }

    if (n > 0) enqueueVadChunk(vadDrainBuf.slice(0, n))
    // Frames generated this iteration whose chunk already completed can gate now.
    gateReadyFrames()
  }

  // Drain the final partial chunk so the tail is inferred too (the batch path
  // always runs a zero-padded last chunk).
  await vadChain.catch(() => {})
  await vad.flush((prob) => vadProbs.push(prob)).catch(() => {})
  gateReadyFrames()

  // Frames past the last produced chunk — the resampler leaves a few ms of
  // input unresolved at the tail — clamp to the final chunk, matching
  // analyzeBuffer's Math.min(vadProbs.length - 1, …).
  const lastChunk = vadProbs.length - 1
  while (nextFrame < frameIndex) {
    const coveringChunk = Math.min(
      lastChunk,
      Math.floor(((nextFrame + 0.5) * timeStepSec) / CHUNK_SEC),
    )
    gate.push(
      nextFrame,
      coveringChunk >= 0 ? vadProbs[coveringChunk]! : 0,
      frameHfEnergy[nextFrame] ?? NaN,
    )
    flushDecisions()
    nextFrame++
  }

  gate.end()
  flushDecisions()
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
