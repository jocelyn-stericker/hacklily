// SPDX-License-Identifier: AGPL-3.0-or-later
// Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
// Copyright (C) Tabahi <tabahi@duck.com>.
// See ATTRIBUTION.md.

/*
 * CUPE ONNX inference + simplified BFA alignment orchestration.
 *
 * Faithful TypeScript port of the simplified pipeline in
 * bournemouth_aligner/cpp_onnx/main.cpp:
 *   CUPEONNXPredictor::predict, PhonemeTimestampAligner::chop_wav /
 *   cupe_prediction / extract_timestamps_from_segment_simplified / convert_to_ms.
 *
 * By default `align` also runs the two post-processing steps the C++ advanced
 * pipeline applies after decoding -- ensure_target_coverage and
 * extend_soft_boundaries (see decoder.ts) -- so target phonemes the simplified
 * decode drops are recovered and each phoneme's boundaries widen into adjacent
 * confident frames. Toggle via AlignerConfig.
 *
 * Uses onnxruntime-web (wasm backend). The caller supplies an already-created
 * InferenceSession (see worker.ts / createCupeSession) so this module stays
 * agnostic about backend wiring.
 */

import * as ort from 'onnxruntime-web'

import {
  rmsNormalize,
  sliceWindows,
  stitchWindowPredictionsFlat,
  calcSpecLenExt,
  logSoftmaxFrames,
  decodeAlignmentsSimple,
  ensureTargetCoverage,
  extendSoftBoundaries,
  calculateConfidences,
} from './decoder.js'
import type { FrameStamp } from './decoder.js'
import { phonemeMappedIndex } from './ph66Data.js'
import type {
  AlignmentResult,
  AlignerConfig,
  PhonemeTimestamp,
} from './types.js'

const BLANK_CLASS = phonemeMappedIndex['noise']! // 66
const SILENCE_CLASS = phonemeMappedIndex['SIL']! // 0
const SEG_DURATION_MIN = 0.05 // seconds (Python seg_duration_min)

// Reverse label lookup: ph66 id -> label.
const indexToLabel: Record<number, string> = {}
for (const [label, idx] of Object.entries(phonemeMappedIndex))
  indexToLabel[idx] = label

const INPUT_NAME = 'audio_window'
const PHONEME_LOGITS = 'phoneme_logits'

/** Wraps a CUPE ONNX session; returns stitched phoneme log-its for a mono clip. */
export class CupeOnnxPredictor {
  constructor(private readonly session: ort.InferenceSession) {}

  /**
   * Run CUPE over windowed audio. [upstream: main.cpp:1396 CUPEONNXPredictor::predict]
   * windows: [numWindows * windowSize] flat. Returns phoneme logits
   * [numWindows * framesPerWindow * numClasses] plus shape info.
   */
  async predict(
    windows: Float32Array,
    numWindows: number,
    windowSize: number,
  ): Promise<{
    logits: Float32Array
    framesPerWindow: number
    numClasses: number
  }> {
    console.time('run')
    const input = new ort.Tensor('float32', windows, [numWindows, windowSize])
    const outputs = await this.session.run({ [INPUT_NAME]: input })
    console.timeEnd('run')
    const logitsTensor = outputs[PHONEME_LOGITS]
    if (!logitsTensor) {
      throw new Error(
        `CUPE model did not return an output named "${PHONEME_LOGITS}". ` +
          `Got: ${Object.keys(outputs).join(', ')}`,
      )
    }
    const dims = logitsTensor.dims // [numWindows, framesPerWindow, numClasses]
    const framesPerWindow = Number(dims[1])
    const numClasses = Number(dims[2])
    return {
      logits: logitsTensor.data as Float32Array,
      framesPerWindow,
      numClasses,
    }
  }
}

export class PhonemeTimestampAligner {
  private readonly predictor: CupeOnnxPredictor
  private readonly sampleRate: number
  private readonly windowSizeMs: number
  private readonly strideMs: number
  private readonly windowSizeSamples: number
  private readonly strideSamples: number
  private readonly wavLenMax: number
  private readonly segDurationMinSamples: number
  // Simplified pipeline: ignore_noise=true so long blank runs are dropped.
  private readonly ignoreNoise = true
  // Post-processing toggles, ported from the C++ advanced-pipeline draft.
  private readonly ensureCoverage: boolean
  private readonly softBoundaries: boolean
  private readonly boundarySoftness: number

  constructor(session: ort.InferenceSession, config: AlignerConfig = {}) {
    // Defaults mirror _setup_config. [upstream: main.cpp:1723 / bfaonnx.py:1263]
    this.predictor = new CupeOnnxPredictor(session)
    this.sampleRate = config.sampleRate ?? 16000
    this.windowSizeMs = config.windowSizeMs ?? 120
    this.strideMs = config.strideMs ?? 80
    this.windowSizeSamples = Math.floor(
      (this.windowSizeMs * this.sampleRate) / 1000,
    )
    this.strideSamples = Math.floor((this.strideMs * this.sampleRate) / 1000)
    const durationMax = config.durationMax ?? 10
    this.wavLenMax = Math.floor(durationMax * this.sampleRate)
    this.segDurationMinSamples = Math.floor(SEG_DURATION_MIN * this.sampleRate)
    this.ensureCoverage = config.ensureTargetCoverage ?? true
    this.softBoundaries = config.extendSoftBoundaries ?? true
    this.boundarySoftness = config.boundarySoftness ?? 7
  }

  /**
   * Port of chop_wav: rms-normalize then truncate to wavLenMax.
   * [upstream: main.cpp:1772 / bfaonnx.py:1291]
   *
   * Unlike upstream we do NOT zero-pad up to wavLenMax. The CUPE ONNX model has
   * a dynamic window-count axis (export_cupe_to_onnx.py exports `audio_window`
   * axis 0 as `batch_size`), so windowing only the real audio avoids running
   * inference on pure-padding windows whose stitched frames are discarded by the
   * spectralLen cut anyway. For audio longer than one window the stitched output
   * is identical to the padded version (the extra windows only ever contribute
   * to frames >= spectralLen). Very short clips are still padded up to two full
   * windows so the stitch produces enough frames to cover spectralLen.
   *
   * `wavLen` is the real (valid) length -- capped at wavLenMax -- and continues to
   * drive spectralLen and timestamp conversion. `wav.length` may exceed it only
   * for the short-clip padding case.
   */
  chopWav(audio: Float32Array): { wav: Float32Array; wavLen: number } {
    if (audio.length < this.segDurationMinSamples) {
      throw new Error(
        `Segment too short: ${audio.length} samples, minimum required is ${this.segDurationMinSamples}.`,
      )
    }
    const normalized = rmsNormalize(audio)
    const wavLen = Math.min(normalized.length, this.wavLenMax)
    // Two full windows guarantee totalFrames >= spectralLen for sub-window clips.
    const minSamples = this.windowSizeSamples + this.strideSamples
    const bufLen = Math.min(this.wavLenMax, Math.max(wavLen, minSamples))

    let wav: Float32Array
    if (normalized.length === bufLen) {
      wav = normalized
    } else if (normalized.length > bufLen) {
      wav = normalized.slice(0, bufLen)
    } else {
      wav = new Float32Array(bufLen)
      wav.set(normalized, 0)
    }
    return { wav, wavLen }
  }

  /** Port of _cupe_prediction (phoneme stream only). [upstream: main.cpp:1843 / bfaonnx.py:1331] */
  private async cupePrediction(
    wav: Float32Array,
    wavLen: number,
  ): Promise<{
    logitsClass: Float32Array
    totalFrames: number
    numClasses: number
    spectralLen: number
  }> {
    const { windows, numWindows, windowSize } = sliceWindows(
      wav,
      this.sampleRate,
      this.windowSizeMs,
      this.strideMs,
    )
    const { logits, framesPerWindow, numClasses } =
      await this.predictor.predict(windows, numWindows, windowSize)

    // Buffer length drives the window count for stitching; equals wavLen except
    // for short clips padded up to two windows (see chopWav).
    const originalAudioLength = wav.length
    const { combined, totalFrames } = stitchWindowPredictionsFlat(
      logits,
      numWindows,
      framesPerWindow,
      numClasses,
      originalAudioLength,
      this.sampleRate,
      this.windowSizeMs,
      this.strideMs,
    )

    const spectralLen = calcSpecLenExt(
      wavLen,
      this.windowSizeMs,
      this.strideMs,
      this.sampleRate,
      framesPerWindow,
    )

    return { logitsClass: combined, totalFrames, numClasses, spectralLen }
  }

  /** Port of convert_to_ms. [upstream: main.cpp:1553 convert_to_ms_with_confidence / bfaonnx.py:1601] */
  private convertToMs(
    framestamps: FrameStamp[],
    spectralLength: number,
    startOffsetSec: number,
    wavLen: number,
  ): PhonemeTimestamp[] {
    const durationInSeconds = wavLen / this.sampleRate
    const durationPerFrame =
      spectralLength > 0 ? durationInSeconds / spectralLength : 0.0
    return framestamps.map((fs) => {
      const startSec = startOffsetSec + fs.startFrame * durationPerFrame
      const endSec = startOffsetSec + fs.endFrame * durationPerFrame
      return {
        phonemeId: fs.phonemeId,
        phonemeLabel: indexToLabel[fs.phonemeId] ?? `UNK_${fs.phonemeId}`,
        startFrame: fs.startFrame,
        endFrame: fs.endFrame,
        targetIndex: fs.targetSeqIdx,
        startMs: startSec * 1000.0,
        endMs: endSec * 1000.0,
        confidence: fs.confidence,
      }
    })
  }

  /**
   * Simplified alignment: CUPE -> log_softmax -> Viterbi -> timestamps.
   * Port of extract_timestamps_from_segment_simplified.
   * [upstream: main.cpp:1909 / bfaonnx.py:1414]
   *
   * @param audio       mono 16 kHz Float32 PCM (un-normalized, un-padded).
   * @param ph66        target ph66 phoneme indices.
   * @param startOffsetSec  added to every timestamp (default 0).
   */
  async align(
    audio: Float32Array,
    ph66: number[],
    startOffsetSec = 0,
  ): Promise<AlignmentResult> {
    const { wav, wavLen } = this.chopWav(audio)
    const { logitsClass, totalFrames, numClasses, spectralLen } =
      await this.cupePrediction(wav, wavLen)

    if (spectralLen <= 0) {
      throw new Error(`Invalid spectral_len = ${spectralLen}`)
    }

    const logProbs = logSoftmaxFrames(logitsClass, totalFrames, numClasses)

    // Viterbi runs on the first `spectralLen` valid frames (pred_lens).
    let framestamps = decodeAlignmentsSimple(
      logProbs,
      spectralLen,
      numClasses,
      ph66,
      BLANK_CLASS,
      this.ignoreNoise,
    )

    // Post-processing mirrors the C++ advanced-pipeline draft
    // (main.cpp:2003-2014): coverage -> soft boundaries -> confidence.
    const lpSpectral = new Float32Array(spectralLen * numClasses)
    lpSpectral.set(logProbs.subarray(0, spectralLen * numClasses))

    if (this.ensureCoverage) {
      // ctcLen upper-bounds inserted frames at the decoded extent.
      let ctcLen = 0
      for (const fs of framestamps) ctcLen = Math.max(ctcLen, fs.endFrame)
      framestamps = ensureTargetCoverage(
        framestamps,
        ph66,
        ctcLen,
        true,
        SILENCE_CLASS,
      )
    }

    if (this.softBoundaries) {
      extendSoftBoundaries(
        framestamps,
        lpSpectral,
        spectralLen,
        numClasses,
        this.boundarySoftness,
      )
    }

    // Score per-phoneme confidence from the log-prob grid; may trim endFrame.
    framestamps = calculateConfidences(
      lpSpectral,
      spectralLen,
      numClasses,
      framestamps,
    )

    const phonemeTimestamps = this.convertToMs(
      framestamps,
      spectralLen,
      startOffsetSec,
      wavLen,
    )
    return { phonemeTimestamps, spectralLength: spectralLen, totalFrames }
  }
}
