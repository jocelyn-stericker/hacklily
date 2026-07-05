#!/bin/bash
# Bootstrap Guile 3 → WebAssembly (Emscripten): download, patch, build, test.
#
# Produces, under $WORK (default ./work):
#   native-install/   native Guile 3.0.11 (compiles .go bytecode for the
#                     wasm build; Guile cross-builds need the same version)
#   wasm-install/     libguile-3.0.a + deps + share/ccache trees, all
#                     wasm32-unknown-emscripten
#   test/             node test binaries (and web/ if --browser)
#
# Usage:
#   ./bootstrap.sh            run everything (idempotent; stamps in work/.stamps)
#   ./bootstrap.sh --browser  also build the browser bundle and, if playwright
#                             is importable, run the headless-Chromium test
#   ./bootstrap.sh clean      delete the work dir
#
# Env overrides: GUILE_WASM_WORK (work dir), EMSDK_DIR (reuse an existing
# emsdk), JOBS (parallelism).
#
# Host prerequisites: gcc/make/pkg-config/curl/git/python3/gperf, plus native
# dev packages for Guile's own deps: libgc-dev, libgmp-dev, libffi-dev,
# libunistring-dev (Debian names).
#
# Background on every non-obvious flag and patch: GUILE-WASM-SPIKE.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
WORK="${GUILE_WASM_WORK:-$ROOT/work}"
JOBS="${JOBS:-$(nproc)}"
DL="$WORK/dl"
SRC="$WORK/src"
STAMPS="$WORK/.stamps"
NATIVE_PREFIX="$WORK/native-install"
PREFIX="$WORK/wasm-install"
EMSDK_VERSION=6.0.2

GUILE_V=3.0.11
GMP_V=6.3.0
UNISTRING_V=1.3
FFI_V=3.5.2
GC_V=8.2.12

if [ "${1:-}" = clean ]; then rm -rf "$WORK"; exit 0; fi
BROWSER=no
[ "${1:-}" = --browser ] && BROWSER=yes

mkdir -p "$WORK" "$DL" "$SRC" "$STAMPS"

log()  { printf '\n=== %s\n' "$*"; }
done_stage() { touch "$STAMPS/$1"; }
need_stage() { [ ! -f "$STAMPS/$1" ]; }

# --- 1. download (sha256-pinned) --------------------------------------------
fetch() { # url sha256
  local url=$1 sum=$2 f="$DL/$(basename "$1")"
  if [ ! -f "$f" ] || ! echo "$sum  $f" | sha256sum -c --quiet 2>/dev/null; then
    curl -fL --retry 3 -o "$f" "$url"
    echo "$sum  $f" | sha256sum -c --quiet
  fi
}

if need_stage download; then
  log "downloading sources"
  fetch "https://ftp.gnu.org/gnu/guile/guile-$GUILE_V.tar.xz" \
        818c79d236657a7fa96fb364137cc7b41b3bdee0d65c6174ca03769559579460
  fetch "https://ftp.gnu.org/gnu/gmp/gmp-$GMP_V.tar.xz" \
        a3c2b80201b89e68616f4ad30bc66aee4927c3ce50e33929ca819d5c43538898
  fetch "https://ftp.gnu.org/gnu/libunistring/libunistring-$UNISTRING_V.tar.gz" \
        8ea8ccf86c09dd801c8cac19878e804e54f707cf69884371130d20bde68386b7
  fetch "https://github.com/libffi/libffi/releases/download/v$FFI_V/libffi-$FFI_V.tar.gz" \
        f3a3082a23b37c293a4fcd1053147b371f2ff91fa7ea1b2a52e335676bac82dc
  fetch "https://github.com/bdwgc/bdwgc/releases/download/v$GC_V/gc-$GC_V.tar.gz" \
        42e5194ad06ab6ffb806c83eb99c03462b495d979cda782f3c72c08af833cd4e
  done_stage download
fi

# --- 2. emsdk ----------------------------------------------------------------
if [ -n "${EMSDK_DIR:-}" ]; then
  EMSDK="$EMSDK_DIR"
else
  EMSDK="$WORK/emsdk"
  if need_stage emsdk; then
    log "installing emsdk $EMSDK_VERSION"
    [ -d "$EMSDK" ] || git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK"
    "$EMSDK/emsdk" install "$EMSDK_VERSION"
    "$EMSDK/emsdk" activate "$EMSDK_VERSION"
    done_stage emsdk
  fi
fi
source "$EMSDK/emsdk_env.sh" >/dev/null 2>&1
NODE="${EMSDK_NODE:-$(command -v node)}"
log "emcc: $(emcc --version | head -1)"

# --- 3. extract + patch ------------------------------------------------------
if need_stage extract; then
  log "extracting and patching"
  rm -rf "$SRC"/guile-$GUILE_V "$SRC"/gmp-$GMP_V "$SRC"/libunistring-$UNISTRING_V \
         "$SRC"/libffi-$FFI_V "$SRC"/gc-$GC_V
  tar -C "$SRC" -xf "$DL/guile-$GUILE_V.tar.xz"
  tar -C "$SRC" -xf "$DL/gmp-$GMP_V.tar.xz"
  tar -C "$SRC" -xf "$DL/libunistring-$UNISTRING_V.tar.gz"
  tar -C "$SRC" -xf "$DL/libffi-$FFI_V.tar.gz"
  tar -C "$SRC" -xf "$DL/gc-$GC_V.tar.gz"
  # bdwgc: register wasm static data as GC roots (else Guile dies at boot)
  patch -p1 -d "$SRC/gc-$GC_V" < "$ROOT/patches/bdwgc-$GC_V-emscripten-static-roots.patch"
  # guile: fix function-pointer casts that wasm's typed call_indirect traps on
  patch -p1 -d "$SRC/guile-$GUILE_V" < "$ROOT/patches/guile-$GUILE_V-wasm-function-pointer-casts.patch"
  done_stage extract
fi

# --- 4. native guile (compiles .go bytecode for the cross build) -------------
if need_stage native-guile; then
  log "building native Guile $GUILE_V (host compiler for .go bytecode)"
  mkdir -p "$WORK/build-native-guile"
  (cd "$WORK/build-native-guile"
   "$SRC/guile-$GUILE_V/configure" --prefix="$NATIVE_PREFIX" \
       --disable-static > configure.log 2>&1
   make -j"$JOBS" > build.log 2>&1
   make install > install.log 2>&1)
  "$NATIVE_PREFIX/bin/guile" --version | head -1
  done_stage native-guile
fi

# --- 5. wasm dependencies -----------------------------------------------------
# Conftests run under node via emconfigure; gnulib's nanosleep test uses
# alarm(), which Emscripten never delivers → pre-seed or configure hangs.
export gl_cv_func_nanosleep=yes gl_cv_func_select_supports0=yes gl_cv_func_sleep_works=yes
export CFLAGS="-O2"

build_dep() { # name srcdir extra-configure-args...
  local name=$1 dir=$2; shift 2
  if need_stage "dep-$name"; then
    log "building $name (wasm)"
    (cd "$SRC/$dir"
     emconfigure ./configure --host=wasm32-unknown-emscripten \
       --disable-shared --enable-static --prefix="$PREFIX" "$@" \
       > "$WORK/$name-configure.log" 2>&1
     emmake make -j"$JOBS" > "$WORK/$name-build.log" 2>&1
     emmake make install > "$WORK/$name-install.log" 2>&1)
    done_stage "dep-$name"
  fi
}

build_dep gmp gmp-$GMP_V --disable-assembly CC_FOR_BUILD=gcc CPP_FOR_BUILD="gcc -E"
build_dep unistring libunistring-$UNISTRING_V
build_dep ffi libffi-$FFI_V --disable-docs
build_dep gc gc-$GC_V --disable-threads --disable-parallel-mark --disable-gcj-support

# --- 6. wasm guile ------------------------------------------------------------
if need_stage wasm-guile; then
  log "cross-compiling Guile $GUILE_V to wasm32-unknown-emscripten"
  mkdir -p "$WORK/build-wasm-guile"
  (cd "$WORK/build-wasm-guile"
   # Both --build and --host → cross_compiling=yes without running a conftest,
   # so configure takes the GUILE_FOR_BUILD path and gnulib uses cross guesses.
   # emconfigure clobbers PKG_CONFIG_LIBDIR; EM_PKG_CONFIG_PATH is the passthrough.
   # strtol_l/strtod_l: musl exports the symbols but emscripten headers don't
   # declare them; force the fallback.
   EM_PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig" \
   emconfigure "$SRC/guile-$GUILE_V/configure" \
     --build="$(gcc -dumpmachine)" \
     --host=wasm32-unknown-emscripten \
     --prefix="$PREFIX" \
     --disable-shared --enable-static \
     --enable-jit=no --without-threads --disable-networking --disable-nls \
     GUILE_FOR_BUILD="$NATIVE_PREFIX/bin/guile" \
     ac_cv_func_strtol_l=no ac_cv_func_strtod_l=no \
     CFLAGS="-O2 -g2" CPPFLAGS="-I$PREFIX/include" LDFLAGS="-L$PREFIX/lib" \
     > configure.log 2>&1
   emmake make -j"$JOBS" > build.log 2>&1
   emmake make install > install.log 2>&1)
  done_stage wasm-guile
fi

# --- 7. link + run the tests --------------------------------------------------
# -g2: keep the name section; the --spill-pointers Binaryen pass (which makes
# pointers in wasm locals visible to bdwgc's conservative scan) needs to find
# __stack_pointer by name. 8 MB stack: Guile's C stack use is deep.
TESTDIR="$WORK/test"
mkdir -p "$TESTDIR"
GUILE_FLAGS="$(PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig" pkg-config --static --cflags --libs guile-3.0)"
WASM_LINK="-sBINARYEN_EXTRA_PASSES=--spill-pointers -sSTACK_SIZE=8388608 -sEXIT_RUNTIME=1"

log "building node tests"
emcc -O2 -g2 "$ROOT/eval-test.c"     $GUILE_FLAGS $WASM_LINK -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 -o "$TESTDIR/eval-test.js"
emcc -O2 -g2 "$ROOT/lily-api-test.c" $GUILE_FLAGS $WASM_LINK -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 -o "$TESTDIR/lily-api-test.js"

# MEMFS variant proves the FS-image packaging the browser needs. The pre-js
# fixes the two MEMFS gotchas: mtimes (packager loses them, .go files look
# stale, Guile silently falls back to source + interpreter) and auto-compile.
cat > "$TESTDIR/guile-env-pre.js" <<EOF
Module.preRun = Module.preRun || [];
Module.preRun.push(() => { ENV.GUILE_AUTO_COMPILE = '0'; });
Module.onRuntimeInitialized = () => {
  const future = Date.now() + 864e5;
  const walk = (dir) => {
    for (const name of FS.readdir(dir)) {
      if (name === '.' || name === '..') continue;
      const p = dir + '/' + name;
      if (FS.isDir(FS.stat(p).mode)) walk(p); else FS.utime(p, future, future);
    }
  };
  walk('$PREFIX/lib/guile/3.0/ccache');
};
EOF
PRELOAD="--preload-file $PREFIX/share/guile/3.0@$PREFIX/share/guile/3.0 \
         --preload-file $PREFIX/lib/guile/3.0/ccache@$PREFIX/lib/guile/3.0/ccache"
emcc -O2 -g2 "$ROOT/run-scheme.c" $GUILE_FLAGS $WASM_LINK -sINITIAL_MEMORY=1024MB \
  -sENVIRONMENT=node -sFORCE_FILESYSTEM=1 --pre-js "$TESTDIR/guile-env-pre.js" \
  $PRELOAD -o "$TESTDIR/run-scheme-memfs.js"

log "running node tests"
(cd "$TESTDIR"
 "$NODE" eval-test.js
 "$NODE" lily-api-test.js
 "$NODE" run-scheme-memfs.js '(list "MEMFS:" (+ 1 2) ((lambda (n) (* n n)) 21))')

if [ "$BROWSER" = yes ]; then
  log "building browser bundle"
  mkdir -p "$TESTDIR/web"
  # Fixed memory: with ALLOW_MEMORY_GROWTH the heap ArrayBuffer is resizable
  # and Chromium's TextDecoder rejects it (emscripten 6.0.2).
  emcc -O2 -g2 "$ROOT/eval-test.c" $GUILE_FLAGS $WASM_LINK -sINITIAL_MEMORY=1024MB \
    -sENVIRONMENT=web --pre-js "$TESTDIR/guile-env-pre.js" \
    $PRELOAD -o "$TESTDIR/web/eval-test.html"
  if "$NODE" -e "require.resolve('playwright')" >/dev/null 2>&1; then
    log "running headless-Chromium test"
    WEBDIR="$TESTDIR/web" "$NODE" "$ROOT/browser-test.js"
  else
    log "playwright not found; serve $TESTDIR/web/eval-test.html and check the console"
  fi
fi

log "all done — wasm Guile in $PREFIX"
