# Partial alignment of practice takes

## Goal

For the **practice route**, a take is a recording of _some contiguous chunk_ of a
known practice text — we don't know which part. Given:

- the practice text in **English** (orthographic), and
- its **IPA** (espeak-ng), and
- the recorded audio,

produce **both**:

1. the **English transcription** of the chunk that was actually spoken (the matched
   substring of the practice text), and
2. the **IPA / phoneme-level alignment** (timestamps) over that chunk.

This replaces the current two-job pipeline (transcribe → align) for practice takes
with **one job** that does localization + alignment together, using the practice
text as the source of truth instead of an ASR hypothesis.

Out of scope: free-practice / blank passages (`kind: 'blank'` in
`src/lib/passages.ts`) — those have no reference text, so they keep the existing
transcribe-then-align path.

## Why this is different from what we have

The current alignment path (`src/lib/jobs/alignJob.ts` → `src/lib/workers/AlignWorker.ts`)
does **full forced alignment**: it takes an ASR transcript for the chunk, espeak's
it to IPA, phonemizes to ph66, and forces a Viterbi path through the _entire_
phoneme sequence (`PhonemeTimestampAligner.align`). That assumes the transcript and
the audio cover exactly the same span.

For a practice take the reference is the _whole passage_ (hundreds of phonemes) but
the audio is a short contiguous slice. Forcing the whole reference into the clip is
wrong. We need to first **find the matched region** in the reference, then align
only that region.

We settled on **Option B** (see the discussion that produced this doc):

> Greedy-decode the acoustic model's per-frame phoneme posteriors into a noisy
> phoneme string, locate it inside the reference phoneme sequence with a
> **Smith–Waterman local alignment**, then run the existing, parity-tested forced
> aligner on just the located sub-sequence.

Option B keeps the carefully ported, e2e-verified decoder
(`src/lib/alignment/decoder.ts`, `bfa-e2e.test.ts`) untouched on the refinement
path, gives us a natural **match score to gate on** (reject takes that aren't in the
text), and degrades gracefully when the model mis-hears a phoneme.

## Background: the relevant existing pieces

- `src/lib/alignment/aligner.ts` — `PhonemeTimestampAligner`. Internally computes
  stitched CUPE log-probs (`cupePrediction` → `logSoftmaxFrames`), then
  `decodeAlignmentsSimple` (forced CTC Viterbi) + post-processing. The log-probs are
  **not currently exposed**; we'll need to expose them.
- `src/lib/alignment/decoder.ts` — `viterbiDecode` is a _forced_ decoder: it seeds
  `dp[0]` only at states 0/1, bands around the full-sequence diagonal
  (`pace = (ctcLen-1)/(T-1)`), and the stride heuristic assumes `S ≈ T`. None of
  this suits a short clip vs. a long reference — which is exactly why we localize
  first and only ever forced-decode the _sub-sequence_.
- `src/lib/alignment/phonemizer.ts` — `phonemizeTranscript(ipa)` →
  `PhonemizedTranscript { ph66, pg16, mipa, eipa, wordNum, words }`. `pg16` is the
  16-way phoneme-group index (`phonemeGroupsIndex` in `ph66Data.ts`:
  `front_vowels`, `voiced_stops`, …) — we use it for a phonetically-aware
  substitution cost. `wordNum` maps each phoneme to its (compacted) word index.
- `src/lib/passages.ts` — the practice texts. `kind: 'passage'` (one block) or
  `kind: 'sentenceLists'` (drills). English only; IPA is produced on demand via
  `getESpeak().textToIPA(text, { sep: '|', keepStress: false, voice: 'en-us' })`
  (see `AlignWorker.ts`).
- `src/lib/transcription/index.ts` — `TranscriptResult { text?, phonemes?, job? }`
  per tier; this is the sink shape the practice UI already renders.

## Algorithm

```
audio ─► CUPE model ─► log-probs L  [T frames × C classes]   (run once)
                          │
                          ├─► greedy CTC decode ──► hyp phoneme ids  q[0..m)
                          │                              │
reference English+IPA ────┴─► phonemize ─► ref ph66  r[0..n)  (precomputed/cached)
                                               │
                          Smith–Waterman local align  q  vs  r
                                               │
                                  matched ref span [s0, s1]  + score
                                               │
            ┌──────────────────────────────────┴───────────────────────────┐
            ▼                                                                ▼
  English substring (transcription)                      forced decode r[s0..s1] on L
  via ref word/char map                                  (existing decodeAlignmentsSimple
                                                          + postprocessing) ─► phoneme
                                                          timestamps
```

### Step 1 — posteriors (run the model once)

Add a method to `PhonemeTimestampAligner` that returns the stitched, log-softmaxed
posteriors and shape, e.g.:

```ts
// aligner.ts
async computePosteriors(audio: Float32Array): Promise<{
  logProbs: Float32Array   // [spectralLen * numClasses], log-softmax
  spectralLen: number
  numClasses: number
  wavLen: number           // for convertToMs
  durationPerFrameSec: number
}>
```

Refactor `align()` to call this internally so there's a single code path. Both
localization (greedy decode) and refinement (forced decode of the sub-sequence)
consume the **same** `logProbs` — we never run the model twice.

### Step 2 — greedy CTC decode → hypothesis phonemes

Per frame, take `argmax_c logProbs[t]`. Collapse the standard CTC way: drop the
blank class (`phonemeMappedIndex['noise']` = 66) and merge consecutive duplicates.
Optionally drop `SIL` (0) runs or keep them as soft anchors. Result: a short noisy
phoneme-id sequence `q` (length ~ number of phones actually spoken). Keep each
hypothesis token's frame range — not needed for localization, but useful for
debugging/visualization.

New module: `src/lib/alignment/greedyDecode.ts`.

### Step 3 — reference phoneme sequence (precomputed, cached)

Phonemize the **whole** practice text once and cache it keyed by passage id (and
sentence index for drills). Because we must later map a phoneme span back to an
English **character range**, phonemize **per orthographic word** and keep an
explicit map, rather than relying solely on `PhonemizedTranscript.words` (espeak's
word list can diverge from the orthographic tokens around numbers, punctuation, and
contractions):

```ts
type RefToken = {
  text: string // orthographic word, e.g. "rainbow"
  charStart: number // offset into the original passage string
  charEnd: number
  ph66: number[] // phonemes for this word
  pg16: number[]
}
type ReferenceIndex = {
  tokens: RefToken[]
  ph66: number[] // flat, concatenated
  pg16: number[] // flat, parallel
  phonemeWord: number[] // ref phoneme idx -> token index (parallel to ph66)
}
```

Build this by tokenizing the passage into words + offsets first, espeak'ing each
word (or espeak the whole passage and split on its word boundaries — measure which
stays aligned), then `phonemizeTranscript` per word. New module:
`src/lib/alignment/referenceIndex.ts`.

> Note on cost: a full passage (e.g. the Rainbow Passage) is a few hundred
> phonemes. SW is `O(m·n)` with `m` ≈ tens, `n` ≈ few hundred — trivial. No banding
> needed initially.

### Step 4 — Smith–Waterman local alignment

Local-align `q` (hypothesis) against `r = ReferenceIndex.ph66`. **Local** (not
global) alignment is the substring solver: it finds the best-scoring contiguous
sub-segment of `r`, which is exactly "where in the text did they read."

Scoring:

- **Match / mismatch**: not 0/1. Use a phonetic distance so the model's
  within-group confusions (e.g. /b/↔/p/, both stops) are cheap:
  - same ph66 id → `+matchScore` (e.g. `+2`)
  - different id but same `pg16` group → small positive/neutral (e.g. `+1`)
  - different group → negative (`mismatchScore`, e.g. `-1`)
  - involving `SIL`/`noise` → near-neutral so model silence/junk doesn't wreck the
    path.
    Encode this as a `(refPhoneme, hypPhoneme) -> score` function driven by `pg16`.
- **Gap**: a single linear gap penalty to start (e.g. `-1.5`). If insertions/
  deletions cluster (they will, around dropped weak phones), upgrade to **affine
  gaps** (Gotoh): `gapOpen` + `gapExtend`.

Return: matched ref phoneme span `[s0, s1]`, the SW score, and (for affine/debug)
the traceback. New module: `src/lib/alignment/smithWaterman.ts` — pure, no deps,
unit-testable in isolation.

### Step 5 — map the span back to English + refine the alignment

- **English substring (transcription)**: `s0,s1 → ReferenceIndex.phonemeWord →
token indices → charStart/charEnd` → slice the original passage string. Snap to
  whole words; optionally allow partial leading/trailing words and mark them.
- **IPA alignment**: take `r[s0..s1]` (the sub-sequence ph66) and run the existing
  forced path — `decodeAlignmentsSimple` + `ensureTargetCoverage` +
  `extendSoftBoundaries` + `calculateConfidences` + `convertToMs` — **on the
  already-computed `logProbs`**. The output is `PhonemeTimestamp[]`, identical in
  shape to today, so downstream (`alignJob`'s `lunaBrightness` loop, the UI) is
  unchanged.

## Job & worker integration

### New job

Add `src/lib/jobs/practiceAlignJob.ts` exporting `createPracticeAlignJob(deps):
ChunkWork` with `kind: 'practiceAlign'`. It supersedes both `transcribe` and
`align` for practice chunks. Deps need a way to get the **reference text for the
take** (passage id + drill/sentence index → text + cached `ReferenceIndex`).

- `needsWork(chunk)`: chunk has audio, practice mode active, and no
  `{ text, phonemes }` yet for this chunk.
- `resolve()`: returns `(chunk, audio) => runPracticePartialAlign(...)`.
- Output written to the sink as a `TranscriptResult { text, phonemes }` (reuse the
  existing per-tier shape; pick a tier label, e.g. treat it as `large`/a new
  `practice` tier — decide during impl, keep `bestResult`/`transcriptIndicator`
  working).
- Scheduling: register in the queue's `kindOrder` (`schedule.ts`
  `priorityPickNext`). For practice, `kindOrder` becomes `['practiceAlign']` (no
  separate transcribe/align). Keep the generic transcribe/align jobs for
  non-practice routes.

### Worker

Extend `AlignWorker.ts` with a new message:

```ts
type PartialAlignInMessage = {
  type: 'partialAlign'
  pcm: Float32Array
  sampleRate: number
  startTime: number
  referenceIpa: string // espeak IPA of the whole passage (or sentence)
  // plus the orthographic token/char map, or a key to a cached ReferenceIndex
}
type PartialAlignOutMessage = {
  type: 'result'
  text: string // matched English substring
  charStart: number
  charEnd: number
  phonemeTimestamps: PhonemeTimestamp[]
  score: number // SW score, for gating/telemetry
}
```

The worker already owns the CUPE session and espeak. Build/caches the
`ReferenceIndex` once per passage (espeak + phonemize is the expensive part — cache
it in the worker keyed by passage id, or precompute on the main thread and pass it
in). Reuse `resample` + `computePosteriors` + greedy decode + SW + sub-sequence
forced decode.

## Edge cases & robustness

- **Rejection / "not in the text"**: gate on the SW score (normalize by matched
  length). Below threshold → return no match (UI: "couldn't match this to the
  passage"). This is the main guard against garbage takes or the wrong passage.
- **Repeats / ambiguity**: passages repeat words ("the … the …"). SW returns one
  best span; ties are arbitrary. Optionally surface the top-k spans and
  disambiguate with the take's expected position (the UI often knows roughly where
  the user is — drill index, scroll position) as a soft prior on `s0`.
- **Partial words at boundaries**: the take may start/end mid-word. Allow the SW
  path to begin/end inside a token; mark partial leading/trailing words so the UI
  can render them differently.
- **Silence / noise tokens**: keep `SIL`/`noise` near-neutral in the substitution
  cost so leading/trailing silence or breaths don't distort the endpoints.
- **>10 s takes**: `PhonemeTimestampAligner` caps at `durationMax: 10`. Practice
  chunks are usually short, but long takes need windowed posteriors (stitch across
  windows) before localization. Defer; flag if hit.
- **espeak ↔ orthography drift**: numbers ("ninety-three"), contractions, and
  punctuation can make espeak's word count differ from whitespace tokens — the
  reason Step 3 keeps an explicit per-word char map instead of trusting
  `PhonemizedTranscript.words`.
- **Empty hypothesis**: unvoiced/near-silent take → empty `q` → no match; handle
  before SW.

## Testing

- `smithWaterman.test.ts` — pure DP: known local-alignment fixtures (incl. the
  textbook DNA example to validate the implementation against published results),
  gap/affine behavior, tie-breaking.
- `referenceIndex.test.ts` — char-offset mapping for tricky passages (numbers,
  punctuation, contractions, the Grandfather Passage's "ninety-three").
- `greedyDecode.test.ts` — blank/duplicate collapse on synthetic posteriors.
- `partialAlign.e2e.test.ts` — like `bfa-e2e.test.ts` (auto-skips without the
  model): take the butterfly/sample audio, embed its true text inside a larger
  passage, assert the matched span and that the refined timestamps match the
  full-forced result on the isolated clip.
- Confidence/rejection: a clip whose audio isn't in the passage scores below
  threshold.

## Suggested implementation order

1. `smithWaterman.ts` + tests (pure, no other deps) — the core new algorithm.
2. `greedyDecode.ts` + tests.
3. Expose `computePosteriors` on `PhonemeTimestampAligner`; refactor `align()` to
   reuse it (verify `bfa-e2e.test.ts` still passes — parity must hold).
4. `referenceIndex.ts` + tests (orthographic ↔ phoneme ↔ char mapping).
5. Glue: `localizeAndAlign(logProbs, referenceIndex)` → `{ text, span, phonemes,
score }`, with the substitution-cost function over `pg16`.
6. Worker `partialAlign` message + `ReferenceIndex` caching.
7. `practiceAlignJob.ts` + wire into the practice route's queue (`kindOrder`),
   sink, and status UI. Gate on score.
8. e2e test; tune scores/threshold on real takes.

## Learning resources

**Smith–Waterman & sequence alignment (the core technique)**

- Smith–Waterman algorithm — overview and the DP recurrence:
  https://en.wikipedia.org/wiki/Smith%E2%80%93Waterman_algorithm
- Needleman–Wunsch (global alignment) for contrast — same DP, different
  initialization/traceback:
  https://en.wikipedia.org/wiki/Needleman%E2%80%93Wunsch_algorithm
- Durbin, Eddy, Krogh & Mitchison, _Biological Sequence Analysis_ (1998), ch. 2 —
  the standard rigorous treatment of global/local alignment and substitution
  scoring. The mental model (substitution matrix + gap penalty) transfers directly;
  our "substitution matrix" is the `pg16` phoneme-group cost.
- Gotoh (1982), "An improved algorithm for matching biological sequences" — affine
  gap penalties (`gapOpen` + `gapExtend`), if single-gap penalties cluster badly.
- Levenshtein / edit distance — the unit-cost special case, good for intuition:
  https://en.wikipedia.org/wiki/Levenshtein_distance

**Subsequence alignment / "find a short query in a long reference"** (the framing
that makes "audio fully consumed, reference entered/exited freely" rigorous)

- Meinard Müller, _Fundamentals of Music Processing_ (FMP), subsequence DTW —
  free notebooks with figures and code:
  https://www.audiolabs-erlangen.de/resources/MIR/FMP/C3/C3S2_DTWbasic.html
  (and the subsequence variant in the same C3 chapter). Audio-to-reference
  localization is the same problem we're solving at the phoneme level.

**Forced alignment & CTC segmentation** (the speech-specific background, and the
principled single-pass alternative we chose _not_ to start with)

- Kürzinger et al. (2020), "CTC-Segmentation of Large Corpora for German End-to-end
  Speech Recognition", arXiv:2007.09127 — aligning text to audio that's a partial /
  noisy match, with per-segment confidence. https://arxiv.org/abs/2007.09127
- Reference implementation: https://github.com/lumaku/ctc-segmentation
- torchaudio forced-alignment tutorial — clear, code-first walk through CTC
  trellis + Viterbi backtracking (mirrors our `viterbiDecode`):
  https://pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html
- Montreal Forced Aligner docs — background on phone-level forced alignment as a
  field (the HMM-GMM lineage):
  https://montreal-forced-aligner.readthedocs.io/

**In-repo**

- `src/lib/alignment/README.md` + `ATTRIBUTION.md` — the BFA port: pipeline stages,
  ph66/pg16 tables, the input contract.
- `src/lib/alignment/decoder.ts` — our CTC Viterbi, the model for the sub-sequence
  forced decode.
- `bfa-e2e.test.ts` — the parity harness to keep green when refactoring `align()`.
