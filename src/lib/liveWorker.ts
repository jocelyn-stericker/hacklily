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

import type { AnalysisMessage } from './analysis'
import { FormantStreamProcessor } from './formant'
import type { FormantFrame } from './formant'
import { PitchProcessor } from './pitch'
import { ResamplerStreamProcessor } from './resample'
import { SpectrogramStreamProcessor } from './spectrogram'

const QUANTUM = 128
const FORMANT_RATE = 11000

// Run pitch analysis every PITCH_INTERVAL quanta (~93 ms at 44.1 kHz with BUF=4096).
const PITCH_INTERVAL = 16
const PITCH_BUF_SIZE = 4096

interface InitMessage {
  type: 'init'
  audioPort: MessagePort
  sampleRate: number
}

self.onmessage = ({ data }: MessageEvent<InitMessage>) => {
  setup(data)
}

function setup({ audioPort, sampleRate }: InitMessage) {
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

  let latestF1: number | null = null
  let latestF2: number | null = null
  let latestF3: number | null = null
  let latestPitchHz = 0
  let lastCurrentTime: number | null = null
  let quantumCount = 0

  const quantumDurationSec = QUANTUM / sampleRate

  audioPort.onmessage = ({
    data: { audio, currentTime },
  }: MessageEvent<{ audio: Float32Array; currentTime: number }>) => {
    // Emit silent frames for any skipped quanta
    if (lastCurrentTime !== null) {
      const timeDelta = currentTime - lastCurrentTime
      if (timeDelta > quantumDurationSec * 1.5) {
        const skippedQuanta = Math.round(
          (timeDelta - quantumDurationSec) / quantumDurationSec,
        )
        const sp = spec.params
        for (let i = 0; i < skippedQuanta; i++) {
          self.postMessage({
            voiced: false,
            spectrum: new Float32Array(specBuf.length),
            rms: 0,
            firstBinHz: sp.f1Hz,
            freqStepHz: sp.actualFreqStepHz,
            timeStepSec: sp.actualTimeStepSec,
          } satisfies AnalysisMessage)
        }
      }
    }
    lastCurrentTime = currentTime

    const inp = audio

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
    }

    // 5. Maintain rolling pitch window; run batch analysis every PITCH_INTERVAL quanta
    pitchBuf.copyWithin(0, QUANTUM)
    pitchBuf.set(inp, PITCH_BUF_SIZE - QUANTUM)
    if (++quantumCount % PITCH_INTERVAL === 0) {
      const pr = pitch.analyze(pitchBuf)
      if (pr.frames.length > 0) {
        // Last frame = most recent audio, benefits most from Viterbi look-back
        latestPitchHz = pr.frames[pr.frames.length - 1]!.frequencyHz
      }
    }

    // 6. Emit one AnalysisMessage per ready spectrogram frame
    const sp = spec.params
    let rms = 0
    for (const sample of inp) rms += sample * sample
    rms = Math.sqrt(rms / inp.length)

    while (spec.readFrame(specBuf)) {
      self.postMessage(
        latestPitchHz > 0
          ? ({
              voiced: true,
              f0: latestPitchHz,
              f1: latestF1,
              f2: latestF2,
              f3: latestF3,
              spectrum: specBuf.slice(),
              rms,
              firstBinHz: sp.f1Hz,
              freqStepHz: sp.actualFreqStepHz,
              timeStepSec: sp.actualTimeStepSec,
            } satisfies AnalysisMessage)
          : ({
              voiced: false,
              spectrum: specBuf.slice(),
              rms,
              firstBinHz: sp.f1Hz,
              freqStepHz: sp.actualFreqStepHz,
              timeStepSec: sp.actualTimeStepSec,
            } satisfies AnalysisMessage),
      )
    }
  }
}
