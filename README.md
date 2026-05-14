# ![Braat](src/braat.png)

This adapts the spectrogram and formant tracking algorithms from
[Praat](https://www.fon.hum.uva.nl/praat/) for the web with the goal of making
it more accessible for voice training.

This was developed with extensive use of Claude Code.

## Developing

Audio processing all happens in browser, the server is just for building &
serving static assets.

To run locally, on port 3000:

```
npm install
npm run dev
```

To run lints, code formatting, and tests, fixing any autofixable issues:

```
npm run check && npm run test
```

## Stack and design

For the UI:

- **TanStack Start** — full-stack React, file-based routing under `src/routes/`
- **shadcn/ui** — components in `src/components/ui/`, add more with `npx shadcn@latest add <name>`
- **Tailwind v4** — configured via `@tailwindcss/vite` plugin (no config file); styles in `src/styles.css`
- **lucide-react** — icons throughout; event type icons chosen by heuristics in `src/lib/event-icon-heuristics.ts`

DSP code (in src/lib) should be ported to TypeScript from reputable sources,
with clear attribution. Each algorithm should have a wrapper for stream
processing and a wrapper for batch processing. Stream wrappers avoid allocating
arrays during processing to the extent possible.

Realtime DSP lives in an audio worklet, and the UI & DSP code communicate
via message passing.

All code should run in browser. Avoid WebAssembly if there is a reasonable
alternative. For DSP, prefer vendoring third-party code directly rather than
importing it.

Prioritize snappiness of the key features over other goals. If some data takes
longer to process, that should not stop spectrogram, waveform, and formant data
from being clearly visible. If this means cutting features, we should probably
cut features or make them optional.

## File Overview

### Source Code - Root

- **src/client.tsx** — Vite/TanStack client entry point with React DOM hydration.
- **src/router.tsx** — TanStack Router root configuration and layout definition.
- **src/routeTree.gen.ts** — Auto-generated route tree from file-based routing.
- **src/styles.css** — Global styles with Tailwind CSS directives and custom theme variables.

### Source Code - Routes

- **src/routes/\_\_root.tsx** — Root layout component wrapping all pages with HTML structure and metadata.
- **src/routes/index.tsx** — Main application page with audio import, microphone recording, playback controls, and visualization.

### Components - Audio Playback

- **src/components/AudioRecorder.tsx** — Records microphone input, performs real-time audio analysis, and appends frames to visualization.
- **src/components/AudioPlayback.tsx** — Plays back audio buffers with timeline synchronization and progress tracking.

### Components - Visualization

- **src/components/Plot.tsx** — Generic plot container
- **src/components/VirtualScrollArea.tsx** — Handles scrolling, zooming, and click/hover event handling.
- **src/components/colourmap.ts** — RGB color palette lookup table for spectrogram visualization.
- **src/components/Waveform.tsx** — Renders waveform visualization from analysis frames with configurable amplitude scaling.
- **src/components/Spectrogram.tsx** — Renders frequency spectrogram with color-mapped intensity and formant markers.
- **src/components/VowelChart.tsx** — Plots F1/F2 formant pairs on a vowel chart for vowel space visualization.

### Components - UI & Utilities

- **src/components/ui/** — Components from shadcn/ui.
- **src/lib/utils.ts** — General utility functions for conditional classes and UI helpers.
- **src/lib/mathUtils.ts** —

### lib - Audio Analysis

- **src/lib/analysis.ts** — Core audio analysis worker spawning; defines AnalysisFrame type for frame data with pitch, formants, and RMS.
- **src/lib/importWorker.ts** — Web worker to process audio file imports with frame-by-frame analysis and streaming progress updates.
- **src/lib/AudioRingWriter.ts** - AudioWorklet processor which writes microphone PCM data to a ring buffer
- **src/lib/liveWorker.ts** - analysis of audio input
- **src/lib/worklet-globals.d.ts** — TypeScript types for AudioWorklet global scope (sampleRate, currentFrame, etc.).
- **src/lib/audioUiHelpers.ts** — Helpers for importing audio files, concatenating buffers, and computing dB scaling bounds.

### lib - Signal Processing

- **src/lib/spectrogram.ts** — Short-time Fourier transform (STFT) computation for frequency-domain analysis.
- **src/lib/pitch.ts** — Fundamental frequency (F0) detection via autocorrelation algorithm (adapted from Praat).
- **src/lib/formant.ts** — Formant frequency extraction using linear predictive coding (LPC) analysis.
- **src/lib/burgLpc.ts** — Burg's method for LPC coefficient computation from audio frames.
- **src/lib/preEmphasis.ts** — High-pass pre-emphasis filter to boost high frequencies before analysis.
- **src/lib/fft.ts** — Fast Fourier transform (radix-2) implementation for spectral analysis.
- **src/lib/resample.ts** — Audio resampling using linear interpolation for pitch-invariant analysis.
- **src/lib/window.ts** — Windowing functions (Hann, Hamming) for spectral analysis frame tapers.
- **src/lib/bark.ts** — Bark frequency scale conversion (Hz ↔ Bark) for perceptual frequency mapping.

## License

Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

This project contains code derived from Praat. That code is:

Copyright (C) 1992-2008,2011,2012,2015-2020,2022-2024 Paul Boersma

Copyright (C) 1993-2020 David Weenink
