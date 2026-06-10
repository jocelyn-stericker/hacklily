// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AnalysisChunk } from '../analysis/AnalysisFrame'
import type { AudioRope } from './AudioRope'

/**
 * A span of recorded audio: a region of a (possibly still-growing) `AudioRope`,
 * identified by the time it starts, plus a promise that resolves with the
 * time it ends once the recording of that span is complete.
 *
 * Times are seconds into the rope (`sample / rope.sampleRate`). Holding the end
 * behind a promise lets a chunk be queued the moment it starts, before the tail
 * of its audio has been recorded; the consumer reads the rope up to `endTime`
 * once it settles. For a finished recording (or an import) the end is already
 * known, so the promise resolves immediately.
 */
export type AudioSpan = {
  rope: AudioRope
  /** Seconds into `rope` where the span begins. */
  startTime: number
  /** Seconds into `rope` just past the span's last sample, known once the recording of the span finishes. */
  endTime: Promise<number>
  /**
   * Notifies that the span is no longer valid (e.g., voiced span becomes unvoiced).
   * For a span over already-recorded audio this never fires, but the field
   * keeps a single shape for both backends, which race it against `endTime`.
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
  ropes: readonly AudioRope[],
): { rope: AudioRope; startSample: number } | null {
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
 * Locate the recorded audio spanning `chunk` within the `AudioRope` that holds its
 * recording session, or `null` if that audio isn't available. `chunks` is the
 * full analysis timeline -- needed to locate which session `chunk` belongs to and
 * its frame offset within it -- and `ropes` are the per-session PCM buffers in
 * `recordingStart` order: rope N holds session N. The returned span's `endTime`
 * resolves immediately to the audio recorded so far, clamped to the rope's
 * length.
 */
export function chunkAudioFromRopes(
  chunk: AnalysisChunk,
  chunks: readonly AnalysisChunk[],
  ropes: readonly AudioRope[],
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
