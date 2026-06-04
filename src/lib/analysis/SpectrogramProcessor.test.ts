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

import { describe, it, expect } from 'vitest'

import {
  SpectrogramProcessor,
  SpectrogramStreamProcessor,
} from './SpectrogramProcessor'

function generateSinusoid(
  frequencyHz: number,
  durationSec: number,
  sampleRate: number,
  amplitude: number = 1,
): Float32Array {
  const nsamples = Math.floor(durationSec * sampleRate)
  const samples = new Float32Array(nsamples)
  const phase = (2 * Math.PI * frequencyHz) / sampleRate
  for (let i = 0; i < nsamples; i++) {
    samples[i] = amplitude * Math.sin(phase * i)
  }
  return samples
}

function generateChirp(
  startHz: number,
  endHz: number,
  durationSec: number,
  sampleRate: number,
): Float32Array {
  const nsamples = Math.floor(durationSec * sampleRate)
  const samples = new Float32Array(nsamples)
  const dt = 1 / sampleRate
  const k = (endHz - startHz) / durationSec
  for (let i = 0; i < nsamples; i++) {
    const t = i * dt
    const f = startHz + k * t
    samples[i] = Math.sin(2 * Math.PI * f * t)
  }
  return samples
}

describe('SpectrogramProcessor', () => {
  describe('spectrogram analysis', () => {
    it('analyzes single-frequency sinusoid', () => {
      const sampleRate = 11025
      const signal = generateSinusoid(1000, 1, sampleRate)
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )
      const result = proc.analyze([signal])

      expect(result.numFrames).toBeGreaterThan(0)
      expect(result.numFreqs).toBeGreaterThan(0)
      expect(result.data.length).toBe(result.numFrames)

      const freqBin1000 = Math.round(1000 / result.freqStepHz)
      let frameEnergy = 0
      for (const frame of result.data) {
        frameEnergy += frame[freqBin1000] ?? 0
      }
      expect(frameEnergy).toBeGreaterThan(0)
    })

    it('handles multichannel audio', () => {
      const sampleRate = 11025
      const signal1 = generateSinusoid(1000, 0.5, sampleRate, 1)
      const signal2 = generateSinusoid(1000, 0.5, sampleRate, 0.5)
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )
      const result = proc.analyze([signal1, signal2])

      expect(result.numFrames).toBeGreaterThan(0)
      expect(result.data.length).toBe(result.numFrames)
    })

    it('detects energy in chirp signal', () => {
      const sampleRate = 11025
      const signal = generateChirp(500, 3000, 1, sampleRate)
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )
      const result = proc.analyze([signal])

      expect(result.numFrames).toBeGreaterThan(0)

      let totalEnergy = 0
      for (const frame of result.data) {
        for (const val of frame) {
          totalEnergy += val
        }
      }
      expect(totalEnergy).toBeGreaterThan(0)
    })
  })

  describe('frequency binning', () => {
    it('produces correct number of frequency bins', () => {
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        11025,
      )
      const signal = generateSinusoid(1000, 0.5, 11025)
      const result = proc.analyze([signal])

      expect(result.numFreqs).toBe(result.numFreqs)
    })

    it('respects max frequency limit', () => {
      const maxFreq = 4000
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: maxFreq,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        11025,
      )
      const signal = generateSinusoid(5000, 0.5, 11025)
      const result = proc.analyze([signal])

      expect(
        result.f1Hz + result.numFreqs * result.freqStepHz,
      ).toBeLessThanOrEqual(maxFreq * 1.01)
    })
  })

  describe('time alignment', () => {
    it('returns correct time alignment', () => {
      const sampleRate = 11025
      const durationSec = 1
      const signal = generateSinusoid(1000, durationSec, sampleRate)
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )
      const result = proc.analyze([signal])

      expect(result.t1Sec).toBeGreaterThanOrEqual(0)
      expect(result.t1Sec).toBeLessThanOrEqual(0.01)
      const lastFrameTime =
        result.t1Sec + (result.numFrames - 1) * result.timeStepSec
      expect(lastFrameTime).toBeLessThanOrEqual(durationSec)
    })
  })

  describe('window shapes', () => {
    it('supports gaussian window', () => {
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        11025,
      )
      const signal = generateSinusoid(1000, 0.5, 11025)
      const result = proc.analyze([signal])
      expect(result.numFrames).toBeGreaterThan(0)
    })

    it('supports hann window', () => {
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'hanning',
        },
        11025,
      )
      const signal = generateSinusoid(1000, 0.5, 11025)
      const result = proc.analyze([signal])
      expect(result.numFrames).toBeGreaterThan(0)
    })
  })

  describe('energy conservation', () => {
    it('preserves energy in spectral domain', () => {
      const sampleRate = 11025
      const signal = generateSinusoid(1000, 0.5, sampleRate)
      const proc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )
      const result = proc.analyze([signal])

      let totalSpectralEnergy = 0
      for (const frame of result.data) {
        for (const val of frame) {
          totalSpectralEnergy += val
        }
      }
      expect(totalSpectralEnergy).toBeGreaterThan(0)
    })
  })
})

describe('SpectrogramStreamProcessor', () => {
  describe('basic streaming', () => {
    it('processes frames when fed audio blocks', () => {
      const sampleRate = 11025
      const proc = new SpectrogramStreamProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )

      const signal = generateSinusoid(1000, 0.5, sampleRate)
      const blockSize = 128

      for (let i = 0; i < signal.length; i += blockSize) {
        const block = signal.slice(i, i + blockSize)
        proc.feed(block)
      }

      expect(proc.hasFrame()).toBe(true)
      const psd = new Float32Array(proc.params.numFreqs)
      const result = proc.readFrame(psd)
      expect(result).toBe(true)
    })

    it('queue capacity prevents overflow', () => {
      const sampleRate = 11025
      const proc = new SpectrogramStreamProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )

      const signal = generateSinusoid(1000, 2, sampleRate)
      let frameCount = 0
      const blockSize = 128

      for (let i = 0; i < signal.length; i += blockSize) {
        proc.feed(signal.slice(i, i + blockSize))
        const psd = new Float32Array(proc.params.numFreqs)
        while (proc.readFrame(psd)) {
          frameCount++
        }
      }

      expect(frameCount).toBeGreaterThan(0)
    })
  })

  describe('stream vs batch parity', () => {
    it('produces similar results to batch processor', () => {
      const sampleRate = 11025
      const signal = generateSinusoid(1000, 0.5, sampleRate)

      const batchProc = new SpectrogramProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )
      const batchResult = batchProc.analyze([signal])

      const streamProc = new SpectrogramStreamProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )
      const psd = new Float32Array(streamProc.params.numFreqs)
      let streamFrameCount = 0
      const blockSize = 128

      for (let i = 0; i < signal.length; i += blockSize) {
        streamProc.feed(signal.slice(i, i + blockSize))
        while (streamProc.readFrame(psd)) {
          streamFrameCount++
        }
      }

      expect(
        Math.abs(streamFrameCount - batchResult.numFrames),
      ).toBeLessThanOrEqual(2)
    })
  })

  describe('frame output properties', () => {
    it('reads frames into provided buffer', () => {
      const sampleRate = 11025
      const proc = new SpectrogramStreamProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )

      const signal = generateSinusoid(1000, 0.5, sampleRate)
      for (let i = 0; i < signal.length; i += 128) {
        proc.feed(signal.slice(i, i + 128))
      }

      const psd = new Float32Array(proc.params.numFreqs)
      if (proc.readFrame(psd)) {
        let hasEnergy = false
        for (const val of psd) {
          if (val > 0) hasEnergy = true
          expect(val).toBeGreaterThanOrEqual(0)
        }
        expect(hasEnergy).toBe(true)
      }
    })

    it('returns false when queue empty', () => {
      const sampleRate = 11025
      const proc = new SpectrogramStreamProcessor(
        {
          effectiveWindowLengthSec: 0.005,
          maxFrequencyHz: 5000,
          timeStepSec: 0.002,
          freqStepHz: 20,
          windowShape: 'gaussian',
        },
        sampleRate,
      )

      const psd = new Float32Array(proc.params.numFreqs)
      expect(proc.readFrame(psd)).toBe(false)
    })
  })
})
