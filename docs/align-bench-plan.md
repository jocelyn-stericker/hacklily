# Alignment boundary benchmark + decoder improvements

## Goal

Two deliverables, in dependency order:

1. **A boundary benchmark** for the forced aligner (`src/lib/alignment/`):
   repeatable, paired, phone-class-aware measurement of alignment accuracy on a
   fixed local corpus, runnable from the CLI.
2. **A set of gated decoder changes** (silence handling, band removal, CTC
   topology, stitch geometry, edge-frame fix), each behind an `AlignerConfig`
   flag with parity-preserving defaults, evaluated as an ablation on that
   benchmark before any default flips.

Out of scope: swapping the int8 model for fp16/fp32 in production (the size
tradeoff is deliberate; the benchmark uses the deployed q8 model, with fp32 as
an optional headroom probe — both are already cached in `test-assets/`).
Retraining CUPE is also out of scope.

## Why forced-alignment evaluation is hand-wavey, and what that implies

Published FA numbers are soft for structural reasons, not sloppiness:

- **Boundaries are conventions.** Where a stop "starts" (closure vs. burst),
  where /l/ ends and a vowel begins — these are labeling conventions, and
  corpora/aligners disagree systematically. Sonorant–sonorant boundaries are
  genuinely gradient.
- **Ground truth is noisy.** Human inter-annotator agreement is ~5–10 ms for
  clear obstruent–vowel edges and considerably worse for sonorant clusters. An
  aligner can't be meaningfully scored below that floor.
- **Numbers don't transfer.** Accuracy@20 ms on TIMIT read speech says little
  about a VAD-chunked browser recording with 500 ms of pre-roll.

Design implications, baked into everything below:

1. **Relative, paired comparisons on a fixed corpus** are the product — not
   absolute numbers. Every variant runs on the same utterances; we compare
   per-utterance deltas.
2. **Tolerance ladders, not single numbers** (accuracy@{10,20,50,100} ms), so a
   change that fixes catastrophes is distinguishable from one that sharpens
   already-good boundaries.
3. **Per-phone-class breakdown**, so wins on well-defined boundaries aren't
   drowned out by noise on gradient ones.
4. **Separate bias from spread.** Reference labels (especially MFA silver ones)
   carry systematic convention offsets. Report median _signed_ onset error
   (bias) separately from |Δ| percentiles (spread). A decoder change that
   reduces spread is a win even when bias stays.
5. **Score the downstream task too.** Braat consumes alignments as per-frame
   phone labels (brightness). Frame-level labeling accuracy integrates boundary
   errors by how much they actually matter and is insensitive to
   boundary-convention disputes.

## Metrics

Computed per utterance, then aggregated across utterances (median of
per-utterance values, plus pooled-boundary versions for the tolerance ladder):

- **Onset error** per matched phone: `Δ = predictedOnsetMs − referenceOnsetMs`.
  Report median signed Δ (bias), median |Δ|, P90 |Δ|.
- **Accuracy@τ** for τ ∈ {10, 20, 50, 100} ms: fraction of matched onsets with
  |Δ| ≤ τ. (Offsets are implied by the next onset; scoring onsets only avoids
  double-counting.)
- **Frame labeling accuracy**: at a 10 ms grid, fraction of frames inside the
  reference's speech region whose predicted phone (by class, and exactly)
  matches the reference phone. This is the brightness-relevant number.
- **Catastrophic rate**: fraction of utterances with per-utterance median |Δ| >
  100 ms (alignment derailed, not jittery). Report separately — and note that
  accuracy@τ already counts these as misses, so the ladder stays honest.
- All of the above **per phone class** (vowels, stops, fricatives, nasals,
  liquids/glides) and overall.

Statistical protocol: variants are compared **paired** on identical utterances.
Report per-utterance win/loss counts and a Wilcoxon signed-rank test on
per-utterance median |Δ| (n ≈ 40–60 utterances is enough for the effect sizes
we care about). No unpaired comparisons, ever.

## Ground truth: three tiers

### Tier B — MFA silver labels (the workhorse)

Run Montreal Forced Aligner (prior art: the acousticgender.space pipeline)
over the corpus to produce TextGrids. MFA boundaries are themselves off by
~10–25 ms with their own conventions — acceptable for _paired, relative_
comparisons, which is what the benchmark is for.

Corpus recipe (~40–60 utterances, ~1.5–2k scoreable boundaries):

- **15–25 real recordings** of the actual use case: braat users (start with
  your own takes) reading practice-passage sentences through the real mic
  path. This is the primary set.
- **20–30 Kokoro reference clips** (`media/references/`, via
  `npm run media:fetch`), spread across femme/masc/enby voices for speaker
  variety. Synthetic but natural-sounding, text known exactly.
- **Deployment realism matters**: bench clips must include leading/trailing
  silence comparable to production VAD chunks (~0.3–0.5 s pre-roll, post-roll
  tail). The silence changes below are the headline experiment; a
  speech-trimmed benchmark would be blind to them.

### Tier C — hand-corrected gold anchor (small, one-time)

Import MFA's TextGrids into Praat and hand-correct **10–15 utterances**
(~300–400 boundaries; a few minutes per sentence — correct boundaries, don't
re-segment). Two uses:

1. Measure MFA-vs-hand error on this subset once, so the silver tier's own
   noise floor is a known number rather than a vibe.
2. A gold subset for close reading when two variants disagree.

### Tier A (optional) — consensus silver

If single-aligner bias becomes a concern: run a second independent aligner
(e.g. torchaudio's MMS/CTC forced aligner) and score only boundaries where the
two references agree within 20 ms, treating the mean as reference. Cheap
insurance against "we tuned toward MFA's conventions"; skip until needed.

An exact-truth synthetic tier (espeak-ng `--pho` → MBROLA renders audio from
explicit per-phoneme durations) is possible but the speech is robotic enough
that CUPE's behavior on it may not transfer; noted for completeness, not
recommended as a primary tier.

## Harness design

New tool: `tools/align-bench/` (npm script `bench:align` → `tsx
tools/align-bench/bench.ts`, following the `media:fetch` pattern). It runs the
**real production code path** in Node the way `bfa-e2e.test.ts` does:
`createCupeSession(test-assets/cupe_2i_q8.onnx)` → `PhonemeTimestampAligner`
with a config variant → phonemize the utterance text via the same espeak
wrapper the worker uses.

```
tools/align-bench/
  bench.ts          # CLI: --corpus <dir> --presets a,b,c --model q8|fp32
  corpus.ts         # manifest loading, TextGrid → reference JSON
  match.ts          # ref↔pred phone-sequence matching (NW over classes)
  metrics.ts        # Δ stats, tolerance ladder, frame accuracy, Wilcoxon
  presets.ts        # named AlignerConfig variants (the ablation matrix)
```

- **Corpus layout**: `test-assets/bench/<utt-id>/{audio.wav, ref.json}`
  (gitignored except `ref.json` files and the manifest, which are small and
  should be checked in — they're the reproducibility anchor; audio is fetched
  or copied locally by a `bench:fetch`-style script or by hand). `ref.json`:
  `{ text, source: 'mfa' | 'hand', phones: [{ label, startMs, endMs }] }`.
  Convert TextGrids with a tiny parser in `corpus.ts` (the format is simple) or
  a one-off Praat export script — either is fine.
- **Phone matching** (`match.ts`): reference labels are MFA ARPA phones;
  predictions are ph66. Map both to a shared coarse class set (vowel / stop /
  fricative / affricate / nasal / liquid-glide / silence; ph66 side can derive
  from `phonemeGroupsMapper`, ARPA side is a ~40-line table). Then
  Needleman–Wunsch the two class sequences globally and score onset Δ only at
  matched pairs. This absorbs pronunciation-variant mismatches (espeak vs. MFA
  dictionary: flapping, syllabic consonants, schwa insertion) instead of
  letting them poison boundary stats; report the match rate itself — a variant
  that changes it is suspicious. (Once the partial-align plan's
  `smithWaterman.ts` lands, its DP core can be reused with NW
  initialization; until then a 60-line standalone NW in `match.ts` is fine.)
- **Output**: a markdown table to stdout (rows = presets, columns = metrics)
  plus a JSON dump per run under `test-assets/bench/results/` for archaeology.
  Paired stats (win/loss, Wilcoxon p) are computed against the `baseline`
  preset.
- The q8 model is the default (it's what ships); `--model fp32` exists purely
  to quantify quantization headroom, not as a candidate.

## The decoder changes (the ablation matrix)

Every change is a new `AlignerConfig` field (`src/lib/alignment/types.ts`)
whose **default preserves today's behavior exactly** — `bfa-e2e.test.ts` is
the port-parity harness and must stay green with defaults, untouched. Presets
in `presets.ts` turn them on individually and in combination.

### 1a. `blankEmission: 'noise' | 'noiseOrSil'` (default `'noise'`)

The CTC blank is the _noise_ class (66), but during clean silence the model
puts its mass on _SIL_ (0) — so the blank states that must absorb VAD
pre-roll, post-roll, and hesitation pauses are mispriced, and the Viterbi
prefers smearing edge phonemes into silence over paying for blanks. With
`'noiseOrSil'`, blank-state emission becomes
`max(logProbs[t][noise], logProbs[t][SIL])`. Implementation: thread the option
and `silenceClass` into `viterbiDecode` (`decoder.ts:247` is the emission
read); cheapest is precomputing a per-frame effective-blank column once.
`assortFrames` is unaffected (silence frames decode as blank and are dropped
by `ignoreNoise` exactly as today).

### 1b. `wrapTargetSil: boolean` (default `false`) — worker-level

Independently: prepend/append SIL (ph66 0) to the target sequence in
`AlignWorker` when not already present, so edge silence is _explicitly_
modeled rather than absorbed. Filter the two synthetic edge-SIL stamps back
out of the returned `PhonemeTimestamp[]` (track their target indices). Costs
one forced frame when there's no actual edge silence — harmless. 1a and 1b
overlap in purpose; the ablation decides whether either, both, or 1a alone is
the keeper.

### 2. `viterbiBand: 'auto' | 'off'` (default `'auto'`)

The diagonal band (`decoder.ts:437`, `bandWidth = max(ctcLen/4, 20)` when
`ctcLen > 60`) is a C++ speed hack; any long mid-take pause pushes the true
path off-diagonal into NEG_INF territory. At our sizes (≤600 frames × ≤500
states) the full DP is trivial in TS — `'off'` skips banding entirely. The
butterfly golden has `ctcLen = 29`, so this flag can't affect `bfa-e2e` either
way; it exists purely so the ablation can attribute wins.

### 3. `ctcStride: 'auto' | 2` (default `'auto'` = the 4/3/2 heuristic)

`decodeAlignmentsSimple` (`decoder.ts:422`) builds a sparse path with stride 4
— three blanks between consecutive phonemes — and `canSkip` forbids
blank→blank skips, so **every** phone transition is forced to spend ≥1 frame
emitting blank. Connected speech has no acoustic blank between coarticulated
phones; this shaves frames off phones and biases interior boundaries (and
compounds with the mispricing that 1a fixes). `ctcStride: 2` is the textbook
2S+1 topology where inter-phone blanks are optional (skip allowed because
adjacent labels differ).

### 4. `strideMs: 60` (config already exists; bench it)

Windows advance 80 ms in audio but are pasted `framesPerWindow/2` frames
apart, and the model emits `framesPerWindow` frames per 120 ms window. If
`framesPerWindow` is 10 (verify from the ONNX output dims at runtime before
trusting this), intra-window frame spacing is 12 ms, so the two windows being
cross-faded at any stitched frame describe audio ~20 ms apart — boundary blur
baked into the stitch. `strideMs: 60` makes the paste offset (5 × 12 ms) equal
the audio advance, so overlapped frames coincide exactly — and the output
frame rate improves from ~16.8 ms to 12 ms as a bonus. Cost: ~33% more
inference per clip. No code change; pass the config in the preset (and in
`AlignWorker` if it wins).

### 5. `stitchEdgeWeightFloor: number` (default `0`)

The cosine stitch weight is ~0 at window edges, so the first and last stitched
frames are dominated by the `1e-8` epsilon (`decoder.ts:132`) and collapse
toward a uniform posterior — noise precisely at the utterance edges. A small
floor (try `0.05`) on the weights fixes it; default 0 preserves parity.

### 6. espeak tokenization parity (investigation, no flag)

Upstream's ph66 targets come from Python `phonemizer` with
`Separator(phone='|')`; ours from the espeak wrapper's `sep: '|'`. One-off
check: run both on ~50 words sampled from the passages (including affricates,
diphthongs, r-colored vowels, contractions), compare ph66 sequences, document
divergences in this file. If sequences differ, the fix belongs in the espeak
wrapper or a small post-map — no decoder change will compensate for wrong
targets.

## Workflow

1. **Land the flags** (1a, 1b, 2, 3, 5) with parity defaults. Gate:
   `npm run check`, `npm run test`, and `npm run e2e` (`bfa-e2e` golden
   unchanged). Unit-test each flag's mechanics with synthetic posteriors
   (e.g. 1a: a silence-heavy grid where `'noise'` misplaces the first phone
   and `'noiseOrSil'` doesn't).
2. **Build the harness + corpus** (Tier B first). Run the espeak parity check
   (item 6) before trusting any numbers.
3. **Hand-correct the Tier C anchor**; record MFA-vs-hand median |Δ| here as
   the silver noise floor.
4. **Run the ablation**: `baseline`, each flag alone, then a `candidate`
   preset of the winners. Paste the results table into this doc.
5. **Flip defaults** for clear winners — but keep `bfa-e2e` pinned to the
   parity config (it validates the port, not the product). Add one new
   e2e-tagged test asserting the `candidate` preset's output on the butterfly
   clip (golden captured from the winning run) so production behavior is
   regression-locked separately from parity.
6. Re-run the benchmark whenever the aligner changes; append result tables
   here rather than replacing them, so history is visible.

## Results log

_(append benchmark tables here; include date, corpus size, model, preset
definitions)_
