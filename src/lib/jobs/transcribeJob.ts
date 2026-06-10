// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import {
  ModelUnavailableError,
  needsTier,
  runTranscriptionForEngine,
  TRANSCRIPT_TIERS,
  tryResolveEngine,
} from '#/lib/transcription'
import type {
  ChunkTranscript,
  TranscriptTier,
  TranscriptionEngine,
} from '#/lib/transcription'

import type { ChunkWork } from './ChunkWorkQueue'

/** The transcript state the job reads and writes (satisfied by TranscriptStore). */
export interface TranscriptSink {
  get: (chunk: AnalysisChunk) => ChunkTranscript | undefined
  set: (chunk: AnalysisChunk, transcript: ChunkTranscript) => void
}

export type TranscribeJobDeps = {
  sink: TranscriptSink
  /** The tier to auto-run, or `null` to transcribe nothing. */
  autoTier: (highQuality: boolean) => TranscriptTier | null
  /** Invoked when the resolved engine's model isn't downloaded. */
  onModelUnavailable: () => void
}

// The resolved context for one transcription pass: which engine does the work,
// and which tier the result is stored under.
type TranscribeCtx = { engine: TranscriptionEngine; tier: TranscriptTier }

/**
 * The transcription kind for `ChunkWorkQueue`: every voiced chunk is
 * transcribed at the auto tier, plus on-demand upgrades to a higher tier (a
 * `queued` job in the sink). Runs with live spans so chunks transcribe while
 * still being recorded.
 */
export function createTranscribeJob(deps: TranscribeJobDeps): ChunkWork {
  return {
    kind: 'transcribe',
    liveSpans: true,
    needsWork: (chunk) => {
      const t = deps.sink.get(chunk)
      // A queued job is an explicit upgrade request -- always work, at its tier.
      for (const tier of TRANSCRIPT_TIERS) {
        if (t?.[tier]?.job?.status === 'queued') {
          return true
        }
      }
      const tier = deps.autoTier(false)
      return tier !== null && needsTier(t, tier)
    },
    resolve: async () => {
      const auto = await resolveCtx(deps.autoTier(false))
      if (!auto) return null
      return (chunk, audio) => transcribeOne(deps, chunk, audio, auto)
    },
    onUnavailable: deps.onModelUnavailable,
  }
}

/**
 * Record an on-demand upgrade of `chunk` to the higher-quality tier (the
 * SpeechStrip button): clear that tier's result and mark it queued. The caller
 * pokes the queue (`scan`) afterwards; the next pass picks it up like any other
 * work and runs it at the queued tier.
 */
export function requestUpgrade(
  deps: Pick<TranscribeJobDeps, 'sink' | 'autoTier'>,
  chunk: AnalysisChunk,
): void {
  const tier = deps.autoTier(true)
  if (!tier) return
  deps.sink.set(chunk, {
    ...deps.sink.get(chunk),
    [tier]: { job: { tier, status: 'queued' } },
  })
}

// Resolve a tier to a concrete engine context, or null to stand down. A null
// tier (disabled) is silent; a missing model reverts the mode.
async function resolveCtx(
  tier: TranscriptTier | null,
): Promise<TranscribeCtx | null> {
  if (!tier) return null
  const engine = await tryResolveEngine(tier)
  return engine ? { engine, tier } : null
}

async function transcribeOne(
  deps: TranscribeJobDeps,
  chunk: AnalysisChunk,
  audio: AudioSpan,
  auto: TranscribeCtx,
): Promise<void> {
  const prior = deps.sink.get(chunk)
  // What tier should we transcribe at? Take the lowest queued upgrade (it
  // completes first), matching the order `needsWork` scans; otherwise the pass's
  // auto tier.
  // TODO: move this into the scheduler
  let tier: TranscriptTier | undefined
  for (const iTier of TRANSCRIPT_TIERS) {
    if (prior?.[iTier]?.job?.status === 'queued') {
      tier = iTier
      break
    }
  }
  tier ??= auto.tier

  // Claim the chunk synchronously (before the first await) so a concurrent pass
  // skips it.
  deps.sink.set(chunk, {
    ...prior,
    [tier]: {
      job: { tier, status: 'transcribing' },
    },
  })

  try {
    // Reuse the pass engine when the tier matches; resolve an upgrade tier lazily
    // (only for the chunk that requested it).
    let engine = auto.engine
    if (tier !== auto.tier) {
      const upgraded = await tryResolveEngine(tier)
      if (!upgraded) {
        throw new ModelUnavailableError(
          'The requested transcription model isn’t available.',
        )
      }
      engine = upgraded
    }
    const text = await runTranscriptionForEngine(engine, audio)
    const cur = deps.sink.get(chunk)
    deps.sink.set(chunk, { ...cur, [tier]: { text } })
  } catch (err) {
    if (audio.signal.aborted) {
      // Cancelled (re-chunked, or too short to be speech): leave untranscribed.
      deps.sink.set(chunk, withoutTier(deps.sink.get(chunk), tier))
      return
    }
    if (err instanceof ModelUnavailableError) {
      // Drop the in-flight job; the queue reverts the mode.
      deps.sink.set(chunk, withoutTier(deps.sink.get(chunk), tier))
      throw err
    }
    const cur = deps.sink.get(chunk)
    deps.sink.set(chunk, {
      ...cur,
      [tier]: {
        job: {
          tier,
          status: 'error',
          error: err instanceof Error ? err.message : 'Transcription failed',
        },
      },
    })
  }
}

/** A copy of `t` with `tier` removed entirely (no lingering empty result). */
export function withoutTier(
  t: ChunkTranscript | undefined,
  tier: TranscriptTier,
): ChunkTranscript {
  const next = { ...t }
  delete next[tier]
  return next
}
