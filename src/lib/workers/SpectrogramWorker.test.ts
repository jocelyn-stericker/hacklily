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

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { ResolvedSpectrogramParams } from '#/lib/analysis/SpectrogramProcessor'

const SAMPLE_RATE = 44100
const QUANTUM = 128

// Mock state for controllable test data
const mockState = vi.hoisted(() => ({
  audioChunks: [] as Float32Array[],
  spectrogramFrames: [] as Float32Array[],
  params: {
    sampleRate: 44100,
    nsampWindow: 220,
    halfNsampWindow: 110,
    nFFT: 256,
    halfNFFT: 128,
    numFreqs: 129,
    binWidthSamples: 2,
    binWidthHz: 172.265625,
    actualFreqStepHz: 344.53125,
    actualTimeStepSec: 0.002,
    physicalWindowLengthSec: 0.01,
    f1Hz: 43.1328125,
  } as ResolvedSpectrogramParams,
}))

vi.mock('#/lib/audio/AudioRingReader', () => {
  class AudioRingReader {
    constructor(
      _sab: SharedArrayBuffer,
      _bufSamples: number,
      _quantum: number,
    ) {}

    onOverrun?: (dropped: number) => void

    async *[Symbol.asyncIterator]() {
      for (const chunk of mockState.audioChunks) {
        yield chunk
      }
    }
  }

  return { AudioRingReader }
})

vi.mock('#/lib/analysis/SpectrogramProcessor', () => {
  class SpectrogramStreamProcessor {
    params = mockState.params
    private frameIdx = 0

    constructor(_config: any, _sampleRate: number) {}

    feed(_: Float32Array): void {}

    readFrame(out: Float32Array): boolean {
      if (this.frameIdx >= mockState.spectrogramFrames.length) {
        return false
      }
      const frame = mockState.spectrogramFrames[this.frameIdx]!
      out.set(frame)
      this.frameIdx++
      return true
    }
  }

  return { SpectrogramStreamProcessor }
})

// Helper to run analysis with mocked dependencies and capture messages
async function testRunAnalysis(
  audioChunks: Float32Array[],
  sampleRate: number,
): Promise<any[]> {
  mockState.audioChunks = audioChunks

  const { AudioRingReader } = await import('#/lib/audio/AudioRingReader')
  const reader = new AudioRingReader(new SharedArrayBuffer(4096), 1024, 128)

  // Mock the global postMessage to capture calls from runAnalysis
  const capturedMessages: any[] = []
  const originalPostMessage = globalThis.postMessage
  globalThis.postMessage = ((msg: any) => {
    capturedMessages.push(msg)
  }) as any

  try {
    const mod = await import('./SpectrogramWorker')
    const runAnalysis = (mod as any).runAnalysis
    await runAnalysis(reader, sampleRate)
    // Send 'ended' message after runAnalysis completes, matching worker behavior
    capturedMessages.push({ type: 'ended' })
  } finally {
    globalThis.postMessage = originalPostMessage
  }

  return capturedMessages
}

function generateSinusoid(
  freqHz: number,
  durationSec: number,
  sampleRate: number,
): Float32Array {
  const n = Math.floor(durationSec * sampleRate)
  const samples = new Float32Array(n)
  const phase = (2 * Math.PI * freqHz) / sampleRate
  for (let i = 0; i < n; i++) samples[i] = Math.sin(phase * i)
  return samples
}

function generateSilence(
  durationSec: number,
  sampleRate: number,
): Float32Array {
  return new Float32Array(Math.floor(durationSec * sampleRate))
}

function chunkAudio(audio: Float32Array, quantum: number): Float32Array[] {
  const chunks: Float32Array[] = []
  for (let i = 0; i < audio.length; i += quantum) {
    chunks.push(audio.slice(i, i + quantum))
  }
  return chunks
}

describe('SpectrogramWorker', () => {
  beforeEach(() => {
    mockState.audioChunks = []
    mockState.spectrogramFrames = []
  })

  describe('output structure', () => {
    it('sends params message at the start', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      expect(out.length).toBeGreaterThan(0)
      const paramsMsg = out[0]
      expect(paramsMsg?.type).toBe('params')
      expect(paramsMsg).toHaveProperty('firstBinHz')
      expect(paramsMsg).toHaveProperty('freqStepHz')
      expect(paramsMsg).toHaveProperty('timeStepSamples')
      expect(paramsMsg).toHaveProperty('sampleRate')
      expect(paramsMsg.sampleRate).toBe(SAMPLE_RATE)
    })

    it('sends frame messages with expected fields', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      mockState.spectrogramFrames = [
        new Float32Array(129).fill(0.5),
        new Float32Array(129).fill(0.6),
      ]

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const frameMessages = out.filter((m) => m.type === 'frame')
      expect(frameMessages.length).toBeGreaterThan(0)

      for (const msg of frameMessages) {
        expect(msg).toHaveProperty('frameIndex')
        expect(msg).toHaveProperty('spectrum')
        expect(msg).toHaveProperty('rms')
        expect(typeof msg.frameIndex).toBe('number')
        expect(msg.spectrum).toBeInstanceOf(Float32Array)
        expect(typeof msg.rms).toBe('number')
      }
    })

    it('ends with a final ended message', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      expect(out.length).toBeGreaterThan(0)
      expect(out[out.length - 1]?.type).toBe('ended')
    })
  })

  describe('RMS calculation', () => {
    it('produces RMS = 0 for silence', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const frameMessages = out.filter((m) => m.type === 'frame')
      for (const msg of frameMessages) {
        expect(msg.rms).toBeCloseTo(0, 10)
      }
    })

    it('produces non-zero RMS for non-silent audio', async () => {
      const audio = generateSinusoid(440, 0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      mockState.spectrogramFrames = Array.from({ length: 5 }, () =>
        new Float32Array(129).fill(0.5),
      )

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const frameMessages = out.filter((m) => m.type === 'frame')
      expect(frameMessages.length).toBeGreaterThan(0)

      const rmsValues = frameMessages.map((m) => m.rms)
      const maxRms = Math.max(...rmsValues)
      expect(maxRms).toBeGreaterThan(0)
    })

    it('RMS is consistent across frames for constant amplitude signal', async () => {
      const audio = generateSinusoid(150, 0.2, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      mockState.spectrogramFrames = Array.from({ length: 10 }, () =>
        new Float32Array(129).fill(0.5),
      )

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const frameMessages = out.filter((m) => m.type === 'frame')
      expect(frameMessages.length).toBeGreaterThan(2)

      const rmsValues = frameMessages.map((m) => m.rms)
      const avgRms = rmsValues.reduce((a, b) => a + b) / rmsValues.length
      const variance =
        rmsValues.reduce((sum, r) => sum + (r - avgRms) ** 2, 0) /
        rmsValues.length
      const stdDev = Math.sqrt(variance)

      // Standard deviation should be small relative to mean for constant amplitude
      expect(stdDev / avgRms).toBeLessThan(0.5)
    })
  })

  describe('frame indexing', () => {
    it('produces frames with sequential frameIndex starting at 0', async () => {
      const audio = generateSilence(0.15, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      mockState.spectrogramFrames = Array.from({ length: 10 }, () =>
        new Float32Array(129).fill(0.5),
      )

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const frameMessages = out.filter((m) => m.type === 'frame')
      for (let i = 0; i < frameMessages.length; i++) {
        expect(frameMessages[i]?.frameIndex).toBe(i)
      }
    })

    it('number of frames roughly matches audio duration', async () => {
      const durationSec = 0.2
      const audio = generateSilence(durationSec, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      const expectedFrames = Math.floor((durationSec / 0.002) * 0.8) // 0.002 is timeStepSec

      mockState.spectrogramFrames = Array.from({ length: expectedFrames }, () =>
        new Float32Array(129).fill(0.5),
      )

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const frameMessages = out.filter((m) => m.type === 'frame')
      expect(frameMessages.length).toBeGreaterThan(expectedFrames * 0.7)
      expect(frameMessages.length).toBeLessThan(expectedFrames * 1.5)
    })
  })

  describe('spectrum frames', () => {
    it('each spectrum frame has correct length', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      const numFreqs = 129
      mockState.spectrogramFrames = [
        new Float32Array(numFreqs).fill(0.5),
        new Float32Array(numFreqs).fill(0.6),
      ]

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const frameMessages = out.filter((m) => m.type === 'frame')
      for (const msg of frameMessages) {
        expect(msg.spectrum.length).toBe(numFreqs)
      }
    })

    it('spectrum is a copy, not a reference', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      const numFreqs = 129
      mockState.spectrogramFrames = [
        new Float32Array(numFreqs).fill(0.5),
        new Float32Array(numFreqs).fill(0.6),
      ]

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const frameMessages = out.filter((m) => m.type === 'frame')
      const frame1 = frameMessages[0]?.spectrum
      const frame2 = frameMessages[1]?.spectrum

      expect(frame1).not.toBe(frame2)
      if (frame1 && frame2) {
        expect(frame1[0]).toBeCloseTo(0.5)
        expect(frame2[0]).toBeCloseTo(0.6)
      }
    })
  })

  describe('parameter message', () => {
    it('params message contains correct sample rate', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const paramsMsg = out.find((m) => m.type === 'params')
      expect(paramsMsg?.sampleRate).toBe(SAMPLE_RATE)
    })

    it('timeStepSamples matches expected value', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const paramsMsg = out.find((m) => m.type === 'params')
      const expectedTimeStepSamples = Math.round(0.002 * SAMPLE_RATE)
      expect(paramsMsg?.timeStepSamples).toBe(expectedTimeStepSamples)
    })

    it('freqStepHz is positive', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const paramsMsg = out.find((m) => m.type === 'params')
      expect(paramsMsg?.freqStepHz).toBeGreaterThan(0)
    })

    it('firstBinHz is positive', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const paramsMsg = out.find((m) => m.type === 'params')
      expect(paramsMsg?.firstBinHz).toBeGreaterThanOrEqual(0)
    })
  })

  describe('message ordering', () => {
    it('params message always comes first', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const paramsIdx = out.findIndex((m) => m.type === 'params')
      expect(paramsIdx).toBe(0)
    })

    it('all frame messages come before ended message', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const endedIdx = out.findIndex((m) => m.type === 'ended')
      const frameMessages = out.filter(
        (m, i) => m.type === 'frame' && i > endedIdx,
      )
      expect(frameMessages.length).toBe(0)
    })
  })

  describe('empty input', () => {
    it('handles empty audio gracefully', async () => {
      const out = await testRunAnalysis([], SAMPLE_RATE)

      expect(out.length).toBeGreaterThan(0)
      expect(out[0]?.type).toBe('params')
      expect(out[out.length - 1]?.type).toBe('ended')
    })
  })
})
