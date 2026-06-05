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
import type { LocalTranscriptionStatus } from '#/lib/browserFeatures'
import { checkLocalTranscription } from '#/lib/browserFeatures'
import { clearModelDownloaded, isModelDownloaded } from '#/lib/modelDownload'
import type { WorkerDownloadModel } from '#/lib/modelDownload'
import type { TranscriptionMode } from '#/lib/settings'
import { transcribeWithWorker } from '#/lib/transcription/transcribeBundled'
import { transcribeWeb } from '#/lib/transcription/transcribeWeb'

/**
 * Thrown when the engine a tier resolves to isn't actually downloaded — the
 * model was never fetched, or its cached weights were evicted. Distinct from an
 * ordinary inference error.
 */
export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelUnavailableError'
  }
}

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

/**
 * A span of recorded audio handed to transcription: a region of a (possibly
 * still-growing) `SabRope`, identified by the time it starts, plus a promise
 * that resolves with the time it ends once the recording of that span is
 * complete.
 *
 * Times are seconds into the rope (`sample / rope.sampleRate`). Holding the end
 * behind a promise lets a chunk be queued the moment it starts, before the tail
 * of its audio has been recorded; the consumer reads the rope up to `endTime`
 * once it settles. For a finished recording (or an import) the end is already
 * known, so the promise resolves immediately.
 */
export type AudioSpan = {
  rope: SabRope
  /** Seconds into `rope` where the span begins. */
  startTime: number
  /** Seconds into `rope` just past the span's last sample, known once the recording of the span finishes. */
  endTime: Promise<number>
  /**
   * Abandons the transcription of this span. For a span over already-recorded
   * audio this never fires, but the field keeps a single shape for both
   * backends, which race it against `endTime`.
   */
  signal: AbortSignal
}

// A span over already-recorded audio (a finished recording or an import) has
// nothing to cancel, so it carries this never-aborting signal.
const NEVER_ABORT = new AbortController().signal

/**
 * Materialise an `AudioSpan` into a contiguous mono PCM buffer: await its end,
 * then slice `[startTime, endTime)` out of the rope at the rope's sample rate.
 * Clamps to the samples actually present, so a span whose tail hasn't landed
 * yet yields a shorter buffer rather than reading past the rope.
 */
export async function readAudioSpan(audio: AudioSpan): Promise<Float32Array> {
  const endTime = await new Promise<number>((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(audio.signal.reason)
    }
    const cleanup = () => {
      audio.signal.removeEventListener('abort', onAbort)
    }
    audio.signal.addEventListener('abort', onAbort)
    if (audio.signal.aborted) {
      cleanup()
      reject(audio.signal.reason)
      return
    }
    audio.endTime.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (err) => {
        cleanup()
        reject(err)
      },
    )
  })
  const { rope } = audio
  const start = Math.round(audio.startTime * rope.sampleRate)
  const end = Math.min(Math.round(endTime * rope.sampleRate), rope.length)
  const count = Math.max(0, end - start)
  const out = new Float32Array(count)
  if (count > 0) rope.read(out, start, 0, count)
  return out
}

/**
 * Locate the rope and sample offset for `chunk` within the recording timeline.
 * `chunks` is the full analysis timeline; `ropes` are the per-session PCM
 * buffers in `recordingStart` order (rope N holds session N). Returns `null` if
 * the chunk isn't found or its rope isn't available yet.
 */
export function locateChunkRope(
  chunk: AnalysisChunk,
  chunks: readonly AnalysisChunk[],
  ropes: readonly SabRope[],
): { rope: SabRope; startSample: number } | null {
  // Walk the timeline to find which rope holds `chunk` and its sample offset
  // within that rope. Recording sessions are delimited by `recordingStart`, so
  // the rope index advances at each marker and the in-session frame offset
  // resets. An imported timeline carries no markers, so its single rope is
  // index 0 and the offset accumulates from the start.
  let ropeIndex = -1
  let sessionFrameOffset = 0
  let found = false
  for (const c of chunks) {
    if (c.recordingStart) {
      ropeIndex += 1
      sessionFrameOffset = 0
    } else if (ropeIndex === -1) {
      ropeIndex = 0
    }
    if (c === chunk) {
      found = true
      break
    }
    sessionFrameOffset += c.frames.length
  }
  if (!found) return null
  const rope = ropes[ropeIndex]
  if (!rope) return null
  return { rope, startSample: sessionFrameOffset * chunk.timeStepSamples }
}

/**
 * Locate the recorded audio spanning `chunk` within the `SabRope` that holds its
 * recording session, or `null` if that audio isn't available. `chunks` is the
 * full analysis timeline — needed to locate which session `chunk` belongs to and
 * its frame offset within it — and `ropes` are the per-session PCM buffers in
 * `recordingStart` order: rope N holds session N. The returned span's `endTime`
 * resolves immediately to the audio recorded so far, clamped to the rope's
 * length.
 */
export function chunkAudioFromRopes(
  chunk: AnalysisChunk,
  chunks: readonly AnalysisChunk[],
  ropes: readonly SabRope[],
): AudioSpan | null {
  const loc = locateChunkRope(chunk, chunks, ropes)
  if (!loc) return null
  const { rope, startSample } = loc
  // A chunk's `sampleRate` matches its rope's, so frame counts convert directly
  // to rope samples.
  const length = chunk.frames.length * chunk.timeStepSamples
  const end = Math.min(startSample + length, rope.length)
  if (startSample < 0 || startSample >= end) return null

  return {
    rope,
    startTime: startSample / rope.sampleRate,
    // The recording up to here is already on the rope, so the end is known now.
    endTime: Promise.resolve(end / rope.sampleRate),
    signal: NEVER_ABORT,
  }
}
