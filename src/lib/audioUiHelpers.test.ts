import { describe, it, expect, beforeEach } from 'vitest'

import type { AnalysisChunk, AnalysisFrame } from './analysis'
import { computeDbBounds, concatAudioBuffers } from './audioUiHelpers'

const DEFAULT_PARAMS = {
  timeStepSamples: 882,
  sampleRate: 44100,
  freqStepHz: 20,
  firstBinHz: 0,
}

function makeChunk(frames: AnalysisFrame[]): AnalysisChunk {
  return { ...DEFAULT_PARAMS, frames }
}

function makeFrame(
  spectrum: Float32Array,
  overrides: Partial<AnalysisFrame> = {},
): AnalysisFrame {
  return {
    voiced: false,
    f0: 0,
    f1: null,
    f2: null,
    f3: null,
    rms: 0,
    speechProbability: 0,
    spectrum,
    ...overrides,
  }
}

describe('computeDbBounds', () => {
  describe('basic dB conversion', () => {
    it('converts spectrum values to dB correctly', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([1.0]))]),
      ])
      expect(result).not.toBeNull()
      expect(result?.min).toBeCloseTo(0, 2)
      expect(result?.max).toBeCloseTo(0, 2)
    })

    it('converts power values using correct formula', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([100.0]))]),
      ])
      expect(result?.max).toBeCloseTo(20, 1)
    })
  })

  describe('edge cases', () => {
    it('returns null for empty frames array', () => {
      const result = computeDbBounds([])
      expect(result).toBeNull()
    })

    it('returns null when all spectrum values are zero or negative', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([0, -1, -100]))]),
      ])
      expect(result).toBeNull()
    })

    it('ignores zero and negative values in spectrum', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([1.0, 0, -5, 10.0, -0.5]))]),
      ])
      expect(result).not.toBeNull()
      expect(result?.min).toBeCloseTo(0, 2)
      expect(result?.max).toBeCloseTo(10, 1)
    })

    it('caps minimum dB at -120', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([1e-15]))]),
      ])
      expect(result?.min).toBeCloseTo(-120, 1)
    })

    it('handles single frame with no valid spectrum values', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([0, 0, 0]))]),
      ])
      expect(result).toBeNull()
    })
  })

  describe('range specification', () => {
    it('respects from and to range parameters', () => {
      const chunk = makeChunk([
        makeFrame(new Float32Array([1.0])),
        makeFrame(new Float32Array([100.0])),
        makeFrame(new Float32Array([1000.0])),
      ])
      const result = computeDbBounds([chunk], 1, 2)
      expect(result?.max).toBeCloseTo(20, 1)
    })

    it('handles from=to (empty range)', () => {
      const result = computeDbBounds(
        [makeChunk([makeFrame(new Float32Array([100.0]))])],
        0,
        0,
      )
      expect(result).toBeNull()
    })

    it('processes multiple frames with varying spectrum values', () => {
      const frames = Array.from({ length: 10 }, (_, i) =>
        makeFrame(new Float32Array([10 ** (i / 10)])),
      )
      const result = computeDbBounds([makeChunk(frames)])
      expect(result).not.toBeNull()
      expect(result!.max).toBeGreaterThan(result!.min)
    })
  })

  describe('voiced and unvoiced frames', () => {
    it('processes both voiced and unvoiced frames equally', () => {
      const spectrum = new Float32Array([50.0])
      const voicedFrame = makeFrame(spectrum, {
        voiced: true,
        rms: 0.5,
        f0: 200,
        f1: 700,
        f2: 1200,
        f3: 2500,
      })
      const unvoicedFrame = makeFrame(spectrum, { rms: 0.3 })

      const voicedResult = computeDbBounds([makeChunk([voicedFrame])])
      const unvoicedResult = computeDbBounds([makeChunk([unvoicedFrame])])

      expect(voicedResult?.max).toBeCloseTo(unvoicedResult?.max ?? 0, 2)
      expect(voicedResult?.min).toBeCloseTo(unvoicedResult?.min ?? 0, 2)
    })
  })

  describe('numerical edge cases', () => {
    it('handles very large spectrum values', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([1e10]))]),
      ])
      expect(result).not.toBeNull()
      expect(isFinite(result?.max ?? 0)).toBe(true)
    })

    it('handles mixed positive and negative values (ignoring negatives)', () => {
      const result = computeDbBounds([
        makeChunk([makeFrame(new Float32Array([0.1, -10, 10, -100, 100]))]),
      ])
      expect(result?.max).toBeCloseTo(20, 1)
      expect(result?.min).toBeCloseTo(-10, 1)
    })
  })
})

describe.skip('concatAudioBuffers', () => {
  let audioContext: any

  beforeEach(() => {
    // AudioContext not available in Node.js test environment
    audioContext = null
  })

  describe('basic concatenation', () => {
    it('concatenates two mono buffers', () => {
      const buffer1 = audioContext.createBuffer(1, 100, 44100)
      const buffer2 = audioContext.createBuffer(1, 100, 44100)

      const ch1 = buffer1.getChannelData(0)
      const ch2 = buffer2.getChannelData(0)
      for (let i = 0; i < 100; i++) {
        ch1[i] = i / 100
        ch2[i] = (i + 100) / 100
      }

      const result = concatAudioBuffers(buffer1, buffer2)

      expect(result.length).toBe(200)
      expect(result.numberOfChannels).toBe(1)
      expect(result.sampleRate).toBe(44100)

      const resultCh = result.getChannelData(0)
      for (let i = 0; i < 100; i++) {
        expect(resultCh[i]).toBeCloseTo(i / 100, 5)
        expect(resultCh[i + 100]).toBeCloseTo((i + 100) / 100, 5)
      }
    })

    it('concatenates two stereo buffers', () => {
      const buffer1 = audioContext.createBuffer(2, 50, 44100)
      const buffer2 = audioContext.createBuffer(2, 50, 44100)

      for (let c = 0; c < 2; c++) {
        const ch1 = buffer1.getChannelData(c)
        const ch2 = buffer2.getChannelData(c)
        for (let i = 0; i < 50; i++) {
          ch1[i] = c + i / 50
          ch2[i] = c + (i + 50) / 50
        }
      }

      const result = concatAudioBuffers(buffer1, buffer2)

      expect(result.length).toBe(100)
      expect(result.numberOfChannels).toBe(2)
      expect(result.sampleRate).toBe(44100)
    })
  })

  describe('channel mismatch handling', () => {
    it('promotes mono + stereo to stereo', () => {
      const mono = audioContext.createBuffer(1, 50, 44100)
      const stereo = audioContext.createBuffer(2, 50, 44100)

      const monoFirst = concatAudioBuffers(mono, stereo)
      expect(monoFirst.numberOfChannels).toBe(2)
      expect(monoFirst.length).toBe(100)

      const stereoFirst = concatAudioBuffers(stereo, mono)
      expect(stereoFirst.numberOfChannels).toBe(2)
      expect(stereoFirst.length).toBe(100)
    })

    it('handles mismatched channel counts (takes maximum)', () => {
      const buffer1 = audioContext.createBuffer(1, 100, 44100)
      const buffer2 = audioContext.createBuffer(4, 100, 44100)

      const result = concatAudioBuffers(buffer1, buffer2)
      expect(result.numberOfChannels).toBe(4)
    })

    it('fills missing channels with silence', () => {
      const mono = audioContext.createBuffer(1, 50, 44100)
      const ch = mono.getChannelData(0)
      for (let i = 0; i < 50; i++) ch[i] = 0.5

      const stereo = audioContext.createBuffer(2, 50, 44100)
      const stereoL = stereo.getChannelData(0)
      const stereoR = stereo.getChannelData(1)
      for (let i = 0; i < 50; i++) {
        stereoL[i] = 0.7
        stereoR[i] = 0.3
      }

      const result = concatAudioBuffers(mono, stereo)
      const resultL = result.getChannelData(0)
      const resultR = result.getChannelData(1)

      for (let i = 0; i < 50; i++) {
        expect(resultL[i]).toBeCloseTo(0.5, 5)
        expect(resultR[i]).toBeCloseTo(0, 5)
      }

      for (let i = 50; i < 100; i++) {
        expect(resultL[i]).toBeCloseTo(0.7, 5)
        expect(resultR[i]).toBeCloseTo(0.3, 5)
      }
    })
  })

  describe('sample rate handling', () => {
    it('preserves first buffer sample rate', () => {
      const buffer1 = audioContext.createBuffer(1, 100, 44100)
      const buffer2 = audioContext.createBuffer(1, 100, 44100)

      const result = concatAudioBuffers(buffer1, buffer2)
      expect(result.sampleRate).toBe(44100)
    })
  })

  describe('edge cases', () => {
    it('concatenates empty buffer with non-empty buffer', () => {
      const empty = audioContext.createBuffer(1, 0, 44100)
      const nonempty = audioContext.createBuffer(1, 100, 44100)
      const ch = nonempty.getChannelData(0)
      for (let i = 0; i < 100; i++) ch[i] = 0.5

      const result = concatAudioBuffers(empty, nonempty)
      expect(result.length).toBe(100)
      const resultCh = result.getChannelData(0)
      for (let i = 0; i < 100; i++) {
        expect(resultCh[i]).toBeCloseTo(0.5, 5)
      }
    })

    it('concatenates non-empty buffer with empty buffer', () => {
      const nonempty = audioContext.createBuffer(1, 100, 44100)
      const empty = audioContext.createBuffer(1, 0, 44100)
      const ch = nonempty.getChannelData(0)
      for (let i = 0; i < 100; i++) ch[i] = 0.5

      const result = concatAudioBuffers(nonempty, empty)
      expect(result.length).toBe(100)
      const resultCh = result.getChannelData(0)
      for (let i = 0; i < 100; i++) {
        expect(resultCh[i]).toBeCloseTo(0.5, 5)
      }
    })

    it('concatenates two empty buffers', () => {
      const empty1 = audioContext.createBuffer(1, 0, 44100)
      const empty2 = audioContext.createBuffer(1, 0, 44100)

      const result = concatAudioBuffers(empty1, empty2)
      expect(result.length).toBe(0)
      expect(result.numberOfChannels).toBe(1)
    })

    it('handles large buffers (several seconds of audio)', () => {
      const sampleRate = 44100
      const duration = 5
      const buffer1 = audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate,
      )
      const buffer2 = audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate,
      )

      const result = concatAudioBuffers(buffer1, buffer2)
      expect(result.length).toBe(sampleRate * duration * 2)
      expect(result.duration).toBeCloseTo(10, 1)
    })
  })

  describe('data integrity', () => {
    it('preserves exact sample values from both buffers', () => {
      const buffer1 = audioContext.createBuffer(1, 3, 44100)
      const buffer2 = audioContext.createBuffer(1, 3, 44100)

      const ch1 = buffer1.getChannelData(0)
      const ch2 = buffer2.getChannelData(0)
      ch1[0] = 0.123
      ch1[1] = -0.456
      ch1[2] = 0.789
      ch2[0] = -0.321
      ch2[1] = 0.654
      ch2[2] = -0.987

      const result = concatAudioBuffers(buffer1, buffer2)
      const resultCh = result.getChannelData(0)

      expect(resultCh[0]).toBeCloseTo(0.123, 5)
      expect(resultCh[1]).toBeCloseTo(-0.456, 5)
      expect(resultCh[2]).toBeCloseTo(0.789, 5)
      expect(resultCh[3]).toBeCloseTo(-0.321, 5)
      expect(resultCh[4]).toBeCloseTo(0.654, 5)
      expect(resultCh[5]).toBeCloseTo(-0.987, 5)
    })
  })
})
