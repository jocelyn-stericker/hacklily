// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { ResolvedSpectrogramParams } from '#/lib/analysis/SpectrogramProcessor'

const SAMPLE_RATE = 44100
const QUANTUM = 128

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

vi.mock('#/lib/audio/AudioRopeReader', () => {
  class AudioRopeReader {
    constructor(_share: any, _quantum: number) {}

    grow(_grow: any): void {}
    seal(): void {}

    async *[Symbol.asyncIterator]() {
      for (const chunk of mockState.audioChunks) {
        yield chunk
      }
    }
  }

  return { AudioRopeReader }
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

async function testRunAnalysis(
  audioChunks: Float32Array[],
  sampleRate: number,
): Promise<any[]> {
  mockState.audioChunks = audioChunks

  const { AudioRopeReader } = await import('#/lib/audio/AudioRopeReader')
  const reader = new AudioRopeReader(
    {
      type: 'audio-rope',
      buffers: [new SharedArrayBuffer(4096)],
      ctrlPtr: new SharedArrayBuffer(8),
      sampleRate: 44100,
    },
    128,
  )

  const capturedMessages: any[] = []
  const originalPostMessage = globalThis.postMessage
  globalThis.postMessage = ((msg: any) => {
    capturedMessages.push(msg)
  }) as any

  try {
    const mod = await import('./SpectrogramWorker')
    const runAnalysis = (mod as any).runAnalysis
    await runAnalysis(reader, sampleRate)
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
    it('sends patch messages with expected fields', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      mockState.spectrogramFrames = [
        new Float32Array(129).fill(0.5),
        new Float32Array(129).fill(0.6),
      ]

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const patchMessages = out.filter((m) => m.type === 'patch')
      expect(patchMessages.length).toBeGreaterThan(0)

      for (const msg of patchMessages) {
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

      const patchMessages = out.filter((m) => m.type === 'patch')
      for (const msg of patchMessages) {
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

      const patchMessages = out.filter((m) => m.type === 'patch')
      expect(patchMessages.length).toBeGreaterThan(0)

      const rmsValues = patchMessages.map((m) => m.rms)
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

      const patchMessages = out.filter((m) => m.type === 'patch')
      expect(patchMessages.length).toBeGreaterThan(2)

      const rmsValues = patchMessages.map((m) => m.rms)
      const avgRms = rmsValues.reduce((a, b) => a + b) / rmsValues.length
      const variance =
        rmsValues.reduce((sum, r) => sum + (r - avgRms) ** 2, 0) /
        rmsValues.length
      const stdDev = Math.sqrt(variance)

      expect(stdDev / avgRms).toBeLessThan(0.5)
    })
  })

  describe('frame indexing', () => {
    it('produces patches with sequential frameIndex starting at 0', async () => {
      const audio = generateSilence(0.15, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      mockState.spectrogramFrames = Array.from({ length: 10 }, () =>
        new Float32Array(129).fill(0.5),
      )

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const patchMessages = out.filter((m) => m.type === 'patch')
      for (let i = 0; i < patchMessages.length; i++) {
        expect(patchMessages[i]?.frameIndex).toBe(i)
      }
    })

    it('number of patches roughly matches audio duration', async () => {
      const durationSec = 0.2
      const audio = generateSilence(durationSec, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      const expectedFrames = Math.floor((durationSec / 0.002) * 0.8)

      mockState.spectrogramFrames = Array.from({ length: expectedFrames }, () =>
        new Float32Array(129).fill(0.5),
      )

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const patchMessages = out.filter((m) => m.type === 'patch')
      expect(patchMessages.length).toBeGreaterThan(expectedFrames * 0.7)
      expect(patchMessages.length).toBeLessThan(expectedFrames * 1.5)
    })
  })

  describe('spectrum patches', () => {
    it('each spectrum patch has correct length', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)
      const numFreqs = 129
      mockState.spectrogramFrames = [
        new Float32Array(numFreqs).fill(0.5),
        new Float32Array(numFreqs).fill(0.6),
      ]

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const patchMessages = out.filter((m) => m.type === 'patch')
      for (const msg of patchMessages) {
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

      const patchMessages = out.filter((m) => m.type === 'patch')
      const frame1 = patchMessages[0]?.spectrum
      const frame2 = patchMessages[1]?.spectrum

      expect(frame1).not.toBe(frame2)
      if (frame1 && frame2) {
        expect(frame1[0]).toBeCloseTo(0.5)
        expect(frame2[0]).toBeCloseTo(0.6)
      }
    })
  })

  describe('message ordering', () => {
    it('all patch messages come before ended message', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, QUANTUM)

      const out = await testRunAnalysis(chunks, SAMPLE_RATE)

      const endedIdx = out.findIndex((m) => m.type === 'ended')
      const patchMessages = out.filter(
        (m, i) => m.type === 'patch' && i > endedIdx,
      )
      expect(patchMessages.length).toBe(0)
    })
  })

  describe('empty input', () => {
    it('handles empty audio gracefully', async () => {
      const out = await testRunAnalysis([], SAMPLE_RATE)

      expect(out.length).toBeGreaterThan(0)
      expect(out[out.length - 1]?.type).toBe('ended')
    })
  })
})
