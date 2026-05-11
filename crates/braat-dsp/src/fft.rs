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

pub struct FftTables {
    pub n: usize,
    pub cos_table: Vec<f32>,
    pub sin_table: Vec<f32>,
    pub bit_rev: Vec<usize>,
}

impl FftTables {
    pub fn new(n: usize) -> Self {
        assert!(n >= 2 && n.is_power_of_two(), "FFT size must be a power of 2");
        let half = n / 2;
        let mut cos_table = vec![0f32; half];
        let mut sin_table = vec![0f32; half];
        for k in 0..half {
            let a = (-2.0 * PI * k as f32) / n as f32;
            cos_table[k] = a.cos();
            sin_table[k] = a.sin();
        }
        let bits = n.trailing_zeros() as usize;
        let mut bit_rev = vec![0usize; n];
        for i in 0..n {
            let mut rev = 0usize;
            for b in 0..bits {
                rev = (rev << 1) | ((i >> b) & 1);
            }
            bit_rev[i] = rev;
        }
        Self { n, cos_table, sin_table, bit_rev }
    }
}

pub fn fft_forward(re: &mut [f32], im: &mut [f32], tables: &FftTables) {
    let n = tables.n;
    for i in 0..n {
        let j = tables.bit_rev[i];
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
    }
    let mut len = 2;
    while len <= n {
        let half = len >> 1;
        let step = n / len;
        let mut i = 0;
        while i < n {
            for j in 0..half {
                let wr = tables.cos_table[j * step];
                let wi = tables.sin_table[j * step];
                let ur = re[i + j];
                let ui = im[i + j];
                let vr = re[i + j + half] * wr - im[i + j + half] * wi;
                let vi = re[i + j + half] * wi + im[i + j + half] * wr;
                re[i + j] = ur + vr;
                im[i + j] = ui + vi;
                re[i + j + half] = ur - vr;
                im[i + j + half] = ui - vi;
            }
            i += len;
        }
        len <<= 1;
    }
}

pub fn fft_inverse(re: &mut [f32], im: &mut [f32], tables: &FftTables) {
    let n = tables.n;
    for i in 0..n {
        let j = tables.bit_rev[i];
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
    }
    let mut len = 2;
    while len <= n {
        let half = len >> 1;
        let step = n / len;
        let mut i = 0;
        while i < n {
            for j in 0..half {
                let wr = tables.cos_table[j * step];
                let wi = -tables.sin_table[j * step]; // conjugate for IFFT
                let ur = re[i + j];
                let ui = im[i + j];
                let vr = re[i + j + half] * wr - im[i + j + half] * wi;
                let vi = re[i + j + half] * wi + im[i + j + half] * wr;
                re[i + j] = ur + vr;
                im[i + j] = ui + vi;
                re[i + j + half] = ur - vr;
                im[i + j + half] = ui - vi;
            }
            i += len;
        }
        len <<= 1;
    }
}
