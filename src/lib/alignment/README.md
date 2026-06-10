# bfa-ts

A **TypeScript port (simplified pipeline)** of the
[Bournemouth Forced Aligner (BFA)](https://pypi.org/project/bournemouth-forced-aligner/),
running the CUPE acoustic model on **onnxruntime-web (wasm backend)**. It takes
16 kHz mono audio plus an **espeak-ng IPA transcript** and returns phoneme-level
timestamps.

This is a _port of a port_: the code is derived from BFA's self-contained C++
reference (`bournemouth_aligner/cpp_onnx/main.cpp`), which is itself a port of
the Python pipeline (`bfaonnx.py`). See [`ATTRIBUTION.md`](./ATTRIBUTION.md).

> **License: AGPL-3.0-or-later.** Conveying this code or exposing it over a
> network obliges you to offer corresponding source.

## What it does (and doesn't)

- ✅ Simplified alignment: `CUPE -> log_softmax -> CTC Viterbi -> assort -> ms timestamps`.
- ✅ espeak-ng IPA transcript -> ph66 indices (full ph66 mapper ported, incl.
  compound splitting and intelligent fallback).
- ✅ Designed to run inside a Web Worker.
- ❌ No advanced pipeline (no target boosting, minimum enforcement, silence
  anchoring, segmented Viterbi, or confidence scoring).
- ❌ Does **not** run espeak-ng. Produce the IPA transcript yourself (e.g. an
  espeak-ng WASM build) and pass it in.
- ❌ Does **not** resample. Audio must already be **16 kHz mono** `Float32Array`.
- ❌ The CUPE ONNX model weights are not bundled — obtain them from BFA and
  export to ONNX (`bournemouth_aligner/cpp_onnx/export_cupe_to_onnx.py`,
  preferably with `--dynamic` so a full window batch runs in one shot).

## Transcript input contract

The transcript is espeak-ng IPA. **Feed phoneme-separated, stress-free tokens.**

- **Phonemes within a word** must be separated by `phoneSeparator` (default
  `"|"`) — exactly one espeak phoneme per token, e.g. `b|ʌ|ɾ|ɚ|f|l|aɪ`. This is
  the only path that reproduces the Python/BFA output, because each token is
  looked up in the ph66 mapper individually.
- **Words** are separated by whitespace, e.g. `b|ʌ|ɾ|ɚ|f|l|aɪ f|l|aɪ`.
- **No stress / length / tie marks.** Tokens like `ˈʌ`, `ˌaɪ`, `t͡ʃ` are _not_
  ph66 keys, so they are dropped as `noise`. Produce stress-free phonemes
  (see below).
- **Punctuation** `[. , ! ? ; :]` and literal `<SIL>` become a `SIL` token.
- **Custom delimiter:** set `PhonemizeOptions.phoneSeparator` if your frontend
  uses something other than `"|"`.

Example: `"b|ʌ|ɾ|ɚ|f|l|aɪ"` -> ph66 `[29, 10, 58, 9, 43, 56, 23]` ("butterfly").

### How to generate a compatible transcript

**Mirror BFA exactly with `phonemizer`:**

```
espeak-ng --sep='\|' --ipa
```

Then strip stree (`/['.]/g`)

### Without separators (discouraged)

If a word arrives with no separator, the port falls back to greedy longest-match
IPA segmentation. This is best-effort and **lossy**: some clusters collapse to
`noise` (e.g. `bʌɾɚflaɪ` loses `l`+`aɪ`, because the upstream table maps the
substring `laɪ` to noise). Do not rely on it — always supply separators.

## Usage — main thread (library)

```ts
import {
  createCupeSession,
  PhonemeTimestampAligner,
  alignTranscript,
  ort,
} from 'bfa-ts'

// Tell ort where the wasm binaries live (CDN or bundled path).
ort.env.wasm.wasmPaths = '/ort/'

const session = await createCupeSession(modelArrayBuffer) // ArrayBuffer | Uint8Array | URL
const aligner = new PhonemeTimestampAligner(session, { durationMax: 10 })

const { phonemeTimestamps } = await alignTranscript(
  aligner,
  audio16k,
  'b|ʌ|ɾ|ɚ|f|l|aɪ',
)
for (const p of phonemeTimestamps) {
  console.log(
    p.phonemeLabel,
    p.startMs.toFixed(1),
    '-',
    p.endMs.toFixed(1),
    'ms',
  )
}

// Or align pre-computed ph66 indices directly:
await aligner.align(audio16k, [29, 10, 58, 9, 43, 56, 23])
```

## Output shape

```ts
interface PhonemeTimestamp {
  phonemeId: number // ph66 class id (0 = SIL, 66 = noise/blank)
  phonemeLabel: string // e.g. "b", "aɪ", "SIL"
  startFrame: number
  endFrame: number
  targetIndex: number // index into the input ph66 sequence (-1 if unmatched)
  startMs: number
  endMs: number
}
```

> **Note on `targetIndex`.** In the Python/C++ reference's _simplified_ path the
> per-phoneme tuple's "confidence" slot actually carries the target-sequence
> index (a quirk of `convert_to_ms`). This port exposes it as the explicit
> `targetIndex` field instead of overloading a confidence value.

## Fidelity notes / known divergences from upstream

- **Float precision.** DP and log-prob buffers use `Float32Array` to track the
  C++ `float` reference closely. Tie-breaking in the Viterbi forward pass and
  final-state selection matches the C++/PyTorch `argmax` order (stay > advance >
  skip; first-max wins).
- **No resampling.** The C++ reference also doesn't resample; both assume 16 kHz.
- **`calc_spec_len_ext`** warns (does not throw) for sub-2-frame audio, matching
  the C++ port (the Python raises).
- **Dynamic batch.** `predict()` runs all windows in a single `session.run`, so
  the ONNX model must accept a dynamic batch axis (export with `--dynamic`).
- **Greedy fallback** segmentation for separator-less words has no exact Python
  counterpart (Python always receives `|`-delimited phonemes from espeak).

## Tests

- `phonemizer.test.ts` — IPA->ph66 golden cases (values cross-checked against
  the Python mapper).
- `decoder.test.ts` — pure DSP + Viterbi unit fixtures.
- `bfa-e2e.test.ts` — runs the real `models/variants/int8dyn.onnx` over the
  butterfly sample via onnxruntime-web (wasm, under Node) and asserts a
  **frame-for-frame, millisecond match** with the upstream Python output. It
  auto-skips if the model/sample aren't present.

> Parity confirmed: the TS pipeline reproduces the Python `int8dyn.onnx` result
> exactly (same 7 phonemes, same start/end frames, same ms to 3 decimals).

## Regenerating the phoneme tables

`ph66Data.ts` is generated from the upstream Python mapper to stay
byte-faithful:

```bash
# from the BFA repo root
python alignment/dump_ph66.py \
  --mapper bournemouth_aligner/ipamappers/ph66_mapper.py \
  --out alignment/ph66Data.ts
```
