## Project Overview

**Braat** is a web-based voice training application that adapts spectrogram and formant tracking algorithms from [Praat](https://www.fon.hum.uva.nl/praat/) to make them more accessible for voice training. All audio processing happens in the browser with no server-side audio handling.

## Common Commands

```bash
# One-time WASM toolchain setup (Rust required)
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli   # version must match wasm-bindgen in Cargo.toml

# Build Rust DSP → WASM (required before dev/build; re-run after changing crates/)
npm run build:wasm

# Development
npm run dev              # Run dev server on port 3000 (build:wasm must have run first)
npm run build          # Build for production (runs build:wasm automatically)

# Code Quality
npm run check          # Format with Prettier, fix with ESLint, and typecheck
npm run lint           # Run ESLint and TypeScript type checking

# Testing
npm run test           # Run Vitest (JS) + cargo test (Rust DSP)
cargo test --manifest-path crates/braat-dsp/Cargo.toml  # Rust tests only
```

## Architecture Overview

### Tech Stack

- **UI Framework**: TanStack Start (React 19 with file-based routing under `src/routes/`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Components**: shadcn/ui (installed to `src/components/ui/`)
- **Icons**: lucide-react

### Layers

**1. UI & Routing**

- `src/router.tsx` - TanStack Router configuration
- `src/routes/__root.tsx` - Root layout
- `src/routes/index.tsx` - Main application page

**2. Audio I/O**

- `AudioRecorder.tsx` - Records microphone input with real-time analysis
- `AudioPlayback.tsx` - Plays back audio with timeline synchronization

**3. Visualization**

- `Plot.tsx` - Generic plot container
- `VirtualScrollArea.tsx` - Handles scrolling, zooming, and event handling
- `Waveform.tsx`, `Spectrogram.tsx`, `VowelChart.tsx` - Domain-specific visualizations
- `colourmap.ts` - RGB color palette lookup for spectrogram

**4. Audio Analysis (Workers)**

- `src/lib/worklet.ts` - AudioWorklet processor for low-latency real-time analysis of microphone input
- `src/lib/importWorker.ts` - Web Worker for file import processing with frame-by-frame analysis
- `src/lib/analysis.ts` - Core worker spawning and `AnalysisMessage` type definition (includes pitch, formants, RMS per frame)

**5. DSP Algorithms**

- `crates/braat-dsp/` - Rust crate compiled to WASM; contains pitch (F0) and formant analysis
- `spectrogram.ts` - STFT computation
- `preEmphasis.ts` - High-pass pre-emphasis filter
- `fft.ts` - Radix-2 FFT
- `resample.ts` - Linear interpolation resampling
- `window.ts` - Windowing functions (Hann, Hamming)
- `bark.ts` - Bark frequency scale conversion

### Key Architectural Decisions

1. **Real-time Priority**: Spectrogram, waveform, and formant data must remain responsive. Slower computations should not block visualization. If necessary, defer or make features optional rather than blocking the UI.

2. **Audio Worklet for Low-Latency**: Realtime DSP runs in an AudioWorklet; UI and DSP communicate via message passing (not direct function calls).

3. **DSP in Rust/WASM**: Performance-sensitive algorithms (pitch, formants) live in `crates/braat-dsp/` and are compiled to WASM. Simpler signal processing (STFT, windowing, resampling) stays in TypeScript. Algorithms are adapted from reputable sources (primarily Praat) with clear attribution.

4. **Stream & Batch Processing**: Each algorithm should provide:
   - A stream wrapper (avoids array allocations during processing when possible)
   - A batch wrapper (for offline/file import processing)

5. **Browser-Only**: All processing runs in the browser. The server only builds and serves static assets.

## Type Definition

The `AnalysisMessage` type (in `src/lib/analysis.ts`) defines the frame data communicated from workers to UI:

- `pitch` - Fundamental frequency (F0)
- `formants` - Array of formant frequencies
- `rms` - RMS energy
- Timestamp and frame index for synchronization

## Adding UI Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add <component-name>
```

Components are installed to `src/components/ui/` and can be imported directly.

## Testing

JavaScript tests run with Vitest. Rust DSP tests live in `crates/braat-dsp/src/` alongside the implementation. `npm run test` runs both.

Test files should be colocated with implementation files or grouped in a `test/` directory.

## License

GNU Affero General Public License v3 (with code derived from Praat having additional copyright notices per the README).
