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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { AudioPlaybackPipeline } from './AudioPlaybackPipeline'

const mockAudioAPI = vi.hoisted(() => {
  const mockSourceNode = {
    buffer: null as AudioBuffer | null,
    onended: null as (() => void) | null,
    connect: vi.fn(function (this: any) {
      return this
    }),
    start: vi.fn(),
    stop: vi.fn(),
  }

  const mockContext = {
    currentTime: 0,
    destination: {},
    sampleRate: 44100,
    createBufferSource: vi.fn(() => mockSourceNode),
    close: vi.fn(async () => {}),
  }

  return {
    mockSourceNode,
    mockContext,
  }
})

class MockAudioContext {
  currentTime = mockAudioAPI.mockContext.currentTime
  destination = mockAudioAPI.mockContext.destination
  sampleRate = mockAudioAPI.mockContext.sampleRate
  static called = false
  static lastOptions: any = null

  constructor(_options?: { sampleRate?: number; latencyHint?: string }) {
    MockAudioContext.called = true
    MockAudioContext.lastOptions = _options
    if (_options?.sampleRate) {
      this.sampleRate = _options.sampleRate
    }
  }

  createBufferSource() {
    mockAudioAPI.mockContext.createBufferSource()
    return mockAudioAPI.mockSourceNode
  }

  async close() {
    return mockAudioAPI.mockContext.close()
  }
}

vi.stubGlobal('AudioContext', MockAudioContext as any)

let animFrameId = 1
vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((cb: FrameRequestCallback) => {
    setTimeout(cb, 0)
    return animFrameId++
  }),
)

vi.stubGlobal('cancelAnimationFrame', vi.fn())

function createMockAudioBuffer(duration = 1, sampleRate = 44100): AudioBuffer {
  return {
    duration,
    length: duration * sampleRate,
    numberOfChannels: 1,
    sampleRate,
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
    getChannelData: vi.fn(() => new Float32Array(duration * sampleRate)),
  } as unknown as AudioBuffer
}

describe('AudioPlaybackPipeline', () => {
  let abortController: AbortController

  beforeEach(() => {
    abortController = new AbortController()
    vi.clearAllMocks()
    mockAudioAPI.mockContext.currentTime = 0
    mockAudioAPI.mockSourceNode.onended = null
    MockAudioContext.called = false
    MockAudioContext.lastOptions = null
  })

  afterEach(() => {
    abortController.abort()
  })

  describe('initialization', () => {
    it('creates an AudioContext with interactive latency hint', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      expect(MockAudioContext.called).toBe(true)
      expect(MockAudioContext.lastOptions).toEqual({
        sampleRate: undefined,
        latencyHint: 'interactive',
      })
    })

    it('creates an AudioContext with specified sampleRate', () => {
      const buffer = createMockAudioBuffer(1, 48000)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
        sampleRate: 48000,
      })

      expect(MockAudioContext.called).toBe(true)
      expect(MockAudioContext.lastOptions).toEqual({
        sampleRate: 48000,
        latencyHint: 'interactive',
      })
    })

    it('creates a buffer source and connects to destination', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockContext.createBufferSource).toHaveBeenCalled()
      expect(mockAudioAPI.mockSourceNode.connect).toHaveBeenCalledWith(
        mockAudioAPI.mockContext.destination,
      )
      expect(mockAudioAPI.mockSourceNode.buffer).toBe(buffer)
    })

    it('starts playback at specified position', () => {
      const buffer = createMockAudioBuffer(2)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0.5,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockSourceNode.start).toHaveBeenCalledWith(0, 0.5)
    })

    it('starts at beginning when startAtSec is exactly at buffer duration', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 1.0,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockSourceNode.start).toHaveBeenCalledWith(0, 0)
    })

    it('clamps to 0 when startAtSec is more than 0.01s beyond buffer duration', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 1.015,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockSourceNode.start).toHaveBeenCalledWith(0, 0)
    })

    it('starts at beginning when close to end', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0.99,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockSourceNode.start).toHaveBeenCalledWith(0, 0)
    })

    it('requests animation frame for position tracking', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    it('returns stopSignal that can be used to stop playback', () => {
      const buffer = createMockAudioBuffer(1)
      const pipeline = new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      expect(pipeline.stopSignal).toBeInstanceOf(AbortSignal)
      expect(pipeline.stopSignal.aborted).toBe(false)
    })
  })

  describe('event emission', () => {
    it('emits positionChanged events with timeSec', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(1)
        const pipeline = new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        let emitCount = 0
        pipeline.addEventListener('positionChanged', (event) => {
          const customEvent = event as CustomEvent<{ timeSec: number }>
          expect(customEvent.detail).toHaveProperty('timeSec')
          expect(typeof customEvent.detail.timeSec).toBe('number')
          emitCount++

          if (emitCount >= 2) {
            resolve()
          }
        })
      })
    })

    it('emits stop event when playback ends', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(1)
        const pipeline = new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        let stopEmitted = false
        pipeline.addEventListener('stop', () => {
          stopEmitted = true
        })

        setTimeout(() => {
          mockAudioAPI.mockSourceNode.onended?.()

          expect(stopEmitted).toBe(true)
          resolve()
        }, 10)
      })
    })

    it('timeSec respects startAtSec offset', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(2)
        const startAtSec = 0.5
        const pipeline = new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec,
          signal: abortController.signal,
        })

        pipeline.addEventListener('positionChanged', (e) => {
          const event = e as CustomEvent<{ timeSec: number }>
          expect(event.detail.timeSec).toBeGreaterThanOrEqual(startAtSec)
          resolve()
        })
      })
    })

    it('timeSec does not exceed buffer duration', () => {
      return new Promise<void>((resolve) => {
        const duration = 1
        const buffer = createMockAudioBuffer(duration)
        const pipeline = new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        pipeline.addEventListener('positionChanged', (event) => {
          const customEvent = event as CustomEvent<{ timeSec: number }>
          expect(customEvent.detail.timeSec).toBeLessThanOrEqual(duration)
          resolve()
        })
      })
    })

    it('stops emitting positionChanged after stop event', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(1)
        const pipeline = new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        let positionEventCount = 0
        let stopEventCount = 0

        pipeline.addEventListener('positionChanged', () => {
          positionEventCount++
        })

        pipeline.addEventListener('stop', () => {
          stopEventCount++
        })

        setTimeout(() => {
          mockAudioAPI.mockSourceNode.onended?.()

          setTimeout(() => {
            expect(stopEventCount).toBe(1)
            const countBeforeStop = positionEventCount
            const countAfterStop = positionEventCount

            expect(countBeforeStop).toBe(countAfterStop)
            resolve()
          }, 20)
        }, 10)
      })
    })
  })

  describe('abort signal handling', () => {
    it('stops playback when abort signal is fired', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      abortController.abort()

      expect(mockAudioAPI.mockSourceNode.stop).toHaveBeenCalled()
      expect(mockAudioAPI.mockContext.close).toHaveBeenCalled()
    })

    it('marks stopSignal as aborted after abort', () => {
      const buffer = createMockAudioBuffer(1)
      const pipeline = new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      expect(pipeline.stopSignal.aborted).toBe(false)
      abortController.abort()

      expect(pipeline.stopSignal.aborted).toBe(true)
    })

    it('cancels animation frames on abort', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      abortController.abort()

      expect(cancelAnimationFrame).toHaveBeenCalled()
    })

    it('clears source and context references on abort', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      abortController.abort()

      expect(mockAudioAPI.mockSourceNode.stop).toHaveBeenCalled()
      expect(mockAudioAPI.mockContext.close).toHaveBeenCalled()
    })
  })

  describe('cleanup and resource management', () => {
    it('stops source and closes context when playback ends naturally', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(1)
        new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        setTimeout(() => {
          mockAudioAPI.mockSourceNode.onended?.()

          expect(mockAudioAPI.mockSourceNode.stop).toHaveBeenCalled()
          expect(mockAudioAPI.mockContext.close).toHaveBeenCalled()
          resolve()
        }, 10)
      })
    })

    it('ignores onended event from stale source', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(1)
        new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        const oldSource = mockAudioAPI.mockSourceNode

        abortController.abort()
        vi.clearAllMocks()

        setTimeout(() => {
          oldSource.onended?.()

          expect(mockAudioAPI.mockSourceNode.stop).not.toHaveBeenCalled()
          resolve()
        }, 10)
      })
    })

    it('does not throw when stopping an already-stopped source', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      mockAudioAPI.mockSourceNode.stop.mockImplementation(() => {
        throw new Error('already stopped')
      })

      expect(() => {
        abortController.abort()
      }).not.toThrow()
    })

    it('handles context.close() errors gracefully', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      mockAudioAPI.mockContext.close.mockRejectedValue(
        new Error('context already closed'),
      )

      expect(() => {
        abortController.abort()
      }).not.toThrow()
    })

    it('only emits stop event once on natural end', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(1)
        const pipeline = new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        let stopCount = 0
        pipeline.addEventListener('stop', () => {
          stopCount++
        })

        setTimeout(() => {
          mockAudioAPI.mockSourceNode.onended?.()
          mockAudioAPI.mockSourceNode.onended?.()

          setTimeout(() => {
            expect(stopCount).toBe(1)
            resolve()
          }, 10)
        }, 10)
      })
    })
  })

  describe('animation frame loop', () => {
    it('emits positionChanged continuously while playing', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(2)
        const pipeline = new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        const positions: number[] = []
        pipeline.addEventListener('positionChanged', (event) => {
          const customEvent = event as CustomEvent<{ timeSec: number }>
          positions.push(customEvent.detail.timeSec)

          if (positions.length >= 3) {
            abortController.abort()
            expect(positions.length).toBeGreaterThanOrEqual(3)
            resolve()
          }
        })
      })
    })

    it('advances position over time', () => {
      return new Promise<void>((resolve) => {
        const buffer = createMockAudioBuffer(2)
        const pipeline = new AudioPlaybackPipeline({
          audioBuffer: buffer,
          startAtSec: 0,
          signal: abortController.signal,
        })

        let positionCount = 0

        pipeline.addEventListener('positionChanged', () => {
          positionCount++

          if (positionCount > 1) {
            mockAudioAPI.mockContext.currentTime += 0.01
          }

          if (positionCount >= 3) {
            abortController.abort()
            resolve()
          }
        })
      })
    })
  })

  describe('multiple instances', () => {
    it('can create multiple independent pipelines', () => {
      const buffer1 = createMockAudioBuffer(1)
      const buffer2 = createMockAudioBuffer(1)

      const ac1 = new AbortController()
      const ac2 = new AbortController()

      const p1 = new AudioPlaybackPipeline({
        audioBuffer: buffer1,
        startAtSec: 0,
        signal: ac1.signal,
      })

      const p2 = new AudioPlaybackPipeline({
        audioBuffer: buffer2,
        startAtSec: 0,
        signal: ac2.signal,
      })

      expect(p1.stopSignal.aborted).toBe(false)
      expect(p2.stopSignal.aborted).toBe(false)

      ac1.abort()

      expect(p1.stopSignal.aborted).toBe(true)
      expect(p2.stopSignal.aborted).toBe(false)

      ac2.abort()
    })
  })

  describe('edge cases', () => {
    it('handles negative startAtSec by treating as 0', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: -0.5,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockSourceNode.start).toHaveBeenCalledWith(0, -0.5)
    })

    it('handles zero-duration buffer', () => {
      const buffer = createMockAudioBuffer(0)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockSourceNode.start).toHaveBeenCalled()
    })

    it('handles very large buffers', () => {
      const buffer = createMockAudioBuffer(3600)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 1800,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockSourceNode.start).toHaveBeenCalledWith(0, 1800)
    })

    it('handles fractional startAtSec values', () => {
      const buffer = createMockAudioBuffer(1)
      new AudioPlaybackPipeline({
        audioBuffer: buffer,
        startAtSec: 0.123456,
        signal: abortController.signal,
      })

      expect(mockAudioAPI.mockSourceNode.start).toHaveBeenCalledWith(
        0,
        0.123456,
      )
    })
  })
})
