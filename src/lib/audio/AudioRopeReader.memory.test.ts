// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Memory tests for AudioRopeReader. These verify that the per-quantum
// `readBuf.slice()` allocations (AudioRopeReader.ts:45) are collectable after
// the consumer drops them, and that the reader itself is collectable after
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
  itGc('per-quantum slices are collectable after iteration', async () => {
    const rope = new AudioRope(44100)
    const data = new Float32Array(SEG_SAMPLES)
    for (let i = 0; i < SEG_SAMPLES; i++) data[i] = i
    rope.append(data)
    rope.seal()

    const share = rope.shareRope()
    const reader = new AudioRopeReader(share, 128)

    // Iterate fully, keeping references to the first 5 slices only.
    const kept: Float32Array[] = []
    let count = 0
    for await (const chunk of reader) {
      if (count < 5) kept.push(chunk)
      count++
    }
    expect(count).toBe(SEG_SAMPLES / 128) // 512 chunks

    // Drop the kept slices — they should become collectable now that
    // iteration is complete and we hold no other references.
    const refs = kept.map((d) => new WeakRef(d as object))
    kept.length = 0

    let collectedCount = 0
    for (const ref of refs) {
      if (await waitForCollection(ref, 3000)) collectedCount++
    }
    expect(collectedCount).toBe(5)
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
    for (let i = 0; i < SEG_SAMPLES; i++) data[i] = i

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
    expect(dest[0]).toBe(0)
    expect(dest[SEG_SAMPLES - 1]).toBe(SEG_SAMPLES - 1)
    expect(dest[SEG_SAMPLES]).toBe(0)
    expect(dest[total - 1]).toBe(Math.floor(SEG_SAMPLES / 2) - 1)
  })
})
