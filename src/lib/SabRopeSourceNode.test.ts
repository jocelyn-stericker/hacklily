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

import { describe, it, expect, vi } from 'vitest'

import { SabRope } from './SabRope'
import type { AudioRopeSourceNodeMessage } from './SabRopeSourceNode'
import { AudioRopeSourceNode } from './SabRopeSourceNode'

vi.hoisted(() => {
  vi.stubGlobal(
    'AudioWorkletProcessor',
    class MockAudioWorkletProcessor {
      process(): boolean {
        throw new Error('unimplemented')
      }
      port: { onmessage?: ((event: MessageEvent<any>) => void) | null } = {
        onmessage: null,
      }
    },
  )
  vi.stubGlobal('registerProcessor', vi.fn())
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Construct a node with the worklet's `sampleRate` global stubbed. */
function makeNode(outRate: number): AudioRopeSourceNode {
  vi.stubGlobal('sampleRate', outRate)
  return new AudioRopeSourceNode()
}

function send(
  node: AudioRopeSourceNode,
  msg: AudioRopeSourceNodeMessage,
): void {
  ;(
    node as unknown as { port: { onmessage: (e: MessageEvent) => void } }
  ).port.onmessage({ data: msg } as MessageEvent)
}

/** Run one render quantum, returning the first output channel. */
function quantum(
  node: AudioRopeSourceNode,
  frames = 128,
  channels = 1,
): Float32Array[] {
  const out = Array.from({ length: channels }, () => new Float32Array(frames))
  const ok = node.process([], [out])
  expect(ok).toBe(true)
  return out
}

/** Pull `n` output samples across as many quanta as needed. */
function collect(
  node: AudioRopeSourceNode,
  n: number,
  frames = 128,
): Float32Array {
  const result = new Float32Array(n)
  let off = 0
  while (off < n) {
    const [ch] = quantum(node, frames)
    const take = Math.min(frames, n - off)
    result.set(ch!.subarray(0, take), off)
    off += take
  }
  return result
}

function ramp(n: number, base = 0): Float32Array {
  const a = new Float32Array(n)
  for (let i = 0; i < n; i++) a[i] = base + i
  return a
}

function dc(value: number, n: number): Float32Array {
  return new Float32Array(n).fill(value)
}

function sine(freqHz: number, n: number, rate: number, amp = 1): Float32Array {
  const a = new Float32Array(n)
  const omega = (2 * Math.PI * freqHz) / rate
  for (let i = 0; i < n; i++) a[i] = amp * Math.sin(omega * i)
  return a
}

function rms(buf: Float32Array, from: number, to: number): number {
  let e = 0
  for (let i = from; i < to; i++) e += buf[i]! * buf[i]!
  return Math.sqrt(e / (to - from))
}

function setBuffer(node: AudioRopeSourceNode, ...ropes: SabRope[]): void {
  send(node, { type: 'setBuffer', ropes: ropes.map((r) => r.shareRope()) })
}

// ---------------------------------------------------------------------------

describe('AudioRopeSourceNode', () => {
  describe('lifecycle & message protocol', () => {
    it('is silent before any setBuffer/start', () => {
      const node = makeNode(48000)
      const [ch] = quantum(node)
      expect(Array.from(ch!)).toEqual(Array.from(new Float32Array(128)))
    })

    it('is silent after setBuffer until start', () => {
      const node = makeNode(48000)
      setBuffer(node, new SabRope(48000))
      const producer = new SabRope(48000)
      producer.append(ramp(64))
      setBuffer(node, producer)
      // No start yet.
      expect(Array.from(quantum(node)[0]!)).toEqual(
        Array.from(new Float32Array(128)),
      )
    })

    it('pauses on a null message and resumes on the next start', () => {
      const node = makeNode(48000)
      const producer = new SabRope(48000)
      producer.append(ramp(500))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      expect(collect(node, 10)[0]).toBe(0)
      send(node, null) // pause
      expect(Array.from(quantum(node)[0]!)).toEqual(
        Array.from(new Float32Array(128)),
      )
      // Re-start seeks afresh.
      send(node, { type: 'start', timeSec: 100 / 48000 })
      expect(collect(node, 4)[0]).toBe(100)
    })

    it('does not play when started with no ropes', () => {
      const node = makeNode(48000)
      setBuffer(node) // empty list
      send(node, { type: 'start', timeSec: 0 })
      expect(Array.from(quantum(node)[0]!)).toEqual(
        Array.from(new Float32Array(128)),
      )
    })

    it('mirrors mono output to every channel', () => {
      const node = makeNode(48000)
      const producer = new SabRope(48000)
      producer.append(ramp(200))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const [ch0, ch1] = quantum(node, 128, 2)
      expect(Array.from(ch1!)).toEqual(Array.from(ch0!))
      expect(ch0![5]).toBe(5)
    })
  })

  describe('passthrough (rope rate == output rate)', () => {
    it('copies samples bit-exactly (no resampling kernel)', () => {
      const node = makeNode(48000)
      const producer = new SabRope(48000)
      producer.append(ramp(300))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 300)
      for (let i = 0; i < 300; i++) expect(out[i]).toBe(i)
    })

    it('seeks to an exact sample offset', () => {
      const node = makeNode(48000)
      const producer = new SabRope(48000)
      producer.append(ramp(500))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 200 / 48000 })

      const out = collect(node, 20)
      expect(out[0]).toBe(200)
      expect(out[10]).toBe(210)
    })

    it('concatenates ropes seamlessly across a boundary', () => {
      const node = makeNode(48000)
      const a = new SabRope(48000)
      a.append(ramp(200))
      const b = new SabRope(48000)
      b.append(ramp(200, 1000))
      setBuffer(node, a, b)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 400)
      expect(out[0]).toBe(0)
      expect(out[199]).toBe(199)
      expect(out[200]).toBe(1000) // boundary: no gap, no overlap
      expect(out[399]).toBe(1199)
    })

    it('outputs silence past the live tail, then resumes when data is appended', () => {
      const node = makeNode(48000)
      const producer = new SabRope(48000)
      producer.append(ramp(100))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const q1 = quantum(node)[0]!
      expect(q1[0]).toBe(0)
      expect(q1[99]).toBe(99)
      expect(q1[100]).toBe(0) // starved
      expect(q1[127]).toBe(0)

      // Append more (same segment → instantly visible via the shared length).
      producer.append(ramp(50, 100))
      const q2 = quantum(node)[0]!
      expect(q2[0]).toBe(100)
      expect(q2[49]).toBe(149)
      expect(q2[50]).toBe(0)
    })

    it('clamps a seek past the end to the live write head', () => {
      const node = makeNode(48000)
      const producer = new SabRope(48000)
      producer.append(ramp(200))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 10 }) // far past end

      expect(quantum(node)[0]![0]).toBe(0) // silence at head
      producer.append(ramp(30, 200))
      expect(quantum(node)[0]![0]).toBe(200) // plays newly-arrived data
    })

    it('skips an empty leading rope', () => {
      const node = makeNode(48000)
      const empty = new SabRope(48000)
      const b = new SabRope(48000)
      b.append(ramp(100, 7))
      setBuffer(node, empty, b)
      send(node, { type: 'start', timeSec: 0 })
      expect(collect(node, 4)[0]).toBe(7)
    })
  })

  describe('resampling (rope rate != output rate)', () => {
    it('preserves DC through upsampling', () => {
      const node = makeNode(48000)
      const producer = new SabRope(24000)
      producer.append(dc(0.5, 2000))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 600)
      // Past the start-up taper, steady-state DC gain is ~1.
      expect(Math.abs(out[300]! - 0.5)).toBeLessThan(0.02)
      expect(Math.abs(out[500]! - 0.5)).toBeLessThan(0.02)
    })

    it('aligns a primed seek exactly (no fade-in, correct phase)', () => {
      // 2x upsample of a ramp: even output samples land on integer input
      // positions, so they must equal the source sample exactly. If the seek
      // priming / drop count were off by even one sample this fails.
      const node = makeNode(48000)
      const producer = new SabRope(24000)
      producer.append(ramp(2000))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 500 / 24000 })

      const out = collect(node, 32)
      expect(out[0]).toBeCloseTo(500, 3)
      expect(out[2]).toBeCloseTo(501, 3)
      expect(out[6]).toBeCloseTo(503, 3)
    })

    it('anti-aliases on downsampling (rejects content above the output Nyquist)', () => {
      // Output 24 kHz (Nyquist 12 kHz), source 48 kHz.
      const low = makeNode(24000)
      const lowSrc = new SabRope(48000)
      lowSrc.append(sine(6000, 5000, 48000))
      setBuffer(low, lowSrc)
      send(low, { type: 'start', timeSec: 0 })
      const lowOut = collect(low, 700)

      const high = makeNode(24000)
      const highSrc = new SabRope(48000)
      highSrc.append(sine(18000, 5000, 48000)) // above output Nyquist
      setBuffer(high, highSrc)
      send(high, { type: 'start', timeSec: 0 })
      const highOut = collect(high, 700)

      const passband = rms(lowOut, 200, 700)
      const stopband = rms(highOut, 200, 700)
      expect(passband).toBeGreaterThan(0.5) // ~0.707, passes
      expect(stopband).toBeLessThan(0.1) // filtered, not aliased back
    })

    it('does not crash on a non-integer rate ratio', () => {
      const node = makeNode(48000)
      const producer = new SabRope(44100)
      producer.append(dc(0.25, 4000))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })
      const out = collect(node, 600)
      expect(Math.abs(out[400]! - 0.25)).toBeLessThan(0.02)
    })

    it('plays a mixed-rate timeline, advancing into a resampled rope', () => {
      const node = makeNode(48000)
      const a = new SabRope(48000) // passthrough
      a.append(dc(0.3, 300))
      const b = new SabRope(24000) // resampled
      b.append(dc(0.6, 1000))
      setBuffer(node, a, b)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 800)
      expect(out[100]).toBeCloseTo(0.3, 5) // passthrough, exact
      expect(out[250]).toBeCloseTo(0.3, 5)
      expect(Math.abs(out[600]! - 0.6)).toBeLessThan(0.02) // resampled, post-warmup
    })
  })

  describe('growth across a segment boundary', () => {
    it('forwards growLastRope so cross-segment live data becomes playable', () => {
      const SEG = 65536 // SabRope SEG_SAMPLES
      const node = makeNode(48000)

      // Producer holding a single segment; consumer is built from this share.
      const producer = new SabRope(48000)
      setBuffer(node, producer) // share has 1 buffer

      // Fill segment 0 fully, then spill 10 samples into segment 1.
      const all = ramp(SEG + 10)
      producer.append(all.subarray(0, SEG))
      producer.append(all.subarray(SEG, SEG + 10))

      // Seek to just before the segment boundary.
      send(node, { type: 'start', timeSec: (SEG - 6) / 48000 })

      // Before grow: consumer length clamps at the segment it holds, so the
      // 10 spilled samples are invisible.
      const before = quantum(node)[0]!
      expect(before[0]).toBe(SEG - 6)
      expect(before[5]).toBe(SEG - 1)
      expect(before[6]).toBe(0) // stalls at the boundary

      // Producer ships the new segment buffers; consumer holds 1 buffer.
      send(node, { type: 'growLastRope', grow: producer.shareGrowth(1) })

      const after = quantum(node)[0]!
      expect(after[0]).toBe(SEG) // boundary sample now visible
      expect(after[9]).toBe(SEG + 9)
      expect(after[10]).toBe(0)
    })
  })
})
