// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/// <reference lib="webworker" />

import { FormantStreamProcessor } from '#/lib/analysis/FormantProcessor'
import type { FormantFrame } from '#/lib/analysis/FormantProcessor'
import { PitchProcessor } from '#/lib/analysis/PitchProcessor'
import { ResamplerStreamProcessor } from '#/lib/analysis/ResampleProcessor'
import { AudioRopeReader } from '#/lib/audio/AudioRopeReader'
import { NumberRing } from '#/lib/NumberRing'

import type {
  WorkerEndedMessage,
  PatchFrameMessage,
  RopeConsumerInitMessage,
  RopeGrowMessage,
  RopeSealMessage,
} from './workerMessages'

declare function postMessage(
  message: FormantWorkerOutMessage,
  transfer?: Transferable[],
): void

const QUANTUM = 128
const FORMANT_RATE = 11000
const LOG = '[FormantWorker]'
const TIME_STEP_SEC = 0.002

const PITCH_INTERVAL = 16
const PITCH_EMIT_SECS = 0.05
const PITCH_BUF_SECS = PITCH_EMIT_SECS * 2

export type FormantWorkerInMessage =
  | RopeConsumerInitMessage
  | RopeGrowMessage
  | RopeSealMessage
  | null

export type FormantWorkerOutMessage = PatchFrameMessage | WorkerEndedMessage

export type FormantWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: FormantWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<FormantWorkerOutMessage>) => any) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<FormantWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

let ropeReader: AudioRopeReader | null = null

self.onmessage = ({ data }: MessageEvent<FormantWorkerInMessage>) => {
  if (!data) return
  if (data.type === 'init') {
    ropeReader = new AudioRopeReader(data.rope, QUANTUM)
    const timeStepSamples = Math.round(TIME_STEP_SEC * data.sampleRate)
    void runAnalysis(ropeReader, data.sampleRate, timeStepSamples).then(() => {
      postMessage({ type: 'ended' })
      console.log(LOG, 'complete')
    })
    return
  }
  if (!ropeReader) return
  if (data.type === 'rope-grow') ropeReader.grow(data.grow)
  else ropeReader.seal()
}

// Both accumulators are append-only and read by a single forward-only pointer
// (`lastEmittedFrame` for frames, `formantPtr` for pending), so only a small
// live window between the write head and that pointer is ever needed. Bounding
// them keeps memory O(window) regardless of recording length. The caps are
// generous safety margins, far larger than the real lag: per-frame emission
// trails the write head by at most ~`pitchEmitSamples` plus one `PITCH_INTERVAL`
// batch (tens of 2 ms frames), and pending formant frames sit only a few ahead
// of the current frame time. NumberRing throws if a read ever falls outside the
// retained window, so an undersized cap would fail loudly rather than silently.
const FRAME_RING_CAP = 4096 // ~8 s of 2 ms frames
const PENDING_RING_CAP = 4096

function nanToNull(v: number): number | null {
  return Number.isNaN(v) ? null : v
}

/** Per-frame carried-forward formant values, NaN-encoding null. */
class FrameFormantRing {
  readonly #f1 = new NumberRing(FRAME_RING_CAP)
  readonly #f2 = new NumberRing(FRAME_RING_CAP)
  readonly #f3 = new NumberRing(FRAME_RING_CAP)

  /** Frames ever pushed; also the absolute index of the next frame. */
  get length(): number {
    return this.#f1.length
  }

  push(f1: number | null, f2: number | null, f3: number | null): void {
    this.#f1.push(f1 ?? NaN)
    this.#f2.push(f2 ?? NaN)
    this.#f3.push(f3 ?? NaN)
  }

  f1(i: number): number | null {
    return nanToNull(this.#f1.get(i))
  }
  f2(i: number): number | null {
    return nanToNull(this.#f2.get(i))
  }
  f3(i: number): number | null {
    return nanToNull(this.#f3.get(i))
  }
}

/** Raw formant frames awaiting assignment to a time frame, NaN-encoding null. */
class PendingFormantRing {
  readonly #time = new NumberRing(PENDING_RING_CAP)
  readonly #f1 = new NumberRing(PENDING_RING_CAP)
  readonly #f2 = new NumberRing(PENDING_RING_CAP)
  readonly #f3 = new NumberRing(PENDING_RING_CAP)

  get length(): number {
    return this.#time.length
  }

  push(
    timeSec: number,
    f1: number | null,
    f2: number | null,
    f3: number | null,
  ): void {
    this.#time.push(timeSec)
    this.#f1.push(f1 ?? NaN)
    this.#f2.push(f2 ?? NaN)
    this.#f3.push(f3 ?? NaN)
  }

  timeSec(i: number): number {
    return this.#time.get(i)
  }
  f1(i: number): number | null {
    return nanToNull(this.#f1.get(i))
  }
  f2(i: number): number | null {
    return nanToNull(this.#f2.get(i))
  }
  f3(i: number): number | null {
    return nanToNull(this.#f3.get(i))
  }
}

export async function runAnalysis(
  reader: AudioRopeReader,
  sampleRate: number,
  timeStepSamples: number,
): Promise<void> {
  const resampler = new ResamplerStreamProcessor(sampleRate, FORMANT_RATE, 50)
  const formant = new FormantStreamProcessor(
    {
      maxFormants: 5,
      maxFrequencyHz: 5500,
      halfWindowLengthSec: 0.025,
      timeStepSec: 0,
      preEmphasisHz: 50,
      safetyMarginHz: 50,
    },
    FORMANT_RATE,
  )
  const drainBuf = new Float32Array(256)

  const pitch = new PitchProcessor({ timeStepSec: 0 }, sampleRate)
  const pitchBufSamples = Math.round(sampleRate * PITCH_BUF_SECS)
  const pitchEmitSamples = Math.round(sampleRate * PITCH_EMIT_SECS)
  const pitchBuf = new Float32Array(pitchBufSamples)

  let quantumCount = 0
  let totalSamples = 0
  let samplesPending = 0
  let lastEmittedFrame = 0

  let latestValidF1: number | null = null
  let latestValidF2: number | null = null
  let latestValidF3: number | null = null

  const frameFormants = new FrameFormantRing()
  const pendingFormants = new PendingFormantRing()
  let formantPtr = 0

  function emitPitchPatches(finalFlush: boolean): void {
    const pr = pitch.analyze(pitchBuf)
    const bufStartSample = totalSamples - pitchBufSamples
    const safeSampleLimit = finalFlush
      ? totalSamples
      : totalSamples - pitchEmitSamples
    const safeFrame = Math.min(
      frameFormants.length,
      Math.max(0, Math.floor(safeSampleLimit / timeStepSamples)),
    )

    for (let fi = lastEmittedFrame; fi < safeFrame; fi++) {
      const relTimeSec =
        ((fi + 0.5) * timeStepSamples - bufStartSample) / sampleRate
      let f0 = 0
      if (pr.frames.length > 0 && relTimeSec >= 0) {
        const pitchIdx = Math.min(
          pr.frames.length - 1,
          Math.max(0, Math.round(relTimeSec / pr.timeStepSec)),
        )
        f0 = pr.frames[pitchIdx]?.frequencyHz ?? 0
      }
      const pitchDetected = f0 > 0
      const f1 = frameFormants.f1(fi)
      const f2 = frameFormants.f2(fi)
      const f3 = frameFormants.f3(fi)
      postMessage({
        type: 'patch',
        frameIndex: fi,
        pitchDetected,
        f0,
        f1: pitchDetected ? f1 : null,
        f2: pitchDetected ? f2 : null,
        f3: pitchDetected ? f3 : null,
      } satisfies PatchFrameMessage)
    }
    lastEmittedFrame = safeFrame
  }

  for await (const inp of reader) {
    pitchBuf.copyWithin(0, QUANTUM)
    pitchBuf.set(inp, pitchBufSamples - QUANTUM)
    totalSamples += inp.length

    resampler.feed(inp)
    const nDrain = resampler.drain(drainBuf)
    if (nDrain > 0) formant.feed(drainBuf.subarray(0, nDrain))

    let ff: FormantFrame | null
    while ((ff = formant.readFrame()) !== null) {
      const f1 = ff.formantCount > 0 ? ff.formants[0]!.frequencyHz : null
      const f2 = ff.formantCount > 1 ? ff.formants[1]!.frequencyHz : null
      const f3 = ff.formantCount > 2 ? ff.formants[2]!.frequencyHz : null
      pendingFormants.push(ff.timeSec, f1, f2, f3)
    }

    samplesPending += inp.length
    while (samplesPending > timeStepSamples) {
      const fi = frameFormants.length
      const tMid = ((fi + 0.5) * timeStepSamples) / sampleRate
      while (formantPtr < pendingFormants.length) {
        if (pendingFormants.timeSec(formantPtr) > tMid) break
        const f1 = pendingFormants.f1(formantPtr)
        const f2 = pendingFormants.f2(formantPtr)
        const f3 = pendingFormants.f3(formantPtr)
        if (f1 && f1 >= 200 && f1 <= 1100 && f2 && f2 >= 650 && f2 <= 3500) {
          latestValidF1 = f1
          latestValidF2 = f2
          latestValidF3 = f3 ?? latestValidF3
        }
        formantPtr++
      }
      frameFormants.push(latestValidF1, latestValidF2, latestValidF3)
      samplesPending -= timeStepSamples
    }

    if (++quantumCount % PITCH_INTERVAL === 0) {
      emitPitchPatches(false)
    }
  }

  emitPitchPatches(true)
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
