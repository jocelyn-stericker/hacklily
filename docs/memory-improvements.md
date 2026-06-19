# Memory improvements — practice and main routes

Goal: keep memory bounded regardless of recording length, especially for mobile
Safari reliability. The feedback loop (`npm run mem`, `npm run mem:detail`,
plus the Node `*.memory.test.ts` suite) is the regression gate for everything
below — see [Feedback loop](#feedback-loop) at the bottom.

Each item lists the offending retained state, why it grows, and the fix
direction. Order is rough priority by expected impact on a long session.

---

## 1. Evict off-screen spectrogram tiles (biggest win) — DONE (spectrogram)

**Shipped.** Spec + formant canvas tiles in `Spectrogram.tsx` are now a lazy,
LRU-bounded cache instead of being retained for the whole recording.

What changed:

- `Tile.canvas` / `Tile.ctx` are now `OffscreenCanvas | null`. `ensureTiles`
  only grows the array with empty placeholders — no allocation.
- The retained **source** is `colorTiles` (one `Uint32Array(numBins × TILE_WIDTH)`
  per tile, ~15 MB for 60 s) plus `chunk.frames`. A canvas tile is a
  rebuildable function of those, so it's cheap to drop and re-render.
- The blit path (`blitLayer` → `renderSpecTile` / `renderFormantTile`)
  materializes a tile only when it actually overlaps the visible source range,
  and marks it most-recently-used.
- `TileLru` (cap `MAX_TILE_CANVAS_BYTES = 48 MB`, shared spec+formant) evicts
  least-recently-used canvases once per `draw()`.
- Waveform separately stopped retaining a **per-tile** `imgData`/`u32` scratch
  (write-only, never read back) — one shared `OffscreenState.scratch` now, like
  the spectrogram. −13.6 MB.

**Measured — `npm run mem -- --layer2 --scenario main-import` (60 s WAV,
chromium L2), before → after:**

- Total retained: 208.5 MB → **82.9 MB**
- Peak (afterImport): 457.8 MB → **206.7 MB**
- spec canvas tiles: 68.6 MB (120) → 14.3 MB (25); formant tiles likewise
- waveform `imgData`: 15.6 MB → 2.0 MB
- After "New": unchanged (~54 MB; that residual is unrelated to tiles)

### Invariants to preserve (don't regress these)

1. **Source vs cache.** `colorTiles` + `chunk.frames` are the source of truth;
   canvas tiles are disposable. Don't free `colorTiles` without first adding a
   recompute-from-`spectrum` path (re-running the colourmap, not just a
   `putImageData` blit) — see item 1c.
2. **Paint fns skip evicted tiles.** `paintColumnsToOffscreen`,
   `paintFormantTiles`, `appendFormantTiles` all `continue` when `tile.ctx`
   is null. This is what makes append/patch touch only materialized tiles while
   off-screen tiles rebuild lazily. A new paint helper must keep that guard.
3. **Materialize only when visible.** `blitLayer` calls `ensure(t)` only for
   tiles whose clipped source width is > 0. Don't pre-render in the rebuild
   effect or the append path — that reintroduces the peak.
4. **Eviction never drops the on-screen set.** `TileLru.evict()` floors the
   budget at `touchedBytes` (bytes touched since the last evict), so the tiles
   the current frame is drawing survive even when the visible set alone exceeds
   the cap (e.g. fully zoomed out). Keep `register`/`touch` bumping
   `touchedBytes` and `evict` resetting it.
5. **Forget on discard.** On chunk-identity divergence, `numFrames` shrink, or
   clear, call `truncateTiles` / `lru.forget` / `lru.clear` so evicted-but-
   referenced canvases don't leak and `totalBytes` stays accurate.

## 1a. Waveform canvas-tile LRU — TODO (next; same pattern as item 1)

The waveform's `imgData` scratch is fixed, but the **canvas tiles** themselves
(`Waveform.tsx`, `TILE_WIDTH = 4096`) are still retained for the whole recording
(15.6 MB at 60 s, grows linearly). Apply the same treatment: lazy
`canvas: … | null`, materialize on blit from `analysis` frames (the source is
already retained — no color-data layer to keep), LRU-evict past a cap. Simpler
than the spectrogram (one layer, no display buffer, no formant overlay), so this
is the low-risk next step. Expect to bound waveform canvas to ~one viewport.

## 1b. Combine formant + spectrogram into one canvas tile — TODO (recommended)

Today each chunk keeps two parallel tile sets — an opaque spectrogram tile and
a transparent (`alpha: true`) formant tile — composited as two `drawImage`s per
tile per `draw()`. Merge them into a single opaque tile with formant arcs drawn
on top.

Why it's attractive *now*: the original reason to keep them separate was
independent repaint (clear just the formant layer without disturbing the
spectrogram). But (a) the component already patches both together in one
`handleFrame` pass, and (b) tiles now rebuild cheaply from sources, so
"re-render the whole combined tile" is just a `putImageData` (colours) + arc
draw. Benefits: halves canvas tile count (~14 MB working set instead of ~28 MB),
one blit per tile instead of two, and removes the alpha-canvas compositing /
shadow-over-transparent surface.

Cost to weigh: a formant-only patch must re-blit the spectrogram colours
underneath (can't `clearRect` just the arcs off a merged canvas) — but that blit
is the cheap part. Note alpha is *not* a memory cost (RGBA is 4 B/px either way);
the win is tile/blit count, not the transparency.

## 1c. Lower-resolution tiles when zoomed out — TODO

The one weak spot left in item 1: eviction floors at the on-screen set
(invariant 4), so a fully-zoomed-out view of a long recording still holds the
whole visible span at full resolution — and re-renders full-res tiles only to
scale them down (wasteful in memory and quality). Two options:

- **Render straight into the display buffer past a zoom threshold**, bypassing
  tile canvases entirely. The display buffer is already viewport-sized and
  bounded, and the incremental scroll path (`pixelShift`) already recomputes
  only the newly revealed strip. Avoids LOD cache-key machinery — preferred.
- **True LOD/mipmap tiles**, cache-keyed `(chunkIdx, tileIdx, lod)`.

Either way: downsample the spectrogram from the **underlying `spectrum`/dB
values** (max or mean per pixel column — Praat does per-column reduction), not
by averaging already-colour-mapped RGBA, which looks wrong. Formants probably
want to switch from dots to connected lines when zoomed out so track peaks
don't vanish into the smear. Stacks with item 1b (one combined low-res tile).

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
