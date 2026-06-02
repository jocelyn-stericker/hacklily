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
import type { SabRope } from '#/lib/SabRope'
import type { SettingsRow } from '#/lib/settings'
import { transcribeBundled } from '#/lib/transcribeBundled'
import { transcribeWeb } from '#/lib/transcribeWeb'
import { ensureWebEngineInstalled } from '#/lib/transcribeWebInstall'

const LOG = '[Transcription]'

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
  const endTime = await audio.endTime
  const { rope } = audio
  const start = Math.round(audio.startTime * rope.sampleRate)
  const end = Math.min(Math.round(endTime * rope.sampleRate), rope.length)
  const count = Math.max(0, end - start)
  const out = new Float32Array(count)
  if (count > 0) rope.read(out, start, 0, count)
  return out
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

  // A chunk's `sampleRate` matches its rope's, so frame counts convert directly
  // to rope samples.
  const offset = sessionFrameOffset * chunk.timeStepSamples
  const length = chunk.frames.length * chunk.timeStepSamples
  const end = Math.min(offset + length, rope.length)
  if (offset < 0 || offset >= end) return null

  return {
    rope,
    startTime: offset / rope.sampleRate,
    // The recording up to here is already on the rope, so the end is known now.
    endTime: Promise.resolve(end / rope.sampleRate),
    signal: NEVER_ABORT,
  }
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
 * The "browser" and "cloud" modes run the Web Speech API on the chunk's audio
 * (on-device vs. allowing the user agent's remote service, respectively). The
 * "bundled" mode runs the Moonshine model in a web worker.
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
    let text: string
    switch (settings.transcriptionMode) {
      case 'browser':
        // The browser may need to download its on-device model on first use.
        // Block recognition until it's ready so the UI can surface a progress
        // modal instead of letting the chunk hang silently.
        await ensureWebEngineInstalled()
        text = await transcribeWeb(audio, true)
        break
      case 'cloud':
        text = await transcribeWeb(audio, false)
        break
      case 'bundled':
        text = await transcribeBundled(audio)
        break
    }
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
    chunk.transcription = {
      status: 'error',
      error: err instanceof Error ? err.message : 'Transcription failed',
    }
  }
  onUpdate?.()
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

export function transcribeChunks(
  chunks: AnalysisChunk[],
  settings: SettingsRow,
  getAudio: ChunkAudioProvider,
  onUpdate?: () => void,
): void {
  if (settings.transcriptionMode === 'disabled') return
  // Keep `chunksChain` always-resolving so a thrown pass (e.g. getAudio failing)
  // can't wedge the chain and silently stop all later transcription.
  chunksChain = chunksChain.then(() =>
    transcribeChunksSequential(chunks, settings, getAudio, onUpdate).catch(
      (err) => {
        console.warn(LOG, 'sequential pass failed:', err)
      },
    ),
  )
}

async function transcribeChunksSequential(
  chunks: AnalysisChunk[],
  settings: SettingsRow,
  getAudio: ChunkAudioProvider,
  onUpdate?: () => void,
): Promise<void> {
  for (const chunk of chunks) {
    if (!chunk.voiced || chunk.transcription) continue
    const audio = getAudio(chunk)
    if (!audio) continue
    // transcribeChunk claims the chunk synchronously (sets `pending` before its
    // first await) and swallows its own errors, so awaiting here never throws
    // and a queued pass won't re-pick a chunk this one has started.
    await transcribeChunk(chunk, settings, audio, onUpdate)
  }
}
