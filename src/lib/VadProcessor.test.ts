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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { SpeechGate as SpeechGateType } from './VadProcessor'

const mockState = vi.hoisted(() => ({
  sessionRunCalls: [] as Array<{ feeds: Record<string, unknown> }>,
}))

class MockTensor {
  type: string
  data: unknown[] | BigInt64Array | Float32Array
  dims: number[]

  constructor(
    type: string,
    data: unknown[] | BigInt64Array | Float32Array,
    dims: number[],
  ) {
    this.type = type
    this.data = data
    this.dims = dims
  }
}

class MockSession {
  async run(feeds: Record<string, unknown>) {
    mockState.sessionRunCalls.push({ feeds })
    return {
      output: { data: new Float32Array([0.5]) },
      stateN: { data: new Float32Array(256).fill(0.1) },
    }
  }
}

vi.mock('onnxruntime-web/wasm', () => ({
  InferenceSession: {
    create: vi.fn(async () => new MockSession()),
  },
  Tensor: MockTensor,
  env: {
    wasm: {
      numThreads: 0,
      wasmPaths: {},
    },
  },
}))

let VadStreamProcessor: any
let SpeechGate: typeof SpeechGateType
beforeEach(async () => {
  vi.resetModules()
  mockState.sessionRunCalls = []
  const module = await import('./VadProcessor')
  VadStreamProcessor = module.VadStreamProcessor
  SpeechGate = module.SpeechGate
})

afterEach(() => {
  mockState.sessionRunCalls = []
})

describe('VadStreamProcessor', () => {
  describe('initialization', () => {
    it('creates a processor with initial values', async () => {
      const processor = new VadStreamProcessor()
      expect(processor.speechProbability).toBe(0)
    })

    it('initializes with zero probability', async () => {
      const processor = new VadStreamProcessor()
      expect(processor.speechProbability).toBe(0)
    })
  })

  describe('feed behavior', () => {
    it('accepts empty input without error', async () => {
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array([]))
      expect(processor.speechProbability).toBe(0)
    })

    it('accepts single sample without running inference', async () => {
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array([0.5]))
      expect(processor.speechProbability).toBe(0)
      expect(mockState.sessionRunCalls.length).toBe(0)
    })

    it('runs inference when 512 samples (VAD_CHUNK) accumulate', async () => {
      const processor = new VadStreamProcessor()
      const samples = new Float32Array(512).fill(0.1)
      await processor.feed(samples)
      expect(mockState.sessionRunCalls.length).toBe(1)
      expect(processor.speechProbability).toBe(0.5)
    })

    it('runs inference exactly once for exactly 512 samples', async () => {
      const processor = new VadStreamProcessor()
      const samples = new Float32Array(512).fill(0.1)
      await processor.feed(samples)
      expect(mockState.sessionRunCalls.length).toBe(1)
    })

    it('runs multiple inferences for data exceeding one chunk', async () => {
      const processor = new VadStreamProcessor()
      const samples = new Float32Array(1024).fill(0.1) // 2 chunks
      await processor.feed(samples)
      expect(mockState.sessionRunCalls.length).toBe(2)
    })

    it('accumulates partial chunks across multiple feed calls', async () => {
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array(256).fill(0.1))
      expect(mockState.sessionRunCalls.length).toBe(0)
      await processor.feed(new Float32Array(256).fill(0.2))
      expect(mockState.sessionRunCalls.length).toBe(1)
    })

    it('updates speechProbability after each inference', async () => {
      let callCount = 0
      const runFn = async function (
        this: MockSession,
        feeds: Record<string, unknown>,
      ) {
        callCount++
        mockState.sessionRunCalls.push({ feeds })
        return {
          output: { data: new Float32Array([callCount * 0.1]) },
          stateN: { data: new Float32Array(256).fill(0.1) },
        }
      }
      const originalRun = MockSession.prototype.run.bind(MockSession.prototype)
      MockSession.prototype.run = runFn as any

      const processor = new VadStreamProcessor()
      const samples = new Float32Array(512).fill(0.1)

      await processor.feed(samples)
      expect(processor.speechProbability).toBeCloseTo(0.1, 5)

      await processor.feed(samples)
      expect(processor.speechProbability).toBeCloseTo(0.2, 5)

      MockSession.prototype.run = originalRun
    })
  })

  describe('state persistence', () => {
    it('maintains LSTM state across feed calls', async () => {
      const processor = new VadStreamProcessor()
      const samples = new Float32Array(512).fill(0.1)

      await processor.feed(samples)
      await processor.feed(samples)
      const secondCall = mockState.sessionRunCalls[1]!
      const secondState = (secondCall.feeds.state as any).data

      // State should be updated from session output, not the initial zero
      expect(secondState).toBeDefined()
      expect(secondState.length).toBe(256)
    })

    it('state is updated with session output stateN', async () => {
      let callCount = 0
      const runFn = async function (
        this: MockSession,
        feeds: Record<string, unknown>,
      ) {
        callCount++
        mockState.sessionRunCalls.push({ feeds })
        const state = new Float32Array(256).fill(callCount * 0.1)
        return {
          output: { data: new Float32Array([0.5]) },
          stateN: { data: state },
        }
      }
      const originalRun = MockSession.prototype.run.bind(MockSession.prototype)
      MockSession.prototype.run = runFn as any

      const processor = new VadStreamProcessor()
      const samples = new Float32Array(512).fill(0.1)

      await processor.feed(samples)
      // After first feed, second call's state should have first output values
      await processor.feed(samples)
      const secondInput = mockState.sessionRunCalls[1]!.feeds.state as any
      expect(secondInput.data[0]).toBeCloseTo(0.1, 5)

      MockSession.prototype.run = originalRun
    })
  })

  describe('reset behavior', () => {
    it('resets speechProbability to zero', async () => {
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array(512).fill(0.1))
      expect(processor.speechProbability).not.toBe(0)

      processor.reset()
      expect(processor.speechProbability).toBe(0)
    })

    it('clears internal buffer state', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()

      await processor.feed(new Float32Array(256).fill(0.1))
      processor.reset()
      await processor.feed(new Float32Array(256).fill(0.1))

      // After reset, should only have 0 inference calls
      // (not 1, which would indicate buffered data persisted)
      expect(mockState.sessionRunCalls.length).toBe(0)
    })

    it('resets LSTM state to zero', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array(512).fill(0.1))

      processor.reset()

      await processor.feed(new Float32Array(512).fill(0.1))
      const secondInference = mockState.sessionRunCalls[1]!
      const stateAfterReset = (secondInference.feeds.state as any).data

      // After reset, state should be zero-initialized
      expect(stateAfterReset[0]).toBe(0)
    })

    it('allows reuse after reset', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()
      const samples = new Float32Array(512).fill(0.1)

      await processor.feed(samples)
      const firstProb = processor.speechProbability
      expect(firstProb).not.toBe(0)

      processor.reset()
      expect(processor.speechProbability).toBe(0)

      await processor.feed(samples)
      expect(processor.speechProbability).toBe(0.5)
    })
  })

  describe('buffer management', () => {
    it('handles non-aligned input sizes', async () => {
      const processor = new VadStreamProcessor()

      // Feed 300 samples (not aligned to 512)
      await processor.feed(new Float32Array(300).fill(0.1))
      expect(mockState.sessionRunCalls.length).toBe(0)

      // Feed 212 more samples to reach exactly 512
      await processor.feed(new Float32Array(212).fill(0.2))
      expect(mockState.sessionRunCalls.length).toBe(1)
    })

    it('preserves overlap (64-sample extra context) between chunks', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()
      const chunk1 = new Float32Array(512).fill(0.1)
      const chunk2 = new Float32Array(512).fill(0.2)

      await processor.feed(chunk1)
      await processor.feed(chunk2)

      expect(mockState.sessionRunCalls.length).toBe(2)

      // Second inference should have input with length = VAD_CHUNK + VAD_V6_EXTRA_CONTEXT
      const secondInput = (mockState.sessionRunCalls[1]!.feeds.input as any)
        .data
      expect(secondInput).toBeDefined()
      expect(secondInput.length).toBe(512 + 64) // VAD_CHUNK + VAD_V6_EXTRA_CONTEXT
    })

    it('produces correct input tensor shape for inference', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array(512).fill(0.1))

      const firstInference = mockState.sessionRunCalls[0]!
      const inputTensor = firstInference.feeds.input as any
      expect(inputTensor.dims).toEqual([1, 576]) // [1, VAD_CHUNK + VAD_V6_EXTRA_CONTEXT]
    })

    it('produces correct state tensor shape for inference', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array(512).fill(0.1))

      const firstInference = mockState.sessionRunCalls[0]!
      const stateTensor = firstInference.feeds.state as any
      expect(stateTensor.dims).toEqual([2, 1, 128])
    })

    it('produces correct sr (sample rate) tensor for inference', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array(512).fill(0.1))

      const firstInference = mockState.sessionRunCalls[0]!
      const srTensor = firstInference.feeds.sr as any
      expect(srTensor.dims).toEqual([1])
      expect(srTensor.data).toEqual(new BigInt64Array([BigInt(16000)]))
    })
  })

  describe('continuous streaming', () => {
    it('processes continuous stream correctly', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()

      // Feed continuous stream of 1536 samples (3 chunks)
      const stream = new Float32Array(1536).fill(0.1)
      await processor.feed(stream)

      expect(mockState.sessionRunCalls.length).toBe(3)
      expect(processor.speechProbability).toBe(0.5)
    })

    it('handles multiple small feeds accumulating to multiple chunks', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()

      // Feed 100 samples 6 times = 600 samples = 1 chunk + 88 remaining
      for (let i = 0; i < 6; i++) {
        await processor.feed(new Float32Array(100).fill(0.1))
      }

      expect(mockState.sessionRunCalls.length).toBe(1)

      // Feed 424 samples to complete second chunk
      await processor.feed(new Float32Array(424).fill(0.1))
      expect(mockState.sessionRunCalls.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('handles very large input in single feed', async () => {
      mockState.sessionRunCalls = []
      const processor = new VadStreamProcessor()
      const largeInput = new Float32Array(5120).fill(0.1) // 10 chunks
      await processor.feed(largeInput)
      expect(mockState.sessionRunCalls.length).toBe(10)
    })

    it('maintains speechProbability between non-inferring feeds', async () => {
      const processor = new VadStreamProcessor()
      await processor.feed(new Float32Array(512).fill(0.1))
      const prob = processor.speechProbability

      // Feed partial chunk
      await processor.feed(new Float32Array(100).fill(0.2))
      expect(processor.speechProbability).toBe(prob)
    })

    it('speechProbability reflects output from latest inference', async () => {
      mockState.sessionRunCalls = []
      let inferenceCount = 0
      const runFn = async function (
        this: MockSession,
        feeds: Record<string, unknown>,
      ) {
        inferenceCount++
        mockState.sessionRunCalls.push({ feeds })
        return {
          output: { data: new Float32Array([inferenceCount * 0.1]) },
          stateN: { data: new Float32Array(256).fill(0.1) },
        }
      }
      const originalRun = MockSession.prototype.run.bind(MockSession.prototype)
      MockSession.prototype.run = runFn as any

      const processor = new VadStreamProcessor()

      await processor.feed(new Float32Array(512).fill(0.1))
      expect(processor.speechProbability).toBeCloseTo(0.1, 5)

      await processor.feed(new Float32Array(512).fill(0.1))
      expect(processor.speechProbability).toBeCloseTo(0.2, 5)

      await processor.feed(new Float32Array(512).fill(0.1))
      expect(processor.speechProbability).toBeCloseTo(0.3, 5)

      MockSession.prototype.run = originalRun
    })
  })
})

describe('SpeechGate', () => {
  // 100 frames/sec → 10 ms per frame, so the constants land on round counts:
  // pre-roll = 5, post-roll = 5, redemption = 8, min-speech = 40 frames.
  const FPS = 100
  const PREROLL = 5
  const POSTROLL = 5
  const REDEMPTION = 8
  const MIN_SPEECH = 40

  // Pushes a probability per frame and returns the final speechDetected value
  // for each frame, applying later corrections (last decision wins) like both
  // real consumers do.
  function gate(probs: number[]): boolean[] {
    const out: boolean[] = new Array(probs.length).fill(false)
    const g = new SpeechGate(FPS, (d) => {
      out[d.frameIndex] = d.speechDetected
    })
    probs.forEach((p, i) => g.push(i, p))
    g.end()
    return out
  }

  const fill = (n: number, value: number): number[] => new Array(n).fill(value)
  const SPEECH = 0.9
  const SILENCE = 0

  it('reports silence as not speech', () => {
    expect(gate(fill(50, SILENCE)).every((s) => !s)).toBe(true)
  })

  it('reports sustained speech as speech', () => {
    expect(gate(fill(60, SPEECH)).every((s) => s)).toBe(true)
  })

  describe('hysteresis', () => {
    it('stays speaking while probability sits between the thresholds', () => {
      // Onset on the loud run, then a long quiet-but-not-silent tail (0.27).
      const out = gate([...fill(50, 0.5), ...fill(30, 0.27)])
      expect(out.every((s) => s)).toBe(true)
    })

    it('never starts speaking when probability stays below POSITIVE', () => {
      expect(gate(fill(50, 0.27)).every((s) => !s)).toBe(true)
    })
  })

  describe('pre-roll', () => {
    it('retroactively marks the frames just before an onset as speech', () => {
      const out = gate([...fill(20, SILENCE), ...fill(60, SPEECH)])
      // The PREROLL frames before the onset at index 20 are claimed...
      for (let i = 20 - PREROLL; i < 20; i++) expect(out[i]).toBe(true)
      // ...but the frame just before that window stays silent.
      expect(out[20 - PREROLL - 1]).toBe(false)
      expect(out[0]).toBe(false)
    })
  })

  describe('minimum speech duration', () => {
    it('keeps a segment that reaches MIN_SPEECH frames', () => {
      const speech = MIN_SPEECH + 5
      const out = gate([...fill(speech, SPEECH), ...fill(60, SILENCE)])
      expect(out[MIN_SPEECH]).toBe(true)
      // The kept speech plus its post-roll release tail.
      expect(out.filter((s) => s).length).toBe(speech + POSTROLL)
    })

    it('discards a segment shorter than MIN_SPEECH frames', () => {
      // Speech plus its pre-roll and post-roll still falls short of the minimum.
      const out = gate([
        ...fill(10, SILENCE),
        ...fill(MIN_SPEECH - PREROLL - POSTROLL - 1, SPEECH),
        ...fill(60, SILENCE),
      ])
      expect(out.every((s) => !s)).toBe(true)
    })

    it('counts pre-roll toward the segment duration', () => {
      // Speech alone is below MIN_SPEECH, but pre-roll pushes it over. Speech
      // runs to the end of the stream, so there is no post-roll here.
      const speech = MIN_SPEECH - PREROLL + 1
      const out = gate([...fill(20, SILENCE), ...fill(speech, SPEECH)])
      expect(out.filter((s) => s).length).toBe(speech + PREROLL)
    })
  })

  describe('redemption', () => {
    it('bridges a gap shorter than the redemption window', () => {
      const out = gate([
        ...fill(30, SPEECH),
        ...fill(REDEMPTION - 2, SILENCE), // gap within the window
        ...fill(30, SPEECH),
      ])
      // The whole span, gap included, is one continuous speech segment.
      expect(out.every((s) => s)).toBe(true)
    })

    it('keeps a post-roll release tail then reverts the rest of the window', () => {
      const out = gate([...fill(50, SPEECH), ...fill(200, SILENCE)])
      // The kept speech segment...
      expect(out[49]).toBe(true)
      // ...followed by the post-roll release pad...
      expect(out[50 + POSTROLL - 1]).toBe(true)
      // ...then the optimistic redemption frames, reverted once it expired...
      expect(out[50 + POSTROLL]).toBe(false)
      expect(out[50 + REDEMPTION - 1]).toBe(false)
      // ...and the trailing silence beyond the window.
      expect(out[50 + REDEMPTION + 20]).toBe(false)
      expect(out.filter((s) => s).length).toBe(50 + POSTROLL)
    })

    it('reverts an unfinished redemption tail at end of stream', () => {
      // Stream ends mid-window, before redemption could expire on its own.
      const out = gate([...fill(50, SPEECH), ...fill(REDEMPTION - 2, SILENCE)])
      expect(out[49]).toBe(true)
      expect(out[50 + POSTROLL - 1]).toBe(true) // release pad still kept
      expect(out[50 + POSTROLL]).toBe(false)
      expect(out.filter((s) => s).length).toBe(50 + POSTROLL)
    })

    it('discards a short segment even after its redemption tail', () => {
      // Even with the post-roll pad, the segment stays below MIN_SPEECH.
      const out = gate([
        ...fill(MIN_SPEECH - POSTROLL - 1, SPEECH),
        ...fill(200, SILENCE),
      ])
      expect(out.every((s) => !s)).toBe(true)
    })
  })
})
