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

import { FormantProcessor } from './formant'
import { PitchProcessor } from './pitch'
import { preEmphasis } from './preEmphasis'
import { resample } from './resample'
import { SpectrogramProcessor } from './spectrogram'

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

export function analyzeBuffer(
  input: Float32Array,
  sampleRate: number,
): AnalysisMessage[] {
  const results: AnalysisMessage[] = []
  console.log(
    `analyzeBuffer ${input.length} samples (${(input.length / sampleRate).toFixed(2)} s)`,
  )
  const opts = defaultOpts()

  // Spectrogram analysis
  // Pre-emphasise a copy before analysis, matching Praat's Sound editor display
  // (Sound_preEmphasize_inplace, 50 Hz cutoff, ~6 dB/octave boost above 50 Hz).
  // This boosts high frequencies by ~30 dB at 2 kHz and ~35 dB at 3 kHz, making
  // faint fricative / consonant structure visible against a loud vowel baseline.
  console.log('Running spectrogram...')
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
  console.log(
    `Spectrogram: ${specResult.numFrames} frames, ${specResult.numFreqs} bins`,
  )

  // Formant analysis
  const formantRate = opts.formantCeilingHz * 2
  const formantSamples = resample(input, sampleRate, formantRate, 50)
  console.log(`Formant analysis: ${formantSamples.length} samples`)

  console.log('Running formant analysis…')
  const formantProc = new FormantProcessor(
    {
      maxFormants: opts.maxFormants,
      maxFrequencyHz: opts.formantCeilingHz,
      halfWindowLengthSec: 0.025,
      timeStepSec: 0,
      preEmphasisHz: 50,
      safetyMarginHz: 50,
    },
    formantRate,
  )
  const formantResult = formantProc.analyze(formantSamples)
  console.log(` ${formantResult.frames.length} frames`)

  // Pitch tracking
  const pitchProc = new PitchProcessor(
    {
      timeStepSec: 0,
    },
    sampleRate,
  )
  const pitchResult = pitchProc.analyze(specAudio)

  for (let x = 0; x < specResult.numFrames; x += 1) {
    const t0 = x * specResult.timeStepSec
    const t1 = (x + 1) * specResult.timeStepSec

    // simplified waveform
    let sumSq = 0
    const frameStart = Math.floor(t0 * sampleRate)
    const frameEnd = Math.min(input.length - 1, Math.floor(t1 * sampleRate) - 1)
    for (let i = frameStart; i <= frameEnd; i++) sumSq += input[i]! * input[i]!
    const rms = Math.sqrt(sumSq / (frameEnd - frameStart + 1))

    // nearest formant result
    const formantIdx = Math.min(
      formantResult.frames.length - 1,
      Math.round((t0 + t1) / 2 / formantResult.timeStepSec),
    )
    const formantFrame = formantResult.frames[formantIdx]!

    // nearest pitch result
    const pitchIdx = Math.min(
      pitchResult.frames.length - 1,
      Math.round((t0 + t1) / 2 / pitchResult.timeStepSec),
    )
    const pitchFrame = pitchResult.frames[pitchIdx]!

    // final results
    if (pitchFrame.frequencyHz > 0) {
      results.push({
        voiced: true,
        f0: pitchFrame.frequencyHz,
        f1: formantFrame.formants[0]?.frequencyHz ?? 0,
        f2: formantFrame.formants[1]?.frequencyHz ?? 0,
        f3: formantFrame.formants[2]?.frequencyHz ?? 0,
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

  return results
}
