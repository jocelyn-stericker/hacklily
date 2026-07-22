# ort-silero-vad-wasm-minimal

This is a WebAssembly build of [onnx](https://github.com/microsoft/onnxruntime)
for [Silero Voice Activity Detection
(VAD)](https://github.com/snakers4/silero-vad). It's much smaller because we
disable every operation that model does not need, as well as most optional
features. We also use a build optimized for **size**, not **speed**. Silero VAD
is tiny and fast, so this is a good trade-off for my use case!

```diff
- dist/assets/ort-wasm-simd-threaded-CDsxkEtH.wasm  13,022.40 kB │ gzip: 3,391.83 kB
+ dist/assets/ort-wasm-simd-threaded-Da1-zUmH.wasm  1,364.31 kB │ gzip: 476.09 kB
```

Basically, if you happen to be using ONNX specifically for Silero, you can reduce
the uncompressed wasm size from 13MB to 1.4MB by installing and using this module.

Add this to your project's `.npmrc`:
```
@jocelyn-stericker:registry=https://slop.nettek.ca/api/packages/jocelyn-stericker/npm/
```

Install a pinned version (I do not guarantee compatibility from one build to another):
```bash
npm install --save-exact @jocelyn-stericker/ort-silero-vad-wasm-minimal
```

Then, initialize onnxruntime (ort) like:

```ts
import * as ort from 'onnxruntime-web/wasm' // NOT from this module!

import ortMjsUrl from '@jocelyn-stericker/ort-silero-vad-wasm-minimal/ort-wasm-simd-threaded.mjs?url'
import ortWasmUrl from '@jocelyn-stericker/ort-silero-vad-wasm-minimal/ort-wasm-simd-threaded.wasm?url'
import vadModelUrl from '@jocelyn-stericker/ort-silero-vad-wasm-minimal/silero_vad_v6_16k_op15.ort?url'

ort.env.wasm.wasmPaths = { wasm: ortWasmUrl, mjs: ortMjsUrl }
ort.InferenceSession.create(vadModelUrl).then((sess) => { ... }
```

Finally, you'll need to add `onnxruntime-web-use-extern-wasm` as an import condition in your bundler to
avoid loading both models. e.g., in `vite.config.ts`:

```ts
const config = defineConfig({
  resolve: {
    conditions: ['onnxruntime-web-use-extern-wasm']
  }
})
```

But realistically, I don't expect anyone else to use this. Feel free if you
want, but it's probably easier to fork this or vibe code your own build! If I
can help for either case, please reach out!

## Build

The pipeline is on `./.forgejo/workflows/ci.yaml`. It runs on push. The version
number bumps every time it runs.
