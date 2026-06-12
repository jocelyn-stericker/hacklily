// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { AudioPlaybackPipeline } from './AudioPlaybackPipeline'
import type { AudioRope } from './AudioRope'

const mockAudioAPI = vi.hoisted(() => {
  const workletNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    port: { postMessage: vi.fn() },
  }
  const context = {
    currentTime: 0,
    destination: {},
    audioWorklet: { addModule: vi.fn(async () => {}) },
    resume: vi.fn(async () => {}),
    suspend: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  }
  return { workletNode, context }
})

class MockAudioContext {
  destination = mockAudioAPI.context.destination
  audioWorklet = mockAudioAPI.context.audioWorklet
  sampleRate = 44100

  constructor(options?: { sampleRate?: number; latencyHint?: string }) {
    if (options?.sampleRate) {
      this.sampleRate = options.sampleRate
    }
  }

  get currentTime() {
    return mockAudioAPI.context.currentTime
  }

  async resume() {
    return mockAudioAPI.context.resume()
  }

  async suspend() {
    return mockAudioAPI.context.suspend()
  }

  async close() {
    return mockAudioAPI.context.close()
  }
}

class MockAudioWorkletNode {
  port = mockAudioAPI.workletNode.port
  connect = mockAudioAPI.workletNode.connect
  disconnect = mockAudioAPI.workletNode.disconnect
  static count = 0
  static lastName: string | null = null

  constructor(_context: unknown, name: string) {
    MockAudioWorkletNode.count++
    MockAudioWorkletNode.lastName = name
  }
}

vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode as any)

let animFrameId = 1
vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((cb: FrameRequestCallback) => {
    setTimeout(() => cb(performance.now()), 0)
    return animFrameId++
  }),
)
vi.stubGlobal('cancelAnimationFrame', vi.fn())

// Lets the async #play (which awaits moduleReady) run to completion.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function makeRope(lengthSamples: number, sampleRate = 44100): AudioRope {
  return {
    length: lengthSamples,
    sampleRate,
    shareRope: vi.fn(() => ({
      type: 'audio-rope',
      sampleRate,
      buffers: [],
      ctrlPtr: new SharedArrayBuffer(8),
    })),
  } as unknown as AudioRope
}

function lastMessages() {
  return mockAudioAPI.workletNode.port.postMessage.mock.calls.map((c) => c[0])
}

/** Simulate the worklet posting a message back to the main thread. */
function workletPost(msg: unknown) {
  ;(
    mockAudioAPI.workletNode.port as unknown as {
      onmessage?: (e: MessageEvent) => void
    }
  ).onmessage?.({ data: msg } as MessageEvent)
}

describe('AudioPlaybackPipeline', () => {
  let abortController: AbortController
  let mockContext: AudioContext
  const moduleReady = Promise.resolve()

  beforeEach(() => {
    abortController = new AbortController()
    vi.clearAllMocks()
    mockAudioAPI.context.currentTime = 0
    mockAudioAPI.context.resume.mockResolvedValue(undefined)
    mockAudioAPI.context.suspend.mockResolvedValue(undefined)
    mockAudioAPI.context.close.mockResolvedValue(undefined)
    MockAudioWorkletNode.count = 0
    MockAudioWorkletNode.lastName = null
    mockContext = new MockAudioContext() as unknown as AudioContext
  })

  afterEach(() => {
    abortController.abort()
  })

  describe('initialization', () => {
    it('creates the rope source worklet node and connects it', async () => {
      new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      expect(MockAudioWorkletNode.count).toBe(1)
      expect(MockAudioWorkletNode.lastName).toBe('audio-rope-source-node')
      expect(mockAudioAPI.workletNode.connect).toHaveBeenCalledWith(
        mockAudioAPI.context.destination,
      )
    })

    it('resumes the context before starting playback', async () => {
      new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      expect(mockAudioAPI.context.resume).toHaveBeenCalled()
    })

    it('posts setBuffer with rope shares then start', async () => {
      new AudioPlaybackPipeline({
        ropes: [makeRope(44100), makeRope(22050)],
        gains: [],
        startAtSec: 0.5,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      const messages = lastMessages()
      expect(messages[0]).toMatchObject({ type: 'setBuffer' })
      // Each rope was shared (mapped through shareRope) into the message.
      expect(messages[0].ropes).toHaveLength(2)
      expect(messages[1]).toEqual({ type: 'start', timeSec: 0.5 })
    })

    it('clamps startAtSec to 0 when at or past the end of the timeline', async () => {
      // One 1s rope: a start within 0.05s of the end rewinds to 0.
      new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 1.0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      expect(lastMessages()[1]).toEqual({ type: 'start', timeSec: 0 })
    })

    it('sums rope durations across differing sample rates', async () => {
      // 1s @44.1k + 1s @22.05k = 2s total; 1.5s is mid-timeline, not clamped.
      new AudioPlaybackPipeline({
        ropes: [makeRope(44100, 44100), makeRope(22050, 22050)],
        gains: [],
        startAtSec: 1.5,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      expect(lastMessages()[1]).toEqual({ type: 'start', timeSec: 1.5 })
    })

    it('returns a stopSignal that is not yet aborted', () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })

      expect(pipeline.stopSignal).toBeInstanceOf(AbortSignal)
      expect(pipeline.stopSignal.aborted).toBe(false)
    })
  })

  describe('position tracking', () => {
    it('holds at startAtSec until the worklet anchors the clock', async () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(88200)], // 2s
        gains: [],
        startAtSec: 0.5,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()
      // No `started` yet; even with the clock advanced, position stays put.
      mockAudioAPI.context.currentTime = 0.3

      const seen = await new Promise<number>((resolve) => {
        pipeline.addEventListener('positionChanged', (e) => {
          resolve((e as CustomEvent<{ timeSec: number }>).detail.timeSec)
        })
      })

      expect(seen).toBe(0.5)
    })

    it('tracks elapsed context time from the worklet anchor', async () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(88200)], // 2s
        gains: [],
        startAtSec: 0.5,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()
      // Worklet's first sample plays out at context time 0.1; 0.4s later the
      // position should be startAtSec + 0.4.
      workletPost({ type: 'started', contextTime: 0.1 })
      mockAudioAPI.context.currentTime = 0.5

      const seen = await new Promise<number>((resolve) => {
        pipeline.addEventListener('positionChanged', (e) => {
          resolve((e as CustomEvent<{ timeSec: number }>).detail.timeSec)
        })
      })

      expect(seen).toBeCloseTo(0.9, 5)
    })

    it('does not report a position beyond the total duration', async () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)], // 1s
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()
      workletPost({ type: 'started', contextTime: 0 })
      mockAudioAPI.context.currentTime = 100

      const seen = await new Promise<number>((resolve) => {
        pipeline.addEventListener('positionChanged', (e) => {
          resolve((e as CustomEvent<{ timeSec: number }>).detail.timeSec)
        })
      })

      expect(seen).toBeLessThanOrEqual(1)
    })
  })

  describe('end of playback', () => {
    const workletEnd = (contextTime: number) =>
      workletPost({ type: 'end', contextTime })

    it('emits stop and tears down once the worklet end plays out', async () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)], // 1s
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      const stopped = new Promise<void>((resolve) => {
        pipeline.addEventListener('stop', () => resolve())
      })
      // Worklet signals end at context time 1; advance the clock to it.
      workletEnd(1)
      mockAudioAPI.context.currentTime = 1
      await stopped

      expect(
        mockAudioAPI.workletNode.port.postMessage,
      ).toHaveBeenLastCalledWith(null)
      expect(mockAudioAPI.workletNode.disconnect).toHaveBeenCalled()
      expect(mockAudioAPI.context.suspend).toHaveBeenCalled()
      expect(mockAudioAPI.context.close).not.toHaveBeenCalled()
      expect(pipeline.stopSignal.aborted).toBe(true)
    })

    it('does not stop before the end has played out', async () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      let stopCount = 0
      pipeline.addEventListener('stop', () => stopCount++)
      // End reported, but the playout time is still in the future.
      workletEnd(5)
      mockAudioAPI.context.currentTime = 2
      await flush()
      await flush()

      expect(stopCount).toBe(0)
    })

    it('emits stop only once', async () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      let stopCount = 0
      pipeline.addEventListener('stop', () => stopCount++)
      workletEnd(1)
      mockAudioAPI.context.currentTime = 2
      await flush()
      await flush()

      expect(stopCount).toBe(1)
    })
  })

  describe('abort handling', () => {
    it('pauses the node and suspends the context on abort', async () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()

      abortController.abort()

      expect(
        mockAudioAPI.workletNode.port.postMessage,
      ).toHaveBeenLastCalledWith(null)
      expect(mockAudioAPI.workletNode.disconnect).toHaveBeenCalled()
      expect(mockAudioAPI.context.suspend).toHaveBeenCalled()
      expect(mockAudioAPI.context.close).not.toHaveBeenCalled()
      expect(pipeline.stopSignal.aborted).toBe(true)
      expect(cancelAnimationFrame).toHaveBeenCalled()
    })

    it('bails out without creating a node when aborted during module load', async () => {
      let resolveModuleReady = () => {}
      const slowModuleReady = new Promise<void>((resolve) => {
        resolveModuleReady = resolve
      })

      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady: slowModuleReady,
      })

      abortController.abort()
      resolveModuleReady()
      await flush()

      expect(MockAudioWorkletNode.count).toBe(0)
      expect(pipeline.stopSignal.aborted).toBe(true)
    })

    it('does not throw when the context suspend rejects', async () => {
      const pipeline = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: abortController.signal,
        context: mockContext,
        moduleReady,
      })
      await flush()
      mockAudioAPI.context.suspend.mockRejectedValue(
        new Error('already closed'),
      )

      expect(() => abortController.abort()).not.toThrow()
      expect(pipeline.stopSignal.aborted).toBe(true)
    })
  })

  describe('multiple instances', () => {
    it('can create independent pipelines', async () => {
      const ac1 = new AbortController()
      const ac2 = new AbortController()
      const ctx1 = new MockAudioContext() as unknown as AudioContext
      const ctx2 = new MockAudioContext() as unknown as AudioContext

      const p1 = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: ac1.signal,
        context: ctx1,
        moduleReady,
      })
      const p2 = new AudioPlaybackPipeline({
        ropes: [makeRope(44100)],
        gains: [],
        startAtSec: 0,
        signal: ac2.signal,
        context: ctx2,
        moduleReady,
      })
      await flush()

      ac1.abort()
      expect(p1.stopSignal.aborted).toBe(true)
      expect(p2.stopSignal.aborted).toBe(false)
      ac2.abort()
    })
  })
})
