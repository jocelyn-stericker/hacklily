// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Pure scheduling decisions for a chunk work queue: which voiced chunk to handle
// next, and how the live-recording spans evolve. No React, no side effects, no
// audio I/O -- everything is a function of the current chunks, ropes, and an
// injected `needsWork` predicate. The queue applies the results.

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { AudioRope } from '#/lib/audio/AudioRope'
import { locateChunkRope } from '#/lib/audio/AudioSpan'

/** A visible time range on the timeline, in seconds. */
export type Viewport = { leftSec: number; rightSec: number }

/**
 * The deferred end + cancellation for a voiced chunk being worked on while it's
 * still recording. `endTime` resolves once the voiced segment is complete (the
 * recorded span's total duration); aborting abandons the work.
 */
export type LiveSpanEntry = {
  abortController: AbortController
  endTime: Promise<number>
  resolveEndTime: (endTime: number) => void
}

/**
 * Whether a chunk still needs work under the current configuration, injected by
 * the domain queue so the scheduler stays policy-free (transcription asks "no
 * result at this tier and nothing in flight"; alignment asks "has a transcript
 * but no alignment yet"). Only ever asked about voiced chunks.
 */
export type NeedsWork = (chunk: AnalysisChunk) => boolean

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

/** A unit of pending work: a `kind` of job to run on a `chunk`. */
export type CandidateJob = { kind: string; chunk: AnalysisChunk }

/**
 * Chooses which eligible job runs next, or `null` to end the pass. Pure, so it's
 * cheap to swap and test -- this is the scheduling-policy seam the queue defers to
 * after every job (re-prioritising as new work appears mid-pass).
 */
export type PickNext = (
  jobs: readonly CandidateJob[],
  viewport: Viewport | null,
) => CandidateJob | null

/**
 * Default policy: lower index in `kindOrder` wins (e.g. `['align', 'transcribe']`
 * runs alignment before transcription); within a kind, a viewport-visible chunk
 * beats an off-screen one, then earliest on the timeline. Reorder `kindOrder` to
 * retune cross-kind priority.
 */
export function priorityPickNext(kindOrder: readonly string[]): PickNext {
  const rank = (kind: string) => {
    const i = kindOrder.indexOf(kind)
    return i === -1 ? kindOrder.length : i
  }
  return (jobs, viewport) => {
    let best: CandidateJob | null = null
    let bestScore: readonly [number, number, number] | null = null
    for (const job of jobs) {
      const visible = viewport && chunkVisible(job.chunk, viewport) ? 0 : 1
      const score = [rank(job.kind), visible, job.chunk.startTimeSec] as const
      if (!bestScore || isLess(score, bestScore)) {
        best = job
        bestScore = score
      }
    }
    return best
  }
}

// Lexicographic compare of equal-length numeric tuples.
function isLess(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i]! < b[i]!) return true
    if (a[i]! > b[i]!) return false
  }
  return false
}

export type ReconcileResult = {
  abort: Set<AnalysisChunk>
  resolve: { chunk: AnalysisChunk; span: LiveSpanEntry; endTime: number }[]
  create: AnalysisChunk[]
}

/**
 * Compute how the live spans should change against the current timeline. Pure --
 * the queue applies the side effects (aborting controllers, resolving endTimes,
 * creating entries).
 *
 * - `abort`: spans whose chunk is no longer voiced, or no longer in the array
 *   (split/merged away by re-chunking).
 * - `resolve`: spans whose voiced segment is complete -- the chunk is still voiced
 *   but its successor is unvoiced (VAD confirmed the segment ended).
 * - `create`: voiced chunks still needing work (`needsWork`), with no span yet
 *   (only while the last rope is unsealed, i.e. still recording).
 */
export function reconcileLiveSpans(
  chunks: readonly AnalysisChunk[],
  liveSpans: ReadonlyMap<AnalysisChunk, LiveSpanEntry>,
  ropes: readonly AudioRope[],
  needsWork: NeedsWork,
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
      if (chunk.voiced && needsWork(chunk) && !liveSpans.has(chunk)) {
        create.push(chunk)
      }
    }
  }

  return { abort, resolve, create }
}

/**
 * Compute endTime resolutions for all pending live spans when the recording rope
 * is sealed. Each span's endTime is clamped to the rope's actual length. Pure --
 * the queue applies the resolutions.
 */
export function computeSealResolutions(
  chunks: readonly AnalysisChunk[],
  liveSpans: ReadonlyMap<AnalysisChunk, LiveSpanEntry>,
  ropes: readonly AudioRope[],
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
