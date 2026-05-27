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
import { SpectrogramStreamProcessor } from './SpectrogramProcessor'
import type {
  AppendFrameMessage,
  ParamsMessage,
  PatchFrameMessage,
  WorkerEndedMessage,
  AudioReadyMessage,
  SpectrogramInitMessage,
} from './workerMessages'

const LOG = '[SpectrogramWorker]'

declare function postMessage(
  message: SpectrogramWorkerOutMessage,
  transfer?: Transferable[],
): void

const QUANTUM = 128

export type SpectrogramWorkerInMessage = SpectrogramInitMessage | null

export type SpectrogramWorkerOutMessage =
  | ParamsMessage
  | AppendFrameMessage
  | PatchFrameMessage
  | WorkerEndedMessage
  | AudioReadyMessage

export type SpectrogramWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: SpectrogramWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<SpectrogramWorkerOutMessage>) => any) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<SpectrogramWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

self.onmessage = async ({ data }: MessageEvent<SpectrogramWorkerInMessage>) => {
  if (data?.type !== 'init') {
    return
  }

  const reader = new AudioRingReader(data.sab, data.bufSamples, QUANTUM)
  reader.onOverrun = (dropped) => {
    console.warn(LOG, `ring buffer overrun: ${dropped} samples lost`)
  }

  await runAnalysis(reader, data.sampleRate)
  postMessage({ type: 'ended' })
  console.log(LOG, 'complete')
}

export async function runAnalysis(reader: AudioRingReader, sampleRate: number) {
  const spec = new SpectrogramStreamProcessor(
    {
      effectiveWindowLengthSec: 0.005,
      maxFrequencyHz: Math.min(5500, sampleRate / 2),
      timeStepSec: 0.002,
      freqStepHz: 20,
      windowShape: 'gaussian',
    },
    sampleRate,
  )
  const sp = spec.params
  postMessage({
    type: 'params',
    firstBinHz: sp.f1Hz,
    freqStepHz: sp.actualFreqStepHz,
    timeStepSamples: Math.round(sp.actualTimeStepSec * sampleRate),
    sampleRate,
  } satisfies ParamsMessage)
  const specBuf = new Float32Array(sp.numFreqs)

  const preEmphFactor = Math.exp((-2 * Math.PI * 50) / sampleRate)
  let preEmphPrev = 0
  const preEmphBuf = new Float32Array(QUANTUM)

  let frameIndex = 0
  // ~10sec PCM buffer
  let pcmData = new Float32Array(
    Math.round((sampleRate * 10) / QUANTUM) * QUANTUM,
  )
  let pcmDataIndex = 0

  for await (const inp of reader) {
    console.assert(inp.length === QUANTUM)
    pcmData.set(inp, pcmDataIndex)
    pcmDataIndex += inp.length
    if (pcmDataIndex === pcmData.length) {
      postMessage({ type: 'audioReady', pcm: pcmData }, [pcmData.buffer])
      pcmData = new Float32Array(
        Math.round((sampleRate * 10) / QUANTUM) * QUANTUM,
      )
      pcmDataIndex = 0
    }

    // Pre-emphasise into scratch buffer
    const alpha = preEmphFactor
    const pe = preEmphBuf
    pe[0] = inp[0]! - alpha * preEmphPrev
    for (let i = 1; i < inp.length; i++) pe[i] = inp[i]! - alpha * inp[i - 1]!
    preEmphPrev = inp[inp.length - 1]!

    // Feed pre-emphasised audio to spectrogram
    spec.feed(pe)

    // Emit one AppendFrameMessage per ready spectrogram frame
    let rms = 0
    for (const sample of inp) rms += sample * sample
    rms = Math.sqrt(rms / inp.length)

    while (spec.readFrame(specBuf)) {
      postMessage({
        type: 'frame',
        frameIndex: frameIndex++,
        spectrum: specBuf.slice(),
        rms,
      } satisfies AppendFrameMessage)
    }
  }

  if (pcmDataIndex > 0) {
    postMessage(
      {
        type: 'audioReady',
        pcm: pcmData.subarray(0, pcmDataIndex),
      },
      [pcmData.buffer],
    )
  }
}

self.addEventListener('unhandledrejection', function (event) {
  // the event object has two special properties:
  // event.promise - the promise that generated the error
  // event.reason  - the unhandled error object
  throw event.reason
})
