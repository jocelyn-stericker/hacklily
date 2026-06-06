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

import type { AudioSpan } from '#/lib/audio/AudioSpan'
import type { LocalTranscriptionStatus } from '#/lib/browserFeatures'
import { checkLocalTranscription } from '#/lib/browserFeatures'
import { ModelUnavailableError } from '#/lib/jobs/ModelUnavailableError'
import { clearModelDownloaded, isModelDownloaded } from '#/lib/modelDownload'
import type { WorkerDownloadModel } from '#/lib/modelDownload'
import type { TranscriptionMode } from '#/lib/settings'
import { transcribeWithWorker } from '#/lib/transcription/transcribeBundled'
import { transcribeWeb } from '#/lib/transcription/transcribeWeb'

// The queue's "backend unavailable" signal lives in jobs/ (the generic queue
// catches it); re-exported so transcription callers keep importing it from the
// transcription barrel.
export { ModelUnavailableError }

/** A concrete transcription engine, resolved from a tier upfront. */
export type TranscriptionEngine = 'cloud' | 'browser' | 'moonshine' | 'whisper'

/** The quality tier a transcript result came from. */
export type TranscriptTier = 'small' | 'large' | 'cloud'

/**
 * A transcription job for a chunk: a tier requested beyond whatever is already
 * in `results`. At most one runs per chunk at a time — it's `queued` until it
 * starts, `transcribing` while it runs, and `error` if it fails (the chunk keeps
 * any lower-tier text it already had).
 */
export type TranscriptJob =
  | { tier: TranscriptTier; status: 'queued' }
  | { tier: TranscriptTier; status: 'transcribing' }
  | { tier: TranscriptTier; status: 'error'; error: string }

/**
 * A chunk's transcription state.
 *
 * `results` holds the text each completed tier produced. A higher tier is added
 * *alongside* the lower one rather than replacing it, so upgrading from small to
 * large keeps the small text available (e.g. to show while the upgrade runs).
 * `job`, when present, is the tier currently queued, transcribing, or failed.
 *
 * Representable states include:
 *  - small done:                { results: { small } }
 *  - small done, large queued:  { results: { small }, job: { tier: 'large', status: 'queued' } }
 *  - small done, large running: { results: { small }, job: { tier: 'large', status: 'transcribing' } }
 *  - upgraded to large:         { results: { small, large } }
 */
export type ChunkTranscript = {
  results: Partial<Record<TranscriptTier, string>>
  job?: TranscriptJob
}

/** Highest-tier result text available, preferring large > cloud > small. */
export function bestResult(t: ChunkTranscript): string | undefined {
  return t.results.large ?? t.results.cloud ?? t.results.small
}

/**
 * Whether `chunk` still needs work at `tier`: no result there yet and nothing in
 * flight (a queued or running job). A failed job is eligible to retry. The queue
 * wraps this into the scheduler's `needsWork` predicate.
 */
export function needsTier(
  t: ChunkTranscript | undefined,
  tier: TranscriptTier,
): boolean {
  if (t?.results[tier] !== undefined) return false
  if (t?.job && t.job.status !== 'error') return false
  return true
}

// Marker the transcribe worker prefixes onto an error when the model couldn't be
// loaded (missing or corrupt cached weights, a failed session, a refused offline
// fetch) — see TranscribeWorker.ts. Reaching it means the model isn't usable.
// Duplicated from the worker, which can't be imported here without running on the
// UI thread.
const MODEL_LOAD_FAILED_MARKER = 'transcription model could not be loaded'

function isModelLoadFailure(err: unknown): boolean {
  return err instanceof Error && err.message.includes(MODEL_LOAD_FAILED_MARKER)
}

/**
 * Run a worker model, translating a model *load* failure into
 * `ModelUnavailableError`. The worker is offline, so unusable cached weights
 * (missing, evicted, or corrupt) can't be repaired mid-transcription; we forget
 * the model's "downloaded" flag (so the settings modal re-offers the download).
 * Inference failures after a good load are left as ordinary errors.
 */
async function transcribeWithWorkerChecked(
  audio: AudioSpan,
  model: WorkerDownloadModel,
  label: string,
): Promise<string> {
  try {
    return await transcribeWithWorker(audio, model)
  } catch (err) {
    if (isModelLoadFailure(err)) {
      clearModelDownloaded(model)
      throw new ModelUnavailableError(
        `${label} couldn’t be loaded and needs to be downloaded again.`,
      )
    }
    throw err
  }
}

/** Which concrete engine the "small" tier resolves to. */
export type SmallEngine = 'browser' | 'moonshine'

/**
 * Resolve the "small" tier to a concrete engine: the browser's on-device engine
 * when it's downloaded or downloadable, otherwise the bundled Moonshine model.
 * Shared by the settings modal and the transcribe path so they always agree.
 */
export function resolveSmallEngine(
  local: LocalTranscriptionStatus,
): SmallEngine {
  return local === 'downloaded' || local === 'available'
    ? 'browser'
    : 'moonshine'
}

/**
 * Resolve a transcription tier to a concrete engine, checking that the required
 * model is downloaded. Throws `ModelUnavailableError` when the resolved engine's
 * model hasn't been fetched (the settings modal is the only place that
 * downloads).
 */
async function resolveEngine(
  mode: Exclude<TranscriptionMode, 'disabled'>,
): Promise<TranscriptionEngine> {
  switch (mode) {
    case 'cloud':
      return 'cloud'
    case 'large':
      if (!isModelDownloaded('whisper')) {
        throw new ModelUnavailableError(
          'The large transcription model hasn’t been downloaded.',
        )
      }
      return 'whisper'
    case 'small': {
      const local = await checkLocalTranscription()
      if (resolveSmallEngine(local) === 'browser') {
        if (local !== 'downloaded') {
          throw new ModelUnavailableError(
            'The browser’s on-device speech model hasn’t been downloaded.',
          )
        }
        return 'browser'
      }
      if (!isModelDownloaded('moonshine')) {
        throw new ModelUnavailableError(
          'The small transcription model hasn’t been downloaded.',
        )
      }
      return 'moonshine'
    }
  }
}

/**
 * Resolve a tier to a concrete engine, returning `null` (rather than throwing)
 * when the engine's model isn't downloaded. The queue uses this to stand down
 * and revert the mode instead of failing every chunk.
 */
export async function tryResolveEngine(
  mode: Exclude<TranscriptionMode, 'disabled'>,
): Promise<TranscriptionEngine | null> {
  try {
    return await resolveEngine(mode)
  } catch (err) {
    if (err instanceof ModelUnavailableError) return null
    throw err
  }
}

/**
 * Run recognition for one span with a concrete engine (already resolved). The
 * engine is known to be downloaded — the check happened in `resolveEngine`. A
 * worker model can still throw `ModelUnavailableError` here if its cached weights
 * were evicted or corrupted since the check.
 */
export async function runTranscriptionForEngine(
  engine: TranscriptionEngine,
  audio: AudioSpan,
): Promise<string> {
  switch (engine) {
    case 'cloud':
      return transcribeWeb(audio, false)
    case 'browser':
      return transcribeWeb(audio, true)
    case 'whisper':
      return transcribeWithWorkerChecked(
        audio,
        'whisper',
        'The large transcription model',
      )
    case 'moonshine':
      return transcribeWithWorkerChecked(
        audio,
        'moonshine',
        'The small transcription model',
      )
  }
}
