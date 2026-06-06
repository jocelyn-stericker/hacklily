/*
 * Pure DSP + CTC Viterbi decoding for the BFA *simplified* pipeline.
 *
 * Faithful TypeScript port of the corresponding routines in
 * bournemouth_aligner/cpp_onnx/main.cpp (itself a port of bfaonnx.py):
 *   slice_windows, stitch_window_predictions_flat, calc_spec_len_ext,
 *   log_softmax_*, ViterbiDecoder::viterbi_decode / assort_frames,
 *   AlignmentUtils::decode_alignments_simple, _rms_normalize, convert_to_ms.
 *
 * Float32Array is used for log-prob/DP buffers so arithmetic matches the C++
 * float32 reference closely.
 *
 * Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
 * Copyright (C) Tabahi <tabahi@duck.com>.
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE at the repository root and ATTRIBUTION.md.
 */

/** Segment record. [upstream: main.cpp:443 struct FrameStamp] */
export interface FrameStamp {
  phonemeId: number
  startFrame: number
  endFrame: number
  targetSeqIdx: number
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
