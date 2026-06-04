#!/usr/bin/env bash
# Full build: patch espeak-ng, build the phonemes-only English data natively,
# cross-compile the WASM module with emscripten, then compile the TypeScript.
#
# Prerequisites: cmake, a C toolchain, an activated emsdk, and `npm install`
# already run (for tsc + @types/node).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ESPEAK="$ROOT/espeak-ng"

# 0. Ensure the submodule (and its nested submodules, e.g. ucd-tools) are present.
if [ ! -e "$ESPEAK/src/ucd-tools/CMakeLists.txt" ]; then
  echo "=== Initializing submodules ==="
  git -C "$ROOT" submodule update --init --recursive
fi

# 1. Overlay our source changes onto the pinned upstream commit.
echo "=== Applying espeak-ng patch ==="
bash "$ROOT/scripts/apply-patch.sh"

# 2. Native build → phonemes-only English data.
#    The data compiler runs on the host, so this must be a native (non-wasm)
#    build. ESPEAK_PHONEMES_ONLY makes phondata an 8-byte stub — it is read at
#    runtime by the data compiler (compiledata.c). The `data` target is part of
#    ALL, so export the var for the whole native build rather than only the
#    `data` target, otherwise `all` compiles full phondata before we get to it.
echo "=== Native build (host) for data ==="
export ESPEAK_PHONEMES_ONLY=1
cmake -S "$ESPEAK" -B "$ESPEAK/build" \
  -DCMAKE_BUILD_TYPE=Release \
  -DUSE_SYNTHESIS=OFF \
  -DUSE_KLATT=OFF \
  -DUSE_MBROLA=OFF \
  -DUSE_LIBSONIC=OFF \
  -DUSE_LIBPCAUDIO=OFF \
  -DUSE_ASYNC=OFF
cmake --build "$ESPEAK/build" -j"$(nproc)"

# 3. Emscripten build → espeak-phonemes.{wasm,js} + espeak-ng-data.tar.
echo "=== Emscripten build ==="
bash "$ROOT/scripts/build-wasm.sh"

# 4. TypeScript build → dist/esm.
echo "=== TypeScript build ==="
cd "$ROOT"
npx tsc -p tsconfig.json

echo "=== Build complete ==="
ls -lh "$ROOT"/espeak-phonemes.wasm "$ROOT"/espeak-phonemes.js "$ROOT"/espeak-ng-data.tar
