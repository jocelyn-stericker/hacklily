/* Braat, adapted from Praat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 1992-2025 Paul Boersma
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

use std::f32::consts::PI; // used by interpolate_sinc

pub fn next_pow2(n: usize) -> usize {
    let mut p = 1usize;
    while p < n {
        p <<= 1;
    }
    p
}

/// Gaussian window for formant analysis.
/// Source: Sound_to_Formant.cpp lines 317-320.
pub fn build_formant_gaussian_window(nsamp: usize, out: &mut [f32]) {
    let edge = (-12.0f32).exp();
    let edge_c = 1.0 - edge;
    let denom = ((nsamp + 1) * (nsamp + 1)) as f32;
    for i in 0..nsamp {
        let d = (i as f32 + 1.0) - 0.5 * (nsamp as f32 + 1.0);
        out[i] = ((-48.0 * d * d / denom).exp() - edge) / edge_c;
    }
}

/// Sinc interpolation with raised-cosine (Hann) window.
/// Ported from melder/NUMinterpol.cpp NUMcubicSplineInterpolation → interpolateSinc.
/// `y`: sample array, `x`: fractional index, `max_depth`: kernel half-width.
pub fn interpolate_sinc(y: &[f32], x: f32, max_depth: usize) -> f32 {
    let n = y.len();
    if n == 0 {
        return 0.0;
    }
    if x <= 0.0 {
        return y[0];
    }
    if x >= (n - 1) as f32 {
        return y[n - 1];
    }
    let midleft = x.floor() as usize;
    let midright = midleft + 1;
    if x == midleft as f32 {
        return y[midleft];
    }
    let depth = max_depth.min(midright).min(n - 1 - midleft);
    if depth == 0 {
        return y[x.round() as usize];
    }
    let halfwidth = depth as f32 + 0.5;
    let window_phase_step = PI / halfwidth;
    let sin_step = window_phase_step.sin();
    let cos_step = window_phase_step.cos();
    let mut result = 0.0f32;

    // Left half: ix from midleft down to midright - depth
    {
        let mut left_phase = PI * (x - midleft as f32);
        let mut half_sin = 0.5 * left_phase.sin();
        let win_phase = left_phase / halfwidth;
        let mut sin_w = win_phase.sin();
        let mut cos_w = win_phase.cos();
        let mut ix = midleft as isize;
        let stop = (midright as isize) - (depth as isize);
        while ix >= stop {
            result += y[ix as usize] * (half_sin / left_phase) * (1.0 + cos_w);
            left_phase += PI;
            half_sin = -half_sin;
            let ns = cos_w * sin_step + sin_w * cos_step;
            cos_w = cos_w * cos_step - sin_w * sin_step;
            sin_w = ns;
            ix -= 1;
        }
    }

    // Right half: ix from midright up to midleft + depth
    {
        let mut right_phase = PI * (midright as f32 - x);
        let mut half_sin = 0.5 * right_phase.sin();
        let win_phase = right_phase / halfwidth;
        let mut sin_w = win_phase.sin();
        let mut cos_w = win_phase.cos();
        let mut ix = midright;
        let stop = midleft + depth;
        while ix <= stop {
            result += y[ix] * (half_sin / right_phase) * (1.0 + cos_w);
            right_phase += PI;
            half_sin = -half_sin;
            let ns = cos_w * sin_step + sin_w * cos_step;
            cos_w = cos_w * cos_step - sin_w * sin_step;
            sin_w = ns;
            ix += 1;
        }
    }

    result
}
