# Practice — implementation plan

A `/practice` route for voice practice sessions: read a passage, record takes,
hear them back — either automatically when you stop talking (echo mode) or on
demand — and load any take into the main analysis view in one click. Mobile is
the primary target. No persistence yet, but the take model should not paint us
into a corner (a take is a value object; persistence later means serializing
takes, nothing more).

This plan is grounded in the code as of 2026-06-10. Verify file references
against `main` before each milestone; the VAD and audio layers move.

## What already exists (don't rebuild any of this)

| Need                    | Existing code                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAD                     | `src/lib/analysis/VadProcessor.ts` — Silero v6 streaming + `SpeechGate` (hysteresis, pre/post-roll, redemption, 400 ms min-speech)                                           |
| Mic capture             | `src/lib/audio/MicCapturePipeline.ts` — mic → AudioWorklet → SabRope, emits `AnalysisFrame`s with `speechDetected`, plus `patch` events when the gate revises earlier frames |
| React wrapper           | `src/components/useMicCapture.ts`                                                                                                                                            |
| Audio storage           | `SabRope` (append-only, shared with workers), `AudioSpan` (region of a rope, `endTime` as a promise)                                                                         |
| Playback                | `AudioPlaybackPipeline` (whole ropes, loudness-normalized), `SabRopeSourceNode` (span playback — already used by transcription preview)                                      |
| Batch analysis          | `ImportWorker` path in `useAudioImport.ts` — mono PCM → `AnalysisChunk[]` + sealed rope                                                                                      |
| Passages                | `src/lib/passages.ts` — `passage` and `sentenceLists` kinds                                                                                                                  |
| Settings                | `src/lib/settings.ts` / `useSettings`                                                                                                                                        |
| Reduced-state precedent | `src/routes/ipa.tsx` — a second route that reuses the audio stack                                                                                                            |

The only genuinely new logic is: (1) an **utterance/take detector** layered on
the VAD frame stream, (2) the **echo state machine** (listening → playing →
listening, with capture gated during playback), and (3) the **handoff seam**
into the index route. Everything else is UI.

## UI sketches

Mobile is the primary target: one column, everything interactive in the thumb
zone at the bottom, takes in a swipe-up bottom sheet with only the latest take
permanently visible.

```
┌─────────────────────────────┐
│ ←        Practice        ⚙  │
│                             │
│  When the sunlight          │
│  strikes raindrops in       │
│  the air, they act as       │
│  a prism and form a         │
│  rainbow. The rainbow       │
│  is a division of white     │
│  light into many            │
│  beautiful colors.          │
│  These take the shape       │
│  of a long round arch…      │
│                             │
│                             │
├─────────────────────────────┤
│ ╶── #7 0:06 ▶  ↗  ☆ ──────╴ │   ← latest take, one row
│       ⌃ Takes (7)           │   ← drag/tap to open sheet
├─────────────────────────────┤
│   ● Listening…  ▁▂▅▇▅▂▁     │
│  (  Echo  |  On-demand  )   │
└─────────────────────────────┘
```

In on-demand mode the bottom row swaps the status line for a full-width record
button (`● Record` → `■ Stop · 0:43` while recording).

The bottom sheet, pulled up, is the full takes list — reference docked on top,
clear-session at the bottom. The passage selector also lives here (or behind
the title): chosen once per session, it doesn't need persistent chrome.

```
┌─────────────────────────────┐
│       ⌄  Takes (7)          │
│ ┌─────────────────────────┐ │
│ │ ★ Reference  0:05  ▶    │ │
│ │        [ A/B latest ]   │ │
│ └─────────────────────────┘ │
│  #7  0:06  just now ▶ ↗ ☆  │
│  #6  0:09  1m       ▶ ↗ ☆  │
│  #5  0:04  2m       ▶ ↗ ☆  │
│  …                          │
│        [Clear session]      │
└─────────────────────────────┘
```

Drill mode (a `sentenceLists` passage): one big sentence at a time —
teleprompter at arm's length.

```
│       Sentence 3 of 10      │
│                             │
│   He swiftly dodged the     │
│   heavy wooden beam.        │
│                             │
│  [ ← Prev ]     [ Next → ]  │
│                             │
│  [✓] Auto-advance per take  │
```

On wide screens the same parts rearrange into two panes — passage left (it
gets the dominant width; reading is the primary activity), takes as a real
sidebar right, status strip across the bottom:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Analyze        Practice           Mode:  ( ● Echo   ○ On-demand )    [⚙]  │
├──────────────────────────────────────────────────┬───────────────────────────┤
│                                                  │  TAKES — this session     │
│  Passage:  [ The Rainbow Passage          ▾ ]    │ ┌───────────────────────┐ │
│                                                  │ │ ★ Reference     0:05  │ │
│    When the sunlight strikes raindrops in        │ │   [▶ Play]  [A/B]     │ │
│    the air, they act as a prism and form a       │ └───────────────────────┘ │
│    rainbow. The rainbow is a division of         │ ┌───────────────────────┐ │
│    white light into many beautiful colors.       │ │ #7   0:06    just now │ │
│    These take the shape of a long round          │ │ [▶] [Analyze ↗] [☆]  │ │
│    arch, with its path high above, and its       │ └───────────────────────┘ │
│    two ends apparently beyond the horizon.       │ │ #6   0:09       1m    │ │
│    …                                             │ │ #5   0:04       2m    │ │
│                                                  │ │ …                     │ │
│         (large, comfortable reading text)        │ │      [Clear session]  │ │
├──────────────────────────────────────────────────┴───────────────────────────┤
│  ● Listening…   ▁▂▅▇▅▂▁                    🎧 Headphones recommended          │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Design considerations

- **Ear training first, visuals second.** Delayed playback — not real-time
  feedback — is the point: you judge your own voice poorly while speaking
  (bone conduction), and hearing a take seconds later, while the attempt is
  still in muscle memory, is what teaches. So the practice surface stays
  deliberately quiet — no spectrogram, no formants, at most a level meter.
  The analysis view is one tap away for verification; it should not leak in.
- **Takes, not a tape.** People repeat the same sentence ten times and want
  "compare take 3 with take 9". The session is a list of bounded takes, with
  the newest one always one tap away and a pinnable ★ reference for A/B —
  an anchor makes echo practice far more effective. This also keeps the
  handoff bounded and the model serialization-friendly for later persistence.
- **The status line is sacred.** "Is it listening right now?" must be
  answerable at a glance from across the room — it's both the echo-mode
  affordance and the mic-privacy indicator. It keeps its dedicated row in
  every state of the UI, cycling `● Listening…` → `■ Heard you — playing
back…` → listening, with the live level meter always visible.
- **Echo mode is hands-free by design.** That's why it's the mobile star:
  phone propped up or in hand, no tapping between attempts. It follows that
  speaker feedback must be handled robustly (capture gated during playback +
  cooldown, headphones hint), not best-effort — many users won't have
  headphones in.
- **Generous, tunable silence cutoff.** People pause mid-sentence; 1.5 s is
  the default before an utterance is considered done, adjustable in ⚙ along
  with skip-silence and input device. Infrequent knobs live in the popover,
  not the chrome.
- **Big tap targets, big text.** Reading distance varies (in hand vs. propped
  on a table), so text size is a setting; recording controls are full-width
  because fine taps while glancing at a script are error-prone.
- **Sessions are long.** Minutes to an hour, often with no touches: wake lock
  is load-bearing (screen sleep can kill the mic stream on iOS), and memory
  growth has a budget (§5 below).
- **Naming.** The tool is called **Practice** — plain and discoverable, in
  the nav and at `/practice`. (Rejected: "Parrot" — charming Praat pun but
  cleverness lost to clarity; "Echo" — Amazon Echo collision.)

## Architecture decisions (settle these first, they're load-bearing)

### 1. Takes are `AudioSpan`s over one session rope

One `MicCapturePipeline` runs for the whole practice session, writing one
growing `SabRope`. A take is `{ id, span: AudioSpan, createdAt, voicedRanges }`
— no PCM copies. Replay = span playback; "skip silence" = play only
`voicedRanges`; handoff = `readAudioSpan` once, at handoff time. Session-only
state, held in a plain reducer/store in the route. This is also the shape that
serializes cleanly if persistence comes later.

### 2. The 1.5 s cutoff is a _layer above_ `SpeechGate`, not a change to it

`SpeechGate`'s `REDEMPTION_MS` (80 ms) and friends are tuned for analysis
display; do not touch them. The take detector consumes the gate's per-frame
decisions (including patches — decisions are optimistic and get revised!) and
applies its own rule: an utterance ends after **1.5 s** with no
`speechDetected` frame. This is exactly item 2 of the `TODO(vad)` list in
`VadProcessor.ts` ("emit segment-level events") — implement it as a small
standalone class, e.g. `src/lib/analysis/UtteranceTracker.ts`, so the index
route can adopt it later too.

**Focus energy here.** Patch handling is the subtle part: a frame reported as
speech can be retracted (redemption expiry, min-duration revert), so the
tracker must tolerate boundaries moving backward before it commits an
utterance. The 1.5 s timer gives plenty of slack (all gate revisions resolve
within ~80 ms + post-roll), but write the invariant down in the code and test
it directly.

### 3. Echo playback gates the _detector_, not the mic

Tearing down the mic pipeline between utterances would defeat the warm
`persistentMic` stream and add latency. Instead: the pipeline keeps running
during echo playback; the take detector is suspended from playback start until
~250 ms after playback end. Consequences to accept and document in code:

- On speakers, the playback lands on the rope as junk audio between takes.
  Takes are spans, so nothing references it; rope memory cost is accepted
  (see §5).
- Silero's LSTM state sees the playback; in practice it recovers within a few
  frames. If it proves flaky, `VadStreamProcessor.reset()` after playback —
  but measure first, don't pre-fix.

### 4. Handoff = module-level stash + navigate, then batch re-analysis

Practice should run the mic pipeline in a **VAD-only mode** (new option on
`MicCapturePipeline` to skip the spectrogram/formant workers) — running full
formant tracking for an hour on a phone is pure battery waste when nothing
displays it. That means takes don't carry full analysis, so handoff is:

1. `readAudioSpan(take.span)` → mono `Float32Array` (fast, already-recorded).
2. Stash `{ mono, sampleRate }` in a module singleton
   (`src/lib/practiceHandoff.ts` — a set-once/take-once pair of functions).
3. `navigate({ to: '/' })`.
4. Index route, on mount, checks the stash and feeds it through the existing
   `ImportWorker` path. Extract `importMonoPcm(mono, sampleRate)` from
   `importAudioFile` in `useAudioImport.ts` (it's the decode-less tail of that
   function) so both callers share it.

Why a module singleton and not router state: this is an SPA, the payload is a
large typed array, and TanStack Router state isn't meant for that (see also
the memory about exotic objects as props — same instinct). A take of 10–30 s
batch-analyzes in well under a second on desktop; **verify the latency on a
real phone** in milestone 4 — if it's not "without delay" there, the fallback
is running practice with full analysis enabled and handing chunks over
directly, which is more coupling but zero recompute. Don't build the fallback
speculatively.

### 5. Memory budget for hour-long sessions

44.1 kHz mono float32 ≈ 10.6 MB/min ≈ 635 MB/hour — too much for phones if the
rope never sheds. Mitigation, in order of preference: cap retained takes (e.g.
last 20 + reference), and when old takes are dropped, the rope regions they
spanned become garbage — but `SabRope` is append-only, so it can't free them.
Options: (a) start a fresh pipeline/rope every N minutes of audio and copy the
retained takes' spans into small sealed ropes; (b) accept the cost for v1 with
a visible session-duration indicator and a "clear session" that really frees.
**Ship (b) in v1, design the take type so (a) is a drop-in** (a take's span
already carries its own rope reference, so per-take sealed ropes need no type
change). Revisit before calling the tool done — an hour is in the stated use
case.

## Milestones

Each milestone ends green on `npm run check` and `npm run test`, and is a
sensible commit. Work one milestone at a time (matches the existing review
cadence — review every step, don't batch ahead).

### M0 — Groundwork (small, pure, heavily tested)

- `UtteranceTracker` (§2): input = `SpeechDecision` stream + frame timing;
  output = `utteranceStart` / `utteranceEnd` events with sample ranges, plus
  the 1.5 s end-of-utterance rule as a constructor param. Pure logic, no audio.
- `MicCapturePipeline` option to skip spectrogram/formant workers (§4).
- Extract `importMonoPcm` from `useAudioImport.ts` (§4).

**Tools:** write `UtteranceTracker` tests _first_, from the `SpeechGate` test
file's patterns (`VadProcessor.test.ts`) — synthetic decision sequences
including retractions. This is the piece to understand line-by-line; if you
delegate the implementation to Claude, review it like a PR from a stranger and
ask for a walkthrough of the retraction invariant. Vitest; jsdom env only if
needed (see test-patterns memory).

**Attention:** patch/retraction semantics; off-by-one on frame→sample
conversion at utterance boundaries (pre-roll means the start can precede the
first speech-probability-positive frame).

### M1 — Route scaffold + reading surface

- `src/routes/practice.tsx`; link from the index toolbar; sets
  `document.title` (note the title-restore effect in `index.tsx`).
- Passage selector (from `passages.ts`), large-type passage view, drill mode
  for `sentenceLists` (one sentence, prev/next, position indicator).
- Mobile-first layout per the sketches above: single column, controls bottom,
  takes as a bottom-sheet (latest take pinned as one row).
- Text-size control (store in settings).

**Tools:** `npx shadcn@latest add` for missing primitives (likely `drawer` for
the bottom sheet, `select`, `slider`, `toggle-group` — check what's already
vendored in `src/components/ui/` first, and diff-review the generated code per
CLAUDE.md). This milestone is low-risk UI; good candidate to delegate broadly
(Sonnet-class is fine for scaffolding) and review for Tailwind `dark:` usage
and layout only. Don't drive the live app via run/verify — spot-check
manually on your phone via the dev server already running on port 3000.

**Attention:** minimal. Resist polishing here; the layout will shift once real
audio state exists.

### M2 — On-demand mode: record, takes list, playback

- Record button → run `MicCapturePipeline` (VAD-only mode) → stop creates a
  take spanning the recording; `UtteranceTracker` output recorded as
  `voicedRanges` on the take.
- Takes store (newest-first, expand-on-tap, pin-as-reference ★, A/B button,
  clear session); latest-take row; `[Analyze ↗]` stubbed.
- Take playback via the span-playback path (`SabRopeSourceNode`, as used by
  transcription preview — read that call site before writing a new one).
  "Skip silence" toggle = play `voicedRanges` back-to-back.
- Status row: recording state + live level meter (level can come from the
  frames already flowing — don't add a new analyser).

**Tools:** pair with Claude file-by-file; the audio lifecycle code
(AbortController patterns, `pipeline.destroyed` listeners) has strong existing
idioms in `useMicCapture`/`useAudioPlayback` — point at those as the template
rather than letting fresh patterns in. Unit-test the takes store reducer.

**Attention:** lifecycle edges — navigating away mid-recording, mic permission
denial (reuse the pipeline's error events), playback racing a new recording.
Also decide here whether echo playback is loudness-normalized; recommend _no_
normalization for practice playback (you want to hear your actual dynamics),
which conveniently avoids `RopeGainCache` on a growing rope.

### M3 — Echo mode

- Mode toggle (echo / on-demand) in the bottom control row.
- Echo state machine: idle → listening → (utteranceEnd after 1.5 s) →
  playing-back → cooldown (~250 ms) → listening. Detector gated during
  playback + cooldown (§3). Each echoed utterance also lands as a take.
- Status row states: `● Listening…` / `■ Heard you — playing back…`, always
  visible; this doubles as the mic-privacy indicator, never hide it.
- Headphones-recommended hint, dismissible.
- Drill-mode auto-advance after each echo (optional toggle).

**Tools:** model the state machine as a discriminated union + reducer and
exhaustive-switch it (keep the `assertUnreachable` runtime-guard convention).
Unit-test transitions with a fake clock. This is the second
understand-it-completely component.

**Attention:** this is where the tool succeeds or fails as a product. Budget
real time for _tuning on a phone with your actual voice_: does 1.5 s feel
right when reading a passage with commas? Does playback ever re-trigger
detection on speakers? Does a cough become a take (the gate's 400 ms
min-speech should eat it — verify)? No simulator or test substitutes for this;
plan a few real practice sessions as QA.

### M4 — Handoff to analysis

- `practiceHandoff.ts` stash + consume-on-mount in `index.tsx` via
  `importMonoPcm` (§4). The index route treats it exactly like a file import
  (confirm-if-unsaved flow included — reuse `confirmingAction`).
- `[Analyze ↗]` on every take; measure tap-to-spectrogram latency on a phone.

**Attention:** the index route's import path has assumptions (one sealed rope,
no `recordingStart` markers) — read `locateChunkRope` in `AudioSpan.ts` before
assuming the handed-off timeline behaves like a recording. Keep the seam
boring: if you're tempted to teach the index route about "takes", stop; it
receives audio, full stop.

### M5 — Mobile hardening

- Wake lock (`navigator.wakeLock`) while a session is active, re-acquired on
  `visibilitychange`; release when idle.
- Background/foreground: what happens to the mic stream when iOS suspends the
  tab mid-session? Detect the dead stream (the pipeline's error path may
  already surface it) and show a clear "session paused — tap to resume".
- `navigator.audioSession.type = 'play-and-record'` is already set in
  `useAudioPlayback`; make sure the practice route's playback path goes
  through code that sets it too, or hoist it.
- Session memory: duration indicator + take cap per §5.

**Tools:** real devices, primarily iOS Safari — it is the platform that will
break (mic suspension, wake-lock quirks, audio-session interplay). Test over
HTTPS or localhost tunnel as needed. WebSearch/claude-code-guide for current
Safari wake-lock behavior rather than trusting training data; this churns.

**Attention:** second-highest after M3. An hour-long session that silently
stops recording at minute 9 destroys trust in the tool.

### M6 — Docs, tests, tidy

- Update `CLAUDE.md` (new route, the VAD-only pipeline option, handoff seam).
- E2E: one `npm run e2e` flow if the existing harness can fake a mic
  (`getUserMedia` mock or a fixture stream); otherwise document manual QA
  steps in this file and keep unit coverage as the gate.
- Sweep: settings naming, `npm run check`, kill dead code from abandoned
  directions.

## Where your energy goes (summary)

1. **M3 echo tuning on a real phone** — the product lives or dies here.
2. **M0 `UtteranceTracker`** — the one new algorithmic component; own it fully.
3. **M5 iOS lifecycle** — silent failure modes.
4. **The handoff seam (M4)** — keep it one-directional and dumb.

Everything else (layout, lists, toggles, drill mode) is replaceable UI you can
delegate and review lightly.

## Future directions (explicitly out of scope)

- Persistence of takes across reloads (take model is already serialization-
  friendly; needs OPFS/IndexedDB + quota + privacy copy).
- Reference-clip import (an external file as the ★ reference).
- Segment-event adoption in the index route (replacing its run-derivation
  with `UtteranceTracker`).
- Rope segmentation for unbounded sessions (§5 option (a)).
- A single VAD "sensitivity" knob (item 3 of the `TODO(vad)` list).
