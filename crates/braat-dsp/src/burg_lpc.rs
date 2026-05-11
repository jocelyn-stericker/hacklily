/* Braat, adapted from Praat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 1992-2008,2010-2012,2014-2021,2024-2026 Paul Boersma
 * Copyright (C) 1993-2020 David Weenink
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/// Burg's method for LPC coefficient estimation.
/// Source: N. Anderson in Childers (ed.), Modern Spectrum Analysis, IEEE Press, 1978.
/// Returns residual mean-square power (0 if ill-conditioned).
pub fn burg_lpc(
    frame: &[f32],
    frame_len: usize,
    order: usize,
    coeffs: &mut [f32],
    b1: &mut [f32],
    b2: &mut [f32],
    aa: &mut [f32],
) -> f32 {
    for j in 0..order {
        coeffs[j] = 0.0;
    }
    if frame_len <= 2 {
        coeffs[0] = -1.0;
        return if frame_len == 2 {
            0.5 * (frame[0] * frame[0] + frame[1] * frame[1])
        } else {
            frame[0] * frame[0]
        };
    }

    let mut p = 0.0f32;
    for j in 0..frame_len {
        p += frame[j] * frame[j];
    }
    let mut xms = p / frame_len as f32;
    if xms <= 0.0 {
        return 0.0;
    }

    // Initialise forward/backward prediction error vectors
    b1[0] = frame[0];
    for j in 1..frame_len - 1 {
        b1[j] = frame[j];
        b2[j - 1] = frame[j];
    }
    b2[frame_len - 2] = frame[frame_len - 1];

    for ii in 0..order {
        let active = frame_len - ii - 1;
        let mut num = 0.0f32;
        let mut denom = 0.0f32;
        for j in 0..active {
            num += b1[j] * b2[j];
            denom += b1[j] * b1[j] + b2[j] * b2[j];
        }
        if denom <= 0.0 {
            return 0.0;
        }
        coeffs[ii] = 2.0 * num / denom;

        xms *= 1.0 - coeffs[ii] * coeffs[ii];

        // Levinson recursion
        for j in 0..ii {
            coeffs[j] = aa[j] - coeffs[ii] * aa[ii - 1 - j];
        }

        if ii < order - 1 {
            for j in 0..=ii {
                aa[j] = coeffs[j];
            }
            let rc = aa[ii];
            let bound = active - 1;
            for j in 0..bound {
                b1[j] -= rc * b2[j];
                b2[j] = b2[j + 1] - rc * b1[j + 1];
            }
        }
    }
    xms
}

/// Evaluates the LPC polynomial P(z) = z^n - c[0]*z^(n-1) - ... - c[n-1]
/// and its derivative at complex z, writing [P.re, P.im, P'.re, P'.im] into out.
fn eval_lpc_poly(
    z_re: f32,
    z_im: f32,
    lpc_coeffs: &[f32],
    order: usize,
    out: &mut [f32; 4],
) {
    let mut p_re = 1.0f32;
    let mut p_im = 0.0f32;
    let mut dp_re = 0.0f32;
    let mut dp_im = 0.0f32;
    for k in 0..order {
        let ndp_re = dp_re * z_re - dp_im * z_im + p_re;
        let ndp_im = dp_re * z_im + dp_im * z_re + p_im;
        dp_re = ndp_re;
        dp_im = ndp_im;
        let np_re = p_re * z_re - p_im * z_im - lpc_coeffs[k];
        let np_im = p_re * z_im + p_im * z_re;
        p_re = np_re;
        p_im = np_im;
    }
    out[0] = p_re;
    out[1] = p_im;
    out[2] = dp_re;
    out[3] = dp_im;
}

/// Durand-Kerner root finding + Newton-Raphson polish.
/// Returns true if converged.
pub fn find_lpc_roots(
    lpc_coeffs: &[f32],
    order: usize,
    roots_re: &mut [f32],
    roots_im: &mut [f32],
    peval: &mut [f32; 4],
) -> bool {
    use std::f32::consts::PI;
    for k in 0..order {
        let angle = (2.0 * PI * (k as f32 + 0.5)) / order as f32;
        roots_re[k] = 0.9 * angle.cos();
        roots_im[k] = 0.9 * angle.sin();
    }

    let mut converged = false;
    'outer: for _iter in 0..80 {
        let mut max_step2 = 0.0f32;
        for k in 0..order {
            eval_lpc_poly(roots_re[k], roots_im[k], lpc_coeffs, order, peval);
            let mut den_re = 1.0f32;
            let mut den_im = 0.0f32;
            for j in 0..order {
                if j == k {
                    continue;
                }
                let d_re = roots_re[k] - roots_re[j];
                let d_im = roots_im[k] - roots_im[j];
                let n_re = den_re * d_re - den_im * d_im;
                den_im = den_re * d_im + den_im * d_re;
                den_re = n_re;
            }
            let d2 = den_re * den_re + den_im * den_im;
            if d2 == 0.0 {
                continue;
            }
            let step_re = (peval[0] * den_re + peval[1] * den_im) / d2;
            let step_im = (peval[1] * den_re - peval[0] * den_im) / d2;
            roots_re[k] -= step_re;
            roots_im[k] -= step_im;
            let s2 = step_re * step_re + step_im * step_im;
            if s2 > max_step2 {
                max_step2 = s2;
            }
        }
        if max_step2 < 1e-20 {
            converged = true;
            break 'outer;
        }
    }

    // Newton-Raphson polish
    for k in 0..order {
        let mut best_re = roots_re[k];
        let mut best_im = roots_im[k];
        eval_lpc_poly(best_re, best_im, lpc_coeffs, order, peval);
        let mut ymin = (peval[0] * peval[0] + peval[1] * peval[1]).sqrt();

        for _iter in 0..80 {
            eval_lpc_poly(roots_re[k], roots_im[k], lpc_coeffs, order, peval);
            let fabsy = (peval[0] * peval[0] + peval[1] * peval[1]).sqrt();
            if fabsy >= ymin {
                roots_re[k] = best_re;
                roots_im[k] = best_im;
                break;
            }
            ymin = fabsy;
            best_re = roots_re[k];
            best_im = roots_im[k];
            let dp2 = peval[2] * peval[2] + peval[3] * peval[3];
            if dp2 == 0.0 {
                break;
            }
            roots_re[k] -= (peval[0] * peval[2] + peval[1] * peval[3]) / dp2;
            roots_im[k] -= (peval[1] * peval[2] - peval[0] * peval[3]) / dp2;
        }
    }
    converged
}

/// Projects roots outside the unit circle to their inverse.
pub fn fix_into_unit_circle(roots_re: &mut [f32], roots_im: &mut [f32], n: usize) {
    for i in 0..n {
        let n2 = roots_re[i] * roots_re[i] + roots_im[i] * roots_im[i];
        if n2 > 1.0 {
            roots_re[i] /= n2;
            roots_im[i] = -roots_im[i] / n2;
        }
    }
}
