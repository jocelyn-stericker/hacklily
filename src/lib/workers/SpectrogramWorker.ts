// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/// <reference lib="webworker" />

import { powerToInt8 } from '#/lib/analysis/AnalysisFrame'
import { SpectrogramStreamProcessor } from '#/lib/analysis/SpectrogramProcessor'
import { AudioRopeReader } from '#/lib/audio/AudioRopeReader'

import { weight } from '../analysis/weight'
import type {
  PatchFrameMessage,
  WorkerEndedMessage,
  RopeConsumerInitMessage,
  RopeGrowMessage,
  RopeSealMessage,
} from './workerMessages'

const LOG = '[SpectrogramWorker]'

declare function postMessage(
  message: SpectrogramWorkerOutMessage,
  transfer?: Transferable[],
): void

const QUANTUM = 128

export type SpectrogramWorkerInMessage =
  | RopeConsumerInitMessage
  | RopeGrowMessage
  | RopeSealMessage
  | null

export type SpectrogramWorkerOutMessage = PatchFrameMessage | WorkerEndedMessage

export type SpectrogramWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: SpectrogramWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<SpectrogramWorkerOutMessage>) => any) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<SpectrogramWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

let ropeReader: AudioRopeReader | null = null

self.onmessage = ({ data }: MessageEvent<SpectrogramWorkerInMessage>) => {
  if (!data) return
  if (data.type === 'init') {
    ropeReader = new AudioRopeReader(data.rope, QUANTUM)
    void runAnalysis(ropeReader, data.sampleRate).then(() => {
      postMessage({ type: 'ended' })
      console.log(LOG, 'complete')
    })
    return
  }
  if (!ropeReader) return
  if (data.type === 'rope-grow') ropeReader.grow(data.grow)
  else ropeReader.seal()
}

export async function runAnalysis(reader: AudioRopeReader, sampleRate: number) {
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
  const specBuf = new Float32Array(sp.numFreqs)

  const preEmphFactor = Math.exp((-2 * Math.PI * 50) / sampleRate)
  let preEmphPrev = 0
  const preEmphBuf = new Float32Array(QUANTUM)

  let frameIndex = 0
  let mostRecentWeight: number | null = null

  for await (const inp of reader) {
    console.assert(inp.length === QUANTUM)

    const alpha = preEmphFactor
    const pe = preEmphBuf
    pe[0] = inp[0]! - alpha * preEmphPrev
    for (let i = 1; i < inp.length; i++) pe[i] = inp[i]! - alpha * inp[i - 1]!
    preEmphPrev = inp[inp.length - 1]!

    spec.feed(pe)

    let rms = 0
    for (const sample of inp) rms += sample * sample
    rms = Math.sqrt(rms / inp.length)

    while (spec.readFrame(specBuf)) {
      const quantized = new Int8Array(sp.numFreqs)
      for (let i = 0; i < sp.numFreqs; i++)
        quantized[i] = powerToInt8(specBuf[i]!)

      // Recompute every 5 frames
      if (frameIndex % 5 === 0) {
        mostRecentWeight = weight(quantized, {
          sampleRate,
          freqStepHz: 20,
          firstBinHz: sp.f1Hz,
        })
      }

      postMessage({
        type: 'patch',
        frameIndex: frameIndex++,
        spectrum: quantized,
        rms,
        lunaBrightness: null,
        weight: mostRecentWeight,
      } satisfies PatchFrameMessage)
    }
  }
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
