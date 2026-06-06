/*
 * CUPE ONNX inference + simplified BFA alignment orchestration.
 *
 * Faithful TypeScript port of the simplified pipeline in
 * bournemouth_aligner/cpp_onnx/main.cpp:
 *   CUPEONNXPredictor::predict, PhonemeTimestampAligner::chop_wav /
 *   cupe_prediction / extract_timestamps_from_segment_simplified / convert_to_ms.
 *
 * Uses onnxruntime-web (wasm backend). The caller supplies an already-created
 * InferenceSession (see worker.ts / createCupeSession) so this module stays
 * agnostic about backend wiring.
 *
 * Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
 * Copyright (C) Tabahi <tabahi@duck.com>.
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE at the repository root and ATTRIBUTION.md.
 */

import * as ort from 'onnxruntime-web'

import {
  rmsNormalize,
  sliceWindows,
  stitchWindowPredictionsFlat,
  calcSpecLenExt,
  logSoftmaxFrames,
  decodeAlignmentsSimple,
} from './decoder.js'
import type { FrameStamp } from './decoder.js'
import { phonemeMappedIndex } from './ph66Data.js'
import type {
  AlignmentResult,
  AlignerConfig,
  PhonemeTimestamp,
} from './types.js'

const BLANK_CLASS = phonemeMappedIndex['noise']! // 66
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
    const input = new ort.Tensor('float32', windows, [numWindows, windowSize])
    const outputs = await this.session.run({ [INPUT_NAME]: input })
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
  private readonly wavLenMax: number
  private readonly segDurationMinSamples: number
  // Simplified pipeline: ignore_noise=true so long blank runs are dropped.
  private readonly ignoreNoise = true

  constructor(session: ort.InferenceSession, config: AlignerConfig = {}) {
    // Defaults mirror _setup_config. [upstream: main.cpp:1723 / bfaonnx.py:1263]
    this.predictor = new CupeOnnxPredictor(session)
    this.sampleRate = config.sampleRate ?? 16000
    this.windowSizeMs = config.windowSizeMs ?? 120
    this.strideMs = config.strideMs ?? 80
    const durationMax = config.durationMax ?? 10
    this.wavLenMax = Math.floor(durationMax * this.sampleRate)
    this.segDurationMinSamples = Math.floor(SEG_DURATION_MIN * this.sampleRate)
  }

  /** Port of chop_wav: rms-normalize then pad/truncate to wavLenMax. [upstream: main.cpp:1772 / bfaonnx.py:1291] */
  chopWav(audio: Float32Array): { wav: Float32Array; wavLen: number } {
    if (audio.length < this.segDurationMinSamples) {
      throw new Error(
        `Segment too short: ${audio.length} samples, minimum required is ${this.segDurationMinSamples}.`,
      )
    }
    const normalized = rmsNormalize(audio)
    let wavLen = normalized.length
    let wav: Float32Array
    if (wavLen > this.wavLenMax) {
      wav = normalized.slice(0, this.wavLenMax)
      wavLen = this.wavLenMax
    } else {
      wav = new Float32Array(this.wavLenMax)
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

    const originalAudioLength = wav.length // padded length, matches main.cpp
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

  /** Port of convert_to_ms (simplified: confidence slot carries targetSeqIdx). [upstream: main.cpp:1470 / bfaonnx.py:1601] */
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
    const framestamps = decodeAlignmentsSimple(
      logProbs,
      spectralLen,
      numClasses,
      ph66,
      BLANK_CLASS,
      this.ignoreNoise,
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
