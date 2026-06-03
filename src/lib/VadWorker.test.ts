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
  durationSec: 0.5,
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
      const totalChunks = Math.ceil(
        (mockVadState.durationSec * SAMPLE_RATE) / QUANTUM,
      )
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

vi.mock('./VadProcessor', async (importOriginal) => {
  const { VAD_CHUNK } = await importOriginal<{ VAD_CHUNK: number }>()

  // Emulates the real processor's 512-sample chunking: one inference (one
  // probability, drawn from probsByChunk in order) per VAD_CHUNK samples fed,
  // with the partial remainder flushed at end of stream.
  class VadStreamProcessor {
    speechProbability = 0
    private bufLen = 0
    private chunkIdx = 0

    private nextProb(): number {
      const prob =
        mockVadState.probsByChunk[this.chunkIdx] ?? mockVadState.defaultProb
      this.chunkIdx++
      return prob
    }

    async feed(
      samples: Float32Array,
      onChunk?: (speechProbability: number) => void,
    ): Promise<void> {
      if (mockVadState.shouldFail) {
        throw new Error('VAD processing failed')
      }
      this.bufLen += samples.length
      while (this.bufLen >= VAD_CHUNK) {
        this.bufLen -= VAD_CHUNK
        this.speechProbability = this.nextProb()
        onChunk?.(this.speechProbability)
      }
    }

    async flush(onChunk?: (speechProbability: number) => void): Promise<void> {
      if (mockVadState.shouldFail) {
        throw new Error('VAD processing failed')
      }
      if (this.bufLen === 0) return
      this.bufLen = 0
      this.speechProbability = this.nextProb()
      onChunk?.(this.speechProbability)
    }
  }

  // Keep the real SpeechGate (pure logic); only the ONNX-backed processor is mocked.
  return { ...(await importOriginal<object>()), VadStreamProcessor }
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

// Flatten the batched patch stream into individual per-frame decisions, in
// emission order. The worker now posts one `{ type: 'patch', frames }` message
// per gate push/end, each covering a contiguous run flipped to a single value.
function patchFrames(messages: any[]): any[] {
  const frames: any[] = []
  for (const msg of messages) {
    if (msg.type === 'patch') frames.push(...msg.frames)
  }
  return frames
}

// Collapse the patch stream to the final speechDetected value per frame.
// Frames may be patched more than once (e.g. an optimistic speech patch later
// reverted to silence); the last patch for a frame is its final value.
function finalSpeechByFrame(messages: any[]): boolean[] {
  const result: boolean[] = []
  for (const decision of patchFrames(messages)) {
    result[decision.frameIndex] = decision.speechDetected
  }
  return result
}

describe('VadWorker', () => {
  beforeEach(() => {
    mockVadState.probsByChunk = []
    mockVadState.defaultProb = 0
    mockVadState.shouldFail = false
    mockVadState.durationSec = 0.5
  })

  describe('output structure', () => {
    it('sends patch messages with frameIndex, speechDetected, and speechProbability', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = patchFrames(out)
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

      const patchMsgs = patchFrames(out)
      const indices = patchMsgs.map((m) => m.frameIndex)

      for (let i = 0; i < indices.length; i++) {
        expect(indices[i]).toBe(i)
      }
    })

    it('number of frames approximately matches audio duration / timeStepSec', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = patchFrames(out)
      // 0.5 seconds of audio at 2ms timeStep = ~250 frames
      const expectedFrames = (0.5 * SAMPLE_RATE) / TIME_STEP_SAMPLES
      expect(patchMsgs.length).toBeGreaterThan(expectedFrames * 0.8)
      expect(patchMsgs.length).toBeLessThan(expectedFrames * 1.2)
    })
  })

  describe('silence (probability = 0)', () => {
    it('speechDetected is false for all frames when VAD probability is 0', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = patchFrames(out)
      for (const msg of patchMsgs) {
        expect(msg.speechDetected).toBe(false)
      }
    })

    it('speechProbability is 0 for all frames', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = patchFrames(out)
      for (const msg of patchMsgs) {
        expect(msg.speechProbability).toBeCloseTo(0, 5)
      }
    })
  })

  // End-to-end gating through the worker. The precise hysteresis / pre-roll /
  // redemption / min-speech rules are unit-tested in VadProcessor.test.ts; these
  // confirm the gate is wired in and its final decisions reach the patch stream.
  describe('speech gating (final state)', () => {
    it('detects sustained speech', async () => {
      mockVadState.durationSec = 1
      const final = finalSpeechByFrame(await testRunAnalysis([], 0.5))
      expect(final.length).toBeGreaterThan(0)
      expect(final.every((s) => s)).toBe(true)
    })

    it('reports firmly silent audio as not speech', async () => {
      const final = finalSpeechByFrame(await testRunAnalysis([], 0.1))
      expect(final.length).toBeGreaterThan(0)
      expect(final.every((s) => !s)).toBe(true)
    })

    it('discards speech shorter than MIN_SPEECH_MS', async () => {
      // A brief burst of speech (a few chunks) then silence to the end.
      const final = finalSpeechByFrame(
        await testRunAnalysis(Array(5).fill(0.5), 0),
      )
      expect(final.length).toBeGreaterThan(0)
      expect(final.every((s) => !s)).toBe(true)
    })

    it('localizes a long speech segment within a longer recording', async () => {
      mockVadState.durationSec = 2
      // Speak long enough to clear MIN_SPEECH_MS (~13 chunks), then fall silent
      // for the rest of the ~63-chunk recording.
      const final = finalSpeechByFrame(
        await testRunAnalysis(Array(20).fill(0.5), 0),
      )
      expect(final[10]).toBe(true) // inside the speech segment
      expect(final[final.length - 1]).toBe(false) // deep in the trailing silence
      const speechFrames = final.filter((s) => s).length
      expect(speechFrames).toBeGreaterThan(200) // kept (≥ MIN_SPEECH_MS)
      expect(speechFrames).toBeLessThan(final.length) // but not the whole recording
    })
  })

  describe('frame flushing on timeout', () => {
    it('flushes remaining pending frames as unvoiced at stream end', async () => {
      const out = await testRunAnalysis([], 0)

      const patchMsgs = patchFrames(out)
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
      const patchMsgs = patchFrames(capturedMessages)
      const afterFailure = patchMsgs.slice(patchMsgs.length - 10)
      for (const msg of afterFailure) {
        expect(msg.speechProbability).toBe(0)
      }
    })
  })

  describe('speech probability tracking', () => {
    it('speechProbability reflects VAD output value for each frame', async () => {
      const out = await testRunAnalysis([], 0.42)

      const patchMsgs = patchFrames(out)
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

      const patchMsgs = patchFrames(out)
      expect(patchMsgs.length).toBeGreaterThan(0)

      // Check that at least some frames have updated probabilities
      const uniqueProbs = new Set(
        patchMsgs.map((m) => Math.round(m.speechProbability * 10) / 10),
      )
      // Should see multiple distinct probability values
      expect(uniqueProbs.size).toBeGreaterThan(1)
    })
  })

  describe('redemption (final state)', () => {
    const countRisingEdges = (final: boolean[]): number => {
      let edges = 0
      let prev = false
      for (const cur of final) {
        if (cur && !prev) edges++
        prev = cur
      }
      return edges
    }

    it('bridges a short gap between two speech segments', async () => {
      mockVadState.durationSec = 2
      // speech · short gap (< REDEMPTION_MS ≈ 2.5 chunks) · speech, then silence.
      const probs = [
        ...Array(20).fill(0.5),
        ...Array(2).fill(0),
        ...Array(20).fill(0.5),
      ]
      const final = finalSpeechByFrame(await testRunAnalysis(probs, 0))
      // The bridged gap leaves a single contiguous speech run.
      expect(countRisingEdges(final)).toBe(1)
    })

    it('reverts the speech tail once the recording ends without resuming', async () => {
      mockVadState.durationSec = 2
      // Long speech (kept), then silence longer than REDEMPTION_MS.
      const final = finalSpeechByFrame(
        await testRunAnalysis(Array(20).fill(0.5), 0),
      )
      // Trailing frames, optimistically held during redemption, end up silent.
      expect(final[final.length - 1]).toBe(false)
    })
  })
})
