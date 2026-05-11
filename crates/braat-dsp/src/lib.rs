/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

mod burg_lpc;
mod fft;
mod formant;
mod pitch;
mod utils;

use formant::FormantStreamProcessor;
use pitch::PitchProcessor;
use wasm_bindgen::prelude::*;

/// Maximum formants the WasmFormantProcessor supports.
const MAX_FORMANTS: usize = 5;
/// Maximum input samples per feed call (sized generously for the resampler output).
const FORMANT_STAGING_CAP: usize = 512;
/// Pitch analysis window size in samples.
const PITCH_BUF_SIZE: usize = 4096;
/// Audio worklet quantum size.
const QUANTUM: usize = 128;
/// Run pitch analysis every N quanta.
const PITCH_INTERVAL: usize = 16;

// ─── WasmFormantProcessor ────────────────────────────────────────────────────

/// Streaming formant processor backed by Burg LPC.
///
/// Usage from JavaScript:
/// ```js
/// const proc = new WasmFormantProcessor(11000);
/// // Get a Float32Array view into WASM memory:
/// const staging = new Float32Array(memory.buffer, proc.staging_ptr(), proc.staging_cap());
/// // Each quantum, fill staging[0..n] then call feed(n):
/// staging.set(resampledSamples.subarray(0, n));
/// proc.feed(n);
/// // Then drain all ready frames:
/// if (proc.drain_frames()) {
///   const f1 = proc.f1(), f2 = proc.f2(), f3 = proc.f3();
/// }
/// ```
#[wasm_bindgen]
pub struct WasmFormantProcessor {
    inner: FormantStreamProcessor,
    staging: Vec<f32>,
    out_freqs: Vec<f32>,
    out_bws: Vec<f32>,
    latest_f1: f32,
    latest_f2: f32,
    latest_f3: f32,
}

#[wasm_bindgen]
impl WasmFormantProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Self {
        let inner = FormantStreamProcessor::new(
            sample_rate,
            MAX_FORMANTS,
            sample_rate / 2.0,
            0.025,
            0.0,
            50.0,
            50.0,
        );
        Self {
            inner,
            staging: vec![0f32; FORMANT_STAGING_CAP],
            out_freqs: vec![0f32; MAX_FORMANTS],
            out_bws: vec![0f32; MAX_FORMANTS],
            latest_f1: 0.0,
            latest_f2: 0.0,
            latest_f3: 0.0,
        }
    }

    /// Pointer to the staging buffer in WASM memory. JS should write resampled
    /// samples here before calling `feed(n)`.
    pub fn staging_ptr(&self) -> u32 {
        self.staging.as_ptr() as u32
    }

    /// Capacity of the staging buffer (max samples per feed call).
    pub fn staging_cap(&self) -> u32 {
        FORMANT_STAGING_CAP as u32
    }

    /// Feed the first `n` samples from the staging buffer into the processor.
    pub fn feed(&mut self, n: u32) {
        let n = (n as usize).min(FORMANT_STAGING_CAP);
        self.inner.feed(&self.staging[..n]);
    }

    /// Drain all ready frames, updating f1/f2/f3 to the latest.
    /// Returns true if at least one frame was read.
    pub fn drain_frames(&mut self) -> bool {
        let mut read_any = false;
        while self.inner.has_frame() {
            let count = self.inner.read_frame(&mut self.out_freqs, &mut self.out_bws);
            read_any = true;
            self.latest_f1 = if count > 0 { self.out_freqs[0] } else { 0.0 };
            self.latest_f2 = if count > 1 { self.out_freqs[1] } else { 0.0 };
            self.latest_f3 = if count > 2 { self.out_freqs[2] } else { 0.0 };
        }
        read_any
    }

    /// True if a formant frame is available to read.
    pub fn has_frame(&self) -> bool {
        self.inner.has_frame()
    }

    /// Read and advance the oldest formant frame.
    /// Updates f1/f2/f3 and returns true if a frame was available.
    pub fn read_next_frame(&mut self) -> bool {
        if !self.inner.has_frame() {
            return false;
        }
        let count = self.inner.read_frame(&mut self.out_freqs, &mut self.out_bws);
        self.latest_f1 = if count > 0 { self.out_freqs[0] } else { 0.0 };
        self.latest_f2 = if count > 1 { self.out_freqs[1] } else { 0.0 };
        self.latest_f3 = if count > 2 { self.out_freqs[2] } else { 0.0 };
        true
    }

    /// Time between consecutive formant frames in seconds.
    pub fn time_step_sec(&self) -> f32 {
        self.inner.time_step_sec
    }

    /// Time of the first formant frame center in seconds.
    pub fn first_frame_sec(&self) -> f32 {
        self.inner.first_frame_sec
    }

    /// Latest detected F1 in Hz (0 = not detected or silent).
    pub fn f1(&self) -> f32 {
        self.latest_f1
    }

    /// Latest detected F2 in Hz (0 = not detected or silent).
    pub fn f2(&self) -> f32 {
        self.latest_f2
    }

    /// Latest detected F3 in Hz (0 = not detected or silent).
    pub fn f3(&self) -> f32 {
        self.latest_f3
    }
}

// ─── WasmPitchProcessor ──────────────────────────────────────────────────────

/// Batch pitch processor (runs Viterbi over PITCH_BUF_SIZE samples every
/// PITCH_INTERVAL quanta).
///
/// Usage from JavaScript:
/// ```js
/// const proc = new WasmPitchProcessor(44100);
/// // Each quantum, fill the quantum staging area and call push_quantum():
/// const qPtr = proc.quantum_ptr();
/// const qView = new Float32Array(memory.buffer, qPtr, 128);
/// qView.set(rawInput);          // copy 128 raw samples
/// const f0 = proc.push_quantum();   // returns latest f0 (0 = unvoiced)
/// ```
#[wasm_bindgen]
pub struct WasmPitchProcessor {
    inner: PitchProcessor,
    pitch_buf: Vec<f32>,
    quantum_staging: Vec<f32>,
    quantum_count: u32,
    latest_f0: f32,
}

#[wasm_bindgen]
impl WasmPitchProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Self {
        let inner = PitchProcessor::new(
            sample_rate,
            0.0,   // time_step_sec: auto
            75.0,  // pitch_floor_hz
            600.0, // pitch_ceiling_hz
            15,    // max_candidates
            0.1,   // attenuation_at_top
            0.05,  // silence_threshold
            0.6,   // voicing_threshold (raised from Praat default)
            0.01,  // octave_cost
            0.35,  // octave_jump_cost
            0.14,  // voiced_unvoiced_cost
        );
        Self {
            inner,
            pitch_buf: vec![0f32; PITCH_BUF_SIZE],
            quantum_staging: vec![0f32; QUANTUM],
            quantum_count: 0,
            latest_f0: 0.0,
        }
    }

    /// Pointer to the 128-sample quantum staging buffer in WASM memory.
    /// JS should write raw input samples here before calling `push_quantum()`.
    pub fn quantum_ptr(&self) -> u32 {
        self.quantum_staging.as_ptr() as u32
    }

    /// Roll the quantum_staging into the pitch window and, every PITCH_INTERVAL
    /// quanta, run pitch analysis.
    /// Returns the latest f0 in Hz (0 = unvoiced).
    pub fn push_quantum(&mut self) -> f32 {
        // Shift pitch_buf left by QUANTUM
        self.pitch_buf.copy_within(QUANTUM.., 0);
        let tail_start = PITCH_BUF_SIZE - QUANTUM;
        self.pitch_buf[tail_start..].copy_from_slice(&self.quantum_staging);

        self.quantum_count += 1;
        if (self.quantum_count as usize % PITCH_INTERVAL) == 0 {
            let (f0, _strength) = self.inner.analyze(&self.pitch_buf);
            self.latest_f0 = f0;
        }
        self.latest_f0
    }
}

// ─── WasmBatchPitchAnalyzer ──────────────────────────────────────────────────

/// Chunk size for feeding audio into the batch pitch analyzer.
const BATCH_PITCH_CHUNK: usize = 4096;

/// Full-buffer pitch analyzer for offline use.
///
/// Unlike `WasmPitchProcessor` (which returns only the last frame of a rolling
/// window), this analyzer runs a single global Viterbi pass over the entire
/// audio buffer and exposes f0 for every frame.
///
/// Usage from JavaScript:
/// ```js
/// const analyzer = new WasmBatchPitchAnalyzer(44100);
/// const cap = analyzer.chunk_cap();
/// let offset = 0;
/// while (offset < audio.length) {
///   const n = Math.min(cap, audio.length - offset);
///   const view = new Float32Array(memory.buffer, analyzer.chunk_ptr(), cap);
///   view.set(audio.subarray(offset, offset + n));
///   analyzer.append(n);
///   offset += n;
/// }
/// analyzer.run();
/// const step = analyzer.time_step_sec();
/// const t1   = analyzer.first_frame_sec();
/// for (let i = 0; i < analyzer.frame_count(); i++) {
///   const f0 = analyzer.f0_at(i);  // 0 = unvoiced
/// }
/// ```
#[wasm_bindgen]
pub struct WasmBatchPitchAnalyzer {
    inner: PitchProcessor,
    chunk_staging: Vec<f32>,
    audio: Vec<f32>,
    out_f0: Vec<f32>,
    frame_count: usize,
    time_step_sec: f32,
    first_frame_sec: f32,
}

#[wasm_bindgen]
impl WasmBatchPitchAnalyzer {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Self {
        let inner = PitchProcessor::new(
            sample_rate,
            0.0,   // time_step_sec: auto
            75.0,  // pitch_floor_hz
            600.0, // pitch_ceiling_hz
            15,    // max_candidates
            0.1,   // attenuation_at_top
            0.05,  // silence_threshold
            0.6,   // voicing_threshold
            0.01,  // octave_cost
            0.35,  // octave_jump_cost
            0.14,  // voiced_unvoiced_cost
        );
        Self {
            inner,
            chunk_staging: vec![0f32; BATCH_PITCH_CHUNK],
            audio: Vec::new(),
            out_f0: Vec::new(),
            frame_count: 0,
            time_step_sec: 0.0,
            first_frame_sec: 0.0,
        }
    }

    /// Pointer to the chunk staging buffer in WASM memory.
    pub fn chunk_ptr(&self) -> u32 {
        self.chunk_staging.as_ptr() as u32
    }

    /// Capacity of the chunk staging buffer.
    pub fn chunk_cap(&self) -> u32 {
        BATCH_PITCH_CHUNK as u32
    }

    /// Append the first `n` samples from the chunk staging buffer to the
    /// internal audio accumulator.
    pub fn append(&mut self, n: u32) {
        let n = (n as usize).min(BATCH_PITCH_CHUNK);
        self.audio.extend_from_slice(&self.chunk_staging[..n]);
    }

    /// Run the full Viterbi pitch analysis over all appended audio.
    pub fn run(&mut self) {
        let (f0s, time_step, t1) = self.inner.analyze_all(&self.audio);
        self.frame_count = f0s.len();
        self.time_step_sec = time_step;
        self.first_frame_sec = t1;
        self.out_f0 = f0s;
    }

    /// Number of pitch frames produced by the last `run()` call.
    pub fn frame_count(&self) -> u32 {
        self.frame_count as u32
    }

    /// Time between consecutive pitch frames in seconds.
    pub fn time_step_sec(&self) -> f32 {
        self.time_step_sec
    }

    /// Time of the first pitch frame center in seconds.
    pub fn first_frame_sec(&self) -> f32 {
        self.first_frame_sec
    }

    /// f0 in Hz for frame `i` (0 = unvoiced).
    pub fn f0_at(&self, i: u32) -> f32 {
        self.out_f0.get(i as usize).copied().unwrap_or(0.0)
    }
}
