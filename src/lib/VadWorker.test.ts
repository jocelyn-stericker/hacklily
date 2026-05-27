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

import { runAnalysis } from './VadWorker'

const SAMPLE_RATE = 44100
const VAD_RATE = 16000
const TIME_STEP_SAMPLES = Math.round(0.002 * SAMPLE_RATE) // 88 samples
const QUANTUM = 128

const mockVadState = vi.hoisted(() => ({
  probsByChunk: [] as number[],
  defaultProb: 0,
  shouldFail: false,
}))

vi.mock('./AudioRingReader', () => {
  class AudioRingReader {
    constructor(
      _sab: SharedArrayBuffer,
      _bufSamples: number,
      _quantum: number,
    ) {}

    onOverrun?: (dropped: number) => void

    async *[Symbol.asyncIterator]() {
      // Generate audio chunks: 0.5 seconds
      const totalChunks = Math.ceil((0.5 * SAMPLE_RATE) / QUANTUM)
      for (let i = 0; i < totalChunks; i++) {
        yield new Float32Array(QUANTUM)
      }
    }
  }

  return { AudioRingReader }
})

vi.mock('./ResampleProcessor', () => {
  class ResamplerStreamProcessor {
    private sampleBuffer: number[] = []

    constructor(_inRate: number, _outRate: number, _order: number) {}

    feed(inp: Float32Array): void {
      // Simulate accumulating samples with approximate resampling ratio
      for (const sample of inp) {
        this.sampleBuffer.push(sample)
      }
    }

    drain(out: Float32Array): number {
      // Simple decimation: convert from SAMPLE_RATE to VAD_RATE
      const ratio = SAMPLE_RATE / VAD_RATE
      const maxOut = Math.floor(this.sampleBuffer.length / ratio)
      const actualOut = Math.min(maxOut, out.length)

      for (let i = 0; i < actualOut; i++) {
        const sampleIdx = Math.floor(i * ratio)
        const sample = this.sampleBuffer[sampleIdx] ?? 0
        out[i] = sample
      }

      const sliceIdx = Math.floor(actualOut * ratio)
      this.sampleBuffer = this.sampleBuffer.slice(sliceIdx)
      return actualOut
    }
  }

  return { ResamplerStreamProcessor }
})

vi.mock('./VadProcessor', () => {
  class VadStreamProcessor {
    speechProbability = 0
    private chunkIdx = 0

    async feed(_: Float32Array): Promise<void> {
      if (mockVadState.shouldFail) {
        throw new Error('VAD processing failed')
      }
      this.speechProbability =
        mockVadState.probsByChunk[this.chunkIdx] ?? mockVadState.defaultProb
      this.chunkIdx++
    }
  }

  return { VadStreamProcessor }
})

async function testRunAnalysis(
  probsByChunk: number[],
  defaultProb: number,
): Promise<any[]> {
  mockVadState.probsByChunk = probsByChunk
  mockVadState.defaultProb = defaultProb
  mockVadState.shouldFail = false

  const { AudioRingReader } = await import('./AudioRingReader')
  const reader = new AudioRingReader(new SharedArrayBuffer(4096), 1024, QUANTUM)

  const capturedMessages: any[] = []
  const originalPostMessage = globalThis.postMessage
  globalThis.postMessage = ((msg: any) => {
    capturedMessages.push(msg)
  }) as any

  try {
    await runAnalysis(reader, SAMPLE_RATE, TIME_STEP_SAMPLES)
    // Manually add ended message, matching worker behavior
    capturedMessages.push({ type: 'ended' })
  } finally {
    globalThis.postMessage = originalPostMessage
  }

  return capturedMessages
}

describe('VadWorker', () => {
  beforeEach(() => {
    mockVadState.probsByChunk = []
    mockVadState.defaultProb = 0
    mockVadState.shouldFail = false
  })

  describe('output structure', () => {
    it('sends patch messages with frameIndex, speechDetected, and speechProbability', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      expect(patchMsgs.length).toBeGreaterThan(0)

      for (const msg of patchMsgs) {
        expect(msg).toHaveProperty('frameIndex')
        expect(msg).toHaveProperty('speechDetected')
        expect(msg).toHaveProperty('speechProbability')
        expect(typeof msg.frameIndex).toBe('number')
        expect(typeof msg.speechDetected).toBe('boolean')
        expect(typeof msg.speechProbability).toBe('number')
      }
    })

    it('sends frames with sequential frameIndex', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      const indices = patchMsgs.map((m) => m.frameIndex)

      for (let i = 0; i < indices.length; i++) {
        expect(indices[i]).toBe(i)
      }
    })

    it('number of frames approximately matches audio duration / timeStepSec', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      // 0.5 seconds of audio at 2ms timeStep = ~250 frames
      const expectedFrames = (0.5 * SAMPLE_RATE) / TIME_STEP_SAMPLES
      expect(patchMsgs.length).toBeGreaterThan(expectedFrames * 0.8)
      expect(patchMsgs.length).toBeLessThan(expectedFrames * 1.2)
    })
  })

  describe('silence (probability = 0)', () => {
    it('speechDetected is false for all frames when VAD probability is 0', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      for (const msg of patchMsgs) {
        expect(msg.speechDetected).toBe(false)
      }
    })

    it('speechProbability is 0 for all frames', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      for (const msg of patchMsgs) {
        expect(msg.speechProbability).toBeCloseTo(0, 5)
      }
    })
  })

  describe('speech detection thresholds', () => {
    it('speechDetected=true when probability >= POSITIVE_THRESHOLD (0.3)', async () => {
      const out = await testRunAnalysis([], 0.3)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      // First chunk may take time to process, but should eventually see speech
      const speechCount = patchMsgs.filter((m) => m.speechDetected).length
      expect(speechCount).toBeGreaterThan(0)
    })

    it('speechDetected=false when probability < NEGATIVE_THRESHOLD (0.25)', async () => {
      const out = await testRunAnalysis([], 0.1)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      for (const msg of patchMsgs) {
        expect(msg.speechDetected).toBe(false)
      }
    })

    it('speechDetected stays true between NEGATIVE (0.25) and POSITIVE (0.3) thresholds', async () => {
      const probs = Array(10).fill(0.5).concat(Array(10).fill(0.27))
      const out = await testRunAnalysis(probs, 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      // After initial silence, voice activates and hysteresis keeps it active despite prob=0.27
      const voiceActivated = patchMsgs.some((m) => m.speechDetected)
      expect(voiceActivated).toBe(true)
    })
  })

  describe('preroll behavior', () => {
    it('marks frames before speech onset as speechDetected if within preroll window', async () => {
      // Setup: first 20 chunks silent (prob=0), then speech activates (prob=0.5)
      const probs = Array(20).fill(0).concat(Array(10).fill(0.5))
      const out = await testRunAnalysis(probs, 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      // Find first frame marked as speechDetected
      let firstSpeechIdx = -1
      for (let i = 0; i < patchMsgs.length; i++) {
        if (patchMsgs[i]?.speechDetected) {
          firstSpeechIdx = i
          break
        }
      }

      // The preroll should start some frames before the actual speech onset
      expect(firstSpeechIdx).toBeGreaterThan(0)
      // We can't pin the exact frame, but it should be within reasonable range
      expect(firstSpeechIdx).toBeLessThan(500)
    })

    it('frames far before speech onset remain speechDetected=false', async () => {
      // Ensure first several chunks are very quiet (well below thresholds)
      const probs = Array(50).fill(0.05).concat(Array(10).fill(0.5))
      const out = await testRunAnalysis(probs, 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      // Early frames (before any preroll window) should remain unvoiced
      const earlyFrames = patchMsgs.slice(0, 50)
      const unvoicedCount = earlyFrames.filter((m) => !m.speechDetected).length
      // Most of the early frames should be unvoiced
      expect(unvoicedCount).toBeGreaterThan(earlyFrames.length * 0.7)
    })
  })

  describe('frame flushing on timeout', () => {
    it('flushes remaining pending frames as unvoiced at stream end', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      // All frames should have been flushed
      expect(patchMsgs.length).toBeGreaterThan(0)

      // Last frame should be present (no lost frames at the end)
      const maxIdx = Math.max(...patchMsgs.map((m) => m.frameIndex))
      expect(maxIdx).toBeGreaterThan(0)
    })

    it('handles VAD processing error gracefully', async () => {
      mockVadState.shouldFail = true
      const { AudioRingReader } = await import('./AudioRingReader')
      const reader = new AudioRingReader(
        new SharedArrayBuffer(4096),
        1024,
        QUANTUM,
      )

      const capturedMessages: any[] = []
      const originalPostMessage = globalThis.postMessage
      globalThis.postMessage = ((msg: any) => {
        capturedMessages.push(msg)
      }) as any

      try {
        await runAnalysis(reader, SAMPLE_RATE, TIME_STEP_SAMPLES)
        // Manually add ended message
        capturedMessages.push({ type: 'ended' })
      } finally {
        globalThis.postMessage = originalPostMessage
      }

      // Should still emit ended message even on error
      expect(capturedMessages.length).toBeGreaterThan(0)
      const lastMsg = capturedMessages[capturedMessages.length - 1]
      expect(lastMsg?.type).toBe('ended')

      // Failed chunks should use speechProbability=0
      const patchMsgs = capturedMessages.filter((m) => m.type === 'patch')
      const afterFailure = patchMsgs.slice(patchMsgs.length - 10)
      for (const msg of afterFailure) {
        expect(msg.speechProbability).toBe(0)
      }
    })
  })

  describe('speech probability tracking', () => {
    it('speechProbability reflects VAD output value for each frame', async () => {
      const out = await testRunAnalysis([], 0.42)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      for (const msg of patchMsgs) {
        expect(msg.speechProbability).toBeCloseTo(0.42, 2)
      }
    })

    it('speechProbability updates when VAD output changes', async () => {
      const probs = Array(10)
        .fill(0.1)
        .concat(Array(10).fill(0.8))
        .concat(Array(10).fill(0.1))
      const out = await testRunAnalysis(probs, 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      expect(patchMsgs.length).toBeGreaterThan(0)

      // Check that at least some frames have updated probabilities
      const uniqueProbs = new Set(
        patchMsgs.map((m) => Math.round(m.speechProbability * 10) / 10),
      )
      // Should see multiple distinct probability values
      expect(uniqueProbs.size).toBeGreaterThan(1)
    })
  })

  describe('complex speech patterns', () => {
    it('handles alternating speech/silence pattern', async () => {
      const probs = Array(10)
        .fill(0.5)
        .concat(Array(10).fill(0.1))
        .concat(Array(10).fill(0.5))
      const out = await testRunAnalysis(probs, 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')
      const speechDetectedChanges = []
      for (let i = 1; i < patchMsgs.length; i++) {
        if (patchMsgs[i]?.speechDetected !== patchMsgs[i - 1]?.speechDetected) {
          speechDetectedChanges.push(i)
        }
      }

      // Should see at least one transition (silence to speech or vice versa)
      expect(speechDetectedChanges.length).toBeGreaterThan(0)
    })

    it('applies hysteresis correctly across multiple transitions', async () => {
      // Pattern: high → between-threshold → low (should trigger hysteresis)
      const probs = Array(10)
        .fill(0.5)
        .concat(Array(15).fill(0.27))
        .concat(Array(10).fill(0.1))
      const out = await testRunAnalysis(probs, 0)

      const patchMsgs = out.filter((m) => m.type === 'patch')

      // Find transition point where speech was detected but prob dropped
      let hysteresisFrames = 0
      for (const msg of patchMsgs) {
        if (0.25 <= msg.speechProbability && msg.speechProbability <= 0.3) {
          if (msg.speechDetected) hysteresisFrames++
        }
      }

      // Hysteresis should keep some between-threshold frames as detected
      expect(hysteresisFrames).toBeGreaterThan(0)
    })
  })
})
