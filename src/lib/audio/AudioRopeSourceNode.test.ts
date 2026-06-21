// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect, vi } from 'vitest'

import { AudioRope } from './AudioRope'
import type { AudioRopeSourceNodeMessage } from './AudioRopeSourceNode'
import { AudioRopeSourceNodeProcessor } from './AudioRopeSourceNode'

vi.hoisted(() => {
  vi.stubGlobal(
    'AudioWorkletProcessor',
    class MockAudioWorkletProcessor {
      process(): boolean {
        throw new Error('unimplemented')
      }
      port: {
        onmessage?: ((event: MessageEvent<any>) => void) | null
        postMessage: (msg: AudioRopeSourceNodeMessage) => void
      } = {
        onmessage: null,
        postMessage: vi.fn(),
      }
    },
  )
  vi.stubGlobal('registerProcessor', vi.fn())
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Construct a node with the worklet's `sampleRate`/`currentTime` globals
 * stubbed. `currentTime` only feeds the end event's playout timestamp, which
 * these tests don't assert on, so a constant is fine. */
function makeNode(outRate: number): AudioRopeSourceNodeProcessor {
  vi.stubGlobal('sampleRate', outRate)
  vi.stubGlobal('currentTime', 0)
  return new AudioRopeSourceNodeProcessor()
}

function send(
  node: AudioRopeSourceNodeProcessor,
  msg: AudioRopeSourceNodeMessage,
): void {
  ;(
    node as unknown as { port: { onmessage: (e: MessageEvent) => void } }
  ).port.onmessage({ data: msg } as MessageEvent)
}

/** Run one render quantum, returning the first output channel. */
function quantum(
  node: AudioRopeSourceNodeProcessor,
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
  node: AudioRopeSourceNodeProcessor,
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

// The rope stores int16 natively; values of the form k/32768 (k in int16
// range) round-trip exactly. See AudioRope.test.ts for the full rationale.
const PCM_SCALE = 32768
function toF32(intValue: number): number {
  return ((intValue % 65536) - 32768) / PCM_SCALE
}

function ramp(n: number, base = 0): Float32Array {
  const a = new Float32Array(n)
  for (let i = 0; i < n; i++) a[i] = toF32(base + i)
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

function setBuffer(
  node: AudioRopeSourceNodeProcessor,
  ...ropes: AudioRope[]
): void {
  send(node, {
    type: 'setBuffer',
    ropes: ropes.map((r) => r.shareRope()),
    gains: ropes.map(() => 1),
  })
}

function setBufferWithGains(
  node: AudioRopeSourceNodeProcessor,
  ropes: AudioRope[],
  gains: number[],
): void {
  send(node, {
    type: 'setBuffer',
    ropes: ropes.map((r) => r.shareRope()),
    gains,
  })
}

/** Messages of a given `type` the worklet has posted back to the main thread. */
function postedOfType(node: AudioRopeSourceNodeProcessor, type: string): any[] {
  const post = (
    node as unknown as { port: { postMessage: ReturnType<typeof vi.fn> } }
  ).port.postMessage
  return post.mock.calls
    .map(([msg]) => msg)
    .filter((m) => (m as { type?: string } | null)?.type === type)
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
      setBuffer(node, new AudioRope(48000))
      const producer = new AudioRope(48000)
      producer.append(ramp(64))
      setBuffer(node, producer)
      // No start yet.
      expect(Array.from(quantum(node)[0]!)).toEqual(
        Array.from(new Float32Array(128)),
      )
    })

    it('pauses on a null message and resumes on the next start', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(500))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      expect(collect(node, 10)[0]).toBe(toF32(0))
      send(node, null) // pause
      expect(Array.from(quantum(node)[0]!)).toEqual(
        Array.from(new Float32Array(128)),
      )
      // Re-start seeks afresh.
      send(node, { type: 'start', timeSec: 100 / 48000 })
      expect(collect(node, 4)[0]).toBe(toF32(100))
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
      const producer = new AudioRope(48000)
      producer.append(ramp(200))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const [ch0, ch1] = quantum(node, 128, 2)
      expect(Array.from(ch1!)).toEqual(Array.from(ch0!))
      expect(ch0![5]).toBe(toF32(5))
    })
  })

  describe('passthrough (rope rate == output rate)', () => {
    it('copies samples bit-exactly (no resampling kernel)', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(300))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 300)
      for (let i = 0; i < 300; i++) expect(out[i]).toBe(toF32(i))
    })

    it('seeks to an exact sample offset', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(500))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 200 / 48000 })

      const out = collect(node, 20)
      expect(out[0]).toBe(toF32(200))
      expect(out[10]).toBe(toF32(210))
    })

    it('concatenates ropes seamlessly across a boundary', () => {
      const node = makeNode(48000)
      const a = new AudioRope(48000)
      a.append(ramp(200))
      const b = new AudioRope(48000)
      b.append(ramp(200, 1000))
      setBuffer(node, a, b)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 400)
      expect(out[0]).toBe(toF32(0))
      expect(out[199]).toBe(toF32(199))
      expect(out[200]).toBe(toF32(1000)) // boundary: no gap, no overlap
      expect(out[399]).toBe(toF32(1199))
    })

    it('outputs silence past the live tail, then resumes when data is appended', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(100))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const q1 = quantum(node)[0]!
      expect(q1[0]).toBe(toF32(0))
      expect(q1[99]).toBe(toF32(99))
      expect(q1[100]).toBe(0) // starved
      expect(q1[127]).toBe(0)

      // Append more (same segment -> instantly visible via the shared length).
      producer.append(ramp(50, 100))
      const q2 = quantum(node)[0]!
      expect(q2[0]).toBe(toF32(100))
      expect(q2[49]).toBe(toF32(149))
      expect(q2[50]).toBe(0)
    })

    it('clamps a seek past the end to the live write head', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(200))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 10 }) // far past end

      expect(quantum(node)[0]![0]).toBe(0) // silence at head
      producer.append(ramp(30, 200))
      expect(quantum(node)[0]![0]).toBe(toF32(200)) // plays newly-arrived data
    })

    it('skips an empty leading rope', () => {
      const node = makeNode(48000)
      const empty = new AudioRope(48000)
      const b = new AudioRope(48000)
      b.append(ramp(100, 7))
      setBuffer(node, empty, b)
      send(node, { type: 'start', timeSec: 0 })
      expect(collect(node, 4)[0]).toBe(toF32(7))
    })
  })

  describe('per-rope loudness gain', () => {
    it('scales passthrough output by the rope gain', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(300))
      setBufferWithGains(node, [producer], [0.5])
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 300)
      for (let i = 0; i < 300; i++) expect(out[i]).toBe(toF32(i) * 0.5)
    })

    it('applies each rope its own gain across a boundary', () => {
      const node = makeNode(48000)
      const a = new AudioRope(48000)
      a.append(ramp(200, 100))
      const b = new AudioRope(48000)
      b.append(ramp(200, 1000))
      setBufferWithGains(node, [a, b], [0.5, 2])
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 400)
      expect(out[0]).toBe(toF32(100) * 0.5)
      expect(out[199]).toBe(toF32(299) * 0.5)
      expect(out[200]).toBe(toF32(1000) * 2)
      expect(out[399]).toBe(toF32(1199) * 2)
    })
  })

  describe('resampling (rope rate != output rate)', () => {
    it('preserves DC through upsampling', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(24000)
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
      const producer = new AudioRope(24000)
      producer.append(ramp(2000))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 500 / 24000 })

      const out = collect(node, 32)
      expect(out[0]).toBeCloseTo(toF32(500), 3)
      expect(out[2]).toBeCloseTo(toF32(501), 3)
      expect(out[6]).toBeCloseTo(toF32(503), 3)
    })

    it('anti-aliases on downsampling (rejects content above the output Nyquist)', () => {
      // Output 24 kHz (Nyquist 12 kHz), source 48 kHz.
      const low = makeNode(24000)
      const lowSrc = new AudioRope(48000)
      lowSrc.append(sine(6000, 5000, 48000))
      setBuffer(low, lowSrc)
      send(low, { type: 'start', timeSec: 0 })
      const lowOut = collect(low, 700)

      const high = makeNode(24000)
      const highSrc = new AudioRope(48000)
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
      const producer = new AudioRope(44100)
      producer.append(dc(0.25, 4000))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })
      const out = collect(node, 600)
      expect(Math.abs(out[400]! - 0.25)).toBeLessThan(0.02)
    })

    it('plays a mixed-rate timeline, advancing into a resampled rope', () => {
      const node = makeNode(48000)
      const a = new AudioRope(48000) // passthrough
      a.append(dc(0.3, 300))
      const b = new AudioRope(24000) // resampled
      b.append(dc(0.6, 1000))
      setBuffer(node, a, b)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 800)
      expect(out[100]).toBeCloseTo(0.3, 4) // passthrough, int16-quantized
      expect(out[250]).toBeCloseTo(0.3, 4)
      expect(Math.abs(out[600]! - 0.6)).toBeLessThan(0.02) // resampled, post-warmup
    })
  })

  describe('growth across a segment boundary', () => {
    it('forwards growLastRope so cross-segment live data becomes playable', () => {
      const SEG = 65536 // AudioRope SEG_SAMPLES
      const node = makeNode(48000)

      // Producer holding a single segment; consumer is built from this share.
      const producer = new AudioRope(48000)
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
      expect(before[0]).toBe(toF32(SEG - 6))
      expect(before[5]).toBe(toF32(SEG - 1))
      expect(before[6]).toBe(0) // stalls at the boundary

      // Producer ships the new segment buffers; consumer holds 1 buffer.
      send(node, { type: 'growLastRope', grow: producer.shareGrowth(1)! })

      const after = quantum(node)[0]!
      expect(after[0]).toBe(toF32(SEG)) // boundary sample now visible
      expect(after[9]).toBe(toF32(SEG + 9))
      expect(after[10]).toBe(0)
    })
  })

  describe('scheduled end', () => {
    it('stops playback once the cursor reaches the scheduled end', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(500))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })
      send(node, { type: 'end', timeSec: 200 / 48000 })

      // 100-frame quanta land a block boundary exactly on frame 200.
      const out = collect(node, 400, 100)
      for (let i = 0; i < 200; i++) expect(out[i]).toBe(toF32(i))
      for (let i = 200; i < 400; i++) expect(out[i]).toBe(0) // silent past end
    })

    it('stops on a later rope at the scheduled end', () => {
      const node = makeNode(48000)
      const a = new AudioRope(48000)
      a.append(ramp(200))
      const b = new AudioRope(48000)
      b.append(ramp(200, 1000))
      setBuffer(node, a, b)
      send(node, { type: 'start', timeSec: 0 })
      // 250 samples in = 50 frames into rope b.
      send(node, { type: 'end', timeSec: 250 / 48000 })

      const out = collect(node, 400, 50)
      expect(out[0]).toBe(toF32(0))
      expect(out[199]).toBe(toF32(199)) // tail of rope a
      expect(out[200]).toBe(toF32(1000)) // head of rope b
      expect(out[249]).toBe(toF32(1049)) // last frame before the end (frame 50, exclusive)
      expect(out[250]).toBe(0) // stopped
      expect(out[399]).toBe(0)
    })

    it('plays to the natural end when the end time is past the timeline', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(100))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })
      send(node, { type: 'end', timeSec: 10 }) // far past the 100-sample timeline

      const out = collect(node, 200, 100)
      for (let i = 0; i < 100; i++) expect(out[i]).toBe(toF32(i))
      for (let i = 100; i < 200; i++) expect(out[i]).toBe(0)
    })

    it('also stops on a resampled rope', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(24000) // 2x upsample
      producer.append(ramp(2000, 1)) // values 1..2000 (all non-zero)
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })
      // End ~halfway through the source -> ~2000 output samples.
      send(node, { type: 'end', timeSec: 1000 / 24000 })

      const out = collect(node, 3000, 128)
      // out[j] = ~source[j / 2] = toF32(j / 2 + 1) in steady state.
      expect(Math.abs(out[1000]! - toF32(501))).toBeLessThan(1)
      // Stopped well before the rope's natural end (4000 output samples).
      expect(out[2900]).toBe(0)
      expect(out[2999]).toBe(0)
    })

    it('cuts at the render-quantum boundary, overshooting the exact end frame', () => {
      // The end is checked once per quantum, after the whole block is filled,
      // so playback runs to the end of the block containing the end frame
      // rather than stopping exactly on it. Documents current granularity.
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(500))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })
      send(node, { type: 'end', timeSec: 100 / 48000 })

      const [ch] = quantum(node, 128)
      // Exact-cut would zero everything from frame 100; instead the block runs on.
      expect(ch![100]).toBe(toF32(100))
      expect(ch![127]).toBe(toF32(127))
      // The next quantum is silent (it stopped at the block boundary).
      expect(Array.from(quantum(node, 128)[0]!)).toEqual(
        Array.from(new Float32Array(128)),
      )
    })

    it('does not clip a resampled rope short of the scheduled end', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(24000) // 2x upsample
      producer.append(ramp(2000, 1)) // values 1..2000 (all non-zero)
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })
      send(node, { type: 'end', timeSec: 1000 / 24000 })

      const out = collect(node, 3000, 128)
      // out[j] = ~source[j / 2]; frame 950 sits safely before the end.
      expect(Math.abs(out[1900]! - toF32(950))).toBeLessThan(5)
    })

    it('clears a stale end when a new buffer is set', () => {
      const node = makeNode(48000)
      const first = new AudioRope(48000)
      first.append(ramp(500))
      setBuffer(node, first)
      send(node, { type: 'end', timeSec: 50 / 48000 }) // arm end at frame 50

      // A new recording replaces the buffer; the old end should not apply.
      const second = new AudioRope(48000)
      second.append(ramp(500, 1000))
      setBuffer(node, second)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 300, 100)
      expect(out[200]).toBe(toF32(1200)) // desired: plays past the stale end frame
    })
  })

  describe('sealed end', () => {
    const endEvents = (node: AudioRopeSourceNodeProcessor) =>
      postedOfType(node, 'end')

    it('emits end when the final rope is sealed and runs out', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.seal(ramp(200))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 400, 100)
      for (let i = 0; i < 200; i++) expect(out[i]).toBe(toF32(i))
      for (let i = 200; i < 400; i++) expect(out[i]).toBe(0) // silent past the end
      expect(endEvents(node)).toHaveLength(1)
    })

    it('stalls (no end) at the end of a still-growing final rope', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(200)) // not sealed: more may come
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 400, 100)
      for (let i = 0; i < 200; i++) expect(out[i]).toBe(toF32(i))
      for (let i = 200; i < 400; i++) expect(out[i]).toBe(0) // silent, but only waiting
      expect(endEvents(node)).toHaveLength(0)
    })

    it('ends only on the final rope, not at a join into a sealed later rope', () => {
      const node = makeNode(48000)
      const a = new AudioRope(48000)
      a.seal(ramp(200))
      const b = new AudioRope(48000)
      b.seal(ramp(200, 1000))
      setBuffer(node, a, b)
      send(node, { type: 'start', timeSec: 0 })

      const out = collect(node, 500, 100)
      expect(out[199]).toBe(toF32(199)) // tail of rope a
      expect(out[200]).toBe(toF32(1000)) // head of rope b -- played through the join
      expect(out[399]).toBe(toF32(1199)) // tail of rope b
      expect(out[400]).toBe(0) // silent past the end
      expect(endEvents(node)).toHaveLength(1)
    })

    it('emits end after a sealed resampled rope drains', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(24000) // 2x upsample
      producer.seal(ramp(200, 1)) // values 1..200
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      // ~400 output samples; pull well past that so the source fully drains.
      const out = collect(node, 700, 128)
      expect(out[699]).toBe(0) // silent past the end
      expect(endEvents(node)).toHaveLength(1)
    })
  })

  describe('start anchor', () => {
    const startedEvents = (node: AudioRopeSourceNodeProcessor) =>
      postedOfType(node, 'started')

    it('anchors the clock at the first kept sample (passthrough)', () => {
      const node = makeNode(48000)
      vi.stubGlobal('currentTime', 10) // quantum-start context time
      const producer = new AudioRope(48000)
      producer.append(ramp(200))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      quantum(node, 128)
      const started = startedEvents(node)
      expect(started).toHaveLength(1)
      // First sample written at offset 0, so it plays out at currentTime.
      expect(started[0].contextTime).toBe(10)
    })

    it('anchors only once across the whole playback', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(500))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      collect(node, 400, 100)
      expect(startedEvents(node)).toHaveLength(1)
    })

    it('does not anchor until the resampler warm-up is discarded', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(24000) // 2x upsample -> primed with warm-up
      producer.append(ramp(2000, 1))
      setBuffer(node, producer)
      send(node, { type: 'start', timeSec: 0 })

      collect(node, 1000, 128)
      // Still exactly one anchor, fired once a real (post-warm-up) sample landed.
      expect(startedEvents(node)).toHaveLength(1)
    })

    it('re-anchors on a fresh start after a pause', () => {
      const node = makeNode(48000)
      const producer = new AudioRope(48000)
      producer.append(ramp(500))
      setBuffer(node, producer)

      send(node, { type: 'start', timeSec: 0 })
      collect(node, 100, 100)
      expect(startedEvents(node)).toHaveLength(1)

      send(node, null) // pause
      send(node, { type: 'start', timeSec: 200 / 48000 }) // seek + restart
      collect(node, 100, 100)
      expect(startedEvents(node)).toHaveLength(2)
    })
  })
})
