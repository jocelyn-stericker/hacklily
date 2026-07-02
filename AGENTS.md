## Project Overview

**Braat** is a web-based voice training application that adapts spectrogram and formant tracking algorithms from [Praat](https://www.fon.hum.uva.nl/praat/) to make them more accessible for voice training. All audio processing happens in the browser with no server-side audio handling.

## Common Commands

```bash
# Development
npm run dev            # Run dev server on port 3000
npm run build          # Build for production

# Code Quality
# Prefer `npm run check` over running the underlying tools (oxlint, oxfmt)
# directly: it bundles format + lint-fix into one step.
# Note: `npm run check` or oxlint is how you typecheck, tsgo isn't installed directly.
npm run check

# Testing
npm run test           # Run tests with Vitest
npm run e2e            # Run slow end-to-end tests

# Reference media
npm run media:fetch    # Mirror reference clips into media/references/ (see below)
```

## Tech Stack

- **UI Framework**: TanStack Router (React 19 SPA with file-based routing under `src/routes/`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Components**: shadcn/ui — its Base UI registry variant (built on [Base UI](https://base-ui.com/), `@base-ui/react`, rather than Radix), configured via `components.json` (`"style": "base-nova"`). Components are vendored into `src/components/ui/` with minor local changes on top.
- **Icons**: lucide-react

## Key Architectural Decisions

1. **Real-time Priority**: Spectrogram, waveform, and formant data must remain responsive. Slower computations should not block visualization. If necessary, defer or make features optional rather than blocking the UI.

2. **Audio Worklet for Low-Latency**: Realtime DSP runs in an AudioWorklet; UI and DSP communicate via message passing (not direct function calls).

3. **Vendored DSP Code**: Algorithms are ported to TypeScript from reputable sources (primarily Praat) with clear attribution. Avoid WebAssembly when reasonable TypeScript alternatives exist.

4. **Stream & Batch Processing**: Each algorithm should provide:
   - A stream wrapper (avoids array allocations during processing when possible)
   - A batch wrapper (for offline/file import processing)

5. **Browser-Only**: All processing runs in the browser. The server only builds and serves static assets.

## Adding UI Components

To add new shadcn/ui components (pulled from the Base UI registry configured in `components.json`):

```bash
npx shadcn@latest add <component-name>
```

Components are vendored into `src/components/ui/` and can be imported directly. We carry minor local changes on top of the generated code, so review diffs before re-adding or updating a component.

## Reference Media (media.braat.app)

The practice route plays ~140 MB of synthesized reference clips (per-sentence
MP3s). These are **not** in the repo — they're hosted on a separate origin,
`media.braat.app`, and loaded at runtime. (`manifest.json` lives there too, at
`/references/manifest.json`.)

- **Generating clips**: `npm run synth:references` runs
  `tools/synth-references/synth.ts`, which synthesizes the clips with Kokoro
  (locally, on CPU) and writes them — plus `manifest.json` — into the gitignored
  `media/references/`. Upload that directory's contents to `media.braat.app` to
  publish (the tracked `media/_headers` goes alongside).
- **URL resolution**: `src/lib/mediaConfig.ts` is the single source of truth.
  The manifest stores root-relative paths (`/references/...`); `mediaUrl()`
  prefixes them with `MEDIA_ORIGIN`. Always go through `mediaUrl()` rather than
  using `clip.url` directly.
- **Local development**: flip the `USE_LOCAL_MEDIA` const in `mediaConfig.ts` to
  load clips same-origin instead. Run `npm run media:fetch` first
  (`tools/fetch-media.ts`) to mirror them into the gitignored `media/references/`;
  the dev server then serves them via `localMediaDevPlugin` in `vite.config.ts`.
  When the const is false, that plugin is a no-op.
- **Host headers**: `media/_headers` (tracked) only sets COOP/COEP/CORP. The
  app is cross-origin isolated (COEP `require-corp`), so cross-origin media needs
  `Cross-Origin-Resource-Policy: cross-origin` for the `<audio>` element and CORS
  (`Access-Control-Allow-Origin`) for the fetch + `decodeAudioData` analyze path.
  The media host adds Content-Type, caching, and ACAO automatically.

## Analytics

Anonymous, cookieless usage stats via GoatCounter, all funnelled through
`src/lib/analytics.ts` (`trackPageview` / `track`). Events have no properties,
so dimensions are encoded into the event name (`family/value`) from a small,
fixed set — keep cardinality low. See `docs/analytics.md` for the full picture
(event taxonomy, the no-banner/no-DNT decisions, COEP notes) and
`src/routes/privacy.tsx` for the user-facing disclosure.

## CI/CD

CI runs on Forgejo (Codeberg) via `.forgejo/workflows/ci.yaml`. The workflow lints, tests, builds, and deploys to Grebedoc on every push to `main`.

Forgejo supports GitHub Actions syntax, but compatibility with third-party marketplace actions is not guaranteed — prefer runner-agnostic shell steps where possible.
