// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { ChunkTranscript } from '#/lib/transcription'

/**
 * useSyncExternalStore source for SpeechStrip. Chunks are mutated in place
 * (see project_react_compiler_inplace_mutation), so this converts mutations
 * to render signals at two granularities:
 *  - **list** -- structural changes (append/split/merge).
 *  - **per-chunk** -- one row re-renders when its transcript lands.
 */
export class TranscriptStore {
  // -- chunk list (structural) --
  // Identity must change on each structural update; a counter over the live
  // array wouldn't satisfy useSyncExternalStore. Coalesced one per rAF.
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

  /** Publish chunks for the overlay. The .slice() gives the snapshot a new
   *  identity even though chunks are mutated in place. Coalesced per rAF. */
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
    // Synchronous fallback where rAF isn't available (e.g. tests).
    if (typeof requestAnimationFrame === 'undefined') {
      flush()
    } else {
      this.#listFrame = requestAnimationFrame(flush)
    }
  }

  // -- per-chunk transcript --
  // WeakMap: dropped chunks are GC'd without manual cleanup.
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
      // Drop the Map entry once nothing listens so removed chunks don't pin it.
      if (set.size === 0) this.#chunkSubscribers.delete(chunk)
    }
  }

  getTranscript = (chunk: AnalysisChunk): ChunkTranscript | undefined =>
    this.#transcripts.get(chunk)

  /** Record a transcript and notify that chunk's subscribers. */
  setTranscript(chunk: AnalysisChunk, transcript: ChunkTranscript): void {
    this.#transcripts.set(chunk, transcript)
    for (const cb of this.#chunkSubscribers.get(chunk) ?? []) cb()
  }

  /** Drop a chunk's transcript and notify subscribers. Called when re-chunking
   *  changes the audio span; no-op if the chunk had none. */
  clearTranscript(chunk: AnalysisChunk): void {
    if (!this.#transcripts.has(chunk)) return
    this.#transcripts.delete(chunk)
    for (const cb of this.#chunkSubscribers.get(chunk) ?? []) cb()
  }
}

export function useAnalysisChunks(store: TranscriptStore) {
  return useSyncExternalStore(store.subscribeList, store.getChunkList)
}

export function useTranscript(store: TranscriptStore, chunk: AnalysisChunk) {
  const chunks = useMemo(() => [chunk], [chunk])
  return useTranscripts(store, chunks)[0]
}

export function useTranscripts(
  store: TranscriptStore,
  chunks: readonly AnalysisChunk[],
): (ChunkTranscript | undefined)[] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const unsubs = chunks.map((c) => store.subscribeChunk(c, onChange))
      return () => {
        for (const u of unsubs) u()
      }
    },
    [store, chunks],
  )
  const snapshotRef = useRef<(ChunkTranscript | undefined)[] | null>(null)
  const getSnapshot = useCallback(() => {
    const next = chunks.map((c) => store.getTranscript(c))
    const prev = snapshotRef.current
    if (
      prev &&
      prev.length === next.length &&
      prev.every((v, i) => v === next[i])
    ) {
      return prev
    }
    snapshotRef.current = next
    return next
  }, [store, chunks])
  return useSyncExternalStore(subscribe, getSnapshot)
}
