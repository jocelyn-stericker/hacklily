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
import { FormantStreamProcessor } from './formant'
import type { FormantFrame } from './formant'
import { PitchProcessor } from './pitch'
import { ResamplerStreamProcessor } from './resample'
import type {
  EndedMessage,
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

// Run pitch analysis every PITCH_INTERVAL quanta (~93 ms at 44.1 kHz with BUF=4096).
// TODO: make dynamic based on buf and sampleRate
const PITCH_INTERVAL = 16
const PITCH_BUF_SIZE = 4096

export type FormantWorkerInMessage = FormantInitMessage | null

export type FormantWorkerOutMessage =
  | ParamsMessage
  | PatchFrameMessage
  | EndedMessage

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

async function runAnalysis(
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
  const pitchBuf = new Float32Array(PITCH_BUF_SIZE)

  let quantumCount = 0
  let samplesPending = 0

  let latestPitchHz = 0
  let latestF1: number | null = null
  let latestF2: number | null = null
  let latestF3: number | null = null
  let latestValidPitchHz = 0
  let latestValidF1: number | null = null
  let latestValidF2: number | null = null
  let latestValidF3: number | null = null

  let lastRecordedFrameIndex = 0
  let frameIndex = 0

  for await (const inp of reader) {
    // Feed raw audio through resampler → formant chain
    resampler.feed(inp)
    const nDrain = resampler.drain(drainBuf)
    if (nDrain > 0) formant.feed(drainBuf.subarray(0, nDrain))

    // Drain formant queue, keeping the latest frame's F1–F3
    let ff: FormantFrame | null
    while ((ff = formant.readFrame()) !== null) {
      latestF1 = ff.formantCount > 0 ? ff.formants[0]!.frequencyHz : null
      latestF2 = ff.formantCount > 1 ? ff.formants[1]!.frequencyHz : null
      latestF3 = ff.formantCount > 2 ? ff.formants[2]!.frequencyHz : null
      if (
        latestF1 &&
        latestF1 >= 200 &&
        latestF1 <= 1100 &&
        latestF2 &&
        latestF2 >= 650 &&
        latestF2 <= 3500
      ) {
        latestValidF1 = latestF1
        latestValidF2 = latestF2
        latestValidF3 = latestF3 ?? latestValidF3
      }
    }

    // Maintain rolling pitch window; run batch analysis every PITCH_INTERVAL quanta
    pitchBuf.copyWithin(0, QUANTUM)
    pitchBuf.set(inp, PITCH_BUF_SIZE - QUANTUM)
    if (++quantumCount % PITCH_INTERVAL === 0) {
      const pr = pitch.analyze(pitchBuf)
      if (pr.frames.length > 0) {
        // Last frame = most recent audio, benefits most from Viterbi look-back
        latestPitchHz = pr.frames[pr.frames.length - 1]!.frequencyHz
        latestValidPitchHz =
          latestPitchHz > 0 ? latestPitchHz : latestValidPitchHz
      }
    }

    samplesPending += inp.length
    while (samplesPending > timeStepSamples) {
      // Patch the relevant frame(s)
      // TODO: the formant and pitch have different lags, so really the formants
      // should also have a calculated frame index. They're within 10ms though,
      // which is good enough for me.
      const pitchDetected = latestPitchHz > 0
      const actualFrameIdx = Math.round(
        frameIndex - (QUANTUM * PITCH_INTERVAL) / timeStepSamples,
      )
      while (lastRecordedFrameIndex < actualFrameIdx) {
        postMessage({
          type: 'patch',
          frameIndex: lastRecordedFrameIndex++,
          pitchDetected,
          f0: latestValidPitchHz,
          f1: pitchDetected ? latestValidF1 : null,
          f2: pitchDetected ? latestValidF2 : null,
          f3: pitchDetected ? latestValidF3 : null,
        } satisfies PatchFrameMessage)
      }

      samplesPending -= timeStepSamples
      frameIndex += 1
    }
  }
}

self.addEventListener('unhandledrejection', function (event) {
  // the event object has two special properties:
  // event.promise - the promise that generated the error
  // event.reason  - the unhandled error object
  throw event.reason
})
