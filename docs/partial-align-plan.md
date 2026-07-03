# Partial alignment of practice takes

## Goal

A **practice take** is a recording of _some contiguous chunk_ of a known
practice text — we don't know which part. When such a take is analyzed, we have:

- the practice text in **English** (orthographic), and
- the recorded audio.

Produce **both**, without running ASR:

1. the **English transcription** of the chunk that was actually spoken (the
   matched substring of the practice text), and
2. the **phoneme-level alignment** (timestamps) over that chunk.

This replaces the current two-job pipeline (transcribe → align) for audio that
arrives with a known reference text, using the practice text as the source of
truth instead of an ASR hypothesis.

Out of scope:

- Free practice (`kind: 'blank'` in `src/lib/passages.ts`) and journal
  recordings — no reference text; they keep the existing transcribe-then-align
  path.
- Takes longer than the aligner's `durationMax: 10` seconds cap (audio is
  truncated at 10 s — same limitation as the existing align path; flag if hit
  in practice, don't fix here).
- Top-k span disambiguation for repeated text (see Edge cases).

## Where this actually runs (read this first)

**There is no job queue on the practice route.** The practice page's Analyze
button (`handleAnalyzeTake` in `src/routes/practice.tsx`) opens `/` in a new
tab and hands the PCM over via `stashTake` (`src/lib/practiceHandoff.ts`). The
index route consumes it (`tryConsumeHandoff` in `src/routes/index.tsx` →
`importMonoPcm`), VAD-chunks it, and runs the transcribe→align
`ChunkWorkQueue` (`src/components/useChunkWorkQueue.ts`).

So the integration is:

1. **Practice route**: record the reference text on each take, and carry it
   through the handoff (`PracticeHandoffData` already has a vestigial optional
   `passageId` — it is written by `handleAnalyzeReference` and read by nobody;
   replace it with `referenceText`).
2. **Index route**: hold the handed-off reference text in state, and add a new
   `practiceAlign` job kind to the existing queue. When active, it supersedes
   auto-transcription and alignment for every chunk of the imported audio.
   Each VAD chunk is localized independently within the reference text.

## Why this is different from what we have

The current alignment path (`src/lib/jobs/alignJob.ts` →
`src/lib/workers/AlignWorker.ts`) does **full forced alignment**: it takes an
ASR transcript for the chunk, espeak's it to IPA, phonemizes to ph66, and
forces a Viterbi path through the _entire_ phoneme sequence
(`PhonemeTimestampAligner.align`). That assumes the transcript and the audio
cover exactly the same span.

For a practice take the reference is the _whole passage_ (hundreds of
phonemes) but the audio chunk is a short contiguous slice. Forcing the whole
reference into the clip is wrong: `viterbiDecode` seeds `dp[0]` only at states
0/1, bands around the full-sequence diagonal (`pace = (ctcLen-1)/(T-1)`), and
its stride heuristic assumes `S ≈ T`. We must first **find the matched
region**, then force-align only that region.

The approach (Option B from the discussion that produced this doc):

> Greedy-decode the acoustic model's per-frame phoneme posteriors into a noisy
> phoneme string, locate it inside the reference phoneme sequence with a
> **Smith–Waterman local alignment**, then run the existing, parity-tested
> forced aligner on just the located sub-sequence.

This keeps the carefully ported, e2e-verified decoder
(`src/lib/alignment/decoder.ts`, `bfa-e2e.test.ts`) untouched on the
refinement path, gives a natural **match score to gate on** (reject takes that
aren't in the text), and degrades gracefully when the model mis-hears a
phoneme.

## Why this should work (and where it won't)

**Is the DP sound?** Smith–Waterman is the textbook solver for this problem
shape — find a short noisy query inside a long reference — and the error model
matches: greedy CTC decode produces substitutions (mostly within phonetic
group), deletions of weak phones, and occasional spurious insertions, which
map directly onto SW's substitution/gap machinery. The pg16-aware scoring is
what makes it work. A rough estimate with the model's ~0.22 error rate
(`val_GER=0.2186` in the checkpoint name): the true span scores ~+1.5 per
token (mix of +2 exact and +1 same-group), while a wrong span expects roughly
−0.7 per token (same-group collisions are only ~15% by chance; everything else
is −1 or a gap). That margin is wide, so localization should be robust even on
a noisy phoneme string, and the normalized score is a genuinely discriminative
gate.

One technical note: the problem is strictly _semi-global_ alignment
(hypothesis consumed fully, reference entered/exited freely), and pure SW can
also trim the hypothesis ends. Here that's a feature — it sheds breaths,
clipped onsets, and partial words at VAD boundaries — and normalizing the
score by the **full** hypothesis length (not just the matched part)
compensates in the gate.

**Why it should beat ASR + full forced alignment on read speech:**

1. **The transcript is verbatim ground truth.** ASR at the small tier makes
   real errors — homophones, dropped function words, "ninety-three" → "93"
   which espeak then reads differently — and the forced aligner then forces
   those _wrong_ phonemes onto the audio, degrading alignment silently with no
   error signal. The partial path aligns the true phoneme sequence, so the
   aligner operates in its ideal regime; localization only has to get the span
   endpoints right, and endpoint error is bounded to about a word at each end.
2. **Cheaper and simpler at runtime.** One resident model (CUPE) instead of
   two swapping through the heavy-worker arbiter, one job per chunk instead of
   two, and localization reuses the same posteriors as refinement — the DP
   itself is microseconds. The model runs once per chunk either way;
   everything else is savings.
3. **It can say no.** The score gate rejects off-script or garbage takes
   explicitly, where the current pipeline hallucinates a transcript and then
   confidently mis-aligns it.

**Where it can be worse:** disfluencies. If the user restarts mid-sentence
("the rainbow— the rainbow is…"), ASR often transcribes the repetition and the
full aligner handles it; the partial path matches one span and then force-fits
it over audio containing the restart, so timestamps around the stumble go
mushy. Same for genuine ad-libs — though "align against the intended text" is
arguably the right behavior for voice training anyway. The other soft spot is
greedy decode itself: it throws away posterior uncertainty, so a
systematically mis-heard phone stream (heavy accent, bad mic) hurts more than
it would in a lattice-based method. If either bites on real takes (check
during step 10's tuning), the upgrade path is CTC-segmentation (see Learning
resources), which localizes on the posteriors directly rather than on the
argmax string — the SW module and everything downstream survive that swap.

## Algorithm

```
audio ─► CUPE model ─► log-probs L  [spectralLen frames × numClasses]  (run once)
                          │
                          ├─► greedy CTC decode ──► hyp phoneme ids  q[0..m)
                          │                              │
reference English text ───┴─► per-word espeak+phonemize ─► ReferenceIndex
                                               │            (flat ph66 r[0..n),
                                               │             char offsets per word)
                          Smith–Waterman local align  q  vs  r
                                               │
                                  matched ref span [s0, s1] + normalized score
                                               │
                              score < threshold ──► rejection ("not in the text")
                                               │
            ┌──────────────────────────────────┴───────────────────────────┐
            ▼                                                              ▼
  English substring (transcription)                  forced decode r[s0..s1] on L
  via phonemeToken → charStart/charEnd,              (existing decodeAlignmentsSimple
  snapped outward to whole words                     + post-processing) ─► phoneme
                                                     timestamps
```

Key facts from the existing code (verified):

- `phonemeMappedIndex['noise']` = **66** is the CTC blank class,
  `phonemeMappedIndex['SIL']` = **0** is silence (constants `BLANK_CLASS` /
  `SILENCE_CLASS` at the top of `aligner.ts`).
- `align()` internally does: `chopWav` (RMS-normalize + truncate to 10 s) →
  `cupePrediction` (windowed ONNX inference + stitch, yields `logitsClass`,
  `totalFrames`, `numClasses`, `spectralLen`) → `logSoftmaxFrames` →
  `decodeAlignmentsSimple` → `ensureTargetCoverage` → `extendSoftBoundaries` →
  `calculateConfidences` → `convertToMs`. Only the first `spectralLen` frames
  are valid for decoding.
- `phonemizeTranscript(ipa)` (`phonemizer.ts`) consumes **espeak IPA**, not
  English; its `words` output is IPA word labels, so it cannot by itself map
  phonemes back to English character offsets. Hence the per-word
  `ReferenceIndex` below.
- espeak usage (worker-side, see `AlignWorker.handleAlign`):
  `espeak.textToIPA(text, { sep: '|', keepStress: false, voice: 'en-us' })`.

## Decisions (previously "decide during impl" — now decided)

These are commitments; do not re-litigate during implementation.

1. **Result tier**: add a new `TranscriptTier` `'reference'`, ranked between
   `'large'` and `'manual'`:
   `TRANSCRIPT_TIERS = ['small', 'cloud', 'large', 'reference', 'manual']`.
   Update `bestResult` in `src/lib/transcription/index.ts` to prefer
   `manual > reference > large > cloud > small`. Everything else
   (`transcriptIndicator`, `needsTier`, `alignJob`'s tier walk) iterates
   `TRANSCRIPT_TIERS` generically and needs no change. `npm run check` will
   flag any exhaustive `Record<TranscriptTier, …>` maps that need a new entry.
2. **Reference phonemization is per orthographic word.** Tokenize the English
   text with a regex, espeak each word in isolation, phonemize each word's IPA
   separately. This guarantees an exact phoneme-span ↔ character-range map
   (espeak's word segmentation diverges from orthography around numbers,
   contractions, and hyphens, so whole-text espeak can't be mapped back
   reliably). Cost: citation-form pronunciations for function words ("the" →
   always /ðə/); the phonetic-group substitution cost absorbs that. If match
   quality disappoints, segment-level phonemization is a follow-up, not part
   of this plan.
3. **No SIL in the reference index.** Punctuation is stripped by the word
   tokenizer, and `phonemizeTranscript` on a bare word emits no SIL. The
   hypothesis side keeps its SIL tokens; Smith–Waterman skips them via a free
   hyp-gap (see scoring). This keeps ref indices dense and the span→text map
   trivial.
4. **Rejection marker**: a below-threshold match writes
   `{ reference: { text: '', job: { tier: 'reference', status: 'error', error: "This take didn’t match the passage text." } } }`
   to the sink. The empty-string `text` makes `needsTier` return false (no
   retry loop on every queue scan) while the error job surfaces the message in
   the SpeechStrip indicator. Document the `text === ''` convention where it's
   written.
5. **When practiceAlign is active** (reference text present **and**
   `settings.forcedAlignment` on), auto-transcription is disabled by making the
   queue's `autoTier` callback return `null`; manual per-chunk upgrades via the
   SpeechStrip popover still work (they enqueue a `queued` job, which
   `transcribeJob.needsWork` honors independently of `autoTier`) and their
   results align via the classic path — that's the escape hatch when
   localization rejects. When `forcedAlignment` is off, everything behaves as
   today (normal transcribe→align), even if reference text is present.
6. **Reference text per take**, captured at `END_TAKE` time on the practice
   route: `kind: 'passage'` → all segments joined with `' '`;
   `kind: 'sentenceLists'` → the currently displayed sentence
   (`sentences[state.drillIndex]`); `kind: 'blank'` → `null`. Captured on the
   take (not at Analyze time) because the drill may advance between recording
   and analyzing.
7. **Text span snapping**: the reported English substring snaps **outward** to
   whole words (the words containing `s0` and `s1`); the phoneme refinement
   uses the exact matched span `r[s0..s1]`. Marking partial boundary words in
   the UI is deferred.
8. **The worker builds and caches the `ReferenceIndex`**, keyed by the exact
   reference text string (single-entry cache — one passage per session). The
   worker already owns espeak and the CUPE session; char offsets index into
   the same string the main thread holds, so offsets transfer directly.

## New modules

### `src/lib/alignment/smithWaterman.ts` — pure DP, no deps

```ts
export type SWParams = {
  /** Score for aligning ref symbol r against hyp symbol q. */
  substitution: (r: number, q: number) => number
  /** Penalty (≤ 0) for skipping a ref symbol (deletion). */
  gapRef: (r: number) => number
  /** Penalty (≤ 0) for skipping a hyp symbol (insertion). */
  gapHyp: (q: number) => number
}

export type SWMatch = {
  score: number
  refStart: number // inclusive indices into ref
  refEnd: number
  hypStart: number // inclusive indices into hyp
  hypEnd: number
}

/** Best local alignment of hyp inside ref; null if the best score is <= 0. */
export function smithWatermanLocal(
  ref: readonly number[],
  hyp: readonly number[],
  params: SWParams,
): SWMatch | null
```

Standard Smith–Waterman: `H[i][j] = max(0, diag + sub, up + gapRef, left +
gapHyp)`, track the global max cell, trace back to the first zero cell.
Linear gaps only (upgrade to affine/Gotoh later **only** if real takes show
clustered gaps — not in this plan). Use a `Float32Array` for `H` and a
`Uint8Array` for traceback; sizes here are ~2 500 ref × ~250 hyp ≈ 600 k cells,
trivial.

Tie-breaking: on equal scores prefer the smaller `refEnd` (earliest match) —
pick deterministically and assert it in tests.

### `src/lib/alignment/greedyDecode.ts`

```ts
export type GreedyToken = { ph66: number; startFrame: number; endFrame: number }

/**
 * Greedy CTC decode: per-frame argmax over the first `spectralLen` frames,
 * one token per maximal run of the same class, blank (66) runs dropped.
 * SIL (0) runs are kept (collapsed to one token) — scoring makes them free.
 */
export function greedyDecode(
  logProbs: Float32Array, // [totalFrames * numClasses], log-softmaxed
  spectralLen: number,
  numClasses: number,
  blankClass: number,
): GreedyToken[]
```

Frame ranges aren't needed for localization but are cheap and useful for
debugging; keep them.

### `src/lib/alignment/referenceIndex.ts`

```ts
export type RefToken = {
  text: string // orthographic word, e.g. "rainbow"
  charStart: number // offsets into the original reference string
  charEnd: number
  phStart: number // range into the flat ph66/pg16 arrays (phEnd exclusive)
  phEnd: number
}

export type ReferenceIndex = {
  text: string
  tokens: RefToken[]
  ph66: number[] // flat, concatenated
  pg16: number[] // flat, parallel
  phonemeToken: number[] // ref phoneme idx -> tokens[] index
}

/** `textToIPA` is injected (worker passes espeak; tests pass a fixture map). */
export function buildReferenceIndex(
  text: string,
  textToIPA: (word: string) => string,
): ReferenceIndex
```

- Tokenize with `/[\p{L}\p{N}'’-]+/gu` (`matchAll`; `match.index` →
  `charStart`). This keeps "ninety-three", "don't", "it's" as single tokens
  and drops all punctuation.
- Normalize `’` → `'` before calling `textToIPA` (passages contain both).
- Per word: `textToIPA(word)` → `phonemizeTranscript(ipa)` → append its
  `ph66`/`pg16` to the flat arrays. A word that phonemizes to nothing keeps a
  zero-length token (`phStart === phEnd`) so char offsets stay intact.

### `src/lib/alignment/partialAlign.ts` — pure glue

```ts
/** All tuning constants in one place. */
export const SW_SCORES = {
  match: 2, // same ph66 id
  sameGroup: 1, // different id, same pg16 group
  differentGroup: -1,
  gapRef: -1, // skip a reference phoneme (user skipped/model dropped it)
  gapHyp: -1, // spurious hypothesis phoneme
  gapHypSil: 0, // hypothesis SIL is free to skip (pauses, breaths)
} as const

export const MIN_HYP_TOKENS = 4 // non-SIL hyp tokens required to attempt a match
export const ACCEPT_THRESHOLD = 0.5 // normalized score gate; tune in step 10

export type PartialMatch = {
  refStart: number
  refEnd: number
  charStart: number
  charEnd: number
  text: string // ref.text.slice(charStart, charEnd)
  score: number
  /** score / (SW_SCORES.match * count of non-SIL hyp tokens): 1 = perfect,
   *  normalizing by the FULL hyp length (not just the matched part) so a take
   *  that's half in the text scores ~0.5. */
  normalizedScore: number
}

export function localizeInReference(
  hyp: GreedyToken[],
  ref: ReferenceIndex,
): PartialMatch | null // null: empty/short hyp, no positive-score match, or below threshold
```

The substitution function reads `SW_SCORES` and compares ph66 ids, then pg16
groups (ref side comes from `ReferenceIndex.pg16`; hyp side needs a
ph66→pg16 lookup — reuse `phonemeGroupsMapper` from `ph66Data.ts`, the same
table `phonemizer.ts` uses). The hyp never contains blank (dropped in greedy
decode); the ref never contains SIL (decision 3), so only the hyp-SIL case
needs special handling (`gapHypSil`, and `substitution(r, SIL) =
SW_SCORES.differentGroup`).

Span → text: `charStart = tokens[phonemeToken[refStart]].charStart`,
`charEnd = tokens[phonemeToken[refEnd]].charEnd` (outward word snap, decision
7).

## Changes to existing code

### `aligner.ts`: expose posteriors, single code path

Split `align()` so localization and refinement consume the same model output —
the model runs **once** per chunk:

```ts
export type Posteriors = {
  logProbs: Float32Array // [totalFrames * numClasses], log-softmaxed
  totalFrames: number
  spectralLen: number // valid frames; decoding reads only these
  numClasses: number
  wavLen: number // valid samples after chopWav; drives convertToMs
}

// aligner.ts (methods on PhonemeTimestampAligner)
async computePosteriors(audio: Float32Array): Promise<Posteriors>
alignFromPosteriors(post: Posteriors, ph66: number[], startOffsetSec = 0): AlignmentResult
```

`computePosteriors` = `chopWav` + `cupePrediction` + `logSoftmaxFrames` (plus
the `spectralLen <= 0` guard). `alignFromPosteriors` = everything from
`decodeAlignmentsSimple` down (it is synchronous — no model run). `align()`
becomes a two-line composition. **Parity gate: `bfa-e2e.test.ts` must still
pass unchanged** (`npm run e2e`).

### `AlignWorker.ts`: new message type

```ts
export type AlignInMessage =
  | {
      type: 'align'
      pcm: Float32Array
      sampleRate: number
      startTime: number
      transcript: string
    }
  | {
      type: 'partialAlign'
      pcm: Float32Array
      sampleRate: number
      startTime: number
      referenceText: string
    }

export type AlignOutMessage =
  | { type: 'progress'; stage: string; loaded?: number; total?: number }
  | { type: 'result' /* unchanged */ }
  | {
      type: 'partialResult'
      match: {
        text: string
        charStart: number
        charEnd: number
        score: number
        normalizedScore: number
        phonemeTimestamps: PhonemeTimestamp[]
      } | null // null = rejected (no match / below threshold / empty hyp)
    }
  | { type: 'error'; message: string }
```

`self.onmessage` switches on `msg.type`. The `partialAlign` handler:

1. `ReferenceIndex` from a single-entry cache keyed by `referenceText`
   (rebuild on miss; espeak per word is the expensive part, ~one-time per
   passage).
2. `resample` to 16 kHz (same as `handleAlign`).
3. `computePosteriors` → `greedyDecode` → `localizeInReference`.
4. On match: `alignFromPosteriors(post, ref.ph66.slice(refStart, refEnd + 1),
startTime)` → post `partialResult` with the match.
5. On rejection: post `partialResult` with `match: null` (not an error — the
   audio processed fine).

### `src/lib/jobs/`: shared worker plumbing + new job

`alignJob.ts` owns module-level worker lifecycle state (`worker`,
`pendingAlignReject`, idle teardown, `acquireHeavy('align')`,
`registerHeavyWorker`). Extract it into `src/lib/jobs/alignWorkerClient.ts`:

```ts
/** Post one request to the (lazily created) align worker; resolves on the
 *  first result/partialResult/error message. Handles heavy-worker arbitration,
 *  idle teardown, and WorkerTerminatedError exactly as alignJob does today. */
export function runAlignRequest(msg: AlignInMessage): Promise<AlignOutMessage>
export function terminateAlignWorker(): void
export function alignWorkerLive(): boolean
export function alignJobActive(): boolean
```

This is a mechanical move of `runAlignmentOnWorker`'s promise/listener/idle
logic, generalized over the message type; `alignJob.ts` keeps its public
exports by re-exporting (or callers update imports —
`useChunkWorkQueue.ts` imports `terminateAlignWorker` from `alignJob`).

Also extract `alignOne`'s `lunaBrightness` frame loop into a shared helper
(e.g. `applyLunaBrightness(chunk, phonemes)` in `alignJob.ts` or a small
module) — `practiceAlignJob` runs the identical loop.

New `src/lib/jobs/practiceAlignJob.ts`:

```ts
export type PracticeAlignJobDeps = {
  sink: TranscriptSink
  /** Reference text for the current session's audio, or null when inactive. */
  getReferenceText: () => string | null
  onModelUnavailable: () => void
  isRecording: () => boolean
  onFramesMutated?: (chunk: AnalysisChunk) => void
}

export function createPracticeAlignJob(deps: PracticeAlignJobDeps): ChunkWork
```

- `kind: 'practiceAlign'`, `liveSpans: false`.
- `needsWork(chunk)`: `getReferenceText() !== null`, `!isRecording()`, and
  `needsTier(sink.get(chunk), 'reference')`.
- Runner (mirror `alignOne`'s structure, including error/abort handling with
  `withoutTier` and the synchronous claim before the first await):
  1. Claim: write `{ reference: { job: { tier: 'reference', status: 'aligning' } } }`.
  2. `readAudioSpan(audio)` → `runAlignRequest({ type: 'partialAlign', pcm,
sampleRate: audio.rope.sampleRate, startTime: chunk.startTimeSec,
referenceText })`.
  3. Match → write `{ reference: { text: match.text, phonemes:
match.phonemeTimestamps } }`, run the lunaBrightness loop,
     `deps.onFramesMutated?.(chunk)`.
  4. `match: null` → write the rejection marker (decision 4).
  5. Abort/`WorkerTerminatedError` → `withoutTier(...)`; other errors → error
     job status on the `reference` tier (copy `alignOne`).

Because the result is written with `text` and `phonemes` **atomically**,
`alignJob.needsWork` (which looks for tiers with text but no phonemes) never
picks up practiceAlign output — no extra gating needed there.

### `useChunkWorkQueue.ts`: wire the job

- New optional prop `practiceReferenceText?: string | null` (default `null` —
  `JournalRecorder.tsx` also uses this hook and passes nothing).
- Mirror into a ref; on change, `queue.current?.invalidate()` (same pattern as
  `transcriptionMode`).
- `practiceAlignActive = () => practiceRefRef.current !== null &&
forcedAlignmentRef.current` (decision 5).
- Add `createPracticeAlignJob` to the kinds array with
  `getReferenceText: () => (practiceAlignActive() ? practiceRefRef.current : null)`;
  `isRecording`/`onModelUnavailable`/`onFramesMutated` as for `createAlignJob`.
- `pickNext`: `priorityPickNext(['practiceAlign', 'transcribe', 'align'])`.
- Gate auto-transcription: the `autoTier` passed to `createTranscribeJob`
  becomes `(upgrade) => (practiceAlignActive() ? null : autoTier(modeRef.current, upgrade))`.

### Practice route + handoff

- `src/lib/practiceHandoff.ts`: replace `passageId?: string` with
  `referenceText?: string` on `PracticeHandoffData`.
- `src/lib/practiceState.ts`: add `referenceText: string | null` to
  `PracticeTake`; `END_TAKE` action carries it; reducer stores it.
- `src/routes/practice.tsx`:
  - `saveVoicedTakeIfRecording` computes the take's reference text per
    decision 6 and includes it in the `END_TAKE` dispatch (it has `passage`,
    `sentences`, and `state.drillIndex` in scope; update the `useCallback`
    deps).
  - `handleAnalyzeTake`: `stashTake({ pcm, sampleRate, referenceText:
take.referenceText ?? undefined })`.
  - `handleAnalyzeReference`: the reference clip for segment `i` is exactly one
    segment of text — stash `referenceText:` `passage.segments[i]` for
    passages, `passage.lists.flat()[i]` for drills (add a small
    `segmentText(passage, segmentIndex)` helper in `passages.ts`).
- `src/routes/index.tsx`:
  - `const [practiceReferenceText, setPracticeReferenceText] =
useState<string | null>(null)`.
  - `tryConsumeHandoff`: `setPracticeReferenceText(data.referenceText ?? null)`.
  - Clear it wherever the session audio is replaced by non-practice audio:
    `doNew`, `useAudioImport`'s `onStart`, and when a new mic recording starts
    (effect on `status.value === 'recording'`).
  - Pass `practiceReferenceText` to `useChunkWorkQueue`.

### UI

- `SpeechStrip.tsx` `case 'done'`: add an icon branch for
  `indicator.tier === 'reference'` (use lucide `BookOpenCheck`, styled like
  the other tier icons).
- Rejection copy (shown via the existing error-indicator tooltip/popover):
  "This take didn’t match the passage text." — hedged, no over-promising.
- Analytics (optional, keep cardinality low): `track('partial-align/match')` /
  `track('partial-align/reject')` in `practiceAlignJob`.

## Edge cases & robustness

- **Rejection / "not in the text"**: `normalizedScore < ACCEPT_THRESHOLD`, or
  fewer than `MIN_HYP_TOKENS` non-SIL hypothesis tokens (unvoiced/near-silent
  chunk), or no positive-score SW cell. All three → `match: null`.
- **Repeats / ambiguity**: passages repeat words ("the … the …"). SW returns
  one best span; ties break deterministically (earliest). Top-k spans +
  position priors are explicitly deferred.
- **Hypothesis SIL / breaths**: free hyp gaps (`gapHypSil: 0`) keep pauses from
  distorting endpoints; the ref has no SIL at all.
- **Multiple chunks per take**: the analysis route VAD-chunks the take; each
  voiced chunk localizes independently against the same `ReferenceIndex`
  (cached in the worker across chunks).
- **> 10 s chunks**: `chopWav` truncates at `durationMax: 10`; phonemes and
  matched text then only cover the first 10 s. Pre-existing limitation, out of
  scope.
- **espeak ↔ orthography drift**: sidestepped by per-word phonemization
  (decision 2); the `referenceIndex` tests pin the tricky cases.
- **Worker teardown / recording**: reuse of the align worker plumbing means
  arbitration (`acquireHeavy('align')`), idle unload, and the
  recording-defers-alignment rule all carry over unchanged.

## Implementation steps

Each step should leave `npm run check` and `npm run test` green (typechecking
is via `npm run check` — oxlint bundles it; there is no separate tsc). New
`src/lib` files carry the repo's SPDX `AGPL-3.0-or-later` header. Steps 1–5
are pure library code with no UI surface.

1. **`smithWaterman.ts` + `smithWaterman.test.ts`.** Fixtures: the textbook
   DNA example (validate against published H-matrix/traceback), a
   perfect-substring case, a no-match case (all scores ≤ 0 → null), gap
   behavior, deterministic tie-break, and symbol-dependent gap costs
   (`gapHyp(SIL) = 0`).
2. **`greedyDecode.ts` + tests.** Synthetic `logProbs` grids: blank-run
   dropping, duplicate collapse, blank-separated repeats stay two tokens, SIL
   runs collapse to one token, only `spectralLen` frames read.
3. **Aligner refactor**: `computePosteriors` / `alignFromPosteriors`;
   `align()` composes them. Verify `npm run e2e` (`bfa-e2e.test.ts`)
   reproduces the butterfly golden **unchanged** — this is the parity gate.
4. **`referenceIndex.ts` + tests.** Inject a fixture `textToIPA` map (no
   espeak in unit tests). Cases: char offsets slice back to the exact words;
   "ninety-three" (Grandfather), "don't"/"it's", curly quotes/em-dashes
   dropped, a word phonemizing to nothing keeps offsets intact;
   `phonemeToken` is parallel and monotone.
5. **`partialAlign.ts` + tests**: substitution function over ph66/pg16
   (same-id, same-group, cross-group, hyp-SIL), normalization math, the
   `MIN_HYP_TOKENS`/threshold gates, span→char snapping (mid-word `s0`/`s1`
   snap outward), embed-a-short-hyp-in-a-long-ref localization with injected
   noise (a few substituted/dropped phonemes still find the right span).
6. **Worker**: message union, `partialAlign` handler, single-entry
   `ReferenceIndex` cache. No new tests beyond types (covered by step 10).
7. **Jobs**: extract `alignWorkerClient.ts` (mechanical; `alignJob.test.ts`
   must stay green), add the `'reference'` tier
   (`TRANSCRIPT_TIERS`/`bestResult` + whatever `npm run check` flags), write
   `practiceAlignJob.ts` + `practiceAlignJob.test.ts` (mirror
   `alignJob.test.ts` / `transcribeJob.test.ts` patterns: mock sink + worker
   client, assert claim/result/rejection/abort transitions and `needsWork`
   gating on reference text, recording, and existing results).
8. **Route wiring**: `useChunkWorkQueue` prop + job + `autoTier` gate;
   practice route take `referenceText` + handoff; index route state +
   clearing. Keep the dev server assumption in mind (it's already running on
   port 3000; don't start another).
9. **UI**: SpeechStrip `reference` icon + rejection copy.
10. **`partialAlign.e2e.test.ts`** (same `tags: ['e2e']`, asset-download +
    auto-skip pattern as `bfa-e2e.test.ts`): build a `ReferenceIndex` from a
    sentence embedding "butterfly" (fixture `textToIPA` whose "butterfly"
    entry phonemizes to the known `[29,10,58,9,43,56,23]`), run
    `computePosteriors` on `butterfly.wav`, assert the localized span maps to
    the "butterfly" token and that `alignFromPosteriors` over the matched
    sub-sequence reproduces the full-forced golden timestamps; plus a negative
    control (reference text without similar words → `normalizedScore` below
    threshold). Then tune `SW_SCORES`/`ACCEPT_THRESHOLD` on real takes and
    record the chosen values + observed score distributions here.

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
