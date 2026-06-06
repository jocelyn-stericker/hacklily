/*
 * Public API for the BFA TypeScript port (simplified pipeline).
 *
 * Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
 * Copyright (C) Tabahi <tabahi@duck.com>.
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE at the repository root and ATTRIBUTION.md.
 */

import * as ort from 'onnxruntime-web'

import type { PhonemeTimestampAligner } from './aligner.js'
import { phonemizeTranscript } from './phonemizer.js'
import type {
  AlignerConfig,
  AlignmentResult,
  PhonemizeOptions,
  PhonemizedTranscript,
} from './types.js'

export { PhonemeTimestampAligner, CupeOnnxPredictor } from './aligner.js'
export { phonemizeTranscript } from './phonemizer.js'
export { getCompoundPhonemeMapping } from './ph66Mapper.js'
export * from './types.js'
export {
  phonemeMappedIndex,
  phonemeGroupsMapper,
  phonemeGroupsIndex,
} from './ph66Data.js'
// Re-export the runtime so callers can configure ort.env.wasm before init.
export { ort }

export type ModelSource = ArrayBuffer | Uint8Array | string

/**
 * Create a CUPE ONNX inference session on the wasm backend.
 * Configure `ort.env.wasm.wasmPaths` (and numThreads/simd) before calling.
 */
export async function createCupeSession(
  model: ModelSource,
  sessionOptions?: ort.InferenceSession.SessionOptions,
): Promise<ort.InferenceSession> {
  const options: ort.InferenceSession.SessionOptions = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    ...sessionOptions,
  }
  // create() has distinct overloads for a URL string vs. raw bytes; branch so
  // overload resolution picks one (a union argument matches neither).
  if (typeof model === 'string') {
    return ort.InferenceSession.create(model, options)
  }
  const bytes = model instanceof Uint8Array ? model : new Uint8Array(model)
  return ort.InferenceSession.create(bytes, options)
}

/** Result of {@link alignTranscript}: alignment plus the phonemization used. */
export interface TranscriptAlignment extends AlignmentResult {
  phonemized: PhonemizedTranscript
}

/**
 * One-shot convenience: phonemize an espeak-ng IPA transcript and align it
 * against 16 kHz mono audio.
 */
export async function alignTranscript(
  aligner: PhonemeTimestampAligner,
  audio: Float32Array,
  transcript: string,
  options: {
    phonemize?: PhonemizeOptions
    startOffsetSec?: number
  } = {},
): Promise<TranscriptAlignment> {
  const phonemized = phonemizeTranscript(transcript, options.phonemize)
  const result = await aligner.align(
    audio,
    phonemized.ph66,
    options.startOffsetSec ?? 0,
  )
  return { ...result, phonemized }
}

export type { AlignerConfig }
