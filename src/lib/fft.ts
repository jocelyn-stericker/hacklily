/* Braat, adapted from Praat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 1997-2011,2025 David Weenink, Paul Boersma 2016-2018,2020
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

// FFT (radix-2 Cooley-Tukey, power-of-2 only)

/** Pre-computed FFT twiddle factors and bit-reversal table. Construct once per size. */
export class FftTables {
  readonly N: number
  readonly cosTable: Float32Array
  readonly sinTable: Float32Array
  readonly bitRev: Int32Array

  constructor(N: number) {
    if (N < 2 || (N & (N - 1)) !== 0)
      throw new Error(`FFT size must be a power of 2, got ${N}`)
    this.N = N
    this.cosTable = new Float32Array(N / 2)
    this.sinTable = new Float32Array(N / 2)
    this.bitRev = new Int32Array(N)
    for (let k = 0; k < N / 2; k++) {
      const a = (-2 * Math.PI * k) / N
      this.cosTable[k] = Math.cos(a)
      this.sinTable[k] = Math.sin(a)
    }
    const bits = Math.log2(N)
    for (let i = 0; i < N; i++) {
      let rev = 0
      for (let b = 0; b < bits; b++) rev = (rev << 1) | ((i >> b) & 1)
      this.bitRev[i] = rev
    }
  }
}

/**
 * In-place complex DIT FFT (Cooley-Tukey, radix-2).
 * `re` and `im` are real and imaginary arrays, both length `tables.N`, modified in-place.
 */
export function complexFFTForward(
  re: Float32Array,
  im: Float32Array,
  tables: FftTables,
): void {
  const N = tables.N
  for (let i = 0; i < N; i++) {
    const j = tables.bitRev[i]!
    if (i < j) {
      let t = re[i]!
      re[i] = re[j]!
      re[j] = t
      t = im[i]!
      im[i] = im[j]!
      im[j] = t
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1
    const step = N / len
    for (let i = 0; i < N; i += len) {
      for (let j = 0; j < half; j++) {
        const wr = tables.cosTable[j * step]
        const wi = tables.sinTable[j * step]
        const ur = re[i + j]!,
          ui = im[i + j]!
        const vr = re[i + j + half]! * wr! - im[i + j + half]! * wi!
        const vi = re[i + j + half]! * wi! + im[i + j + half]! * wr!
        re[i + j] = ur + vr
        im[i + j] = ui + vi
        re[i + j + half] = ur - vr
        im[i + j + half] = ui - vi
      }
    }
  }
}

/**
 * In-place complex DIT IFFT (Cooley-Tukey, radix-2). Conjugate twiddle pass; caller scales by 1/N.
 * `re` and `im` are real and imaginary arrays, both length `tables.N`, modified in-place.
 */
export function complexFFTInverse(
  re: Float32Array,
  im: Float32Array,
  tables: FftTables,
): void {
  const N = tables.N
  for (let i = 0; i < N; i++) {
    const j = tables.bitRev[i]!
    if (i < j) {
      let t = re[i]!
      re[i] = re[j]!
      re[j] = t
      t = im[i]!
      im[i] = im[j]!
      im[j] = t
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1
    const step = N / len
    for (let i = 0; i < N; i += len) {
      for (let j = 0; j < half; j++) {
        const wr = tables.cosTable[j * step]!
        const wi = -tables.sinTable[j * step]!
        const ur = re[i + j]!,
          ui = im[i + j]!
        const vr = re[i + j + half]! * wr - im[i + j + half]! * wi
        const vi = re[i + j + half]! * wi + im[i + j + half]! * wr
        re[i + j] = ur + vr
        im[i + j] = ui + vi
        re[i + j + half] = ur - vr
        im[i + j + half] = ui - vi
      }
    }
  }
}
