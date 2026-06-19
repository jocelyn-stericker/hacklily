// SPDX-License-Identifier: AGPL-3.0-or-later
// Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
// Copyright (C) Tabahi <tabahi@duck.com>.
// See ATTRIBUTION.md.

/* Pure DSP + CTC Viterbi decoding for the BFA *simplified* pipeline.
 *
 * Faithful TypeScript port of the corresponding routines in
 * bournemouth_aligner/cpp_onnx/main.cpp (itself a port of bfaonnx.py):
 *   slice_windows, stitch_window_predictions_flat, calc_spec_len_ext,
 *   log_softmax_*, ViterbiDecoder::viterbi_decode / assort_frames,
 *   AlignmentUtils::decode_alignments_simple, _rms_normalize, convert_to_ms.
 *
 * Also ports the two post-processing steps the C++ advanced pipeline layers on
 * top of the simplified decode (ensure_target_coverage, extend_soft_boundaries),
 * which the aligner runs by default -- see `ensureTargetCoverage` and
 * `extendSoftBoundaries`.
 *
 * Float32Array is used for log-prob/DP buffers so arithmetic matches the C++
 * float32 reference closely.
 */

/** Segment record. [upstream: main.cpp:443 struct FrameStamp] */
export interface FrameStamp {
  phonemeId: number
  startFrame: number
  endFrame: number
  targetSeqIdx: number
  confidence: number
  /**
   * True when this stamp was synthesized by `ensureTargetCoverage` to
   * cover a target phoneme the decoder dropped, rather than decoded directly.
   * [upstream: main.cpp:449 FrameStamp::is_estimated]
   */
  isEstimated?: boolean
}

const NEG_INF = -1000.0

/** RMS-normalize audio in place-safe fashion. [upstream: main.cpp:1755 / bfaonnx.py:1324 _rms_normalize] */
export function rmsNormalize(audio: Float32Array): Float32Array {
  let sumSquares = 0.0
  for (const sample of audio) sumSquares += sample * sample
  const rms = Math.sqrt(sumSquares / audio.length)
  if (rms > 0.0) {
    const out = new Float32Array(audio.length)
    for (let i = 0; i < audio.length; i++) out[i] = audio[i]! / rms
    return out
  }
  return audio.slice()
}

export interface SlicedWindows {
  windows: Float32Array // [numWindows * windowSize], row-major
  numWindows: number
  windowSize: number
}

/** Port of slice_windows (batch=1), zero-padding out-of-bounds samples. [upstream: main.cpp:238 / bfaonnx.py:188] */
export function sliceWindows(
  audio: Float32Array,
  sampleRate = 16000,
  windowSizeMs = 120,
  strideMs = 80,
): SlicedWindows {
  const maxAudioLength = audio.length
  const windowSize = Math.floor((windowSizeMs * sampleRate) / 1000)
  const stride = Math.floor((strideMs * sampleRate) / 1000)
  const numWindows = Math.floor((maxAudioLength - windowSize) / stride) + 1
  const windows = new Float32Array(numWindows * windowSize)
  for (let w = 0; w < numWindows; w++) {
    const start = w * stride
    const base = w * windowSize
    for (let i = 0; i < windowSize; i++) {
      const idx = start + i
      if (idx < maxAudioLength) windows[base + i] = audio[idx]!
    }
  }
  return { windows, numWindows, windowSize }
}

/**
 * Port of stitch_window_predictions_flat (batch=1). [upstream: main.cpp:274 / bfaonnx.py:228 stich_window_predictions]
 * windowedLogitsFlat: [numWindows * framesPerWindow * numClasses].
 * Returns combined [totalFrames * numClasses].
 */
export function stitchWindowPredictionsFlat(
  windowedLogitsFlat: Float32Array,
  numWindows: number,
  framesPerWindow: number,
  numClasses: number,
  originalAudioLength: number,
  sampleRate: number,
  windowSizeMs: number,
  strideMs: number,
): { combined: Float32Array; totalFrames: number } {
  const windowSizeSamples = Math.floor((windowSizeMs * sampleRate) / 1000)
  const strideSamples = Math.floor((strideMs * sampleRate) / 1000)
  const numWindowsTotal =
    Math.floor((originalAudioLength - windowSizeSamples) / strideSamples) + 1
  const totalFrames = Math.floor((numWindowsTotal * framesPerWindow) / 2)
  const strideFrames = Math.floor(framesPerWindow / 2)

  // cos(linspace(-pi/2, pi/2, framesPerWindow))
  const weights = new Float32Array(framesPerWindow)
  for (let i = 0; i < framesPerWindow; i++) {
    const ratio = framesPerWindow > 1 ? i / (framesPerWindow - 1) : 0.0
    weights[i] = Math.cos(ratio * Math.PI - Math.PI / 2)
  }

  const combined = new Float32Array(totalFrames * numClasses)
  const weightSum = new Float32Array(totalFrames)

  for (let w = 0; w < numWindows; w++) {
    const startFrame = w * strideFrames
    const windowOffset = w * framesPerWindow * numClasses
    const endFrame = Math.min(startFrame + framesPerWindow, totalFrames)
    const framesToCopy = endFrame - startFrame
    for (let f = 0; f < framesToCopy; f++) {
      const wgt = weights[f]!
      const srcBase = windowOffset + f * numClasses
      const dstBase = (startFrame + f) * numClasses
      for (let c = 0; c < numClasses; c++) {
        combined[dstBase + c]! += windowedLogitsFlat[srcBase + c]! * wgt
      }
      weightSum[startFrame + f]! += wgt
    }
  }

  for (let t = 0; t < totalFrames; t++) {
    const denom = weightSum[t]! + 1e-8
    const base = t * numClasses
    for (let c = 0; c < numClasses; c++) combined[base + c]! /= denom
  }

  return { combined, totalFrames }
}

/** Port of calc_spec_len_ext (windowing branch; warns instead of returning <2). [upstream: main.cpp:352 / bfaonnx.py:292] */
export function calcSpecLenExt(
  wavLen: number,
  windowSizeMs: number,
  strideMs: number,
  sampleRate: number,
  framesPerWindow: number,
): number {
  const windowSizeWav = Math.floor((windowSizeMs * sampleRate) / 1000)
  const strideSizeWav = Math.floor((strideMs * sampleRate) / 1000)
  let totalFrames: number
  if (wavLen <= windowSizeWav) {
    const numWindows = wavLen / windowSizeWav
    totalFrames = Math.ceil(framesPerWindow * numWindows)
  } else {
    const numWindows = Math.floor((wavLen - windowSizeWav) / strideSizeWav) + 1
    totalFrames = Math.floor((numWindows * framesPerWindow) / 2)
  }
  if (totalFrames < 2) {
    const actualMs = (1000.0 * wavLen) / sampleRate
    // eslint-disable-next-line no-console
    console.warn(
      `BFA: spectral_len < 2 (wav_len=${wavLen}, frames=${totalFrames}, ` +
        `expected >= ${windowSizeMs}ms, got ${actualMs.toFixed(1)}ms)`,
    )
  }
  return totalFrames
}

/** Numerically-stable log-softmax over one frame's class vector (in place into out). [upstream: main.cpp:402 log_softmax_frame] */
function logSoftmaxFrameInto(
  src: Float32Array,
  srcOffset: number,
  dst: Float32Array,
  dstOffset: number,
  C: number,
): void {
  let maxVal = -Infinity
  for (let c = 0; c < C; c++) {
    const v = src[srcOffset + c]!
    if (v > maxVal) maxVal = v
  }
  let sumExp = 0.0
  for (let c = 0; c < C; c++) sumExp += Math.exp(src[srcOffset + c]! - maxVal)
  const logSumExp = Math.log(sumExp)
  for (let c = 0; c < C; c++) {
    dst[dstOffset + c] = src[srcOffset + c]! - maxVal - logSumExp
  }
}

/** Port of log_softmax_batch (batch=1) over the class dimension. [upstream: main.cpp:416] */
export function logSoftmaxFrames(
  logits: Float32Array,
  numFrames: number,
  numClasses: number,
): Float32Array {
  const out = new Float32Array(logits.length)
  for (let t = 0; t < numFrames; t++) {
    const off = t * numClasses
    logSoftmaxFrameInto(logits, off, out, off, numClasses)
  }
  return out
}

/**
 * Standard CTC Viterbi decoding. Port of ViterbiDecoder::viterbi_decode.
 * [upstream: main.cpp:485 / bfaonnx.py:375 _viterbi_decode]
 * logProbs: flat [T * C]. Returns per-frame phoneme id + target index arrays.
 */
export function viterbiDecode(
  logProbs: Float32Array,
  T: number,
  C: number,
  ctcPath: number[],
  ctcLen: number,
  ctcPathTrueIdx: number[],
  bandWidth = 0,
): { framePhonemes: Int32Array; framePhonemesIdx: Int32Array } {
  const dp = new Float32Array(T * ctcLen).fill(NEG_INF)
  const backpointers = new Int32Array(T * ctcLen)

  const useBand = bandWidth > 0 && T > 1 && ctcLen > 1
  const pace = useBand ? (ctcLen - 1) / (T - 1) : 0.0

  dp[0] = logProbs[ctcPath[0]!]! // dp[0][0] with blank at ctcPath[0]
  if (ctcLen > 1) dp[1] = logProbs[ctcPath[1]!]!

  // can_skip[s] iff ctc_path[s] != ctc_path[s-2]
  const canSkip = new Uint8Array(ctcLen)
  for (let s = 2; s < ctcLen; s++) {
    if (ctcPath[s] !== ctcPath[s - 2]) canSkip[s] = 1
  }

  for (let t = 1; t < T; t++) {
    const row = t * ctcLen
    const prevRow = (t - 1) * ctcLen
    const frameBase = t * C
    for (let s = 0; s < ctcLen; s++) {
      const emit = logProbs[frameBase + ctcPath[s]!]!
      // stay
      let bestScore = dp[prevRow + s]! + emit
      let bestPrev = s
      // advance
      if (s >= 1) {
        const advance = dp[prevRow + s - 1]! + emit
        if (advance > bestScore) {
          bestScore = advance
          bestPrev = s - 1
        }
      }
      // skip
      if (s >= 2 && canSkip[s]) {
        const skip = dp[prevRow + s - 2]! + emit
        if (skip > bestScore) {
          bestScore = skip
          bestPrev = s - 2
        }
      }
      dp[row + s] = bestScore
      backpointers[row + s] = bestPrev
    }
    if (useBand) {
      const center = t * pace
      for (let s = 0; s < ctcLen; s++) {
        if (s < center - bandWidth || s > center + bandWidth)
          dp[row + s] = NEG_INF
      }
    }
  }

  // best valid final state (fallback: global argmax)
  const lastRow = (T - 1) * ctcLen
  let finalState = 0
  let bestFinal = NEG_INF
  let foundValid = false
  for (let s = 0; s < ctcLen; s++) {
    const v = dp[lastRow + s]!
    if (v > NEG_INF) {
      if (!foundValid || v > bestFinal) {
        bestFinal = v
        finalState = s
        foundValid = true
      }
    }
  }
  if (!foundValid) {
    for (let s = 0; s < ctcLen; s++) {
      if (dp[lastRow + s]! > bestFinal) {
        bestFinal = dp[lastRow + s]!
        finalState = s
      }
    }
  }

  const pathStates = new Int32Array(T)
  pathStates[T - 1] = finalState
  for (let t = T - 2; t >= 0; t--) {
    pathStates[t] = backpointers[(t + 1) * ctcLen + pathStates[t + 1]!]!
  }

  const framePhonemes = new Int32Array(T)
  const framePhonemesIdx = new Int32Array(T)
  for (let t = 0; t < T; t++) {
    framePhonemes[t] = ctcPath[pathStates[t]!]!
    framePhonemesIdx[t] = ctcPathTrueIdx[pathStates[t]!]!
  }
  return { framePhonemes, framePhonemesIdx }
}

/** Port of ViterbiDecoder::assort_frames. [upstream: main.cpp:599 / bfaonnx.py:1001] */
export function assortFrames(
  framePhonemes: Int32Array,
  framePhonemesIdx: Int32Array,
  blankId: number,
  ignoreNoise: boolean,
  maxBlanks = 10,
): FrameStamp[] {
  const n = framePhonemes.length
  if (n === 0) return []

  const transitions: number[] = [0]
  for (let i = 1; i < n; i++) {
    if (
      framePhonemes[i] !== framePhonemes[i - 1] ||
      framePhonemesIdx[i] !== framePhonemesIdx[i - 1]
    ) {
      transitions.push(i)
    }
  }

  const out: FrameStamp[] = []
  for (let i = 0; i < transitions.length; i++) {
    const startIdx = transitions[i]!
    const endIdx = i + 1 < transitions.length ? transitions[i + 1]! : n
    const segPhoneme = framePhonemes[startIdx]!
    let segIdx = framePhonemesIdx[startIdx]!
    if (segIdx === -1) {
      for (let j = startIdx; j < endIdx; j++) {
        if (framePhonemesIdx[j] !== -1) {
          segIdx = framePhonemesIdx[j]!
          break
        }
      }
    }
    if (segPhoneme === blankId) {
      const segLength = endIdx - startIdx
      if (ignoreNoise) {
        if (segLength > maxBlanks) continue
      } else {
        if (segLength > maxBlanks) {
          out.push({
            phonemeId: segPhoneme,
            startFrame: startIdx,
            endFrame: endIdx,
            targetSeqIdx: segIdx,
            confidence: 0,
          })
        }
      }
    }
    if (segPhoneme !== blankId) {
      out.push({
        phonemeId: segPhoneme,
        startFrame: startIdx,
        endFrame: endIdx,
        targetSeqIdx: segIdx,
        confidence: 0,
      })
    }
  }
  return out
}

/**
 * Simple forced alignment for one sample: CTC path + Viterbi + assort.
 * Port of AlignmentUtils::decode_alignments_simple (single batch item).
 * [upstream: main.cpp:1200 / bfaonnx.py:1080]
 * logProbs: flat [T_used * C].
 */
export function decodeAlignmentsSimple(
  logProbs: Float32Array,
  T: number,
  C: number,
  trueSeq: number[],
  blankId: number,
  ignoreNoise: boolean,
): FrameStamp[] {
  const S = trueSeq.length

  let stride = 4
  if (stride * S + 1 > T * 0.9) stride = 3
  if (stride * S + 1 > T * 0.8) stride = 2
  const ctcLen = stride * S + 1

  const ctcPath = new Array<number>(ctcLen).fill(blankId)
  const ctcPathIdx = new Array<number>(ctcLen).fill(-1)
  for (let j = 0; j < S; j++) {
    const pos = 1 + j * stride
    if (pos < ctcLen) {
      ctcPath[pos] = trueSeq[j]!
      ctcPathIdx[pos] = j
    }
  }

  const bandWidth = ctcLen > 60 ? Math.max(Math.floor(ctcLen / 4), 20) : 0
  const { framePhonemes, framePhonemesIdx } = viterbiDecode(
    logProbs,
    T,
    C,
    ctcPath,
    ctcLen,
    ctcPathIdx,
    bandWidth,
  )
  return assortFrames(framePhonemes, framePhonemesIdx, blankId, ignoreNoise)
}

/**
 * Per-phoneme confidence scoring from log-probabilities.
 * Port of calculate_confidences. [upstream: main.cpp:1498 / bfaonnx.py:_calculate_confidences]
 * logProbsFlat: flat [T * C] log-probability array.
 */
export function calculateConfidences(
  logProbsFlat: Float32Array,
  T: number,
  C: number,
  framestamps: FrameStamp[],
): FrameStamp[] {
  return framestamps.map((fs) => {
    const startFrame = Math.max(0, fs.startFrame)
    const endFrame = Math.min(T, fs.endFrame)
    const phonemeIdx = fs.phonemeId

    let avgConfidence = Math.exp(logProbsFlat[startFrame * C + phonemeIdx]!)
    let newEndFrame = endFrame

    if (startFrame < endFrame && phonemeIdx >= 0 && phonemeIdx < C) {
      const halfConfidence = avgConfidence / 2.0
      let lastGoodFrame = startFrame
      let totalGoodFrames = 1

      for (let f = startFrame + 1; f < endFrame; f++) {
        const frameProb = Math.exp(logProbsFlat[f * C + phonemeIdx]!)
        if (frameProb > halfConfidence || frameProb > 0.1) {
          avgConfidence += frameProb
          lastGoodFrame = f
          totalGoodFrames++
        }
      }

      if (totalGoodFrames > 1) {
        avgConfidence /= totalGoodFrames
        newEndFrame = Math.min(T, lastGoodFrame + 1)

        let maxConfidence = 0.0
        for (let f = startFrame; f < newEndFrame; f++) {
          const p = Math.exp(logProbsFlat[f * C + phonemeIdx]!)
          if (p > maxConfidence) maxConfidence = p
        }
        if (avgConfidence < maxConfidence / 2.0) {
          avgConfidence = maxConfidence
        }
      }
    }

    return {
      phonemeId: phonemeIdx,
      startFrame,
      endFrame: newEndFrame,
      targetSeqIdx: fs.targetSeqIdx,
      confidence: avgConfidence,
      isEstimated: fs.isEstimated,
    }
  })
}

/**
 * Insert/clean up framestamps so every target phoneme is represented exactly
 * once. Faithful port of the C++ advanced-pipeline draft
 * (main.cpp:2033 ensure_target_coverage), which itself matches
 * core.py:462 ensure_target_coverage.
 *
 * Always: drops stamps whose targetSeqIdx is out of range (e.g. -1), then sorts
 * by startFrame. When `ensureCompleteness` is true it additionally synthesizes
 * `isEstimated` stamps for any target the decoder missed, placing them in the
 * gap between the nearest surviving neighbours (or, for trailing gaps, by
 * contracting existing stamps to make room).
 *
 * `ctcLen` is the inclusive upper bound for inserted frame indices (the C++
 * draft uses max(endFrame) over the decoded stamps). `silenceClass` is the SIL
 * phoneme id (ph66 0); trailing SIL targets are skipped rather than inserted.
 */
export function ensureTargetCoverage(
  framestamps: FrameStamp[],
  targetPhonemeIds: number[],
  ctcLen: number,
  ensureCompleteness: boolean,
  silenceClass: number,
): FrameStamp[] {
  if (framestamps.length === 0 || targetPhonemeIds.length === 0)
    return framestamps
  const numTargets = targetPhonemeIds.length

  const targetsFound = new Array<number>(numTargets).fill(0)
  const invalidTargetIndices = new Set<number>()
  for (const fs of framestamps) {
    if (fs.targetSeqIdx >= 0 && fs.targetSeqIdx < numTargets)
      targetsFound[fs.targetSeqIdx]!++
    else invalidTargetIndices.add(fs.targetSeqIdx)
  }

  const missingTargets: number[] = []
  for (let i = 0; i < numTargets; i++)
    if (targetsFound[i] === 0) missingTargets.push(i)

  let frames = framestamps
  if (invalidTargetIndices.size > 0)
    frames = frames.filter((fs) => !invalidTargetIndices.has(fs.targetSeqIdx))

  // Distribute `group` evenly across [gapStart, gapEnd), clamped to the CTC
  // range, pushing the synthesized stamps onto `frames`. Shared by the three
  // non-trailing branches below. [upstream: main.cpp:2103-2215]
  const distribute = (
    group: number[],
    gapStart: number,
    gapEnd: number,
    targetToFrame: Map<number, FrameStamp>,
  ): void => {
    const nMissing = group.length
    const gapSize = Math.max(gapEnd - gapStart, nMissing)
    const framesPerPhoneme = gapSize / nMissing
    for (let i = 0; i < nMissing; i++) {
      const tidx = group[i]!
      const estStart = Math.min(
        Math.trunc(gapStart + i * framesPerPhoneme),
        Math.max(0, ctcLen - 1),
      )
      const estEnd = Math.min(
        Math.max(
          Math.trunc(gapStart + (i + 1) * framesPerPhoneme),
          estStart + 1,
        ),
        ctcLen,
      )
      const newFs: FrameStamp = {
        phonemeId: targetPhonemeIds[tidx]!,
        startFrame: estStart,
        endFrame: estEnd,
        targetSeqIdx: tidx,
        confidence: 0,
        isEstimated: true,
      }
      frames.push(newFs)
      targetToFrame.set(tidx, newFs)
    }
  }

  if (ensureCompleteness && missingTargets.length > 0) {
    const targetToFrame = new Map<number, FrameStamp>()
    for (const fs of frames) targetToFrame.set(fs.targetSeqIdx, fs)

    // Group consecutive missing targets so frames are shared within each gap.
    const missingGroups: number[][] = [[missingTargets[0]!]]
    for (let i = 1; i < missingTargets.length; i++) {
      if (missingTargets[i] === missingTargets[i - 1]! + 1)
        missingGroups[missingGroups.length - 1]!.push(missingTargets[i]!)
      else missingGroups.push([missingTargets[i]!])
    }

    for (const group of missingGroups) {
      const nMissing = group.length

      let prevFrame: FrameStamp | undefined
      for (let tidx = group[0]! - 1; tidx >= 0; tidx--) {
        const f = targetToFrame.get(tidx)
        if (f) {
          prevFrame = f
          break
        }
      }
      let nextFrame: FrameStamp | undefined
      for (let tidx = group[group.length - 1]! + 1; tidx < numTargets; tidx++) {
        const f = targetToFrame.get(tidx)
        if (f) {
          nextFrame = f
          break
        }
      }

      if (prevFrame && nextFrame) {
        distribute(
          group,
          prevFrame.endFrame,
          nextFrame.startFrame,
          targetToFrame,
        )
      } else if (prevFrame) {
        // Trailing missing targets: skip SIL, contract existing stamps to free
        // frames at the end, then append one frame each. [upstream: main.cpp:2123]
        const nonSilGroup = group.filter(
          (tidx) => targetPhonemeIds[tidx] !== silenceClass,
        )
        if (nonSilGroup.length === 0) continue
        const nNeeded = nonSilGroup.length

        frames.sort((a, b) => a.startFrame - b.startFrame)
        let framesFreed = 0
        // Pass 0 contracts SIL stamps, pass 1 any stamp with span > 1.
        for (let pass = 0; pass < 2 && framesFreed < nNeeded; pass++) {
          for (
            let scanIdx = frames.length - 1;
            scanIdx >= 0 && framesFreed < nNeeded;
            scanIdx--
          ) {
            const f = frames[scanIdx]!
            const span = f.endFrame - f.startFrame
            const isSil = f.phonemeId === silenceClass
            if (
              (pass === 0 && isSil && span > 1) ||
              (pass === 1 && span > 1 && !isSil)
            ) {
              const canGive = Math.min(span - 1, nNeeded - framesFreed)
              f.endFrame -= canGive
              for (let j = scanIdx + 1; j < frames.length; j++) {
                frames[j]!.startFrame -= canGive
                frames[j]!.endFrame -= canGive
              }
              framesFreed += canGive
            }
          }
        }

        targetToFrame.clear()
        for (const fs of frames) targetToFrame.set(fs.targetSeqIdx, fs)
        let lastEnd = 0
        for (const fs of frames) lastEnd = Math.max(lastEnd, fs.endFrame)

        for (let i = 0; i < nNeeded; i++) {
          const tidx = nonSilGroup[i]!
          const estStart = Math.min(lastEnd + i, Math.max(0, ctcLen - 1))
          const estEnd = Math.min(estStart + 1, ctcLen)
          const newFs: FrameStamp = {
            phonemeId: targetPhonemeIds[tidx]!,
            startFrame: estStart,
            endFrame: estEnd,
            targetSeqIdx: tidx,
            confidence: 0,
            isEstimated: true,
          }
          frames.push(newFs)
          targetToFrame.set(tidx, newFs)
        }
        continue
      } else if (nextFrame) {
        const gapEnd = nextFrame.startFrame
        distribute(group, Math.max(0, gapEnd - nMissing), gapEnd, targetToFrame)
      } else {
        distribute(group, 0, nMissing, targetToFrame)
      }
    }
  }

  frames.sort((a, b) => a.startFrame - b.startFrame)
  return frames
}

/**
 * Widen each phoneme's start/end into adjacent frames that still carry
 * meaningful probability for that phoneme. Faithful port of the C++
 * advanced-pipeline draft (main.cpp:2228 extend_soft_boundaries), which matches
 * core.py:682 extend_soft_boundaries_func. Mutates `framestamps` in place; they
 * must be sorted by startFrame.
 *
 * Four passes: strict start, strict end, lenient start, lenient end. The strict
 * threshold scales with each phoneme's mean in-segment probability; the lenient
 * threshold is a flat 10^-boundarySoftness. Passes 1/2 also reproduce the
 * upstream quirk where the inter-phoneme `max(..)/min(..)` clamps usually leave
 * interior boundaries untouched, so most widening comes from the lenient passes.
 *
 * `logProbsFlat` is the [T * C] log-prob grid; `boundarySoftness` defaults to 7
 * upstream (lenient threshold 10^-7).
 */
export function extendSoftBoundaries(
  framestamps: FrameStamp[],
  logProbsFlat: Float32Array,
  T: number,
  C: number,
  boundarySoftness: number,
): void {
  if (framestamps.length === 0 || T <= 0 || C <= 0) return

  const probs = new Float32Array(logProbsFlat.length)
  for (let i = 0; i < logProbsFlat.length; i++)
    probs[i] = Math.exp(logProbsFlat[i]!)

  // Mean probability of each phoneme over its original (pre-extension) span.
  const meanProbs = new Float32Array(framestamps.length).fill(0.001)
  for (let i = 0; i < framestamps.length; i++) {
    const fs = framestamps[i]!
    if (
      fs.startFrame < T &&
      fs.endFrame <= T &&
      fs.startFrame < fs.endFrame &&
      fs.phonemeId >= 0 &&
      fs.phonemeId < C
    ) {
      let sum = 0.0
      let count = 0
      for (let f = fs.startFrame; f < fs.endFrame; f++) {
        sum += probs[f * C + fs.phonemeId]!
        count++
      }
      if (count > 0) meanProbs[i] = sum / count
    }
  }

  const boundarySoftnessInitial = Math.max(2, boundarySoftness - 4)
  const thresh1 = Math.pow(10, -boundarySoftnessInitial)
  const thresh2 = Math.pow(10, -boundarySoftness)
  const maxExtensionFactor = 10.0

  // Pass 1: extend start boundaries (strict). [upstream: main.cpp:2263]
  for (let i = 0; i < framestamps.length; i++) {
    const fs = framestamps[i]!
    if (fs.startFrame >= T || fs.phonemeId >= C) continue
    const originalDuration = fs.endFrame - fs.startFrame
    let minStart = Math.max(
      0,
      Math.trunc(fs.startFrame - originalDuration * maxExtensionFactor),
    )
    if (i > 0)
      minStart = Math.max(
        minStart,
        Math.min(framestamps[i - 1]!.endFrame + 10, fs.startFrame),
      )
    const startThreshold = Math.min(meanProbs[i]! * thresh1, thresh1)
    let newStart = fs.startFrame
    for (let f = fs.startFrame - 1; f >= minStart; f--) {
      if (probs[f * C + fs.phonemeId]! >= startThreshold) newStart = f
      else break
    }
    fs.startFrame = newStart
  }

  // Pass 2: extend end boundaries (strict). [upstream: main.cpp:2284]
  for (let i = 0; i < framestamps.length; i++) {
    const fs = framestamps[i]!
    if (fs.startFrame >= T || fs.phonemeId >= C) continue
    const originalDuration = fs.endFrame - fs.startFrame
    let maxEnd = Math.min(
      T,
      Math.trunc(fs.endFrame + originalDuration * maxExtensionFactor),
    )
    if (i + 1 < framestamps.length)
      maxEnd = Math.min(
        maxEnd,
        Math.min(fs.endFrame, framestamps[i + 1]!.startFrame - 10),
      )
    const endThreshold = Math.min(meanProbs[i]! * thresh1, thresh1)
    let newEnd = fs.endFrame
    for (let f = fs.endFrame; f < maxEnd; f++) {
      if (probs[f * C + fs.phonemeId]! >= endThreshold) newEnd = f + 1
      else break
    }
    fs.endFrame = newEnd
  }

  // Pass 3: extend start boundaries (lenient, fills remaining gaps). [upstream: main.cpp:2305]
  for (let i = 0; i < framestamps.length; i++) {
    const fs = framestamps[i]!
    if (fs.startFrame >= T || fs.phonemeId >= C) continue
    const minStart = i > 0 ? framestamps[i - 1]!.endFrame : 0
    if (fs.startFrame <= minStart) continue
    let newStart = fs.startFrame
    for (let f = fs.startFrame - 1; f >= minStart; f--) {
      if (probs[f * C + fs.phonemeId]! >= thresh2) newStart = f
      else break
    }
    fs.startFrame = newStart
  }

  // Pass 4: extend end boundaries (lenient, fills remaining gaps). [upstream: main.cpp:2325]
  for (let i = 0; i < framestamps.length; i++) {
    const fs = framestamps[i]!
    if (fs.startFrame >= T || fs.phonemeId >= C) continue
    let maxEnd = Math.min(
      T,
      Math.trunc(
        fs.endFrame + (fs.endFrame - fs.startFrame) * maxExtensionFactor,
      ),
    )
    if (i + 1 < framestamps.length)
      maxEnd = Math.min(maxEnd, framestamps[i + 1]!.startFrame)
    let newEnd = fs.endFrame
    for (let f = fs.endFrame; f < maxEnd; f++) {
      if (probs[f * C + fs.phonemeId]! >= thresh2) newEnd = f + 1
      else break
    }
    fs.endFrame = newEnd
  }
}
