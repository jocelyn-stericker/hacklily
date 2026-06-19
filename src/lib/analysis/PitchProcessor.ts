// SPDX-License-Identifier: AGPL-3.0-or-later
// Braat, adapted from Praat
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
// Copyright (C) 1997-2011,2025 David Weenink, Paul Boersma 2016-2018,2020
// Copyright (C) 1992-2005,2007-2012,2014-2020,2023-2025 Paul Boersma

import { interpolateSinc } from '#/lib/analysis/ResampleProcessor'
import { complexFFTForward, complexFFTInverse, FftTables } from '#/lib/dsp/fft'
import { nextPow2 } from '#/lib/dsp/mathUtils'

/**
 * Configuration for Praat's "Sound: To Pitch (filtered autocorrelation)..." algorithm.
 * Pre-filter: Gaussian low-pass (cutoff = ~pitchCeilingHz / 2.1 for attenuationAtTop = 0.1)
 * applied before per-frame autocorrelation to suppress upper harmonics and reduce octave errors.
 */
export interface PitchConfig {
  /** Time step between frames, seconds.  0 = auto = 3 / pitchFloorHz / 4 (Praat 4x oversampling).  Default: 0. */
  timeStepSec: number

  /** Lower pitch bound in Hz; determines analysis window length (3 periods at pitchFloorHz).  Default: 75. */
  pitchFloorHz: number

  /** Upper pitch bound in Hz.  Default: 600. */
  pitchCeilingHz: number

  /**
   * Max AC-peak candidates per frame; auto-raised to ceil(pitchCeilingHz / pitchFloorHz).
   * Default: 15.
   */
  maxCandidates: number

  /**
   * Gaussian pre-filter attenuation at pitchCeilingHz.  0 = disable (plain ac).
   * Default: 0.1 (-20 dB at ceiling).
   */
  attenuationAtTop: number

  /**
   * Frames with local peak < silenceThreshold / (1 + voicingThreshold) * globalPeak
   * are treated as silence and strongly prefer the unvoiced candidate.  Default: 0.03.
   */
  silenceThreshold: number

  /** Min normalized AC peak for a voiced frame; also the unvoiced candidate's base strength.  Default: 0.45. */
  voicingThreshold: number

  /** Cost per octave that penalises high-frequency pitch (biases toward lower pitch). Default: 0.01. */
  octaveCost: number

  /**
   * Cost per octave of pitch jump between adjacent frames.
   * Scaled by 0.01 / timeStep for time-step independence.  Default: 0.35.
   */
  octaveJumpCost: number

  /**
   * Cost of a voiced <-> unvoiced transition.
   * Also scaled by 0.01 / timeStep internally.  Default: 0.14.
   */
  voicedUnvoicedCost: number
}

export interface PitchFrame {
  /** Time at centre of frame (seconds from start of signal). */
  timeSec: number
  /** Fundamental frequency in Hz.  0 means the frame is unvoiced. */
  frequencyHz: number
  /**
   * Normalized autocorrelation at the selected lag (approximately 0-1).
   * 0 for unvoiced frames.
   */
  strength: number
}

export interface PitchResult {
  frames: PitchFrame[]
  timeStepSec: number
  /** Time at the centre of the first frame. */
  t1Sec: number
}

/**
 * Golden-section maximization of a unimodal function on [a, b]; returns [xBest, yBest].
 * Matches Praat's NUMimproveMaximum (melder/NUMinterpol.cpp).
 */
function _goldenSectionMax(
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number,
): [number, number] {
  const phi = (Math.sqrt(5) - 1) * 0.5 // 0.6180339...
  let x0 = a,
    x3 = b
  let x1 = x3 - phi * (x3 - x0)
  let x2 = x0 + phi * (x3 - x0)
  let f1 = f(x1),
    f2 = f(x2)
  while (x3 - x0 > tol) {
    if (f2 > f1) {
      x0 = x1
      x1 = x2
      f1 = f2
      x2 = x0 + phi * (x3 - x0)
      f2 = f(x2)
    } else {
      x3 = x2
      x2 = x1
      f2 = f1
      x1 = x3 - phi * (x3 - x0)
      f1 = f(x1)
    }
  }
  return f1 > f2 ? [x1, f1] : [x2, f2]
}

/**
 * Analyses a mono audio signal and returns a pitch (F0) track.
 * Implements Praat's "Sound: To Pitch (filtered autocorrelation)..." algorithm:
 *   1. Gaussian low-pass pre-filter.
 *   2. Per-frame: DC removal -> Hanning window -> FFT autocorrelation -> window-AC
 *      normalisation -> sinc-interpolated peak candidates.
 *   3. Viterbi path finder to select the smoothest voiced/unvoiced trajectory.
 *
 * Scratch buffers are allocated at construction; `analyze()` only allocates
 * the output array and per-run candidate / DP tables.
 *
 * Example:
 * ```ts
 * const proc = new PitchProcessor(
 *   { pitchFloorHz: 75, pitchCeilingHz: 600, attenuationAtTop: 0.1 },
 *   44100,
 * );
 * const { frames } = proc.analyze(monoSamples);
 * const voiced = frames.filter(f => f.frequencyHz > 0);
 * ```
 */
export class PitchProcessor {
  private readonly sampleRate: number
  private readonly cfg: Required<PitchConfig>

  private readonly nsampPeriod: number // floor(sampleRate / pitchFloor)
  private readonly nsampWindow: number // analysis window length (even)
  private readonly halfNsampWindow: number
  private readonly nsampFFT: number // next-pow-2 >= nsampWindow * 1.5
  private readonly brentIxmax: number // floor(nsampWindow * 0.5) -- max useful lag
  private readonly minimumLag: number // max(2, floor(sampleRate / pitchCeiling))
  private readonly maximumLag: number // min(floor(nsampWindow/3)+2, nsampWindow)
  private readonly timeStep: number // resolved time step, seconds

  private readonly window: Float32Array // Hanning window  [nsampWindow]
  private readonly windowAC: Float32Array // normalised window AC [brentIxmax+1]
  private readonly fftTables: FftTables
  private readonly fftRe: Float32Array // [nsampFFT]
  private readonly fftIm: Float32Array // [nsampFFT]
  // Symmetric r-buffer: index (brentIxmax + k) = r[k], (brentIxmax - k) = r[-k] = r[k].
  // This layout lets interpolateSinc read across lag=0 without special-casing.
  private readonly rBuf: Float32Array // [2 * brentIxmax + 1]

  constructor(config: Partial<PitchConfig>, sampleRate: number) {
    const cfg: Required<PitchConfig> = {
      timeStepSec: 0,
      pitchFloorHz: 75,
      pitchCeilingHz: 600,
      maxCandidates: 15,
      attenuationAtTop: 0.1,
      // Increased
      silenceThreshold: 0.05,
      voicingThreshold: 0.45,
      octaveCost: 0.01,
      octaveJumpCost: 0.35,
      voicedUnvoicedCost: 0.14,
      ...config,
    }
    // Praat: if maxnCandidates < ceiling/floor, raise it (enough room for all harmonics)
    cfg.maxCandidates = Math.max(
      cfg.maxCandidates,
      Math.ceil(cfg.pitchCeilingHz / cfg.pitchFloorHz),
    )
    this.cfg = cfg
    this.sampleRate = sampleRate

    const dt = 1 / sampleRate
    const periodsPerWindow = 3.0

    this.nsampPeriod = Math.floor(1.0 / dt / cfg.pitchFloorHz)

    // Praat: halfnsamp = floor(nsampApprox/2) - 1; nsampWindow = halfnsamp * 2 (forced even)
    const nsampApprox = Math.floor(periodsPerWindow / cfg.pitchFloorHz / dt)
    const halfNsamp = Math.floor(nsampApprox / 2) - 1
    if (halfNsamp < 2)
      throw new Error(
        'pitchFloorHz is too high for this sample rate (analysis window < 4 samples).',
      )
    this.nsampWindow = halfNsamp * 2
    this.halfNsampWindow = halfNsamp

    this.minimumLag = Math.max(2, Math.floor(1.0 / dt / cfg.pitchCeilingHz))
    // Praat: maximumLag = min(floor(nsampWindow / periodsPerWindow) + 2, nsampWindow)
    this.maximumLag = Math.min(
      Math.floor(this.nsampWindow / periodsPerWindow) + 2,
      this.nsampWindow,
    )

    // AC_HANNING: interpolation_depth = 0.5 -> nsampFFT >= nsampWindow * 1.5
    this.nsampFFT = nextPow2(Math.ceil(this.nsampWindow * 1.5))
    this.brentIxmax = Math.floor(this.nsampWindow * 0.5)

    this.timeStep =
      cfg.timeStepSec > 0
        ? cfg.timeStepSec
        : periodsPerWindow / cfg.pitchFloorHz / 4.0

    // Hanning window (Praat 1-indexed formula: w[i] = 0.5 - 0.5*cos(2PI*i/(N+1)), i=1..N)
    this.window = new Float32Array(this.nsampWindow)
    for (let i = 0; i < this.nsampWindow; i++)
      this.window[i] =
        0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 1)) / (this.nsampWindow + 1))

    this.fftTables = new FftTables(this.nsampFFT)
    this.fftRe = new Float32Array(this.nsampFFT)
    this.fftIm = new Float32Array(this.nsampFFT)
    this.windowAC = new Float32Array(this.brentIxmax + 1)
    this.rBuf = new Float32Array(2 * this.brentIxmax + 1)

    this.#computeWindowAC()
  }

  #computeWindowAC(): void {
    const {
      window,
      nsampWindow,
      nsampFFT,
      fftRe,
      fftIm,
      fftTables,
      brentIxmax,
      windowAC,
    } = this
    fftRe.fill(0)
    fftIm.fill(0)
    for (let i = 0; i < nsampWindow; i++) fftRe[i] = window[i]!
    complexFFTForward(fftRe, fftIm, fftTables)
    for (let k = 0; k < nsampFFT; k++) {
      const re = fftRe[k]!,
        im = fftIm[k]!
      fftRe[k] = re * re + im * im
      fftIm[k] = 0
    }
    complexFFTInverse(fftRe, fftIm, fftTables)
    // Normalize: windowAC[k] = ac[k] / ac[0]  (the 1/nsampFFT scale cancels in both)
    const ac0 = fftRe[0]!
    windowAC[0] = 1.0
    for (let k = 1; k <= brentIxmax; k++)
      windowAC[k] = ac0 > 0 ? fftRe[k]! / ac0 : 0
  }

  /**
   * Gaussian low-pass pre-filter for the whole signal.
   * Cutoff = `pitchCeilingHz / sqrt(-2*ln(attenuationAtTop))` = ~pitchCeiling / 2.1 for default.
   * Source: Sound_to_Pitch_filteredAc in fon/Sound_to_Pitch.cpp.
   */
  #lowPassFilter(samples: Float32Array): Float32Array {
    const { sampleRate, cfg } = this
    const cutoffHz =
      cfg.pitchCeilingHz / Math.sqrt(-2.0 * Math.log(cfg.attenuationAtTop))
    const n = samples.length
    const nfft = nextPow2(n)
    const fftTables = new FftTables(nfft)
    const re = new Float32Array(nfft)
    const im = new Float32Array(nfft)
    for (let i = 0; i < n; i++) re[i] = samples[i]!
    complexFFTForward(re, im, fftTables)
    const binHz = sampleRate / nfft
    for (let k = 0; k <= nfft / 2; k++) {
      const freq = k * binHz
      const factor = Math.exp(-0.5 * (freq / cutoffHz) ** 2)
      re[k]! *= factor
      im[k]! *= factor
      if (k > 0 && k < nfft / 2) {
        re[nfft - k]! *= factor
        im[nfft - k]! *= factor
      }
    }
    complexFFTInverse(re, im, fftTables)
    const scale = 1.0 / nfft
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) out[i] = re[i]! * scale
    return out
  }

  /** Analyses `samples` (mono, at the sample rate given at construction).  Input is not modified. */
  analyze(samples: Float32Array): PitchResult {
    const {
      sampleRate,
      cfg,
      nsampPeriod,
      nsampWindow,
      halfNsampWindow,
      nsampFFT,
      brentIxmax,
      minimumLag,
      maximumLag,
      timeStep,
      window,
      windowAC,
      fftRe,
      fftIm,
      fftTables,
      rBuf,
    } = this
    const n = samples.length
    const dt = 1 / sampleRate

    // -- Gaussian low-pass pre-filter ----
    const signal =
      cfg.attenuationAtTop > 0 && cfg.attenuationAtTop < 1
        ? this.#lowPassFilter(samples)
        : samples

    // -- Global mean and peak (computed on filtered signal, matching Praat) ----
    let globalMean = 0
    for (let i = 0; i < n; i++) globalMean += signal[i]!
    globalMean /= n
    let globalPeak = 0
    for (let i = 0; i < n; i++) {
      const v = Math.abs(signal[i]! - globalMean)
      if (v > globalPeak) globalPeak = v
    }
    if (globalPeak === 0) return { frames: [], timeStepSec: timeStep, t1Sec: 0 }

    // -- Frame grid (Praat: Sampled_shortTermAnalysis with dt_window = nsampWindow*dt) ----
    const physDur = n * dt
    const dtWindow = nsampWindow * dt
    const nFrames = Math.max(1, 1 + Math.floor((physDur - dtWindow) / timeStep))
    const x1 = 0.5 * dt
    const t1 = x1 + 0.5 * ((n - 1) * dt - (nFrames - 1) * timeStep)

    // -- Per-frame candidate storage ----
    // One extra slot per frame for the unvoiced candidate (always present).
    const MAX_CANDS = cfg.maxCandidates + 1
    const candFreqs = new Float32Array(nFrames * MAX_CANDS)
    const candStrs = new Float32Array(nFrames * MAX_CANDS)
    const candCounts = new Int32Array(nFrames)
    const frameIntensities = new Float32Array(nFrames)

    const halfNsampPeriod = Math.floor(nsampPeriod / 2) + 1
    const halfVT = 0.5 * cfg.voicingThreshold // min strength for a candidate to be considered

    for (let iframe = 0; iframe < nFrames; iframe++) {
      const t = t1 + iframe * timeStep
      // leftSample: 0-indexed sample just left of frame centre (Praat convention)
      const leftSample = Math.floor(t * sampleRate - 0.5)
      const winStart = leftSample + 1 - halfNsampWindow

      // Local mean over 2 * nsampPeriod samples centred on the frame (DC removal)
      const meanStart = Math.max(0, leftSample + 1 - nsampPeriod)
      const meanEnd = Math.min(n - 1, leftSample + nsampPeriod)
      let localMean = 0
      for (let i = meanStart; i <= meanEnd; i++) localMean += signal[i]!
      localMean /= meanEnd - meanStart + 1

      // Build windowed, DC-removed frame in fftRe (zero-padded to nsampFFT)
      fftRe.fill(0)
      fftIm.fill(0)
      for (let j = 0; j < nsampWindow; j++) {
        const si = winStart + j
        const s = si >= 0 && si < n ? signal[si]! - localMean : 0
        fftRe[j] = s * window[j]!
      }

      // Local peak for intensity: central +/-halfNsampPeriod of the windowed frame
      // (Praat: halfnsamp_window +/- halfnsamp_period, 1-indexed -> 0-indexed here)
      const peakStart = Math.max(0, halfNsampWindow - halfNsampPeriod)
      const peakEnd = Math.min(
        nsampWindow - 1,
        halfNsampWindow + halfNsampPeriod,
      )
      let localPeak = 0
      for (let j = peakStart; j <= peakEnd; j++) {
        const v = Math.abs(fftRe[j]!)
        if (v > localPeak) localPeak = v
      }
      frameIntensities[iframe] = localPeak / globalPeak

      complexFFTForward(fftRe, fftIm, fftTables)
      for (let k = 0; k < nsampFFT; k++) {
        const re = fftRe[k]!,
          im = fftIm[k]!
        fftRe[k] = re * re + im * im
        fftIm[k] = 0
      }
      complexFFTInverse(fftRe, fftIm, fftTables)

      const base = iframe * MAX_CANDS
      const ac0 = fftRe[0]!

      // Silent frame: keep only the unvoiced candidate placeholder
      if (ac0 === 0) {
        candFreqs[base] = 0
        candStrs[base] = 0
        candCounts[iframe] = 1
        continue
      }

      // Normalized r[k] = ac[k] / (ac[0] * windowAC[k]) -- matching Praat:
      // r[i] = ac[i+1] / (ac[1] * windowR[i+1])  (Praat 1-indexed)
      // Build symmetric rBuf[brentIxmax +/- k] = r[k] for sinc interpolation across lag=0
      rBuf[brentIxmax] = 1.0
      for (let k = 1; k <= brentIxmax; k++) {
        const rk = windowAC[k]! > 0 ? fftRe[k]! / (ac0 * windowAC[k]!) : 0
        rBuf[brentIxmax + k] = rk
        rBuf[brentIxmax - k] = rk // autocorrelation is even
      }

      // -- First-pass: parabolic interpolation + 30-point sinc strength ----
      let nVoiced = 0
      for (let lag = minimumLag; lag < maximumLag && lag < brentIxmax; lag++) {
        const rm1 = rBuf[brentIxmax + lag - 1]!
        const r0 = rBuf[brentIxmax + lag]!
        const rp1 = rBuf[brentIxmax + lag + 1]!
        if (r0 <= halfVT) continue // too weak
        if (r0 <= rm1 || r0 < rp1) continue // not a local maximum

        // Parabolic interpolation (Praat 2025-04-18 numerically-stable form)
        const dr = 0.5 * (rp1 - rm1)
        const d2r = r0 - rm1 + (r0 - rp1) // = 2*r0 - rm1 - rp1
        const lagEst = d2r > 0 ? lag + dr / d2r : lag

        // 30-point sinc interpolation for strength at first estimate
        let strEst = interpolateSinc(rBuf, brentIxmax + lagEst, 30)
        if (strEst > 1.0) strEst = 1.0 / strEst // "high values due to short windows" (Praat)

        // -- Second pass: golden-section search with 70-point sinc (NUMimproveMaximum) ----
        const [lagFinal, strRaw] = _goldenSectionMax(
          (x) => interpolateSinc(rBuf, brentIxmax + x, 70),
          lagEst - 1.0,
          lagEst + 1.0,
          1e-10,
        )
        let strFinal = strRaw
        if (strFinal > 1.0) strFinal = 1.0 / strFinal
        const freqFinal = sampleRate / lagFinal

        // Keep or displace the weakest existing voiced candidate (Praat bookkeeping)
        if (nVoiced < cfg.maxCandidates) {
          candFreqs[base + nVoiced] = freqFinal
          candStrs[base + nVoiced] = strFinal
          nVoiced++
        } else {
          // Find weakest by local strength (strength - octaveCost*log2(floor/freq))
          let weakIdx = 0
          let weakLS =
            candStrs[base]! -
            cfg.octaveCost * Math.log2(cfg.pitchFloorHz / candFreqs[base]!)
          for (let ci = 1; ci < nVoiced; ci++) {
            const ls =
              candStrs[base + ci]! -
              cfg.octaveCost *
                Math.log2(cfg.pitchFloorHz / candFreqs[base + ci]!)
            if (ls < weakLS) {
              weakLS = ls
              weakIdx = ci
            }
          }
          const newLS =
            strFinal - cfg.octaveCost * Math.log2(cfg.pitchFloorHz / freqFinal)
          if (newLS > weakLS) {
            candFreqs[base + weakIdx] = freqFinal
            candStrs[base + weakIdx] = strFinal
          }
        }
      }

      // Unvoiced candidate always occupies the last slot (frequency = 0, strength filled by Viterbi init)
      candFreqs[base + nVoiced] = 0
      candStrs[base + nVoiced] = 0 // filled below
      candCounts[iframe] = nVoiced + 1
    }

    // -- Viterbi path finder (Pitch_pathFinder in fon/Pitch.cpp) ----
    // Transition costs are scaled by 0.01 / timeStep for time-step independence.
    const tsC = 0.01 / timeStep
    const oc_s = cfg.octaveJumpCost * tsC
    const vuc_s = cfg.voicedUnvoicedCost * tsC
    // silenceThreshold / (1 + voicingThreshold): the frame intensity level below which silence bonus kicks in
    const silenceT = cfg.silenceThreshold / (1.0 + cfg.voicingThreshold)

    const delta = new Float32Array(nFrames * MAX_CANDS).fill(-1e30)
    const psi = new Int32Array(nFrames * MAX_CANDS)

    // Initialise delta with local scores (Viterbi requires two passes over delta)
    for (let iframe = 0; iframe < nFrames; iframe++) {
      const base = iframe * MAX_CANDS
      const nC = candCounts[iframe]!
      const unvoicedStr =
        cfg.voicingThreshold +
        Math.max(0, 2.0 - frameIntensities[iframe]! / silenceT)
      for (let c = 0; c < nC; c++) {
        const f = candFreqs[base + c]!
        if (f === 0) {
          candStrs[base + c] = unvoicedStr
          delta[base + c] = unvoicedStr
        } else {
          delta[base + c] =
            candStrs[base + c]! -
            cfg.octaveCost * Math.log2(cfg.pitchCeilingHz / f)
        }
      }
    }

    // Forward pass: accumulate best path scores
    for (let iframe = 1; iframe < nFrames; iframe++) {
      const base = iframe * MAX_CANDS
      const prevBase = (iframe - 1) * MAX_CANDS
      const nC = candCounts[iframe]!
      const nPrev = candCounts[iframe - 1]!

      for (let c2 = 0; c2 < nC; c2++) {
        const f2 = candFreqs[base + c2]!
        const v2unvoiced = f2 === 0
        const localScore = delta[base + c2]! // local score from initialization

        let bestVal = -1e30,
          bestPrev = 0
        for (let c1 = 0; c1 < nPrev; c1++) {
          const f1 = candFreqs[prevBase + c1]!
          let tc: number
          if (v2unvoiced) {
            tc = f1 === 0 ? 0 : vuc_s
          } else {
            tc = f1 === 0 ? vuc_s : oc_s * Math.abs(Math.log2(f1 / f2))
          }
          const v = delta[prevBase + c1]! - tc + localScore
          if (v > bestVal) {
            bestVal = v
            bestPrev = c1
          }
        }
        delta[base + c2] = bestVal
        psi[base + c2] = bestPrev
      }
    }

    const lastBase = (nFrames - 1) * MAX_CANDS
    let bestC = 0,
      bestScore = delta[lastBase]!
    for (let c = 1; c < candCounts[nFrames - 1]!; c++) {
      if (delta[lastBase + c]! > bestScore) {
        bestScore = delta[lastBase + c]!
        bestC = c
      }
    }
    const path = new Int32Array(nFrames)
    path[nFrames - 1] = bestC
    for (let iframe = nFrames - 1; iframe > 0; iframe--)
      path[iframe - 1] = psi[iframe * MAX_CANDS + path[iframe]!]!

    const frames: PitchFrame[] = new Array(nFrames)
    for (let iframe = 0; iframe < nFrames; iframe++) {
      const c = path[iframe]!
      const base = iframe * MAX_CANDS
      const f = candFreqs[base + c]!
      frames[iframe] = {
        timeSec: t1 + iframe * timeStep,
        frequencyHz: f,
        strength: f > 0 ? candStrs[base + c]! : 0,
      }
    }

    return { frames, timeStepSec: timeStep, t1Sec: t1 }
  }
}
