// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect, beforeEach } from 'vitest'

import { AudioRope } from './AudioRope'

// Must match SEG_SAMPLES in AudioRope.ts. Kept here because it isn't exported;
// the boundary-crossing tests below are meaningless if these drift apart.
const SEG = 65536

// Ramp of consecutive integers starting at `start`. Integers up to 2^24 are
// exact in Float32, and our largest ramp stays well under that, so reads can
// be compared with `===` and any misplacement/seam error shows up as a
// discontinuity at a known index.
function ramp(start: number, len: number): Float32Array {
  const a = new Float32Array(len)
  for (let i = 0; i < len; i += 1) {
    a[i] = start + i
  }
  return a
}

function firstMismatch(actual: Float32Array, start: number): number {
  for (let i = 0; i < actual.length; i += 1) {
    if (actual[i] !== start + i) {
      return i
    }
  }
  return -1
}

// Asserts `actual` is the ramp `start, start+1, ...`. Reports the first bad
// index rather than dumping the whole array.
function expectRamp(actual: Float32Array, start: number): void {
  expect(firstMismatch(actual, start)).toBe(-1)
}

function readAll(rope: AudioRope): Float32Array {
  const dest = new Float32Array(rope.length)
  rope.read(dest, 0, 0, rope.length)
  return dest
}

describe('AudioRope', () => {
  describe('construction', () => {
    it('starts empty and exposes the sample rate', () => {
      const r = new AudioRope(48000)
      expect(r.sampleRate).toBe(48000)
      expect(r.length).toBe(0)
    })

    it('round-trips sample rate and data through shareRope', () => {
      const producer = new AudioRope(44100)
      producer.append(ramp(0, 100))
      const consumer = new AudioRope(producer.shareRope())
      expect(consumer.sampleRate).toBe(44100)
      expect(consumer.length).toBe(100)
      expectRamp(readAll(consumer), 0)
    })
  })

  describe('append + read', () => {
    it('appends and reads back a small buffer', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 10))
      expect(r.length).toBe(10)
      expectRamp(readAll(r), 0)
    })

    it('treats an empty append as a no-op', () => {
      const r = new AudioRope(48000)
      r.append(new Float32Array(0))
      expect(r.length).toBe(0)
    })

    it('concatenates successive appends into one continuous stream', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 100))
      r.append(ramp(100, SEG)) // starts mid-segment, crosses into seg 1
      r.append(ramp(100 + SEG, 50))
      expect(r.length).toBe(100 + SEG + 50)
      expectRamp(readAll(r), 0)
    })

    it('reads a sub-range with a destination write offset', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 50))
      const dest = new Float32Array(10)
      dest.fill(-1)
      r.read(dest, 20, 3, 5) // copy [20..25) into dest[3..8)
      expect(Array.from(dest)).toEqual([-1, -1, -1, 20, 21, 22, 23, 24, -1, -1])
    })
  })

  describe('segment boundaries', () => {
    it('keeps exactly one spare buffer ahead of the write head', () => {
      const r = new AudioRope(48000)
      expect(r.shareRope().buffers.length).toBe(1) // fresh: just the spare

      r.append(ramp(0, 1))
      expect(r.shareRope().buffers.length).toBe(2) // seg 0 + spare

      r.append(ramp(1, SEG)) // last sample lands in seg 1
      expect(r.shareRope().buffers.length).toBe(3) // segs 0,1 + spare
    })

    it('handles an append that exactly fills a segment', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, SEG))
      expect(r.length).toBe(SEG)

      r.append(ramp(SEG, 1)) // first sample of seg 1
      expect(r.length).toBe(SEG + 1)

      const two = new Float32Array(2)
      r.read(two, SEG - 1, 0, 2) // last of seg 0, first of seg 1
      expect(Array.from(two)).toEqual([SEG - 1, SEG])
    })

    it('handles a single append spanning multiple segments', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 3 * SEG + 7))
      expect(r.length).toBe(3 * SEG + 7)
      expectRamp(readAll(r), 0)
    })

    it('reads across a segment boundary', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 3 * SEG))
      const dest = new Float32Array(20)
      r.read(dest, 2 * SEG - 10, 0, 20) // straddles seg 1 / seg 2
      expectRamp(dest, 2 * SEG - 10)
    })
  })

  describe('read validation', () => {
    let r: AudioRope
    beforeEach(() => {
      r = new AudioRope(48000)
      r.append(ramp(0, 10))
    })

    it('throws reading past the end', () => {
      expect(() => r.read(new Float32Array(5), 6, 0, 5)).toThrow(RangeError)
    })

    it('rejects a negative readFrom', () => {
      expect(() => r.read(new Float32Array(4), -1, 0, 1)).toThrow(RangeError)
    })

    it('rejects a negative writeTo', () => {
      expect(() => r.read(new Float32Array(4), 0, -1, 1)).toThrow(RangeError)
    })

    it('rejects a negative count', () => {
      expect(() => r.read(new Float32Array(4), 0, 0, -1)).toThrow(RangeError)
    })

    it('rejects non-integer arguments', () => {
      expect(() => r.read(new Float32Array(4), 0.5, 0, 1)).toThrow(RangeError)
    })

    it('throws when the destination is too small', () => {
      expect(() => r.read(new Float32Array(2), 0, 0, 5)).toThrow(RangeError)
    })

    it('allows reading exactly up to the length', () => {
      const dest = new Float32Array(10)
      r.read(dest, 0, 0, 10)
      expectRamp(dest, 0)
    })

    it('allows a zero-count read as a no-op', () => {
      expect(() => r.read(new Float32Array(0), 5, 0, 0)).not.toThrow()
    })
  })

  describe('cross-thread sharing', () => {
    it('shows appends within already-shared segments without a grow', () => {
      const producer = new AudioRope(48000)
      producer.append(ramp(0, 10))
      const consumer = new AudioRope(producer.shareRope())
      expect(consumer.length).toBe(10)

      // Stays within seg 0, which the consumer already holds.
      producer.append(ramp(10, 20))
      expect(consumer.length).toBe(30) // visible via the shared length atomic
      expectRamp(readAll(consumer), 0)
    })

    it('clamps a consumer to the segments it physically holds', () => {
      const producer = new AudioRope(48000)
      const consumer = new AudioRope(producer.shareRope()) // 1 buffer each
      producer.append(ramp(0, 2 * SEG + 10)) // producer grows; consumer does not

      expect(producer.length).toBe(2 * SEG + 10)
      expect(consumer.length).toBe(SEG) // clamped to its single buffer

      // It can read everything up to the clamp...
      const part = new Float32Array(SEG)
      consumer.read(part, 0, 0, SEG)
      expectRamp(part, 0)

      // ...but not past it.
      expect(() => consumer.read(new Float32Array(1), SEG, 0, 1)).toThrow(
        RangeError,
      )
    })

    it('restores readability after grow delivers the missing buffers', () => {
      const producer = new AudioRope(48000)
      const consumer = new AudioRope(producer.shareRope()) // 1 buffer
      producer.append(ramp(0, 2 * SEG + 10))

      consumer.grow(producer.shareGrowth(1)!)
      expect(consumer.length).toBe(2 * SEG + 10)
      expectRamp(readAll(consumer), 0)
    })

    it('reports the buffer count the consumer must already hold', () => {
      const producer = new AudioRope(48000)
      producer.append(ramp(0, 2 * SEG)) // producer now holds 3 buffers
      const g = producer.shareGrowth(1)!
      expect(g.oldBufferCount).toBe(1) // the count *before* the new buffers
      expect(g.buffers.length).toBe(2)
    })

    it('rejects a grow with a mismatched buffer count', () => {
      const producer = new AudioRope(48000)
      const consumer = new AudioRope(producer.shareRope())
      producer.append(ramp(0, 2 * SEG))
      const g = producer.shareGrowth(1)!

      consumer.grow(g) // first application is fine
      expect(() => consumer.grow(g)).toThrow() // re-applying must not double-add
    })

    it('grows incrementally across two segment-crossing appends', () => {
      const producer = new AudioRope(48000)
      const consumer = new AudioRope(producer.shareRope()) // 1 buffer

      producer.append(ramp(0, SEG + 5)) // into seg 1
      consumer.grow(producer.shareGrowth(consumer.shareRope().buffers.length)!)
      expectRamp(readAll(consumer), 0)

      producer.append(ramp(SEG + 5, SEG)) // into seg 2
      consumer.grow(producer.shareGrowth(consumer.shareRope().buffers.length)!)
      expect(consumer.length).toBe(2 * SEG + 5)
      expectRamp(readAll(consumer), 0)
    })

    it('returns a buffer snapshot from shareRope unaffected by later growth', () => {
      const producer = new AudioRope(48000)
      producer.append(ramp(0, 10))
      const snap = producer.shareRope()
      const before = snap.buffers.length

      producer.append(ramp(10, 3 * SEG)) // forces the producer to grow
      expect(snap.buffers.length).toBe(before)
    })

    it('supports multiple independent consumers on the same data', () => {
      const producer = new AudioRope(48000)
      producer.append(ramp(0, 100))
      const c1 = new AudioRope(producer.shareRope())
      const c2 = new AudioRope(producer.shareRope())

      producer.append(ramp(100, 100)) // within seg 0, no grow needed
      expect(c1.length).toBe(200)
      expect(c2.length).toBe(200)
      expectRamp(readAll(c1), 0)
      expectRamp(readAll(c2), 0)
    })
  })

  describe('seal', () => {
    it('reports sealed and drops the spare buffer', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 100))
      expect(r.sealed).toBe(false)
      expect(r.shareRope().buffers.length).toBe(2) // seg 0 + spare

      r.seal()
      expect(r.sealed).toBe(true)
      expect(r.shareRope().buffers.length).toBe(1) // spare gone
      expect(r.length).toBe(100)
      expectRamp(readAll(r), 0)
    })

    it('keeps every segment the data spans, dropping only the spare', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, SEG + 5)) // segs 0,1 + spare
      expect(r.shareRope().buffers.length).toBe(3)

      r.seal()
      expect(r.shareRope().buffers.length).toBe(2) // segs 0,1
      expect(r.length).toBe(SEG + 5)
      expectRamp(readAll(r), 0)
    })

    it('appends the optional data before sealing', () => {
      const r = new AudioRope(48000)
      r.seal(ramp(0, 50))
      expect(r.sealed).toBe(true)
      expect(r.length).toBe(50)
      expect(r.shareRope().buffers.length).toBe(1) // no spare
      expectRamp(readAll(r), 0)
    })

    it('seals an empty rope down to zero buffers', () => {
      const r = new AudioRope(48000)
      r.seal()
      expect(r.sealed).toBe(true)
      expect(r.length).toBe(0)
      expect(r.shareRope().buffers.length).toBe(0)
    })

    it('rejects appends once sealed', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 10))
      r.seal()
      expect(() => r.append(ramp(10, 5))).toThrow()
      // seal(data) routes through append, so it fails the same way.
      expect(() => r.seal(ramp(10, 5))).toThrow()
    })

    it('is idempotent when re-sealed without data', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 10))
      r.seal()
      expect(() => r.seal()).not.toThrow()
      expect(r.length).toBe(10)
      expect(r.shareRope().buffers.length).toBe(1)
    })
  })

  describe('seal across copies', () => {
    it('shows the sealed flag to consumers at once, but each drops its own spare', () => {
      const producer = new AudioRope(48000)
      producer.append(ramp(0, 100))
      const consumer = new AudioRope(producer.shareRope())
      expect(consumer.sealed).toBe(false)
      expect(consumer.shareRope().buffers.length).toBe(2) // holds the spare

      producer.seal()
      // The flag lives in the shared control block, so it's visible before the
      // consumer runs its own seal...
      expect(consumer.sealed).toBe(true)
      // ...but the spare is a per-copy reference, still held here.
      expect(consumer.shareRope().buffers.length).toBe(2)

      consumer.seal()
      expect(consumer.shareRope().buffers.length).toBe(1)
      expect(consumer.length).toBe(100)
      expectRamp(readAll(consumer), 0)
    })

    it('is born sealed when constructed from a sealed share', () => {
      const producer = new AudioRope(48000)
      producer.seal(ramp(0, 100))
      const consumer = new AudioRope(producer.shareRope())
      expect(consumer.sealed).toBe(true)
      expect(() => consumer.append(ramp(100, 5))).toThrow()
      expectRamp(readAll(consumer), 0)
    })
  })

  describe('observers', () => {
    it('forwards a grow to a lockstep copy via onGrow', () => {
      const producer = new AudioRope(48000)
      const consumer = new AudioRope(producer.shareRope()) // 1 buffer
      // A second copy snapshotted from the consumer, kept in step by forwarding.
      const mirror = new AudioRope(consumer.shareRope())
      const unsub = consumer.onGrow((grow) => mirror.grow(grow))

      producer.append(ramp(0, 2 * SEG + 10))
      // The consumer applying the grow fires onGrow, which the mirror replays.
      consumer.grow(producer.shareGrowth(1)!)

      expect(mirror.length).toBe(2 * SEG + 10)
      expectRamp(readAll(mirror), 0)

      // After unsubscribing the mirror no longer receives forwarded grows, so it
      // stalls at the buffers it holds while the consumer keeps growing. Append
      // far past the mirror's spare so the gap is visible (a small append would
      // land in the already-held spare and show up via the shared length atomic).
      unsub()
      producer.append(ramp(2 * SEG + 10, 4 * SEG))
      consumer.grow(producer.shareGrowth(consumer.shareRope().buffers.length)!)

      expect(consumer.length).toBe(6 * SEG + 10)
      expect(mirror.length).toBe(4 * SEG) // clamped to the 4 buffers it held
    })

    it('fires onSeal when the copy is sealed', () => {
      const r = new AudioRope(48000)
      r.append(ramp(0, 10))
      let sealCount = 0
      const unsub = r.onSeal(() => {
        sealCount += 1
      })

      r.seal()
      expect(sealCount).toBe(1)

      unsub()
      r.seal() // idempotent re-seal no longer notifies
      expect(sealCount).toBe(1)
    })

    it('delivers grows to multiple observers', () => {
      const producer = new AudioRope(48000)
      const consumer = new AudioRope(producer.shareRope())
      const seen: number[] = []
      consumer.onGrow((grow) => seen.push(grow.buffers.length))
      consumer.onGrow((grow) => seen.push(grow.buffers.length))

      producer.append(ramp(0, 2 * SEG))
      consumer.grow(producer.shareGrowth(1)!)
      expect(seen).toEqual([2, 2])
    })
  })
})
