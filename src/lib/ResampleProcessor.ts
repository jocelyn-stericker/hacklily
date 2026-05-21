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

// Resampler — Praat-compatible sinc interpolation with raised cosine window
// Ported from fon/Sound.cpp (Sound_resample) and melder/NUMinterpol.cpp

import { complexFFTForward, complexFFTInverse, FftTables } from './fft'
import { nextPow2 } from './mathUtils'

export function interpolateSinc(
  y: Float32Array,
  x: number,
  maxDepth: number,
): number {
  const n = y.length
  if (n === 0) return 0
  if (x <= 0) return y[0]!
  if (x >= n - 1) return y[n - 1]!
  const midleft = Math.floor(x)
  const midright = midleft + 1
  if (x === midleft) return y[midleft]!
  const depth = Math.min(maxDepth, midright, n - 1 - midleft)
  if (depth <= 0) return y[Math.round(x)]!
  const halfwidth = depth + 0.5
  const windowPhaseStep = Math.PI / halfwidth
  const sinStep = Math.sin(windowPhaseStep),
    cosStep = Math.cos(windowPhaseStep)
  let result = 0.0
  // Left half (ix from midleft down to midright - depth)
  {
    let leftPhase = Math.PI * (x - midleft)
    let halfSin = 0.5 * Math.sin(leftPhase)
    const winPhase = leftPhase / halfwidth
    let sinW = Math.sin(winPhase),
      cosW = Math.cos(winPhase)
    for (let ix = midleft; ix >= midright - depth; ix--) {
      result += y[ix]! * (halfSin / leftPhase) * (1.0 + cosW)
      leftPhase += Math.PI
      halfSin = -halfSin
      const ns = cosW * sinStep + sinW * cosStep
      cosW = cosW * cosStep - sinW * sinStep
      sinW = ns
    }
  }
  // Right half (ix from midright up to midleft + depth)
  {
    let rightPhase = Math.PI * (midright - x)
    let halfSin = 0.5 * Math.sin(rightPhase)
    const winPhase = rightPhase / halfwidth
    let sinW = Math.sin(winPhase),
      cosW = Math.cos(winPhase)
    for (let ix = midright; ix <= midleft + depth; ix++) {
      result += y[ix]! * (halfSin / rightPhase) * (1.0 + cosW)
      rightPhase += Math.PI
      halfSin = -halfSin
      const ns = cosW * sinStep + sinW * cosStep
      cosW = cosW * cosStep - sinW * sinStep
      sinW = ns
    }
  }
  return result
}

export function resample(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
  precision = 50,
): Float32Array {
  const upfactor = toRate / fromRate
  if (Math.abs(upfactor - 1.0) < 1e-6) return samples.slice()
  const n = samples.length
  let filtered: Float32Array
  if (upfactor < 1.0) {
    // Anti-aliasing: FFT, zero bins above cutoff, IFFT
    const antiTurnAround = 1000
    const nfft = nextPow2(n + 2 * antiTurnAround)
    const fftTables = new FftTables(nfft)
    const re = new Float32Array(nfft)
    const im = new Float32Array(nfft)
    for (let i = 0; i < n; i++) re[antiTurnAround + i] = samples[i]!
    complexFFTForward(re, im, fftTables)
    const maxBin = Math.floor((nfft * upfactor) / 2)
    for (let k = maxBin + 1; k <= nfft / 2; k++) {
      re[k] = 0
      im[k] = 0
    }
    for (let k = maxBin + 1; k < nfft / 2; k++) {
      re[nfft - k] = 0
      im[nfft - k] = 0
    }
    complexFFTInverse(re, im, fftTables)
    const scale = 1.0 / nfft
    filtered = new Float32Array(n)
    for (let i = 0; i < n; i++) filtered[i] = re[antiTurnAround + i]! * scale
  } else {
    filtered = samples
  }
  const nNew = Math.round(n * upfactor)
  const x1New = 0.5 * (n / fromRate - (nNew - 1) / toRate)
  const output = new Float32Array(nNew)
  for (let i = 0; i < nNew; i++) {
    const t = x1New + i / toRate
    output[i] = interpolateSinc(filtered, t * fromRate - 0.5, precision)
  }
  return output
}

/**
 * Streaming resampler using a Hann-windowed sinc kernel, suitable for use
 * inside an AudioWorkletProcessor.
 *
 * Feed audio blocks of any size via `feed()`; pull resampled output via `drain()`.
 * No heap allocation occurs after construction.
 *
 * For downsampling (toRate < fromRate), the sinc cutoff is shifted to the
 * output Nyquist (`scale = toRate/fromRate`), providing anti-aliasing in the
 * same kernel pass as interpolation.  The batch `resample()` applies FFT-based
 * anti-aliasing separately; results are equivalent but not sample-identical.
 *
 * There is an inherent startup latency of `ceil(precision / min(1, toRate/fromRate))`
 * input samples before the first output sample is produced.  Indices before the
 * stream start are treated as zero (the ring buffer is zero-initialised), so
 * the first few output samples will have a small fade-in transient.
 *
 * Example (inside AudioWorkletProcessor.process):
 * ```ts
 * this.resampler.feed(inputs[0][0]);
 * const scratch = new Float32Array(this.resampler.available());
 * const n = this.resampler.drain(scratch);
 * ```
 */
export class ResamplerStreamProcessor {
  private readonly upfactor: number // toRate / fromRate
  private readonly scale: number // min(1, upfactor) — sinc cutoff scale for anti-aliasing
  private readonly kernelHalf: number // kernel half-width in input samples = ceil(precision / scale)

  private readonly ring: Float32Array
  private readonly ringMask: number
  private totalFed: number // total input samples fed

  private readonly outBuf: Float32Array
  private readonly outMask: number
  private outWritten: number // total output samples produced
  private outRead: number // total output samples consumed

  // Pre-computed sinc trig recurrence values (step = scale × π per input sample)
  private readonly sincStep: number
  private readonly sinSincStep: number
  private readonly cosSincStep: number
  // Pre-computed window trig recurrence values (step = π / halfwidth per input sample)
  private readonly winStep: number
  private readonly sinWinStep: number
  private readonly cosWinStep: number

  constructor(fromRate: number, toRate: number, precision = 50) {
    if (fromRate <= 0 || toRate <= 0)
      throw new Error('Sample rates must be positive')
    const upfactor = toRate / fromRate
    this.upfactor = upfactor
    this.scale = Math.min(1.0, upfactor)
    this.kernelHalf = Math.ceil(precision / this.scale)

    // Ring must fit the full kernel span plus a generous feed block margin.
    // Indices below 0 wrap to the high end (which stays zero-initialised),
    // giving correct zero-padding before the stream starts.
    const ringSize = nextPow2(2 * this.kernelHalf + 1024)
    this.ring = new Float32Array(ringSize)
    this.ringMask = ringSize - 1
    this.totalFed = 0

    const outSize = nextPow2(
      Math.ceil(this.kernelHalf * Math.max(1, upfactor) * 4) + 256,
    )
    this.outBuf = new Float32Array(outSize)
    this.outMask = outSize - 1
    this.outWritten = 0
    this.outRead = 0

    // Sinc trig step: sin/cos of (scale × π) — the phase increment per input sample
    this.sincStep = this.scale * Math.PI
    this.sinSincStep = Math.sin(this.sincStep)
    this.cosSincStep = Math.cos(this.sincStep)

    // Window trig step: sin/cos of (π / halfwidth) — the Hann-window increment per input sample
    const halfwidth = this.kernelHalf + 0.5
    this.winStep = Math.PI / halfwidth
    this.sinWinStep = Math.sin(this.winStep)
    this.cosWinStep = Math.cos(this.winStep)
  }

  /** Feed a block of new input samples. May enqueue zero or more output samples. */
  feed(samples: Float32Array): void {
    const { ring, ringMask } = this
    for (let i = 0; i < samples.length; i++)
      ring[(this.totalFed + i) & ringMask] = samples[i]!
    this.totalFed += samples.length
    this._processReady()
  }

  private _processReady(): void {
    const {
      ring,
      ringMask,
      upfactor,
      scale,
      kernelHalf,
      sincStep,
      sinSincStep,
      cosSincStep,
      winStep,
      sinWinStep,
      cosWinStep,
      outBuf,
      outMask,
    } = this

    while (true) {
      // Input position corresponding to the next output sample
      const inputX = this.outWritten / upfactor
      const midleft = Math.floor(inputX)
      // Need samples up to midleft + kernelHalf to be available
      if (midleft + kernelHalf >= this.totalFed) break
      if (this.outWritten - this.outRead >= outBuf.length) break // output full

      let lr = 0.0

      // Left half: ix = midleft down to midleft - kernelHalf + 1
      // scale * sinc(scale*(inputX-ix)) * Hann((inputX-ix)/halfwidth)
      {
        const dx = inputX - midleft // ∈ [0, 1)
        let sp = sincStep * dx // scale × π × (inputX - ix), starting offset
        let sinSp = Math.sin(sp),
          cosSp = Math.cos(sp)
        const wp = winStep * dx // π × (inputX - ix) / halfwidth
        let sinW = Math.sin(wp),
          cosW = Math.cos(wp)
        for (let ix = midleft; ix > midleft - kernelHalf; ix--) {
          // sp ≈ 0 only when inputX is exactly an integer (dx=0); L'Hôpital gives 0.5
          const sv = sp < 1e-12 ? 0.5 : sinSp / (2.0 * sp)
          lr += ring[ix & ringMask]! * sv * (1.0 + cosW)
          sp += sincStep
          const ns = sinSp * cosSincStep + cosSp * sinSincStep
          cosSp = cosSp * cosSincStep - sinSp * sinSincStep
          sinSp = ns
          const nw = sinW * cosWinStep + cosW * sinWinStep
          cosW = cosW * cosWinStep - sinW * sinWinStep
          sinW = nw
        }
      }

      // Right half: ix = midleft + 1 up to midleft + kernelHalf
      {
        const dx = midleft + 1 - inputX // ∈ (0, 1]
        let sp = sincStep * dx
        let sinSp = Math.sin(sp),
          cosSp = Math.cos(sp)
        const wp = winStep * dx
        let sinW = Math.sin(wp),
          cosW = Math.cos(wp)
        for (let ix = midleft + 1; ix <= midleft + kernelHalf; ix++) {
          const sv = sp < 1e-12 ? 0.5 : sinSp / (2.0 * sp)
          lr += ring[ix & ringMask]! * sv * (1.0 + cosW)
          sp += sincStep
          const ns = sinSp * cosSincStep + cosSp * sinSincStep
          cosSp = cosSp * cosSincStep - sinSp * sinSincStep
          sinSp = ns
          const nw = sinW * cosWinStep + cosW * sinWinStep
          cosW = cosW * cosWinStep - sinW * sinWinStep
          sinW = nw
        }
      }

      // scale × Σ sinc(scale×t)×Hann(t/half) = 1 for DC (Poisson + normalisation)
      outBuf[this.outWritten & outMask] = scale * lr
      this.outWritten++
    }
  }

  /** Number of output samples currently available to read. */
  available(): number {
    return this.outWritten - this.outRead
  }

  /**
   * Copies up to `out.length` output samples into `out[0..n-1]` and advances
   * the read pointer.  Returns the number of samples actually written.
   */
  drain(out: Float32Array): number {
    const n = Math.min(out.length, this.available())
    for (let i = 0; i < n; i++)
      out[i] = this.outBuf[(this.outRead + i) & this.outMask]!
    this.outRead += n
    return n
  }
}
