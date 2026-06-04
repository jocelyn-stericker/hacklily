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

import type { AnalysisChunk } from './AnalysisFrame'
import { SabRope } from './SabRope'
import type { SettingsRow } from './settings'
import {
  chunkAudioFromRopes,
  computeSealResolutions,
  locateChunkRope,
  readAudioSpan,
  reconcileLiveSpans,
  transcribeChunks,
} from './transcription'
import type { ChunkAudioProvider, LiveSpanEntry } from './transcription'

vi.mock('./transcribeBundled', () => ({
  transcribeWithWorker: vi.fn(
    async (audio: { endTime: Promise<number>; signal: AbortSignal }) => {
      audio.signal.throwIfAborted()

      // Reproduce the fixed readAudioSpan: race endTime against the abort
      // signal so an abort mid-wait unblocks the chunksChain.
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          cleanup()
          reject(audio.signal.reason)
        }
        const cleanup = () => {
          audio.signal.removeEventListener('abort', onAbort)
        }
        audio.signal.addEventListener('abort', onAbort)
        if (audio.signal.aborted) {
          cleanup()
          reject(audio.signal.reason)
          return
        }
        audio.endTime.then(
          () => {
            cleanup()
            resolve()
          },
          (err) => {
            cleanup()
            reject(err)
          },
        )
      })

      audio.signal.throwIfAborted()
      return 'transcribed text'
    },
  ),
}))

vi.mock('./transcribeWeb', () => ({
  transcribeWeb: vi.fn().mockRejectedValue(new Error('not used')),
}))

// transcription.ts imports modelDownload (which pulls in a web-worker module);
// stub it so the worker model always reads as downloaded and no worker loads.
vi.mock('./modelDownload', () => ({
  isModelDownloaded: vi.fn().mockReturnValue(true),
  clearModelDownloaded: vi.fn(),
}))

// Only `frames.length`, `timeStepSamples`, `sampleRate`, and `recordingStart`
// matter to chunkPcmFromRopes, so keep the chunks minimal.
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

// A rope filled with a ramp (sample i === i), so a returned slice reveals the
// offset it was read from.
function rampRope(length: number, sampleRate = 100): SabRope {
  const rope = new SabRope(sampleRate)
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) data[i] = i
  rope.append(data)
  return rope
}

describe('chunkAudioFromRopes', () => {
  it('spans consecutive chunks from a single (import-style) rope', async () => {
    // No recordingStart markers — one rope holds the whole timeline.
    const c0 = chunk({ frames: 5 }) // offset 0, length 50
    const c1 = chunk({ frames: 3 }) // offset 50, length 30
    const chunks = [c0, c1]
    const ropes = [rampRope(100)]

    const span0 = chunkAudioFromRopes(c0, chunks, ropes)
    expect(span0).not.toBeNull()
    const pcm0 = await readAudioSpan(span0!)
    expect(pcm0.length).toBe(50)
    expect(pcm0[0]).toBe(0)
    expect(pcm0[49]).toBe(49)

    const span1 = chunkAudioFromRopes(c1, chunks, ropes)
    const pcm1 = await readAudioSpan(span1!)
    expect(pcm1.length).toBe(30)
    expect(pcm1[0]).toBe(50)
    expect(pcm1[29]).toBe(79)
  })

  it('maps each recording session to its own rope, resetting the offset', async () => {
    // Session 0: a recordingStart chunk plus a like-session sub-chunk.
    const s0a = chunk({ frames: 4, recordingStart: true }) // rope0, offset 0
    const s0b = chunk({ frames: 3 }) // rope0, offset 40
    // Session 1: a fresh recordingStart chunk → rope1, offset resets to 0.
    const s1 = chunk({ frames: 2, recordingStart: true }) // rope1, offset 0
    const chunks = [s0a, s0b, s1]
    const ropes = [rampRope(70), rampRope(20)]

    const a = await readAudioSpan(chunkAudioFromRopes(s0a, chunks, ropes)!)
    expect(a[0]).toBe(0)
    expect(a.length).toBe(40)

    const b = await readAudioSpan(chunkAudioFromRopes(s0b, chunks, ropes)!)
    expect(b[0]).toBe(40)
    expect(b.length).toBe(30)

    const c = await readAudioSpan(chunkAudioFromRopes(s1, chunks, ropes)!)
    expect(c[0]).toBe(0) // reads from rope1, not past rope0
    expect(c.length).toBe(20)
  })

  it('returns null until the rope has grown to cover the chunk', () => {
    const c0 = chunk({ frames: 5 }) // wants samples [0, 50)
    const c1 = chunk({ frames: 5 }) // wants samples [50, 100)
    const chunks = [c0, c1]

    // Rope so far only holds the first chunk's worth of audio.
    const rope = new SabRope(100)
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
    const rope = new SabRope(100)
    rope.append(new Float32Array(30)) // only 30 of the 50 samples are present
    const pcm = await readAudioSpan(chunkAudioFromRopes(c0, [c0], [rope])!)
    expect(pcm.length).toBe(30)
  })

  it('returns null when the chunk is not in the timeline', () => {
    const c0 = chunk({ frames: 5 })
    const stray = chunk({ frames: 5 })
    expect(chunkAudioFromRopes(stray, [c0], [rampRope(100)])).toBeNull()
  })

  it('returns null when the chunk’s rope is missing', () => {
    const s0 = chunk({ frames: 4, recordingStart: true })
    const s1 = chunk({ frames: 2, recordingStart: true })
    // Only rope 0 exists; session 1's rope hasn't been shared yet.
    expect(chunkAudioFromRopes(s1, [s0, s1], [rampRope(40)])).toBeNull()
  })
})

function makeChunk(opts: {
  frames: number
  timeStepSamples?: number
  sampleRate?: number
  voiced?: boolean
  recordingStart?: boolean
  transcription?: { status: 'pending' } | { status: 'done'; text: string }
}): AnalysisChunk {
  return {
    timeStepSamples: opts.timeStepSamples ?? 10,
    sampleRate: opts.sampleRate ?? 100,
    freqStepHz: 0,
    firstBinHz: 0,
    startTimeSec: 0,
    frames: Array.from({ length: opts.frames }),
    voiced: opts.voiced ?? false,
    recordingStart: opts.recordingStart,
    transcription: opts.transcription,
  }
}

function makeRope(length: number, sampleRate = 100): SabRope {
  const rope = new SabRope(sampleRate)
  if (length > 0) rope.append(new Float32Array(length))
  return rope
}

function makeSpan(): LiveSpanEntry {
  let resolveEndTime!: (endTime: number) => void
  const endTimePromise = new Promise<number>((resolve) => {
    resolveEndTime = resolve
  })
  return {
    abortController: new AbortController(),
    endTimePromise,
    resolveEndTime,
  }
}

describe('locateChunkRope', () => {
  it('locates a chunk in a single rope (import-style, no markers)', () => {
    const c0 = makeChunk({ frames: 5 })
    const c1 = makeChunk({ frames: 3 })
    const rope = makeRope(100)
    const result = locateChunkRope(c1, [c0, c1], [rope])
    expect(result).not.toBeNull()
    expect(result!.rope).toBe(rope)
    expect(result!.startSample).toBe(50)
  })

  it('locates the first chunk at offset 0', () => {
    const c0 = makeChunk({ frames: 5 })
    const rope = makeRope(100)
    const result = locateChunkRope(c0, [c0], [rope])
    expect(result!.startSample).toBe(0)
  })

  it('resets offset at recordingStart boundaries', () => {
    const s0a = makeChunk({ frames: 4, recordingStart: true })
    const s0b = makeChunk({ frames: 3 })
    const s1 = makeChunk({ frames: 2, recordingStart: true })
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
    const c0 = makeChunk({ frames: 5 })
    const stray = makeChunk({ frames: 5 })
    expect(locateChunkRope(stray, [c0], [makeRope(100)])).toBeNull()
  })

  it('returns null when rope is missing for the session', () => {
    const s0 = makeChunk({ frames: 4, recordingStart: true })
    const s1 = makeChunk({ frames: 2, recordingStart: true })
    expect(locateChunkRope(s1, [s0, s1], [makeRope(40)])).toBeNull()
  })

  it('handles empty chunks array', () => {
    const c = makeChunk({ frames: 5 })
    expect(locateChunkRope(c, [], [makeRope(100)])).toBeNull()
  })

  it('handles empty ropes array', () => {
    const c = makeChunk({ frames: 5, recordingStart: true })
    expect(locateChunkRope(c, [c], [])).toBeNull()
  })

  it('accumulates offset across multiple non-marker chunks', () => {
    const c0 = makeChunk({ frames: 2 })
    const c1 = makeChunk({ frames: 3 })
    const c2 = makeChunk({ frames: 4 })
    const rope = makeRope(200)
    const result = locateChunkRope(c2, [c0, c1, c2], [rope])
    expect(result!.startSample).toBe(50)
  })
})

describe('reconcileLiveSpans', () => {
  describe('create', () => {
    it('creates spans for voiced chunks without transcription', () => {
      const rope = makeRope(1000)
      const voiced = makeChunk({ frames: 5, voiced: true })
      const unvoiced = makeChunk({ frames: 3, voiced: false })
      const result = reconcileLiveSpans([voiced, unvoiced], new Map(), [rope])
      expect(result.create).toEqual([voiced])
      expect(result.abort.size).toBe(0)
      expect(result.resolve).toHaveLength(0)
    })

    it('skips chunks that already have a transcription', () => {
      const rope = makeRope(1000)
      const done = makeChunk({
        frames: 5,
        voiced: true,
        transcription: { status: 'done', text: 'hello' },
      })
      const result = reconcileLiveSpans([done], new Map(), [rope])
      expect(result.create).toHaveLength(0)
    })

    it('skips chunks that already have a pending transcription', () => {
      const rope = makeRope(1000)
      const pending = makeChunk({
        frames: 5,
        voiced: true,
        transcription: { status: 'pending' },
      })
      const result = reconcileLiveSpans([pending], new Map(), [rope])
      expect(result.create).toHaveLength(0)
    })

    it('skips chunks that already have a live span', () => {
      const rope = makeRope(1000)
      const voiced = makeChunk({ frames: 5, voiced: true })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(voiced, makeSpan())
      const result = reconcileLiveSpans([voiced], liveSpans, [rope])
      expect(result.create).toHaveLength(0)
    })

    it('does not create spans when rope is sealed', () => {
      const rope = makeRope(1000)
      rope.seal()
      const voiced = makeChunk({ frames: 5, voiced: true })
      const result = reconcileLiveSpans([voiced], new Map(), [rope])
      expect(result.create).toHaveLength(0)
    })

    it('does not create spans when ropes is empty', () => {
      const voiced = makeChunk({ frames: 5, voiced: true })
      const result = reconcileLiveSpans([voiced], new Map(), [])
      expect(result.create).toHaveLength(0)
    })

    it('creates spans for multiple voiced chunks', () => {
      const rope = makeRope(1000)
      const v1 = makeChunk({ frames: 5, voiced: true })
      const u = makeChunk({ frames: 3, voiced: false })
      const v2 = makeChunk({ frames: 4, voiced: true })
      const result = reconcileLiveSpans([v1, u, v2], new Map(), [rope])
      expect(result.create).toEqual([v1, v2])
    })
  })

  describe('abort', () => {
    it('aborts spans for chunks that became unvoiced', () => {
      const rope = makeRope(1000)
      const c = makeChunk({ frames: 5, voiced: false })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      const span = makeSpan()
      liveSpans.set(c, span)
      const result = reconcileLiveSpans([c], liveSpans, [rope])
      expect(result.abort.has(c)).toBe(true)
    })

    it('aborts spans for chunks removed from the array', () => {
      const rope = makeRope(1000)
      const orphan = makeChunk({ frames: 5, voiced: true })
      const remaining = makeChunk({ frames: 3, voiced: true })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(orphan, makeSpan())
      const result = reconcileLiveSpans([remaining], liveSpans, [rope])
      expect(result.abort.has(orphan)).toBe(true)
    })

    it('does not abort spans for chunks still voiced and in array', () => {
      const rope = makeRope(1000)
      const voiced = makeChunk({ frames: 5, voiced: true })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(voiced, makeSpan())
      const result = reconcileLiveSpans([voiced], liveSpans, [rope])
      expect(result.abort.size).toBe(0)
    })

    it('aborts multiple orphaned spans', () => {
      const rope = makeRope(1000)
      const o1 = makeChunk({ frames: 5, voiced: true })
      const o2 = makeChunk({ frames: 3, voiced: false })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(o1, makeSpan())
      liveSpans.set(o2, makeSpan())
      const result = reconcileLiveSpans([], liveSpans, [rope])
      expect(result.abort.size).toBe(2)
    })
  })

  describe('resolve', () => {
    it('resolves endTime when next chunk is unvoiced', () => {
      const rope = makeRope(1000)
      const voiced = makeChunk({ frames: 5, voiced: true })
      const unvoiced = makeChunk({ frames: 3, voiced: false })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      const span = makeSpan()
      liveSpans.set(voiced, span)
      const result = reconcileLiveSpans([voiced, unvoiced], liveSpans, [rope])
      expect(result.resolve).toHaveLength(1)
      expect(result.resolve[0]!.span).toBe(span)
      expect(result.resolve[0]!.chunk).toBe(voiced)
      expect(result.resolve[0]!.endTime).toBe(0.5)
    })

    it('does not resolve when next chunk is also voiced', () => {
      const rope = makeRope(1000)
      const v1 = makeChunk({ frames: 5, voiced: true })
      const v2 = makeChunk({ frames: 3, voiced: true })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(v1, makeSpan())
      const result = reconcileLiveSpans([v1, v2], liveSpans, [rope])
      expect(result.resolve).toHaveLength(0)
    })

    it('does not resolve when voiced chunk is last (no terminator)', () => {
      const rope = makeRope(1000)
      const voiced = makeChunk({ frames: 5, voiced: true })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(voiced, makeSpan())
      const result = reconcileLiveSpans([voiced], liveSpans, [rope])
      expect(result.resolve).toHaveLength(0)
    })

    it('computes correct endTime with offset from prior chunks', () => {
      const rope = makeRope(1000)
      const c0 = makeChunk({ frames: 3, voiced: false })
      const voiced = makeChunk({ frames: 5, voiced: true })
      const unvoiced = makeChunk({ frames: 2, voiced: false })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      const span = makeSpan()
      liveSpans.set(voiced, span)
      const result = reconcileLiveSpans([c0, voiced, unvoiced], liveSpans, [
        rope,
      ])
      expect(result.resolve).toHaveLength(1)
      expect(result.resolve[0]!.endTime).toBe(0.8)
    })

    it('computes correct endTime across session boundaries', () => {
      const rope0 = makeRope(100)
      const rope1 = makeRope(1000)
      const s0 = makeChunk({ frames: 4, recordingStart: true, voiced: false })
      const s1start = makeChunk({
        frames: 2,
        recordingStart: true,
        voiced: true,
      })
      const s1unvoiced = makeChunk({ frames: 3, voiced: false })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      const span = makeSpan()
      liveSpans.set(s1start, span)
      const result = reconcileLiveSpans([s0, s1start, s1unvoiced], liveSpans, [
        rope0,
        rope1,
      ])
      expect(result.resolve).toHaveLength(1)
      expect(result.resolve[0]!.endTime).toBe(0.2)
    })

    it('does not resolve a span that was already aborted', () => {
      const rope = makeRope(1000)
      const c = makeChunk({ frames: 5, voiced: false })
      const unvoiced = makeChunk({ frames: 3, voiced: false })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(c, makeSpan())
      const result = reconcileLiveSpans([c, unvoiced], liveSpans, [rope])
      expect(result.abort.has(c)).toBe(true)
      expect(result.resolve).toHaveLength(0)
    })
  })

  describe('combined', () => {
    it('handles simultaneous abort, resolve, and create', () => {
      const rope = makeRope(1000)
      const wasVoiced = makeChunk({ frames: 3, voiced: false })
      const stillVoiced = makeChunk({ frames: 5, voiced: true })
      const unvoiced = makeChunk({ frames: 2, voiced: false })
      const newVoiced = makeChunk({ frames: 4, voiced: true })

      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(wasVoiced, makeSpan())
      liveSpans.set(stillVoiced, makeSpan())

      const result = reconcileLiveSpans(
        [wasVoiced, stillVoiced, unvoiced, newVoiced],
        liveSpans,
        [rope],
      )

      expect(result.abort.has(wasVoiced)).toBe(true)
      expect(result.resolve).toHaveLength(1)
      expect(result.resolve[0]!.chunk).toBe(stillVoiced)
      expect(result.create).toEqual([newVoiced])
    })

    it('is pure — does not mutate liveSpans', () => {
      const rope = makeRope(1000)
      const c = makeChunk({ frames: 5, voiced: false })
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(c, makeSpan())
      reconcileLiveSpans([c], liveSpans, [rope])
      expect(liveSpans.size).toBe(1)
    })

    it('is pure — does not abort controllers', () => {
      const rope = makeRope(1000)
      const c = makeChunk({ frames: 5, voiced: false })
      const span = makeSpan()
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(c, span)
      reconcileLiveSpans([c], liveSpans, [rope])
      expect(span.abortController.signal.aborted).toBe(false)
    })

    it('is pure — does not resolve promises', async () => {
      const rope = makeRope(1000)
      const voiced = makeChunk({ frames: 5, voiced: true })
      const unvoiced = makeChunk({ frames: 3, voiced: false })
      const span = makeSpan()
      const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
      liveSpans.set(voiced, span)
      reconcileLiveSpans([voiced, unvoiced], liveSpans, [rope])
      let resolved = false
      void span.endTimePromise.then(() => {
        resolved = true
      })
      await Promise.resolve()
      expect(resolved).toBe(false)
    })

    it('handles empty chunks and empty liveSpans', () => {
      const rope = makeRope(1000)
      const result = reconcileLiveSpans([], new Map(), [rope])
      expect(result.abort.size).toBe(0)
      expect(result.resolve).toHaveLength(0)
      expect(result.create).toHaveLength(0)
    })

    it('handles all unvoiced chunks', () => {
      const rope = makeRope(1000)
      const u1 = makeChunk({ frames: 5, voiced: false })
      const u2 = makeChunk({ frames: 3, voiced: false })
      const result = reconcileLiveSpans([u1, u2], new Map(), [rope])
      expect(result.create).toHaveLength(0)
    })
  })
})

describe('computeSealResolutions', () => {
  it('resolves all pending spans with clamped endTimes', () => {
    const rope = makeRope(100)
    const c = makeChunk({ frames: 5, voiced: true })
    const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
    const span = makeSpan()
    liveSpans.set(c, span)
    const result = computeSealResolutions([c], liveSpans, [rope])
    expect(result).toHaveLength(1)
    expect(result[0]!.span).toBe(span)
    expect(result[0]!.endTime).toBe(0.5)
  })

  it('clamps endTime to rope length when chunk extends past', () => {
    const rope = makeRope(30)
    const c = makeChunk({ frames: 5, voiced: true })
    const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
    liveSpans.set(c, makeSpan())
    const result = computeSealResolutions([c], liveSpans, [rope])
    expect(result[0]!.endTime).toBe(0.3)
  })

  it('handles multiple spans across sessions', () => {
    const rope0 = makeRope(100)
    const rope1 = makeRope(200)
    const s0 = makeChunk({ frames: 5, recordingStart: true, voiced: true })
    const s1 = makeChunk({ frames: 10, recordingStart: true, voiced: true })
    const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
    const span0 = makeSpan()
    const span1 = makeSpan()
    liveSpans.set(s0, span0)
    liveSpans.set(s1, span1)
    const result = computeSealResolutions([s0, s1], liveSpans, [rope0, rope1])
    expect(result).toHaveLength(2)
    const r0 = result.find((r) => r.span === span0)!
    const r1 = result.find((r) => r.span === span1)!
    expect(r0.endTime).toBe(0.5)
    expect(r1.endTime).toBe(1.0)
  })

  it('handles empty liveSpans', () => {
    const rope = makeRope(100)
    const result = computeSealResolutions([], new Map(), [rope])
    expect(result).toHaveLength(0)
  })

  it('skips spans whose chunk is no longer in the array', () => {
    const rope = makeRope(100)
    const orphan = makeChunk({ frames: 5, voiced: true })
    const remaining = makeChunk({ frames: 3, voiced: true })
    const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
    liveSpans.set(orphan, makeSpan())
    const result = computeSealResolutions([remaining], liveSpans, [rope])
    expect(result).toHaveLength(0)
  })

  it('skips spans whose rope is missing', () => {
    const s0 = makeChunk({ frames: 5, recordingStart: true, voiced: true })
    const s1 = makeChunk({ frames: 3, recordingStart: true, voiced: true })
    const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
    liveSpans.set(s1, makeSpan())
    const result = computeSealResolutions([s0, s1], liveSpans, [makeRope(100)])
    expect(result).toHaveLength(0)
  })

  it('computes correct endTime with offset', () => {
    const rope = makeRope(200)
    const c0 = makeChunk({ frames: 5, voiced: false })
    const c1 = makeChunk({ frames: 3, voiced: true })
    const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
    const span = makeSpan()
    liveSpans.set(c1, span)
    const result = computeSealResolutions([c0, c1], liveSpans, [rope])
    expect(result[0]!.endTime).toBe(0.8)
  })

  it('handles zero-length chunk', () => {
    const rope = makeRope(100)
    const c = makeChunk({ frames: 0, voiced: true })
    const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
    liveSpans.set(c, makeSpan())
    const result = computeSealResolutions([c], liveSpans, [rope])
    expect(result[0]!.endTime).toBe(0)
  })
})

describe('transcribeChunks', () => {
  it('transcribes visible chunks first, then the rest in timeline order', async () => {
    const rope = new SabRope(16000)
    rope.append(new Float32Array(16000 * 10)) // 10 seconds of audio

    // Five 1-second voiced chunks laid end to end at 0s..5s.
    const chunks: AnalysisChunk[] = Array.from({ length: 5 }, (_, i) => ({
      timeStepSamples: 160,
      sampleRate: 16000,
      freqStepHz: 0,
      firstBinHz: 0,
      startTimeSec: i,
      frames: Array.from({ length: 100 }),
      voiced: true,
    }))

    const order: number[] = []
    const getAudio: ChunkAudioProvider = (c) => {
      order.push(chunks.indexOf(c))
      return {
        rope,
        startTime: c.startTimeSec,
        endTime: Promise.resolve(c.startTimeSec + 1),
        signal: new AbortController().signal,
      }
    }

    const settings = {
      inputDeviceId: null,
      sampleRate: 'auto' as const,
      persistentMic: false,
      browserPreprocessing: 'default' as const,
      transcriptionMode: 'large' as const,
      vowelChartAverages: 'hidden' as const,
    } satisfies SettingsRow

    // Only the chunk at index 3 (3s..4s) is on-screen.
    transcribeChunks(
      [...chunks],
      settings,
      getAudio,
      undefined,
      undefined,
      () => ({
        leftSec: 3.2,
        rightSec: 3.8,
      }),
    )

    for (let i = 0; i < 100 && order.length < chunks.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    // Visible chunk first, then the off-screen chunks front-to-back.
    expect(order).toEqual([3, 0, 1, 2, 4])
  })

  it('transcribes remaining chunks after a chunk is abandoned', async () => {
    const rope = new SabRope(16000)
    rope.append(new Float32Array(16000 * 10)) // 10 seconds of audio

    const chunk1: AnalysisChunk = {
      timeStepSamples: 160,
      sampleRate: 16000,
      freqStepHz: 0,
      firstBinHz: 0,
      startTimeSec: 0,
      frames: Array.from({ length: 100 }),
      voiced: true,
    }
    const chunk2: AnalysisChunk = {
      timeStepSamples: 160,
      sampleRate: 16000,
      freqStepHz: 0,
      firstBinHz: 0,
      startTimeSec: 0,
      frames: Array.from({ length: 100 }),
      voiced: true,
    }

    const abortController1 = new AbortController()
    const endTimePromise1 = new Promise<number>(() => {})

    const getAudio: ChunkAudioProvider = (newChunk) => {
      if (newChunk === chunk1) {
        return {
          rope,
          startTime: 0,
          endTime: endTimePromise1,
          signal: abortController1.signal,
        }
      }
      return {
        rope,
        startTime: 1,
        endTime: Promise.resolve(2),
        signal: new AbortController().signal,
      }
    }

    const settings = {
      inputDeviceId: null,
      sampleRate: 'auto' as const,
      persistentMic: false,
      browserPreprocessing: 'default' as const,
      transcriptionMode: 'large' as const,
      vowelChartAverages: 'hidden' as const,
    } satisfies SettingsRow

    transcribeChunks([chunk1, chunk2], settings, getAudio)

    // Let the chunksChain start processing chunk1 (it enters the
    // mocked transcribeBundled and hangs on await audio.endTime).
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Abort chunk1 — the mock hasn't registered an abort listener
    // yet (just like the real transcribeBundled), so this abort is
    // missed and the promise never settles.
    abortController1.abort()

    // Give any remaining microtasks a chance to drain.
    await new Promise((resolve) => setTimeout(resolve, 10))

    // chunk2 should have been transcribed in the same pass, but the
    // chunksChain is stuck on chunk1 and never reaches it.
    expect(chunk2.transcription).toEqual({
      status: 'done',
      text: 'transcribed text',
    })
  })
})
