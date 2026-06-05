# ![Braat](src/braat.png)

## What is Braat?

Braat shows you, in real time, the pitch and resonance of your voice as you speak. It's a practice aid aimed at **voice training** — including trans voice training, where pitch (F0) and vowel resonance (F1-3) are commonly used reference points. It may also be useful for singing practice, accent work, or just exploring how your voice works.

[**Open Braat →**](https://braat.app)

![Braat screenshot showing a spectrogram with pitch and formant tracks](public/screenshot.png)

## Why Braat?

Braat's signal-processing algorithms are adapted from [Praat](https://www.fon.hum.uva.nl/praat/), a widely used tool in phonetics research. Praat is primarily oriented toward offline analysis; Braat takes its algorithms and runs them on a live microphone in the browser, with no install and no upload.

## Features

- **Live spectrogram** — your voice's frequency content as you speak
- **Pitch (F0) tracking** — Praat's filtered autocorrelation method
- **Formant (F1–F3) tracking** — Burg's method LPC, plotted on a vowel chart
- **Voice activity detection** — Silero VAD picks out voiced segments
- **File import** — drop in a recording and analyze it offline
- **Private** — audio stays in your browser; nothing is uploaded
- **Offline** — once loaded, works without a network connection

## Browser support

Braat uses AudioWorklet, Web Workers, and SharedArrayBuffer, which need a recent browser (Chrome, Firefox, or Safari).

## Status

Braat is **alpha and in active development**. Core features work, but expect changes to the UI and algorithms. A usage guide is planned but not yet written.

## How it works

All audio processing happens in the browser. An AudioWorklet captures microphone PCM into a SharedArrayBuffer ring, and three Web Workers read from it in parallel:

- a spectrogram worker (FFT-based, with a Bark-scaled colormap),
- a formant worker running pitch (filtered autocorrelation) and formant (Burg LPC) analysis,
- and a VAD worker running Silero v6 via ONNX Runtime Web.

See [CLAUDE.md](CLAUDE.md) for the architectural overview. DSP code ported from Praat is attributed in each source file's copyright header.

## Contributing

Source and issue tracker: <https://codeberg.org/jocelyn-stericker/braat>

Contributions — code, bug reports, or feedback from using it — are welcome.

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
