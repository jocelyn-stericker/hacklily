// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'

import { HfEnergyCursor } from './VadWorker'

// A minimal stand-in for AudioRopeReader: the cursor only needs `length` and
// `readAt`. Backed by a fixed Float32Array so we can compare against a reference.
class FakeReader {
  constructor(private readonly data: Float32Array) {}
  get length(): number {
    return this.data.length
  }
  readAt(dest: Float32Array, pos: number, count: number): void {
    dest.set(this.data.subarray(pos, pos + count), 0)
  }
}

// The exact computation the old VadWorker read loop did inline, kept here as the
// reference the cursor must reproduce bit-for-bit. (ONSET_HP_HZ = 300.)
function referenceEnergies(
  data: Float32Array,
  sampleRate: number,
  timeStepSamples: number,
): number[] {
  const hpCoeff = 1 / (1 + (2 * Math.PI * 300) / sampleRate)
  let hpPrevIn = 0
  let hpPrevOut = 0
  let acc = 0
  let count = 0
  let pending = 0
  const out: number[] = []
  for (const x of data) {
    const hp = hpCoeff * (hpPrevOut + x - hpPrevIn)
    hpPrevIn = x
    hpPrevOut = hp
    acc += hp * hp
    count++
    pending++
    if (pending > timeStepSamples) {
      pending -= timeStepSamples
      out.push(count > 0 ? acc / count : 0)
      acc = 0
      count = 0
    }
  }
  return out
}

function makeSignal(n: number): Float32Array {
  // Deterministic mix of tones + a pseudo-random component, spanning the HP
  // band so the filter actually does something.
  const data = new Float32Array(n)
  let seed = 12345
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const noise = (seed / 0x7fffffff) * 2 - 1
    data[i] =
      0.6 * Math.sin((2 * Math.PI * 220 * i) / 44100) +
      0.3 * Math.sin((2 * Math.PI * 3000 * i) / 44100) +
      0.1 * noise
  }
  return data
}

describe('HfEnergyCursor', () => {
  const SAMPLE_RATE = 44100
  const TIME_STEP_SAMPLES = Math.round(0.002 * SAMPLE_RATE) // 88

  it('reproduces the reference per-frame energies bit-for-bit', () => {
    const data = makeSignal(20_000)
    const expected = referenceEnergies(data, SAMPLE_RATE, TIME_STEP_SAMPLES)

    const cursor = new HfEnergyCursor(
      new FakeReader(data) as never,
      SAMPLE_RATE,
      TIME_STEP_SAMPLES,
    )

    expect(expected.length).toBeGreaterThan(100)
    for (let f = 0; f < expected.length; f++) {
      expect(cursor.energyForFrame(f)).toBe(expected[f])
    }
  })

  it('is independent of read-block boundaries (continuous filter state)', () => {
    // Crossing the internal 1024-sample fill boundary must not perturb values:
    // request frames straddling several fills and compare to the reference.
    const data = makeSignal(8_000)
    const expected = referenceEnergies(data, SAMPLE_RATE, TIME_STEP_SAMPLES)
    const cursor = new HfEnergyCursor(
      new FakeReader(data) as never,
      SAMPLE_RATE,
      TIME_STEP_SAMPLES,
    )
    for (let f = 0; f < expected.length; f++) {
      expect(cursor.energyForFrame(f)).toBe(expected[f])
    }
  })

  it('rejects out-of-order frame requests', () => {
    const data = makeSignal(2_000)
    const cursor = new HfEnergyCursor(
      new FakeReader(data) as never,
      SAMPLE_RATE,
      TIME_STEP_SAMPLES,
    )
    expect(cursor.energyForFrame(0)).toBeTypeOf('number')
    // Skipping frame 1 (asking for 2) violates the monotone-by-one contract.
    expect(() => cursor.energyForFrame(2)).toThrow(RangeError)
  })

  it('throws when a requested frame reads past committed samples', () => {
    const data = makeSignal(500)
    const expected = referenceEnergies(data, SAMPLE_RATE, TIME_STEP_SAMPLES)
    const cursor = new HfEnergyCursor(
      new FakeReader(data) as never,
      SAMPLE_RATE,
      TIME_STEP_SAMPLES,
    )
    for (let f = 0; f < expected.length; f++) cursor.energyForFrame(f)
    // One past the last fully-committed frame: no samples left to read.
    expect(() => cursor.energyForFrame(expected.length)).toThrow(RangeError)
  })
})
