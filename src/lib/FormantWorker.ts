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
import { FormantStreamProcessor } from './FormantProcessor'
import type { FormantFrame } from './FormantProcessor'
import { PitchProcessor } from './PitchProcessor'
import { ResamplerStreamProcessor } from './ResampleProcessor'
import type {
  WorkerEndedMessage,
  ParamsMessage,
  PatchFrameMessage,
  FormantInitMessage,
} from './workerMessages'

declare function postMessage(
  message: FormantWorkerOutMessage,
  transfer?: Transferable[],
): void

const QUANTUM = 128
const FORMANT_RATE = 11000
const LOG = '[FormantWorker]'

// Run pitch every PITCH_INTERVAL quanta and emit patches for frames that
// have at least PITCH_EMIT_SECS of future audio as Viterbi context.
const PITCH_INTERVAL = 16
const PITCH_EMIT_SECS = 0.1
const PITCH_BUF_SECS = PITCH_EMIT_SECS * 2

export type FormantWorkerInMessage = FormantInitMessage | null

export type FormantWorkerOutMessage =
  | ParamsMessage
  | PatchFrameMessage
  | WorkerEndedMessage

export type FormantWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: FormantWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<FormantWorkerOutMessage>) => any) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<FormantWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

self.onmessage = async ({ data }: MessageEvent<FormantWorkerInMessage>) => {
  if (data?.type !== 'init') {
    return
  }

  const reader = new AudioRingReader(data.sab, data.bufSamples, QUANTUM)
  reader.onOverrun = (dropped) => {
    console.warn(LOG, `ring buffer overrun: ${dropped} samples lost`)
  }

  await runAnalysis(reader, data.sampleRate, data.timeStepSamples)
  postMessage({ type: 'ended' })
  console.log(LOG, 'complete')
}

interface FrameFormant {
  f1: number | null
  f2: number | null
  f3: number | null
}

interface PendingFormant {
  timeSec: number
  f1: number | null
  f2: number | null
  f3: number | null
}

export async function runAnalysis(
  reader: AudioRingReader,
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
  // Rolling buffer; newest QUANTUM samples are appended to the end each iteration.
  // Starts as zeros — silence at the beginning is harmless for pitch detection.
  const pitchBuf = new Float32Array(pitchBufSamples)

  let quantumCount = 0
  let totalSamples = 0
  let samplesPending = 0
  let lastEmittedFrame = 0

  let latestValidF1: number | null = null
  let latestValidF2: number | null = null
  let latestValidF3: number | null = null

  // Per-frame formant state, recorded as frames are counted out
  const frameFormants: FrameFormant[] = []
  const pendingFormants: PendingFormant[] = []
  let formantPtr = 0

  // Run pitch analysis on the current buffer and emit patches for all spec
  // frames whose midpoint has at least pitchEmitSamples of future context.
  // Pass finalFlush=true to emit all remaining frames regardless of context.
  function emitPitchPatches(finalFlush: boolean): void {
    const pr = pitch.analyze(pitchBuf)
    // Absolute sample of the pitch buffer's first sample
    const bufStartSample = totalSamples - pitchBufSamples
    const safeSampleLimit = finalFlush
      ? totalSamples
      : totalSamples - pitchEmitSamples
    const safeFrame = Math.min(
      frameFormants.length,
      Math.max(0, Math.floor(safeSampleLimit / timeStepSamples)),
    )

    for (let fi = lastEmittedFrame; fi < safeFrame; fi++) {
      // Time of this spec frame's midpoint relative to the start of the pitch buffer
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
      const { f1, f2, f3 } = frameFormants[fi]!
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
    // Maintain rolling pitch buffer: shift left by QUANTUM, append new samples
    pitchBuf.copyWithin(0, QUANTUM)
    pitchBuf.set(inp, pitchBufSamples - QUANTUM)
    totalSamples += inp.length

    // Feed raw audio through resampler → formant chain
    resampler.feed(inp)
    const nDrain = resampler.drain(drainBuf)
    if (nDrain > 0) formant.feed(drainBuf.subarray(0, nDrain))

    // Buffer formant frames for explicit time-alignment below
    let ff: FormantFrame | null
    while ((ff = formant.readFrame()) !== null) {
      const f1 = ff.formantCount > 0 ? ff.formants[0]!.frequencyHz : null
      const f2 = ff.formantCount > 1 ? ff.formants[1]!.frequencyHz : null
      const f3 = ff.formantCount > 2 ? ff.formants[2]!.frequencyHz : null
      pendingFormants.push({ timeSec: ff.timeSec, f1, f2, f3 })
    }

    samplesPending += inp.length
    while (samplesPending > timeStepSamples) {
      const fi = frameFormants.length
      const tMid = ((fi + 0.5) * timeStepSamples) / sampleRate
      while (formantPtr < pendingFormants.length) {
        const pf = pendingFormants[formantPtr]!
        if (pf.timeSec > tMid) break
        const { f1, f2, f3 } = pf
        if (f1 && f1 >= 200 && f1 <= 1100 && f2 && f2 >= 650 && f2 <= 3500) {
          latestValidF1 = f1
          latestValidF2 = f2
          latestValidF3 = f3 ?? latestValidF3
        }
        formantPtr++
      }
      frameFormants.push({
        f1: latestValidF1,
        f2: latestValidF2,
        f3: latestValidF3,
      })
      samplesPending -= timeStepSamples
    }

    if (++quantumCount % PITCH_INTERVAL === 0) {
      emitPitchPatches(false)
    }
  }

  // Flush all remaining frames using the full buffer as final context
  emitPitchPatches(true)
}

self.addEventListener('unhandledrejection', function (event) {
  // the event object has two special properties:
  // event.promise - the promise that generated the error
  // event.reason  - the unhandled error object
  throw event.reason
})
