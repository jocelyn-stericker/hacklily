/* Braat, adapted from Praat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 1997-2011,2025 David Weenink, Paul Boersma 2016-2018,2020
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

use std::f32::consts::PI;

use crate::burg_lpc::{burg_lpc, find_lpc_roots, fix_into_unit_circle};
use crate::utils::{build_formant_gaussian_window, next_pow2};

const QUEUE_LEN: usize = 64;

#[derive(Clone, Copy)]
struct FormantSlot {
    freq_hz: f32,
    bw_hz: f32,
}

struct QueueFrame {
    formant_count: usize,
    formants: [FormantSlot; 5],
}

impl Default for QueueFrame {
    fn default() -> Self {
        Self {
            formant_count: 0,
            formants: [FormantSlot { freq_hz: 0.0, bw_hz: 0.0 }; 5],
        }
    }
}

pub struct FormantStreamProcessor {
    nyquist: f32,
    order: usize,
    nsamp_window: usize,
    half_nsamp_window: usize,
    time_step_samples: usize,
    safety_hz: f32,
    preemph_factor: f32,
    pub time_step_sec: f32,
    pub first_frame_sec: f32,

    ring: Vec<f32>,
    ring_mask: usize,
    ring_head: usize,
    total_fed: usize,
    next_frame_center: usize,

    gauss_window: Vec<f32>,
    raw_frame: Vec<f32>,
    coeffs: Vec<f32>,
    b1: Vec<f32>,
    b2: Vec<f32>,
    aa: Vec<f32>,
    roots_re: Vec<f32>,
    roots_im: Vec<f32>,
    peval: [f32; 4],
    out_freqs: Vec<f32>,
    out_bws: Vec<f32>,

    queue: [QueueFrame; QUEUE_LEN],
    q_head: usize,
    q_tail: usize,
}

impl FormantStreamProcessor {
    pub fn new(
        sample_rate: f32,
        max_formants: usize,
        max_freq_hz: f32,
        half_window_len_sec: f32,
        time_step_sec: f32,
        preemph_hz: f32,
        safety_hz: f32,
    ) -> Self {
        let dt = 1.0 / sample_rate;
        let order = (2 * max_formants).max(1);
        let nsamp_window = (2.0 * half_window_len_sec / dt).floor() as usize;
        let half_nsamp_window = nsamp_window / 2;
        let actual_time_step = if time_step_sec > 0.0 {
            time_step_sec
        } else {
            half_window_len_sec / 4.0
        };
        let time_step_samples = (actual_time_step * sample_rate).round() as usize;
        let time_step_samples = time_step_samples.max(1);

        let ring_size = next_pow2(nsamp_window + time_step_samples * 4 + 16);
        let mut gauss_window = vec![0f32; nsamp_window];
        build_formant_gaussian_window(nsamp_window, &mut gauss_window);

        let preemph_factor = (-2.0 * PI * preemph_hz / sample_rate).exp();

        let max_f = (order + 1) / 2;
        let queue = std::array::from_fn(|_| QueueFrame::default());

        Self {
            nyquist: max_freq_hz,
            order,
            nsamp_window,
            half_nsamp_window,
            time_step_samples,
            safety_hz,
            preemph_factor,
            time_step_sec: actual_time_step,
            first_frame_sec: half_nsamp_window as f32 / sample_rate,
            ring: vec![0f32; ring_size],
            ring_mask: ring_size - 1,
            ring_head: 0,
            total_fed: 0,
            next_frame_center: half_nsamp_window,
            gauss_window,
            raw_frame: vec![0f32; nsamp_window],
            coeffs: vec![0f32; order],
            b1: vec![0f32; nsamp_window],
            b2: vec![0f32; nsamp_window],
            aa: vec![0f32; order],
            roots_re: vec![0f32; order],
            roots_im: vec![0f32; order],
            peval: [0f32; 4],
            out_freqs: vec![0f32; max_f],
            out_bws: vec![0f32; max_f],
            queue,
            q_head: 0,
            q_tail: 0,
        }
    }

    pub fn feed(&mut self, samples: &[f32]) {
        let mask = self.ring_mask;
        for &s in samples {
            self.ring[self.ring_head & mask] = s;
            self.ring_head += 1;
        }
        self.total_fed += samples.len();
        self.process_ready();
    }

    fn process_ready(&mut self) {
        let factor = self.preemph_factor;
        loop {
            let start = self.next_frame_center.wrapping_sub(self.half_nsamp_window);
            if self.next_frame_center < self.half_nsamp_window {
                break; // start would underflow
            }
            if start + self.nsamp_window > self.total_fed {
                break;
            }
            if self.q_tail.wrapping_sub(self.q_head) >= QUEUE_LEN {
                break;
            }

            let mut max_intensity = 0.0f32;
            for j in 0..self.nsamp_window {
                let v = self.ring[(start + j) & self.ring_mask];
                self.raw_frame[j] = v;
                let v2 = v * v;
                if v2 > max_intensity {
                    max_intensity = v2;
                }
            }

            let slot = &mut self.queue[self.q_tail % QUEUE_LEN];
            if max_intensity == 0.0 {
                slot.formant_count = 0;
            } else {
                // Pre-emphasise backward scan
                let n = self.nsamp_window;
                for i in (1..n).rev() {
                    self.raw_frame[i] -= factor * self.raw_frame[i - 1];
                }
                // Apply Gaussian window
                for j in 0..n {
                    self.raw_frame[j] *= self.gauss_window[j];
                }

                let n_f = analyze_formant_frame(
                    &self.raw_frame,
                    self.nsamp_window,
                    self.nyquist,
                    self.order,
                    self.safety_hz,
                    &mut self.out_freqs,
                    &mut self.out_bws,
                    &mut self.coeffs,
                    &mut self.b1,
                    &mut self.b2,
                    &mut self.aa,
                    &mut self.roots_re,
                    &mut self.roots_im,
                    &mut self.peval,
                );
                for k in 0..n_f {
                    slot.formants[k] = FormantSlot {
                        freq_hz: self.out_freqs[k],
                        bw_hz: self.out_bws[k],
                    };
                }
                slot.formant_count = n_f;
            }

            self.q_tail = self.q_tail.wrapping_add(1);
            self.next_frame_center += self.time_step_samples;
        }
    }

    pub fn has_frame(&self) -> bool {
        self.q_head < self.q_tail
    }

    /// Read the oldest frame from the queue.
    /// Returns the formant count (0 = no frame or silent).
    pub fn read_frame(&mut self, out_freqs: &mut [f32], out_bws: &mut [f32]) -> usize {
        if self.q_head >= self.q_tail {
            return 0;
        }
        let slot = &self.queue[self.q_head % QUEUE_LEN];
        let n = slot.formant_count;
        for k in 0..n {
            out_freqs[k] = slot.formants[k].freq_hz;
            out_bws[k] = slot.formants[k].bw_hz;
        }
        self.q_head = self.q_head.wrapping_add(1);
        n
    }
}

fn analyze_formant_frame(
    frame: &[f32],
    frame_len: usize,
    nyquist_hz: f32,
    order: usize,
    safety_hz: f32,
    out_freqs: &mut [f32],
    out_bws: &mut [f32],
    coeffs: &mut [f32],
    b1: &mut [f32],
    b2: &mut [f32],
    aa: &mut [f32],
    roots_re: &mut [f32],
    roots_im: &mut [f32],
    peval: &mut [f32; 4],
) -> usize {
    burg_lpc(frame, frame_len, order, coeffs, b1, b2, aa);
    find_lpc_roots(coeffs, order, roots_re, roots_im, peval);
    fix_into_unit_circle(roots_re, roots_im, order);

    let mut n = 0usize;
    for i in 0..order {
        if roots_im[i] < 0.0 {
            continue; // keep upper half-plane only
        }
        let f = roots_im[i].atan2(roots_re[i]).abs() * nyquist_hz / std::f32::consts::PI;
        if f < safety_hz || f > nyquist_hz - safety_hz {
            continue;
        }
        let norm2 = roots_re[i] * roots_re[i] + roots_im[i] * roots_im[i];
        out_freqs[n] = f;
        out_bws[n] = (-norm2.ln() * nyquist_hz) / std::f32::consts::PI;
        n += 1;
    }

    // Selection sort by ascending frequency
    for i in 0..n.saturating_sub(1) {
        let mut m = i;
        for j in i + 1..n {
            if out_freqs[j] < out_freqs[m] {
                m = j;
            }
        }
        if m != i {
            out_freqs.swap(i, m);
            out_bws.swap(i, m);
        }
    }
    n
}
