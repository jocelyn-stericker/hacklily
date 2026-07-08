// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Memory tests for AudioRopeReader. The iterator yields a single reused
// internal buffer (no per-quantum allocation), so these verify that contract --
// the same Float32Array is handed out every turn, and a consumer must copy to
// retain a snapshot -- and that the reader itself is collectable after
// seal+iteration completes.
//
// Run with --expose-gc for deterministic collection:
//   node --expose-gc node_modules/.bin/vitest run src/lib/audio/AudioRopeReader.memory.test.ts
//
// Without --expose-gc, these tests fall back to a timeout-based wait that may
// be flaky. They skip if GC is unavailable and the wait times out.

import { describe, it, expect } from 'vitest'

import { AudioRope, SEG_SAMPLES } from './AudioRope'
import { AudioRopeReader } from './AudioRopeReader'

// The rope stores int16 natively; values of the form k/32768 (k in int16
// range) round-trip exactly. See AudioRope.test.ts for the full rationale.
const PCM_SCALE = 32768
function toF32(intValue: number): number {
  return ((intValue % 65536) - 32768) / PCM_SCALE
}

function hasGc(): boolean {
  return typeof (globalThis as { gc?: unknown }).gc === 'function'
}

/**
 * Wait for `target` (held by WeakRef) to be collected. Forces GC if
 * available; otherwise just waits. Returns true if collected within
 * `timeoutMs`.
 */
async function waitForCollection(
  ref: WeakRef<object>,
  timeoutMs = 5000,
): Promise<boolean> {
  if (hasGc()) {
    for (let i = 0; i < 20; i++) {
      ;(globalThis as { gc: () => void }).gc()
      if (ref.deref() === undefined) return true
      await new Promise((r) => setTimeout(r, 50))
    }
    return false
  }
  // No --expose-gc: best-effort wait.
  for (let i = 0; i < timeoutMs / 100; i++) {
    if (ref.deref() === undefined) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

// Collection-dependent tests are skipped without --expose-gc to avoid
// 5-second timeouts on every run. Run them explicitly with:
//   node --expose-gc node_modules/.bin/vitest run AudioRopeReader.memory
const itGc = hasGc() ? it : it.skip

describe('AudioRopeReader memory', () => {
  it('yields a single reused buffer (no per-quantum allocation)', async () => {
    const rope = new AudioRope(44100)
    const data = new Float32Array(SEG_SAMPLES)
    for (let i = 0; i < SEG_SAMPLES; i++) data[i] = toF32(i)
    rope.append(data)
    rope.seal()

    const share = rope.shareRope()
    const reader = new AudioRopeReader(share, 128)

    // The iterator hands out the same backing array every turn. Collecting the
    // distinct identities seen across a full pass must yield exactly one.
    const seen = new Set<Float32Array>()
    let count = 0
    let firstChunkFirstSample = NaN
    for await (const chunk of reader) {
      if (count === 0) firstChunkFirstSample = chunk[0]!
      seen.add(chunk)
      count++
    }
    expect(count).toBe(SEG_SAMPLES / 128) // 512 chunks
    expect(seen.size).toBe(1) // one reused buffer, not 512 slices
    expect(firstChunkFirstSample).toBe(toF32(0)) // data[0]
  })

  it('a copied chunk survives the next iteration; the raw buffer is overwritten', async () => {
    const rope = new AudioRope(44100)
    const data = new Float32Array(SEG_SAMPLES)
    for (let i = 0; i < SEG_SAMPLES; i++) data[i] = toF32(i)
    rope.append(data)
    rope.seal()

    const share = rope.shareRope()
    const reader = new AudioRopeReader(share, 128)
    const iter = reader[Symbol.asyncIterator]()

    // First quantum: samples 0..127. Take a borrowed view and an owned copy.
    const first = await iter.next()
    expect(first.done).toBe(false)
    const borrowed = first.value!
    const copy = borrowed.slice()
    expect(borrowed[0]).toBe(toF32(0))
    expect(copy[0]).toBe(toF32(0))

    // Second quantum: samples 128..255. The borrowed view (same backing array)
    // is now overwritten in place; the copy is unaffected. Checks retain-must-copy contract.
    const second = await iter.next()
    expect(second.value).toBe(borrowed) // identity: same reused buffer
    expect(borrowed[0]).toBe(toF32(128)) // overwritten
    expect(copy[0]).toBe(toF32(0)) // snapshot preserved
  })

  itGc('reader is collectable after seal+iteration completes', async () => {
    const rope = new AudioRope(44100)
    const data = new Float32Array(256)
    rope.append(data)
    rope.seal()

    const share = rope.shareRope()
    let reader: AudioRopeReader | null = new AudioRopeReader(share, 128)

    let count = 0
    for await (const _chunk of reader) {
      count++
    }
    expect(count).toBe(2) // 256 samples / 128 quantum = 2 chunks

    const ref = new WeakRef(reader as object)
    reader = null // drop our reference

    const collected = await waitForCollection(ref, 5000)
    expect(collected).toBe(true)
  })

  it('rope segments are bounded after seal (spare dropped)', () => {
    const rope = new AudioRope(44100)
    // Append exactly one segment worth of data.
    const data = new Float32Array(SEG_SAMPLES)
    rope.append(data)

    // Before seal, the rope holds one spare segment beyond the data.
    // After seal, the spare should be dropped.
    rope.seal()

    // The rope's length should be exactly SEG_SAMPLES (one segment).
    expect(rope.length).toBe(SEG_SAMPLES)

    // Reading the full rope should work without error.
    const dest = new Float32Array(SEG_SAMPLES)
    rope.read(dest, 0, 0, SEG_SAMPLES)
    expect(dest[0]).toBe(data[0])
    expect(dest[SEG_SAMPLES - 1]).toBe(data[SEG_SAMPLES - 1])
  })

  it('multiple appends across segment boundaries stay bounded', () => {
    const rope = new AudioRope(44100)
    // Append 2.5 segments worth.
    const total = SEG_SAMPLES * 2 + Math.floor(SEG_SAMPLES / 2)
    const data = new Float32Array(SEG_SAMPLES)
    for (let i = 0; i < SEG_SAMPLES; i++) data[i] = toF32(i)

    for (let i = 0; i < 2; i++) rope.append(data)
    rope.append(data.subarray(0, Math.floor(SEG_SAMPLES / 2)))

    expect(rope.length).toBe(total)

    rope.seal()

    // After seal, the rope should have exactly ceil(total / SEG_SAMPLES) segments.
    // No spare.
    const expectedSegs = Math.ceil(total / SEG_SAMPLES)
    expect(expectedSegs).toBe(3)

    expect(rope.length).toBe(total)

    const dest = new Float32Array(total)
    rope.read(dest, 0, 0, total)
    // Verify data integrity at segment boundaries.
    expect(dest[0]).toBe(toF32(0))
    expect(dest[SEG_SAMPLES - 1]).toBe(toF32(SEG_SAMPLES - 1))
    expect(dest[SEG_SAMPLES]).toBe(toF32(0))
    expect(dest[total - 1]).toBe(toF32(Math.floor(SEG_SAMPLES / 2) - 1))
  })
})
