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
import { VadStreamProcessor } from './vad'

export type AnalysisFrame = {
  spectrum: Float32Array
  rms: number
  timeStepSamples: number
  sampleRate: number
  freqStepHz: number
  // Center of first bin
  firstBinHz: number
  // Silero VAD v5 speech probability (0 = silence, 1 = speech)
  speechProbability: number
  voiced: boolean
  f0: number // 0 when unvoiced
  f1: number | null // null when unvoiced or formant not detected
  f2: number | null
  f3: number | null
}

// Frames confirmed voiced with both F1 and F2 present. Used as a type predicate in VowelChart.
export type VoicedAnalysisFrame = AnalysisFrame & {
  voiced: true
  f1: number
  f2: number
}

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

export async function analyzeBuffer(
  input: Float32Array,
  sampleRate: number,
): Promise<AnalysisFrame[]> {
  const results: AnalysisFrame[] = []
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

  // VAD: resample to 16 kHz and process 512-sample chunks sequentially
  console.log('Running VAD...')
  const vad16k = resample(input, sampleRate, 16000, 50)
  const vad = new VadStreamProcessor()
  const vadChunkDurSec = 512 / 16000
  const numVadChunks = Math.ceil(vad16k.length / 512)
  const vadProbs = new Float32Array(Math.max(1, numVadChunks))
  const vadChunk = new Float32Array(512)
  for (let i = 0; i < numVadChunks; i++) {
    const start = i * 512
    const end = Math.min(start + 512, vad16k.length)
    vadChunk.fill(0)
    vadChunk.set(vad16k.subarray(start, end))
    await vad.feed(vadChunk)
    vadProbs[i] = vad.speechProbability
  }
  console.log(`VAD: ${numVadChunks} chunks processed`)

  const positiveSpeechThreshold = 0.3
  const negativeSpeechThreshold = 0.25
  const redemptionMs = 1400
  let speaking = false
  let redemptionTimeRemaining = 0
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

    // nearest VAD chunk (32 ms granularity)
    const vadIdx = Math.min(
      vadProbs.length - 1,
      Math.floor((t0 + t1) / 2 / vadChunkDurSec),
    )
    const speechProbability = vadProbs[vadIdx]!
    if (vad.speechProbability >= positiveSpeechThreshold) {
      speaking = true
      redemptionTimeRemaining = redemptionMs
    } else if (vad.speechProbability < negativeSpeechThreshold) {
      redemptionTimeRemaining -= x * specResult.timeStepSec * 1000
      if (redemptionTimeRemaining <= 0) {
        speaking = false
      }
    }

    // final results
    const voiced = pitchFrame.frequencyHz > 0
    results.push({
      voiced: voiced && speaking,
      f0: pitchFrame.frequencyHz,
      f1: voiced ? (formantFrame.formants[0]?.frequencyHz ?? null) : null,
      f2: voiced ? (formantFrame.formants[1]?.frequencyHz ?? null) : null,
      f3: voiced ? (formantFrame.formants[2]?.frequencyHz ?? null) : null,
      spectrum: specResult.data[x]!,
      rms,
      firstBinHz: specResult.f1Hz,
      freqStepHz: specResult.freqStepHz,
      timeStepSamples: Math.round(specResult.timeStepSec * sampleRate),
      sampleRate,
      speechProbability,
    } satisfies AnalysisFrame)
  }

  return results
}
