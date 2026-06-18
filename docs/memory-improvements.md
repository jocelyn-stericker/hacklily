# Memory improvements — practice and main routes

Goal: keep memory bounded regardless of recording length, especially for mobile
Safari reliability. The feedback loop (`npm run mem`, `npm run mem:detail`,
plus the Node `*.memory.test.ts` suite) is the regression gate for everything
below — see [Feedback loop](#feedback-loop) at the bottom.

Each item lists the offending retained state, why it grows, and the fix
direction. Order is rough priority by expected impact on a long session.

---

## 1. Evict off-screen spectrogram tiles (biggest win)

**Measured (60s recording, webkit, via `npm run mem`):** ~160 MB in retained
spectrogram tiles alone (71.88 MB specTiles + 71.88 MB formantTiles + 15.61 MB
colorTiles), plus 16.38 MB in waveform canvas tiles. All zero after "New".

Retained state:

- `allColorsRef: ChunkColorsState[]` — one `Uint32Array(numBins × TILE_WIDTH)`
  per tile, kept for the whole recording.
  `src/components/Spectrogram.tsx:584`
- `allOffRef: OffscreenState[]` — one `OffscreenCanvas` + scratch `ImageData`
  per tile. `src/components/Spectrogram.tsx:585`
- `allFormantOffRef: FormantOffscreenState[]` — parallel set of
  `OffscreenCanvas` tiles for formants. `src/components/Spectrogram.tsx:586`

Today tiles are only freed on `New`/`Open` or chunk-identity divergence
(`Spectrogram.tsx:609-615`, `Spectrogram.tsx:762-785`). There is no viewport
eviction, so canvas memory grows ~linearly with frame count.

**Fix:** LRU cache keyed by `(chunkIdx, tileIdx)` around the viewport ± a
prefetch margin. Tiles are deterministic functions of `AnalysisFrame[]` +
`AudioRope`, so they can be rebuilt on demand when scrolled back into view. Cap
total tile bytes; evict the least-recently-touched. The display buffer
(`displayBufRef`, `Spectrogram.tsx:587`) stays as-is — it's already a single
viewport-sized canvas.

Same pattern applies to `Waveform` (`src/components/Waveform.tsx:170`,
`TILE_WIDTH = 4096`).

## 2. Bound VAD / formant worker accumulators

Both grow unbounded for the duration of a recording and are only cleared when
the worker is terminated:

- `vadProbs: number[]`, `frameHfEnergy: number[]` — `src/lib/workers/VadWorker.ts:102, 111`
- `frameFormants: FrameFormant[]`, `pendingFormants: PendingFormant[]` — `src/lib/workers/FormantWorker.ts:117-118`

**Fix:** flush per closed VAD segment (the segment is what's actually consumed
downstream) and/or cap length once the main-thread analysis has acknowledged
the range. If history is needed for late `patch` re-chunking, store it in a
fixed-size ring that covers the maximum patch window only.

## 3. Stop the per-quantum `readBuf.slice()`

`AudioRopeReader` allocates a fresh `Float32Array(128)` per quantum yielded:
`src/lib/audio/AudioRopeReader.ts:45`. At 48 kHz that's ~22,500 allocations per
minute per worker — small individually but constant churn, and three workers
(spectrogram, formant, VAD) all run this loop.

**Fix:** double-buffered ring of `N` reusable `Float32Array(quantum)` slots, or
return a transferable buffer that the consumer returns. The slice exists only
because `postMessage` would race the next read; a buffer pool with explicit
return avoids both the race and the allocation.

## 4. Pool VAD ONNX tensors

Each 32 ms VAD inference builds fresh `ort.Tensor` objects wrapping
`this.buf.slice()` and `this.state.slice()`:
`src/lib/analysis/VadProcessor.ts:91-107`. Per-chunk allocation throughout the
recording.

**Fix:** reuse the underlying `Float32Array`s across inferences (copy-on-write
only if ONNX runtime mutates inputs) and re-wrap them in `ort.Tensor` only if
wrapping is itself costly — otherwise just re-wrap. The state tensor in
particular is read-modify-write every chunk and is a prime pool candidate.

## 5. Verify practice-route `analysisRef` clears at take end

`src/routes/practice.tsx:110` holds `analysisRef = useRef<AnalysisFrame[]>([])`
and is currently reset only on `CLEAR_SESSION` (`practice.tsx:410-414`). Confirm
it's cleared when a take ends so frames from one take can't leak into the next.
If `computeVoicedRange` needs it at take end, clear immediately after.

## 6. Release spare SABs earlier for non-realtime consumers

`AudioRope` keeps one spare segment ahead for producer lead time
(`src/lib/audio/AudioRope.ts:149-155`). Each consumer that opens a share also
holds its own spare until `seal()`. The formant and VAD workers are
throughput-bound, not realtime, so they don't need lookahead — they could opt
out of the spare policy.

**Fix:** add an `AudioRope.openShare({ lookahead: 0 })` mode and use it from
`FormantWorker` / `VadWorker`. Frees ~256 KB per such consumer immediately
rather than at recording end.

## 7. VowelChart `framesUpToCursor` allocation per redraw

`src/components/VowelChart.tsx:296-311` allocates a fresh `AnalysisFrame[]`
per redraw. Small but called on every append/patch/cursor move during
recording.

**Fix:** reuse a scratch array across redraws (length-bounded; `.length = 0`
then push). Or filter in place over the existing chunk array if the cursor
boundary is the only thing changing.

---

## Lower-priority / confirmed bounded

These showed up in the audit but are already bounded or short-lived — listed
here so they don't get re-investigated:

- `analysisMut` frames + per-frame `Float32Array` spectra
  (`src/routes/index.tsx:60`, `src/lib/audio/CapturePipeline.ts:574`) —
  inherent to the feature; bounded only by recording length. Tile eviction
  (item 1) is the right lever, not dropping frames.
- `AudioRope` SAB segments — shared across threads; per-consumer spares are
  addressed in item 6. The segments themselves are the recording.
- Transcription worker pool (`src/lib/transcription/transcribeBundled.ts:23`) —
  already pooled per model with 60 s idle teardown
  (`transcribeBundled.ts:37-56`) and terminated when recording starts with
  `runHeavyWhileRecording` off (`src/components/useChunkWorkQueue.ts:169-173`).
- Align worker — module-level singleton, one at a time
  (`src/lib/jobs/alignJob.ts:27`).
- `TranscriptStore` — `WeakMap`-backed; subscribers explicitly cleaned at size 0
  (`src/components/TranscriptStore.ts:58-71`).
- `RopeGainCache` — `WeakMap` keyed by rope (`src/lib/loudness/ropeLoudness.ts:25`).
- Stream processors (`Spectrogram`/`Formant`/`Resample`) — explicitly
  zero-allocation after construction
  (`SpectrogramProcessor.ts:393-509`, `FormantProcessor.ts:400-456`).

---

## Feedback loop

Three layers, each independently runnable:

- **Layer 1 — `npm run mem`**: Playwright `webkit` channel against the dev
  server. Runs scenarios (main route record+idle, practice route takes+idle),
  reads the dev-only `window.__braatMem` probe before/after each scenario and
  after idle, and fails on regressions from baseline. Catches the leak classes
  (retained tiles, unbounded accumulators, unterminated workers) on the engine
  family that matters for mobile Safari.
- **Layer 2 — `npm run mem:detail`**: same scenarios on the `chromium` channel
  with CDP `HeapProfiler` + `performance.measureMemory()`, dumped to a report
  file. Use when you need to see _where_ bytes are, not just whether they
  leaked.
- **Layer 3 — `npm run test`**: Node `*.memory.test.ts` under
  `--expose-gc` via Vitest, targeting pure allocators that don't need a browser
  (`AudioRopeReader`, `VadProcessor` tensor churn, VAD/Formant accumulators).
  Uses `WeakRef`/`FinalizationRegistry` to assert collectability after
  seal/reset. Runs in CI.

Scenario selector: `npm run mem -- --scenario main-record`.

The dev-only `window.__braatMem` probe reports counts/bytes of the retained
structures that matter: spectrogram tile count + bytes, waveform tile count +
bytes, live `AudioRope`s + SAB segment count, live `Worker`s, `analysisMut`
frame count, VAD/Formant accumulator lengths. Built in dev builds only, stripped
from production.
