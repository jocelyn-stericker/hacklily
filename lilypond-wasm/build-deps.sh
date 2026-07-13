#!/bin/bash
# Build Guile's dependencies with Emscripten, static, into wasm-install/.
set -ex
cd "$(dirname "$0")"
source emsdk/emsdk_env.sh
PREFIX="$PWD/wasm-install"
mkdir -p "$PREFIX"
export CFLAGS="-O2"

# Pre-seed autoconf cache for runtime tests that hang under node
# (they rely on alarm()/SIGALRM, which Emscripten doesn't deliver).
export gl_cv_func_nanosleep=yes
export gl_cv_func_select_supports0=yes
export gl_cv_func_sleep_works=yes

STAGE="${1:-all}"

if [ "$STAGE" = gmp ] || [ "$STAGE" = all ]; then
  (cd gmp-6.3.0
   emconfigure ./configure --host=wasm32-unknown-emscripten \
     --disable-assembly --disable-shared --enable-static \
     --prefix="$PREFIX" CC_FOR_BUILD=gcc CPP_FOR_BUILD="gcc -E"
   emmake make -j"$(nproc)"
   emmake make install)
fi

if [ "$STAGE" = unistring ] || [ "$STAGE" = all ]; then
  (cd libunistring-1.3
   emconfigure ./configure --host=wasm32-unknown-emscripten \
     --disable-shared --enable-static --prefix="$PREFIX"
   emmake make -j"$(nproc)"
   emmake make install)
fi

if [ "$STAGE" = ffi ] || [ "$STAGE" = all ]; then
  (cd libffi-3.5.2
   emconfigure ./configure --host=wasm32-unknown-emscripten \
     --disable-shared --enable-static --disable-docs --prefix="$PREFIX"
   emmake make -j"$(nproc)"
   emmake make install)
fi

if [ "$STAGE" = gc ] || [ "$STAGE" = all ]; then
  (cd gc-8.2.12
   emconfigure ./configure --host=wasm32-unknown-emscripten \
     --disable-shared --enable-static --disable-threads \
     --disable-parallel-mark --disable-gcj-support \
     --prefix="$PREFIX"
   emmake make -j"$(nproc)"
   emmake make install)
fi
