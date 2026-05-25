## Project Overview

**Braat** is a web-based voice training application that adapts spectrogram and formant tracking algorithms from [Praat](https://www.fon.hum.uva.nl/praat/) to make them more accessible for voice training. All audio processing happens in the browser with no server-side audio handling.

## Common Commands

```bash
# Development
npm run dev              # Run dev server on port 3000
npm run build          # Build for production

# Code Quality
npm run check          # Format with oxfmt, fix with ESLint, and typecheck — prefer this over lint
npm run lint           # Run ESLint (oxlint) and TypeScript type checking (tsgo via oxlint) — check-only, no auto-fix

# Testing
npm run test           # Run tests with Vitest
```

## Tech Stack

- **UI Framework**: TanStack Router (React 19 SPA with file-based routing under `src/routes/`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Components**: shadcn/ui (installed to `src/components/ui/`)
- **Icons**: lucide-react

## Key Architectural Decisions

1. **Real-time Priority**: Spectrogram, waveform, and formant data must remain responsive. Slower computations should not block visualization. If necessary, defer or make features optional rather than blocking the UI.

2. **Audio Worklet for Low-Latency**: Realtime DSP runs in an AudioWorklet; UI and DSP communicate via message passing (not direct function calls).

3. **Vendored DSP Code**: Algorithms are ported to TypeScript from reputable sources (primarily Praat) with clear attribution. Avoid WebAssembly when reasonable TypeScript alternatives exist.

4. **Stream & Batch Processing**: Each algorithm should provide:
   - A stream wrapper (avoids array allocations during processing when possible)
   - A batch wrapper (for offline/file import processing)

5. **Browser-Only**: All processing runs in the browser. The server only builds and serves static assets.

## Audio Pipeline

`MicCapturePipeline` orchestrates the live recording path:

- An **AudioWorklet** (`AudioRingWriter`) writes PCM into a SAB ring buffer with minimal latency.
- Two parallel **Web Workers** both read from the same SAB:
  - **SpectrogramWorker** — generates spectrogram frames, accumulates PCM for playback, and sends a `params` message that also triggers `FormantWorker` initialization.
  - **FormantWorker** — runs pitch (F0) and formant (F1–F3) analysis, patching earlier frames via `patch` messages.

**Stop protocol**: the SAB sentinel (`ctrl[1] = 1`) is written _after_ `AudioContext.close()` resolves, guaranteeing all worklet writes have landed before workers exit their read loops.

### Adding a new worker

Follow this pattern in `MicCapturePipeline`:

1. Allocate the worker (before `getUserMedia`)
2. On successful SAB init: `this.#worker.postMessage({ type: 'init', ... })` then `this.#pendingWorkers++`
3. Register a `'message'` listener with an `'ended'` case: null-guard → terminate → null → `this.#onWorkerDone()`
4. Register an `'error'` listener (with `{ once: true }`): same pattern
5. The null guard (`if (!this.#worker) return`) prevents double-decrement if both `'ended'` and `'error'` fire

`#onWorkerDone()` calls `#teardown()` only when `#pendingWorkers` reaches zero, so teardown waits for all workers.

## Visualization

`VirtualScrollArea` is the primary interaction surface — it handles scroll, zoom, and all pointer events. Domain visualizations (`Waveform`, `Spectrogram`, `VowelChart`) render inside it.

## Adding UI Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add <component-name>
```

Components are installed to `src/components/ui/` and can be imported directly.

## Testing

Tests run with Vitest. Test files should be colocated with implementation files or grouped in a `test/` directory. Run tests with:

```bash
npm run test
```

## CI/CD

CI runs on Forgejo (Codeberg) via `.forgejo/workflows/ci.yaml`, using `codeberg-small` runners. The workflow lints, tests, builds, and deploys to Codeberg Pages on every push to `main`.

Forgejo supports GitHub Actions syntax, but compatibility with third-party marketplace actions is not guaranteed — prefer runner-agnostic shell steps where possible.

## License

GNU Affero General Public License v3 (with code derived from Praat having additional copyright notices per the README).
