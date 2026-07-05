#!/bin/bash
# Cross-compile Guile 3.0.11 to wasm32-unknown-emscripten.
# Native Guile 3.0.11 (install/bin/guile) compiles the .go bytecode.
set -ex
cd "$(dirname "$0")"
source emsdk/emsdk_env.sh
PREFIX="$PWD/wasm-install"
NATIVE_GUILE="$PWD/install/bin/guile"

# Fresh source tree (guile-3.0.11/ already hosts the native in-tree build).
mkdir -p guile-wasm-src
[ -d guile-wasm-src/guile-3.0.11 ] || tar -C guile-wasm-src -xf guile-3.0.11.tar.xz
mkdir -p guile-wasm-build
cd guile-wasm-build

# Passing both --build and --host forces cross_compiling=yes, so configure
# uses GUILE_FOR_BUILD and AC_RUN_IFELSE takes cross guesses instead of
# running conftests under node.
# emconfigure overwrites PKG_CONFIG_LIBDIR/PKG_CONFIG_PATH with the
# emscripten sysroot; EM_PKG_CONFIG_PATH is its passthrough for extra dirs.
export EM_PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig"
if [ ! -f Makefile ]; then
  emconfigure ../guile-wasm-src/guile-3.0.11/configure \
    --build=aarch64-unknown-linux-gnu \
    --host=wasm32-unknown-emscripten \
    --prefix="$PREFIX" \
    --disable-shared --enable-static \
    --enable-jit=no \
    --without-threads \
    --disable-networking \
    --disable-nls \
    GUILE_FOR_BUILD="$NATIVE_GUILE" \
    ac_cv_func_strtol_l=no ac_cv_func_strtod_l=no \
    CFLAGS="-O2 -g2" \
    CPPFLAGS="-I$PREFIX/include" \
    LDFLAGS="-L$PREFIX/lib"
fi

emmake make -j"$(nproc)"
echo "MAKE_EXIT=$?"
