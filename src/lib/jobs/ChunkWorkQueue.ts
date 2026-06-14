// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { AudioRope } from '#/lib/audio/AudioRope'
import { locateChunkRope, chunkAudioFromRopes } from '#/lib/audio/AudioSpan'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import { Sink } from '#/lib/Sink'

import { ModelUnavailableError } from './ModelUnavailableError'
import { computeSealResolutions, reconcileLiveSpans } from './schedule'
import type {
  CandidateJob,
  LiveSpanEntry,
  PickNext,
  Viewport,
} from './schedule'

const LOG = '[ChunkWorkQueue]'

/** The timeline the queue schedules over. */
export type WorkDeps = {
  /** The authoritative chunk timeline (read live -- mutated in place). */
  getChunks: () => readonly AnalysisChunk[]
  /** Per-session recorded PCM, in `recordingStart` order. */
  getRopes: () => readonly AudioRope[]
  /** The visible range, so on-screen chunks are handled first. */
  getViewport: () => Viewport | null
}

/** Runs one chunk's work for a kind: claim, execute, persist. */
export type WorkRunner = (
  chunk: AnalysisChunk,
  audio: AudioSpan,
) => Promise<void>

/**
 * One kind of work the queue can schedule (transcribe, align, ...), injected so
 * the queue stays free of any one job's specifics. Multiple kinds share the
 * queue's single chain -- only one job runs at a time -- and `PickNext`
 * decides which kind goes next.
 */
export interface ChunkWork {
  /** Stable id, used by `PickNext` and to key per-kind state. */
  kind: string
  /** Whether a voiced chunk still needs this kind of work. */
  needsWork: (chunk: AnalysisChunk) => boolean
  /**
   * Resolve the backend for a pass and return a runner bound to it, or `null` to
   * stand down (then `onUnavailable` fires and this kind is skipped for the
   * rest of the pass). Called at most once per pass. The returned runner claims
   * the chunk synchronously (before its first await), executes, and persists; it
   * may throw `ModelUnavailableError` to stand the kind down mid-pass.
   */
  resolve: () => Promise<WorkRunner | null>
  /** The model became unavailable (resolve returned null, or a run threw). */
  onUnavailable: () => void
  /**
   * Manage live-recording spans (deferred end + cancellation) for chunks still
   * being recorded. Defaults to false; set true for realtime work that should
   * start before a chunk's audio has finished recording.
   */
  liveSpans?: boolean
}

/**
 * Drives per-chunk async work across the recording timeline. Each pass repeatedly
 * asks `PickNext` for the next eligible `{ kind, chunk }` job, runs it, and
 * re-asks -- so priority is re-evaluated after every job and as new work appears
 * mid-pass (e.g. a transcript that makes a chunk alignable). One job runs at a
 * time (a single chain); kinds that opt into `ChunkWork.liveSpans` get live
 * spans for chunks still being recorded. All result state lives in the kinds; the
 * queue holds only transient plumbing.
 *
 * Reactive triggers come from outside (the owner calls `scan`/`seal`/`invalidate`);
 * the queue is a machine you poke, not a subscriber.
 */
export class ChunkWorkQueue {
  #kinds: readonly ChunkWork[]
  #byId = new Map<string, ChunkWork>()
  #pickNext: PickNext
  #deps: WorkDeps
  // Live spans for chunks still being recorded (deferred end + cancellation),
  // keyed per chunk: the audio and its recording lifecycle are shared across
  // kinds. A kind's `liveSpans` flag only decides whether it helps create them
  // (and may be scheduled before a chunk's audio is complete).
  #liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
  #generation = 0
  #sink = new Sink<void>()
  #abortController = new AbortController()

  constructor(kinds: readonly ChunkWork[], pickNext: PickNext, deps: WorkDeps) {
    this.#kinds = kinds
    this.#pickNext = pickNext
    this.#deps = deps
    for (const kind of kinds) this.#byId.set(kind.kind, kind)
    void this.#loop()
  }

  /**
   * Re-evaluate: reconcile live spans against the current timeline, then signal
   * the loop to run a pass. Idempotent and cheap to call often (structural
   * changes, viewport moves, a job finishing).
   */
  scan(): void {
    this.#reconcile()
    this.#sink.push(undefined)
  }

  /** The recording rope sealed: resolve every pending live endTime, then re-scan. */
  seal(): void {
    for (const { span, endTime } of computeSealResolutions(
      this.#deps.getChunks(),
      this.#liveSpans,
      this.#deps.getRopes(),
    )) {
      span.resolveEndTime(endTime)
    }
    this.#liveSpans.clear()
    this.scan()
  }

  /** Config changed: supersede the in-flight pass and re-scan under the new one. */
  invalidate(): void {
    this.#generation += 1
    this.scan()
  }

  /** Abort the loop, abort all live spans, and supersede any pass (owner teardown). */
  dispose(): void {
    this.#abortController.abort()
    this.#generation += 1
    for (const span of this.#liveSpans.values()) span.abortController.abort()
    this.#liveSpans.clear()
  }

  // Background loop: driven by the sink, runs one pass per signal. The sink
  // serialises passes so only one runs at a time; a push during a pass queues
  // the next wake-up after the current pass finishes.
  async #loop(): Promise<void> {
    while ((await this.#sink.next(this.#abortController.signal)) !== null) {
      try {
        await this.#pass()
      } catch (err) {
        console.warn(LOG, 'pass failed', err)
      }
    }
  }

  // Apply the live-span lifecycle synchronously so aborts take effect even while
  // the pass chain is blocked awaiting a chunk's audio. Spans are created for the
  // enabled kinds that opt into live work; if none are active, leave spans
  // untouched (a disabled queue stands down without resolving in-flight spans).
  #reconcile(): void {
    const needsWork = (chunk: AnalysisChunk) =>
      this.#kinds.some((kind) => kind.needsWork(chunk))
    const result = reconcileLiveSpans(
      this.#deps.getChunks(),
      this.#liveSpans,
      this.#deps.getRopes(),
      needsWork,
    )
    for (const chunk of result.abort) {
      this.#liveSpans.get(chunk)?.abortController.abort()
      this.#liveSpans.delete(chunk)
    }
    for (const { chunk, span, endTime } of result.resolve) {
      span.resolveEndTime(endTime)
      this.#liveSpans.delete(chunk)
    }
    for (const chunk of result.create) {
      let resolveEndTime!: (endTime: number) => void
      const endTime = new Promise<number>((resolve) => {
        resolveEndTime = resolve
      })
      this.#liveSpans.set(chunk, {
        abortController: new AbortController(),
        endTime,
        resolveEndTime,
      })
    }
  }

  async #pass(): Promise<void> {
    const generation = this.#generation
    // Resolved per kind this pass: a runner, or null once a kind has stood down
    // (resolve returned null, or a run threw ModelUnavailableError).
    const runners = new Map<string, WorkRunner | null>()
    // Chunks tried per kind this pass (handled, skipped for missing audio, or
    // cancelled) so a chunk left unhandled can't spin the loop; a later pass
    // retries it.
    const attempted = new Map<string, Set<AnalysisChunk>>()

    for (;;) {
      // A config change / teardown superseded this pass -- stop writing stale results.
      if (this.#generation !== generation) return
      const job = this.#pickNext(
        this.#candidates(runners, attempted),
        this.#deps.getViewport(),
      )
      if (!job) return
      const kind = this.#byId.get(job.kind)!

      let tried = attempted.get(job.kind)
      if (!tried) attempted.set(job.kind, (tried = new Set()))
      tried.add(job.chunk)

      // Resolve the kind's runner once per pass.
      let runner = runners.get(job.kind)
      if (runner === undefined) {
        runner = await kind.resolve()
        runners.set(job.kind, runner)
        if (!runner) {
          kind.onUnavailable()
          continue
        }
      }
      if (!runner) continue

      const audio = this.#getAudio(job.chunk)
      if (!audio) continue
      try {
        await runner(job.chunk, audio)
      } catch (err) {
        if (err instanceof ModelUnavailableError) {
          // Stand this kind down for the rest of the pass; others continue.
          runners.set(job.kind, null)
          kind.onUnavailable()
          continue
        }
        console.warn(LOG, `[${kind.kind}] run failed`, err)
      }
    }
  }

  // Eligible jobs across all kinds: voiced chunks that need each enabled,
  // still-available kind's work and haven't been tried this pass.
  #candidates(
    runners: ReadonlyMap<string, WorkRunner | null>,
    attempted: ReadonlyMap<string, Set<AnalysisChunk>>,
  ): CandidateJob[] {
    const out: CandidateJob[] = []
    const chunks = this.#deps.getChunks()
    for (const kind of this.#kinds) {
      if (runners.get(kind.kind) === null) continue // stood down this pass
      const tried = attempted.get(kind.kind)
      for (const chunk of chunks) {
        if (!chunk.voiced) continue
        if (tried?.has(chunk)) continue
        if (!kind.needsWork(chunk)) continue
        out.push({ kind: kind.kind, chunk })
      }
    }
    return out
  }

  // Recorded audio for a chunk: a live span (deferred end + cancellation) while
  // it's still being recorded, otherwise the already-recorded span.
  #getAudio(chunk: AnalysisChunk): AudioSpan | null {
    const chunks = this.#deps.getChunks()
    const ropes = this.#deps.getRopes()
    const live = this.#liveSpans.get(chunk)
    if (live) {
      const loc = locateChunkRope(chunk, chunks, ropes)
      if (!loc) return null
      return {
        rope: loc.rope,
        startTime: loc.startSample / loc.rope.sampleRate,
        endTime: live.endTime,
        signal: live.abortController.signal,
      }
    }
    return chunkAudioFromRopes(chunk, chunks, ropes)
  }
}
