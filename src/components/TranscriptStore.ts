// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'

import type { PhonemeTimestamp } from '#/lib/alignment/types'
import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { BrightnessFrame } from '#/lib/ipa/acousticGenderSpace'
import { brightness } from '#/lib/ipa/acousticGenderSpace'
import { TRANSCRIPT_TIERS } from '#/lib/transcription'
import type { ChunkTranscript } from '#/lib/transcription'
import { median } from '#/lib/utils'

/**
 * Per-chunk derived values the overlay shows alongside the transcript.
 * Computed from the chunk's frames, which are mutated in place (see
 * TranscriptStore's class doc), so these are stored and re-signalled here
 * rather than derived inline in the component -- the React compiler can't
 * observe an in-place frame mutation, so an inline derivation would never
 * recompute.
 */
export type ChunkDerived = {
  /** Mean lunaBrightness over frames that have one, or 0 if none do. */
  brightness: number
  /** Median f0 over voiced frames (f0 > 0), rounded to Hz, or 0 if none. */
  medianF0: number
  /** Alpha ratio (1-5 kHz over 0.5-1kHz) aka vocal weight aka spectral rolloff */
  weightDb: number
  phonemeBrightness: Float32Array
}

function phonemesFor(
  transcript: ChunkTranscript | undefined,
): PhonemeTimestamp[] | undefined {
  if (!transcript) return undefined
  for (let i = TRANSCRIPT_TIERS.length - 1; i >= 0; i -= 1) {
    const ph = transcript[TRANSCRIPT_TIERS[i]!]?.phonemes
    if (ph && ph.length > 0) return ph
  }
  return undefined
}

function phonemeBrightnessEqual(a: Float32Array, b: Float32Array): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!
    const y = b[i]!
    if (x === y) continue
    if (Number.isNaN(x) && Number.isNaN(y)) continue
    return false
  }
  return true
}

function computeDerived(
  chunk: AnalysisChunk,
  transcript: ChunkTranscript | undefined,
): ChunkDerived {
  const f0s: number[] = []
  const weights: number[] = []
  const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
  const brightFrames: BrightnessFrame[] = []
  for (let i = 0; i < chunk.frames.length; i += 1) {
    const f = chunk.frames[i]!
    if (f.f0 > 0) {
      f0s.push(f.f0)
      if (f.lunaBrightness != null) {
        brightFrames.push({
          frameMs: (chunk.startTimeSec + (i + 0.5) * timeStepSec) * 1000,
          brightness: f.lunaBrightness,
        })
      }
    }
    if (f.f0 > 0) f0s.push(f.f0)
    if (f.weight && f.f0 > 0) weights.push(f.weight)
  }

  f0s.sort((a, b) => a - b)
  weights.sort((a, b) => a - b)

  const phonemes = phonemesFor(transcript)
  const brightnessInfo = phonemes
    ? brightness(brightFrames, phonemes, { detail: true })
    : null
  const raw = brightnessInfo?.brightnessScore ?? null
  const brightnessScore = raw === null ? 0 : Math.min(1, Math.max(0.01, raw)) // Clamped
  const phonemeBrightness = new Float32Array(
    phonemes ? phonemes.length : 0,
  ).fill(NaN)
  if (brightnessInfo) {
    for (const row of brightnessInfo.perPhoneme) {
      if (row.status === 'included' && row.median != null) {
        phonemeBrightness[row.index] = row.median
      }
    }
  }

  return {
    brightness: brightnessScore,
    medianF0: Math.round(median(f0s) ?? 0),
    weightDb: Math.round(median(weights) ?? 0),
    phonemeBrightness,
  }
}

/** Stable zero value for chunks with no voiced frames / brightness yet, so
 *  useSyncExternalStore's Object.is snapshot check doesn't see a fresh object
 *  on every read of an uncomputed chunk. */
const EMPTY_DERIVED: ChunkDerived = {
  brightness: 0,
  medianF0: 0,
  weightDb: 0,
  phonemeBrightness: new Float32Array(0),
}

/**
 * useSyncExternalStore source for SpeechStrip. Chunks are mutated in place,
 * so this converts mutations to render signals at three granularities:
 *  - **list** -- structural changes (append/split/merge).
 *  - **per-chunk transcript** -- one row re-renders when its transcript lands.
 *  - **per-chunk derived** -- recomputed lazily on read.
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
        // Mark every chunk dirty: a publish covers patches, appends, import,
        // and the recording seal, any of which may have mutated frames in
        // place. The recompute is deferred to getDerived (lazy), so only
        // rendered chunks pay for it, and repeated marks coalesce.
        for (const chunk of this.#chunkList) {
          this.#dirty.add(chunk)
        }
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

  /** Set or replace the manual transcript text for a chunk, preserving other tiers. */
  setManualTranscript(chunk: AnalysisChunk, text: string): void {
    const existing = this.#transcripts.get(chunk) ?? {}
    this.#transcripts.set(chunk, { ...existing, manual: { text } })
    for (const cb of this.#chunkSubscribers.get(chunk) ?? []) cb()
  }

  /** Remove the manual transcript for a chunk, preserving other tiers. No-op if absent. */
  clearManualTranscript(chunk: AnalysisChunk): void {
    const existing = this.#transcripts.get(chunk)
    if (!existing?.manual) return
    const { manual: _manual, ...rest } = existing
    if (Object.keys(rest).length === 0) {
      this.#transcripts.delete(chunk)
    } else {
      this.#transcripts.set(chunk, rest)
    }
    for (const cb of this.#chunkSubscribers.get(chunk) ?? []) cb()
  }

  // -- per-chunk derived values (brightness, medianF0) --
  // Frames are mutated in place by the analysis pipeline (f0 via patches,
  // lunaBrightness by the align job), so the React compiler can't observe
  // those mutations. Producers mark a chunk dirty (cheap) and notify
  // subscribers. These values are then recomputed in getDerived via
  // useSyncExternalStore.
  #derived = new WeakMap<AnalysisChunk, ChunkDerived | null>()
  #dirty = new WeakSet<AnalysisChunk>()

  /** Snapshot a chunk's derived values, recomputing if dirty. */
  getDerived = (chunk: AnalysisChunk): ChunkDerived => {
    const cached = this.#derived.get(chunk)
    if (!this.#dirty.has(chunk)) return cached ?? EMPTY_DERIVED
    // Lazy recompute: clear dirty, recompute, and keep the old identity if
    // the values didn't change (so useSyncExternalStore bails out of render).
    this.#dirty.delete(chunk)
    const next = computeDerived(chunk, this.#transcripts.get(chunk))
    if (
      cached &&
      cached.brightness === next.brightness &&
      cached.medianF0 === next.medianF0 &&
      cached.weightDb === next.weightDb &&
      phonemeBrightnessEqual(cached.phonemeBrightness, next.phonemeBrightness)
    ) {
      this.#derived.set(chunk, cached)
      return cached
    }
    this.#derived.set(chunk, next)
    return next
  }

  /** Mark a chunk's derived values dirty and notify its subscribers. The
   *  recompute is deferred to the next getDerived read, so multiple marks
   *  within a tick coalesce. Call after any frame mutation the store wouldn't
   *  otherwise see (f0 patches, appends, alignment writing lunaBrightness). */
  notifyChunkFrames(chunk: AnalysisChunk): void {
    this.#dirty.add(chunk)
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

/** Subscribe to a chunk's derived values (e.g., brightness, medianF0, weight).
 * Values are recomputed lazily */
export function useChunkDerived(
  store: TranscriptStore,
  chunk: AnalysisChunk,
): ChunkDerived {
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribeChunk(chunk, onChange),
    [store, chunk],
  )
  const getSnapshot = useCallback(() => store.getDerived(chunk), [store, chunk])
  return useSyncExternalStore(subscribe, getSnapshot)
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
