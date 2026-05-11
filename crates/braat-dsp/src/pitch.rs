/* Braat, adapted from Praat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 1992-2005,2007-2012,2014-2020,2023-2025 Paul Boersma
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

use std::f32::consts::PI;

use crate::fft::{fft_forward, fft_inverse, FftTables};
use crate::utils::{interpolate_sinc, next_pow2};

pub struct PitchProcessor {
    sample_rate: f32,
    pitch_floor_hz: f32,
    pitch_ceiling_hz: f32,
    max_candidates: usize,
    attenuation_at_top: f32,
    silence_threshold: f32,
    voicing_threshold: f32,
    octave_cost: f32,
    octave_jump_cost: f32,
    voiced_unvoiced_cost: f32,

    nsamp_period: usize,
    nsamp_window: usize,
    half_nsamp_window: usize,
    nsamp_fft: usize,
    brent_ixmax: usize,
    minimum_lag: usize,
    maximum_lag: usize,
    time_step: f32,

    window: Vec<f32>,
    window_ac: Vec<f32>,
    fft_tables: FftTables,
    fft_re: Vec<f32>,
    fft_im: Vec<f32>,
    r_buf: Vec<f32>,
}

impl PitchProcessor {
    pub fn new(
        sample_rate: f32,
        time_step_sec: f32,
        pitch_floor_hz: f32,
        pitch_ceiling_hz: f32,
        max_candidates: usize,
        attenuation_at_top: f32,
        silence_threshold: f32,
        voicing_threshold: f32,
        octave_cost: f32,
        octave_jump_cost: f32,
        voiced_unvoiced_cost: f32,
    ) -> Self {
        let dt = 1.0 / sample_rate;
        let periods_per_window = 3.0f32;

        let nsamp_period = (1.0 / dt / pitch_floor_hz).floor() as usize;
        let nsamp_approx = (periods_per_window / pitch_floor_hz / dt).floor() as usize;
        let half_nsamp = (nsamp_approx / 2).saturating_sub(1);
        assert!(half_nsamp >= 2, "pitchFloorHz too high for sample rate");
        let nsamp_window = half_nsamp * 2;
        let half_nsamp_window = half_nsamp;

        let minimum_lag = (1.0 / dt / pitch_ceiling_hz).floor() as usize;
        let minimum_lag = minimum_lag.max(2);
        let maximum_lag =
            ((nsamp_window as f32 / periods_per_window).floor() as usize + 2).min(nsamp_window);

        let nsamp_fft = next_pow2((nsamp_window as f32 * 1.5).ceil() as usize);
        let brent_ixmax = (nsamp_window as f32 * 0.5).floor() as usize;

        let time_step = if time_step_sec > 0.0 {
            time_step_sec
        } else {
            periods_per_window / pitch_floor_hz / 4.0
        };

        let max_candidates = max_candidates.max(
            (pitch_ceiling_hz / pitch_floor_hz).ceil() as usize,
        );

        // Hanning window
        let mut window = vec![0f32; nsamp_window];
        for i in 0..nsamp_window {
            window[i] = 0.5 - 0.5 * ((2.0 * PI * (i as f32 + 1.0)) / (nsamp_window as f32 + 1.0)).cos();
        }

        let fft_tables = FftTables::new(nsamp_fft);
        let fft_re = vec![0f32; nsamp_fft];
        let fft_im = vec![0f32; nsamp_fft];
        let window_ac = vec![0f32; brent_ixmax + 1];
        let r_buf = vec![0f32; 2 * brent_ixmax + 1];

        let mut proc = Self {
            sample_rate,
            pitch_floor_hz,
            pitch_ceiling_hz,
            max_candidates,
            attenuation_at_top,
            silence_threshold,
            voicing_threshold,
            octave_cost,
            octave_jump_cost,
            voiced_unvoiced_cost,
            nsamp_period,
            nsamp_window,
            half_nsamp_window,
            nsamp_fft,
            brent_ixmax,
            minimum_lag,
            maximum_lag,
            time_step,
            window,
            window_ac,
            fft_tables,
            fft_re,
            fft_im,
            r_buf,
        };
        proc.compute_window_ac();
        proc
    }

    fn compute_window_ac(&mut self) {
        let n = self.nsamp_fft;
        self.fft_re.fill(0.0);
        self.fft_im.fill(0.0);
        for i in 0..self.nsamp_window {
            self.fft_re[i] = self.window[i];
        }
        fft_forward(&mut self.fft_re, &mut self.fft_im, &self.fft_tables);
        for k in 0..n {
            let re = self.fft_re[k];
            let im = self.fft_im[k];
            self.fft_re[k] = re * re + im * im;
            self.fft_im[k] = 0.0;
        }
        fft_inverse(&mut self.fft_re, &mut self.fft_im, &self.fft_tables);
        let ac0 = self.fft_re[0];
        self.window_ac[0] = 1.0;
        for k in 1..=self.brent_ixmax {
            self.window_ac[k] = if ac0 > 0.0 { self.fft_re[k] / ac0 } else { 0.0 };
        }
    }

    fn low_pass_filter(&self, samples: &[f32]) -> Vec<f32> {
        let cutoff_hz = self.pitch_ceiling_hz
            / (-2.0 * self.attenuation_at_top.ln()).sqrt();
        let n = samples.len();
        let nfft = next_pow2(n);
        let fft_tables = FftTables::new(nfft);
        let mut re = vec![0f32; nfft];
        let mut im = vec![0f32; nfft];
        for i in 0..n {
            re[i] = samples[i];
        }
        fft_forward(&mut re, &mut im, &fft_tables);
        let bin_hz = self.sample_rate / nfft as f32;
        for k in 0..=nfft / 2 {
            let freq = k as f32 * bin_hz;
            let factor = (-0.5 * (freq / cutoff_hz) * (freq / cutoff_hz)).exp();
            re[k] *= factor;
            im[k] *= factor;
            if k > 0 && k < nfft / 2 {
                re[nfft - k] *= factor;
                im[nfft - k] *= factor;
            }
        }
        fft_inverse(&mut re, &mut im, &fft_tables);
        let scale = 1.0 / nfft as f32;
        let mut out = vec![0f32; n];
        for i in 0..n {
            out[i] = re[i] * scale;
        }
        out
    }

    /// Analyzes samples and returns (f0_hz, strength).
    /// f0_hz == 0.0 means unvoiced.
    /// For online/streaming use (one scalar result per window).
    pub fn analyze(&mut self, samples: &[f32]) -> (f32, f32) {
        let (f0s, _, _) = self.analyze_all(samples);
        (f0s.last().copied().unwrap_or(0.0), 0.0)
    }

    /// Analyzes samples and returns (f0s, time_step_sec, first_frame_sec).
    /// f0s[i] is the fundamental frequency for frame i (0.0 = unvoiced).
    /// For offline/batch use (one scalar per analysis frame across the full buffer).
    pub fn analyze_all(&mut self, samples: &[f32]) -> (Vec<f32>, f32, f32) {
        let n = samples.len();
        let dt = 1.0 / self.sample_rate;

        let signal: Vec<f32> = if self.attenuation_at_top > 0.0 && self.attenuation_at_top < 1.0 {
            self.low_pass_filter(samples)
        } else {
            samples.to_vec()
        };

        let mut global_mean = 0.0f32;
        for &s in &signal {
            global_mean += s;
        }
        global_mean /= n as f32;
        let mut global_peak = 0.0f32;
        for &s in &signal {
            let v = (s - global_mean).abs();
            if v > global_peak {
                global_peak = v;
            }
        }

        let phys_dur = n as f32 * dt;
        let dt_window = self.nsamp_window as f32 * dt;
        let n_frames = 1usize.max(
            1 + ((phys_dur - dt_window) / self.time_step).floor() as usize,
        );
        let x1 = 0.5 * dt;
        let t1 = x1 + 0.5 * ((n as f32 - 1.0) * dt - (n_frames as f32 - 1.0) * self.time_step);

        if global_peak == 0.0 {
            return (vec![0.0; n_frames], self.time_step, t1);
        }

        let max_cands = self.max_candidates + 1;
        let mut cand_freqs = vec![0f32; n_frames * max_cands];
        let mut cand_strs = vec![0f32; n_frames * max_cands];
        let mut cand_counts = vec![0usize; n_frames];
        let mut frame_intensities = vec![0f32; n_frames];

        let half_nsamp_period = self.nsamp_period / 2 + 1;
        let half_vt = 0.5 * self.voicing_threshold;

        for iframe in 0..n_frames {
            let t = t1 + iframe as f32 * self.time_step;
            let left_sample = (t * self.sample_rate - 0.5).floor() as isize;
            let win_start = left_sample + 1 - self.half_nsamp_window as isize;

            let mean_start =
                ((left_sample + 1 - self.nsamp_period as isize).max(0)) as usize;
            let mean_end =
                ((left_sample + self.nsamp_period as isize).min(n as isize - 1)) as usize;
            let mut local_mean = 0.0f32;
            for i in mean_start..=mean_end {
                local_mean += signal[i];
            }
            local_mean /= (mean_end - mean_start + 1) as f32;

            // Build windowed DC-removed frame
            self.fft_re.fill(0.0);
            self.fft_im.fill(0.0);
            for j in 0..self.nsamp_window {
                let si = win_start + j as isize;
                let s = if si >= 0 && (si as usize) < n {
                    signal[si as usize] - local_mean
                } else {
                    0.0
                };
                self.fft_re[j] = s * self.window[j];
            }

            // Local peak for intensity
            let peak_start = self.half_nsamp_window.saturating_sub(half_nsamp_period);
            let peak_end = (self.half_nsamp_window + half_nsamp_period).min(self.nsamp_window - 1);
            let mut local_peak = 0.0f32;
            for j in peak_start..=peak_end {
                let v = self.fft_re[j].abs();
                if v > local_peak {
                    local_peak = v;
                }
            }
            frame_intensities[iframe] = local_peak / global_peak;

            // FFT autocorrelation
            fft_forward(&mut self.fft_re, &mut self.fft_im, &self.fft_tables);
            for k in 0..self.nsamp_fft {
                let re = self.fft_re[k];
                let im = self.fft_im[k];
                self.fft_re[k] = re * re + im * im;
                self.fft_im[k] = 0.0;
            }
            fft_inverse(&mut self.fft_re, &mut self.fft_im, &self.fft_tables);

            let base = iframe * max_cands;
            let ac0 = self.fft_re[0];

            if ac0 == 0.0 {
                cand_freqs[base] = 0.0;
                cand_strs[base] = 0.0;
                cand_counts[iframe] = 1;
                continue;
            }

            // Normalized r[k] — build symmetric rBuf
            let bi = self.brent_ixmax;
            self.r_buf[bi] = 1.0;
            for k in 1..=bi {
                let rk = if self.window_ac[k] > 0.0 {
                    self.fft_re[k] / (ac0 * self.window_ac[k])
                } else {
                    0.0
                };
                self.r_buf[bi + k] = rk;
                self.r_buf[bi - k] = rk;
            }

            let mut n_voiced = 0usize;
            for lag in self.minimum_lag..self.maximum_lag.min(bi) {
                let rm1 = self.r_buf[bi + lag - 1];
                let r0 = self.r_buf[bi + lag];
                let rp1 = self.r_buf[bi + lag + 1];
                if r0 <= half_vt {
                    continue;
                }
                if r0 <= rm1 || r0 < rp1 {
                    continue;
                }

                // Parabolic interpolation
                let dr = 0.5 * (rp1 - rm1);
                let d2r = r0 - rm1 + (r0 - rp1);
                let lag_est = if d2r > 0.0 {
                    lag as f32 + dr / d2r
                } else {
                    lag as f32
                };

                // 30-point sinc strength estimate
                let mut str_est =
                    interpolate_sinc(&self.r_buf, (bi as f32) + lag_est, 30);
                if str_est > 1.0 {
                    str_est = 1.0 / str_est;
                }

                // Golden-section search with 70-point sinc
                let (lag_final, str_raw) = golden_section_max(
                    |x| interpolate_sinc(&self.r_buf, (bi as f32) + x, 70),
                    lag_est - 1.0,
                    lag_est + 1.0,
                );
                let mut str_final = str_raw;
                if str_final > 1.0 {
                    str_final = 1.0 / str_final;
                }
                let freq_final = self.sample_rate / lag_final;

                if n_voiced < self.max_candidates {
                    cand_freqs[base + n_voiced] = freq_final;
                    cand_strs[base + n_voiced] = str_final;
                    n_voiced += 1;
                } else {
                    let mut weak_idx = 0usize;
                    let mut weak_ls = cand_strs[base]
                        - self.octave_cost
                            * (self.pitch_floor_hz / cand_freqs[base]).log2();
                    for ci in 1..n_voiced {
                        let ls = cand_strs[base + ci]
                            - self.octave_cost
                                * (self.pitch_floor_hz / cand_freqs[base + ci]).log2();
                        if ls < weak_ls {
                            weak_ls = ls;
                            weak_idx = ci;
                        }
                    }
                    let new_ls = str_final
                        - self.octave_cost * (self.pitch_floor_hz / freq_final).log2();
                    if new_ls > weak_ls {
                        cand_freqs[base + weak_idx] = freq_final;
                        cand_strs[base + weak_idx] = str_final;
                    }
                }
            }

            cand_freqs[base + n_voiced] = 0.0;
            cand_strs[base + n_voiced] = 0.0;
            cand_counts[iframe] = n_voiced + 1;
        }

        // Viterbi
        let ts_c = 0.01 / self.time_step;
        let oc_s = self.octave_jump_cost * ts_c;
        let vuc_s = self.voiced_unvoiced_cost * ts_c;
        let silence_t = self.silence_threshold / (1.0 + self.voicing_threshold);

        let mut delta = vec![-1e30f32; n_frames * max_cands];
        let mut psi = vec![0usize; n_frames * max_cands];

        for iframe in 0..n_frames {
            let base = iframe * max_cands;
            let n_c = cand_counts[iframe];
            let unvoiced_str = self.voicing_threshold
                + (0.0f32).max(2.0 - frame_intensities[iframe] / silence_t);
            for c in 0..n_c {
                let f = cand_freqs[base + c];
                if f == 0.0 {
                    cand_strs[base + c] = unvoiced_str;
                    delta[base + c] = unvoiced_str;
                } else {
                    delta[base + c] = cand_strs[base + c]
                        - self.octave_cost * (self.pitch_ceiling_hz / f).log2();
                }
            }
        }

        for iframe in 1..n_frames {
            let base = iframe * max_cands;
            let prev_base = (iframe - 1) * max_cands;
            let n_c = cand_counts[iframe];
            let n_prev = cand_counts[iframe - 1];

            for c2 in 0..n_c {
                let f2 = cand_freqs[base + c2];
                let v2_unvoiced = f2 == 0.0;
                let local_score = delta[base + c2];

                let mut best_val = -1e30f32;
                let mut best_prev = 0usize;
                for c1 in 0..n_prev {
                    let f1 = cand_freqs[prev_base + c1];
                    let tc = if v2_unvoiced {
                        if f1 == 0.0 { 0.0 } else { vuc_s }
                    } else if f1 == 0.0 {
                        vuc_s
                    } else {
                        oc_s * (f1 / f2).log2().abs()
                    };
                    let v = delta[prev_base + c1] - tc + local_score;
                    if v > best_val {
                        best_val = v;
                        best_prev = c1;
                    }
                }
                delta[base + c2] = best_val;
                psi[base + c2] = best_prev;
            }
        }

        // Backtrack
        let last_base = (n_frames - 1) * max_cands;
        let mut best_c = 0usize;
        let mut best_score = delta[last_base];
        for c in 1..cand_counts[n_frames - 1] {
            if delta[last_base + c] > best_score {
                best_score = delta[last_base + c];
                best_c = c;
            }
        }
        let mut path = vec![0usize; n_frames];
        path[n_frames - 1] = best_c;
        for iframe in (1..n_frames).rev() {
            path[iframe - 1] = psi[iframe * max_cands + path[iframe]];
        }

        // Collect f0 for every frame.
        let mut f0s = Vec::with_capacity(n_frames);
        for iframe in 0..n_frames {
            let c = path[iframe];
            let base = iframe * max_cands;
            f0s.push(cand_freqs[base + c]);
        }
        (f0s, self.time_step, t1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sinusoid(freq_hz: f32, duration_sec: f32, sample_rate: f32) -> Vec<f32> {
        let n = (duration_sec * sample_rate) as usize;
        let phase = 2.0 * PI * freq_hz / sample_rate;
        (0..n).map(|i| (phase * i as f32).sin()).collect()
    }

    fn processor(floor: f32, ceiling: f32, sr: f32) -> PitchProcessor {
        PitchProcessor::new(sr, 0.0, floor, ceiling, 15, 0.1, 0.05, 0.6, 0.01, 0.35, 0.14)
    }

    #[test]
    fn detects_100hz_sinusoid() {
        let sr = 44100.0;
        let mut proc = processor(50.0, 300.0, sr);
        let (f0s, _, _) = proc.analyze_all(&sinusoid(100.0, 1.0, sr));
        let voiced: Vec<f32> = f0s.into_iter().filter(|&f| f > 0.0).collect();
        assert!(!voiced.is_empty(), "no voiced frames detected");
        let avg = voiced.iter().sum::<f32>() / voiced.len() as f32;
        assert!((avg - 100.0).abs() < 1.0, "expected ~100 Hz, got {avg:.1}");
    }

    #[test]
    fn detects_200hz_sinusoid() {
        let sr = 44100.0;
        let mut proc = processor(75.0, 600.0, sr);
        let (f0s, _, _) = proc.analyze_all(&sinusoid(200.0, 1.0, sr));
        let voiced: Vec<f32> = f0s.into_iter().filter(|&f| f > 0.0).collect();
        assert!(!voiced.is_empty(), "no voiced frames detected");
        let avg = voiced.iter().sum::<f32>() / voiced.len() as f32;
        assert!((avg - 200.0).abs() < 1.0, "expected ~200 Hz, got {avg:.1}");
    }

    #[test]
    fn silence_is_all_unvoiced() {
        let sr = 44100.0;
        let zeros = vec![0.0f32; sr as usize];
        let mut proc = processor(75.0, 600.0, sr);
        let (f0s, _, _) = proc.analyze_all(&zeros);
        assert!(f0s.iter().all(|&f| f == 0.0), "silent signal should be all unvoiced");
    }

    #[test]
    fn returns_timing_info() {
        let sr = 44100.0;
        let mut proc = processor(50.0, 300.0, sr);
        let (f0s, time_step, t1) = proc.analyze_all(&sinusoid(100.0, 1.0, sr));
        assert!(!f0s.is_empty());
        assert!(time_step > 0.0, "time_step should be positive");
        assert!(t1 >= 0.0, "first frame time should be non-negative");
    }

    #[test]
    fn out_of_range_frequency_is_unvoiced() {
        // 150 Hz sinusoid analyzed with floor=200 Hz: should be unvoiced
        let sr = 44100.0;
        let mut proc = processor(200.0, 600.0, sr);
        let (f0s, _, _) = proc.analyze_all(&sinusoid(150.0, 1.0, sr));
        let voiced: Vec<f32> = f0s.into_iter().filter(|&f| f > 0.0).collect();
        for f in &voiced {
            assert!(*f >= 200.0, "voiced frame {f:.1} Hz is below floor");
        }
    }
}

fn golden_section_max<F>(f: F, a: f32, b: f32) -> (f32, f32)
where
    F: Fn(f32) -> f32,
{
    // 50 iterations reduces the interval by phi^50 ≈ 3.7e-11 × initial range,
    // which is below f32 precision for any lag value — avoids infinite loops when
    // tol-based convergence is unreachable due to floating-point granularity.
    let phi = (5.0f32.sqrt() - 1.0) * 0.5;
    let mut x0 = a;
    let mut x3 = b;
    let mut x1 = x3 - phi * (x3 - x0);
    let mut x2 = x0 + phi * (x3 - x0);
    let mut f1 = f(x1);
    let mut f2 = f(x2);
    for _ in 0..50 {
        if f2 > f1 {
            x0 = x1;
            x1 = x2;
            f1 = f2;
            x2 = x0 + phi * (x3 - x0);
            f2 = f(x2);
        } else {
            x3 = x2;
            x2 = x1;
            f2 = f1;
            x1 = x3 - phi * (x3 - x0);
            f1 = f(x1);
        }
    }
    if f1 > f2 { (x1, f1) } else { (x2, f2) }
}
