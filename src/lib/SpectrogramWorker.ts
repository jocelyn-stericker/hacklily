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
import { SpectrogramStreamProcessor } from './spectrogram'
import type {
  AppendFrameMessage,
  FlushMessage,
  ParamsMessage,
  PatchFrameMessage,
  PcmMessage,
  SpectrogramInitMessage,
} from './workerMessages'

const QUANTUM = 128

export type SpectrogramWorkerInMessage =
  | SpectrogramInitMessage
  | FlushMessage
  | null

export type SpectrogramWorkerOutMessage =
  | ParamsMessage
  | AppendFrameMessage
  | PatchFrameMessage
  | PcmMessage

export type SpectrogramWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: SpectrogramWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<SpectrogramWorkerOutMessage>) => any) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<SpectrogramWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

self.onmessage = ({ data }: MessageEvent<SpectrogramWorkerInMessage>) => {
  // Right now we're expecting 'init'. After init, onmessage is replaced to
  // accept 'flush'.
  if (data?.type === 'flush') {
    const pcm = new Float32Array(0)
    postMessage({ type: 'pcm', pcm }, [pcm.buffer])
    return
  }
  if (data?.type !== 'init') {
    return
  }

  const reader = new AudioRingReader(data.sab, data.bufSamples, QUANTUM)
  reader.onOverrun = (dropped) => {
    console.warn(
      `[SpectrogramWorker] ring buffer overrun: ${dropped} samples lost`,
    )
  }
  const analysisDone = runAnalysis(reader, data.sampleRate)

  self.onmessage = async (event: MessageEvent<SpectrogramWorkerInMessage>) => {
    if (event.data && event.data.type !== 'flush') {
      return
    }
    reader.stop()
    const pcm = await analysisDone
    postMessage({ type: 'pcm', pcm }, [pcm.buffer])
  }
}

async function runAnalysis(
  reader: AudioRingReader,
  sampleRate: number,
): Promise<Float32Array> {
  const pcmChunks: Float32Array[] = []

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

  for await (const inp of reader) {
    pcmChunks.push(inp)

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

  const totalLength = pcmChunks.reduce((s, c) => s + c.length, 0)
  const pcm = new Float32Array(Math.max(1, totalLength))
  let offset = 0
  for (const chunk of pcmChunks) {
    pcm.set(chunk, offset)
    offset += chunk.length
  }
  return pcm
}
