// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import { NumberRing } from './NumberRing'

describe('NumberRing', () => {
  it('reads back values by absolute index within capacity', () => {
    const ring = new NumberRing(4)
    ring.push(10)
    ring.push(20)
    ring.push(30)

    expect(ring.length).toBe(3)
    expect(ring.get(0)).toBe(10)
    expect(ring.get(1)).toBe(20)
    expect(ring.get(2)).toBe(30)
  })

  it('retains only the most recent `capacity` values', () => {
    const ring = new NumberRing(3)
    for (let i = 0; i < 10; i++) ring.push(i * 100)

    expect(ring.length).toBe(10)
    // Window is [length - capacity, length) = [7, 10).
    expect(ring.get(7)).toBe(700)
    expect(ring.get(8)).toBe(800)
    expect(ring.get(9)).toBe(900)
  })

  it('keeps a fixed-size backing buffer regardless of pushes', () => {
    const ring = new NumberRing(8)
    for (let i = 0; i < 100_000; i++) ring.push(i)
    expect(ring.capacity).toBe(8)
    expect(ring.get(99_999)).toBe(99_999)
  })

  it('throws when reading below the retained window', () => {
    const ring = new NumberRing(3)
    for (let i = 0; i < 5; i++) ring.push(i)
    // Window is [2, 5); index 1 has been overwritten.
    expect(() => ring.get(1)).toThrow(RangeError)
  })

  it('throws when reading at or beyond the write head', () => {
    const ring = new NumberRing(3)
    ring.push(1)
    expect(() => ring.get(1)).toThrow(RangeError)
    expect(() => ring.get(-1)).toThrow(RangeError)
  })

  it('round-trips NaN as a null sentinel', () => {
    const ring = new NumberRing(2)
    ring.push(NaN)
    ring.push(42)
    expect(Number.isNaN(ring.get(0))).toBe(true)
    expect(ring.get(1)).toBe(42)
  })

  it('rejects a non-positive capacity', () => {
    expect(() => new NumberRing(0)).toThrow(RangeError)
  })
})
