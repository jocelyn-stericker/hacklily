# espeak-phonemes

English text → IPA phonemes, using a size-optimized WebAssembly build of
[eSpeak NG](https://github.com/espeak-ng/espeak-ng). Works in Node.js and
browsers, offline, with no audio-synthesis code shipped.

```ts
import { textToIPA } from "@jocelyn-stericker/espeak-phonemes";

const ipa = await textToIPA("Hello world");
// → "həlˈəʊ wˈɜːld"
```

This repo is **not a fork** of eSpeak NG. It pins upstream as a git submodule,
applies a small patch (`patches/espeak-ng-phonemes.patch`) that trims the build
to translation-only and adds a phonemes-only data mode, then cross-compiles a
~300 KB WASM module plus ~120 KB of compressed English data. See
[Build](#build) and `PORT_PLAN.md`.

## Install

This package is published to a Forgejo (Codeberg) npm registry. Add the scope to
your project's `.npmrc`:

```
@jocelyn-stericker:registry=https://codeberg.org/api/packages/jocelyn-stericker/npm/
```

Then install a pinned version (builds are not guaranteed compatible across versions):

```bash
npm install --save-exact @jocelyn-stericker/espeak-phonemes
```

## Usage

### Node.js (auto-resolves the bundled assets)

```ts
import { textToIPA } from "@jocelyn-stericker/espeak-phonemes";

await textToIPA("hello");                          // "həlˈəʊ"
await textToIPA("hello", { voice: "en-us" });      // "həlˈoʊ"
await textToIPA("hello", { keepStress: false });   // "hələʊ"
```

### Browser (supply the assets explicitly)

The Node convenience wrapper resolves files from disk; in the browser use the
low-level `createESpeak` and hand it the emscripten factory + data archive. With
a bundler like Vite, the `?url` suffix yields the served asset URL:

```ts
import { createESpeak } from "@jocelyn-stericker/espeak-phonemes";
import initWasm from "@jocelyn-stericker/espeak-phonemes/espeak-phonemes.js";
import wasmUrl from "@jocelyn-stericker/espeak-phonemes/espeak-phonemes.wasm?url";
import dataUrl from "@jocelyn-stericker/espeak-phonemes/espeak-ng-data.tar.gz?url";

const resp = await fetch(dataUrl);
const engine = await createESpeak({
  moduleFactory: initWasm,
  moduleOverrides: { locateFile: () => wasmUrl }, // so the glue finds the .wasm
  data: { archive: await resp.arrayBuffer(), compression: "gzip" },
});

engine.textToIPA("Hello from the browser!"); // synchronous after init
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `voice` | `"en" \| "en-us"` | `"en"` | English voice variant |
| `separator` | `string` | `" "` | String between phoneme groups (words + clauses) |
| `keepStress` | `boolean` | `true` | Keep `ˈˌ` stress marks |
| `tie` | `string` | — | Tie character inserted within multi-char phonemes (e.g. `"͡"` → `ə͡ʊ`) |

## Differences from the `espeak-ng` CLI

Output matches `espeak-ng -q --ipa -v en` except for one case: the CLI's
intonation pass (part of audio synthesis, which this build omits) adds an
emphasis mark to a lone single-syllable function word — `the` → `ðˈə`,
`is` → `ˈɪz`. This build emits the unstressed lexical form (`ðə`, `ɪz`). Lexical
stress on content words and stress within running text are unaffected.

## Build

The whole pipeline lives in `scripts/` and runs on push via
`.forgejo/workflows/ci.yaml` (the version bumps every run).

```bash
git clone --recurse-submodules <this repo>
cd espeak-phonemes
npm install
source "$EMSDK/emsdk_env.sh"   # an activated Emscripten SDK
npm run build                  # patch → native data → wasm → TypeScript
npm run test:golden            # parity vs the captured CLI corpus
```

`scripts/build.sh` orchestrates:

1. `scripts/apply-patch.sh` — overlays `patches/espeak-ng-phonemes.patch` onto
   the pinned `espeak-ng/` submodule (idempotent).
2. A **native** build to compile the phonemes-only English data
   (`ESPEAK_PHONEMES_ONLY=1`; the data compiler runs on the host).
3. `scripts/build-wasm.sh` — emscripten build of the translation-only library,
   emitting `espeak-phonemes.{wasm,js}` and `espeak-ng-data.tar.gz`.
4. `tsc` — compiles the TypeScript wrapper to `dist/esm/`.

### Bumping upstream eSpeak NG

```bash
git -C espeak-ng fetch && git -C espeak-ng checkout <new-sha>
git -C espeak-ng apply ../patches/espeak-ng-phonemes.patch   # re-roll if it fails
git add espeak-ng
npm run build && npm run test:golden                          # the corpus is the safety net
```

If the patch no longer applies after an upstream refactor, re-create it against
the new tree and commit the updated `patches/espeak-ng-phonemes.patch`. The
golden corpus (`tests/golden-corpus.ndjson`) is the oracle that confirms a bump
didn't change pronunciations.

## License

**AGPL-3.0-or-later**

A derivative of [eSpeak NG](https://github.com/espeak-ng/espeak-ng) (GPLv3).
Copyright (C) 2006–2024 Jonathan Duddington and contributors. The bundled
`espeak-ng-data.tar.gz` and the WASM binary are built from eSpeak NG source.
