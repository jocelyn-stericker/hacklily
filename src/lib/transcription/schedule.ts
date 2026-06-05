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

// Pure scheduling decisions for the transcription queue: which chunk to handle
// next, and how the live-recording spans evolve. No React, no side effects, no
// audio I/O — everything is a function of the current chunks, ropes, and
// transcript state. The `TranscriptionQueue` applies the results.

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { SabRope } from '#/lib/audio/SabRope'

import { locateChunkRope } from './index'
import type { ChunkTranscript, TranscriptTier } from './index'

/** A visible time range on the timeline, in seconds. */
export type Viewport = { leftSec: number; rightSec: number }

/**
 * The deferred end + cancellation for a voiced chunk being transcribed while it's
 * still recording. `endTime` resolves once the voiced segment is complete (the
 * recorded span's total duration); aborting abandons the transcription.
 */
export type LiveSpanEntry = {
  abortController: AbortController
  endTime: Promise<number>
  resolveEndTime: (endTime: number) => void
}

/** Look up a chunk's current transcript (from the store), kept pure via injection. */
export type TranscriptLookup = (
  chunk: AnalysisChunk,
) => ChunkTranscript | undefined

/**
 * Whether `chunk` still needs work at `tier`: no result there yet and nothing in
 * flight (a queued or running job). A failed job is eligible to retry.
 */
function needsTier(
  t: ChunkTranscript | undefined,
  tier: TranscriptTier,
): boolean {
  if (t?.results[tier] !== undefined) return false
  if (t?.job && t.job.status !== 'error') return false
  return true
}

/** Whether `chunk`'s time span overlaps `viewport` at all. */
export function chunkVisible(
  chunk: AnalysisChunk,
  viewport: Viewport,
): boolean {
  const durationSec =
    (chunk.frames.length * chunk.timeStepSamples) / chunk.sampleRate
  const endSec = chunk.startTimeSec + durationSec
  return chunk.startTimeSec < viewport.rightSec && endSec > viewport.leftSec
}

/**
 * Pick the next chunk to transcribe at `tier`: the first eligible voiced chunk
 * visible in `viewport`, or — when none is visible — the first eligible one
 * overall (timeline order, so earliest). `attempted` holds chunks already tried
 * this pass (transcribed, skipped for missing audio, or cancelled) so the scan
 * can't loop on them. Returns `null` when nothing is left to do.
 */
export function selectNextChunk(
  chunks: readonly AnalysisChunk[],
  get: TranscriptLookup,
  attempted: ReadonlySet<AnalysisChunk>,
  viewport: Viewport | null,
  tier: TranscriptTier,
): AnalysisChunk | null {
  let firstPending: AnalysisChunk | null = null
  for (const chunk of chunks) {
    if (attempted.has(chunk) || !chunk.voiced) continue
    if (!needsTier(get(chunk), tier)) continue
    if (viewport && chunkVisible(chunk, viewport)) return chunk
    firstPending ??= chunk
  }
  return firstPending
}

export type ReconcileResult = {
  abort: Set<AnalysisChunk>
  resolve: { chunk: AnalysisChunk; span: LiveSpanEntry; endTime: number }[]
  create: AnalysisChunk[]
}

/**
 * Compute how the live spans should change against the current timeline. Pure —
 * the queue applies the side effects (aborting controllers, resolving endTimes,
 * creating entries).
 *
 * - `abort`: spans whose chunk is no longer voiced, or no longer in the array
 *   (split/merged away by re-chunking).
 * - `resolve`: spans whose voiced segment is complete — the chunk is still voiced
 *   but its successor is unvoiced (VAD confirmed the segment ended).
 * - `create`: newly-voiced chunks still needing `tier`, with no span yet (only
 *   while the last rope is unsealed, i.e. still recording).
 */
export function reconcileLiveSpans(
  chunks: readonly AnalysisChunk[],
  liveSpans: ReadonlyMap<AnalysisChunk, LiveSpanEntry>,
  ropes: readonly SabRope[],
  get: TranscriptLookup,
  tier: TranscriptTier,
): ReconcileResult {
  const abort = new Set<AnalysisChunk>()
  const resolve: ReconcileResult['resolve'] = []
  const create: AnalysisChunk[] = []

  for (const [chunk] of liveSpans) {
    if (!chunk.voiced || !chunks.includes(chunk)) abort.add(chunk)
  }

  for (const [chunk, span] of liveSpans) {
    if (abort.has(chunk)) continue
    const idx = chunks.indexOf(chunk)
    const next = chunks[idx + 1]
    if (next && !next.voiced) {
      const loc = locateChunkRope(chunk, chunks, ropes)
      if (loc) {
        const endSample =
          loc.startSample + chunk.frames.length * chunk.timeStepSamples
        resolve.push({ chunk, span, endTime: endSample / loc.rope.sampleRate })
      }
    }
  }

  const lastRope = ropes[ropes.length - 1]
  if (lastRope && !lastRope.sealed) {
    for (const chunk of chunks) {
      if (
        chunk.voiced &&
        needsTier(get(chunk), tier) &&
        !liveSpans.has(chunk)
      ) {
        create.push(chunk)
      }
    }
  }

  return { abort, resolve, create }
}

/**
 * Compute endTime resolutions for all pending live spans when the recording rope
 * is sealed. Each span's endTime is clamped to the rope's actual length. Pure —
 * the queue applies the resolutions.
 */
export function computeSealResolutions(
  chunks: readonly AnalysisChunk[],
  liveSpans: ReadonlyMap<AnalysisChunk, LiveSpanEntry>,
  ropes: readonly SabRope[],
): { span: LiveSpanEntry; endTime: number }[] {
  const resolutions: { span: LiveSpanEntry; endTime: number }[] = []
  for (const [chunk, span] of liveSpans) {
    const loc = locateChunkRope(chunk, chunks, ropes)
    if (loc) {
      const endSample = Math.min(
        loc.startSample + chunk.frames.length * chunk.timeStepSamples,
        loc.rope.length,
      )
      resolutions.push({ span, endTime: endSample / loc.rope.sampleRate })
    }
  }
  return resolutions
}
