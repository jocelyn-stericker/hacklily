/* tslint:disable */
/* eslint-disable */

/**
 * Full-buffer pitch analyzer for offline use.
 *
 * Unlike `WasmPitchProcessor` (which returns only the last frame of a rolling
 * window), this analyzer runs a single global Viterbi pass over the entire
 * audio buffer and exposes f0 for every frame.
 *
 * Usage from JavaScript:
 * ```js
 * const analyzer = new WasmBatchPitchAnalyzer(44100);
 * const cap = analyzer.chunk_cap();
 * let offset = 0;
 * while (offset < audio.length) {
 *   const n = Math.min(cap, audio.length - offset);
 *   const view = new Float32Array(memory.buffer, analyzer.chunk_ptr(), cap);
 *   view.set(audio.subarray(offset, offset + n));
 *   analyzer.append(n);
 *   offset += n;
 * }
 * analyzer.run();
 * const step = analyzer.time_step_sec();
 * const t1   = analyzer.first_frame_sec();
 * for (let i = 0; i < analyzer.frame_count(); i++) {
 *   const f0 = analyzer.f0_at(i);  // 0 = unvoiced
 * }
 * ```
 */
export class WasmBatchPitchAnalyzer {
  free(): void
  [Symbol.dispose](): void
  /**
   * Append the first `n` samples from the chunk staging buffer to the
   * internal audio accumulator.
   */
  append(n: number): void
  /**
   * Capacity of the chunk staging buffer.
   */
  chunk_cap(): number
  /**
   * Pointer to the chunk staging buffer in WASM memory.
   */
  chunk_ptr(): number
  /**
   * f0 in Hz for frame `i` (0 = unvoiced).
   */
  f0_at(i: number): number
  /**
   * Time of the first pitch frame center in seconds.
   */
  first_frame_sec(): number
  /**
   * Number of pitch frames produced by the last `run()` call.
   */
  frame_count(): number
  constructor(sample_rate: number)
  /**
   * Run the full Viterbi pitch analysis over all appended audio.
   */
  run(): void
  /**
   * Time between consecutive pitch frames in seconds.
   */
  time_step_sec(): number
}

/**
 * Streaming formant processor backed by Burg LPC.
 *
 * Usage from JavaScript:
 * ```js
 * const proc = new WasmFormantProcessor(11000);
 * // Get a Float32Array view into WASM memory:
 * const staging = new Float32Array(memory.buffer, proc.staging_ptr(), proc.staging_cap());
 * // Each quantum, fill staging[0..n] then call feed(n):
 * staging.set(resampledSamples.subarray(0, n));
 * proc.feed(n);
 * // Then drain all ready frames:
 * if (proc.drain_frames()) {
 *   const f1 = proc.f1(), f2 = proc.f2(), f3 = proc.f3();
 * }
 * ```
 */
export class WasmFormantProcessor {
  free(): void
  [Symbol.dispose](): void
  /**
   * Drain all ready frames, updating f1/f2/f3 to the latest.
   * Returns true if at least one frame was read.
   */
  drain_frames(): boolean
  /**
   * Latest detected F1 in Hz (0 = not detected or silent).
   */
  f1(): number
  /**
   * Latest detected F2 in Hz (0 = not detected or silent).
   */
  f2(): number
  /**
   * Latest detected F3 in Hz (0 = not detected or silent).
   */
  f3(): number
  /**
   * Feed the first `n` samples from the staging buffer into the processor.
   */
  feed(n: number): void
  /**
   * Time of the first formant frame center in seconds.
   */
  first_frame_sec(): number
  /**
   * True if a formant frame is available to read.
   */
  has_frame(): boolean
  constructor(sample_rate: number)
  /**
   * Read and advance the oldest formant frame.
   * Updates f1/f2/f3 and returns true if a frame was available.
   */
  read_next_frame(): boolean
  /**
   * Capacity of the staging buffer (max samples per feed call).
   */
  staging_cap(): number
  /**
   * Pointer to the staging buffer in WASM memory. JS should write resampled
   * samples here before calling `feed(n)`.
   */
  staging_ptr(): number
  /**
   * Time between consecutive formant frames in seconds.
   */
  time_step_sec(): number
}

/**
 * Batch pitch processor (runs Viterbi over PITCH_BUF_SIZE samples every
 * PITCH_INTERVAL quanta).
 *
 * Usage from JavaScript:
 * ```js
 * const proc = new WasmPitchProcessor(44100);
 * // Each quantum, fill the quantum staging area and call push_quantum():
 * const qPtr = proc.quantum_ptr();
 * const qView = new Float32Array(memory.buffer, qPtr, 128);
 * qView.set(rawInput);          // copy 128 raw samples
 * const f0 = proc.push_quantum();   // returns latest f0 (0 = unvoiced)
 * ```
 */
export class WasmPitchProcessor {
  free(): void
  [Symbol.dispose](): void
  constructor(sample_rate: number)
  /**
   * Roll the quantum_staging into the pitch window and, every PITCH_INTERVAL
   * quanta, run pitch analysis.
   * Returns the latest f0 in Hz (0 = unvoiced).
   */
  push_quantum(): number
  /**
   * Pointer to the 128-sample quantum staging buffer in WASM memory.
   * JS should write raw input samples here before calling `push_quantum()`.
   */
  quantum_ptr(): number
}

export type InitInput =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module

export interface InitOutput {
  readonly memory: WebAssembly.Memory
  readonly __wbg_wasmbatchpitchanalyzer_free: (a: number, b: number) => void
  readonly __wbg_wasmformantprocessor_free: (a: number, b: number) => void
  readonly __wbg_wasmpitchprocessor_free: (a: number, b: number) => void
  readonly wasmbatchpitchanalyzer_append: (a: number, b: number) => void
  readonly wasmbatchpitchanalyzer_chunk_cap: (a: number) => number
  readonly wasmbatchpitchanalyzer_chunk_ptr: (a: number) => number
  readonly wasmbatchpitchanalyzer_f0_at: (a: number, b: number) => number
  readonly wasmbatchpitchanalyzer_first_frame_sec: (a: number) => number
  readonly wasmbatchpitchanalyzer_frame_count: (a: number) => number
  readonly wasmbatchpitchanalyzer_new: (a: number) => number
  readonly wasmbatchpitchanalyzer_run: (a: number) => void
  readonly wasmbatchpitchanalyzer_time_step_sec: (a: number) => number
  readonly wasmformantprocessor_drain_frames: (a: number) => number
  readonly wasmformantprocessor_f1: (a: number) => number
  readonly wasmformantprocessor_f2: (a: number) => number
  readonly wasmformantprocessor_f3: (a: number) => number
  readonly wasmformantprocessor_feed: (a: number, b: number) => void
  readonly wasmformantprocessor_first_frame_sec: (a: number) => number
  readonly wasmformantprocessor_has_frame: (a: number) => number
  readonly wasmformantprocessor_new: (a: number) => number
  readonly wasmformantprocessor_read_next_frame: (a: number) => number
  readonly wasmformantprocessor_staging_cap: (a: number) => number
  readonly wasmformantprocessor_staging_ptr: (a: number) => number
  readonly wasmformantprocessor_time_step_sec: (a: number) => number
  readonly wasmpitchprocessor_new: (a: number) => number
  readonly wasmpitchprocessor_push_quantum: (a: number) => number
  readonly wasmpitchprocessor_quantum_ptr: (a: number) => number
  readonly __wbindgen_externrefs: WebAssembly.Table
  readonly __wbindgen_start: () => void
}

export type SyncInitInput = BufferSource | WebAssembly.Module

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(
  module: { module: SyncInitInput } | SyncInitInput,
): InitOutput

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | { module_or_path: InitInput | Promise<InitInput> }
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>
