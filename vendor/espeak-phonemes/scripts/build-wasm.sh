#!/usr/bin/env bash
# Emscripten build: compile the patched espeak-ng into a phonemes-only WASM
# module plus the English data asset, emitted into the repo root.
#
# Prerequisites:
#   - Emscripten SDK (emsdk) activated in PATH (source emsdk_env.sh)
#   - Native data already built at espeak-ng/build/espeak-ng-data/
#     (scripts/build.sh does this before calling us)
#
# Output (in repo root):
#   espeak-phonemes.wasm   - compiled WASM binary
#   espeak-phonemes.js     - Emscripten JS glue (ES6 module)
#   espeak-ng-data.tar     - uncompressed data asset (servers handle transport compression)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ESPEAK="$ROOT/espeak-ng"
BUILD_DIR="$ESPEAK/build-wasm"
DATA_DIR="$ESPEAK/build/espeak-ng-data"

if ! command -v emcmake &>/dev/null; then
  echo "Error: emcmake not found. Activate the Emscripten SDK first:" >&2
  echo "  source \"\$EMSDK/emsdk_env.sh\"" >&2
  exit 1
fi
echo "Using emcc: $(command -v emcc)"
emcc --version | head -1

if [ ! -d "$DATA_DIR" ]; then
  echo "Error: $DATA_DIR not found. Run the native data build first (scripts/build.sh)." >&2
  exit 1
fi

# --- Configure + build libespeak-ng.a with emscripten ---
echo "=== Configuring CMake (emscripten) ==="
emcmake cmake -B "$BUILD_DIR" -S "$ESPEAK" \
  -DCMAKE_BUILD_TYPE=Release \
  -DUSE_SYNTHESIS=OFF \
  -DUSE_KLATT=OFF \
  -DUSE_MBROLA=OFF \
  -DUSE_LIBSONIC=OFF \
  -DUSE_LIBPCAUDIO=OFF \
  -DUSE_ASYNC=OFF \
  -DUSE_SPEECHPLAYER=OFF \
  -DCOMPILE_INTONATIONS=OFF \
  -DENABLE_TESTS=OFF \
  -DBUILD_SHARED_LIBS=OFF

echo "=== Building static libraries ==="
cmake --build "$BUILD_DIR" -j"$(nproc)" --target espeak-ng
cmake --build "$BUILD_DIR" -j"$(nproc)" --target ucd

# --- Compile wrapper + link the final WASM module ---
echo "=== Linking WASM module ==="
mkdir -p "$BUILD_DIR/src/wasm"
emcc -c -o "$BUILD_DIR/src/wasm/wasm_wrapper.o" \
  "$ESPEAK/src/wasm/wasm_wrapper.c" \
  -Oz -flto

emcc \
  "$BUILD_DIR/src/wasm/wasm_wrapper.o" \
  "$BUILD_DIR/src/libespeak-ng/libespeak-ng.a" \
  "$BUILD_DIR/src/ucd-tools/libucd.a" \
  -Oz -flto \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web,node \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s FILESYSTEM=1 \
  -s TOTAL_STACK=65536 \
  -s INVOKE_RUN=0 \
  -s EXPORTED_FUNCTIONS="\
    _espeak_TextToPhonemes,\
    _espeak_TextToPhonemesWithTerminator,\
    _espeak_ng_Initialize,\
    _espeak_ng_InitializePath,\
    _espeak_Initialize,\
    _espeak_SetVoiceByName,\
    _espeak_ng_SetVoiceByName,\
    _malloc,\
    _free,\
    _path_home" \
  -s EXPORTED_RUNTIME_METHODS="\
    ccall,\
    cwrap,\
    UTF8ToString,\
    stringToUTF8,\
    lengthBytesUTF8,\
    setValue,\
    getValue,\
    HEAPU8,\
    HEAP32,\
    FS" \
  -o "$ROOT/espeak-phonemes.js"

echo "  -> wasm: $(wc -c < "$ROOT/espeak-phonemes.wasm") bytes"
echo "  -> js:   $(wc -c < "$ROOT/espeak-phonemes.js") bytes"

# --- wasm-opt post-pass (if available) ---
WASM_OPT="$(command -v wasm-opt 2>/dev/null || true)"
if [ -z "${WASM_OPT}" ] && [ -n "${EMSDK:-}" ]; then
  WASM_OPT="${EMSDK}/upstream/bin/wasm-opt"
fi
if [ -x "${WASM_OPT}" ]; then
  echo "=== wasm-opt -Oz ==="
  "${WASM_OPT}" -Oz \
    --enable-bulk-memory \
    --enable-nontrapping-float-to-int \
    --enable-mutable-globals \
    --enable-sign-ext \
    "$ROOT/espeak-phonemes.wasm" -o "$ROOT/espeak-phonemes.wasm"
  echo "  -> wasm after opt: $(wc -c < "$ROOT/espeak-phonemes.wasm") bytes"
else
  echo "=== wasm-opt not found, skipping ==="
fi

# --- Package the data asset ---
# Only what English g2p needs: the dictionary, phoneme tables, the 8-byte
# phondata stub, the intonation tunes (the voice file references them and
# phoneme-table loading fails without them), and the English voice files.
# The other ~138 languages' voice files are inert here and are dropped —
# verified to leave g2p output byte-identical.
echo "=== Packaging data asset (English g2p only) ==="
STAGE="$(mktemp -d)"
mkdir -p "$STAGE/espeak-ng-data/lang/gmw"
cp "$DATA_DIR/phondata"    "$STAGE/espeak-ng-data/"   # 8-byte stub (phonemes-only)
cp "$DATA_DIR/phonindex"   "$STAGE/espeak-ng-data/"
cp "$DATA_DIR/phontab"     "$STAGE/espeak-ng-data/"
cp "$DATA_DIR/intonations" "$STAGE/espeak-ng-data/"   # required by the voice's tunes
cp "$DATA_DIR/en_dict"     "$STAGE/espeak-ng-data/"
cp "$DATA_DIR"/lang/gmw/en* "$STAGE/espeak-ng-data/lang/gmw/"  # English voices only
# Emit an uncompressed tar: HTTP servers apply their own (better) transport
# compression, and shipping raw bytes avoids dev servers mislabeling a .gz as
# Content-Encoding: gzip (which makes the browser double-decode the body).
tar -cf "$ROOT/espeak-ng-data.tar" -C "$STAGE" espeak-ng-data
rm -rf "$STAGE"
echo "  -> data: $(wc -c < "$ROOT/espeak-ng-data.tar") bytes"

echo "=== WASM build complete ==="
