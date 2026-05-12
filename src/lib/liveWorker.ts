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
import { ResamplerStreamProcessor } from './resample'
import { SpectrogramStreamProcessor } from './spectrogram'
import init, {
  WasmFormantProcessor,
  WasmPitchProcessor,
} from './wasm/braat_dsp.js'

const QUANTUM = 128
const FORMANT_RATE = 11000

interface InitMessage {
  type: 'init'
  audioPort: MessagePort
  wasmBytes: ArrayBuffer
  sampleRate: number
}

self.onmessage = ({ data }: MessageEvent<InitMessage>) => {
  setup(data).catch(console.error)
}

async function setup({ audioPort, wasmBytes, sampleRate }: InitMessage) {
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
  const drainBuf = new Float32Array(256)

  const preEmphFactor = Math.exp((-2 * Math.PI * 50) / sampleRate)
  let preEmphPrev = 0
  const preEmphBuf = new Float32Array(QUANTUM)

  let latestF1: number | null = null
  let latestF2: number | null = null
  let latestF3: number | null = null
  let latestPitchHz = 0
  let lastCurrentTime: number | null = null

  const wasmExports = await init(wasmBytes)
  const wasmMemory = wasmExports.memory
  const formant = new WasmFormantProcessor(FORMANT_RATE)
  const pitch = new WasmPitchProcessor(sampleRate)

  let formantStagingView = new Float32Array(
    wasmMemory.buffer,
    formant.staging_ptr(),
    drainBuf.length,
  )
  let pitchQuantumView = new Float32Array(
    wasmMemory.buffer,
    pitch.quantum_ptr(),
    QUANTUM,
  )

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

    // 3. Feed raw audio through resampler for formant analysis
    resampler.feed(inp)
    const nDrain = resampler.drain(drainBuf)

    // 4. Formant + pitch via WASM
    if (formantStagingView.buffer !== wasmMemory.buffer) {
      formantStagingView = new Float32Array(
        wasmMemory.buffer,
        formant.staging_ptr(),
        drainBuf.length,
      )
      pitchQuantumView = new Float32Array(
        wasmMemory.buffer,
        pitch.quantum_ptr(),
        QUANTUM,
      )
    }

    if (nDrain > 0) {
      formantStagingView.set(drainBuf.subarray(0, nDrain))
      formant.feed(nDrain)
      if (formant.drain_frames()) {
        const f1 = formant.f1()
        const f2 = formant.f2()
        const f3 = formant.f3()
        latestF1 = f1 > 0 ? f1 : null
        latestF2 = f2 > 0 ? f2 : null
        latestF3 = f3 > 0 ? f3 : null
      }
    }

    pitchQuantumView.set(inp)
    latestPitchHz = pitch.push_quantum()

    // 5. Emit one AnalysisMessage per ready spectrogram frame
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
