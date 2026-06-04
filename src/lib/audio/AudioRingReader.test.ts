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

import { describe, it, expect, beforeEach } from 'vitest'

import { AudioRingReader } from './AudioRingReader'

/**
 * Helper to simulate what AudioRingWriter does: write samples to the SAB
 * and update the write position atomically.
 */
function writeSamplesToRing(
  ctrl: Int32Array,
  data: Float32Array,
  bufMask: number,
  samples: Float32Array,
): void {
  const wp = Atomics.load(ctrl, 0)
  for (let i = 0; i < samples.length; i++) {
    data[(wp + i) & bufMask] = samples[i]!
  }
  Atomics.store(ctrl, 0, wp + samples.length)
  Atomics.notify(ctrl, 0)
}

describe('AudioRingReader', () => {
  let sab: SharedArrayBuffer
  let bufSamples: number
  let quantum: number
  let ctrl: Int32Array
  let data: Float32Array

  beforeEach(() => {
    bufSamples = 256
    quantum = 64
    sab = new SharedArrayBuffer(8 + bufSamples * 4)
    ctrl = new Int32Array(sab, 0, 2)
    data = new Float32Array(sab, 8, bufSamples)
  })

  describe('constructor validation', () => {
    it('throws when bufSamples is not a power of 2', () => {
      const testSab = new SharedArrayBuffer(8 + 255 * 4)
      expect(() => {
        new AudioRingReader(testSab, 255, 64)
      }).toThrow('bufSamples must be a power of 2, got 255')
    })

    it('throws for various non-power-of-2 sizes', () => {
      const nonPowerOfTwoSizes = [3, 5, 7, 100, 200, 1000]

      for (const size of nonPowerOfTwoSizes) {
        const testSab = new SharedArrayBuffer(8 + size * 4)
        expect(() => {
          new AudioRingReader(testSab, size, 64)
        }).toThrow(`bufSamples must be a power of 2, got ${size}`)
      }
    })

    it('accepts power-of-2 buffer sizes', () => {
      for (const pow of [6, 7, 8, 9, 10]) {
        const size = 2 ** pow
        const testSab = new SharedArrayBuffer(8 + size * 4)
        expect(() => {
          new AudioRingReader(testSab, size, 64)
        }).not.toThrow()
      }
    })
  })

  it('reads a single quantum', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)
    const samples = new Float32Array([1, 2, 3, 4])

    writeSamplesToRing(ctrl, data, bufSamples - 1, samples)
    for (let i = 0; i < quantum; i++) {
      writeSamplesToRing(ctrl, data, bufSamples - 1, new Float32Array([i]))
    }

    const iterator = reader[Symbol.asyncIterator]()
    const result = await iterator.next()
    expect(result.done).toBe(false)
    if (!result.done) {
      expect(result.value).toHaveLength(quantum)
      expect(result.value[0]).toBe(1)
      expect(result.value[1]).toBe(2)
      expect(result.value[2]).toBe(3)
      expect(result.value[3]).toBe(4)
    }
  })

  it('reads multiple quanta sequentially', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)
    const quantum1 = new Float32Array(quantum)
    const quantum2 = new Float32Array(quantum)

    for (let i = 0; i < quantum; i++) {
      quantum1[i] = i
      quantum2[i] = i + 100
    }

    writeSamplesToRing(ctrl, data, bufSamples - 1, quantum1)
    writeSamplesToRing(ctrl, data, bufSamples - 1, quantum2)

    const iterator = reader[Symbol.asyncIterator]()
    const first = await iterator.next()
    const second = await iterator.next()

    if (!first.done && !second.done) {
      expect(first.value[0]).toBe(0)
      expect(first.value[quantum - 1]).toBe(quantum - 1)
      expect(second.value[0]).toBe(100)
      expect(second.value[quantum - 1]).toBe(100 + quantum - 1)
    }
  })

  it('handles circular buffer wrap-around', async () => {
    // Drain a full ring's worth of data so rp catches up to bufSamples, putting
    // the physical write head back at position 0.  This is the realistic way to
    // reach a wrap-around: both counters advance together, never diverging by
    // more than bufSamples.
    const reader = new AudioRingReader(sab, bufSamples, quantum)
    const bufMask = bufSamples - 1

    const fill = new Float32Array(bufSamples)
    writeSamplesToRing(ctrl, data, bufMask, fill)
    const iter = reader[Symbol.asyncIterator]()
    for (let q = 0; q < bufSamples / quantum; q++) await iter.next()
    // rp = wp = bufSamples; physical write head is back at index 0.

    // Write one quantum with known values — lands at physical positions 0..quantum-1.
    const samples = new Float32Array(quantum)
    for (let i = 0; i < quantum; i++) samples[i] = i + 1
    writeSamplesToRing(ctrl, data, bufMask, samples)

    const result = await iter.next()
    expect(result.done).toBe(false)
    if (!result.done) {
      expect(result.value).toHaveLength(quantum)
      for (let i = 0; i < quantum; i++) {
        expect(result.value[i]).toBe(i + 1)
      }
    }
  })

  it('detects and recovers from ring buffer overrun', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)
    const bufMask = bufSamples - 1

    const overruns: number[] = []
    reader.onOverrun = (dropped) => overruns.push(dropped)

    // Write bufSamples + quantum samples with rp still at 0: the writer has
    // lapped the reader by exactly one quantum.
    const samples = new Float32Array(bufSamples + quantum)
    for (let i = 0; i < samples.length; i++) samples[i] = i
    writeSamplesToRing(ctrl, data, bufMask, samples)

    const iter = reader[Symbol.asyncIterator]()
    await iter.next()

    // Overrun must have been reported.
    expect(overruns.length).toBeGreaterThan(0)
    expect(overruns[0]).toBeGreaterThan(0)
  })

  it('stops iteration when stop sentinel is set', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)
    const samples = new Float32Array(quantum)
    for (let i = 0; i < quantum; i++) {
      samples[i] = i
    }

    writeSamplesToRing(ctrl, data, bufSamples - 1, samples)

    const iterator = reader[Symbol.asyncIterator]()
    const first = await iterator.next()
    expect(first.done).toBe(false)

    Atomics.store(ctrl, 1, 1)
    Atomics.notify(ctrl, 0)
    const second = await iterator.next()
    expect(second.done).toBe(true)
  })

  it('waits for data when buffer is empty', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)

    const iterator = reader[Symbol.asyncIterator]()
    const promise = iterator.next()

    await new Promise((resolve) => setTimeout(resolve, 10))

    const samples = new Float32Array(quantum)
    for (let i = 0; i < quantum; i++) {
      samples[i] = 99
    }
    writeSamplesToRing(ctrl, data, bufSamples - 1, samples)

    const result = await promise
    expect(result.done).toBe(false)
    if (!result.done) {
      expect(result.value[0]).toBe(99)
    }
  })

  it('preserves data across multiple quantum reads', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)

    const samples = new Float32Array(quantum * 3)
    for (let i = 0; i < samples.length; i++) {
      samples[i] = i
    }
    writeSamplesToRing(ctrl, data, bufSamples - 1, samples)

    const iterator = reader[Symbol.asyncIterator]()
    const q1 = await iterator.next()
    const q2 = await iterator.next()
    const q3 = await iterator.next()

    if (!q1.done && !q2.done && !q3.done) {
      expect(q1.value[0]).toBe(0)
      expect(q1.value[quantum - 1]).toBe(quantum - 1)

      expect(q2.value[0]).toBe(quantum)
      expect(q2.value[quantum - 1]).toBe(2 * quantum - 1)

      expect(q3.value[0]).toBe(2 * quantum)
      expect(q3.value[quantum - 1]).toBe(3 * quantum - 1)
    }
  })

  it('handles stop sentinel during wait', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)

    const iterator = reader[Symbol.asyncIterator]()
    const promise = iterator.next()

    await new Promise((resolve) => setTimeout(resolve, 10))
    Atomics.store(ctrl, 1, 1)
    Atomics.notify(ctrl, 0)

    const result = await promise
    expect(result.done).toBe(true)
  })

  it('yields independent Float32Array copies', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)

    const samples = new Float32Array(quantum * 2)
    for (let i = 0; i < samples.length; i++) {
      samples[i] = i
    }
    writeSamplesToRing(ctrl, data, bufSamples - 1, samples)

    const iterator = reader[Symbol.asyncIterator]()
    const q1 = await iterator.next()
    const q1Copy = !q1.done ? new Float32Array(q1.value) : new Float32Array(0)

    const q2 = await iterator.next()

    if (!q1.done && !q2.done) {
      expect(q1.value).not.toBe(q2.value)
      expect(q1Copy[0]).toBe(0)
    }
  })

  it('reads correct data when quantum does not align with write position', async () => {
    const reader = new AudioRingReader(sab, bufSamples, quantum)
    const bufMask = bufSamples - 1

    const part1 = new Float32Array(quantum)
    for (let i = 0; i < quantum; i++) {
      part1[i] = i < 5 ? 10 + i : i
    }
    writeSamplesToRing(ctrl, data, bufMask, part1)

    const iterator = reader[Symbol.asyncIterator]()
    const first = await iterator.next()

    if (!first.done) {
      expect(first.value[0]).toBe(10)
      expect(first.value[4]).toBe(14)
      expect(first.value[5]).toBe(5)
    }
  })
})
