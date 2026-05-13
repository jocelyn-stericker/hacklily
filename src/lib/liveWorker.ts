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

import type { AnalysisMessage } from './analysis'
import { AudioRingReader } from './AudioRingReader'
import { FormantStreamProcessor } from './formant'
import type { FormantFrame } from './formant'
import { PitchProcessor } from './pitch'
import { ResamplerStreamProcessor } from './resample'
import { SpectrogramStreamProcessor } from './spectrogram'
import { VadStreamProcessor } from './vad'

const QUANTUM = 128
const FORMANT_RATE = 11000
const VAD_RATE = 16000

// Run pitch analysis every PITCH_INTERVAL quanta (~93 ms at 44.1 kHz with BUF=4096).
// TODO: make dynamic based on buf and sampleRate
const PITCH_INTERVAL = 16
const PITCH_BUF_SIZE = 4096

interface InitMessage {
  type: 'init'
  sab: SharedArrayBuffer
  sampleRate: number
  bufSamples: number
}

interface FlushMessage {
  type: 'flush'
}

export type LiveWorkerInMessage = InitMessage | FlushMessage | null

interface PcmMessage {
  type: 'pcm'
  pcm: Float32Array<ArrayBuffer>
}

type AnalysisCore = Pick<
  AnalysisMessage,
  'spectrum' | 'rms' | 'timeStepSec' | 'freqStepHz' | 'firstBinHz'
>
type AnalysisPatch = Partial<
  Pick<
    AnalysisMessage,
    'voiced' | 'f0' | 'f1' | 'f2' | 'f3' | 'speechProbability'
  >
>

// Emitted once per spectrogram frame. spectrum/rms/timing are always present;
// voiced/pitch/formant/vad fields are optional and may arrive later via PatchFrameMessage.
export type AppendFrameMessage = {
  type: 'frame'
  frameIndex: number
} & AnalysisCore &
  AnalysisPatch

// Overwrites specific fields of a previously emitted frame.
export type PatchFrameMessage = {
  type: 'patch'
  frameIndex: number
} & AnalysisPatch

export type LiveWorkerOutMessage =
  | AppendFrameMessage
  | PatchFrameMessage
  | PcmMessage

export type LiveWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: LiveWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<LiveWorkerOutMessage>) => any) | null
}

self.onmessage = ({ data }: MessageEvent<LiveWorkerInMessage>) => {
  // Right now we're expecting 'init'. After init, onmessage is replaced to
  // accept 'flush'.
  if (data?.type !== 'init') {
    throw new Error('invalid message')
  }

  const reader = new AudioRingReader(data.sab, data.bufSamples, QUANTUM)
  const analysisDone = runAnalysis(reader, data.sampleRate)

  self.onmessage = async (_: MessageEvent<FlushMessage>) => {
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
  const specBuf = new Float32Array(spec.params.numFreqs)

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

  const preEmphFactor = Math.exp((-2 * Math.PI * 50) / sampleRate)
  let preEmphPrev = 0
  const preEmphBuf = new Float32Array(QUANTUM)

  // VAD chain: resample to VAD_RATE, accumulate into VadStreamProcessor.
  // Inference is async; a serialised promise queue keeps LSTM state consistent
  // without blocking the audio handler. speechProbability is always from the
  // most recently completed inference (~32 ms behind real-time).
  const vadResampler = new ResamplerStreamProcessor(sampleRate, VAD_RATE, 50)
  const vadDrainBuf = new Float32Array(256)
  const vad = new VadStreamProcessor()
  const positiveSpeechThreshold = 0.3
  const negativeSpeechThreshold = 0.25
  const redemptionMs = 100

  let latestPitchHz = 0
  let latestF1: number | null = null
  let latestF2: number | null = null
  let latestF3: number | null = null
  let latestValidPitchHz = 0
  let latestValidF1: number | null = null
  let latestValidF2: number | null = null
  let latestValidF3: number | null = null
  let speaking = false
  let redemptionTimeRemaining = 0
  let quantumCount = 0
  let frameIndex = 0

  for await (const inp of reader) {
    pcmChunks.push(inp)

    // 1. Pre-emphasise into scratch buffer
    const alpha = preEmphFactor
    const pe = preEmphBuf
    pe[0] = inp[0]! - alpha * preEmphPrev
    for (let i = 1; i < inp.length; i++) pe[i] = inp[i]! - alpha * inp[i - 1]!
    preEmphPrev = inp[inp.length - 1]!

    // 2. Feed pre-emphasised audio to spectrogram
    spec.feed(pe)

    // 3. Feed raw audio through resampler → formant chain
    resampler.feed(inp)
    const nDrain = resampler.drain(drainBuf)
    if (nDrain > 0) formant.feed(drainBuf.subarray(0, nDrain))

    // 4. Drain formant queue, keeping the latest frame's F1–F3
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

    // 5. Maintain rolling pitch window; run batch analysis every PITCH_INTERVAL quanta
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

    // 6. VAD inference
    // NOTE: we do this async, which results in an offset.
    // TODO: move to another worker
    const audioForVad = inp.slice()
    vadResampler.feed(audioForVad)
    const n = vadResampler.drain(vadDrainBuf)
    if (n > 0) {
      await vad.feed(vadDrainBuf.subarray(0, n))
      if (vad.speechProbability >= positiveSpeechThreshold) {
        speaking = true
        redemptionTimeRemaining = redemptionMs
      } else if (vad.speechProbability < negativeSpeechThreshold) {
        redemptionTimeRemaining -= (n / VAD_RATE) * 1000
        if (redemptionTimeRemaining <= 0) {
          speaking = false
        }
      }
    }

    // 7. Emit one AppendFrameMessage per ready spectrogram frame
    const sp = spec.params
    let rms = 0
    for (const sample of inp) rms += sample * sample
    rms = Math.sqrt(rms / inp.length)

    while (spec.readFrame(specBuf)) {
      const voiced = latestPitchHz > 0 ? speaking : false
      postMessage({
        type: 'frame',
        frameIndex: frameIndex++,
        spectrum: specBuf.slice(),
        rms,
        firstBinHz: sp.f1Hz,
        freqStepHz: sp.actualFreqStepHz,
        timeStepSec: sp.actualTimeStepSec,
        voiced,
        f0: latestValidPitchHz,
        f1: voiced ? latestValidF1 : null,
        f2: voiced ? latestValidF2 : null,
        f3: voiced ? latestValidF3 : null,
        speechProbability: vad.speechProbability,
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
