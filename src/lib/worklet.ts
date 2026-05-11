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

import './worklet-polyfills.ts'
import type { AnalysisMessage } from './analysis'
import { ResamplerStreamProcessor } from './resample'
import { SpectrogramStreamProcessor } from './spectrogram'
import init, {
  WasmFormantProcessor,
  WasmPitchProcessor,
} from './wasm/braat_dsp.js'

declare const sampleRate: number
declare const currentTime: number

const QUANTUM = 128

// Formant analysis requires audio at 2 × ceiling Hz.
const FORMANT_RATE = 11000 // 2 × 5500 Hz

class VoiceProcessor extends AudioWorkletProcessor {
  private readonly _spec: SpectrogramStreamProcessor
  private readonly _specBuf: Float32Array

  private readonly _resampler: ResamplerStreamProcessor
  private readonly _drainBuf: Float32Array

  // Causal pre-emphasis state for the spectrogram path
  private readonly _preEmphFactor: number
  private _preEmphPrev = 0
  private readonly _preEmphBuf: Float32Array

  // Latest decoded values — updated whenever a new WASM frame arrives
  private _latestF1: number | null = null
  private _latestF2: number | null = null
  private _latestF3: number | null = null
  private _latestPitchHz = 0

  private _started = false
  private _lastCurrentTime: number | null = null

  // WASM processors — null until init completes (quanta are passed through without formant/pitch during init)
  private _formant: WasmFormantProcessor | null = null
  private _pitch: WasmPitchProcessor | null = null
  // Cached Float32Array views into WASM memory; recreated when memory grows
  private _wasmMemory: WebAssembly.Memory | null = null
  private _formantStagingView: Float32Array | null = null
  private _pitchQuantumView: Float32Array | null = null

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
    // ceil(QUANTUM × FORMANT_RATE / sampleRate) + headroom
    this._drainBuf = new Float32Array(256)

    this._preEmphFactor = Math.exp((-2 * Math.PI * 50) / sampleRate)
    this._preEmphBuf = new Float32Array(QUANTUM)

    // Main thread sends WASM bytes after creating the AudioWorkletNode.
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'init-wasm') {
        this._initWasm(e.data.bytes as ArrayBuffer).catch(console.error)
      }
    }
  }

  private async _initWasm(bytes: ArrayBuffer): Promise<void> {
    const wasmExports = await init(bytes)
    this._wasmMemory = wasmExports.memory
    this._formant = new WasmFormantProcessor(FORMANT_RATE)
    this._pitch = new WasmPitchProcessor(sampleRate)
    this._refreshViews()
  }

  private _refreshViews(): void {
    if (!this._formant || !this._pitch || !this._wasmMemory) return
    const buf = this._wasmMemory.buffer
    this._formantStagingView = new Float32Array(
      buf,
      this._formant.staging_ptr(),
      this._drainBuf.length,
    )
    this._pitchQuantumView = new Float32Array(
      buf,
      this._pitch.quantum_ptr(),
      QUANTUM,
    )
  }

  override process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
  ): boolean {
    const start = Date.now()
    const inp = inputs[0]?.[0]
    if (!inp || !inp[0]) return true

    if (!this._started) {
      this._started = true
      this._lastCurrentTime = currentTime
      this.port.postMessage({ type: 'start' as const, currentTime })
    }

    // Emit silent frames for any skipped quanta
    const quantumDurationSec = QUANTUM / sampleRate
    if (this._lastCurrentTime !== null) {
      const timeDelta = currentTime - this._lastCurrentTime
      if (timeDelta > quantumDurationSec * 1.5) {
        const skippedQuanta = Math.round(
          (timeDelta - quantumDurationSec) / quantumDurationSec,
        )
        const sp = this._spec.params
        for (let i = 0; i < skippedQuanta; i++) {
          const msg: AnalysisMessage = {
            voiced: false,
            spectrum: new Float32Array(this._specBuf.length),
            rms: 0,
            firstBinHz: sp.f1Hz,
            freqStepHz: sp.actualFreqStepHz,
            timeStepSec: sp.actualTimeStepSec,
          }
          this.port.postMessage(msg)
        }
      }
    }
    this._lastCurrentTime = currentTime

    // 1. Pre-emphasise into scratch buffer (inp is read-only; do not write to it).
    const alpha = this._preEmphFactor
    const pe = this._preEmphBuf
    pe[0] = inp[0] - alpha * this._preEmphPrev
    for (let i = 1; i < inp.length; i++) pe[i] = inp[i]! - alpha * inp[i - 1]!
    this._preEmphPrev = inp[inp.length - 1]!

    // 2. Feed pre-emphasised audio to spectrogram (TypeScript, stays here).
    this._spec.feed(pe)

    // 3. Feed raw audio through resampler for formant analysis.
    this._resampler.feed(inp)
    const nDrain = this._resampler.drain(this._drainBuf)

    // 4. Formant + pitch via WASM (if ready).
    if (this._formant && this._pitch && this._wasmMemory) {
      // Refresh views if WASM memory grew (buffer identity changes on grow)
      if (this._formantStagingView?.buffer !== this._wasmMemory.buffer) {
        this._refreshViews()
      }

      if (nDrain > 0 && this._formantStagingView) {
        this._formantStagingView.set(this._drainBuf.subarray(0, nDrain))
        this._formant.feed(nDrain)
        if (this._formant.drain_frames()) {
          const f1 = this._formant.f1()
          const f2 = this._formant.f2()
          const f3 = this._formant.f3()
          this._latestF1 = f1 > 0 ? f1 : null
          this._latestF2 = f2 > 0 ? f2 : null
          this._latestF3 = f3 > 0 ? f3 : null
        }
      }

      if (this._pitchQuantumView) {
        this._pitchQuantumView.set(inp)
        this._latestPitchHz = this._pitch.push_quantum()
      }
    }

    // 5. Emit one AnalysisMessage per ready spectrogram frame.
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

    this.port.postMessage({
      time: Date.now() - start,
      inp: inp.length,
      sampleRate,
    })

    return true
  }
}

registerProcessor('voice-processor', VoiceProcessor)
