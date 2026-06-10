// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import { FormantProcessor, FormantStreamProcessor } from './FormantProcessor'

function generateVowelApproximation(
  fundamentalHz: number,
  formantHz: number[],
  formantBW: number[],
  durationSec: number,
  sampleRate: number,
): Float32Array {
  const nsamples = Math.floor(durationSec * sampleRate)
  const samples = new Float32Array(nsamples)
  const dt = 1 / sampleRate

  for (let i = 0; i < nsamples; i++) {
    const t = i * dt
    let signal = 0

    const numHarmonics = 20
    for (let h = 1; h <= numHarmonics; h++) {
      const harmFreq = h * fundamentalHz
      let harmEnergy = 1.0

      for (let f = 0; f < formantHz.length; f++) {
        const dist = Math.abs(harmFreq - formantHz[f]!)
        const bandwidth = formantBW[f] || 50
        harmEnergy *= Math.exp(-0.5 * (dist / bandwidth) ** 2)
      }

      signal +=
        (0.5 / numHarmonics) * harmEnergy * Math.sin(2 * Math.PI * harmFreq * t)
    }

    samples[i] = signal
  }
  return samples
}

function generateSilence(
  durationSec: number,
  sampleRate: number,
): Float32Array {
  return new Float32Array(Math.floor(durationSec * sampleRate))
}

describe('FormantProcessor', () => {
  describe('formant detection', () => {
    it('detects formants in vowel approximation', () => {
      const sampleRate = 11000
      const signal = new Float32Array(Math.floor(0.5 * sampleRate))
      for (let i = 0; i < signal.length; i++) {
        signal[i] = Math.sin((2 * Math.PI * 700 * i) / sampleRate)
      }
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const result = proc.analyze(signal.slice())

      const maxIntensity = Math.max(...result.frames.map((f) => f.intensity))
      expect(maxIntensity).toBeGreaterThan(0)

      const framesWithFormants = result.frames.filter((f) => f.formantCount > 0)
      expect(framesWithFormants.length).toBeGreaterThan(0)
    })

    it('returns empty formants for silence', () => {
      const sampleRate = 11000
      const signal = generateSilence(0.5, sampleRate).slice()
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const result = proc.analyze(signal)

      for (const frame of result.frames) {
        expect(frame.formantCount).toBe(0)
        expect(frame.intensity).toBe(0)
      }
    })
  })

  describe('formant frequency bounds', () => {
    it('respects safety margin at low frequencies', () => {
      const sampleRate = 11000
      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        0.5,
        sampleRate,
      ).slice()
      const safetyMarginHz = 50
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz,
        },
        sampleRate,
      )
      const result = proc.analyze(signal)

      for (const frame of result.frames) {
        for (let i = 0; i < frame.formantCount; i++) {
          const formant = frame.formants[i]!
          expect(formant.frequencyHz).toBeGreaterThanOrEqual(safetyMarginHz)
        }
      }
    })

    it('respects safety margin at high frequencies', () => {
      const sampleRate = 11000
      const nyquist = sampleRate / 2
      const safetyMarginHz = 50
      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        0.5,
        sampleRate,
      ).slice()
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: nyquist,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz,
        },
        sampleRate,
      )
      const result = proc.analyze(signal)

      for (const frame of result.frames) {
        for (let i = 0; i < frame.formantCount; i++) {
          const formant = frame.formants[i]!
          expect(formant.frequencyHz).toBeLessThanOrEqual(
            nyquist - safetyMarginHz,
          )
        }
      }
    })
  })

  describe('formant properties', () => {
    it('returns positive formant frequencies', () => {
      const sampleRate = 11000
      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        0.5,
        sampleRate,
      ).slice()
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const result = proc.analyze(signal)

      for (const frame of result.frames) {
        for (let i = 0; i < frame.formantCount; i++) {
          expect(frame.formants[i]!.frequencyHz).toBeGreaterThan(0)
        }
      }
    })

    it('returns positive bandwidths', () => {
      const sampleRate = 11000
      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        0.5,
        sampleRate,
      ).slice()
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const result = proc.analyze(signal)

      for (const frame of result.frames) {
        for (let i = 0; i < frame.formantCount; i++) {
          expect(frame.formants[i]!.bandwidthHz).toBeGreaterThan(0)
        }
      }
    })

    it('sorts formants by ascending frequency', () => {
      const sampleRate = 11000
      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        0.5,
        sampleRate,
      ).slice()
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const result = proc.analyze(signal)

      for (const frame of result.frames) {
        for (let i = 1; i < frame.formantCount; i++) {
          expect(frame.formants[i]!.frequencyHz).toBeGreaterThan(
            frame.formants[i - 1]!.frequencyHz,
          )
        }
      }
    })
  })

  describe('intensity measurement', () => {
    it('returns zero intensity for silence', () => {
      const sampleRate = 11000
      const signal = generateSilence(0.5, sampleRate).slice()
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const result = proc.analyze(signal)

      for (const frame of result.frames) {
        expect(frame.intensity).toBe(0)
      }
    })

    it('returns non-zero intensity for voiced signal', () => {
      const sampleRate = 11000
      const signal = new Float32Array(Math.floor(0.5 * sampleRate))
      for (let i = 0; i < signal.length; i++) {
        signal[i] = Math.sin((2 * Math.PI * 700 * i) / sampleRate)
      }
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const result = proc.analyze(signal.slice())

      const maxIntensity = Math.max(...result.frames.map((f) => f.intensity))
      expect(maxIntensity).toBeGreaterThan(0)
    })
  })

  describe('frame timing', () => {
    it('returns frames with correct time grid', () => {
      const sampleRate = 11000
      const durationSec = 0.5
      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        durationSec,
        sampleRate,
      ).slice()
      const proc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const result = proc.analyze(signal)

      expect(result.frames.length).toBeGreaterThan(0)
      const lastFrame = result.frames[result.frames.length - 1]!
      expect(lastFrame.timeSec).toBeLessThanOrEqual(durationSec)
    })
  })

  describe('FormantStreamProcessor', () => {
    it('produces frames when fed audio blocks', () => {
      const sampleRate = 11000
      const proc = new FormantStreamProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )

      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        0.5,
        sampleRate,
      )

      const blockSize = 128
      for (let i = 0; i < signal.length; i += blockSize) {
        const block = signal.slice(i, i + blockSize)
        proc.feed(block)
      }

      expect(proc.hasFrame()).toBe(true)
      const frame = proc.readFrame()
      expect(frame).not.toBeNull()
      expect(frame!.timeSec).toBeGreaterThanOrEqual(0)
    })

    it('does not overflow with continuous feed', () => {
      const sampleRate = 11000
      const proc = new FormantStreamProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )

      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        2,
        sampleRate,
      )

      let frameCount = 0
      const blockSize = 128
      for (let i = 0; i < signal.length; i += blockSize) {
        const block = signal.slice(i, i + blockSize)
        proc.feed(block)
        while (proc.hasFrame()) {
          proc.readFrame()
          frameCount++
        }
      }

      expect(frameCount).toBeGreaterThan(0)
    })

    it('produces similar results to batch processor', () => {
      const sampleRate = 11000
      const signal = generateVowelApproximation(
        100,
        [700, 1220, 2600],
        [50, 50, 50],
        0.5,
        sampleRate,
      )

      const batchProc = new FormantProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const batchResult = batchProc.analyze(signal.slice())

      const streamProc = new FormantStreamProcessor(
        {
          maxFormants: 5,
          maxFrequencyHz: 5500,
          halfWindowLengthSec: 0.0125,
          timeStepSec: 0,
          preEmphasisHz: 50,
          safetyMarginHz: 50,
        },
        sampleRate,
      )
      const streamFrames = []
      const blockSize = 128
      for (let i = 0; i < signal.length; i += blockSize) {
        const block = signal.slice(i, i + blockSize)
        streamProc.feed(block)
        let frame
        while ((frame = streamProc.readFrame()) !== null) {
          streamFrames.push(frame)
        }
      }

      expect(
        Math.abs(streamFrames.length - batchResult.frames.length),
      ).toBeLessThanOrEqual(2)

      const minFrames = Math.min(streamFrames.length, batchResult.frames.length)
      for (let i = 0; i < Math.min(minFrames, 5); i++) {
        expect(streamFrames[i]!.formantCount).toBeCloseTo(
          batchResult.frames[i]!.formantCount,
          0,
        )
      }
    })
  })
})
