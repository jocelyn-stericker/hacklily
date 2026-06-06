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
import type { ChunkTranscript, TranscriptTier } from '#/lib/transcription'

import { ChunkWorkQueue } from './ChunkWorkQueue'
import { priorityPickNext } from './schedule'
import type { Viewport } from './schedule'
import { createTranscribeJob, requestUpgrade } from './transcribeJob'
import type { TranscribeJobDeps, TranscriptSink } from './transcribeJob'

vi.mock('#/lib/transcription/transcribeBundled', () => ({
  transcribeWithWorker: vi.fn(),
}))
// Model the real backend: wait for the span's audio (its deferred end) before
// producing text, so a live chunk isn't "transcribed" until its segment lands.
vi.mock('#/lib/transcription/transcribeWeb', () => ({
  transcribeWeb: vi.fn(async (audio: { endTime: Promise<number> }) => {
    await audio.endTime
    return 'cloud text'
  }),
}))
vi.mock('#/lib/modelDownload', () => ({
  isModelDownloaded: vi.fn().mockReturnValue(true),
  clearModelDownloaded: vi.fn(),
}))
vi.mock('#/lib/browserFeatures', () => ({
  checkLocalTranscription: vi.fn().mockResolvedValue(false),
}))

function chunk(frames: number, voiced: boolean): AnalysisChunk {
  return {
    timeStepSamples: 10,
    sampleRate: 100,
    freqStepHz: 0,
    firstBinHz: 0,
    startTimeSec: 0,
    frames: Array.from({ length: frames }),
    voiced,
  }
}

function sealedRope(length: number): SabRope {
  const r = new SabRope(100)
  r.append(new Float32Array(length))
  r.seal()
  return r
}

function makeSink(): TranscriptSink & {
  map: Map<AnalysisChunk, ChunkTranscript>
} {
  const map = new Map<AnalysisChunk, ChunkTranscript>()
  return { map, get: (c) => map.get(c), set: (c, t) => map.set(c, t) }
}

type Deps = TranscribeJobDeps & {
  getChunks: () => readonly AnalysisChunk[]
  getRopes: () => readonly SabRope[]
  getViewport: () => Viewport | null
}

// Build the queue the hook builds: one transcribe kind on the generic queue.
function makeQueue(deps: Deps): ChunkWorkQueue {
  const transcribe = createTranscribeJob({
    sink: deps.sink,
    autoTier: deps.autoTier,
    onModelUnavailable: deps.onModelUnavailable,
  })
  return new ChunkWorkQueue([transcribe], priorityPickNext(['transcribe']), {
    getChunks: deps.getChunks,
    getRopes: deps.getRopes,
    getViewport: deps.getViewport,
  })
}

// Let the serialised pass drain.
async function settle(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !predicate(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('transcribe kind', () => {
  it('transcribes every voiced chunk at the auto tier', async () => {
    const c0 = chunk(5, true)
    const skip = chunk(3, false)
    const c1 = chunk(2, true)
    const chunks = [c0, skip, c1]
    const sink = makeSink()
    const queue = makeQueue({
      sink,
      getChunks: () => chunks,
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier: () => 'cloud',
      onModelUnavailable: () => {},
    })

    queue.scan()
    await settle(() => sink.get(c1) !== undefined)

    expect(sink.get(c0)).toEqual({ results: { cloud: 'cloud text' } })
    expect(sink.get(c1)).toEqual({ results: { cloud: 'cloud text' } })
    expect(sink.get(skip)).toBeUndefined() // unvoiced — never transcribed
  })

  it('transcribes a still-voiced last chunk when the recording seals', async () => {
    // A single live recording session: one voiced chunk, rope not yet sealed.
    const rope = new SabRope(100)
    rope.append(new Float32Array(50)) // 5 frames * 10 samples
    const c = chunk(5, true)
    c.recordingStart = true
    const chunks = [c]
    const sink = makeSink()
    const queue = makeQueue({
      sink,
      getChunks: () => chunks,
      getRopes: () => [rope],
      getViewport: () => null,
      autoTier: () => 'cloud',
      onModelUnavailable: () => {},
    })

    // While recording, the chunk is claimed but its audio end isn't known yet, so
    // it waits (no result, an in-flight job).
    queue.scan()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(sink.get(c)?.results.cloud).toBeUndefined()
    expect(sink.get(c)?.job?.status).toBe('transcribing')

    // Pause: seal the rope and let the queue finish its live span.
    rope.seal()
    queue.seal()
    await settle(() => sink.get(c)?.results.cloud !== undefined)

    expect(sink.get(c)).toEqual({ results: { cloud: 'cloud text' } })
  })

  it('does not re-transcribe a chunk already done at the tier', async () => {
    const { transcribeWeb } = await import('#/lib/transcription/transcribeWeb')
    const calls = vi.mocked(transcribeWeb)
    calls.mockClear()

    const c0 = chunk(5, true)
    const sink = makeSink()
    sink.set(c0, { results: { cloud: 'already' } })
    const queue = makeQueue({
      sink,
      getChunks: () => [c0],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier: () => 'cloud',
      onModelUnavailable: () => {},
    })

    queue.scan()
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(calls).not.toHaveBeenCalled()
    expect(sink.get(c0)).toEqual({ results: { cloud: 'already' } })
  })

  it('reverts via onModelUnavailable when the engine model is missing', async () => {
    const { isModelDownloaded } = await import('#/lib/modelDownload')
    vi.mocked(isModelDownloaded).mockReturnValueOnce(false)

    const onModelUnavailable = vi.fn()
    const c0 = chunk(5, true)
    const queue = makeQueue({
      sink: makeSink(),
      getChunks: () => [c0],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier: () => 'large', // whisper → checks isModelDownloaded
      onModelUnavailable,
    })

    queue.scan()
    await settle(() => onModelUnavailable.mock.calls.length > 0)

    expect(onModelUnavailable).toHaveBeenCalled()
  })

  it('upgrades a chunk to a higher tier on request, keeping the lower result', async () => {
    const { transcribeWithWorker } =
      await import('#/lib/transcription/transcribeBundled')
    vi.mocked(transcribeWithWorker).mockResolvedValueOnce('large text')

    const c0 = chunk(5, true)
    const sink = makeSink()
    sink.set(c0, { results: { small: 'small text' } }) // already done at small
    const autoTier = (highQuality: boolean): TranscriptTier =>
      highQuality ? 'large' : 'small'
    const deps: Deps = {
      sink,
      getChunks: () => [c0],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier,
      onModelUnavailable: () => {},
    }
    const queue = makeQueue(deps)

    // The hook's `request`: record a queued upgrade, then poke the queue.
    requestUpgrade(deps, c0)
    queue.scan()
    await settle(() => sink.get(c0)?.results.large !== undefined)

    expect(sink.get(c0)).toEqual({
      results: { small: 'small text', large: 'large text' },
    })
  })
})
