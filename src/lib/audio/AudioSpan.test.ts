// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'

import { AudioRope } from './AudioRope'
import {
  chunkAudioFromRopes,
  locateChunkRope,
  readAudioSpan,
} from './AudioSpan'

// Only `frames.length`, `timeStepSamples`, `sampleRate`, and `recordingStart`
// matter to the audio-location helpers, so keep the chunks minimal.
function chunk(opts: {
  frames: number
  timeStepSamples?: number
  sampleRate?: number
  recordingStart?: boolean
}): AnalysisChunk {
  return {
    timeStepSamples: opts.timeStepSamples ?? 10,
    sampleRate: opts.sampleRate ?? 100,
    freqStepHz: 0,
    firstBinHz: 0,
    startTimeSec: 0,
    frames: Array.from({ length: opts.frames }),
    voiced: true,
    recordingStart: opts.recordingStart,
  }
}

// A rope filled with a ramp (sample i === toF32(i)), so a returned slice
// reveals the offset it was read from. Values are in [-1, 1) and round-trip
// exactly through the rope's int16 storage (see AudioRope.test.ts).
const PCM_SCALE = 32768
function toF32(intValue: number): number {
  return ((intValue % 65536) - 32768) / PCM_SCALE
}

function rampRope(length: number, sampleRate = 100): AudioRope {
  const rope = new AudioRope(sampleRate)
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) data[i] = toF32(i)
  rope.append(data)
  return rope
}

function makeRope(length: number, sampleRate = 100): AudioRope {
  const rope = new AudioRope(sampleRate)
  if (length > 0) rope.append(new Float32Array(length))
  return rope
}

describe('chunkAudioFromRopes', () => {
  it('spans consecutive chunks from a single (import-style) rope', async () => {
    // No recordingStart markers -- one rope holds the whole timeline.
    const c0 = chunk({ frames: 5 }) // offset 0, length 50
    const c1 = chunk({ frames: 3 }) // offset 50, length 30
    const chunks = [c0, c1]
    const ropes = [rampRope(100)]

    const span0 = chunkAudioFromRopes(c0, chunks, ropes)
    expect(span0).not.toBeNull()
    const pcm0 = await readAudioSpan(span0!)
    expect(pcm0.length).toBe(50)
    expect(pcm0[0]).toBe(toF32(0))
    expect(pcm0[49]).toBe(toF32(49))

    const span1 = chunkAudioFromRopes(c1, chunks, ropes)
    const pcm1 = await readAudioSpan(span1!)
    expect(pcm1.length).toBe(30)
    expect(pcm1[0]).toBe(toF32(50))
    expect(pcm1[29]).toBe(toF32(79))
  })

  it('maps each recording session to its own rope, resetting the offset', async () => {
    // Session 0: a recordingStart chunk plus a like-session sub-chunk.
    const s0a = chunk({ frames: 4, recordingStart: true }) // rope0, offset 0
    const s0b = chunk({ frames: 3 }) // rope0, offset 40
    // Session 1: a fresh recordingStart chunk -> rope1, offset resets to 0.
    const s1 = chunk({ frames: 2, recordingStart: true }) // rope1, offset 0
    const chunks = [s0a, s0b, s1]
    const ropes = [rampRope(70), rampRope(20)]

    const a = await readAudioSpan(chunkAudioFromRopes(s0a, chunks, ropes)!)
    expect(a[0]).toBe(toF32(0))
    expect(a.length).toBe(40)

    const b = await readAudioSpan(chunkAudioFromRopes(s0b, chunks, ropes)!)
    expect(b[0]).toBe(toF32(40))
    expect(b.length).toBe(30)

    const c = await readAudioSpan(chunkAudioFromRopes(s1, chunks, ropes)!)
    expect(c[0]).toBe(toF32(0)) // reads from rope1, not past rope0
    expect(c.length).toBe(20)
  })

  it('returns null until the rope has grown to cover the chunk', () => {
    const c0 = chunk({ frames: 5 }) // wants samples [0, 50)
    const c1 = chunk({ frames: 5 }) // wants samples [50, 100)
    const chunks = [c0, c1]

    // Rope so far only holds the first chunk's worth of audio.
    const rope = new AudioRope(100)
    rope.append(new Float32Array(50))
    const ropes = [rope]

    expect(chunkAudioFromRopes(c0, chunks, ropes)).not.toBeNull()
    expect(chunkAudioFromRopes(c1, chunks, ropes)).toBeNull()

    // Once it grows, the previously-unavailable chunk resolves.
    rope.append(new Float32Array(50))
    expect(chunkAudioFromRopes(c1, chunks, ropes)).not.toBeNull()
  })

  it('clamps to the samples available when a chunk is partially covered', async () => {
    const c0 = chunk({ frames: 5 }) // wants [0, 50)
    const rope = new AudioRope(100)
    rope.append(new Float32Array(30)) // only 30 of the 50 samples are present
    const pcm = await readAudioSpan(chunkAudioFromRopes(c0, [c0], [rope])!)
    expect(pcm.length).toBe(30)
  })

  it('returns null when the chunk is not in the timeline', () => {
    const c0 = chunk({ frames: 5 })
    const stray = chunk({ frames: 5 })
    expect(chunkAudioFromRopes(stray, [c0], [rampRope(100)])).toBeNull()
  })

  it("returns null when the chunk's rope is missing", () => {
    const s0 = chunk({ frames: 4, recordingStart: true })
    const s1 = chunk({ frames: 2, recordingStart: true })
    // Only rope 0 exists; session 1's rope hasn't been shared yet.
    expect(chunkAudioFromRopes(s1, [s0, s1], [rampRope(40)])).toBeNull()
  })
})

describe('locateChunkRope', () => {
  it('locates a chunk in a single rope (import-style, no markers)', () => {
    const c0 = chunk({ frames: 5 })
    const c1 = chunk({ frames: 3 })
    const rope = makeRope(100)
    const result = locateChunkRope(c1, [c0, c1], [rope])
    expect(result).not.toBeNull()
    expect(result!.rope).toBe(rope)
    expect(result!.startSample).toBe(50)
  })

  it('locates the first chunk at offset 0', () => {
    const c0 = chunk({ frames: 5 })
    const rope = makeRope(100)
    const result = locateChunkRope(c0, [c0], [rope])
    expect(result!.startSample).toBe(0)
  })

  it('resets offset at recordingStart boundaries', () => {
    const s0a = chunk({ frames: 4, recordingStart: true })
    const s0b = chunk({ frames: 3 })
    const s1 = chunk({ frames: 2, recordingStart: true })
    const rope0 = makeRope(70)
    const rope1 = makeRope(20)
    const chunks = [s0a, s0b, s1]
    const ropes = [rope0, rope1]

    const r0a = locateChunkRope(s0a, chunks, ropes)
    expect(r0a!.rope).toBe(rope0)
    expect(r0a!.startSample).toBe(0)

    const r0b = locateChunkRope(s0b, chunks, ropes)
    expect(r0b!.rope).toBe(rope0)
    expect(r0b!.startSample).toBe(40)

    const r1 = locateChunkRope(s1, chunks, ropes)
    expect(r1!.rope).toBe(rope1)
    expect(r1!.startSample).toBe(0)
  })

  it('returns null when chunk is not in the array', () => {
    const c0 = chunk({ frames: 5 })
    const stray = chunk({ frames: 5 })
    expect(locateChunkRope(stray, [c0], [makeRope(100)])).toBeNull()
  })

  it('returns null when rope is missing for the session', () => {
    const s0 = chunk({ frames: 4, recordingStart: true })
    const s1 = chunk({ frames: 2, recordingStart: true })
    expect(locateChunkRope(s1, [s0, s1], [makeRope(40)])).toBeNull()
  })

  it('handles empty chunks array', () => {
    const c = chunk({ frames: 5 })
    expect(locateChunkRope(c, [], [makeRope(100)])).toBeNull()
  })

  it('handles empty ropes array', () => {
    const c = chunk({ frames: 5, recordingStart: true })
    expect(locateChunkRope(c, [c], [])).toBeNull()
  })

  it('accumulates offset across multiple non-marker chunks', () => {
    const c0 = chunk({ frames: 2 })
    const c1 = chunk({ frames: 3 })
    const c2 = chunk({ frames: 4 })
    const rope = makeRope(200)
    const result = locateChunkRope(c2, [c0, c1, c2], [rope])
    expect(result!.startSample).toBe(50)
  })
})
