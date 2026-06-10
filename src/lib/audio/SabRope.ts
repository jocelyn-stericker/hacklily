// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { isPowerOfTwo } from '#/lib/dsp/mathUtils'

// About a second at 44100 Hz, power of 2
const SEG_SAMPLES = 65536

console.assert(isPowerOfTwo(SEG_SAMPLES))
const SEG_SAMPLES_MASK = SEG_SAMPLES - 1
const SEG_SAMPLES_SHIFT = Math.log2(SEG_SAMPLES)

// Slots in the shared control block (an Int32Array). `length` is the sample
// count; `sealed` flips to 1 once the rope is finalized and no longer grows.
const CTRL_LENGTH = 0
const CTRL_SEALED = 1
const CTRL_SLOTS = 2

export type SabRopeGrow = {
  type: 'sab-rope-grow'
  /** Number of buffers consumer must have before appending `buffers`. */
  oldBufferCount: number
  buffers: Array<SharedArrayBuffer>
}

/**
 * Tells a consumer the rope has been sealed so it can drop its own spare
 * buffer. Carries no data: the `sealed` flag and final length already live in
 * the shared control block, so a consumer that holds this rope sees them the
 * instant the producer sets them. This message exists only to trigger the
 * local `seal()` that releases the now-useless spare `SharedArrayBuffer`
 * reference in that copy. Ships over the same channel as `SabRopeGrow`.
 */
export type SabRopeSeal = {
  type: 'sab-rope-seal'
}

export type SabRopeShare = {
  type: 'sab-rope'
  sampleRate: number
  buffers: Array<SharedArrayBuffer>
  ctrlPtr: SharedArrayBuffer
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
 *
 * Once a recording is done growing, `seal()` it: that drops the spare buffer
 * and forbids further appends. Sealing sets a shared flag (visible to every
 * copy at once) but the spare reference is per-copy, so each consumer must run
 * its own `seal()` -- driven by the `SabRopeSeal` message -- to actually free it.
 */
export class SabRope {
  #sampleRate: number

  #buffers: Array<SharedArrayBuffer>
  #buffersView: Array<Float32Array<SharedArrayBuffer>>

  #ctrlPtr: SharedArrayBuffer
  #ctrlView: Int32Array

  /** Observers notified when this copy applies a `grow()` / `seal()`. */
  #growListeners = new Set<(grow: SabRopeGrow) => void>()
  #sealListeners = new Set<() => void>()

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
      this.#ctrlPtr = new SharedArrayBuffer(
        Int32Array.BYTES_PER_ELEMENT * CTRL_SLOTS,
      )
      this.#ctrlView = new Int32Array(this.#ctrlPtr)
    } else {
      // oxlint-disable-next-line typescript/no-unnecessary-condition
      console.assert(init.type === 'sab-rope')

      this.#sampleRate = init.sampleRate
      this.#buffers = init.buffers
      this.#buffersView = init.buffers.map((sab) => new Float32Array(sab))
      this.#ctrlPtr = init.ctrlPtr
      this.#ctrlView = new Int32Array(this.#ctrlPtr)
    }
  }

  get sampleRate() {
    return this.#sampleRate
  }

  /** True once `seal()` has run on any copy; no further appends are allowed. */
  get sealed() {
    return Atomics.load(this.#ctrlView, CTRL_SEALED) === 1
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
      Atomics.load(this.#ctrlView, CTRL_LENGTH),
      this.#buffersView.length * SEG_SAMPLES,
    )
  }

  get rawLength() {
    return Atomics.load(this.#ctrlView, CTRL_LENGTH)
  }

  waitForLength(expected: number) {
    return Atomics.waitAsync(this.#ctrlView, CTRL_LENGTH, expected)
  }

  append(data: Float32Array) {
    if (this.sealed) {
      throw new Error('cannot append to a sealed rope')
    }
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
    Atomics.store(this.#ctrlView, CTRL_LENGTH, length)
    Atomics.notify(this.#ctrlView, CTRL_LENGTH)
  }

  /**
   * Finalize the rope: optionally append `data` one last time, mark it sealed,
   * and drop the spare buffer that `append` keeps for lead time. After this,
   * `append` throws.
   *
   * The `sealed` flag and length live in the shared control block, so every
   * copy observes the seal immediately; but each copy holds its own reference
   * to the spare `SharedArrayBuffer`. So this method is idempotent and runs on
   * each copy: the producer seals (optionally with the final `data`) and ships
   * a `SabRopeSeal`; each consumer runs `seal()` (no data) to release its spare
   * and let the buffer be collected everywhere.
   */
  seal(data?: Float32Array) {
    if (data && data.length > 0) {
      // Append before flagging -- `append` rejects a sealed rope.
      this.append(data)
    }

    Atomics.store(this.#ctrlView, CTRL_SEALED, 1)
    Atomics.notify(this.#ctrlView, CTRL_LENGTH)

    // Keep only the buffers `length` spans; drop the trailing spare. Guarded by
    // `>` so a consumer still missing a tail buffer (fewer than `needed`) keeps
    // what it has and never grows here.
    const needed = Math.ceil(
      Atomics.load(this.#ctrlView, CTRL_LENGTH) / SEG_SAMPLES,
    )
    if (this.#buffers.length > needed) {
      this.#buffers.length = needed
      this.#buffersView.length = needed
    }

    for (const cb of this.#sealListeners) cb()
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
    for (const cb of this.#growListeners) cb(grow)
  }

  /**
   * Observe segment buffers arriving on this copy. `cb` fires with each
   * `SabRopeGrow` this copy applies, after the buffers are in place. Lets a
   * second consumer be kept in lockstep: snapshot with `shareRope()` and forward
   * each subsequent grow to it. Because a grow's `oldBufferCount` equals this
   * copy's pre-grow buffer count -- and the snapshot starts the other consumer at
   * that same count -- the forwarded grows line up without re-keying. Snapshot
   * and subscribe with no `await` between them so no grow slips through unseen.
   * Returns an unsubscribe fn.
   */
  onGrow(cb: (grow: SabRopeGrow) => void): () => void {
    this.#growListeners.add(cb)
    return () => {
      this.#growListeners.delete(cb)
    }
  }

  /** Observe this copy being sealed (see `onGrow`). Returns an unsubscribe fn. */
  onSeal(cb: () => void): () => void {
    this.#sealListeners.add(cb)
    return () => {
      this.#sealListeners.delete(cb)
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
      ctrlPtr: this.#ctrlPtr,
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
