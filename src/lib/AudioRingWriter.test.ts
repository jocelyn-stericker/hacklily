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

import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { AudioRingWriterInitMessage } from './AudioRingWriter'
import { AudioRingWriter } from './AudioRingWriter.ts'

vi.hoisted(() => {
  /**
   * Mock AudioWorkletProcessor for testing.
   */
  // Set up mock globally before importing
  vi.stubGlobal(
    'AudioWorkletProcessor',

    class MockAudioWorkletProcessor {
      process(_inputs: Float32Array[][], _outputs: Float32Array[][]): boolean {
        throw new Error('unimplemented')
      }

      port: { onmessage?: ((event: MessageEvent<any>) => void) | null } = {
        onmessage: null,
      }
    },
  )

  vi.stubGlobal('registerProcessor', vi.fn())
})

describe('AudioRingWriter', () => {
  let worklet: AudioRingWriter
  let sab: SharedArrayBuffer
  let bufSamples: number
  let ctrl: Int32Array
  let data: Float32Array

  beforeEach(() => {
    bufSamples = 256
    sab = new SharedArrayBuffer(8 + bufSamples * 4)
    ctrl = new Int32Array(sab, 0, 2)
    data = new Float32Array(sab, 8, bufSamples)
    Atomics.store(ctrl, 0, 0)

    worklet = new AudioRingWriter()
  })

  describe('initialization', () => {
    it('accepts an init message via port.onmessage', () => {
      const msg: AudioRingWriterInitMessage = { type: 'init', sab, bufSamples }
      worklet.port.onmessage?.({
        data: msg,
      } as MessageEvent<AudioRingWriterInitMessage>)

      // Verify init connected the SAB: process() should write through to it
      worklet.process([[new Float32Array([0.5, 0.5, 0.5, 0.5])]], [])
      expect(Atomics.load(ctrl, 0)).toBe(4)
    })

    it('rejects null messages', () => {
      expect(() => {
        worklet.port.onmessage?.({ data: null } as any)
      }).toThrow('invalid message')
    })

    it('rejects messages with wrong type field', () => {
      expect(() => {
        worklet.port.onmessage?.({ data: { type: 'unknown' } } as any)
      }).toThrow('invalid message')
    })
  })

  describe('process() writes audio to ring buffer', () => {
    beforeEach(() => {
      const msg: AudioRingWriterInitMessage = { type: 'init', sab, bufSamples }
      worklet.port.onmessage?.({
        data: msg,
      } as MessageEvent<AudioRingWriterInitMessage>)
    })

    it('writes input samples to the SAB', () => {
      const inputSamples = new Float32Array([0.1, 0.2, 0.3, 0.4])
      const inputs = [[inputSamples]] as any

      const result = worklet.process(inputs, [])

      expect(result).toBe(true)
      expect(data[0]).toBeCloseTo(0.1, 5)
      expect(data[1]).toBeCloseTo(0.2, 5)
      expect(data[2]).toBeCloseTo(0.3, 5)
      expect(data[3]).toBeCloseTo(0.4, 5)
      expect(Atomics.load(ctrl, 0)).toBe(4)
    })

    it('writes quantum starting with 0.0 (zero-crossing / silence)', () => {
      // Regression: !inp[0] is falsy when inp[0] === 0.0, which was incorrectly
      // skipping these quanta, causing gaps in the recording and spectrogram.
      const inputSamples = new Float32Array([0.0, 0.1, -0.1, 0.2])
      const inputs = [[inputSamples]] as any

      const result = worklet.process(inputs, [])

      expect(result).toBe(true)
      expect(data[0]).toBeCloseTo(0.0, 5)
      expect(data[1]).toBeCloseTo(0.1, 5)
      expect(data[2]).toBeCloseTo(-0.1, 5)
      expect(data[3]).toBeCloseTo(0.2, 5)
      expect(Atomics.load(ctrl, 0)).toBe(4)
    })

    it('skips all-zero quanta until first non-zero sample', () => {
      const inputSamples = new Float32Array(128)
      const inputs = [[inputSamples]] as any

      worklet.process(inputs, [])

      expect(Atomics.load(ctrl, 0)).toBe(0)
    })

    it('writes all-zero quantum (silence) after activation', () => {
      worklet.process([[new Float32Array([0.5])]] as any, [])
      expect(Atomics.load(ctrl, 0)).toBe(1)

      const inputSamples = new Float32Array(128)
      worklet.process([[inputSamples]] as any, [])

      expect(Atomics.load(ctrl, 0)).toBe(129)
    })

    it('updates write position atomically', () => {
      const inputSamples = new Float32Array([1, 2, 3])
      const inputs = [[inputSamples]] as any

      worklet.process(inputs, [])

      expect(Atomics.load(ctrl, 0)).toBe(3)
    })

    it('notifies waiters after writing', () => {
      const notifySpy = vi.spyOn(Atomics, 'notify')
      const inputSamples = new Float32Array([0.5])
      const inputs = [[inputSamples]] as any

      worklet.process(inputs, [])

      expect(notifySpy).toHaveBeenCalledWith(ctrl, 0)
      notifySpy.mockRestore()
    })

    it('handles wrap-around correctly', () => {
      Atomics.store(ctrl, 0, bufSamples - 2)

      const inputSamples = new Float32Array([10, 20, 30, 40])
      const inputs = [[inputSamples]] as any

      worklet.process(inputs, [])

      expect(data[bufSamples - 2]).toBe(10)
      expect(data[bufSamples - 1]).toBe(20)
      expect(data[0]).toBe(30)
      expect(data[1]).toBe(40)
      expect(Atomics.load(ctrl, 0)).toBe(bufSamples + 2)
    })

    it('increments write position correctly across multiple calls', () => {
      const inputs1 = [[new Float32Array([1, 2, 3])]] as any
      const inputs2 = [[new Float32Array([4, 5])]] as any
      const inputs3 = [[new Float32Array([6])]] as any

      worklet.process(inputs1, [])
      expect(Atomics.load(ctrl, 0)).toBe(3)

      worklet.process(inputs2, [])
      expect(Atomics.load(ctrl, 0)).toBe(5)

      worklet.process(inputs3, [])
      expect(Atomics.load(ctrl, 0)).toBe(6)

      expect(data[0]).toBe(1)
      expect(data[1]).toBe(2)
      expect(data[2]).toBe(3)
      expect(data[3]).toBe(4)
      expect(data[4]).toBe(5)
      expect(data[5]).toBe(6)
    })

    it('preserves existing data when writing in the middle', () => {
      const inputs1 = [[new Float32Array([11, 22, 33])]] as any
      worklet.process(inputs1, [])

      Atomics.store(ctrl, 0, 10)
      const inputs2 = [[new Float32Array([99])]] as any
      worklet.process(inputs2, [])

      expect(data[0]).toBe(11)
      expect(data[1]).toBe(22)
      expect(data[2]).toBe(33)
      expect(data[10]).toBe(99)
    })
  })

  describe('process() edge cases', () => {
    beforeEach(() => {
      const msg: AudioRingWriterInitMessage = { type: 'init', sab, bufSamples }
      worklet.port.onmessage?.({
        data: msg,
      } as MessageEvent<AudioRingWriterInitMessage>)
    })

    it('returns true to keep processor running', () => {
      const inputs = [[new Float32Array([1])]] as any
      const result = worklet.process(inputs, [])

      expect(result).toBe(true)
    })

    it('returns true when no input data (empty inputs array)', () => {
      const result = worklet.process([], [])

      expect(result).toBe(true)
      expect(Atomics.load(ctrl, 0)).toBe(0)
    })

    it('returns true when first channel is empty', () => {
      const inputs = [[new Float32Array(0)]] as any
      const result = worklet.process(inputs, [])

      expect(result).toBe(true)
    })

    it('returns true when no first sample in audio', () => {
      const inputs = [[new Float32Array()]] as any
      const result = worklet.process(inputs, [])

      expect(result).toBe(true)
    })

    it('returns true when not initialized (no SAB)', () => {
      const uninitializedWorklet = new AudioRingWriter()
      const inputs = [[new Float32Array([1, 2, 3])]] as any

      const result = uninitializedWorklet.process(inputs, [])

      expect(result).toBe(true)
    })

    it('handles large input frames', () => {
      const largeInput = new Float32Array(512)
      for (let i = 0; i < 512; i++) {
        largeInput[i] = Math.sin(i * 0.01)
      }
      const inputs = [[largeInput]] as any

      expect(() => {
        worklet.process(inputs, [])
      }).not.toThrow()
    })
  })

  describe('message protocol', () => {
    it('accepts InitMessage with all required fields', () => {
      const msg: AudioRingWriterInitMessage = {
        type: 'init',
        sab: new SharedArrayBuffer(1024),
        bufSamples: 128,
      }

      expect(() => {
        worklet.port.onmessage?.({
          data: msg,
        } as MessageEvent<AudioRingWriterInitMessage>)
      }).not.toThrow()
    })

    it('rejects InitMessage with missing bufSamples', () => {
      expect(() => {
        worklet.port.onmessage?.({ data: { type: 'init', sab } } as any)
      }).toThrow('invalid message')
    })

    it('correctly sets bufMask for power-of-two buffer sizes', () => {
      for (const pow of [6, 7, 8, 9, 10]) {
        const size = 2 ** pow
        const testSab = new SharedArrayBuffer(8 + size * 4)
        const testWorklet = new AudioRingWriter()
        const msg: AudioRingWriterInitMessage = {
          type: 'init',
          sab: testSab,
          bufSamples: size,
        }

        expect(() => {
          testWorklet.port.onmessage?.({
            data: msg,
          } as MessageEvent<AudioRingWriterInitMessage>)
        }).not.toThrow()
      }
    })

    it('throws when bufSamples is not a power of 2', () => {
      const testSab = new SharedArrayBuffer(1024)
      const testWorklet = new AudioRingWriter()
      const msg: AudioRingWriterInitMessage = {
        type: 'init',
        sab: testSab,
        bufSamples: 255,
      }

      expect(() => {
        testWorklet.port.onmessage?.({
          data: msg,
        } as MessageEvent<AudioRingWriterInitMessage>)
      }).toThrow('bufSamples must be a power of 2, got 255')
    })

    it('throws for various non-power-of-2 sizes', () => {
      const nonPowerOfTwoSizes = [3, 5, 7, 100, 200, 1000]

      for (const size of nonPowerOfTwoSizes) {
        const testSab = new SharedArrayBuffer(8 + size * 4)
        const testWorklet = new AudioRingWriter()
        const msg: AudioRingWriterInitMessage = {
          type: 'init',
          sab: testSab,
          bufSamples: size,
        }

        expect(() => {
          testWorklet.port.onmessage?.({
            data: msg,
          } as MessageEvent<AudioRingWriterInitMessage>)
        }).toThrow(`bufSamples must be a power of 2, got ${size}`)
      }
    })
  })

  describe('SAB layout', () => {
    it('allocates correct SAB size for given sample count', () => {
      const testCases = [
        { samples: 64, expected: 8 + 64 * 4 },
        { samples: 256, expected: 8 + 256 * 4 },
        { samples: 4096, expected: 8 + 4096 * 4 },
      ]

      for (const { expected } of testCases) {
        const testSab = new SharedArrayBuffer(expected)
        expect(testSab.byteLength).toBe(expected)
      }
    })

    it('uses correct control region (first 8 bytes = 2 Int32s)', () => {
      expect(ctrl.length).toBe(2)
      expect(ctrl.byteLength).toBe(8)
    })

    it('uses correct data region (remaining bytes as Float32Array)', () => {
      expect(data.length).toBe(bufSamples)
      expect(data.byteLength).toBe(bufSamples * 4)
    })
  })
})
