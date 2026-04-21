/* Braat, adapted from Praat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 1992-2008,2011,2012,2015-2020,2022-2024 Paul Boersma
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

import { complexFFTForward, FftTables } from './fft'
import { nextPow2 } from './nextPow2'
import { buildWindow } from './window'
import type { WindowShape } from './window'

/**
 * Spectrogram configuration. All times are in seconds, all frequencies in Hz.
 */
export interface SpectrogramConfig {
  /**
   * Effective (user-visible) analysis window length in seconds.
   * For 'gaussian' windows the physical window applied is 2x this value.
   * Default: 0.005 s (5 ms).
   */
  effectiveWindowLengthSec: number

  /**
   * Upper frequency limit in Hz. Bins above this are discarded.
   * Must be <= sampleRate / 2. 5000 Hz is ideal for male-typical voices and 5500 Hz is ideal for female-typical voices.
   */
  maxFrequencyHz: number

  /**
   * Time step between analysis frames in seconds.
   * The actual step is at least effectiveTimeWidth / 8 (8x oversampling).
   * Default: 0.002 s (2 ms).
   */
  timeStepSec: number

  /**
   * Requested frequency resolution in Hz.
   * The actual step is snapped to the nearest integer multiple of the FFT bin width.
   * Default: 20 Hz.
   */
  freqStepHz: number

  /** Window shape applied to each frame before the FFT. Default: 'gaussian'. */
  windowShape: WindowShape
}

/**
 * Resolved spectrogram parameters derived from SpectrogramConfig + sampleRate.
 * Exposed for inspection; computed once at construction.
 */
export interface ResolvedSpectrogramParams {
  sampleRate: number
  nsampWindow: number // samples per analysis window (always even)
  halfNsampWindow: number // nsampWindow / 2
  nFFT: number // FFT size (power of 2, ≥ nsampWindow)
  halfNFFT: number // nFFT / 2
  numFreqs: number // output frequency bins
  binWidthSamples: number // FFT bins summed per output bin
  binWidthHz: number // FFT bin spacing = sampleRate / nFFT
  actualFreqStepHz: number // = binWidthSamples * binWidthHz
  actualTimeStepSec: number
  physicalWindowLengthSec: number // 2x effective for Gaussian, 1x otherwise
  /** y1 in Praat: frequency at centre of first output bin, Hz. */
  f1Hz: number
}

/**
 * Output of spectrogram analysis.
 *
 * `z` is the 2-D power spectral density array stored row-major:
 *   z[iFreq * numFrames + iFrame]   (Pa²/Hz)
 *
 * To convert to dB (matching Praat's display):
 *   dB = 10 / ln(10) * ln(z_value / 4e-10)   (reference PSD: 4*10⁻¹⁰ Pa²/Hz)
 */
export interface SpectrogramResult {
  numFrames: number
  numFreqs: number
  timeStepSec: number
  freqStepHz: number
  /** Time at centre of first frame, seconds from start of signal. */
  t1Sec: number
  /** Frequency at centre of first bin, Hz. */
  f1Hz: number
  /** Spectrogram slices */
  data: Array<Float32Array>
}

function resolveSpectrogramParams(
  config: SpectrogramConfig,
  sampleRate: number,
): ResolvedSpectrogramParams {
  const {
    effectiveWindowLengthSec,
    maxFrequencyHz,
    timeStepSec,
    freqStepHz,
    windowShape,
  } = config
  const dt = 1 / sampleRate
  const nyquist = sampleRate / 2
  const fmax =
    maxFrequencyHz > 0 && maxFrequencyHz <= nyquist ? maxFrequencyHz : nyquist

  // Physical window: Gaussian uses 2x effective; all others use effective directly
  const physWindowSec =
    windowShape === 'gaussian'
      ? 2 * effectiveWindowLengthSec
      : effectiveWindowLengthSec

  // nsampWindow must be even (Praat: halfnsamp = floor(approx/2) - 1, nsamp = halfnsamp*2)
  const approx = Math.floor(physWindowSec / dt)
  const halfNsamp = Math.floor(approx / 2) - 1
  if (halfNsamp < 1)
    throw new Error('Analysis window too short (< 2 samples per half-window).')
  const nsampWindow = halfNsamp * 2

  // Minimum time step: effectiveTimeWidth / 8  (maximumTimeOversampling = 8)
  const effectiveTimeWidthSec = effectiveWindowLengthSec / Math.sqrt(Math.PI)
  const actualTimeStep = Math.max(timeStepSec, effectiveTimeWidthSec / 8)

  // Minimum freq step: effectiveFreqWidth / 8  (maximumFreqOversampling = 8)
  const effectiveFreqWidthHz = 1.0 / effectiveTimeWidthSec
  const reqFreqStep = Math.max(freqStepHz, effectiveFreqWidthHz / 8)
  let numFreqs = Math.floor(fmax / reqFreqStep)
  if (numFreqs < 1)
    throw new Error(
      'No frequency bins: increase maxFrequencyHz or decrease freqStepHz.',
    )

  // FFT size: smallest power-of-2 ≥ max(nsampWindow, required for freq resolution)
  const nFFT = nextPow2(
    Math.max(nsampWindow, Math.ceil(2 * numFreqs * (nyquist / fmax))),
  )
  const halfNFFT = nFFT >> 1

  // Snap freqStep to FFT bin width (Sound_and_Spectrogram.cpp:81-84)
  const binWidthHz = sampleRate / nFFT
  const binWidthSamples = Math.max(1, Math.floor(reqFreqStep / binWidthHz))
  const actualFreqStepHz = binWidthSamples * binWidthHz
  numFreqs = Math.floor(fmax / actualFreqStepHz)
  if (numFreqs < 1)
    throw new Error('No frequency bins after freq-step snapping.')

  // y1 = 0.5*(freqStep - binWidthHz)  (Praat: Spectrogram_create last argument)
  const f1Hz = 0.5 * (actualFreqStepHz - binWidthHz)

  return {
    sampleRate,
    nsampWindow,
    halfNsampWindow: halfNsamp,
    nFFT,
    halfNFFT,
    numFreqs,
    binWidthSamples,
    binWidthHz,
    actualFreqStepHz,
    actualTimeStepSec: actualTimeStep,
    physicalWindowLengthSec: physWindowSec,
    f1Hz,
  }
}

// Inner spectrogram frame analysis (shared by batch and stream processors)
function analyzeSpectrogramFrame(
  chans: readonly Float32Array[],
  startSample: number,
  nsampWindow: number,
  window: Float32Array,
  nFFT: number,
  halfNFFT: number,
  binWidthSamples: number,
  numFreqs: number,
  oneByBinWidth: number,
  fftTables: FftTables,
  fftRe: Float32Array,
  fftIm: Float32Array,
  spectrum: Float32Array,
  outRow: Float32Array, // length ≥ numFreqs, receives PSD values for this frame
): void {
  const nChans = chans.length
  spectrum.fill(0)

  for (let ch = 0; ch < nChans; ch++) {
    const chan = chans[ch]!
    for (let j = 0; j < nsampWindow; j++)
      fftRe[j] = chan[startSample + j]! * window[j]!
    for (let j = nsampWindow; j < nFFT; j++) fftRe[j] = 0
    fftIm.fill(0)
    complexFFTForward(fftRe, fftIm, fftTables)

    // Accumulate power: spectrum[i] = |FFT[i]|²
    spectrum[0]! += fftRe[0]! * fftRe[0]! // DC
    for (let i = 1; i < halfNFFT; i++)
      spectrum[i]! += fftRe[i]! * fftRe[i]! + fftIm[i]! * fftIm[i]!
    spectrum[halfNFFT]! += fftRe[halfNFFT]! * fftRe[halfNFFT]! // Nyquist
  }

  if (nChans > 1) for (let i = 0; i <= halfNFFT; i++) spectrum[i]! /= nChans

  // Bin into output frequency bands (Praat: spectrum.part(lo, hi-1) summed then scaled)
  for (let iband = 0; iband < numFreqs; iband++) {
    const lo = iband * binWidthSamples
    const hi = lo + binWidthSamples
    let power = 0
    for (let j = lo; j < hi; j++) power += spectrum[j]!
    outRow[iband] = power * oneByBinWidth
  }
}

/**
 * Spectrogram batch processor
 *
 * Analyses an audio signal and returns its power spectrogram.
 *
 * Scratch buffers are allocated at construction and reused across calls to `analyze()`.
 * The output `SpectrogramResult.z` array is allocated fresh on each call.
 *
 * Example:
 * ```ts
 * const proc = new SpectrogramProcessor(
 *   { effectiveWindowLengthSec: 0.005, maxFrequencyHz: 5000,
 *     timeStepSec: 0.002, freqStepHz: 20, windowShape: 'gaussian' },
 *   11025,
 * );
 * const result = proc.analyze(monoSamples);
 * ```
 */
export class SpectrogramProcessor {
  readonly params: ResolvedSpectrogramParams

  private readonly window: Float32Array
  private readonly fftTables: FftTables
  private readonly fftRe: Float32Array
  private readonly fftIm: Float32Array
  private readonly spectrum: Float32Array
  private readonly oneByBinWidth: number
  private readonly frameRow: Float32Array // temp output for one frame

  constructor(config: SpectrogramConfig, sampleRate: number) {
    const p = resolveSpectrogramParams(config, sampleRate)
    this.params = p

    this.window = new Float32Array(p.nsampWindow)
    const wsq = buildWindow(
      config.windowShape,
      p.nsampWindow,
      p.physicalWindowLengthSec * sampleRate,
      this.window,
    )
    this.oneByBinWidth = 1.0 / wsq / p.binWidthSamples

    this.fftTables = new FftTables(p.nFFT)
    this.fftRe = new Float32Array(p.nFFT)
    this.fftIm = new Float32Array(p.nFFT)
    this.spectrum = new Float32Array(p.halfNFFT + 1)
    this.frameRow = new Float32Array(p.numFreqs)
  }

  /**
   * Analyses `samples` and returns the power spectrogram.
   *
   * @param channels Array of same-length Float32Arrays (one per channel).
   *                 Power is averaged across channels, matching Praat's multichannel behaviour.
   */
  analyze(channels: [Float32Array, ...Float32Array[]]): SpectrogramResult {
    const p = this.params
    const nSamples = channels[0].length
    const dt = 1 / p.sampleRate
    const physDur = nSamples * dt
    const timeStep = p.actualTimeStepSec

    const nFrames = Math.max(
      1,
      1 + Math.floor((physDur - p.physicalWindowLengthSec) / timeStep),
    )

    // Centre the frame grid over the signal (Praat: t1 = x1 + 0.5*((nx-1)*dx − (nFrames-1)*dt_frame))
    const x1 = 0.5 * dt // centre of first sample
    const t1 = x1 + 0.5 * ((nSamples - 1) * dt - (nFrames - 1) * timeStep)

    const data = []

    for (let iframe = 0; iframe < nFrames; iframe++) {
      const t = t1 + iframe * timeStep
      // Praat: leftSample = floor((t - x1) / dt)  [0-indexed equivalent]
      const leftSample = Math.floor(t * p.sampleRate - 0.5)
      const startSample = leftSample + 1 - p.halfNsampWindow
      // Safety clamp — should not be needed when t1 is computed correctly
      const clampedStart = Math.max(
        0,
        Math.min(startSample, nSamples - p.nsampWindow),
      )

      analyzeSpectrogramFrame(
        channels,
        clampedStart,
        p.nsampWindow,
        this.window,
        p.nFFT,
        p.halfNFFT,
        p.binWidthSamples,
        p.numFreqs,
        this.oneByBinWidth,
        this.fftTables,
        this.fftRe,
        this.fftIm,
        this.spectrum,
        this.frameRow,
      )

      data.push(this.frameRow.slice())
    }

    return {
      numFrames: nFrames,
      numFreqs: p.numFreqs,
      timeStepSec: timeStep,
      freqStepHz: p.actualFreqStepHz,
      t1Sec: t1,
      f1Hz: p.f1Hz,
      data,
    }
  }
}

/**
 * Streaming spectrogram processor, suitable for use inside an AudioWorkletProcessor.
 *
 * Feed audio blocks of any size via `feed()`; completed spectrogram frames
 * are queued internally and retrieved via `readFrame()`.
 *
 * No heap allocation occurs after construction.
 *
 * Example (inside AudioWorkletProcessor.process):
 * ```ts
 * this.proc.feed(inputs[0][0]);         // Float32Array of 128 samples
 * const psd = new Float32Array(this.proc.numFreqs);
 * while (this.proc.readFrame(psd)) {
 *   port.postMessage({ psd: psd.slice() });
 * }
 * ```
 */
export class SpectrogramStreamProcessor {
  readonly params: ResolvedSpectrogramParams

  private readonly window: Float32Array
  private readonly fftTables: FftTables
  private readonly fftRe: Float32Array
  private readonly fftIm: Float32Array
  private readonly spectrum: Float32Array
  private readonly oneByBinWidth: number

  // Ring buffer: power-of-2 size for cheap modular indexing (& mask instead of %)
  private readonly ring: Float32Array
  private readonly ringMask: number
  private ringHead: number // write index (modular)
  private totalFed: number // total samples fed (absolute)
  private nextFrameCenter: number // absolute sample index of next frame's centre

  // Frame output queue
  private readonly QUEUE = 64
  private readonly queue: Float32Array // [QUEUE * numFreqs]
  private qHead: number
  private qTail: number

  private readonly timeStepSamples: number

  constructor(config: SpectrogramConfig, sampleRate: number) {
    const p = resolveSpectrogramParams(config, sampleRate)
    this.params = p

    this.window = new Float32Array(p.nsampWindow)
    const wsq = buildWindow(
      config.windowShape,
      p.nsampWindow,
      p.physicalWindowLengthSec * sampleRate,
      this.window,
    )
    this.oneByBinWidth = 1.0 / wsq / p.binWidthSamples

    this.fftTables = new FftTables(p.nFFT)
    this.fftRe = new Float32Array(p.nFFT)
    this.fftIm = new Float32Array(p.nFFT)
    this.spectrum = new Float32Array(p.halfNFFT + 1)

    this.timeStepSamples = Math.max(
      1,
      Math.round(p.actualTimeStepSec * sampleRate),
    )
    const ringSize = nextPow2(p.nsampWindow + this.timeStepSamples * 4)
    this.ring = new Float32Array(ringSize)
    this.ringMask = ringSize - 1
    this.ringHead = 0
    this.totalFed = 0
    this.nextFrameCenter = p.halfNsampWindow // first frame centred at halfNsamp

    this.queue = new Float32Array(this.QUEUE * p.numFreqs)
    this.qHead = 0
    this.qTail = 0
  }

  /** Feed a block of new samples */
  feed(samples: Float32Array): void {
    const { ring, ringMask } = this
    for (const sample of samples) {
      ring[this.ringHead & ringMask] = sample
      this.ringHead++
    }
    this.totalFed += samples.length
    this._processReady()
  }

  // TODO: use analyzeSpectrogramFrame!
  private _processReady(): void {
    const p = this.params
    while (true) {
      const start = this.nextFrameCenter - p.halfNsampWindow
      if (start < 0 || start + p.nsampWindow > this.totalFed) break
      if (this.qTail - this.qHead >= this.QUEUE) break // queue full

      // Copy windowed samples from ring buffer into fftRe
      const { ring, ringMask, window: win } = this
      for (let j = 0; j < p.nsampWindow; j++) {
        this.fftRe[j] = ring[(start + j) & ringMask]! * win[j]!
      }
      for (let j = p.nsampWindow; j < p.nFFT; j++) this.fftRe[j] = 0
      this.fftIm.fill(0)
      complexFFTForward(this.fftRe, this.fftIm, this.fftTables)

      const sp = this.spectrum
      sp[0] = this.fftRe[0]! * this.fftRe[0]!
      for (let i = 1; i < p.halfNFFT; i++)
        sp[i] = this.fftRe[i]! ** 2 + this.fftIm[i]! ** 2
      sp[p.halfNFFT] = this.fftRe[p.halfNFFT]! ** 2

      const base = (this.qTail % this.QUEUE) * p.numFreqs
      const obbw = this.oneByBinWidth
      const bw = p.binWidthSamples
      for (let iband = 0; iband < p.numFreqs; iband++) {
        let power = 0
        const lo = iband * bw
        for (let j = lo; j < lo + bw; j++) power += sp[j]!
        this.queue[base + iband] = power * obbw
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
   * Copies the oldest completed PSD frame into `out[0..numFreqs-1]` (Pa²/Hz)
   * and advances the queue.  Returns false if no frame is available.
   */
  readFrame(out: Float32Array): boolean {
    if (this.qHead >= this.qTail) return false
    const base = (this.qHead % this.QUEUE) * this.params.numFreqs
    out.set(this.queue.subarray(base, base + this.params.numFreqs))
    this.qHead++
    return true
  }
}
