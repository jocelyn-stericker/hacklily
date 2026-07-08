// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * A fixed-capacity ring of numbers addressed by an absolute, monotonically
 * increasing index (the count of values ever pushed).
 *
 * It exists to bound worker accumulators that are **append-only** and consumed
 * by a **forward-only** read pointer: such a stream only ever needs the small
 * live window between the write head and the slowest reader, so we retain the
 * `capacity` most-recently-pushed values and overwrite older slots in place.
 * Memory is O(capacity), independent of stream length, with no per-push array
 * growth or object garbage.
 *
 * The retained window is `[length - capacity, length)`. Reading an index below
 * it throws.
 *
 * Null-valued fields can be encoded as `NaN` by the caller (frequencies and
 * timestamps are always finite, so `NaN` is an unambiguous sentinel).
 */
export class NumberRing {
  readonly #buf: Float64Array
  readonly #capacity: number
  #count = 0

  constructor(capacity: number) {
    if (capacity <= 0) throw new RangeError('NumberRing capacity must be > 0')
    this.#capacity = capacity
    this.#buf = new Float64Array(capacity)
  }

  /** Number of values ever pushed; also the absolute index of the next push. */
  get length(): number {
    return this.#count
  }

  get capacity(): number {
    return this.#capacity
  }

  push(value: number): void {
    this.#buf[this.#count % this.#capacity] = value
    this.#count++
  }

  /** Read by absolute index; must lie within the retained window. */
  get(index: number): number {
    if (
      index < 0 ||
      index >= this.#count ||
      index < this.#count - this.#capacity
    ) {
      const lo = Math.max(0, this.#count - this.#capacity)
      throw new RangeError(
        `NumberRing.get(${index}) outside retained window [${lo}, ${this.#count})`,
      )
    }
    return this.#buf[index % this.#capacity]!
  }
}
