// SPDX-License-Identifier: AGPL-3.0-or-later
// Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
// Copyright (C) Tabahi <tabahi@duck.com>.
// See ATTRIBUTION.md.

/** A single aligned phoneme produced by the simplified pipeline. */
export interface PhonemeTimestamp {
  /** ph66 phoneme class id (0 = SIL, 66 = noise/blank). */
  phonemeId: number
  /** Label for `phonemeId` (IPA-ish base phoneme), e.g. "b", "aɪ", "SIL". */
  phonemeLabel: string
  /** Inclusive start frame index in the stitched/log-prob frame grid. */
  startFrame: number
  /** Exclusive end frame index. */
  endFrame: number
  /**
   * Index of this phoneme within the input target sequence (-1 for unmatched
   * blanks). In the Python/C++ reference's simplified pipeline this value is
   * what ends up in the tuple's "confidence" slot; we expose it explicitly.
   */
  targetIndex: number
  /** Start time in milliseconds (offset-adjusted). */
  startMs: number
  /** End time in milliseconds (offset-adjusted). */
  endMs: number
  /**
   * Per-phoneme confidence score (0-1). Computed as the mean softmax
   * probability of the assigned phoneme over "good" frames within the segment
   * (frames where P > half-initial-confidence or P > 0.1). The segment's
   * endFrame may be trimmed inward when trailing frames fall below the
   * threshold. [upstream: main.cpp:1498 calculate_confidences]
   */
  confidence: number
}

export interface AlignmentResult {
  phonemeTimestamps: PhonemeTimestamp[]
  /** Number of valid spectral frames used for alignment. */
  spectralLength: number
  /** Total stitched frames produced by CUPE. */
  totalFrames: number
}

/** Output of phonemizing an espeak-ng IPA transcript into ph66 space. */
export interface PhonemizedTranscript {
  /** ph66 phoneme class indices. */
  ph66: number[]
  /** pg16 phoneme group indices (parallel to `ph66`). */
  pg16: number[]
  /** Mapped base-phoneme labels (parallel to `ph66`). */
  mipa: string[]
  /** Original espeak phoneme per output token ("-" for compound continuations). */
  eipa: string[]
  /** Word index per phoneme (parallel to `ph66`). */
  wordNum: number[]
  /** Compressed list of words that produced phonemes. */
  words: string[]
}

export interface PhonemizeOptions {
  /**
   * Separator between phonemes *within a word* (one espeak phoneme per token).
   * Default '|'. NOTE: the '|' is inserted upstream by the `phonemizer`
   * library's Separator(phone='|'), not by espeak-ng's raw `--ipa` output --
   * feed separated, stress-free tokens for parity with BFA. A word with no
   * separator falls back to lossy greedy segmentation (discouraged). Set this
   * if your espeak frontend emits a different delimiter. See the README
   * "Transcript input contract".
   */
  phoneSeparator?: string
  /** Drop `noise` phonemes from the output (Python default: true). */
  removeNoisePhonemes?: boolean
  /**
   * Treat the transcript as a CJK / no-space script where each character is a
   * token (mirrors break_words_special for no_space_langs). Default false.
   */
  noSpace?: boolean
}

export interface AlignerConfig {
  /** Max segment duration in seconds (Python default 10) -> wavLenMax samples. */
  durationMax?: number
  /** Analysis window in ms (Python `_setup_config` default 120). */
  windowSizeMs?: number
  /** Window stride in ms (Python default 80). */
  strideMs?: number
  /** Sample rate; must be 16000 for the shipped CUPE models. */
  sampleRate?: number
  /**
   * Post-process the decoded alignment to guarantee every target phoneme is
   * represented, synthesizing estimated stamps for any the decoder dropped.
   * Port of the C++ advanced-pipeline `ensure_target_coverage`. Default true.
   */
  ensureTargetCoverage?: boolean
  /**
   * Widen each phoneme's start/end into adjacent frames that still carry
   * meaningful probability for it, yielding contiguous coverage instead of the
   * single-frame cores the simplified decoder emits. Port of the C++
   * advanced-pipeline `extend_soft_boundaries`. Default true.
   */
  extendSoftBoundaries?: boolean
  /**
   * Leniency of `extendSoftBoundaries`; the lenient passes accept frames
   * with probability >= 10^-boundarySoftness. Higher = more extension. Default
   * 7 (upstream default).
   */
  boundarySoftness?: number
}
