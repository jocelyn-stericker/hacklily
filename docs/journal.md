# Voice Journal

A voice journal is a flat collection of audio files the user controls, accessed
through one of two browser storage backends (see _Backends_). It records audio
progress over time. Braat reads any browser-decodable audio format but always
**writes MP3**. Audio never leaves the device — Braat does not upload it, and
only ever writes when the user asks.

This feature is **separate** from practice on purpose: practice is ephemeral
("refresh and it's gone"); the journal deliberately persists.

## Status

**Phases 1–3 implemented and reviewed.** Phase 1: set up, save from the
analysis tool, view/play/open-in-analysis/delete. Phase 2: record a take in
`/journal` itself (the footer `JournalRecorder`), with VAD-gated start
(timer waits for speech, leading silence is trimmed) and a practice-style
footer. Phase 3: an OPFS backend for non-Chromium browsers (iOS Home Screen
app, desktop Firefox/Safari opt-in) with persistent-storage gating, zip
export/import, and folder import.

`npm run check` and `npm run test` are green; FSA/OPFS handle I/O is
browser-only and verified by manual spot-check, not CI.

## Feature flag

Gated by a hardcoded localStorage flag: `localStorage.ENABLE_JOURNAL = 1`
(`src/lib/journal/journalEnabled.ts`, wrapped in try/catch for sandboxed
contexts). The flag gates the analysis-tool menu items, the `PracticeSettings`
and `WelcomeModal` links, and the `/journal` route (visiting it without the flag
redirects to `/` in `beforeLoad`).

## Key facts / constraints

- **Two backends, one API.** Both FSA and OPFS expose `FileSystemDirectoryHandle`,
  so `journalFs`, `JournalRecorder`, and the route are backend-agnostic. The
  backend kind (`'fsa' | 'opfs'`) only affects setup guidance, the permission
  shim, and whether the persistence/export UI is shown.
- **File System Access is Chromium-only** (Chrome/Edge/Opera) — not Firefox or
  Safari. Probe: `supportsFileSystemAccess()` in `browserFeatures.ts`
  (`'showDirectoryPicker' in window`). When absent, OPFS is the fallback
  (`supportsOpfs()` → `navigator.storage.getDirectory`).
- A `FileSystemDirectoryHandle` is structured-cloneable, so it's stored in
  IndexedDB (FSA) or re-acquired from the OPFS root on load. **Permission state
  is NOT serialized with it.**
- **Permission, however, _is_ remembered per-origin for the session** (verified
  in Chromium): once granted in any tab, `queryPermission` returns `'granted'`
  in other tabs and after client-side navigation, until the session ends or the
  user revokes it. So the "reconnect" path is the exception, not the rule.
  **OPFS handles have no permission model at all** — `queryAccess` reports
  `'granted'` for any handle lacking `queryPermission`, so OPFS journals skip
  the reconnect gate entirely.
- **`requestPermission` needs a user activation (gesture).** This shapes how we
  auto-prompt (see _Permission flow_ below). The fallback when we can't prompt
  is a one-click **"Reconnect folder"** gate (FSA only).
- **No absolute path is available** from the API. We show `handle.name` (the
  leaf folder name only), never a full path or "reveal in Finder". OPFS handles
  are named `journal` (the OPFS subdirectory); there's no user-facing folder.
- **Order entries by file `lastModified`, not filename** — an existing folder of
  arbitrary audio won't follow our timestamp naming.
- Our own writes use a sortable, Windows-legal `<timestamp>.mp3` built from
  **local** date/time components (`2026-06-26_14-30-05`), so the filename reads
  as the user's wall-clock moment, collision-safe within a second (`-2`, `-3`, …
  suffix). `exportMp3.ts`'s download filename uses the same local-time format
  (both switched off `toISOString()`/UTC together).
- **FSA:** files live on the user's disk, not browser quota/OPFS — no eviction
  concerns. We don't claim "never leaves this computer" (a synced/Dropbox folder
  might); the copy says the files are the user's to move/sync/delete as they
  like.
- **OPFS:** files live in the browser's app-private store. They are **not**
  durable unless `navigator.storage.persisted()` is true; on iOS that further
  requires running as an installed Home Screen app. Without persistence, WebKit
  may evict them after ~7 days of non-use (Safari ITP). The UI blocks recording
  and shows a red warning banner until persistence is granted.

## Permission flow (as built)

`journalFs.ts` splits two operations deliberately:

- **`queryAccess(handle)`** — read-only, never prompts. Safe in any context.
- **`ensureAccess(handle)`** — queries, and calls `requestPermission` if not yet
  granted. Must be reachable from a user gesture; rejects without activation.

How each entry point gets access:

- **Same-tab nav** (`PracticeSettings` / `WelcomeModal` "Voice journal" link):
  the `/journal` mount effect calls `ensureAccess`. The click's transient
  activation carries across the client-side navigation, so the prompt (if
  needed) appears immediately — no reconnect step.
- **New-tab "View voice journal"** (analysis-tool menu): `handleViewJournal`
  just calls `window.open('/journal')` **synchronously**. We must NOT `await` a
  permission prompt first — that burns the click's activation and the popup gets
  blocked. We also can't request in the new window: `requestPermission` needs
  activation in its own realm, and a popup has none (the returned `WindowProxy`
  can't borrow the opener's activation, and postMessaging the handle in doesn't
  help). It isn't needed anyway — setup and Save already grant, and the grant is
  session-wide, so the journal tab almost always opens straight to `'granted'`.
  If not, it falls back to its reconnect gate.
- **Cold load** (bookmark, refresh with no prior grant): `ensureAccess` on mount
  has no activation to prompt with → it rejects → the **"Reconnect folder"**
  gate handles it on click.

## Privacy & copy (final wording)

Framing: saving is always the user's choice; the files are real files the user
controls; be mindful of **who can open the folder** (FSA) or **export
regularly** (OPFS, since the store is app-private).

- **Setup (`JournalSetupContent`):** branches on `JournalSetupGuidance`
  (`journalSetupGuidance()` in `journalBackend.ts`):
  - _`choose-folder`_ (FSA): _"Pick a folder on this computer to use as your
    voice journal. … The files are yours — keep, move, sync, or delete them
    however you like — and anyone who can open the folder can play them back."_
  - _`add-to-home`_ (iOS, not yet installed): Share → Add to Home Screen
    instructions. iOS can't keep a durable journal from a plain Safari tab.
  - _`use-chromium`_ (desktop Firefox/Safari): recommends a Chromium browser
    for a real on-disk folder, but offers a **"Continue in this browser"**
    button that opts into the OPFS store with a manual-export caveat.
  - _`unsupported`_: very old browser with neither FSA nor OPFS.
- **`/journal` footer:** states where entries land + the reassurance. OPFS:
  _"Entries are saved privately on this device — nothing is uploaded. Export
  them regularly to keep a copy you control."_ FSA: the folder-name copy above.
- **OPFS persistence banner** (red, shown when `kind === 'opfs'` and not
  persisted): _"Your recordings could be deleted … export a backup now to be
  safe."_ + a destructive **"Enable protected storage"** button calling
  `requestPersistence()`.
- **OPFS export/import bar** (shown when `kind === 'opfs'` and granted): the
  _"You've recorded X minutes in Y journals since you last exported"_ summary
  (see _Phase 3_), plus **Export all**, **Import zip**, and **Import folder**
  buttons.
- **Practice footer (`PracticeStatusRow.tsx`):** ephemeral framing —
  _"Practice takes stay in your browser and are gone when you leave — nothing is
  saved."_
- **`privacy.tsx`** ("What Braat stores on your device"):
  _"If you set up a voice journal, you can save recordings as audio files to a
  folder you choose. Braat writes there only when you ask, and never uploads
  them. The files are yours — keep, move, sync, or delete them however you
  like. Anyone who can open the folder can play them back."_

## Backends (`journalBackend.ts`)

Resolves where the journal stores its files. The two backends share
`FileSystemDirectoryHandle`, so the rest of the journal stays backend-agnostic:

- **`'fsa'`** — a user-chosen folder via the File System Access API
  (Chromium). Durable by nature: a real OS folder the user owns and can see.
  `persisted` is always `true`.
- **`'opfs'`** — the Origin Private File System, used where FSA is absent.
  App-private, and only durable when the browser has granted persistent
  storage; on iOS that additionally requires an installed Home Screen app.
  Carries a `persisted` flag; the UI blocks saving when it's false.

Key functions:

- `journalBackendKind()` — `'fsa'` if FSA is present, else `'opfs'` if OPFS is
  available, else `null`. Synchronous, inspects capabilities only.
- `loadJournalBackend()` — resolve the backend without a user gesture, for
  deciding whether the UI shows entries vs. setup guidance. FSA: loads the
  saved handle from IndexedDB. OPFS on iOS: only if `isStandalone()` (Home
  Screen app), and re-asks persistence on load (promptless on WebKit). OPFS on
  desktop: only if the user has opted in (`localStorage.braat-journal-opfs`),
  and only **observes** `persisted()` (never re-grants — a revoked Firefox
  permission would otherwise be masked on every reload). Wrapped in try/catch:
  `getDirectory()` can throw where OPFS is blocked (e.g. Firefox private
  browsing), and we fall back to setup guidance rather than hanging.
- `setupOpfsJournal()` — acquires the OPFS directory **first**, then records
  the opt-in, then requests persistence. The order matters: getDirectory() can
  throw even though the API is present, and we don't want to persist an opt-in
  that would make every later load fail.
- `requestPersistence()` / `isPersisted()` — wrappers around
  `navigator.storage.persist()` / `persisted()`, both with deliberate runtime
  guards (`?.`) and `oxlint-disable-next-line typescript/no-unnecessary-condition`
  comments, since the typed-as-present APIs can be absent in edge browsers.
- `journalSetupGuidance()` — synchronous, returns `'choose-folder' |
'add-to-home' | 'use-chromium' | 'unsupported'` for the setup modal.

Platform detection (`browserFeatures.ts`): `supportsOpfs()`, `isStandalone()`
(`matchMedia('(display-mode: standalone)')` or legacy `navigator.standalone`),
`isIos()` (handles iPadOS reporting a macOS UA via `maxTouchPoints > 1`).

## Analytics

Low-cardinality, no-property event names only, following the `family/value`
taxonomy (`docs/analytics.md` / `analytics.ts`). Live: `journal/setup`,
`journal/save`, `journal/analyze`, `journal/delete`, `journal/record`. Never
encode folder names, entry counts, or any content-derived value.

## Navigation (as built)

Cross-route navigation lives in the **gear dropdown**, not the header (keeps the
mobile header uncramped). The link sits in the **"Source code & issues"
section** (just above it), as a normal `text-foreground!` menu item — _not_ a
top-of-menu nav group, and not styled as a hyperlink:

- On `/practice`: a flag-gated **Voice journal** item above "Source code".
- On `/journal`: a **Practice** item above "Source code" (after Audio settings).
- Both same-tab. "View voice journal" from the analysis tool opens a new tab.

## Static page & hosting

- **`journal.html`** — static entry modeled on `practice.html`, added to the
  Vite MPA `input` map (`vite.config.ts`) and `public/_redirects`
  (`/journal /journal.html 200`) so `/journal` resolves in production (the
  new-tab open and direct links need a real served page; we don't SSR).
- It carries `<meta name="robots" content="noindex">` and is **intentionally
  omitted from `sitemap.xml`** — the feature is flag-gated and experimental, so
  we don't advertise it for search. Revisit if/when it ships ungated.

## Reused existing code

- **MP3 encoding:** `ropesToMp3` / `mergeRopes` in `src/lib/audio/exportMp3.ts`;
  journal MP3s are loudness-normalized to match export (`gainCache.gainsFor`).
- **Analysis handover:** `stashTake` + `window.open('/')` +
  `postMessage('braat:handoff')` (`practiceHandoff.ts`, consumed in
  `index.tsx`). Opening an entry decodes the `File` to PCM then hands off,
  exactly like `handleAnalyzeReference` in `practice.tsx`.
- **Recording:** `useAudioManager` (the rope `share`/`grow`/`seal`
  pattern in `practice.tsx`).

## Infrastructure (built in Phase 1, shared by both phases)

- **`src/lib/journal/journalEnabled.ts`** — `journalEnabled()`.
- **`src/lib/browserFeatures.ts`** — `supportsFileSystemAccess()`.
- **`src/lib/journal/journalStore.ts`** — native IndexedDB (no new dep),
  single-record store: `saveJournalHandle`, `loadJournalHandle`,
  `clearJournalHandle`.
- **`src/lib/journal/journalFs.ts`**:
  - Pure core (unit-tested, no handle I/O): `isAudioFileName`,
    `journalEntryBaseName`, `uniqueEntryName`, `sortEntriesByModifiedDesc`.
  - Handle I/O: `queryAccess`, `ensureAccess` (return `JournalAccess =
'granted' | 'prompt' | 'denied'`), `writeEntry(handle, bytes, date?)` →
    final filename, `deleteEntry(handle, name)`, `listEntries(handle)` →
    `JournalEntry[]` (`{ name, lastModified, file }`, audio-only, newest first).
- **`src/lib/ambient.d.ts`** — ambient types for `showDirectoryPicker` (on
  `Window`) and `queryPermission`/`requestPermission` (on `FileSystemHandle`),
  which aren't in the standard DOM lib.
- **`src/components/JournalSetupModal.tsx`** — exports **`JournalSetupContent`**
  (the explanation + folder picker, no dialog chrome) and **`JournalSetupModal`**
  (the modal wrapper). The content piece is reused inline; see below.

## Phase 1 — set up, save, view/play/analyze ✅

Implemented. As-built notes (where it differs from the original sketch):

- **`Toolbar.tsx`** — props `journalEnabled`, `journalSetUp`, `onSetUpJournal`,
  `onSaveToJournal`, `onViewJournal`. When set up: **Save** (disabled if no
  audio) + **View voice journal…**. When not set up: only **Set up voice
  journal** (no "View" until a folder exists). Save reuses `exportAudioDisabled`.
- **`index.tsx`** — loads the handle on mount (flag-gated); `handleChooseJournalFolder`
  (`showDirectoryPicker` → `saveJournalHandle` → `track('journal/setup')`). If a
  recording is already loaded when setup finishes, it opens a **"Save this
  recording?"** confirm dialog (Save → `handleSaveToJournal`); otherwise it just
  toasts that the journal is set up. `handleSaveToJournal` (`ensureAccess` →
  `ropesToMp3` → `writeEntry` → toast with **Undo** via `deleteEntry` _and_ a
  **"View journal"** link → `track('journal/save')`). `handleViewJournal` calls
  `window.open('/journal')` **synchronously** (no opener-side `ensureAccess` — it
  would burn the click's activation and block the popup; see _Permission flow_).
  Renders the dismissable `JournalSetupModal`.
- **`journal.tsx`** — `beforeLoad` redirect; state derived from
  `handle` (`undefined` loading / `null` not-set-up) and `granted`:
  - **not set up** → **inline** `JournalSetupContent` in the body (NOT a
    full-screen modal — the original plan's non-dismissable modal covered the
    header; rendering inline keeps the back button and settings usable).
  - **set up, not granted** → "Reconnect folder" gate.
  - **ready** → reverse-chron entry list; **re-lists on window `focus`**.
  - Sky-blue header (`bg-sky-600 text-white`). The back link forces
    `text-white!` — the unlayered `a { color: var(--lagoon-deep) }` in
    `styles.css` beats Tailwind's layered utilities, so without `!` it was
    invisible on sky-600 in light mode. Gear menu: **Audio settings**,
    separator, **Practice** + **Source code** + **Global usage stats**, folder
    name (a plain `<div>` — `DropdownMenuLabel` needs a `Menu.Group` ancestor,
    so it threw `MenuGroupContext is missing`), **Change journal folder**,
    **Close journal**, license/privacy blurb (mirrors `PracticeSettings`).
  - Each row: play in-page (object URL + one shared `<audio>`); **Open in
    analysis** (icon button — `File.arrayBuffer` → `decodeAudioData` →
    `stashTake` → `window.open('/')`; `track('journal/analyze')`); and **Delete**
    (icon button → confirm dialog, since `removeEntry` hits the user's real disk
    and isn't undoable → `deleteEntry` → re-list → `track('journal/delete')`).
  - **Undecodable files** are detected lazily: a failed play/analyze marks the
    entry errored, disables both buttons, and shows "· unsupported format".
    (Pre-probing every file's decodability on listing was rejected as too
    heavy.)
- **`PracticeSettings.tsx` / `WelcomeModal.tsx`** — flag-gated Voice journal
  link (see _Navigation_). **`PracticeStatusRow.tsx` / `privacy.tsx`** — copy.

## Phase 2 — in-route recording ✅

Record a single take in `/journal` and save it to the folder, deliberately
simpler than practice — no echo/loop/reference machinery — but sharing the
practice footer's look: same icons, same pending ("Listening…") state, and the
same floating-on-desktop treatment when active.

- **`JournalRecorder.tsx`** — renders the **entire footer** (the floating
  wrapper + status row + idle copy) for the granted state; the route just drops
  it in. Takes `handle`, `onSaved` (the parent's `refresh`), and `folderName`
  (for the idle-state copy).
  - `useAudioManager({ active: phase !== 'idle', recording: phase ===
'recording', captureFeatures: { spectrogram: false, formant: false, vad:
{ redemptionMs: 80, prerollMs: 500 } }, … })`, reusing the rope
    `share`/`grow`/`seal` handlers from `practice.tsx`. Holds a `sessionRopeRef`,
    an `analysisRef` of `AnalysisFrame`s, the chunk's `AnalysisParams`, and its own
    `RopeGainCache`.
  - **VAD gates the start, never the end.** `onCaptureAppend` pushes each frame
    and flips `audioActive` on the first one (mic is warm). When a frame reports
    `speechDetected === true`, it sets `voicedStartMs` — and the elapsed timer
    only starts then, mirroring practice's `voicedStartMs` gate. VAD never
    stops the take; only the Stop button (or a too-short take) does.
  - **Leading- and trailing-silence trim.** On stop, `computeVoicedRange(
frames, …)` (from `practiceState`) finds the first and last voiced frames;
    the rope is copied from the first to the last voiced sample (gaps between
    speech segments are kept) into a fresh `AudioRope` (chunked, since `read`
    works in ≤64k windows), sealed, and handed to `ropesToMp3`. The VAD
    preroll/postroll already fold pre-onset and post-offset frames into the
    voiced region, so the bounds land just outside the speech itself. If no
    voiced frame was detected, the whole rope is kept (so a quiet-but-valid
    take isn't dropped solely for silence).
  - Phases: **idle** (Record button + copy) → **recording** (status row: spinner
    while mic warms, then pulsing dot + "Listening…" while waiting for speech,
    then "Stop · m:ss" once counting) → **saving** (spinner + "Saving…") → idle.
    `active` stays true through `saving` so the pipeline can seal/drain before
    `STOP_CAPTURE` tears the mic down on return to idle.
  - On Stop: `setPhase('saving')` (→ `STOP_RECORDING`), then `await` a promise
    resolved by **`onCaptureComplete`** so the rope is fully sealed → trim →
    guard (`trimmedLength / sampleRate ≥ 0.3 s`, else toast "Recording too
    short") → `ensureAccess` → `ropesToMp3([trimmed], …)` → `writeEntry` →
    `onSaved()` (re-list) → toast with **Undo** (`deleteEntry` → `onSaved`) →
    `track('journal/record')`.
- **Footer styling** mirrors `PracticeStatusRow.tsx`: the pulsing-red indicator,
  the outline "Listening…/Stop · m:ss" button, the red square Stop button, and
  the `lg:fixed lg:bottom-4 …` floating card on desktop when active. Idle shows
  the centered Record button + the "Entries are saved to …" copy.
- **Mic lifecycle:** open-on-record only (`active` follows `phase`), not
  `persistentMic` — matches the journal's lightweight intent.
- **Gesture:** `unlockForGesture()` runs synchronously in the Record click.
  `ensureAccess` at save time is a near-no-op query (we're already `granted` to
  reach this UI); if the grant has lapsed it toasts rather than throwing.
- **No live level meter** (deferred — would need a meter-only capture feature or
  a tap off the worklet). The timer + "Listening…" state cover the gap.
- **Sample rate / channels:** `useAudioManager` yields mono ropes;
  `ropesToMp3`/`mergeRopes` handle rate normalization — no new handling needed.

## Tests & verification

- Unit tests use **happy-dom** (the repo's DOM env; `jsdom` is NOT installed —
  `// @vitest-environment happy-dom`). Default env is `node`.
- Covered (pure core): `isAudioFileName`, `journalEntryBaseName` sanitize,
  `uniqueEntryName` collision suffixing, `sortEntriesByModifiedDesc`, the
  `journalEnabled` gate, and `supportsFileSystemAccess`. FSA handle I/O and the
  permission/gesture flows are Chromium-only and left to manual spot-check.
- Run `npm run check` (format + lint + typecheck) and `npm run test` after each
  phase.
