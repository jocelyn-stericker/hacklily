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

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { SabRope } from '#/lib/audio/SabRope'

import {
  bestResult,
  chunkAudioFromRopes,
  locateChunkRope,
  readAudioSpan,
} from '.'

vi.mock('#/lib/transcription/transcribeBundled', () => ({
  transcribeWithWorker: vi.fn(async () => 'transcribed text'),
}))

vi.mock('#/lib/transcription/transcribeWeb', () => ({
  transcribeWeb: vi.fn().mockRejectedValue(new Error('not used')),
}))

// transcription.ts imports modelDownload (which pulls in a web-worker module);
// stub it so the worker model always reads as downloaded and no worker loads.
vi.mock('#/lib/modelDownload', () => ({
  isModelDownloaded: vi.fn().mockReturnValue(true),
  clearModelDownloaded: vi.fn(),
}))

// The "small" tier probes for on-device support; force the bundled (Moonshine)
// path so the test doesn't depend on a browser SpeechRecognition global.
vi.mock('#/lib/browserFeatures', () => ({
  checkLocalTranscription: vi.fn().mockResolvedValue(false),
}))

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

// A rope filled with a ramp (sample i === i), so a returned slice reveals the
// offset it was read from.
function rampRope(length: number, sampleRate = 100): SabRope {
  const rope = new SabRope(sampleRate)
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) data[i] = i
  rope.append(data)
  return rope
}

function makeRope(length: number, sampleRate = 100): SabRope {
  const rope = new SabRope(sampleRate)
  if (length > 0) rope.append(new Float32Array(length))
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

describe('bestResult', () => {
  it('prefers large over cloud over small', () => {
    expect(
      bestResult({ results: { small: 's', cloud: 'c', large: 'l' } }),
    ).toBe('l')
    expect(bestResult({ results: { small: 's', cloud: 'c' } })).toBe('c')
    expect(bestResult({ results: { small: 's' } })).toBe('s')
  })

  it('returns the small text while a large upgrade is in flight', () => {
    expect(
      bestResult({
        results: { small: 's' },
        job: { tier: 'large', status: 'transcribing' },
      }),
    ).toBe('s')
  })

  it('returns undefined when nothing has completed yet', () => {
    expect(
      bestResult({ results: {}, job: { tier: 'small', status: 'queued' } }),
    ).toBeUndefined()
  })
})
