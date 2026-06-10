# Attribution

This package is a one-shot Cluade TypeScript/JavaScript port of the
**Bournemouth Forced Aligner (BFA)**. I have not looked at most of the code.
Much of the TypeScript code is derived from the self-contained C++
implementation, which is itself a port of the original Python pipeline.

## Upstream project

- **Bournemouth Forced Aligner (BFA)**
  - Author: **Tabahi** <tabahi@duck.com>
  - Package: `bournemouth-forced-aligner` (PyPI), version 1.1.4 at time of porting.
  - License: **GNU General Public License v3** (GPLv3).
  - The original work includes the CUPE acoustic model, the Python alignment
    pipeline (`bfaonnx.py`), the ph66 phoneme mapper
    (`bournemouth_aligner/ipamappers/ph66_mapper.py`,
    `ph66_phonemeizer.py`), and the C++ reference port
    (`bournemouth_aligner/cpp_onnx/main.cpp`).

## What was ported here

Direct, line-by-line ports of upstream BFA code:

| TypeScript file | Ported from (upstream)                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ph66Data.ts`   | `ipamappers/ph66_mapper.py` data tables (auto-generated; see `dump_ph66.py`).                                                                                                                                                  |
| `ph66Mapper.ts` | `ph66_mapper.py`: `get_compound_phoneme_mapping`, `_try_intelligent_split`, `_score_phoneme_split`, `_collapse_to_single_phoneme`.                                                                                             |
| `phonemizer.ts` | `ph66_phonemeizer.py`: `phonemize_sentence` mapping loop + `break_words_alpha` / `break_words_special`.                                                                                                                        |
| `decoder.ts`    | `cpp_onnx/main.cpp`: `slice_windows`, `stitch_window_predictions_flat`, `calc_spec_len_ext`, `log_softmax_*`, `ViterbiDecoder::viterbi_decode`/`assort_frames`, `decode_alignments_simple`, `_rms_normalize`, `convert_to_ms`. |
| `aligner.ts`    | `cpp_onnx/main.cpp`: `CUPEONNXPredictor::predict`, `PhonemeTimestampAligner` (simplified path) and `bfaonnx.py` equivalents.                                                                                                   |

## Scope of this port

- **Simplified pipeline only**: CUPE -> log-softmax -> CTC Viterbi -> assort ->
  millisecond timestamps. The advanced pipeline (target boosting, minimum-
  probability enforcement, silence anchoring, segmented Viterbi, confidence
  scoring) is intentionally **not** ported.
- **Phonemization input** is an espeak-ng IPA _transcript_ string. espeak-ng
  itself is **not** in this folder. The ph66 mapping (IPA -> 66-class indices)
  is ported and runs in-process.

## Third-party runtime dependency

- **onnxruntime-web** (Microsoft), MIT License — peer dependency, not vendored.
- The CUPE **ONNX model weights** are **not** included in this package and carry
  their own upstream license terms; obtain them from the BFA project.

## License of this port

Per the porting request, **bfa-ts** is distributed under the **GNU Affero
General Public License, version 3 or later (AGPL-3.0-or-later)** — see
[`LICENSE`](../../../LICENSE). AGPLv3 is compatible with and one-way upgradeable from
the upstream GPLv3 (GPLv3 §13 / AGPLv3 §13 permit this combination). The
copyright in the underlying algorithms and data tables remains with the original
BFA author(s); this port adds a derivative-work copyright for the TypeScript
translation.

> If you convey this software or run a modified version over a network, the
> AGPL requires you to offer the corresponding source to your users.
