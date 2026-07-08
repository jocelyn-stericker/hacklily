// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.

import { int8ToDb } from './AnalysisFrame'

export const TILT_LOW_HZ: [number, number] = [50, 1000]
export const TILT_HIGH_HZ: [number, number] = [1000, 5000]
export const CENTROID_MAX_HZ = 5000

export const TILT_HOP_SEC = 0.01
export const PRE_EMPHASIS_CUTOFF_HZ = 50

/**
 * Vocal weight refers to spectral slope. We use the Alpha Ratio
 * defined in GeMAPS [1]: 1-5kHz band over 50Hz-1 kHz band. Shallower
 * tilt (less negative) means more high-frequency energy, giving a heavier voice.
 *
 * This is calculated independently from pitch and brightness. Lower formants
 * will of course capture more in the low-frequency band, decreasing weight,
 * all else equal, which matches what I hear, but is something to be aware of.
 *
 * [1]: https://www.computer.org/csdl/journal/ta/2016/02/07160715/13rRUypp569
 */
export function weight(
  spectrum: Int8Array,
  {
    sampleRate,
    freqStepHz,
    firstBinHz,
  }: {
    sampleRate: number
    freqStepHz: number
    firstBinHz: number
  },
): number | null {
  // Inverse of preEmphasis
  const a = Math.exp((-2 * Math.PI * PRE_EMPHASIS_CUTOFF_HZ) / sampleRate)
  const deEmphasisGain = (freqHz: number) =>
    1 + a * a - 2 * a * Math.cos((2 * Math.PI * freqHz) / sampleRate)

  let eLow = 0
  let eHigh = 0
  let cNum = 0
  let cDen = 0
  for (let k = 0; k < spectrum.length; k++) {
    const freq = firstBinHz + k * freqStepHz
    // Skip bins below the low band: de-emphasis loses precision
    if (freq < TILT_LOW_HZ[0]) continue
    if (freq > CENTROID_MAX_HZ) break
    // Quantized dB to linear power, un-pre-emphasized.
    const p = 10 ** (int8ToDb(spectrum[k]!) / 10) / deEmphasisGain(freq)
    if (freq >= TILT_LOW_HZ[0] && freq < TILT_LOW_HZ[1]) eLow += p
    else if (freq >= TILT_HIGH_HZ[0] && freq < TILT_HIGH_HZ[1]) eHigh += p
    cNum += freq * p
    cDen += p
  }
  if (eLow > 0 && eHigh > 0) {
    return 10 * Math.log10(eHigh / eLow)
  }

  return null
}
