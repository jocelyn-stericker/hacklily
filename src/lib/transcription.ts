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

import type { AnalysisChunk } from '#/lib/AnalysisFrame'
import type { LocalTranscriptionStatus } from '#/lib/browserFeatures'
import { checkLocalTranscription } from '#/lib/browserFeatures'
import { clearModelDownloaded, isModelDownloaded } from '#/lib/modelDownload'
import type { WorkerDownloadModel } from '#/lib/modelDownload'
import type { SabRope } from '#/lib/SabRope'
import type { SettingsRow } from '#/lib/settings'
import { transcribeWithWorker } from '#/lib/transcribeBundled'
import { transcribeWeb } from '#/lib/transcribeWeb'

const LOG = '[Transcription]'

/**
 * Thrown when the engine a tier resolves to isn't actually downloaded — the
 * model was never fetched, or its cached weights were evicted. Distinct from an
 * ordinary inference error: the orchestrator reverts the transcription mode
 * rather than marking the chunk as failed (see `onModelUnavailable`).
 */
export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelUnavailableError'
  }
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
 * the model's "downloaded" flag (so the settings modal re-offers the download)
 * and let the caller revert the mode. Inference failures after a good load are
 * left as ordinary per-chunk errors.
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
 * Status and result of transcribing a chunk. Absent (`undefined`) means
 * transcription has not been requested for the chunk.
 */
export type TranscriptionState =
  | { status: 'pending' }
  | { status: 'done'; text: string }
  | { status: 'error'; error: string }

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
   * Abandons the transcription of this span — e.g. a provisionally-voiced buffer
   * turned out too short to be speech. Orthogonal to `endTime`: it can fire
   * before the span ends, mid-recognition, or for reasons unrelated to the span
   * (teardown, a superseding re-scan). A cancelled chunk is left untranscribed.
   */
  signal: AbortSignal
}

// A span over already-recorded audio (a finished recording or an import) has
// nothing to cancel, so it carries this never-aborting signal. Live spans built
// by the recording lifecycle supply their own.
const NEVER_ABORT = new AbortController().signal

/**
 * Supplies the recorded audio spanning a chunk, or `null` if the audio for the
 * chunk is unavailable yet. The caller owns sourcing the audio (e.g. from the
 * recorded `SabRope`s); transcription only consumes it.
 */
export type ChunkAudioProvider = (chunk: AnalysisChunk) => AudioSpan | null

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
  chunks: AnalysisChunk[],
  ropes: SabRope[],
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
 * Locate the recorded audio spanning `chunk` within the `SabRope` that holds
 * its recording session, or `null` if that audio isn't available. `chunks` is
 * the full analysis timeline — needed to locate which session `chunk` belongs
 * to and its frame offset within it — and `ropes` are the per-session PCM
 * buffers in `recordingStart` order: rope N holds session N.
 *
 * Returns `null` when the rope hasn't grown to cover the chunk yet, so a
 * still-growing session transcribes each chunk as its PCM lands and a later
 * pass retries whatever wasn't ready. Suitable for building a
 * `ChunkAudioProvider` bound to the recording's ropes. The returned span's
 * `endTime` resolves immediately to the audio recorded so far, clamped to the
 * rope's length.
 */
export function chunkAudioFromRopes(
  chunk: AnalysisChunk,
  chunks: AnalysisChunk[],
  ropes: SabRope[],
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

/**
 * A live transcription span entry: a deferred `endTime` and an `AbortController`
 * for a voiced chunk being transcribed during recording. The component maintains
 * a `Map<AnalysisChunk, LiveSpanEntry>` and reconciles it on each voicing patch.
 */
export type LiveSpanEntry = {
  abortController: AbortController
  endTimePromise: Promise<number>
  resolveEndTime: (endTime: number) => void
}

/**
 * Result of reconciling live transcription spans against the current chunk
 * timeline. The caller applies the side effects: aborting controllers, resolving
 * endTimes, and creating new entries for `create` chunks.
 */
export type ReconcileResult = {
  abort: Set<AnalysisChunk>
  resolve: { chunk: AnalysisChunk; span: LiveSpanEntry; endTime: number }[]
  create: AnalysisChunk[]
}

/**
 * Compute which live spans to abort, which to resolve, and which new chunks
 * need spans, given the current chunk timeline and existing live spans. Pure —
 * does not mutate `liveSpans` or abort controllers.
 *
 * - `abort`: chunks no longer voiced or no longer in the array (split/merged
 *   away by `reconcileVoicingAt`).
 * - `resolve`: spans whose voiced segment is complete — the chunk is still
 *   voiced but its successor is unvoiced (VAD confirmed speech end).
 * - `create`: newly-voiced chunks without a span or transcription (only while
 *   the last rope is not sealed).
 */
export function reconcileLiveSpans(
  chunks: AnalysisChunk[],
  liveSpans: Map<AnalysisChunk, LiveSpanEntry>,
  ropes: SabRope[],
): ReconcileResult {
  const abort = new Set<AnalysisChunk>()
  const resolve: ReconcileResult['resolve'] = []
  const create: AnalysisChunk[] = []

  for (const [chunk] of liveSpans) {
    if (!chunk.voiced || !chunks.includes(chunk)) {
      abort.add(chunk)
    }
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
        resolve.push({
          chunk,
          span,
          endTime: endSample / loc.rope.sampleRate,
        })
      }
    }
  }

  const lastRope = ropes[ropes.length - 1]
  if (lastRope && !lastRope.sealed) {
    for (const chunk of chunks) {
      if (chunk.voiced && !chunk.transcription && !liveSpans.has(chunk)) {
        create.push(chunk)
      }
    }
  }

  return { abort, resolve, create }
}

/**
 * Compute endTime resolutions for all pending live spans when the recording rope
 * is sealed. Each span's endTime is clamped to the rope's actual length. Pure —
 * the caller applies the resolutions.
 */
export function computeSealResolutions(
  chunks: AnalysisChunk[],
  liveSpans: Map<AnalysisChunk, LiveSpanEntry>,
  ropes: SabRope[],
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

/**
 * Transcribe a single chunk, filling in its `transcription` field as the work
 * progresses. The chunk is mutated in place; `onUpdate` is invoked after each
 * status change so callers can re-render (the analysis array is mutated in
 * place and does not otherwise trigger React updates).
 *
 * `audio` is the chunk's recorded audio span, materialised to PCM by each
 * backend as needed.
 *
 * Models are never downloaded here — that only happens in the settings modal.
 * If the engine a tier resolves to isn't downloaded, this throws
 * `ModelUnavailableError` (caught and propagated so the orchestrator can revert
 * the mode), rather than marking the chunk as a normal failure.
 */
export async function transcribeChunk(
  chunk: AnalysisChunk,
  settings: SettingsRow,
  audio: AudioSpan,
  onUpdate?: () => void,
): Promise<void> {
  if (settings.transcriptionMode === 'disabled') return
  if (chunk.transcription) return

  chunk.transcription = { status: 'pending' }
  onUpdate?.()

  try {
    const text = await runTranscription(settings.transcriptionMode, audio)
    chunk.transcription = { status: 'done', text }
  } catch (err) {
    if (audio.signal.aborted) {
      // Cancelled, not failed (e.g. the buffer was too short to be speech).
      // Leave the chunk untranscribed rather than surfacing an error; whatever
      // cancelled it owns excluding it from a later pass (e.g. clearing `voiced`).
      chunk.transcription = undefined
      onUpdate?.()
      return
    }
    if (err instanceof ModelUnavailableError) {
      // The selected model isn't usable. Leave the chunk untranscribed and let
      // the caller revert the mode (one toast, not a per-chunk error each).
      chunk.transcription = undefined
      onUpdate?.()
      throw err
    }
    chunk.transcription = {
      status: 'error',
      error: err instanceof Error ? err.message : 'Transcription failed',
    }
  }
  onUpdate?.()
}

/**
 * Run the recognition for one span under the given tier, resolving "small" to a
 * concrete engine. Throws `ModelUnavailableError` when the resolved engine's
 * model hasn't been downloaded (the settings modal is the only place that
 * downloads). The "cloud" tier needs no download.
 */
async function runTranscription(
  mode: Exclude<SettingsRow['transcriptionMode'], 'disabled'>,
  audio: AudioSpan,
): Promise<string> {
  switch (mode) {
    case 'cloud':
      return transcribeWeb(audio, false)
    case 'large':
      if (!isModelDownloaded('whisper')) {
        throw new ModelUnavailableError(
          'The large transcription model hasn’t been downloaded.',
        )
      }
      return transcribeWithWorkerChecked(
        audio,
        'whisper',
        'The large transcription model',
      )
    case 'small': {
      const local = await checkLocalTranscription()
      if (resolveSmallEngine(local) === 'browser') {
        if (local !== 'downloaded') {
          throw new ModelUnavailableError(
            'The browser’s on-device speech model hasn’t been downloaded.',
          )
        }
        return transcribeWeb(audio, true)
      }
      if (!isModelDownloaded('moonshine')) {
        throw new ModelUnavailableError(
          'The small transcription model hasn’t been downloaded.',
        )
      }
      return transcribeWithWorkerChecked(
        audio,
        'moonshine',
        'The small transcription model',
      )
    }
  }
}

/**
 * Kick off transcription for every voiced chunk that hasn't been transcribed
 * yet. Each chunk is transcribed independently; `onUpdate` fires as results
 * arrive. No-op when transcription is disabled.
 *
 * A chunk whose PCM isn't available yet (e.g. the audio hasn't been appended to
 * the recording buffer) is left untouched rather than started and failed, so a
 * later call — once the PCM has arrived — will pick it up.
 */
// Bundled, browser, and cloud transcription all process one chunk at a time
// (the worker, and the Web Speech API, are each single-session). Running the
// scan sequentially — slicing a chunk's PCM only when it's that chunk's turn,
// and awaiting it before the next — keeps just one chunk of audio resident at a
// time instead of materialising every voiced chunk's samples up front. The
// scans are serialised through a single chain so an effect that re-fires mid-run
// (e.g. on each new analysis frame) queues behind the current pass rather than
// racing it; by the time a queued pass runs, chunks already claimed below are
// skipped.
let chunksChain: Promise<void> = Promise.resolve()

// Bumped by `invalidateTranscriptions` so a scan that began under an
// outdated model (e.g. before the user switched models) abandons itself
// instead of refilling the just-cleared chunks with stale results — which the
// fresh scan would then skip as already-transcribed. Each sequential pass
// captures the value live when it starts running and bails the moment it no
// longer matches.
let scanGeneration = 0

/**
 * Discard every chunk's transcription so a subsequent `transcribeChunks` pass
 * redoes them — used when the selected model changes and the existing text was
 * produced by a different engine. Supersedes any in-flight scan (see
 * `scanGeneration`) so it can't keep writing old-model results past the switch.
 * The caller still triggers the fresh pass (and re-renders any overlay).
 */
export function invalidateTranscriptions(chunks: AnalysisChunk[]): void {
  scanGeneration += 1
  for (const chunk of chunks) {
    if (chunk.transcription) chunk.transcription = undefined
  }
}

export function transcribeChunks(
  chunks: AnalysisChunk[],
  settings: SettingsRow,
  getAudio: ChunkAudioProvider,
  onUpdate?: () => void,
  // Invoked when the selected model turns out not to be downloaded. The caller
  // is expected to revert the mode (and typically surface a toast).
  onModelUnavailable?: () => void,
): void {
  if (settings.transcriptionMode === 'disabled') return
  // Keep `chunksChain` always-resolving so a thrown pass (e.g. getAudio failing)
  // can't wedge the chain and silently stop all later transcription.
  chunksChain = chunksChain.then(() =>
    transcribeChunksSequential(
      chunks,
      settings,
      getAudio,
      onUpdate,
      onModelUnavailable,
    ).catch((err) => {
      console.warn(LOG, 'sequential pass failed:', err)
    }),
  )
}

async function transcribeChunksSequential(
  chunks: AnalysisChunk[],
  settings: SettingsRow,
  getAudio: ChunkAudioProvider,
  onUpdate?: () => void,
  onModelUnavailable?: () => void,
): Promise<void> {
  const generation = scanGeneration
  for (const chunk of chunks) {
    // A model switch invalidated this pass mid-run; stop rather than refill the
    // cleared chunks with results from the now-superseded model.
    if (scanGeneration !== generation) return
    if (!chunk.voiced || chunk.transcription) continue
    const audio = getAudio(chunk)
    if (!audio) continue
    // transcribeChunk claims the chunk synchronously (sets `pending` before its
    // first await) and swallows its own errors, so awaiting here never throws —
    // except `ModelUnavailableError`, which it rethrows so we can stop the pass
    // and let the caller revert the mode rather than failing every chunk.
    try {
      await transcribeChunk(chunk, settings, audio, onUpdate)
    } catch (err) {
      if (err instanceof ModelUnavailableError) {
        onModelUnavailable?.()
        return
      }
      throw err
    }
  }
}
