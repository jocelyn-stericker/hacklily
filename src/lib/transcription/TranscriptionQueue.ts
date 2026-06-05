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

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { SabRope } from '#/lib/audio/SabRope'

import {
  ModelUnavailableError,
  chunkAudioFromRopes,
  locateChunkRope,
  runTranscriptionForEngine,
  tryResolveEngine,
} from './index'
import type {
  AudioSpan,
  ChunkTranscript,
  TranscriptTier,
  TranscriptionEngine,
} from './index'
import {
  computeSealResolutions,
  reconcileLiveSpans,
  selectNextChunk,
} from './schedule'
import type { LiveSpanEntry, TranscriptLookup, Viewport } from './schedule'

const LOG = '[TranscriptionQueue]'

/** The transcript state the queue reads and writes (satisfied by TranscriptStore). */
export interface TranscriptSink {
  get: TranscriptLookup
  set: (chunk: AnalysisChunk, transcript: ChunkTranscript) => void
}

export type QueueDeps = {
  sink: TranscriptSink
  /** The authoritative chunk timeline (read live — mutated in place). */
  getChunks: () => readonly AnalysisChunk[]
  /** Per-session recorded PCM, in `recordingStart` order. */
  getRopes: () => readonly SabRope[]
  /** The visible range, so on-screen chunks transcribe first. */
  getViewport: () => Viewport | null
  /** The tier to auto-run, or `null` to transcribe nothing. */
  autoTier: (highQuality: boolean) => TranscriptTier | null
  /** Invoked when the resolved engine's model isn't downloaded. */
  onModelUnavailable: () => void
}

/**
 * Drives transcription: picks the next chunk (viewport first), runs it one at a
 * time (the worker and Web Speech are single-session), and manages live spans for
 * chunks still being recorded (deferred end + cancellation). All transcript state
 * goes to the `sink`; the queue itself holds only transient plumbing.
 *
 * Reactive triggers come from outside (the hook calls `scan`/`seal`/`setTier`);
 * the queue is a machine you poke, not a subscriber.
 */
export class TranscriptionQueue {
  #deps: QueueDeps
  #liveSpans = new Map<AnalysisChunk, LiveSpanEntry>()
  // Passes are serialised through one chain so a re-fired scan queues behind the
  // running pass rather than racing it.
  #chain: Promise<void> = Promise.resolve()
  // Bumped to supersede an in-flight pass (mode switch / teardown) so it can't
  // keep writing results from a stale engine.
  #generation = 0

  constructor(deps: QueueDeps) {
    this.#deps = deps
  }

  /**
   * Re-evaluate: reconcile live spans against the current timeline, then ensure a
   * pass is running. Idempotent and cheap to call often (structural changes,
   * viewport moves, a job finishing).
   */
  scan(): void {
    this.#reconcile()
    this.#pump()
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

  /** Mode changed: supersede the in-flight pass and re-scan under the new tier. */
  setTier(): void {
    this.#generation += 1
    this.scan()
  }

  /**
   * Re-transcribe `chunk` with a higher quality (the SpeechStrip button)
   */
  upgrade(chunk: AnalysisChunk): void {
    const tier = this.#deps.autoTier(true)
    if (!tier) return
    const prev = this.#deps.sink.get(chunk)
    if (prev) {
      const results = { ...prev.results }
      delete results[tier]
      this.#deps.sink.set(chunk, { results, job: { tier, status: 'queued' } })
    }
    const generation = this.#generation
    this.#chain = this.#chain
      .then(async () => {
        if (this.#generation !== generation) return
        const engine = await tryResolveEngine(tier)
        if (!engine) {
          this.#deps.onModelUnavailable()
          return
        }
        const audio = this.#getAudio(chunk)
        if (!audio) return
        try {
          await this.#transcribeOne(chunk, engine, tier, audio)
        } catch (err) {
          if (err instanceof ModelUnavailableError) {
            this.#deps.onModelUnavailable()
            return
          }
          console.warn(LOG, 'upgrade transcription failed', err)
        }
      })
      .catch((err: unknown) => {
        console.warn(LOG, 'upgrade failed', err)
      })
  }

  /** Abort all live spans and supersede any pass (component teardown). */
  dispose(): void {
    this.#generation += 1
    for (const span of this.#liveSpans.values()) span.abortController.abort()
    this.#liveSpans.clear()
  }

  // Apply the live-span lifecycle synchronously so aborts take effect even while
  // the pass chain is blocked awaiting a chunk's audio.
  #reconcile(): void {
    const tier = this.#deps.autoTier(false)
    if (!tier) return
    const result = reconcileLiveSpans(
      this.#deps.getChunks(),
      this.#liveSpans,
      this.#deps.getRopes(),
      this.#deps.sink.get,
      tier,
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

  #pump(): void {
    this.#chain = this.#chain
      .then(() => this.#pass())
      .catch((err: unknown) => {
        console.warn(LOG, 'pass failed', err)
      })
  }

  async #pass(): Promise<void> {
    const generation = this.#generation
    const tier = this.#deps.autoTier(false)
    if (!tier) return
    const engine = await tryResolveEngine(tier)
    if (!engine) {
      this.#deps.onModelUnavailable()
      return
    }
    // Chunks tried this pass (transcribed, skipped for missing audio, or
    // cancelled) so a chunk left untranscribed can't spin the loop; a later pass
    // retries it.
    const attempted = new Set<AnalysisChunk>()
    for (;;) {
      // A mode switch / teardown superseded this pass — stop writing stale results.
      if (this.#generation !== generation) return
      const chunk = selectNextChunk(
        this.#deps.getChunks(),
        this.#deps.sink.get,
        attempted,
        this.#deps.getViewport(),
        tier,
      )
      if (!chunk) return
      attempted.add(chunk)
      const audio = this.#getAudio(chunk)
      if (!audio) continue
      try {
        await this.#transcribeOne(chunk, engine, tier, audio)
      } catch (err) {
        if (err instanceof ModelUnavailableError) {
          this.#deps.onModelUnavailable()
          return
        }
        console.warn(LOG, 'transcription failed', err)
      }
    }
  }

  // Recorded audio for a chunk: its live span (deferred end + cancellation) while
  // it's still recording, otherwise the already-recorded span.
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

  async #transcribeOne(
    chunk: AnalysisChunk,
    engine: TranscriptionEngine,
    tier: TranscriptTier,
    audio: AudioSpan,
  ): Promise<void> {
    // Claim the chunk synchronously (before the first await) so a concurrent pass
    // skips it.
    const prior = this.#deps.sink.get(chunk)
    this.#deps.sink.set(chunk, {
      results: prior?.results ?? {},
      job: { tier, status: 'transcribing' },
    })

    try {
      const text = await runTranscriptionForEngine(engine, audio)
      const cur = this.#deps.sink.get(chunk)
      this.#deps.sink.set(chunk, {
        results: { ...cur?.results, [tier]: text },
      })
    } catch (err) {
      if (audio.signal.aborted) {
        // Cancelled (re-chunked, or too short to be speech): leave untranscribed.
        const cur = this.#deps.sink.get(chunk)
        this.#deps.sink.set(chunk, { results: cur?.results ?? {} })
        return
      }
      if (err instanceof ModelUnavailableError) {
        // Drop the in-flight job; the caller reverts the mode.
        const cur = this.#deps.sink.get(chunk)
        this.#deps.sink.set(chunk, { results: cur?.results ?? {} })
        throw err
      }
      const cur = this.#deps.sink.get(chunk)
      this.#deps.sink.set(chunk, {
        results: cur?.results ?? {},
        job: {
          tier,
          status: 'error',
          error: err instanceof Error ? err.message : 'Transcription failed',
        },
      })
    }
  }
}
