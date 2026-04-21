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

declare const sampleRate: number
declare const currentTime: number

const QUANTUM = 128

// Formant analysis requires audio at 2 × ceiling Hz.
const FORMANT_RATE = 11000 // 2 × 5500 Hz

// Pitch: run batch PitchProcessor.analyze() every PITCH_INTERVAL quanta.
//
// Performance notes (at 44.1 kHz, PITCH_BUF_SIZE=4096, PITCH_INTERVAL=16):
//   - Pitch analysis runs every 16 × 128 = 2048 samples ≈ 46 ms.
//   - Each call to analyze() runs a full Viterbi pass over ~9 frames.
//   - Measured cost: roughly 2–15 ms in Firefox
//
// If audio glitches appear (dropouts, stuttering):
//   1. Reduce PITCH_BUF_SIZE (fewer Viterbi frames per call, less accurate).
//   2. Increase PITCH_INTERVAL (less frequent, higher latency).
//   3. Replace with a lighter per-frame approach — YIN is ~10× cheaper but
//      produces more octave errors; streaming autocorrelation (no Viterbi)
//      falls between the two.
const PITCH_INTERVAL = 16
const PITCH_BUF_SIZE = 4096 // ≈ 93 ms at 44.1 kHz

class VoiceProcessor extends AudioWorkletProcessor {
  private readonly _spec: SpectrogramStreamProcessor
  private readonly _specBuf: Float32Array

  private readonly _resampler: ResamplerStreamProcessor
  private readonly _formant: FormantStreamProcessor
  private readonly _drainBuf: Float32Array

  private readonly _pitch: PitchProcessor
  private readonly _pitchBuf: Float32Array

  // Causal pre-emphasis state: last raw sample from previous quantum.
  // Praat's batch preEmphasize() scans backwards (non-causal); here we use the
  // equivalent causal forward filter y[n] = x[n] − α·x[n−1], which matches it
  // asymptotically and is the only option in a streaming context.
  private readonly _preEmphFactor: number
  private _preEmphPrev = 0
  private readonly _preEmphBuf: Float32Array

  // Latest decoded formant/pitch values — updated whenever a new frame arrives,
  // then stamped onto the next spectrogram message.
  private _latestF1: number | null = null
  private _latestF2: number | null = null
  private _latestF3: number | null = null
  private _latestPitchHz = 0

  private _quantumCount = 0
  private _started = false

  constructor() {
    super()

    this._spec = new SpectrogramStreamProcessor(
      {
        effectiveWindowLengthSec: 0.005,
        maxFrequencyHz: Math.min(5500, sampleRate / 2),
        timeStepSec: 0.002,
        freqStepHz: 20,
        windowShape: 'gaussian',
      },
      sampleRate,
    )
    this._specBuf = new Float32Array(this._spec.params.numFreqs)

    this._resampler = new ResamplerStreamProcessor(sampleRate, FORMANT_RATE, 50)
    this._formant = new FormantStreamProcessor(
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
    // ceil(QUANTUM × FORMANT_RATE / sampleRate) + headroom
    this._drainBuf = new Float32Array(256)

    this._pitch = new PitchProcessor({ timeStepSec: 0 }, sampleRate)
    this._pitchBuf = new Float32Array(PITCH_BUF_SIZE)

    this._preEmphFactor = Math.exp((-2 * Math.PI * 50) / sampleRate)
    this._preEmphBuf = new Float32Array(QUANTUM)
  }

  override process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
  ): boolean {
    const inp = inputs[0]?.[0]
    if (!inp || !inp[0]) return true

    if (!this._started) {
      this._started = true
      this.port.postMessage({ type: 'start' as const, currentTime })
    }

    // 1. Pre-emphasise into scratch buffer (inp is a read-only view of the
    //    shared audio-engine buffer — do not write to it).
    const alpha = this._preEmphFactor
    const pe = this._preEmphBuf
    pe[0] = inp[0] - alpha * this._preEmphPrev
    for (let i = 1; i < inp.length; i++) pe[i] = inp[i]! - alpha * inp[i - 1]!
    this._preEmphPrev = inp[inp.length - 1]!

    // 2. Feed pre-emphasised audio to spectrogram.
    this._spec.feed(pe)

    // 3. Feed raw audio through resampler → formant chain.
    this._resampler.feed(inp)
    const nDrain = this._resampler.drain(this._drainBuf)
    if (nDrain > 0) this._formant.feed(this._drainBuf.subarray(0, nDrain))

    // 4. Drain formant queue, keeping the latest frame's F1–F3.
    let ff: FormantFrame | null
    while ((ff = this._formant.readFrame()) !== null) {
      // ff points to a pre-allocated internal slot — read values before the next
      // readFrame() call can overwrite them.
      this._latestF1 = ff.formantCount > 0 ? ff.formants[0]!.frequencyHz : null
      this._latestF2 = ff.formantCount > 1 ? ff.formants[1]!.frequencyHz : null
      this._latestF3 = ff.formantCount > 2 ? ff.formants[2]!.frequencyHz : null
    }

    // 5. Maintain rolling pitch window; run batch analysis every PITCH_INTERVAL quanta.
    this._pitchBuf.copyWithin(0, QUANTUM)
    this._pitchBuf.set(inp, PITCH_BUF_SIZE - QUANTUM)
    if (++this._quantumCount % PITCH_INTERVAL === 0) {
      const pr = this._pitch.analyze(this._pitchBuf)
      if (pr.frames.length > 0) {
        // Last frame = most recent audio, benefits most from Viterbi look-back.
        this._latestPitchHz = pr.frames[pr.frames.length - 1]!.frequencyHz
      }
    }

    // 6. Emit one AnalysisMessage per ready spectrogram frame.
    const sp = this._spec.params
    let rms = 0
    for (const sample of inp) rms += sample * sample
    rms = Math.sqrt(rms / inp.length)

    while (this._spec.readFrame(this._specBuf)) {
      const msg: AnalysisMessage =
        this._latestPitchHz > 0
          ? {
              voiced: true,
              f0: this._latestPitchHz,
              f1: this._latestF1,
              f2: this._latestF2,
              f3: this._latestF3,
              spectrum: this._specBuf.slice(),
              rms,
              firstBinHz: sp.f1Hz,
              freqStepHz: sp.actualFreqStepHz,
              timeStepSec: sp.actualTimeStepSec,
            }
          : {
              voiced: false,
              spectrum: this._specBuf.slice(),
              rms,
              firstBinHz: sp.f1Hz,
              freqStepHz: sp.actualFreqStepHz,
              timeStepSec: sp.actualTimeStepSec,
            }

      this.port.postMessage(msg)
    }

    return true
  }
}

registerProcessor('voice-processor', VoiceProcessor)
