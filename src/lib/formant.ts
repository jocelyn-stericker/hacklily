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

import { burgLpc, findLpcRoots, fixIntoUnitCircle } from './burgLpc'
import { nextPow2 } from './nextPow2'
import { preEmphasis } from './preEmphasis'
import { buildFormantGaussianWindow } from './window'

/**
 * Formant analysis configuration for Burg's method.
 *
 * IMPORTANT — resampling:
 *   Praat resamples the input to 2 * maxFrequencyHz before analysis so the
 *   LPC's Nyquist equals the formant ceiling.  This port does NOT resample.
 *   The caller must supply audio already at 2 * maxFrequencyHz Hz.
 *   Example: for a 5500 Hz ceiling, provide 11 000 Hz audio.
 */
export interface FormantConfig {
  /**
   * Maximum number of formants to detect.
   * Sets LPC order = 2 * maxFormants (e.g. 5 formants → order 10).
   * Default: 5.
   */
  maxFormants: number

  /**
   * Formant ceiling frequency in Hz.  Must equal sampleRate / 2.
   * Used in the root → frequency / bandwidth conversion.
   * Default: 5500 Hz.
   */
  maxFrequencyHz: number

  /**
   * Analysis window half-length in seconds (full window = 2x).
   * Default: 0.0125 s (25 ms window).
   */
  halfWindowLengthSec: number

  /**
   * Time step between frames in seconds.
   * 0 = auto → halfWindowLengthSec / 4 (4x oversampling, matching Praat).
   */
  timeStepSec: number

  /**
   * Pre-emphasis high-pass cutoff in Hz.
   * Applies s[i] −= exp(−2π f dt) * s[i−1] backwards through the signal.
   * Default: 50 Hz.
   */
  preEmphasisHz: number

  /**
   * Safety margin in Hz.  Formant candidates within this margin of 0 or
   * the Nyquist are discarded.  Use 0 to keep all.
   * Default: 50 Hz (Praat's 'burg' variant).
   */
  safetyMarginHz: number
}

/** A single detected formant. */
export interface Formant {
  /** Centre frequency, Hz. */
  frequencyHz: number
  /** 3 dB bandwidth, Hz. */
  bandwidthHz: number
}

/** Formants for a single analysis frame. */
export interface FormantFrame {
  /** Time at centre of frame, seconds from start of signal. */
  timeSec: number
  /**
   * Max squared sample amplitude in the frame (voicing intensity proxy).
   * 0 for silent frames; formants array is empty for those.
   */
  intensity: number
  /**
   * Number of valid formants in `formants[0..formantCount-1]`.
   * 0 for silent frames. For stream frames, `formants` may be longer than
   * `formantCount` due to pre-allocation — always use this field, not
   * `formants.length`, to determine how many formants are present.
   */
  formantCount: number
  /** Detected formants, sorted by ascending frequency. */
  formants: Formant[]
}

export interface FormantResult {
  frames: FormantFrame[]
  timeStepSec: number
}

/**
 * Formant frame analysis (inner function shared by batch and stream)
 *
 * Analyses one Gaussian-windowed, pre-emphasised frame and writes formants.
 *
 * Source: Sound_to_Formant.cpp burg() static function.
 *
 * @param frame     Windowed+pre-emphasised samples, length = frameLen.
 * @param frameLen  Actual number of valid samples (may be < nsampWindow at edges).
 * @param nyquistHz sampleRate / 2.  Also equals maxFrequencyHz when properly resampled.
 * @param order     LPC order (= 2 * maxFormants).
 * @param safetyHz  Safety margin in Hz.
 * @param outFreqs  Output: formant frequencies in Hz, length ≥ order/2.
 * @param outBWs    Output: formant bandwidths in Hz, length ≥ order/2.
 * @param coeffs, b1, b2, aa, rootsRe, rootsIm, peval  Scratch arrays (see burgLpc / findLpcRoots).
 * @returns  Number of formants written.
 */
function analyzeFormantFrame(
  frame: Float32Array,
  frameLen: number,
  nyquistHz: number,
  order: number,
  safetyHz: number,
  outFreqs: Float32Array,
  outBWs: Float32Array,
  coeffs: Float32Array,
  b1: Float32Array,
  b2: Float32Array,
  aa: Float32Array,
  rootsRe: Float32Array,
  rootsIm: Float32Array,
  peval: Float32Array,
): number {
  burgLpc(frame, frameLen, order, coeffs, b1, b2, aa)
  findLpcRoots(coeffs, order, rootsRe, rootsIm, peval)
  fixIntoUnitCircle(rootsRe, rootsIm, order)

  let n = 0
  for (let i = 0; i < order; i++) {
    if (rootsIm[i]! < 0) continue // conjugate pairs — keep upper half-plane only
    const f =
      (Math.abs(Math.atan2(rootsIm[i]!, rootsRe[i]!)) * nyquistHz) / Math.PI
    if (f < safetyHz || f > nyquistHz - safetyHz) continue
    // Bandwidth: −log(|z|²) * nyquist / π  (std::norm returns |z|², so this matches Praat)
    const norm2 = rootsRe[i]! * rootsRe[i]! + rootsIm[i]! * rootsIm[i]!
    outFreqs[n] = f
    outBWs[n] = (-Math.log(norm2) * nyquistHz) / Math.PI
    n++
  }

  // Sort by ascending frequency (selection sort — n ≤ order/2, typically ≤ 10)
  for (let i = 0; i < n - 1; i++) {
    let m = i
    for (let j = i + 1; j < n; j++) if (outFreqs[j]! < outFreqs[m]!) m = j
    if (m !== i) {
      let t = outFreqs[i]!
      outFreqs[i] = outFreqs[m]!
      outFreqs[m] = t
      t = outBWs[i]!
      outBWs[i] = outBWs[m]!
      outBWs[m] = t
    }
  }
  return n
}

/**
 * Formant analysis batch processor
 *
 * Analyses a mono audio signal and returns formant tracks for all frames.
 *
 * All scratch buffers are allocated at construction; no heap allocation
 * occurs in `analyze()` except for the output `frames` array.
 *
 * WARNING: `analyze()` applies pre-emphasis in-place on `samples`.
 * Pass `samples.slice()` if you need the original preserved.
 *
 * Example:
 * ```ts
 * const proc = new FormantProcessor(
 *   { maxFormants: 5, maxFrequencyHz: 5500, halfWindowLengthSec: 0.0125,
 *     timeStepSec: 0, preEmphasisHz: 50, safetyMarginHz: 50 },
 *   11000,   // must equal 2 x maxFrequencyHz
 * );
 * const { frames } = proc.analyze(samples.slice());
 * ```
 */
export class FormantProcessor {
  private readonly cfg: {
    sampleRate: number
    nyquist: number
    order: number
    nsampWindow: number
    halfNsampWindow: number
    actualTimeStep: number
    safetyHz: number
    preEmphasisHz: number
  }

  private readonly gaussWindow: Float32Array
  private readonly frameBuffer: Float32Array
  private readonly coeffs: Float32Array
  private readonly b1: Float32Array
  private readonly b2: Float32Array
  private readonly aa: Float32Array
  private readonly rootsRe: Float32Array
  private readonly rootsIm: Float32Array
  private readonly peval: Float32Array
  private readonly outFreqs: Float32Array
  private readonly outBWs: Float32Array

  constructor(config: FormantConfig, sampleRate: number) {
    const {
      maxFormants,
      halfWindowLengthSec,
      timeStepSec,
      preEmphasisHz,
      safetyMarginHz,
    } = config
    const dt = 1 / sampleRate
    const order = Math.round(2 * maxFormants)
    const nsampWindow = Math.floor((2 * halfWindowLengthSec) / dt)
    const halfNsampWindow = Math.floor(nsampWindow / 2)
    if (nsampWindow < order + 1)
      throw new Error('Window too short for LPC order.')
    const actualTimeStep =
      timeStepSec > 0 ? timeStepSec : halfWindowLengthSec / 4

    this.cfg = {
      sampleRate,
      nyquist: sampleRate / 2,
      order,
      nsampWindow,
      halfNsampWindow,
      actualTimeStep,
      safetyHz: safetyMarginHz,
      preEmphasisHz,
    }

    this.gaussWindow = new Float32Array(nsampWindow)
    buildFormantGaussianWindow(nsampWindow, this.gaussWindow)

    this.frameBuffer = new Float32Array(nsampWindow)
    this.coeffs = new Float32Array(order)
    this.b1 = new Float32Array(nsampWindow)
    this.b2 = new Float32Array(nsampWindow)
    this.aa = new Float32Array(order)
    this.rootsRe = new Float32Array(order)
    this.rootsIm = new Float32Array(order)
    this.peval = new Float32Array(4)
    this.outFreqs = new Float32Array(Math.ceil(order / 2))
    this.outBWs = new Float32Array(Math.ceil(order / 2))
  }

  /**
   * Analyses `samples` for formants.
   *
   * @param samples  Mono audio at the sample rate given at construction.
   *                 Modified in-place by the pre-emphasis filter.
   */
  analyze(samples: Float32Array): FormantResult {
    const c = this.cfg
    const dt = 1 / c.sampleRate
    const nSamples = samples.length
    const physDur = nSamples * dt
    const dtWindow = c.nsampWindow * dt

    preEmphasis(samples, c.sampleRate, c.preEmphasisHz)

    const nFrames = Math.max(
      1,
      1 + Math.floor((physDur - dtWindow) / c.actualTimeStep),
    )
    const x1 = 0.5 * dt
    const t1 =
      nFrames === 1
        ? x1 + 0.5 * physDur
        : x1 + 0.5 * (physDur - dt - (nFrames - 1) * c.actualTimeStep)

    const frames: FormantFrame[] = []
    const {
      gaussWindow,
      frameBuffer,
      coeffs,
      b1,
      b2,
      aa,
      rootsRe,
      rootsIm,
      peval,
      outFreqs,
      outBWs,
    } = this

    for (let iframe = 0; iframe < nFrames; iframe++) {
      const t = t1 + iframe * c.actualTimeStep
      const leftSample = Math.floor(t * c.sampleRate - 0.5)
      let startSample = leftSample + 1 - c.halfNsampWindow
      let endSample = leftSample + c.halfNsampWindow
      startSample = Math.max(0, startSample)
      endSample = Math.min(nSamples - 1, endSample)
      const frameLen = endSample - startSample + 1

      let maxIntensity = 0
      for (let i = startSample; i <= endSample; i++) {
        const v2 = samples[i]! * samples[i]!
        if (v2 > maxIntensity) maxIntensity = v2
      }

      if (maxIntensity === 0) {
        frames.push({
          timeSec: t,
          intensity: 0,
          formantCount: 0,
          formants: [],
        })
        continue
      }

      for (let j = 0; j < frameLen; j++)
        frameBuffer[j] = samples[startSample + j]! * gaussWindow[j]!

      const nF = analyzeFormantFrame(
        frameBuffer,
        frameLen,
        c.nyquist,
        c.order,
        c.safetyHz,
        outFreqs,
        outBWs,
        coeffs,
        b1,
        b2,
        aa,
        rootsRe,
        rootsIm,
        peval,
      )

      const formants: Formant[] = []
      for (let k = 0; k < nF; k++)
        formants.push({ frequencyHz: outFreqs[k]!, bandwidthHz: outBWs[k]! })
      frames.push({
        timeSec: t,
        intensity: maxIntensity,
        formantCount: nF,
        formants,
      })
    }

    return { frames, timeStepSec: c.actualTimeStep }
  }
}

/**
 * Streaming formant processor, suitable for AudioWorklet use.
 *
 * Feed audio blocks via `feed()`; pull completed frames via `readFrame()`.
 * No heap allocation after construction (frame objects are pre-allocated in the queue).
 *
 * Pre-emphasis is applied per-frame on the raw frame copy rather than the whole signal,
 * which avoids modifying the ring buffer.  Boundary behaviour differs very slightly
 * from the batch processor at the start/end of frames.
 *
 * Example (inside AudioWorkletProcessor.process):
 * ```ts
 * this.proc.feed(inputs[0][0]);
 * let f: FormantFrame | null;
 * while ((f = this.proc.readFrame()) !== null) port.postMessage(f);
 * ```
 */
export class FormantStreamProcessor {
  private readonly sampleRate: number
  private readonly nyquist: number
  private readonly order: number
  private readonly nsampWindow: number
  private readonly halfNsampWindow: number
  private readonly timeStepSamples: number
  private readonly safetyHz: number
  private readonly preEmphasisFactor: number

  private readonly ring: Float32Array
  private readonly ringMask: number
  private ringHead: number
  private totalFed: number
  private nextFrameCenter: number

  private readonly gaussWindow: Float32Array
  private readonly rawFrame: Float32Array
  private readonly coeffs: Float32Array
  private readonly b1: Float32Array
  private readonly b2: Float32Array
  private readonly aa: Float32Array
  private readonly rootsRe: Float32Array
  private readonly rootsIm: Float32Array
  private readonly peval: Float32Array
  private readonly outFreqs: Float32Array
  private readonly outBWs: Float32Array

  private readonly QUEUE = 64
  private readonly queue: FormantFrame[]
  private qHead: number
  private qTail: number

  constructor(config: FormantConfig, sampleRate: number) {
    const {
      maxFormants,
      halfWindowLengthSec,
      timeStepSec,
      preEmphasisHz,
      safetyMarginHz,
    } = config
    const dt = 1 / sampleRate
    this.sampleRate = sampleRate
    this.nyquist = sampleRate / 2
    this.order = Math.round(2 * maxFormants)
    this.nsampWindow = Math.floor((2 * halfWindowLengthSec) / dt)
    this.halfNsampWindow = Math.floor(this.nsampWindow / 2)
    this.safetyHz = safetyMarginHz
    this.preEmphasisFactor = Math.exp(
      (-2 * Math.PI * preEmphasisHz) / sampleRate,
    )
    const actualTimeStep =
      timeStepSec > 0 ? timeStepSec : halfWindowLengthSec / 4
    this.timeStepSamples = Math.max(1, Math.round(actualTimeStep * sampleRate))

    const ringSize = nextPow2(this.nsampWindow + this.timeStepSamples * 4 + 16)
    this.ring = new Float32Array(ringSize)
    this.ringMask = ringSize - 1
    this.ringHead = 0
    this.totalFed = 0
    this.nextFrameCenter = this.halfNsampWindow

    this.gaussWindow = new Float32Array(this.nsampWindow)
    buildFormantGaussianWindow(this.nsampWindow, this.gaussWindow)

    this.rawFrame = new Float32Array(this.nsampWindow)
    this.coeffs = new Float32Array(this.order)
    this.b1 = new Float32Array(this.nsampWindow)
    this.b2 = new Float32Array(this.nsampWindow)
    this.aa = new Float32Array(this.order)
    this.rootsRe = new Float32Array(this.order)
    this.rootsIm = new Float32Array(this.order)
    this.peval = new Float32Array(4)
    this.outFreqs = new Float32Array(Math.ceil(this.order / 2))
    this.outBWs = new Float32Array(Math.ceil(this.order / 2))

    // Pre-allocate all frame slots AND their formant arrays — zero allocation in the hot path.
    const maxF = Math.ceil(this.order / 2)
    this.queue = Array.from({ length: this.QUEUE }, () => ({
      timeSec: 0,
      intensity: 0,
      formantCount: 0,
      formants: Array.from({ length: maxF }, () => ({
        frequencyHz: 0,
        bandwidthHz: 0,
      })),
    }))
    this.qHead = 0
    this.qTail = 0
  }

  /** Feed new samples into the processor. May enqueue zero or more frames. */
  feed(samples: Float32Array): void {
    const { ring, ringMask } = this
    for (const sample of samples) {
      ring[this.ringHead & ringMask] = sample
      this.ringHead++
    }
    this.totalFed += samples.length
    this._processReady()
  }

  private _processReady(): void {
    const {
      ring,
      ringMask,
      gaussWindow,
      rawFrame,
      coeffs,
      b1,
      b2,
      aa,
      rootsRe,
      rootsIm,
      peval,
      outFreqs,
      outBWs,
    } = this
    const factor = this.preEmphasisFactor

    while (true) {
      const start = this.nextFrameCenter - this.halfNsampWindow
      if (start < 0 || start + this.nsampWindow > this.totalFed) break
      if (this.qTail - this.qHead >= this.QUEUE) break

      // +0.5 aligns with Praat's convention: sample i is centred at (i+0.5)*dt
      const timeSec = (this.nextFrameCenter + 0.5) / this.sampleRate
      let maxIntensity = 0
      for (let j = 0; j < this.nsampWindow; j++) {
        const v = ring[(start + j) & ringMask]!
        rawFrame[j] = v
        const v2 = v * v
        if (v2 > maxIntensity) maxIntensity = v2
      }

      const slot = this.queue[this.qTail % this.QUEUE]!
      slot.timeSec = timeSec
      slot.intensity = maxIntensity

      if (maxIntensity === 0) {
        slot.formantCount = 0
      } else {
        // Pre-emphasise frame copy (backward scan to match Praat)
        for (let i = this.nsampWindow - 1; i >= 1; i--)
          rawFrame[i]! -= factor * rawFrame[i - 1]!
        // Apply Gaussian window
        for (let j = 0; j < this.nsampWindow; j++)
          rawFrame[j]! *= gaussWindow[j]!

        const nF = analyzeFormantFrame(
          rawFrame,
          this.nsampWindow,
          this.nyquist,
          this.order,
          this.safetyHz,
          outFreqs,
          outBWs,
          coeffs,
          b1,
          b2,
          aa,
          rootsRe,
          rootsIm,
          peval,
        )
        // Write directly into pre-allocated Formant objects — no allocation.
        for (let k = 0; k < nF; k++) {
          slot.formants[k]!.frequencyHz = outFreqs[k]!
          slot.formants[k]!.bandwidthHz = outBWs[k]!
        }
        slot.formantCount = nF
      }

      this.qTail++
      this.nextFrameCenter += this.timeStepSamples
    }
  }

  /** True if at least one completed frame is available. */
  hasFrame(): boolean {
    return this.qHead < this.qTail
  }

  /**
   * Returns a reference to the oldest completed FormantFrame, or null.
   * The returned object is owned by the queue and will be overwritten on a
   * future `readFrame()` call — copy its contents if you need to hold it longer.
   * Read `frame.formants[0..frame.formantCount-1]`; slots beyond `formantCount`
   * are pre-allocated padding and should be ignored.
   */
  readFrame(): FormantFrame | null {
    if (this.qHead >= this.qTail) return null
    const frame = this.queue[this.qHead % this.QUEUE]!
    this.qHead++
    return frame
  }
}
