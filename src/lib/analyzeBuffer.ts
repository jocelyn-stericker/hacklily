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

// Core audio analysis worker spawning; defines AnalysisFrame type for frame data with pitch, formants, and RMS.

import type { AnalysisFrame, AnalysisChunk } from './AnalysisFrame'
import { framesVoiced } from './AnalysisFrame'
import { FormantProcessor } from './FormantProcessor'
import { PitchProcessor } from './PitchProcessor'
import { preEmphasis } from './preEmphasis'
import { resample } from './ResampleProcessor'
import { SpectrogramProcessor } from './SpectrogramProcessor'
import { VadStreamProcessor } from './VadProcessor'

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
): Promise<AnalysisChunk> {
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
  const pitchResult = pitchProc.analyze(input)

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

  const POSITIVE_THRESHOLD = 0.3
  const NEGATIVE_THRESHOLD = 0.25
  const PREROLL_FRAMES = Math.ceil(0.05 / specResult.timeStepSec)

  // Step 1: per-frame VAD probability and raw hysteresis speaking state
  const frameSpeechProb = new Float32Array(specResult.numFrames)
  const rawSpeaking = new Uint8Array(specResult.numFrames)
  let speaking = false
  for (let x = 0; x < specResult.numFrames; x++) {
    const tMid = (x + 0.5) * specResult.timeStepSec
    const vadIdx = Math.min(
      vadProbs.length - 1,
      Math.floor(tMid / vadChunkDurSec),
    )
    const prob = vadProbs[vadIdx]!
    frameSpeechProb[x] = prob
    if (prob >= POSITIVE_THRESHOLD) speaking = true
    else if (prob < NEGATIVE_THRESHOLD) speaking = false
    rawSpeaking[x] = speaking ? 1 : 0
  }

  // Step 2: apply pre-roll — retroactively mark PREROLL_FRAMES before each voiced onset
  const speechDetectedArr = new Uint8Array(specResult.numFrames)
  let aheadSpeaking = 0
  for (let x = specResult.numFrames - 1; x >= 0; x--) {
    if (rawSpeaking[x]) aheadSpeaking = PREROLL_FRAMES + 1
    speechDetectedArr[x] = aheadSpeaking > 0 ? 1 : 0
    aheadSpeaking = Math.max(0, aheadSpeaking - 1)
  }

  // Step 3: build per-frame formant state with validity filter and last-valid holdover,
  // matching FormantWorker's F1/F2 range checks (F1 ∈ [200,1100] Hz, F2 ∈ [650,3500] Hz)
  let formantPtr = 0
  let latestValidF1: number | null = null
  let latestValidF2: number | null = null
  let latestValidF3: number | null = null

  for (let x = 0; x < specResult.numFrames; x += 1) {
    const t0 = x * specResult.timeStepSec
    const t1 = (x + 1) * specResult.timeStepSec
    const tMid = (t0 + t1) / 2

    // Advance formant pointer: include all frames whose time is at or before tMid
    while (
      formantPtr < formantResult.frames.length &&
      formantResult.frames[formantPtr]!.timeSec <= tMid
    ) {
      const ff = formantResult.frames[formantPtr]!
      const f1 = ff.formantCount > 0 ? ff.formants[0]!.frequencyHz : null
      const f2 = ff.formantCount > 1 ? ff.formants[1]!.frequencyHz : null
      const f3 = ff.formantCount > 2 ? ff.formants[2]!.frequencyHz : null
      if (f1 && f1 >= 200 && f1 <= 1100 && f2 && f2 >= 650 && f2 <= 3500) {
        latestValidF1 = f1
        latestValidF2 = f2
        latestValidF3 = f3 ?? latestValidF3
      }
      formantPtr++
    }

    // simplified waveform
    let sumSq = 0
    const frameStart = Math.floor(t0 * sampleRate)
    const frameEnd = Math.min(input.length - 1, Math.floor(t1 * sampleRate) - 1)
    for (let i = frameStart; i <= frameEnd; i++) sumSq += input[i]! * input[i]!
    const rms = Math.sqrt(sumSq / (frameEnd - frameStart + 1))

    // nearest pitch result
    const pitchIdx = Math.min(
      pitchResult.frames.length - 1,
      Math.round(tMid / pitchResult.timeStepSec),
    )
    const pitchFrame = pitchResult.frames[pitchIdx]

    // final results
    const pitchDetected = pitchFrame ? pitchFrame.frequencyHz > 0 : false
    results.push({
      pitchDetected,
      speechDetected: speechDetectedArr[x] === 1,
      f0: pitchFrame?.frequencyHz ?? 0,
      f1: pitchDetected ? latestValidF1 : null,
      f2: pitchDetected ? latestValidF2 : null,
      f3: pitchDetected ? latestValidF3 : null,
      spectrum: specResult.data[x]!,
      rms,
      speechProbability: frameSpeechProb[x]!,
    } satisfies AnalysisFrame)
  }

  return {
    timeStepSamples: Math.round(specResult.timeStepSec * sampleRate),
    sampleRate,
    freqStepHz: specResult.freqStepHz,
    firstBinHz: specResult.f1Hz,
    startTimeSec: 0,
    frames: results,
    voiced: framesVoiced(results),
  }
}
