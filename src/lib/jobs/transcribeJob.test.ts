// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect, vi } from 'vitest'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { AudioRope } from '#/lib/audio/AudioRope'
import type { ChunkTranscript, TranscriptTier } from '#/lib/transcription'

import { ChunkWorkQueue } from './ChunkWorkQueue'
import { priorityPickNext } from './schedule'
import type { Viewport } from './schedule'
import { createTranscribeJob, requestUpgrade } from './transcribeJob'
import type { TranscribeJobDeps, TranscriptSink } from './transcribeJob'
import { WorkerTerminatedError } from './WorkerTerminatedError'

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

function sealedRope(length: number): AudioRope {
  const r = new AudioRope(100)
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
  getRopes: () => readonly AudioRope[]
  getViewport: () => Viewport | null
}

// Build the queue the hook builds: one transcribe kind on the generic queue.
function makeQueue(deps: Deps): ChunkWorkQueue {
  const transcribe = createTranscribeJob({
    sink: deps.sink,
    autoTier: deps.autoTier,
    onModelUnavailable: deps.onModelUnavailable,
    isHeavyAllowed: deps.isHeavyAllowed,
    isHeavyTier: deps.isHeavyTier,
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
      isHeavyAllowed: () => true,
      isHeavyTier: () => false,
    })

    queue.scan()
    await settle(() => sink.get(c1) !== undefined)

    expect(sink.get(c0)).toEqual({ cloud: { text: 'cloud text' } })
    expect(sink.get(c1)).toEqual({ cloud: { text: 'cloud text' } })
    expect(sink.get(skip)).toBeUndefined() // unvoiced -- never transcribed
  })

  it('transcribes a still-voiced last chunk when the recording seals', async () => {
    // A single live recording session: one voiced chunk, rope not yet sealed.
    const rope = new AudioRope(100)
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
      isHeavyAllowed: () => true,
      isHeavyTier: () => false,
    })

    // While recording, the chunk is claimed but its audio end isn't known yet, so
    // it waits (no result, an in-flight job).
    queue.scan()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(sink.get(c)?.cloud?.text).toBeUndefined()
    expect(sink.get(c)?.cloud?.job?.status).toBe('transcribing')

    // Pause: seal the rope and let the queue finish its live span.
    rope.seal()
    queue.seal()
    await settle(() => sink.get(c)?.cloud?.text !== undefined)

    expect(sink.get(c)).toEqual({ cloud: { text: 'cloud text' } })
  })

  it('does not re-transcribe a chunk already done at the tier', async () => {
    const { transcribeWeb } = await import('#/lib/transcription/transcribeWeb')
    const calls = vi.mocked(transcribeWeb)
    calls.mockClear()

    const c0 = chunk(5, true)
    const sink = makeSink()
    sink.set(c0, { cloud: { text: 'already' } })
    const queue = makeQueue({
      sink,
      getChunks: () => [c0],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier: () => 'cloud',
      onModelUnavailable: () => {},
      isHeavyAllowed: () => true,
      isHeavyTier: () => false,
    })

    queue.scan()
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(calls).not.toHaveBeenCalled()
    expect(sink.get(c0)).toEqual({ cloud: { text: 'already' } })
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
      autoTier: () => 'large', // whisper -> checks isModelDownloaded
      onModelUnavailable,
      isHeavyAllowed: () => true,
      isHeavyTier: () => false,
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
    sink.set(c0, { small: { text: 'small text' } }) // already done at small
    const autoTier = (highQuality: boolean): TranscriptTier =>
      highQuality ? 'large' : 'small'
    const deps: Deps = {
      sink,
      getChunks: () => [c0],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier,
      onModelUnavailable: () => {},
      isHeavyAllowed: () => true,
      isHeavyTier: () => false,
    }
    const queue = makeQueue(deps)

    // The hook's `request`: record a queued upgrade, then poke the queue.
    requestUpgrade(deps, c0)
    queue.scan()
    await settle(() => sink.get(c0)?.large?.text !== undefined)

    expect(sink.get(c0)).toEqual({
      small: { text: 'small text' },
      large: { text: 'large text' },
    })
  })

  it('runs a queued job at its own tier without redoing a higher one', async () => {
    const { transcribeWithWorker } =
      await import('#/lib/transcription/transcribeBundled')
    const calls = vi.mocked(transcribeWithWorker)
    calls.mockClear()
    calls.mockResolvedValueOnce('small text')

    // large is already done, and a small re-transcription got explicitly queued.
    // The job must pick the (lower) queued tier, matching `needsWork`'s scan,
    // and leave the existing large result untouched.
    const c0 = chunk(5, true)
    const sink = makeSink()
    sink.set(c0, {
      large: { text: 'large text' },
      small: { job: { tier: 'small', status: 'queued' } },
    })
    const deps: Deps = {
      sink,
      getChunks: () => [c0],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier: (highQuality) => (highQuality ? 'large' : 'small'),
      onModelUnavailable: () => {},
      isHeavyAllowed: () => true,
      isHeavyTier: () => false,
    }
    const queue = makeQueue(deps)

    queue.scan()
    await settle(() => sink.get(c0)?.small?.text !== undefined)

    expect(calls).toHaveBeenCalledTimes(1)
    expect(sink.get(c0)).toEqual({
      large: { text: 'large text' },
      small: { text: 'small text' },
    })
  })
})

describe('recording mode', () => {
  // Exercises the isHeavyAllowed + isHeavyTier guard in needsWork: heavy jobs are
  // silently skipped while recording and picked up by the next invalidate() after.
  it('skips heavy work while blocked and runs it when re-enabled', async () => {
    const c0 = chunk(5, true)
    const sink = makeSink()
    let isHeavyAllowed = false

    // Use cloud tier but mark it "heavy" so the recording-mode guard blocks it.
    const queue = makeQueue({
      sink,
      getChunks: () => [c0],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier: () => 'cloud',
      onModelUnavailable: () => {},
      isHeavyAllowed: () => isHeavyAllowed,
      isHeavyTier: () => true,
    })

    queue.scan()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(sink.get(c0)).toBeUndefined()

    isHeavyAllowed = true
    queue.invalidate()
    await settle(() => sink.get(c0)?.cloud?.text !== undefined)

    expect(sink.get(c0)?.cloud?.text).toBe('cloud text')
  })

  // Regression: when recording started while a heavy transcription was in flight,
  // terminateBundledWorker left the pending promise hanging. The #loop() was stuck
  // at `await this.#pass()` forever, so the queue never resumed after recording ended.
  it('resumes after recording ends when the worker was terminated mid-flight', async () => {
    const { transcribeWithWorker } =
      await import('#/lib/transcription/transcribeBundled')

    let rejectInFlight: ((err: Error) => void) | undefined
    vi.mocked(transcribeWithWorker)
      .mockImplementationOnce(
        () =>
          new Promise<string>((_, reject) => {
            rejectInFlight = reject
          }),
      )
      .mockResolvedValueOnce('text after recording')

    const c0 = chunk(5, true)
    const sink = makeSink()
    let isHeavyAllowed = true

    const queue = makeQueue({
      sink,
      getChunks: () => [c0],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
      autoTier: () => 'small',
      onModelUnavailable: () => {},
      isHeavyAllowed: () => isHeavyAllowed,
      isHeavyTier: () => true,
    })

    // Transcription starts in-flight.
    queue.scan()
    await settle(() => sink.get(c0)?.small?.job?.status === 'transcribing')

    // Recording starts: block heavy work and simulate worker termination.
    isHeavyAllowed = false
    queue.invalidate()
    rejectInFlight!(new WorkerTerminatedError())

    // Pass unblocks; chunk must be clean -- no error status, no stale 'transcribing'.
    await settle(
      () => sink.get(c0) !== undefined && sink.get(c0)?.small === undefined,
    )
    expect(sink.get(c0)?.small).toBeUndefined()

    // Recording ends: re-enable heavy work.
    isHeavyAllowed = true
    queue.invalidate()

    // Queue must resume and successfully retranscribe.
    await settle(() => sink.get(c0)?.small?.text !== undefined)
    expect(sink.get(c0)).toEqual({ small: { text: 'text after recording' } })
  })
})
