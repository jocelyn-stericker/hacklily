/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@netek.ca>
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
beforeEach(async () => {
  vi.resetModules()
  mockState.sessionRunCalls = []
  const module = await import('./VadProcessor')
  VadStreamProcessor = module.VadStreamProcessor
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
