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

import { preEmphasis } from './preEmphasis'
import { resample } from './resample'
import { SpectrogramProcessor } from './spectrogram'
import init, {
  WasmBatchPitchAnalyzer,
  WasmFormantProcessor,
} from './wasm/braat_dsp.js'

export type AnalysisCommon = {
  spectrum: Float32Array
  rms: number
  timeStepSec: number
  freqStepHz: number
  // Center of first bin
  firstBinHz: number
}

export type VoicedAnalysisMessage = AnalysisCommon & {
  voiced: true
  f0: number
  f1: number | null
  f2: number | null
  f3: number | null
}

export type UnvoicedAnalysisMessage = AnalysisCommon & { voiced: false }
export type AnalysisMessage = VoicedAnalysisMessage | UnvoicedAnalysisMessage

interface Opts {
  maxFreqHz: number
  windowLengthSec: number
  timeStepSec: number
  formantCeilingHz: number
  maxFormants: number
  noPreemphasis: boolean
}

function defaultOpts(): Opts {
  return {
    maxFreqHz: 5500,
    windowLengthSec: 0.005,
    timeStepSec: 0.002,
    formantCeilingHz: 5500,
    maxFormants: 5,
    noPreemphasis: false,
  }
}

// Formant analysis requires audio at 2 × ceiling Hz.
const FORMANT_RATE = 11000

export async function analyzeBuffer(
  input: Float32Array,
  sampleRate: number,
  wasmBytes: ArrayBuffer,
): Promise<AnalysisMessage[]> {
  const results: AnalysisMessage[] = []
  const opts = defaultOpts()

  // Spectrogram uses pre-emphasized audio (matches Praat's display).
  const specAudio = opts.noPreemphasis
    ? input
    : (() => {
        const copy = input.slice()
        preEmphasis(copy, sampleRate, 50)
        return copy
      })()
  const specProc = new SpectrogramProcessor(
    {
      effectiveWindowLengthSec: opts.windowLengthSec,
      maxFrequencyHz: Math.min(opts.maxFreqHz, sampleRate / 2),
      timeStepSec: opts.timeStepSec,
      freqStepHz: 20,
      windowShape: 'gaussian',
    },
    sampleRate,
  )
  const specResult = specProc.analyze([specAudio])

  // Initialize WASM (no-op on subsequent calls within the same worker).
  const { memory } = await init(wasmBytes)

  const pitchAnalyzer = new WasmBatchPitchAnalyzer(sampleRate)
  const formantProc = new WasmFormantProcessor(FORMANT_RATE)

  try {
    // Feed raw audio to pitch analyzer in chunks; run global Viterbi when done.
    const pitchChunkCap = pitchAnalyzer.chunk_cap()
    let chunkView = new Float32Array(
      memory.buffer,
      pitchAnalyzer.chunk_ptr(),
      pitchChunkCap,
    )
    let pOffset = 0
    while (pOffset < input.length) {
      const n = Math.min(pitchChunkCap, input.length - pOffset)
      if (chunkView.buffer !== memory.buffer) {
        chunkView = new Float32Array(
          memory.buffer,
          pitchAnalyzer.chunk_ptr(),
          pitchChunkCap,
        )
      }
      chunkView.set(input.subarray(pOffset, pOffset + n))
      pitchAnalyzer.append(n)
      pOffset += n
    }
    pitchAnalyzer.run()

    const pitchFrameCount = pitchAnalyzer.frame_count()
    const pitchTimeStep = pitchAnalyzer.time_step_sec()
    const pitchFirstSec = pitchAnalyzer.first_frame_sec()

    // Feed and drain formant interleaved to prevent the 64-frame queue from
    // filling up and dropping frames for long files.
    const formantSamples = resample(input, sampleRate, FORMANT_RATE, 50)
    const stagingCap = formantProc.staging_cap()
    const formantFrames: {
      f1: number | null
      f2: number | null
      f3: number | null
    }[] = []

    const drainFormant = () => {
      while (formantProc.has_frame()) {
        formantProc.read_next_frame()
        const f1 = formantProc.f1()
        const f2 = formantProc.f2()
        const f3 = formantProc.f3()
        formantFrames.push({
          f1: f1 > 0 ? f1 : null,
          f2: f2 > 0 ? f2 : null,
          f3: f3 > 0 ? f3 : null,
        })
      }
    }

    let stagingView = new Float32Array(
      memory.buffer,
      formantProc.staging_ptr(),
      stagingCap,
    )
    let fOffset = 0
    while (fOffset < formantSamples.length) {
      const n = Math.min(stagingCap, formantSamples.length - fOffset)
      if (stagingView.buffer !== memory.buffer) {
        stagingView = new Float32Array(
          memory.buffer,
          formantProc.staging_ptr(),
          stagingCap,
        )
      }
      stagingView.set(formantSamples.subarray(fOffset, fOffset + n))
      formantProc.feed(n)
      drainFormant()
      fOffset += n
    }

    const formantTimeStep = formantProc.time_step_sec()
    const formantFirstSec = formantProc.first_frame_sec()

    // Map pitch + formant estimates to spectrogram frames by timestamp.
    for (let x = 0; x < specResult.numFrames; x++) {
      const t0 = x * specResult.timeStepSec
      const t1 = (x + 1) * specResult.timeStepSec
      const tMid = (t0 + t1) / 2

      let sumSq = 0
      const frameStart = Math.floor(t0 * sampleRate)
      const frameEnd = Math.min(
        input.length - 1,
        Math.floor(t1 * sampleRate) - 1,
      )
      for (let i = frameStart; i <= frameEnd; i++)
        sumSq += input[i]! * input[i]!
      const rms = Math.sqrt(sumSq / (frameEnd - frameStart + 1))

      const pitchIdx = Math.max(
        0,
        Math.min(
          pitchFrameCount - 1,
          Math.round((tMid - pitchFirstSec) / pitchTimeStep),
        ),
      )
      const f0 = pitchAnalyzer.f0_at(pitchIdx)

      const formantIdx = Math.max(
        0,
        Math.min(
          formantFrames.length - 1,
          Math.round((tMid - formantFirstSec) / formantTimeStep),
        ),
      )
      const formantFrame = formantFrames[formantIdx]

      if (f0 > 0) {
        results.push({
          voiced: true,
          f0,
          f1: formantFrame?.f1 ?? null,
          f2: formantFrame?.f2 ?? null,
          f3: formantFrame?.f3 ?? null,
          spectrum: specResult.data[x]!,
          rms,
          firstBinHz: specResult.f1Hz,
          freqStepHz: specResult.freqStepHz,
          timeStepSec: specResult.timeStepSec,
        } satisfies AnalysisMessage)
      } else {
        results.push({
          voiced: false,
          spectrum: specResult.data[x]!,
          rms,
          firstBinHz: specResult.f1Hz,
          freqStepHz: specResult.freqStepHz,
          timeStepSec: specResult.timeStepSec,
        } satisfies AnalysisMessage)
      }
    }
  } finally {
    pitchAnalyzer.free()
    formantProc.free()
  }

  return results
}
