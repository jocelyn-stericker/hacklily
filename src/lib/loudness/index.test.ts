// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, expect, it } from 'vitest'

import { dbToLinear, loudnessGain, measureLoudness, TARGET_LUFS } from '.'

function sine(freq: number, amp: number, seconds: number, sampleRate: number) {
  const n = Math.floor(seconds * sampleRate)
  const buf = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    buf[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate)
  }
  return buf
}

// Reference values produced by libebur128 (jiixyj/libebur128, the source this
// module is ported from) on byte-identical mono signals, mode
// I | TRUE_PEAK | SAMPLE_PEAK. See the C harness in the loudness PR notes.
describe('measureLoudness vs libebur128 reference', () => {
  const cases = [
    { freq: 1000, amp: 0.5, sr: 44100, lufs: -9.021449, tp: 0.50028723 },
    { freq: 1000, amp: 1.0, sr: 44100, lufs: -3.000849, tp: 1.00057447 },
    { freq: 1000, amp: 0.5, sr: 48000, lufs: -9.024207, tp: 0.5 },
    { freq: 1000, amp: 1.0, sr: 48000, lufs: -3.003607, tp: 1.0 },
  ]

  for (const { freq, amp, sr, lufs, tp } of cases) {
    it(`sine ${freq}Hz amp ${amp} @ ${sr}Hz`, () => {
      const r = measureLoudness(sine(freq, amp, 3, sr), sr)
      expect(r.lufs).not.toBeNull()
      // Tolerance well within EBU Tech 3341's +/-0.1 LU compliance band.
      expect(r.lufs!).toBeCloseTo(lufs, 2)
      expect(r.truePeak).toBeCloseTo(tp, 4)
      expect(r.samplePeak).toBeCloseTo(amp, 3)
    })
  }
})

describe('measureLoudness edge cases', () => {
  it('returns null for silence', () => {
    const sr = 48000
    const r = measureLoudness(new Float32Array(sr), sr)
    expect(r.lufs).toBeNull()
    expect(r.truePeak).toBe(0)
    expect(r.samplePeak).toBe(0)
  })

  it('returns null below one 400ms gating block', () => {
    const sr = 48000
    const r = measureLoudness(sine(1000, 0.5, 0.2, sr), sr)
    expect(r.lufs).toBeNull()
  })

  it('true peak meets or exceeds sample peak', () => {
    const sr = 44100
    const r = measureLoudness(sine(1000, 1.0, 3, sr), sr)
    expect(r.truePeak).toBeGreaterThanOrEqual(r.samplePeak)
  })

  it('tracks a +6 dB amplitude change as ~+6 LU', () => {
    const sr = 48000
    const quiet = measureLoudness(sine(1000, 0.25, 3, sr), sr)
    const loud = measureLoudness(sine(1000, 0.5, 3, sr), sr)
    expect(loud.lufs! - quiet.lufs!).toBeCloseTo(20 * Math.log10(2), 1)
  })
})

describe('loudnessGain', () => {
  it('boosts a quiet recording toward the target', () => {
    const gain = loudnessGain(
      { lufs: -30, truePeak: 0.1, samplePeak: 0.1 },
      { targetLufs: -14, ceiling: dbToLinear(-1) },
    )
    // -30 -> -14 is +16 dB, and 0.1 * 6.3 stays under the -1 dBTP ceiling.
    expect(gain).toBeCloseTo(dbToLinear(16), 5)
  })

  it('clamps to the peak ceiling rather than clipping', () => {
    const ceiling = dbToLinear(-1)
    const gain = loudnessGain(
      { lufs: -30, truePeak: 0.9, samplePeak: 0.9 },
      { targetLufs: -14, ceiling },
    )
    // The loudness boost would push the peak over the ceiling, so gain is
    // limited to bring the true peak exactly to the ceiling.
    expect(gain).toBeCloseTo(ceiling / 0.9, 5)
    expect(gain * 0.9).toBeCloseTo(ceiling, 6)
  })

  it('returns unity gain when loudness is unmeasurable', () => {
    expect(loudnessGain({ lufs: null, truePeak: 0, samplePeak: 0 })).toBe(1)
  })

  it('defaults to the -14 LUFS target', () => {
    expect(TARGET_LUFS).toBe(-14)
  })
})
