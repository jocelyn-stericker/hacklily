// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { AudioRope } from './AudioRope'
import type { RopeWriterMessage } from './RopeWriterNode'
import { RopeWriterProcessor } from './RopeWriterNode'

vi.hoisted(() => {
  vi.stubGlobal(
    'AudioWorkletProcessor',
    class MockAudioWorkletProcessor {
      process(_inputs: Float32Array[][], _outputs: Float32Array[][]): boolean {
        throw new Error('unimplemented')
      }
      port: {
        onmessage?: ((event: MessageEvent<any>) => void) | null
        postMessage: ReturnType<typeof vi.fn>
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

function makeProcessor(): RopeWriterProcessor {
  return new RopeWriterProcessor()
}

function send(proc: RopeWriterProcessor, msg: RopeWriterMessage | null): void {
  ;(
    proc as unknown as { port: { onmessage: (e: MessageEvent) => void } }
  ).port.onmessage({ data: msg } as MessageEvent)
}

/** Run one render quantum with the given mono input; returns process()'s result. */
function quantum(proc: RopeWriterProcessor, samples: Float32Array): boolean {
  return proc.process([[samples]], [])
}

function postedOfType(proc: RopeWriterProcessor, type: string): any[] {
  const post = (
    proc as unknown as { port: { postMessage: ReturnType<typeof vi.fn> } }
  ).port.postMessage
  return post.mock.calls
    .map(([msg]) => msg)
    .filter((m) => (m as { type?: string } | null)?.type === type)
}

function lastMessageOfType(proc: RopeWriterProcessor, type: string): any {
  return postedOfType(proc, type).at(-1)
}

/** The most recent rope-ready share, as a fresh consumer AudioRope. */
function readyRope(proc: RopeWriterProcessor): AudioRope {
  const msg = lastMessageOfType(proc, 'rope-ready')
  if (!msg) throw new Error('no rope-ready posted')
  return new AudioRope(msg.rope)
}

// ---------------------------------------------------------------------------

describe('RopeWriterProcessor', () => {
  let proc: RopeWriterProcessor

  beforeEach(() => {
    proc = makeProcessor()
  })

  describe('lifecycle & message protocol', () => {
    it('posts rope-ready on init with the requested sample rate', () => {
      send(proc, { type: 'init', sampleRate: 48000 })

      const ready = lastMessageOfType(proc, 'rope-ready')
      expect(ready).toBeDefined()
      expect(ready.sampleRate).toBe(48000)
      expect(ready.rope.type).toBe('audio-rope')
      expect(ready.rope.buffers.length).toBeGreaterThan(0)
      expect(ready.rope.ctrlPtr).toBeInstanceOf(SharedArrayBuffer)
    })

    it('process() is a no-op and returns true before init', () => {
      expect(quantum(proc, new Float32Array([0.5, 0.5]))).toBe(true)
      expect(postedOfType(proc, 'rope-ready')).toHaveLength(0)
      expect(postedOfType(proc, 'audio-rope-grow')).toHaveLength(0)
    })

    it('seal before init posts nothing', () => {
      send(proc, { type: 'seal' })
      expect(postedOfType(proc, 'audio-rope-seal')).toHaveLength(0)
      expect(postedOfType(proc, 'ended')).toHaveLength(0)
    })

    it('seal posts audio-rope-seal then ended', () => {
      send(proc, { type: 'init', sampleRate: 44100 })
      send(proc, { type: 'seal' })

      const types = (
        proc as unknown as { port: { postMessage: ReturnType<typeof vi.fn> } }
      ).port.postMessage.mock.calls.map(([m]) => (m as { type: string }).type)
      const sealIdx = types.indexOf('audio-rope-seal')
      const endedIdx = types.indexOf('ended')
      expect(sealIdx).toBeGreaterThanOrEqual(0)
      expect(endedIdx).toBeGreaterThan(sealIdx)
    })
  })

  describe('capture & activation', () => {
    it('appends a non-zero quantum to the rope', () => {
      send(proc, { type: 'init', sampleRate: 48000 })
      const rope = readyRope(proc)

      quantum(proc, new Float32Array([0.1, 0.2, 0.3, 0.4]))

      expect(rope.rawLength).toBe(4)
      const out = new Float32Array(4)
      rope.read(out, 0, 0, 4)
      // int16 quantization: ~1/32768 error per sample, so 4 decimal places.
      expect(out[0]).toBeCloseTo(0.1, 4)
      expect(out[1]).toBeCloseTo(0.2, 4)
      expect(out[2]).toBeCloseTo(0.3, 4)
      expect(out[3]).toBeCloseTo(0.4, 4)
    })

    it('skips leading all-zero quanta until the first non-zero sample', () => {
      send(proc, { type: 'init', sampleRate: 48000 })
      const rope = readyRope(proc)

      // Three silent quanta: not appended.
      quantum(proc, new Float32Array(128))
      quantum(proc, new Float32Array(128))
      quantum(proc, new Float32Array(128))
      expect(rope.rawLength).toBe(0)

      // A quantum starting with 0.0 but containing non-zero audio activates
      // and is appended in full (regression: must not skip on a falsy 0.0).
      const first = new Float32Array(128)
      first[5] = 0.5
      quantum(proc, first)
      expect(rope.rawLength).toBe(128)
      expect(rope.sealed).toBe(false)
    })

    it('appends silence once activated', () => {
      send(proc, { type: 'init', sampleRate: 48000 })
      const rope = readyRope(proc)

      quantum(proc, new Float32Array([0.5]))
      expect(rope.rawLength).toBe(1)

      // A full-silence quantum now lands in the rope.
      quantum(proc, new Float32Array(128))
      expect(rope.rawLength).toBe(129)
    })

    it('ignores empty / missing input channels', () => {
      send(proc, { type: 'init', sampleRate: 48000 })
      const rope = readyRope(proc)

      expect(proc.process([], [])).toBe(true)
      expect(proc.process([[]], [])).toBe(true)
      expect(proc.process([[], []], [])).toBe(true)
      expect(rope.rawLength).toBe(0)
    })
  })

  describe('growth across a segment boundary', () => {
    it('posts audio-rope-grow when a new segment buffer is added', () => {
      const SEG = 65536 // AudioRope.SEG_SAMPLES
      send(proc, { type: 'init', sampleRate: 48000 })
      const rope = readyRope(proc)

      // Fill segment 0 completely, then spill one sample into segment 1.
      quantum(proc, new Float32Array(SEG).fill(0.25))
      quantum(proc, new Float32Array(1).fill(0.25))

      const grows = postedOfType(proc, 'audio-rope-grow')
      expect(grows.length).toBeGreaterThan(0)
      for (const g of grows) {
        expect(g.type).toBe('audio-rope-grow')
        expect(g.buffers.length).toBeGreaterThan(0)
        for (const b of g.buffers) expect(b).toBeInstanceOf(SharedArrayBuffer)
      }

      // Applying every grow in order lets the consumer read the spilled sample.
      for (const g of grows) rope.grow(g)
      expect(rope.rawLength).toBe(SEG + 1)
      const tail = new Float32Array(1)
      rope.read(tail, SEG, 0, 1)
      expect(tail[0]).toBeCloseTo(0.25)
    })
  })

  describe('sealing & reuse', () => {
    it('process() is a no-op after seal (and still returns true)', () => {
      send(proc, { type: 'init', sampleRate: 48000 })
      const rope = readyRope(proc)

      quantum(proc, new Float32Array([0.5]))
      expect(rope.rawLength).toBe(1)

      send(proc, { type: 'seal' })
      expect(rope.sealed).toBe(true)

      // Further audio is dropped; the node stays alive for reuse.
      expect(quantum(proc, new Float32Array([0.9]))).toBe(true)
      expect(rope.rawLength).toBe(1)
    })

    it('a second seal is a no-op', () => {
      send(proc, { type: 'init', sampleRate: 48000 })
      send(proc, { type: 'seal' })
      const endedBefore = postedOfType(proc, 'ended').length
      send(proc, { type: 'seal' })
      expect(postedOfType(proc, 'ended').length).toBe(endedBefore)
    })

    it('re-init resets state and starts a fresh rope', () => {
      send(proc, { type: 'init', sampleRate: 48000 })
      const first = readyRope(proc)
      quantum(proc, new Float32Array([0.5]))
      send(proc, { type: 'seal' })
      expect(first.sealed).toBe(true)

      // A new recording: fresh rope, activation reset, not sealed.
      send(proc, { type: 'init', sampleRate: 48000 })
      expect(postedOfType(proc, 'rope-ready').length).toBe(2)
      const second = readyRope(proc)
      expect(second.sealed).toBe(false)
      expect(second.rawLength).toBe(0)
      expect(second).not.toBe(first)

      // Leading silence is skipped again for the new recording.
      quantum(proc, new Float32Array(128))
      expect(second.rawLength).toBe(0)
      quantum(proc, new Float32Array([0.5]))
      expect(second.rawLength).toBe(1)
    })
  })

  describe('error handling', () => {
    it('posts a single error message on a malformed message and stops', () => {
      send(proc, null as unknown as RopeWriterMessage)
      const errs = postedOfType(proc, 'error')
      expect(errs).toHaveLength(1)
      expect(typeof errs[0].error).toBe('string')

      // A second malformed message does not post another error.
      send(proc, null as unknown as RopeWriterMessage)
      expect(postedOfType(proc, 'error')).toHaveLength(1)
    })

    it('posts error and drops subsequent audio when append throws', () => {
      send(proc, { type: 'init', sampleRate: 48000 })
      const rope = readyRope(proc)
      const appendSpy = vi
        .spyOn(AudioRope.prototype, 'append')
        .mockImplementation(() => {
          throw new Error('boom')
        })

      quantum(proc, new Float32Array([0.5]))
      const errs = postedOfType(proc, 'error')
      expect(errs).toHaveLength(1)
      expect(errs[0].error).toBe('boom')

      // The processor is now errored: further audio is dropped silently.
      quantum(proc, new Float32Array([0.5]))
      expect(postedOfType(proc, 'error')).toHaveLength(1)
      expect(rope.rawLength).toBe(0)

      appendSpy.mockRestore()
    })
  })
})
