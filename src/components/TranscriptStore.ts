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
import type { ChunkTranscript } from '#/lib/transcription'

/**
 * The source the SpeechStrip overlay subscribes to via `useSyncExternalStore`.
 * Analysis chunks are mutated in place and so don't trigger React renders on
 * their own (see project_react_compiler_inplace_mutation); this store turns
 * those mutations into render signals at two granularities:
 *
 *  - **list** — the set/shape of chunks (a chunk appended, split, or merged).
 *    The overlay subscribes once and re-reads the live array when it changes.
 *  - **per-chunk transcript** — each row subscribes to only its own chunk, so a
 *    transcript landing re-renders that one row rather than the whole strip.
 *
 * The store is owned by the route (one instance per session) and passed down.
 */
export class TranscriptStore {
  // ── chunk list (structural) ──
  // The overlay renders from this immutable snapshot, not the live array. Chunks
  // are mutated in place, so only a snapshot whose *identity* changes on each
  // structural change lets useSyncExternalStore (and the React Compiler) see the
  // update — returning a revision counter while mapping the live array doesn't,
  // since the array's identity never changes. Coalesced to one snapshot per
  // animation frame so live recording can't re-snapshot faster than it paints.
  #chunkList: readonly AnalysisChunk[] = []
  #pendingChunkList: readonly AnalysisChunk[] | null = null
  #listSubscribers = new Set<() => void>()
  #listFrame: number | null = null

  subscribeList = (onChange: () => void): (() => void) => {
    this.#listSubscribers.add(onChange)
    return () => {
      this.#listSubscribers.delete(onChange)
    }
  }

  getChunkList = (): readonly AnalysisChunk[] => this.#chunkList

  /**
   * Publish the current chunks for the overlay to render. Pass the live array;
   * the store copies it on the next animation frame, so the snapshot's identity
   * changes (driving a re-render) even though the array itself was mutated in
   * place. Coalesced, so appending a frame every step re-renders at most once
   * per paint.
   */
  publishChunkList(chunks: readonly AnalysisChunk[]): void {
    this.#pendingChunkList = chunks
    if (this.#listFrame !== null) return
    const flush = () => {
      this.#listFrame = null
      if (this.#pendingChunkList) {
        this.#chunkList = this.#pendingChunkList.slice()
        this.#pendingChunkList = null
      }
      for (const cb of this.#listSubscribers) cb()
    }
    // Fall back to a synchronous publish where rAF isn't available (e.g. tests
    // in a non-DOM environment).
    if (typeof requestAnimationFrame === 'undefined') {
      flush()
    } else {
      this.#listFrame = requestAnimationFrame(flush)
    }
  }

  // ── per-chunk transcript ──
  // Transcripts live in a WeakMap so a chunk dropped from the timeline (split or
  // merged away) lets its entry be collected without manual cleanup.
  #transcripts = new WeakMap<AnalysisChunk, ChunkTranscript>()
  #chunkSubscribers = new Map<AnalysisChunk, Set<() => void>>()

  subscribeChunk(chunk: AnalysisChunk, onChange: () => void): () => void {
    let set = this.#chunkSubscribers.get(chunk)
    if (!set) {
      set = new Set()
      this.#chunkSubscribers.set(chunk, set)
    }
    set.add(onChange)
    return () => {
      set.delete(onChange)
      // Drop the (strongly-held) Map entry once nothing listens, so removed
      // chunks don't pin their subscriber set.
      if (set.size === 0) this.#chunkSubscribers.delete(chunk)
    }
  }

  getTranscript = (chunk: AnalysisChunk): ChunkTranscript | undefined =>
    this.#transcripts.get(chunk)

  /**
   * Record a chunk's transcript and notify only that chunk's subscribers. This
   * is the producer side of the per-chunk path; the transcribe flow calls it as
   * results land.
   */
  setTranscript(chunk: AnalysisChunk, transcript: ChunkTranscript): void {
    this.#transcripts.set(chunk, transcript)
    for (const cb of this.#chunkSubscribers.get(chunk) ?? []) cb()
  }

  /**
   * Drop a chunk's transcript and notify its subscribers. Used when re-chunking
   * (split/merge) changes a chunk's audio span, so its old text no longer
   * corresponds to it. No-op if the chunk had none.
   */
  clearTranscript(chunk: AnalysisChunk): void {
    if (!this.#transcripts.has(chunk)) return
    this.#transcripts.delete(chunk)
    for (const cb of this.#chunkSubscribers.get(chunk) ?? []) cb()
  }
}
