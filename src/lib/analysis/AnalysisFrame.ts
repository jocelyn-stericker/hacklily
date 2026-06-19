// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

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
  speechDetected: boolean | null
  f0: number // 0 when unvoiced
  f1: number | null // null when pitch undetected or formant not detected
  f2: number | null
  f3: number | null
  lunaBrightness: number | null
}

export type AnalysisChunk = AnalysisParams & {
  frames: AnalysisFrame[]
  // Time in seconds of the first frame of this chunk, relative to the start of the session.
  startTimeSec: number
  // The chunk's single speech-detected value. Chunks are split at voicing
  // boundaries, so every frame in a chunk shares this value (invariant), and
  // `voiced` is that value -- equivalently `framesVoiced(frames)`. Maintained in
  // batch by `framesToChunks` (offline) and incrementally by `reconcileVoicingAt`
  // (realtime patches). `null` means pending.
  voiced: boolean | null
  // True for the first chunk of a recording session. Recordings are independent
  // -- they may use different sample rates / analysis params, and the spectrogram
  // dB-normalizes within a chunk -- so a chunk must never span a recording
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
// transition.
//
// Offlien analysis only. The realtime path keeps invariants via reconcileVoicingAt.
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
    while (
      end < frames.length &&
      (frames[end]!.speechDetected === voiced ||
        // i.e., if speech analysis isn't complete yet, assume it's the same as the previous frame until we know more.
        frames[end]!.speechDetected === null)
    )
      end++
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
// base differs -- in those cases the boundary is meaningful and must be kept.
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

// The settled voicing of a chunk: chunk.voiced once confirmed, or -- while the
// chunk is still pending (voiced === null) -- the value shared by its other
// non-pending frames. Returns null only when no sibling has resolved yet.
function settledVoicing(
  chunk: AnalysisChunk,
  exclude: AnalysisFrame,
): boolean | null {
  if (chunk.voiced !== null) return chunk.voiced
  for (const f of chunk.frames) {
    if (f !== exclude && f.speechDetected !== null) return f.speechDetected
  }
  return null
}

// Re-establish the AnalysisChunk invariants after the frame at globalIndex
// changed its speechDetected value (e.g. a VAD patch): every chunk holds frames
// of a single speechDetected value (modulo trailing pending nulls in the last
// chunk), and chunk.voiced equals that value (or null while pending). Only the
// boundaries immediately before and after the changed frame can be affected, so
// this isolates that frame and then coalesces it with like-voiced neighbours --
// an O(local) fix rather than re-splitting the whole timeline. Returns true if
// the chunk structure actually changed (so callers can refresh dependent state);
// false for a no-op re-confirmation.
export function reconcileVoicingAt(
  chunks: AnalysisChunk[],
  globalIndex: number,
): boolean {
  const chunk = chunkContaining(chunks, globalIndex)
  const frame = getFrame(chunks, globalIndex)
  if (!chunk || !frame) return false

  const voiced = frame.speechDetected

  // The frame's VAD result is still pending. It tells us nothing about chunk
  // boundaries, so leave the layout untouched until it resolves. Pending frames
  // only ever arise at the tail (where handleAppend has already marked the last
  // chunk pending), and never break a confirmed run -- framesToChunks groups a
  // null with its neighbours rather than splitting on it -- so a no-op here can
  // never strand a pending frame as a chunk of its own.
  if (voiced === null) return false

  // Coming in, the chunk shared a single settled voicing across its confirmed
  // frames. If the patch agrees with it, the layout is unchanged -- but it may
  // have resolved the chunk's last pending frame, letting it un-pend.
  const settled = settledVoicing(chunk, frame)
  if (settled === voiced) {
    if (
      chunk.voiced === null &&
      !chunk.frames.some((f) => f.speechDetected === null)
    ) {
      chunk.voiced = voiced
    }
    return false
  }

  // The frame now disagrees with its chunk. Isolate it so no chunk holds mixed
  // values, then merge it back into either neighbour that shares its voicing.
  splitChunkAt(chunks, globalIndex)
  splitChunkAt(chunks, globalIndex + 1)
  if (getFrame(chunks, globalIndex - 1)?.speechDetected === voiced)
    mergeChunkAt(chunks, globalIndex)
  if (getFrame(chunks, globalIndex + 1)?.speechDetected === voiced)
    mergeChunkAt(chunks, globalIndex + 1)
  return true
}

// Append a freshly captured frame onto the timeline during live recording.
// Frames arrive pending (speechDetected === null) and resolve later via a VAD
// patch, so the common case is a pending append: it extends the last chunk and
// optimistically keeps that chunk's voicing, avoiding flicker -- reconcile splits
// it off later if the VAD resolves it to the opposite value. A frame that already
// agrees with the chunk likewise just extends it. A frame that arrives already
// resolved to the opposite voicing starts a new chunk. Returns true on a
// structural change (a new chunk), which the transcript overlay must re-publish
// for; a plain extension returns false, since the snapshot holds the live chunk
// objects and the next render already reads the new extent.
export function appendFrame(
  chunks: AnalysisChunk[],
  frame: AnalysisFrame,
): boolean {
  const lastChunk = chunks[chunks.length - 1]!
  const voiced = frame.speechDetected

  if (voiced === null || voiced === lastChunk.voiced) {
    lastChunk.frames.push(frame)
    return false
  }

  const timeStepSec = lastChunk.timeStepSamples / lastChunk.sampleRate
  chunks.push({
    timeStepSamples: lastChunk.timeStepSamples,
    sampleRate: lastChunk.sampleRate,
    freqStepHz: lastChunk.freqStepHz,
    firstBinHz: lastChunk.firstBinHz,
    startTimeSec:
      lastChunk.startTimeSec + lastChunk.frames.length * timeStepSec,
    frames: [frame],
    voiced,
  })
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
