// SPDX-License-Identifier: AGPL-3.0-or-later

// Braat, ITU-R BS.1770 loudness ported from jiixyj/libebur128 (ebur128/ebur128.c)
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
// Copyright (c) 2011 Jan Kokemüller (libebur128, MIT)

/**
 * Single-channel integrated loudness (LUFS) and peak measurement per
 * ITU-R BS.1770-4 / EBU R128, ported from libebur128. Braat audio is mono, so
 * the surround channel weighting is dropped and the channel weight is 1.0.
 *
 * Two wrappers, per the project's stream+batch convention:
 *   - `LoudnessAnalyzer`: feed blocks via `addFrames`, read results after.
 *   - `measureLoudness`: one-shot over a whole buffer.
 */

/** Target playback/export loudness. -14 LUFS matches YouTube/Spotify, which
 * rarely need manual volume adjustment for speech. */
export const TARGET_LUFS = -14

/** Peak ceiling as linear amplitude. -1 dBTP leaves headroom for inter-sample
 * overshoot and downstream resampling/re-encoding (libebur128 measures the
 * true peak with 4x oversampling). */
export const TRUE_PEAK_CEILING = dbToLinear(-1)

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

export interface LoudnessResult {
  /** Integrated loudness in LUFS, or null below the absolute gate (silence) or
   * for inputs shorter than one 400 ms gating block. */
  lufs: number | null
  /** Highest reconstructed (4x-oversampled) peak, linear; 1.0 == full scale. */
  truePeak: number
  /** Highest stored-sample peak, linear. */
  samplePeak: number
}

/**
 * Single linear gain that normalizes `result` to `targetLufs` without letting
 * the peak exceed `ceiling`. The peak term means a hot recording lands below
 * the loudness target rather than clipping. Returns 1 when loudness is
 * unmeasurable (silence / too short), mirroring libebur128 returning -inf.
 */
export function loudnessGain(
  result: LoudnessResult,
  {
    targetLufs = TARGET_LUFS,
    ceiling = TRUE_PEAK_CEILING,
  }: { targetLufs?: number; ceiling?: number } = {},
): number {
  if (result.lufs === null) return 1
  const toTarget = dbToLinear(targetLufs - result.lufs)
  const peak = result.truePeak
  const toCeiling = peak > 0 ? ceiling / peak : Infinity
  return Math.min(toTarget, toCeiling)
}

/** Measure integrated loudness and peaks over a whole mono buffer. */
export function measureLoudness(
  pcm: Float32Array,
  sampleRate: number,
): LoudnessResult {
  const analyzer = new LoudnessAnalyzer(sampleRate)
  analyzer.addFrames(pcm)
  return {
    lufs: analyzer.integratedLoudness,
    truePeak: analyzer.truePeak,
    samplePeak: analyzer.samplePeak,
  }
}

// ebur128.c:687 -- energy (mean K-weighted square) to LUFS.
function energyToLoudness(energy: number): number {
  return 10 * Math.log10(energy) - 0.691
}

// ebur128.c:111-115. Relative gate is -10 LU below the ungated mean; the
// absolute gate at -70 LUFS is applied as an energy threshold.
const RELATIVE_GATE_FACTOR = Math.pow(10, -10 / 10)
const ABSOLUTE_GATE_ENERGY = Math.pow(10, (-70 + 0.691) / 10)

/**
 * K-weighting pre-filter (ebur128.c:251-309): a high-shelf and a high-pass
 * biquad collapsed into one order-4 IIR, with coefficients derived per sample
 * rate. State is `v[0..4]`; `process` runs the direct-form-II difference
 * equation from ebur128.c:660-675.
 */
class KWeightFilter {
  readonly #b: [number, number, number, number, number]
  readonly #a: [number, number, number, number, number]
  #v1 = 0
  #v2 = 0
  #v3 = 0
  #v4 = 0

  constructor(sampleRate: number) {
    // Stage 1: high-shelf "head" filter.
    let f0 = 1681.974450955533
    let G = 3.999843853973347
    let Q = 0.7071752369554196
    let K = Math.tan((Math.PI * f0) / sampleRate)
    const Vh = Math.pow(10, G / 20)
    const Vb = Math.pow(Vh, 0.4996667741545416)

    const pb = [0, 0, 0]
    const pa = [1, 0, 0]
    const rb = [1, -2, 1]
    const ra = [1, 0, 0]

    const a0 = 1 + K / Q + K * K
    pb[0] = (Vh + (Vb * K) / Q + K * K) / a0
    pb[1] = (2 * (K * K - Vh)) / a0
    pb[2] = (Vh - (Vb * K) / Q + K * K) / a0
    pa[1] = (2 * (K * K - 1)) / a0
    pa[2] = (1 - K / Q + K * K) / a0

    // Stage 2: high-pass filter.
    f0 = 38.13547087602444
    Q = 0.5003270373238773
    G = 0
    K = Math.tan((Math.PI * f0) / sampleRate)
    ra[1] = (2 * (K * K - 1)) / (1 + K / Q + K * K)
    ra[2] = (1 - K / Q + K * K) / (1 + K / Q + K * K)

    // Convolve the two biquads into one 5-tap filter.
    this.#b = [
      pb[0] * rb[0]!,
      pb[0] * rb[1]! + pb[1] * rb[0]!,
      pb[0] * rb[2]! + pb[1] * rb[1]! + pb[2] * rb[0]!,
      pb[1] * rb[2]! + pb[2] * rb[1]!,
      pb[2] * rb[2]!,
    ]
    this.#a = [
      pa[0]! * ra[0]!,
      pa[0]! * ra[1] + pa[1] * ra[0]!,
      pa[0]! * ra[2] + pa[1] * ra[1] + pa[2] * ra[0]!,
      pa[1] * ra[2] + pa[2] * ra[1],
      pa[2] * ra[2],
    ]
  }

  process(x: number): number {
    const [b0, b1, b2, b3, b4] = this.#b
    const [, a1, a2, a3, a4] = this.#a
    const v0 = x - a1 * this.#v1 - a2 * this.#v2 - a3 * this.#v3 - a4 * this.#v4
    const y =
      b0 * v0 + b1 * this.#v1 + b2 * this.#v2 + b3 * this.#v3 + b4 * this.#v4
    this.#v4 = this.#v3
    this.#v3 = this.#v2
    this.#v2 = this.#v1
    this.#v1 = v0
    return y
  }
}

/**
 * Polyphase FIR interpolator for true-peak estimation (ebur128.c:119-249).
 * 4x oversampling with a 49-tap Hann-windowed sinc, split into `factor`
 * subfilters. `process` pushes one input sample and returns the largest
 * absolute value among the `factor` reconstructed samples it produces.
 */
class Interpolator {
  readonly #factor: number
  readonly #delay: number
  readonly #coeff: Float64Array[]
  readonly #index: Uint32Array[]
  readonly #z: Float32Array
  #zi = 0

  constructor(taps: number, factor: number) {
    this.#factor = factor
    this.#delay = Math.floor((taps + factor - 1) / factor)
    this.#z = new Float32Array(this.#delay)

    const coeff: number[][] = Array.from({ length: factor }, () => [])
    const index: number[][] = Array.from({ length: factor }, () => [])
    const ALMOST_ZERO = 0.000001

    for (let j = 0; j < taps; j += 1) {
      const m = j - (taps - 1) / 2
      let c = 1
      if (Math.abs(m) > ALMOST_ZERO) {
        c = Math.sin((m * Math.PI) / factor) / ((m * Math.PI) / factor)
      }
      // Hann window.
      c *= 0.5 * (1 - Math.cos((2 * Math.PI * j) / (taps - 1)))
      if (Math.abs(c) > ALMOST_ZERO) {
        const f = j % factor
        coeff[f]!.push(c)
        index[f]!.push(Math.floor(j / factor))
      }
    }
    this.#coeff = coeff.map((c) => Float64Array.from(c))
    this.#index = index.map((i) => Uint32Array.from(i))
  }

  process(x: number): number {
    this.#z[this.#zi] = x
    let peak = 0
    for (let f = 0; f < this.#factor; f += 1) {
      const coeff = this.#coeff[f]!
      const index = this.#index[f]!
      let acc = 0
      for (let t = 0; t < coeff.length; t += 1) {
        let i = this.#zi - index[t]!
        if (i < 0) i += this.#delay
        acc += this.#z[i]! * coeff[t]!
      }
      const a = Math.abs(acc)
      if (a > peak) peak = a
    }
    this.#zi += 1
    if (this.#zi === this.#delay) this.#zi = 0
    return peak
  }
}

/**
 * Streaming mono loudness measurement. Feed samples with `addFrames` (any
 * chunking), then read `integratedLoudness`, `truePeak` and
 * `samplePeak`. Mirrors libebur128's gating-block buffering
 * (ebur128.c:708-779, 977-1044): a 400 ms ring filtered in place, with a new
 * gating block emitted every 100 ms once the first 400 ms have filled.
 */
export class LoudnessAnalyzer {
  readonly #filter: KWeightFilter
  readonly #interp: Interpolator | null

  // Ring of K-weighted samples, exactly one 400 ms block long.
  readonly #audioData: Float64Array
  readonly #ringFrames: number
  readonly #blockFrames: number
  readonly #hopFrames: number
  #audioDataIndex = 0
  #neededFrames: number

  // Energies of gating blocks above the absolute gate.
  readonly #blockEnergies: number[] = []

  #samplePeak = 0
  #truePeak = 0

  constructor(sampleRate: number) {
    this.#filter = new KWeightFilter(sampleRate)
    // ebur128.c:347-352 -- 4x for rates below 96 kHz; above that we skip true
    // peak and fall back to the sample peak.
    this.#interp = sampleRate < 96000 ? new Interpolator(49, 4) : null

    // ebur128.c:449,458-463,994 -- 100 ms hop, 400 ms gating block, ring sized
    // to the block and rounded to a whole number of hops.
    this.#hopFrames = Math.floor((sampleRate + 5) / 10)
    this.#blockFrames = this.#hopFrames * 4
    let ring = Math.floor((sampleRate * 400) / 1000)
    if (ring % this.#hopFrames) {
      ring += this.#hopFrames - (ring % this.#hopFrames)
    }
    this.#ringFrames = ring
    this.#audioData = new Float64Array(ring)
    // The first block needs a full 400 ms; subsequent ones only a 100 ms hop.
    this.#neededFrames = this.#blockFrames
  }

  addFrames(src: Float32Array): void {
    let i = 0
    while (i < src.length) {
      const avail = src.length - i
      if (avail >= this.#neededFrames) {
        this.#filterInto(src, i, this.#neededFrames)
        i += this.#neededFrames
        this.#audioDataIndex += this.#neededFrames
        this.#calcGatingBlock()
        this.#neededFrames = this.#hopFrames
        if (this.#audioDataIndex === this.#ringFrames) this.#audioDataIndex = 0
      } else {
        this.#filterInto(src, i, avail)
        this.#audioDataIndex += avail
        this.#neededFrames -= avail
        i += avail
      }
    }
  }

  // Filter `count` samples from `src[offset...]` into the ring at the current
  // write position, updating the sample- and true-peak trackers as we go.
  #filterInto(src: Float32Array, offset: number, count: number): void {
    const base = this.#audioDataIndex
    for (let k = 0; k < count; k += 1) {
      const x = src[offset + k]!
      const a = x < 0 ? -x : x
      if (a > this.#samplePeak) this.#samplePeak = a
      if (this.#interp) {
        const tp = this.#interp.process(x)
        if (tp > this.#truePeak) this.#truePeak = tp
      }
      this.#audioData[base + k] = this.#filter.process(x)
    }
  }

  // ebur128.c:708-779 -- mean square over the last 400 ms; keep if above the
  // absolute gate. The split handles the ring wrapping past its end.
  #calcGatingBlock(): void {
    let sum = 0
    const block = this.#blockFrames
    const idx = this.#audioDataIndex
    if (idx < block) {
      for (let i = 0; i < idx; i += 1) sum += this.#audioData[i]! ** 2
      for (
        let i = this.#ringFrames - (block - idx);
        i < this.#ringFrames;
        i += 1
      )
        sum += this.#audioData[i]! ** 2
    } else {
      for (let i = idx - block; i < idx; i += 1) sum += this.#audioData[i]! ** 2
    }
    sum /= block
    if (sum >= ABSOLUTE_GATE_ENERGY) this.#blockEnergies.push(sum)
  }

  get samplePeak(): number {
    return this.#samplePeak
  }

  // libebur128 falls back to the sample peak when there's no interpolator.
  get truePeak(): number {
    return this.#interp ? this.#truePeak : this.#samplePeak
  }

  // ebur128.c:1085-1149 -- two-stage gating: relative threshold from the mean of
  // absolute-gated blocks, then the mean of blocks at or above it.
  get integratedLoudness(): number | null {
    const blocks = this.#blockEnergies
    if (blocks.length === 0) return null

    let mean = 0
    for (const z of blocks) mean += z
    mean /= blocks.length
    const relativeThreshold = mean * RELATIVE_GATE_FACTOR

    let gated = 0
    let count = 0
    for (const z of blocks) {
      if (z >= relativeThreshold) {
        gated += z
        count += 1
      }
    }
    if (count === 0) return null
    return energyToLoudness(gated / count)
  }
}
