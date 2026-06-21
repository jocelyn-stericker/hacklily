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

**Measured — `npm run mem -- --scenario main-import` (60 s WAV, webkit L1).**
The scenario now zooms fully out after import (`afterZoomOut` step) then back in,
so this weak spot is quantified rather than just argued. Fully zoomed out, the
whole track is on-screen and eviction can't floor below it, so every tile
materializes at full resolution:

- spectrogram tiles: 22 (import default zoom) → **120 (fully zoomed out)**
- tile canvas bytes: 12.6 MB → **68.6 MB** — note this exceeds the 48 MB
  `MAX_TILE_CANVAS_BYTES` cap, exactly invariant 4 (the on-screen set survives
  even past the cap).
- Total retained: 52.9 MB → **108.9 MB** (the new peak for this scenario).
- After zooming back in (`afterScroll`/`afterIdle`): the `TileLru` only evicts
  down to its budget, so it parks at the **48 MB cap** (84 tiles) rather than
  returning to the ~12.6 MB on-screen working set — the honest steady state once
  you've zoomed out at least once. `afterClear` still drops to baseline (no
  leak). This is the number this item needs to bring down.

Two options:

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

## 2. Bound VAD / formant worker accumulators — DONE

Four arrays grew unbounded for the duration of a recording, cleared only when
the worker was terminated. The shared insight: each is **append-only** and read
by a **single forward-only pointer** that never revisits a lower index (the
`patch` messages are _outputs_ via `postMessage`; rope-grow/seal only append new
audio, never rewind). So only the small live window between the write head and
that read pointer is ever needed. Three got a fixed-size ring keyed by an
absolute index (`NumberRing`, below); the fourth (`frameHfEnergy`) is no longer
stored at all — it's recomputed on demand from the rope (see its section).

**Shipped — `NumberRing` (`src/lib/NumberRing.ts`).** A fixed-capacity
`Float64Array` ring addressed by absolute index (the count ever pushed),
overwriting older slots in place. Reading an index below the retained window
`[length - capacity, length)` **throws** rather than returning a since-
overwritten value, so an undersized cap fails loudly instead of corrupting data.
Null-valued fields are NaN-encoded (frequencies/timestamps are always finite).
Gated by `NumberRing.test.ts`.

- **`frameFormants`, `pendingFormants`** (`src/lib/workers/FormantWorker.ts`) —
  **DONE.** Replaced the two `interface[]` arrays with `FrameFormantRing` /
  `PendingFormantRing` (thin wrappers over parallel `NumberRing`s, one per
  field). `frameFormants` is consumed by `lastEmittedFrame` in
  `emitPitchPatches`; `pendingFormants` by `formantPtr`. The whole formant loop
  is **synchronous**, so the read pointers inherently trail the write head by a
  bounded amount (`emitPitchPatches` trails by ~`pitchEmitSamples` plus one
  `PITCH_INTERVAL` batch — tens of 2 ms frames; pending frames sit a few ahead of
  the current frame time). Caps are a generous `4096` (~8 s of frames). Also
  eliminates the per-frame `{f1,f2,f3}` / `{timeSec,…}` object garbage that the
  old `.push({…})` allocated. Existing `FormantWorker.test.ts` (11 cases,
  output-structure / persistence / validity / indexing) stays green — the
  behaviour is unchanged.

- **`vadProbs`** (`src/lib/workers/VadWorker.ts`) — **DONE.** Now a
  `NumberRing(2048)` (~66 s of slack at ~31 chunks/s). It's consumed by the
  monotonic `coveringChunk` inside `gateReadyFrames`, which runs in the **same
  microtask** that pushes each probability (inside the `vadChain` `.then`), so
  the read pointer tracks the write head within a chunk or two even during
  offline import (where the reader races ahead of inference, `vadProbs` still
  only grows at inference rate). Existing `VadWorker.test.ts` (15 cases) stays
  green.

- **`frameHfEnergy`** (`src/lib/workers/VadWorker.ts`) — **DONE, recomputed on
  demand (not a ring).** This one resisted the ring approach: unlike the others,
  its **write** (`frameHfEnergy[frameIndex]`) happened synchronously in the read
  loop while its **read** (`nextFrame`) is gated by **async** VAD inference
  (`vadChain`). During offline import the reader blasts through the whole rope, so
  `frameIndex` (and the array) raced to the end while `nextFrame` waited on
  inference — the write head outran the read pointer unboundedly, and a fixed ring
  would have overwritten unconsumed entries. The original plan was to add
  backpressure (throttle the reader to the gate's pace) and then a ring.

  Instead we **stopped storing it**: VadWorker reads from the rope, which retains
  all audio, so the per-frame high-pass onset energy is re-derived lazily on the
  gate's clock by `HfEnergyCursor` — a forward cursor that lags the VAD reader,
  advanced one frame per `energyForFrame(nextFrame)` call, reading committed
  samples behind the reader via the new `AudioRopeReader.readAt`. The one-pole
  300 Hz high-pass is O(1) recursive state and trivially cheap next to the VAD
  resample+inference, and because it's a **continuous pass from sample 0** the
  values are **bit-identical** to the old in-loop computation (verified by
  `HfEnergyCursor.test.ts` against a reference port of the original loop). This is
  the same "rope is the source of truth, derivations are disposable" move as item
  1's source-vs-cache split, applied to a feature stream instead of canvas tiles.

  Why this beats backpressure: **zero** retained buffer (not just a bounded one),
  **no throttle** on the reader (it stays free to run ahead and pipeline VAD
  inference — exactly what helps on slow Silero downloads / weak devices), and
  _less_ code in the hot loop (the per-sample HF block left the VAD read loop
  entirely; the loop now just bulk-counts frames).

  Invariants to preserve: `HfEnergyCursor.energyForFrame` must be called with
  **strictly increasing frame indices, each exactly once** (it throws otherwise —
  the gate consumes `nextFrame` monotonically), and only for frames already
  committed to the rope (`frame < frameIndex`; it throws on a read past committed
  samples). The continuous-from-0 pass is what keeps it exact — don't reset or
  seek the cursor.

Not gated by `npm run mem` (the harness scenarios don't probe these worker
internals); the rings are mechanical bounded-reuse, and the HF cursor is gated by
the bit-identical unit test plus the existing `VadWorker.test.ts` (15 cases) /
`FormantWorker.test.ts` (11 cases) suites — landed on reasoning rather than
aggressive measurement.

## 3. Stop the per-quantum `readBuf.slice()` — DONE

**Shipped.** `AudioRopeReader`'s async iterator now yields its single reused
`readBuf` directly instead of `readBuf.slice()`
(`src/lib/audio/AudioRopeReader.ts`), eliminating the ~22,500 throwaway
`Float32Array(128)`/min/worker across the three workers (spectrogram, formant,
VAD).

No buffer pool was needed: the iterator is strictly ping-pong (it overwrites
`readBuf` only on the next `.next()` call, never pipelining ahead), and all three
consumers read the yielded buffer **synchronously** within the loop body — they
copy into their own stream-processor buffers (`spec.feed`, `resampler.feed`,
`pitchBuf.set`) and never retain, `await`-across, or transfer it. So a single
reused buffer is sufficient and safe. The slice's old justification ("postMessage
would race the next read") no longer holds — no consumer postMessages the raw
quantum.

### Invariant to preserve (don't regress this)

- **Yielded buffer is borrowed, valid only until the next iteration.** Any future
  consumer that retains a quantum across iterations, holds it across an `await`,
  or transfers it via `postMessage` must copy first. The contract is documented
  at the iterator and gated by `AudioRopeReader.memory.test.ts` ("yields a single
  reused buffer" asserts one identity across a full pass; "a copied chunk
  survives the next iteration" asserts the overwrite-in-place + retain-must-copy
  semantics).

## 4. Pool VAD ONNX tensors — DONE

**Shipped.** `VadStreamProcessor` now holds one persistent `_feeds` object
(`src/lib/analysis/VadProcessor.ts`) reused across every inference, instead of
rebuilding `input`/`state` tensors from `this.buf.slice()`/`this.state.slice()`
plus a fresh `sr` `BigInt64Array` per 32 ms chunk. That eliminates two slices, a
BigInt64Array, and three Tensor wrappers per inference (~30/sec for the whole
recording).

The `input`/`state` tensors wrap `this.buf`/`this.state` **by reference** (no
copy): ort copies their current contents into the wasm heap at the start of each
`session.run`, so each run sees fresh data. The state path is read-modify-write —
`this.state.set(out.stateN.data)` overwrites the array the state tensor wraps,
ready for the next run. `sr` is a compile-time constant. This is safe because
runs are **serialized**: each `_run` is `await`ed before `buf` is shifted
(`copyWithin`) or `state` is overwritten, and `VadWorker` further serializes
feeds through `vadChain`, so no two inferences touch the buffers concurrently.

The only per-inference allocations left are ort-internal output tensors
(`out.stateN`, `out.output`), which would need the IO-binding API to pool — not
worth it at this size.

### Invariants to preserve (don't regress these)

1. **Runs stay serialized.** Reuse is only safe because `buf`/`state` are never
   mutated while an inference is in flight. Don't introduce a concurrent or
   un-awaited `_run`.
2. **Feed buffers are borrowed, valid only during a run.** The pooled tensors
   alias `buf`/`state`; nothing may retain a feed's data across runs expecting a
   snapshot. The unit test enforces this by snapshotting `input`/`state` at
   call time (`mockState.recordRun`) — read `inputData`/`stateData`, never
   `feeds.input.data`, for per-call values.

### Not gated in Node

`VadProcessor.memory.test.ts` only covers `SpeechGate` (the ONNX session can't
load in Node), so this change has no Node allocation gate. `VadProcessor.test.ts`
asserts the reuse contract behaviourally (single tensor, snapshot semantics); the
allocation win itself is validated via the Playwright `npm run mem` harness.

## 5. Verify practice-route `analysisRef` clears at take end — CONFIRMED (no leak)

The original worry: `analysisRef` (`src/routes/practice.tsx:110`) might carry one
take's `AnalysisFrame[]` (with their spectrum buffers) into the next take's
analysis, or accumulate across takes.

**Neither happens — the reset-before-append at `practice.tsx:121` is airtight.**

- **Frames only ever enter via `handleAppend`** (`:259`), which runs only during
  recording. Recording is only entered via the lone `START_RECORDING` dispatch
  (`:124`) inside `startPipelineAndRecord`, which runs `analysisRef.current = []`
  immediately before it (`:121`). So every take starts from an empty array
  _before_ any frame is pushed — no cross-take contamination.
- **No accumulation.** `:121` assigns a fresh `[]` (not `.length = 0`), dropping
  the prior take's array wholesale, so each take replaces rather than appends to
  the last.
- **Every take-end path lands back there.** `handleNextTake` → `PENDING_RESTART`
  (`:249`) → the layout effect (`:130-133`) → `startPipelineAndRecord`;
  `handleStartSession` → `startPipelineAndRecord`; `CLEAR_SESSION` also clears
  explicitly (`:436`). The take's stored `span` references `rope`, not the
  frames, so nothing downstream retains them.

**Bounded residual, accepted.** After `handleEndSession` the session goes idle
without an immediate re-record, so the _last_ take's frames linger until the next
session start or `CLEAR_SESSION`. That's one take's worth, never growing — exactly
the "`computeVoicedRange` needs it at take end" case the item anticipated. An
early-release `analysisRef.current = []` after the `computeVoicedRange` calls in
`handleNextTake`/`handleEndSession` would shave it, but it's optional polish, not
a leak. Left as is.

## 6. Release spare SABs earlier for non-realtime consumers — REJECTED (no saving)

The original idea: `AudioRope` keeps one spare segment ahead for producer lead
time (`src/lib/audio/AudioRope.ts:148-154`), and the formant/VAD workers are
throughput-bound, so add an `AudioRope.openShare({ lookahead: 0 })` mode to free
~256 KB per such consumer.

**There is no ~256 KB-per-consumer saving — the premise was wrong.** Segment
memory is shared by reference, not duplicated per consumer:

- **The spare is a single SAB referenced everywhere.** Segments are only ever
  allocated by the _producer_ — the two `new SharedArrayBuffer` sites are the
  constructor and `append`'s "always have one free buffer" loop (`:148-154`).
  Consumers never allocate; they receive the producer's SAB _objects_ via
  `grow()` (`:247-250`) or the `shareRope()` snapshot (`:282-289`). `shareRope`
  does `this.#buffers.slice()`, which copies the _array_ but shares the same
  `SharedArrayBuffer` instances (same backing memory).
- **The producer holds the spare for the whole recording anyway.** Append is
  strictly ahead of every consumer, so the producer's buffer set is a superset
  of each consumer's, and the consumer's spare _is_ the producer's spare. That
  256 KB lives as long as the producer is recording, regardless of consumers.
- **A consumer's per-spare cost is a view, not 256 KB.** It holds one array slot
  plus one `Float32Array` over the SAB (`#buffersView`) — a wrapper of tens of
  bytes, not a copy of the buffer. A `lookahead: 0` consumer would free
  essentially nothing.
- **The seal handshake corroborates this.** `seal()` trims the producer's spare
  (`:196-199`) and each consumer runs its own `seal()` to drop its reference,
  precisely because the spare is _one_ shared region collected only once the
  producer and every consumer let go. Per-consumer 256 KB wouldn't need that
  coordinated drop.

Not worth an `openShare` mode that saves a view object. Closed.

## 7. VowelChart `framesUpToCursor` allocation per redraw — DONE

**Shipped.** The old `framesUpToCursor` built a fresh `AnalysisFrame[]` of
**every** frame up to the cursor on each redraw (append/patch/cursor-move during
recording — tens/sec), then `drawVowelChart` filtered that to voiced frames and
sliced the last `TRAIL_LEN` (80). But the trail is all we ever draw, so the full
array was pure waste that grew with the take.

`voicedTrailUpToCursor` (`src/components/VowelChart.tsx`) now:

- **Walks backwards from the cursor** and stops once it has `TRAIL_LEN` voiced
  frames, instead of scanning the whole recording. The common live-recording
  case (cursor at the end) touches only the last ~80 voiced frames; even when
  scrubbed it starts at the cursor chunk, not the beginning.
- **Locates the cursor chunk via `chunk.startTimeSec`** (the authoritative
  per-chunk start time, accumulated the same way the old loop did its `elapsed`)
  — a single pass over _chunks_, not frames — then computes the in-chunk frame
  index arithmetically.
- **Reuses one module-level `trailOut` array** (`.length = 0` then push),
  bounded by `TRAIL_LEN`. Retained allocation is now fixed regardless of take
  length; `drawVowelChart` takes the pre-filtered `VoicedAnalysisFrame[]`
  directly (its internal `filter` + `slice` are gone).

Also moved the voiced-frame type guard `isVoiced` next to its type
(`VoicedAnalysisFrame`) in `src/lib/analysis/AnalysisFrame.ts` and exported it.
A survey of the other sites that test its constituent fields found **no other
clean caller** — each wants a deliberately different subset and `isVoiced` would
change behavior, so it stays a one-caller co-location, not a dedup:
`index.tsx:684` (hover readout keeps showing f0 with formants absent — no f1/f2
gate), `alignJob.ts:230` (voicing comes from phoneme alignment, not VAD — no
`speechDetected` gate), `Spectrogram.tsx:265` (per-track f1/f2/**f3**, not
hardcoded f1∧f2).

### Notes / invariants

- **Not gated by `npm run mem`.** The harness scenarios don't exercise the vowel
  chart, so this won't show in the probe numbers. The change is mechanical
  (bounded reuse + early-out) and was landed on `npm run check` + reasoning
  rather than aggressive measurement.
- **`trailOut` is borrowed.** It's returned and reused, so the caller must
  consume it synchronously before the next redraw (`drawVowelChart` does). Any
  future consumer that stashes the trail across calls or hands it to async code
  must copy first.
- **Boundary off-by-one is acceptable.** The cursor frame index now comes from
  per-chunk duration arithmetic rather than per-frame summation, so float
  rounding at a chunk boundary can shift it by at most one frame — visually
  negligible for an 80-frame trail.

### Possible future direction

If the vowel chart ever needs the full frame history again (not just the trail)
on a hot path, don't revert to materializing it — index into the chunk arrays
directly, or add a `window.__braatMem`-probed vowel-chart scenario so `npm run
mem` actually covers this path before re-touching it.

## 8. Single resident heavy ML worker + deferred alignment — DONE

**Shipped.** Transcription (Moonshine, `q8` — ~120 MB of weights, ~284 MB
resident during inference) and forced alignment (CUPE ONNX, ~120 MB) are both
large models that, left alone, could sit **resident at the same time**: the old
scheduler interleaved transcribe and align per chunk
(`priorityPickNext(['align', 'transcribe'])`), keeping both hot, so peak heavy
memory was ~`transcribe + align` on top of recording buffers. That sum is what
pushed 4 GB iPhones into OOM kills. We can't tune for the device —
`navigator.deviceMemory` doesn't exist on iOS Safari — so the safe behaviour had
to become the **default**.

What changed:

- **`src/lib/jobs/heavyWorkerArbiter.ts` (new)** — a small, dependency-light
  coordinator (imports only `#/lib/settings`, so the worker modules can import it
  without a cycle). Each heavy worker registers a teardown
  (`registerHeavyWorker(kind, teardown, onIdleTimeoutChange?)`); calling
  `acquireHeavy(kind)` tears down every _other_ registered kind first, then
  records `kind` as resident. **Single-residency is a safety invariant, not a
  tunable** — the only knob is how long an idle worker lingers.
- **Deferred alignment.** Alignment feeds brightness/resonance colouring — a
  secondary analytical overlay, not real-time feedback (spectrogram/formants run
  in the worklet, off this budget) — so it's deferred to a **post-recording
  batch**: `alignJob`'s `needsWork` returns `false` while `isRecording()`
  (`src/lib/jobs/alignJob.ts`, fed an `isRecording` ref from
  `useChunkWorkQueue.ts`). This removes the only scenario where transcribe and
  align would interleave (and thrash) in real time.
- **Batch ordering** is now `priorityPickNext(['transcribe', 'align'])`
  (`useChunkWorkQueue.ts`): a pass finishes all transcription before any
  alignment, so the lifecycle is transcribe-all → hand off → align-all. The
  handoff is immediate via `acquireHeavy`, not idle-driven, so the short cold
  timeout below never causes batch thrash.
- **Idle-unload window, gated on `runHeavyWhileRecording`.** `heavyIdleTeardownMs()`
  returns `COLD_IDLE_MS = 10_000` by default and `WARM_IDLE_MS = 60_000` when the
  flag is on (a "less memory-sensitive" signal). Both worker modules share it.
  The arbiter subscribes to settings once and re-arms an already-idle worker's
  timer on change (the `onIdleTimeoutChange` callback), so turning the flag
  **off** reclaims a warm worker in ~10 s instead of waiting out the 60 s timer it
  was armed under. `runHeavyWhileRecording` now means exactly one honest thing:
  _may transcription run live while recording_ (one model); alignment is deferred
  to after recording either way.

**Measured — `npm run mem -- --layer2 --scenario stt-alignment` (imports
`butterfly.wav`, measures each model as sole resident):**

- Peak: **423.8 MB → 309.8 MB** (peak is now ~`max(transcribe, align)`, not the
  sum).
- baseline 20.9 MB (model-free) · transcribing 305.0 MB · aligning 142.4 MB ·
  afterClear 24.2 MB (model-free).
- Worker telemetry confirms single-residency: only one of `transcribeWorkers` /
  `alignWorkerLive` is ever nonzero.

### Invariants to preserve (don't regress these)

1. **Acquire before build/use.** Both workers call `acquireHeavy(kind)` _before_
   constructing or messaging their worker, so the other kind is freed first. The
   two never sit resident together except for the unavoidable instant between
   `terminate()` and construct.
2. **Single-residency is not flag-gated.** `runHeavyWhileRecording` only widens
   the idle window; it must never let two kinds coexist.
3. **Alignment stays post-recording.** `needsWork` returning `false` while
   recording is what keeps align off the live budget — don't reintroduce a
   live-align path.
4. **`WorkerTerminatedError` degrades to a retry.** Arbiter-driven termination of
   a (rare) in-flight job is handled as "abort, leave for retry" in both
   `transcribeJob.ts` and `alignJob.ts`. Keep that.

### Tried and rejected: disabling the ORT wasm memory arena

Setting `enableCpuMemArena: false` + `enableMemPattern: false` on both sessions
(via `createCupeSession`'s options for align, `session_options` in the Moonshine
`MODEL_CONFIG` for transformers.js) produced **no measurable change** (peak 309.8
MB before and after; transcribing 304.9 vs 305.0 MB — noise). The arena footprint
scales with activation tensor size, and Braat's chunks are split at voicing
boundaries and capped at align's `durationMax: 10` s — so activations are small
next to ~120 MB of weights, and there's effectively nothing to reclaim. Reverted:
no benefit, and the flags carry a small inference-latency cost.

## 9. Optimized (pre-fused) ORT model / minimal ORT build — TODO (assessment)

Honest framing, since this is the next heavy-worker lever after the lower-hanging
fruit above. **Important caveat: every agentMemory number we have is sampled at
_settle_ time** (after the job finishes, after `forceGc`). Graph optimization and
session setup are **transient**, during model load — gone before we measure. So
we currently have **no number** for setup cost, and the load-time peak is exactly
the OOM-relevant moment on iOS. To turn this from speculation into a number, the
prerequisite is sampling the wasm heap high-water mark
(`WebAssembly.Memory.buffer.byteLength`, which only grows) around session
creation. Not yet done.

Prior on where setup memory goes, largest first:

1. **Double-resident weights at session creation.** `InferenceSession.create(bytes)`
   copies weights into the ORT wasm heap while the source `ArrayBuffer` is still
   alive — a transient ~2× window (~+120 MB). For the align path the source
   buffer is unreferenced after the `.then` and GCs; for **Moonshine via
   transformers.js this is unverified**. Likely bigger than the optimizer passes.
2. **Graph optimization scratch.** `graphOptimizationLevel: 'all'` holds original
   - optimized graph transiently and may dequantize folded constants. Real, but
     second-order.

The two levers, and the honest read on each (**transformers.js is retained in
both** — it's convenient and its own overhead is single-digit MB):

- **Pre-optimized ORT model (the chosen next step).** Run ORT's offline
  optimization once, ship the already-fused graph, and load it with
  `graphOptimizationLevel: 'disabled'` so the runtime skips optimization at load.
  transformers.js still does the loading — you just point it at the pre-optimized
  `.onnx` in the model repo/cache. Removes the load-time optimization passes (and
  CPU). Fully in our control for the **align model** (we own that ONNX); harder to
  inject cleanly for Moonshine. Best effort/payoff _if_ setup proves costly —
  which is unmeasured.
- **Minimal/custom ORT build.** Strips unused operators to shrink the `ort-web`
  **wasm code** footprint (~10–15 MB), _not_ the weights. We already override
  `env.backends.onnx.wasm.wasmPaths`, so a custom build slots in under
  transformers.js unchanged. Modest win, real build/maintenance cost — lower value
  than the pre-optimized model, deferred.

Bottom line: most of the setup cost is probably the double-weights window, not the
optimizer — so freeing the source buffer / shipping a pre-optimized align model
likely captures most of it, and a custom ORT build wouldn't move the dominant
number. Measure the load peak before investing.

## 10. Session memory budget (track/session limit) — TODO (placeholder)

Brief stub so the numbering tracks the design discussion; full write-up deferred.
Cap the linearly-growing PCM + analysis state by a **memory budget** (not a
minutes constant): auto-finalize/seal the session when the projected retained
bytes cross a threshold. The budget — not minutes — is the stored knob, so it
self-adjusts as items 11/12 land rather than needing a magic constant rewritten.

Sizing target is the 4 GB iPhone (no `navigator.deviceMemory` on iOS Safari, so
we can't tune per device — the safe default must clear the worst target). Working
back from a conservative ~1.0 GB tab ceiling, after reserving the heavy-model
peak (~300 MB, item 8), tiles + canvas/GPU (~120–150 MB), app baseline (~80–100
MB), and WebKit/fragmentation headroom (~150 MB), that leaves **~300 MB** for the
growing state. At today's ~45 MB/min (below) that's **~6–7 min**; with item 11 it
becomes ~20–60 min. This is reasoning, not measurement — these jetsam numbers are
fuzzy and unreadable from JS on Safari; calibrate against the device (watch for
the "reloaded because it used significant memory" event) once the `__braatMem`
high-water probe exists.

This is the **floor** that makes OOM impossible by construction. It stays
complementary to items 11/12: compression/backing multiply the minutes the budget
buys, and persistence (item 12) covers the backgrounding kills the budget can't.

## 11. Compress retained audio + analysis — TODO

After items 1–8 the retained state that's still O(recording length) is three
terms (default config — `timeStepSec 0.002` → ~500 frames/s; `maxFrequencyHz
5500` / `freqStepHz 20` → ~275 bins; mono f32). These are **estimates from the
config, not measured** like the DONE items above:

- **Analysis spectra** (`AnalysisFrame.spectrum`, ~275 f32/frame): **~33 MB/min** —
  the dominant term. Derived (not source of truth).
- **AnalysisFrame object overhead** (~10 fields × 500/s): ~4 MB/min. Derived.
- **PCM** (`AudioRope` SABs): **~10.6 MB/min**. The only true source of truth.

So ~45 MB/min of permanently-resident data. Two sub-levers; the realtime line
matters less here than for item 12 because, with native int16 (below), PCM has
one format everywhere — the live tail is int16 too, not a hot-f32 / cold-int16
split.

### PCM → store int16 as the rope's native format

Make `AudioRope` natively int16 (producer converts on write, consumers convert on
read), not a separate cold-only compression. Near-free at runtime and it removes a
whole category of complexity.

Why it barely costs anything:

- **Quality.** int16 is a ~96 dB noise floor; phone mics deliver ~60–70 dB
  effective SNR, so the quantization noise sits below the mic's own floor and below
  the measurement floor for spectrogram/formant/pitch/VAD. Praat analyzes 16-bit
  WAV routinely.
- **Conversion is already paid.** The producer (worklet) does f32→int16 on a
  128-sample quantum — trivial, on the only realtime-critical thread. Every
  consumer already **copies** the rope into its own f32 DSP buffer at the read
  boundary (item 3's `AudioRopeReader`), so int16→f32 folds into a copy that
  already happens. The one real change: `AudioRope.read` becomes a per-element
  convert loop instead of a bulk `view.set(subarray)` memcpy.

Wins beyond the 2×:

- **Banks the PCM 2× immediately, without building offload or any hot/cold format
  split** — it's just the rope's format.
- **One PCM format everywhere.** A future OPFS tier (item 12) becomes a raw byte
  append (already int16, no transcode); 16-bit WAV export is free.

Costs / caveats to design around:

- **Fixed full-scale**: ±1.0 → ±32767, and **clamp on write** (getUserMedia f32
  can nominally exceed [-1, 1]).
- **Quiet input + later normalization**: quantizing at input and then boosting a
  very quiet recording via the LUFS path ([[project_loudness_normalization]])
  amplifies the quantization floor — below the mic floor in practice, but note it.
- **Blast radius, not runtime.** This touches `AudioRope` / the SabRope
  publish/grow/seal handshake ([[project_sabrope]]) — the most concurrency-
  sensitive component. Gate hard with the existing `*.memory.test.ts` and SabRope
  invariants; the risk is destabilizing that code, not the per-element convert.

### Spectra → quantize OR recompute (pick one, not both)

- **Quantize** f32 → int8/int16: dB has bounded dynamic range (~50–60 dB), and
  int8 at ~0.25 dB steps is plenty for a colormapped display + hover readout. 4× /
  2×, easy, store-and-keep. Lowest-risk way to crush the biggest term (33 → ~8
  MB/min).
- **Recompute from PCM on demand** (the item 1c / item 2 `frameHfEnergy` move —
  "rope is the source, derivations are disposable"): drops the spectra term
  to **zero** (and the frame-object overhead with it). Strictly better than
  quantizing **if built**, so don't do both — quantize is the cheap version of the
  same goal.

### Lossy codec — playback copy only, never the analysis source

Opus/AAC (~50×) only for a **separate playback/preview copy**. Re-running
spectrogram/formant on lossy-decoded audio injects artifacts into the exact bands
we measure. `MediaRecorder` produces Opus ~free from hardware, but it does **not**
replace the int16 master (export quality, scrub precision). Keep int16 PCM as the
master.

### Projected end-state

int16 PCM + recompute/quantize spectra → cold cost ~**5–13 MB/min** (from ~45) — a
4–9× multiplier on the item 10 budget, enough that the limit stops being a real
constraint for normal use. Unlike the worker-internal items, this changes
**retained bytes**, so `npm run mem` will actually show the reduction — gate it
there.

## 12. Durable audio backing (OPFS) — recovery first, offload second — TODO

Persistence and offload share the **same write path**, but recovery is the
stronger motivation. Writing committed audio to OPFS just to lower resident memory
(offload) is a big architectural lift that only pays past the item 10 budget.
Writing it so a **backgrounding kill, jetsam, or reload doesn't vaporize the
session** pays from the first take — and on iOS Safari (aggressive backgrounded-
tab eviction) that's a common, real UX failure today, independent of memory
pressure. So lead with recovery; offload is the bonus layered on top.

### Structure: write-through, then evict

A worker drains **sealed** rope segments to OPFS as they finalize, in two stages:

1. **Write-through, keep in memory** = persistence / recovery. No memory saving
   yet, low risk, and it's the half that delivers the durability value.
2. **Drop persisted segments from memory** = offload (the memory win), layered on
   once write-through is solid.

The **live tail can't be backed** — it's in the SAB (worklet writes it); only
sealed/committed data flushes. Flush happens off the audio thread. Same hot/cold
line as items 1 and 11.

### OPFS vs IndexedDB

- **OPFS** (Origin Private File System): worker sync access handles, large quota,
  fast streaming append — for the **bulk int16 PCM blocks**. Native int16 (item
  11) makes this a raw byte append, no transcode.
- **IndexedDB**: transactional/structured — for the **session index / metadata**
  and an optional **quantized-analysis cache** (see below). Slower for large binary
  streaming; iOS Safari has had IDB reliability quirks, so keep bulk audio in OPFS.

### Honesty caveats (don't oversell "recovery")

- **Best-effort storage.** Both OPFS and IDB are evictable under storage pressure;
  `navigator.storage.persist()` is **often not granted on iOS Safari**, and Safari
  evicts unused storage after ~7 days. Scope the claim to "recover from the common
  kills — backgrounding, jetsam, reload," **not** "durable archive."
- **Recovery speed vs. storage.** If analysis is recomputed-from-PCM (item 11),
  a reload must re-derive it — slow for a long session. Persisting the **quantized
  analysis cache** trades storage for fast resume; that's the explicit tradeoff to
  decide when building this.

### Interaction with item 10

Recovery is the safety net for the kills the budget **can't** prevent (a user
switching apps mid-session); the budget still bounds everything else. Complementary
— don't rely on recovering a 1-hour-session reload as a normal flow.

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
- Transcription worker pool + align worker — now governed by the single-resident
  arbiter (item 8): pooled per model, cold/warm idle teardown via
  `heavyIdleTeardownMs()`, and never resident alongside the other heavy kind. See
  item 8 for the invariants.
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
