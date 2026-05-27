## Project Overview

**Braat** is a web-based voice training application that adapts spectrogram and formant tracking algorithms from [Praat](https://www.fon.hum.uva.nl/praat/) to make them more accessible for voice training. All audio processing happens in the browser with no server-side audio handling.

## Common Commands

```bash
# Development
npm run dev            # Run dev server on port 3000
npm run build          # Build for production

# Code Quality
npm run check          # Format with oxfmt, fix with oxlint, and typecheck (tsgo via oxlint) — like `npm run lint` with autofixes

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

## Adding UI Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add <component-name>
```

Components are installed to `src/components/ui/` and can be imported directly.

## CI/CD

CI runs on Forgejo (Codeberg) via `.forgejo/workflows/ci.yaml`. The workflow lints, tests, builds, and deploys to Grebedoc on every push to `main`.

Forgejo supports GitHub Actions syntax, but compatibility with third-party marketplace actions is not guaranteed — prefer runner-agnostic shell steps where possible.
