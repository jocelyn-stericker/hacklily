// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/// <reference lib="webworker" />

import { ResamplerStreamProcessor } from '#/lib/analysis/ResampleProcessor'
import type { SpeechDecision, VadParams } from '#/lib/analysis/VadProcessor'
import {
  SpeechGate,
  VadStreamProcessor,
  VAD_CHUNK,
} from '#/lib/analysis/VadProcessor'
import { AudioRopeReader } from '#/lib/audio/AudioRopeReader'
import { NumberRing } from '#/lib/NumberRing'

import type {
  WorkerEndedMessage,
  PatchFramesMessage,
  VadInitMessage,
  RopeGrowMessage,
  RopeSealMessage,
} from './workerMessages'

const QUANTUM = 128
const VAD_RATE = 16000
const LOG = '[VadWorker]'
const TIME_STEP_SEC = 0.002
const ONSET_HP_HZ = 300

/**
 * Per-frame high-pass energy, which we use to extend the VAD so it doesn't
 * miss fricatives and such.
 *
 * Frames must be requested in strictly increasing order, each exactly once.
 */
export class HfEnergyCursor {
  readonly #reader: AudioRopeReader
  readonly #timeStepSamples: number
  readonly #hpCoeff: number
  readonly #buf = new Float32Array(1024)
  #bufLen = 0 // valid samples in #buf
  #bufPos = 0 // next sample to consume in #buf
  #ropePos = 0 // absolute rope position of the next sample to read
  #hpPrevIn = 0
  #hpPrevOut = 0
  #acc = 0
  #count = 0
  #pending = 0
  #frame = 0 // next frame index to emit

  constructor(
    reader: AudioRopeReader,
    sampleRate: number,
    timeStepSamples: number,
  ) {
    this.#reader = reader
    this.#timeStepSamples = timeStepSamples
    this.#hpCoeff = 1 / (1 + (2 * Math.PI * ONSET_HP_HZ) / sampleRate)
  }

  energyForFrame(frame: number): number {
    if (frame !== this.#frame) {
      throw new RangeError(
        `HfEnergyCursor.energyForFrame(${frame}) out of order; expected ${this.#frame}`,
      )
    }
    for (;;) {
      if (this.#bufPos >= this.#bufLen) this.#fill()
      const x = this.#buf[this.#bufPos++]!
      const hp = this.#hpCoeff * (this.#hpPrevOut + x - this.#hpPrevIn)
      this.#hpPrevIn = x
      this.#hpPrevOut = hp
      this.#acc += hp * hp
      this.#count++
      this.#pending++
      if (this.#pending > this.#timeStepSamples) {
        this.#pending -= this.#timeStepSamples
        const energy = this.#count > 0 ? this.#acc / this.#count : 0
        this.#acc = 0
        this.#count = 0
        this.#frame++
        return energy
      }
    }
  }

  #fill(): void {
    const avail = this.#reader.length - this.#ropePos
    const n = Math.min(this.#buf.length, avail)
    if (n <= 0) {
      // The requested frame's samples must be committed before it's asked for.
      throw new RangeError(
        `HfEnergyCursor read past committed rope at sample ${this.#ropePos}`,
      )
    }
    this.#reader.readAt(this.#buf, this.#ropePos, n)
    this.#ropePos += n
    this.#bufLen = n
    this.#bufPos = 0
  }
}

export type VadWorkerInMessage =
  | VadInitMessage
  | RopeGrowMessage
  | RopeSealMessage
  | null

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

let ropeReader: AudioRopeReader | null = null

self.onmessage = ({ data }: MessageEvent<VadWorkerInMessage>) => {
  if (!data) return
  if (data.type === 'init') {
    ropeReader = new AudioRopeReader(data.rope, QUANTUM)
    const timeStepSamples = Math.round(TIME_STEP_SEC * data.sampleRate)
    void runAnalysis(
      ropeReader,
      data.sampleRate,
      timeStepSamples,
      data.params,
    ).then(() => {
      postMessage({ type: 'ended' })
      console.log(LOG, 'complete')
    })
    return
  }
  if (!ropeReader) return
  if (data.type === 'rope-grow') ropeReader.grow(data.grow)
  else ropeReader.seal()
}

export async function runAnalysis(
  reader: AudioRopeReader,
  sampleRate: number,
  timeStepSamples: number,
  params: Partial<VadParams> = {},
): Promise<void> {
  const vadResampler = new ResamplerStreamProcessor(sampleRate, VAD_RATE, 50)
  const vadDrainBuf = new Float32Array(256)
  const vad = new VadStreamProcessor()

  const pendingDecisions: SpeechDecision[] = []
  const gate = new SpeechGate(
    sampleRate / timeStepSamples,
    (decision) => {
      pendingDecisions.push(decision)
    },
    params,
  )

  function flushDecisions() {
    if (pendingDecisions.length === 0) return
    postMessage({
      type: 'patch',
      frames: pendingDecisions.slice(),
    } satisfies PatchFramesMessage)
    pendingDecisions.length = 0
  }

  const CHUNK_SEC = VAD_CHUNK / VAD_RATE
  const timeStepSec = timeStepSamples / sampleRate

  // Per-VAD-chunk (32 ms) speech probabilities, read by the forward-only
  // `gate.push` pointer (`coveringChunk`, monotonic with `nextFrame`). Each
  // probability is consumed by `gateReadyFrames` in the same microtask that
  // pushes it, so the read pointer tracks the write head within a chunk or two
  // — only a small live window is ever needed. Bounded by a ring (cap is a
  // generous ~66 s of slack at ~31 chunks/s; NumberRing throws if a read ever
  // falls outside the retained window). NOTE: `frameHfEnergy` below is still
  // unbounded: it's written ahead synchronously while the gate waits on async
  // inference, so bounding it needs read-loop backpressure.
  const vadProbs = new NumberRing(2048)

  let samplesPending = 0
  let frameIndex = 0
  let nextFrame = 0
  let vadSamplesFed = 0

  const hfCursor = new HfEnergyCursor(reader, sampleRate, timeStepSamples)

  function gateReadyFrames() {
    while (nextFrame < frameIndex) {
      const coveringChunk = Math.floor(
        ((nextFrame + 0.5) * timeStepSec) / CHUNK_SEC,
      )
      if (coveringChunk >= vadProbs.length) break
      gate.push(
        nextFrame,
        vadProbs.get(coveringChunk),
        hfCursor.energyForFrame(nextFrame),
      )
      flushDecisions()
      nextFrame++
    }
  }

  let vadChain: Promise<void> = Promise.resolve()

  function enqueueVadChunk(buf: Float32Array) {
    vadSamplesFed += buf.length
    const expectedChunks = Math.floor(vadSamplesFed / VAD_CHUNK)
    vadChain = vadChain.then(() =>
      vad
        .feed(buf, (prob) => vadProbs.push(prob))
        .then(gateReadyFrames, () => {
          while (vadProbs.length < expectedChunks) vadProbs.push(0)
          gateReadyFrames()
        }),
    )
  }

  for await (const inp of reader) {
    vadResampler.feed(inp)
    const n = vadResampler.drain(vadDrainBuf)

    // Count frames as samples arrive; the HF onset feature is computed lazily
    // by `hfCursor` when the gate actually consumes each frame (it lags here,
    // waiting on async VAD inference). This bulk count is equivalent to the old
    // per-sample `samplesPending` advance.
    samplesPending += inp.length
    while (samplesPending > timeStepSamples) {
      samplesPending -= timeStepSamples
      frameIndex++
    }

    if (n > 0) enqueueVadChunk(vadDrainBuf.slice(0, n))
    gateReadyFrames()
  }

  await vadChain.catch(() => {})
  await vad.flush((prob) => vadProbs.push(prob)).catch(() => {})
  gateReadyFrames()

  const lastChunk = vadProbs.length - 1
  while (nextFrame < frameIndex) {
    const coveringChunk = Math.min(
      lastChunk,
      Math.floor(((nextFrame + 0.5) * timeStepSec) / CHUNK_SEC),
    )
    gate.push(
      nextFrame,
      coveringChunk >= 0 ? vadProbs.get(coveringChunk) : 0,
      hfCursor.energyForFrame(nextFrame),
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
