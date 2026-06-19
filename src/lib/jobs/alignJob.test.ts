// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { afterEach, describe, it, expect, vi } from 'vitest'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { AudioRope } from '#/lib/audio/AudioRope'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import type { ChunkTranscript } from '#/lib/transcription'

import { createAlignJob, terminateAlignWorker } from './alignJob'
import type { AlignJobDeps } from './alignJob'
import type { TranscriptSink } from './transcribeJob'

// A minimal stand-in for the real AlignWorker. It models the bit that matters
// for teardown: addEventListener honours the `{ signal }` option (a native
// EventTarget removes the listener when the signal aborts), and terminate()
// does NOT touch the listener set -- exactly like a real Worker.
const { FakeWorker } = vi.hoisted(() => {
  class FakeWorkerImpl {
    static instances: FakeWorkerImpl[] = []
    listeners = new Set<(ev: MessageEvent) => void>()
    posted: unknown[] = []
    terminated = false
    constructor() {
      FakeWorkerImpl.instances.push(this)
    }
    addEventListener(
      _type: string,
      fn: (ev: MessageEvent) => void,
      opts?: { signal?: AbortSignal },
    ): void {
      this.listeners.add(fn)
      opts?.signal?.addEventListener('abort', () => this.listeners.delete(fn))
    }
    removeEventListener(_type: string, fn: (ev: MessageEvent) => void): void {
      this.listeners.delete(fn)
    }
    postMessage(msg: unknown): void {
      this.posted.push(msg)
    }
    terminate(): void {
      this.terminated = true
    }
  }
  return { FakeWorker: FakeWorkerImpl }
})
vi.mock('#/lib/workers/AlignWorker?worker', () => ({ default: FakeWorker }))

function chunk(): AnalysisChunk {
  return {
    timeStepSamples: 10,
    sampleRate: 100,
    freqStepHz: 0,
    firstBinHz: 0,
    startTimeSec: 0,
    frames: Array.from({ length: 5 }),
    voiced: true,
  }
}

function sealedRope(length: number): AudioRope {
  const r = new AudioRope(100)
  r.append(new Float32Array(length))
  r.seal()
  return r
}

function span(rope: AudioRope): AudioSpan {
  return {
    rope,
    startTime: 0,
    endTime: Promise.resolve(rope.length / rope.sampleRate),
    signal: new AbortController().signal,
  }
}

function makeSink(): TranscriptSink & {
  map: Map<AnalysisChunk, ChunkTranscript>
} {
  const map = new Map<AnalysisChunk, ChunkTranscript>()
  return { map, get: (c) => map.get(c), set: (c, t) => map.set(c, t) }
}

async function settle(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !predicate(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

afterEach(() => {
  terminateAlignWorker()
  FakeWorker.instances.length = 0
})

describe('align worker teardown', () => {
  // Regression: terminateAlignWorker() nulled the module-level `worker` before
  // running the pending job's cleanup, so the old `worker?.removeEventListener`
  // ran against null and left the message listener attached to the terminated
  // worker instance. Cleanup now aborts an AbortController bound to the captured
  // instance, so the listener is detached regardless of the module reference.
  it('removes the message listener when terminated mid-alignment', async () => {
    const sink = makeSink()
    const c = chunk()
    sink.set(c, { cloud: { text: 'hello world' } })

    const deps: AlignJobDeps = {
      sink,
      onModelUnavailable: () => {},
      enabled: () => true,
      isHeavyAllowed: () => true,
    }

    const processChunk = await createAlignJob(deps).resolve()
    // Kick off the alignment; it parks awaiting the worker's reply.
    const done = processChunk!(c, span(sealedRope(100)))

    // Wait until the worker exists and the alignment request has been posted,
    // i.e. the listener is attached and the job is in flight.
    await settle(
      () =>
        FakeWorker.instances.length > 0 &&
        FakeWorker.instances[0]!.posted.length > 0,
    )
    const worker = FakeWorker.instances[0]!
    expect(worker.listeners.size).toBe(1)

    terminateAlignWorker()
    await done

    expect(worker.terminated).toBe(true)
    // The crux: the listener must be gone, not stranded on the dead worker.
    expect(worker.listeners.size).toBe(0)
    // The half-done tier was rolled back rather than left "aligning".
    expect(sink.get(c)?.cloud?.job).toBeUndefined()
  })
})
