// SPDX-License-Identifier: AGPL-3.0-or-later

// Braat, adapted from Praat
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
// Copyright (C) 1992-2011,2014-2020,2023,2025 Paul Boersma

/**
 * Spectrogram window shapes. 'gaussian' gives the best joint time-frequency localisation.
 */
export type WindowShape =
  | 'gaussian'
  | 'hanning'
  | 'hamming'
  | 'bartlett'
  | 'welch'
  | 'square'

/**
 * Fills `out[0..nsamp-1]` with the window function and returns sum-of-squares.
 *
 * `physicalWidthSamples` = physicalAnalysisWidthSec * sampleRate.
 * For Gaussian this equals 2 * effectiveWidthSamples.
 * Matches Praat's Sound_and_Spectrogram.cpp (1-indexed i translated to 0-indexed).
 */
export function buildWindow(
  shape: WindowShape,
  nsamp: number,
  physicalWidthSamples: number,
  out: Float32Array,
): number {
  const edge = Math.exp(-12.0)
  const edgeC = 1.0 - edge
  let ssq = 0
  for (let i = 0; i < nsamp; i++) {
    const i1 = i + 1 // 1-indexed
    const phase = i1 / physicalWidthSamples // in (0, 1]
    let w: number
    switch (shape) {
      case 'square':
        w = 1.0
        break
      case 'hamming':
        w = 0.54 - 0.46 * Math.cos(2 * Math.PI * phase)
        break
      case 'bartlett':
        w = 1.0 - Math.abs(2.0 * phase - 1.0)
        break
      case 'welch': {
        const t = 2.0 * phase - 1.0
        w = 1.0 - t * t
        break
      }
      case 'hanning':
        w = 0.5 * (1.0 - Math.cos(2 * Math.PI * phase))
        break
      case 'gaussian': {
        // phase measured from centre; physicalWidthSamples is the denominator
        const p = (i1 - 0.5 * (nsamp + 1)) / physicalWidthSamples
        w = (Math.exp(-48.0 * p * p) - edge) / edgeC
        break
      }
    }
    out[i] = w
    ssq += w * w
  }
  return ssq
}

/**
 * Formant-analysis Gaussian window (slightly different normalisation from the spectrogram one).
 * Source: Sound_to_Formant.cpp lines 317-320.
 */
export function buildFormantGaussianWindow(
  nsamp: number,
  out: Float32Array,
): void {
  const edge = Math.exp(-12.0)
  const edgeC = 1.0 - edge
  const denom = (nsamp + 1) * (nsamp + 1)
  for (let i = 0; i < nsamp; i++) {
    const d = i + 1 - 0.5 * (nsamp + 1)
    out[i] = (Math.exp((-48.0 * d * d) / denom) - edge) / edgeC
  }
}
