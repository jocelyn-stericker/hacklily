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

import { isPowerOfTwo } from './mathUtils'

// About a second at 44100 Hz, power of 2
const SEG_SAMPLES = 65536

console.assert(isPowerOfTwo(SEG_SAMPLES))
const SEG_SAMPLES_MASK = SEG_SAMPLES - 1
const SEG_SAMPLES_SHIFT = Math.log2(SEG_SAMPLES)

export type SabRopeGrow = {
  type: 'sab-rope-grow'
  /** Number of buffers consumer must have before appending `buffers`. */
  oldBufferCount: number
  buffers: Array<SharedArrayBuffer>
}

export type SabRopeShare = {
  type: 'sab-rope'
  sampleRate: number
  buffers: Array<SharedArrayBuffer>
  lengthPtr: SharedArrayBuffer
}

/**
 * Single producer, multiple consumers, append-only, over a rope of per-segment SABs.
 *
 * Two channels: `length` is a shared atomic (instant); segment buffers ship
 * async via postMessage (`shareGrowth` -> `grow`). So a consumer can see a
 * length pointing into a buffer it doesn't have yet -- the `length` getter
 * clamps to locally-held segments, so it just under-reads until `grow` lands.
 *
 * CONTRACT: post `shareGrowth` after every `append`. The one spare buffer per
 * append gives the host ~1 segment (~1.5s @ 44.1kHz) to deliver it; miss that
 * and consumers silently stall at the boundary.
 */
export class SabRope {
  #sampleRate: number

  #buffers: Array<SharedArrayBuffer>
  #buffersView: Array<Float32Array<SharedArrayBuffer>>

  #lengthPtr: SharedArrayBuffer
  #lengthView: Int32Array

  constructor(sampleRate: number)
  constructor(state: SabRopeShare)
  constructor(init: number | SabRopeShare) {
    if (typeof init === 'number') {
      this.#sampleRate = init
      const sab = new SharedArrayBuffer(
        Float32Array.BYTES_PER_ELEMENT * SEG_SAMPLES,
      )
      this.#buffers = [sab]
      this.#buffersView = [new Float32Array(sab)]
      this.#lengthPtr = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 1)
      this.#lengthView = new Int32Array(this.#lengthPtr)
    } else {
      // oxlint-disable-next-line typescript/no-unnecessary-condition
      console.assert(init.type === 'sab-rope')

      this.#sampleRate = init.sampleRate
      this.#buffers = init.buffers
      this.#buffersView = init.buffers.map((sab) => new Float32Array(sab))
      this.#lengthPtr = init.lengthPtr
      this.#lengthView = new Int32Array(this.#lengthPtr)
    }
  }

  get sampleRate() {
    return this.#sampleRate
  }

  #segmentFor(i: number) {
    // Should be good to 2^31 samples (13.5h at 44.1 kHz). Limited by
    // this and Atomics.notify wanting an Int32Array.
    return i >>> SEG_SAMPLES_SHIFT
  }
  #indexFor(i: number) {
    return i & SEG_SAMPLES_MASK
  }

  get length() {
    // Clamped to how much can be read.
    return Math.min(
      Atomics.load(this.#lengthView, 0),
      this.#buffersView.length * SEG_SAMPLES,
    )
  }

  append(data: Float32Array) {
    if (data.length === 0) {
      return
    }

    let length = this.length

    const segmentStart = this.#segmentFor(length)
    const segmentEnd = this.#segmentFor(length + data.length - 1)
    // Always have one free buffer.
    while (this.#buffers.length <= segmentEnd + 1) {
      const sab = new SharedArrayBuffer(
        Float32Array.BYTES_PER_ELEMENT * SEG_SAMPLES,
      )
      this.#buffers.push(sab)
      this.#buffersView.push(new Float32Array(sab))
    }

    let i = 0
    for (let segment = segmentStart; segment <= segmentEnd; segment += 1) {
      const view = this.#buffersView[segment]!
      const writeIdx = this.#indexFor(length)
      const toAdd = Math.min(data.length - i, SEG_SAMPLES - writeIdx)
      view.set(data.subarray(i, i + toAdd), writeIdx)
      length += toAdd
      i += toAdd
    }
    Atomics.store(this.#lengthView, 0, length)
    Atomics.notify(this.#lengthView, 0)
  }

  read(dest: Float32Array, readFrom: number, writeTo: number, count: number) {
    if (
      !Number.isInteger(readFrom) ||
      !Number.isInteger(writeTo) ||
      !Number.isInteger(count) ||
      readFrom < 0 ||
      writeTo < 0 ||
      count < 0
    ) {
      throw new RangeError(
        `read(readFrom=${readFrom}, writeTo=${writeTo}, count=${count}): must be non-negative integers`,
      )
    }

    if (readFrom + count > this.length) {
      throw new RangeError(
        `read past end: ${readFrom + count} > ${this.length}`,
      )
    }

    if (writeTo + count > dest.length) {
      throw new RangeError(
        `read into dest: ${writeTo + count} > ${dest.length}`,
      )
    }

    while (count > 0) {
      const seg = this.#segmentFor(readFrom)
      const idx = this.#indexFor(readFrom)
      const toWrite = Math.min(SEG_SAMPLES - idx, count)
      const view = this.#buffersView[seg]!

      dest.set(view.subarray(idx, idx + toWrite), writeTo)
      readFrom += toWrite
      writeTo += toWrite
      count -= toWrite
    }
  }

  grow(grow: SabRopeGrow) {
    if (grow.oldBufferCount !== this.#buffers.length) {
      throw new Error('Unexpected buffer count')
    }
    for (const buffer of grow.buffers) {
      this.#buffers.push(buffer)
      this.#buffersView.push(new Float32Array(buffer))
    }
  }

  /**
   * Construct an SabRope with this result to share underlying data.
   */
  shareRope(): SabRopeShare {
    return {
      type: 'sab-rope',
      sampleRate: this.#sampleRate,
      buffers: this.#buffers.slice(),
      lengthPtr: this.#lengthPtr,
    }
  }

  /**
   * Grow a cloned SabRope with this result.
   */
  shareGrowth(currentBufferCount: number): SabRopeGrow | null {
    if (this.#buffers.length === currentBufferCount) {
      return null
    }

    const buffers: Array<SharedArrayBuffer> = []
    for (let i = currentBufferCount; i < this.#buffers.length; i += 1) {
      buffers.push(this.#buffers[i]!)
    }

    return {
      type: 'sab-rope-grow',
      oldBufferCount: currentBufferCount,
      buffers,
    }
  }
}
