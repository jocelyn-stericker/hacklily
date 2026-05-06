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

// Compatibility fallback using the deprecated ScriptProcessorNode for browsers
// (primarily WebKit/Safari) that do not support AudioWorklet. Enable via the
// ?scriptProcessor query parameter. Runs DSP on the main thread — expect some
// UI jank compared to the worklet path.

import type { AnalysisMessage } from './analysis'
import { FormantStreamProcessor } from './formant'
import type { FormantFrame } from './formant'
import { PitchProcessor } from './pitch'
import { ResamplerStreamProcessor } from './resample'
import { SpectrogramStreamProcessor } from './spectrogram'

const FORMANT_RATE = 11000

// Match the worklet's quantum size so each sub-chunk produces identical output.
const QUANTUM = 128

// Must be a power of two in [256, 16384] and a multiple of QUANTUM.
const SCRIPT_BUFFER_SIZE = 4096

// Mirror the worklet's pitch constants exactly.
const PITCH_INTERVAL = 16
const PITCH_BUF_SIZE = 4096

export function createScriptProcessorAnalyzer(
  context: AudioContext,
  onMessage: (
    msg: { type: 'start'; currentTime: number } | AnalysisMessage,
  ) => void,
): ScriptProcessorNode {
  const { sampleRate } = context

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
  // ceil(QUANTUM × FORMANT_RATE / sampleRate) + headroom — same as worklet.
  const drainBuf = new Float32Array(256)

  const pitch = new PitchProcessor({ timeStepSec: 0 }, sampleRate)
  const pitchBuf = new Float32Array(PITCH_BUF_SIZE)

  const preEmphFactor = Math.exp((-2 * Math.PI * 50) / sampleRate)
  const preEmphBuf = new Float32Array(QUANTUM)

  let latestF1: number | null = null
  let latestF2: number | null = null
  let latestF3: number | null = null
  let latestPitchHz = 0
  let preEmphPrev = 0
  let quantumCount = 0
  let started = false

  // createScriptProcessor is deprecated but still available everywhere we need it.
  const node = context.createScriptProcessor(SCRIPT_BUFFER_SIZE, 1, 1)

  node.onaudioprocess = (event: AudioProcessingEvent) => {
    const inp = event.inputBuffer.getChannelData(0)

    if (!started) {
      started = true
      // context.currentTime matches the worklet's `currentTime` global semantics.
      onMessage({ type: 'start', currentTime: context.currentTime })
    }

    // Process in QUANTUM-sized sub-chunks, mirroring the worklet's per-quantum
    // loop. This ensures formant and pitch values are updated at the same rate
    // as in the worklet, so each spectrogram frame gets the values that were
    // current when it was ready rather than a single end-of-block reading.
    const sp = spec.params
    const alpha = preEmphFactor

    for (let offset = 0; offset < inp.length; offset += QUANTUM) {
      const chunk = inp.subarray(offset, offset + QUANTUM)

      // 1. Pre-emphasise into scratch buffer.
      preEmphBuf[0] = chunk[0]! - alpha * preEmphPrev
      for (let i = 1; i < QUANTUM; i++)
        preEmphBuf[i] = chunk[i]! - alpha * chunk[i - 1]!
      preEmphPrev = chunk[QUANTUM - 1]!

      // 2. Feed pre-emphasised audio to spectrogram.
      spec.feed(preEmphBuf)

      // 3. Feed raw audio through resampler → formant chain.
      resampler.feed(chunk)
      const nDrain = resampler.drain(drainBuf)
      if (nDrain > 0) formant.feed(drainBuf.subarray(0, nDrain))

      // 4. Drain formant queue, keeping the latest frame's F1–F3.
      let ff: FormantFrame | null
      while ((ff = formant.readFrame()) !== null) {
        latestF1 = ff.formantCount > 0 ? ff.formants[0]!.frequencyHz : null
        latestF2 = ff.formantCount > 1 ? ff.formants[1]!.frequencyHz : null
        latestF3 = ff.formantCount > 2 ? ff.formants[2]!.frequencyHz : null
      }

      // 5. Maintain rolling pitch window; run batch analysis every PITCH_INTERVAL quanta.
      pitchBuf.copyWithin(0, QUANTUM)
      pitchBuf.set(chunk, PITCH_BUF_SIZE - QUANTUM)
      if (++quantumCount % PITCH_INTERVAL === 0) {
        const pr = pitch.analyze(pitchBuf)
        if (pr.frames.length > 0) {
          latestPitchHz = pr.frames[pr.frames.length - 1]!.frequencyHz
        }
      }

      // 6. Emit one AnalysisMessage per ready spectrogram frame.
      let rms = 0
      for (const sample of chunk) rms += sample * sample
      rms = Math.sqrt(rms / QUANTUM)

      while (spec.readFrame(specBuf)) {
        const msg: AnalysisMessage =
          latestPitchHz > 0
            ? {
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
              }
            : {
                voiced: false,
                spectrum: specBuf.slice(),
                rms,
                firstBinHz: sp.f1Hz,
                freqStepHz: sp.actualFreqStepHz,
                timeStepSec: sp.actualTimeStepSec,
              }
        onMessage(msg)
      }
    }

    // Zero the output buffer to prevent mic audio reaching speakers.
    // ScriptProcessorNode must be connected to destination to fire in WebKit,
    // so we must explicitly silence the output.
    event.outputBuffer.getChannelData(0).fill(0)
  }

  return node
}
