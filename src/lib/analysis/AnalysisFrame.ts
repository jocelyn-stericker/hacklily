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

const LN10_10 = 10 / Math.log(10)

// Parameters shared by all frames within a chunk. Constant across one recording
// or import session; a new AnalysisChunk is created if these ever change.
export type AnalysisParams = {
  timeStepSamples: number
  sampleRate: number
  freqStepHz: number
  // Center of first frequency bin
  firstBinHz: number
}

export type AnalysisFrame = {
  spectrum: Float32Array
  rms: number
  // Silero VAD speech probability (0 = silence, 1 = speech)
  speechProbability: number
  // True when pitch analysis detected a voiced frame (f0 > 0)
  pitchDetected: boolean
  // True when VAD determined we are in a voiced speech segment (includes pre-roll and post-roll)
  speechDetected: boolean
  f0: number // 0 when unvoiced
  f1: number | null // null when pitch undetected or formant not detected
  f2: number | null
  f3: number | null
}

export type AnalysisChunk = AnalysisParams & {
  frames: AnalysisFrame[]
  // Time in seconds of the first frame of this chunk, relative to the start of the session.
  startTimeSec: number
  // The chunk's single speech-detected value. Chunks are split at voicing
  // boundaries, so every frame in a chunk shares this value (invariant), and
  // `voiced` is that value — equivalently `framesVoiced(frames)`. Maintained in
  // batch by `framesToChunks` (offline) and incrementally by `reconcileVoicingAt`
  // (realtime patches).
  voiced: boolean
  // True for the first chunk of a recording session. Recordings are independent
  // — they may use different sample rates / analysis params, and the spectrogram
  // dB-normalizes within a chunk — so a chunk must never span a recording
  // boundary. `mergeChunkAt` refuses to merge such a chunk into its predecessor.
  recordingStart?: boolean
}

// True if any frame is voiced. Used to set AnalysisChunk.voiced at construction
// and to recompute it after a chunk is split.
export function framesVoiced(frames: AnalysisFrame[]): boolean {
  return frames.some((f) => f.speechDetected)
}

// Frames confirmed voiced by both pitch and VAD, with F1 and F2 present. Used as a type predicate in VowelChart.
export type VoicedAnalysisFrame = AnalysisFrame & {
  pitchDetected: true
  speechDetected: true
  f1: number
  f2: number
}

export function splitChunkAt(
  chunks: AnalysisChunk[],
  globalIndex: number,
): boolean {
  let offset = 0
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!
    const chunkEnd = offset + chunk.frames.length
    if (globalIndex < chunkEnd) {
      const localIndex = globalIndex - offset
      if (localIndex === 0) return false
      const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
      const newFrames = chunk.frames.splice(localIndex)
      const newChunk: AnalysisChunk = {
        timeStepSamples: chunk.timeStepSamples,
        sampleRate: chunk.sampleRate,
        freqStepHz: chunk.freqStepHz,
        firstBinHz: chunk.firstBinHz,
        startTimeSec: chunk.startTimeSec + localIndex * timeStepSec,
        frames: newFrames,
        voiced: framesVoiced(newFrames),
      }
      chunk.voiced = framesVoiced(chunk.frames)
      chunks.splice(i + 1, 0, newChunk)
      return true
    }
    offset = chunkEnd
  }
  return false
}

export function totalFrames(chunks: AnalysisChunk[]): number {
  return chunks.reduce((sum, c) => sum + c.frames.length, 0)
}

// Split a flat, time-ordered frame list into chunks at every speechDetected
// transition. Each resulting chunk holds frames of a single speechDetected
// value with `voiced` set to match, satisfying the AnalysisChunk invariants by
// construction. Used by offline analysis; the realtime path keeps the same
// invariants incrementally via reconcileVoicingAt.
export function framesToChunks(
  frames: AnalysisFrame[],
  params: AnalysisParams,
  startTimeSec: number,
): AnalysisChunk[] {
  const timeStepSec = params.timeStepSamples / params.sampleRate
  const chunks: AnalysisChunk[] = []
  let start = 0
  while (start < frames.length) {
    const voiced = frames[start]!.speechDetected
    let end = start + 1
    while (end < frames.length && frames[end]!.speechDetected === voiced) end++
    chunks.push({
      ...params,
      startTimeSec: startTimeSec + start * timeStepSec,
      frames: frames.slice(start, end),
      voiced,
    })
    start = end
  }
  return chunks
}

// The chunk holding the frame at globalIndex, or undefined if out of range.
function chunkContaining(
  chunks: AnalysisChunk[],
  globalIndex: number,
): AnalysisChunk | undefined {
  if (globalIndex < 0) return undefined
  let offset = 0
  for (const chunk of chunks) {
    offset += chunk.frames.length
    if (globalIndex < offset) return chunk
  }
  return undefined
}

// Merge the chunk that begins exactly at globalIndex into the preceding chunk,
// keeping `voiced` in sync. No-op (returns false) if no chunk starts there, it
// is the first chunk, it begins a recording session, or the two chunks' time
// base differs — in those cases the boundary is meaningful and must be kept.
// Frames keep their order, so the merged chunk stays time-contiguous under the
// preceding chunk's clock.
export function mergeChunkAt(
  chunks: AnalysisChunk[],
  globalIndex: number,
): boolean {
  if (globalIndex <= 0) return false
  let offset = 0
  for (let i = 0; i < chunks.length; i++) {
    if (offset === globalIndex) {
      const prev = chunks[i - 1]
      const cur = chunks[i]!
      if (
        !prev ||
        cur.recordingStart ||
        prev.timeStepSamples !== cur.timeStepSamples ||
        prev.sampleRate !== cur.sampleRate
      ) {
        return false
      }
      for (const frame of cur.frames) prev.frames.push(frame)
      prev.voiced = framesVoiced(prev.frames)
      chunks.splice(i, 1)
      return true
    }
    offset += chunks[i]!.frames.length
    if (offset > globalIndex) return false
  }
  return false
}

// Re-establish the AnalysisChunk invariants after the frame at globalIndex
// changed its speechDetected value (e.g. a VAD patch): every chunk holds frames
// of a single speechDetected value, and chunk.voiced equals that value. Only the
// boundaries immediately before and after the changed frame can be affected, so
// this isolates that frame and then coalesces it with like-voiced neighbours —
// an O(local) fix rather than re-splitting the whole timeline. Returns true if
// the frame's chunk actually changed voicing (so callers can refresh dependent
// state); false for a no-op re-confirmation.
export function reconcileVoicingAt(
  chunks: AnalysisChunk[],
  globalIndex: number,
): boolean {
  const chunk = chunkContaining(chunks, globalIndex)
  const frame = getFrame(chunks, globalIndex)
  if (!chunk || !frame) return false

  const voiced = frame.speechDetected
  // Coming in, the chunk was uniform (invariant held), so its `voiced` flag
  // still reflects the frame's previous value. If it already matches, the patch
  // didn't flip this frame and the layout is unchanged.
  if (chunk.voiced === voiced) return false

  // Isolate the changed frame so no chunk is left holding mixed values, then
  // merge it back into either neighbour that shares its voicing.
  splitChunkAt(chunks, globalIndex)
  splitChunkAt(chunks, globalIndex + 1)
  if (getFrame(chunks, globalIndex - 1)?.speechDetected === voiced)
    mergeChunkAt(chunks, globalIndex)
  if (getFrame(chunks, globalIndex + 1)?.speechDetected === voiced)
    mergeChunkAt(chunks, globalIndex + 1)
  return true
}

export function getFrame(
  chunks: AnalysisChunk[],
  index: number,
): AnalysisFrame | undefined {
  let remaining = index
  for (const chunk of chunks) {
    if (remaining < chunk.frames.length) return chunk.frames[remaining]
    remaining -= chunk.frames.length
  }
  return undefined
}

// Returns the start time (in seconds) of the frame at globalIndex.
// Uses strict < so a boundary index (= offset of the next chunk) falls
// through to the start of the next chunk rather than the end of the prev.
export function frameTimeSec(
  chunks: AnalysisChunk[],
  globalIndex: number,
): number {
  let offset = 0
  for (const chunk of chunks) {
    const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
    const chunkEnd = offset + chunk.frames.length
    if (globalIndex < chunkEnd) {
      return chunk.startTimeSec + (globalIndex - offset) * timeStepSec
    }
    offset = chunkEnd
  }
  const last = chunks[chunks.length - 1]
  if (!last) return 0
  return (
    last.startTimeSec +
    last.frames.length * (last.timeStepSamples / last.sampleRate)
  )
}

export function frameDbMax(frame: AnalysisFrame): number | null {
  let max = -Infinity
  for (const raw of frame.spectrum) {
    if (raw > 0) {
      const db = LN10_10 * Math.log(raw)
      if (db > max) max = db
    }
  }
  return isFinite(max) ? max : null
}

export function computeDbMax(
  chunks: AnalysisChunk[],
  from = 0,
  to = Infinity,
): number | null {
  let maxDb = -Infinity
  let idx = 0
  outer: for (const chunk of chunks) {
    for (const frame of chunk.frames) {
      if (idx >= to) break outer
      if (idx >= from) {
        for (const raw of frame.spectrum) {
          if (raw > 0) {
            const db = LN10_10 * Math.log(raw)
            if (db > maxDb) maxDb = db
          }
        }
      }
      idx++
    }
  }
  return isFinite(maxDb) ? maxDb : null
}
