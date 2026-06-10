// SPDX-License-Identifier: AGPL-3.0-or-later

// Braat, adapted from Praat
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
// Copyright (C) 1992-2025 Paul Boersma

/**
 * First-order high-pass pre-emphasis filter, applied backwards through the signal.
 *
 * Filter: s[i] -= exp(-2PI * cutoffHz / sampleRate) * s[i-1]
 *
 * The backward scan (high index -> low) matches Praat's implementation, ensuring
 * each sample is modified using the original value of its predecessor.
 *
 * Source: fon/Sound.cpp Sound_preEmphasize_inplace()
 *
 * @param signal     Mono audio samples, modified in-place.
 * @param sampleRate Sample rate of the signal, Hz.
 * @param cutoffHz   High-pass cutoff frequency, Hz. Typical: 50 Hz.
 */
export function preEmphasis(
  signal: Float32Array,
  sampleRate: number,
  cutoffHz: number,
): void {
  const factor = Math.exp((-2 * Math.PI * cutoffHz) / sampleRate)
  for (let i = signal.length - 1; i >= 1; i--)
    signal[i]! -= factor * signal[i - 1]!
}
