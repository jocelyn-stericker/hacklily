/* Braat, adapted from Praat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 1992-2025 Paul Boersma
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

/**
 * First-order high-pass pre-emphasis filter, applied backwards through the signal.
 *
 * Filter: s[i] −= exp(−2π * cutoffHz / sampleRate) * s[i−1]
 *
 * The backward scan (high index → low) matches Praat's implementation, ensuring
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
