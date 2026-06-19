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
- The blit path (`blitLayer` → `renderTile`) materializes a tile only when it
  actually overlaps the visible source range, and marks it most-recently-used.
  (Spec and formant share one tile since item 1b; see below.)
- `TileLru` (cap `MAX_TILE_CANVAS_BYTES = 48 MB`) evicts least-recently-used
  canvases once per `draw()`.
- Waveform separately stopped retaining a **per-tile** `imgData`/`u32` scratch
  (write-only, never read back) — and was later rewritten entirely (item 1a).

**Measured — `npm run mem -- --layer2 --scenario main-import` (60 s WAV,
chromium L2), original → after item 1 → after 1a+1b (this is cumulative; each
row is the same scenario):**

- Total retained: 208.5 MB → 82.9 MB → **52.9 MB**
- Peak (afterImport): 457.8 MB → 206.7 MB → **146.8 MB**
- spec canvas tiles: 68.6 MB (120) → 14.3 MB (25) spec + 14.3 MB formant →
  **14.3 MB (25) combined** (formant tiles eliminated, item 1b)
- waveform canvas: 15.6 MB (8 tiles, growing) → unchanged → **0.19 MB fixed**
  (item 1a)
- After "New": unchanged (~54 MB; that residual is unrelated to tiles)

### Invariants to preserve (don't regress these)

1. **Source vs cache.** `colorTiles` + `chunk.frames` are the source of truth;
   canvas tiles are disposable. Don't free `colorTiles` without first adding a
   recompute-from-`spectrum` path (re-running the colourmap, not just a
   `putImageData` blit) — see item 1c.
2. **Paint fns skip evicted tiles.** `paintColumnsToOffscreen` and `paintTile` /
   `repaintTile` `continue` / no-op when `tile.ctx` is null. This is what makes
   append/patch touch only materialized tiles while off-screen tiles rebuild
   lazily. A new paint helper must keep that guard.
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

## 1a. Waveform overview at display resolution — DONE

**Shipped.** The waveform is the full-track **overview** (always fully zoomed
out, with a `ViewportShade` marking the spectrogram's window), so unlike the
spectrogram every part is always on-screen — a visibility-keyed LRU (the
original 1a plan) would evict nothing. The real problem was that it held
frame-resolution canvas tiles (`TILE_WIDTH = 4096`, 8 tiles / 15.6 MB at 60 s,
growing linearly) only to draw them downscaled to ~viewport width.

`Waveform.tsx` now renders straight into the visible canvas at display
resolution: `drawColumns` walks the display columns in the changed range and,
for each, takes the **peak RMS** of the analysis frames that map to it (frames
are already retained — no tiles, no scratch `ImageData`). A `RenderMap` snapshot
(`x0`, `dxPerFrame`, `paintedFrames`) decides incremental (more frames at the
right edge, same scale) vs full repaint (scale change — crossing a 30 s overview
boundary, resize, amp/theme change). Retained memory is now **one
viewport-sized canvas, 0.19 MB, fixed** regardless of recording length.

Note: this is a peak-envelope overview, where the old tile path was a
nearest-neighbour downscale (one arbitrary frame per column) — visually similar
but not pixel-identical; the envelope is the more correct overview and avoids
sampling flicker during recording. This is the waveform instance of item 1c's
"render straight into the display buffer" idea.

## 1b. Combine formant + spectrogram into one canvas tile — DONE

**Shipped.** Each chunk kept two parallel tile sets — an opaque spectrogram tile
and a transparent (`alpha: true`) formant tile — composited as two `drawImage`s
per tile per `draw()`. They're now a single opaque tile with formant arcs drawn
on top (`drawFormantArcs`), painted by `paintTile` (background → `putImageData`
colours → arcs). `renderTile` materializes a tile; `repaintTile` refreshes an
already-materialized one in place. `FormantOffscreenState`, `allFormantOffRef`,
`paintFormantTiles`, and `appendFormantTiles` are gone.

Result: formant tiles eliminated — **14.3 MB (25 combined tiles)** does what spec
(14.3 MB) + formant (14.3 MB) did, one blit per tile instead of two, and no more
shadow-over-transparent compositing.

Design note (the cost the original plan flagged): a merged opaque tile can't
`clearRect` just the arcs, so any change to a tile's frames or colours repaints
the **whole** tile (colours re-blitted from `colorTiles`, arcs redrawn). This
replaced the old additive-append / surgical-patch formant paths with one
`repaintTile` over the affected tiles — simpler, and cheap because the colour
re-blit is a `putImageData` and tiles are only 256 frames wide. Append still only
touches the growing edge tile(s). If this ever shows up on a profile during long
live recordings, the escape hatch is to additively draw just the new arcs on a
pure append (the new dots' left-bleeding shadow over older columns is benign),
but whole-tile repaint kept the code far simpler and measured fine.

## 1c. Lower-resolution spectrogram tiles when zoomed out — TODO

The one weak spot left in item 1: eviction floors at the on-screen set
(invariant 4), so a fully-zoomed-out view of a long recording still holds the
whole visible span at full resolution — and re-renders full-res tiles only to
scale them down (wasteful in memory and quality). (The waveform's version of this
is already solved by item 1a; this item is the spectrogram.) Two options:

- **Render straight into the display buffer past a zoom threshold**, bypassing
  tile canvases entirely — the same move item 1a made for the waveform. The
  display buffer is already viewport-sized and bounded, and the incremental
  scroll path (`pixelShift`) already recomputes only the newly revealed strip.
  Avoids LOD cache-key machinery — preferred.
- **True LOD/mipmap tiles**, cache-keyed `(chunkIdx, tileIdx, lod)`.

Either way: downsample the spectrogram from the **underlying `spectrum`/dB
values** (max or mean per pixel column — Praat does per-column reduction), not
by averaging already-colour-mapped RGBA, which looks wrong. Formants probably
want to switch from dots to connected lines when zoomed out so track peaks
don't vanish into the smear. With item 1b done, a zoomed-out tile is one combined
low-res tile (colours + line-mode formants), not two.

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
