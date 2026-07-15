#!/bin/bash
# Bootstrap Guile 3 → WebAssembly (Emscripten): download, patch, build, test.
#
# Produces, under $WORK (default ./work):
#   native-install/   native Guile 3.0.11 (compiles .go bytecode for the
#                     wasm build; Guile cross-builds need the same version)
#   wasm-install/     libguile-3.0.a + deps + share/ccache trees, all
#                     wasm32-unknown-emscripten
#   test/             node test binaries (and web/ + web-lily/ if --browser)
#   dist/             npm-publishable browser bundle (if --browser): the four
#                     files hacklily serves + dev HTML + README + package.json
#
# Usage:
#   ./bootstrap.sh            run everything (idempotent; stamps in work/.stamps)
#   ./bootstrap.sh --browser  also build the browser bundle and dist/, and, if
#                             playwright is importable, run the headless-Chromium
#                             test
#
# Headless-Chromium tests need a one-time setup that CI does for you but a
# fresh checkout does not:
#   npm install playwright
#   npx playwright install --with-deps chromium   # browser + apt system libs
# (libnspr4/libnss3/...; without --with-deps chromium launches then dies on
# the first missing .so, and bootstrap.sh fails in the test step.)
#   ./bootstrap.sh clean      delete the work dir
#
# Env overrides: GUILE_WASM_WORK (work dir), EMSDK_DIR (reuse an existing
# emsdk), JOBS (parallelism).
#
# Host prerequisites: gcc/make/pkg-config/curl/git/python3/gperf, plus native
# dev packages for Guile's own deps: libgc-dev, libgmp-dev, libffi-dev,
# libunistring-dev (Debian names). The LilyPond rendering-stack stages
# additionally need: meson (>= 1.3), ninja-build, python3-packaging.
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

# LilyPond rendering-stack deps (the layer LilyPond's configure gates on;
# see GUILE-WASM-SPIKE.md "What this means for lilypond.wasm")
ZLIB_V=1.3.1
LIBPNG_V=1.6.43
FREETYPE_V=2.13.3
EXPAT_V=2.7.1
FONTCONFIG_V=2.15.0
PCRE2_V=10.44
GLIB_V=2.80.3
FRIBIDI_V=1.0.16
HARFBUZZ_V=8.5.0
PIXMAN_V=0.42.2
CAIRO_V=1.18.4
PANGO_V=1.52.2

# LilyPond itself (built when the required host tools are present; see the
# final stage)
LILYPOND_V=2.27.1

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

if need_stage download-lily-deps; then
  log "downloading LilyPond rendering-stack sources"
  # zlib.net deletes old tarballs on every release; use the GitHub mirror.
  fetch "https://github.com/madler/zlib/releases/download/v$ZLIB_V/zlib-$ZLIB_V.tar.gz" \
        9a93b2b7dfdac77ceba5a558a580e74667dd6fede4585b91eefb60f03b72df23
  fetch "https://downloads.sourceforge.net/project/libpng/libpng16/$LIBPNG_V/libpng-$LIBPNG_V.tar.xz" \
        6a5ca0652392a2d7c9db2ae5b40210843c0bbc081cbd410825ab00cc59f14a6c
  fetch "https://download.savannah.gnu.org/releases/freetype/freetype-$FREETYPE_V.tar.xz" \
        0550350666d427c74daeb85d5ac7bb353acba5f76956395995311a9c6f063289
  fetch "https://github.com/libexpat/libexpat/releases/download/R_${EXPAT_V//./_}/expat-$EXPAT_V.tar.xz" \
        354552544b8f99012e5062f7d570ec77f14b412a3ff5c7d8d0dae62c0d217c30
  fetch "https://www.freedesktop.org/software/fontconfig/release/fontconfig-$FONTCONFIG_V.tar.xz" \
        63a0658d0e06e0fa886106452b58ef04f21f58202ea02a94c39de0d3335d7c0e
  fetch "https://github.com/PCRE2Project/pcre2/releases/download/pcre2-$PCRE2_V/pcre2-$PCRE2_V.tar.bz2" \
        d34f02e113cf7193a1ebf2770d3ac527088d485d4e047ed10e5d217c6ef5de96
  fetch "https://download.gnome.org/sources/glib/${GLIB_V%.*}/glib-$GLIB_V.tar.xz" \
        3947a0eaddd0f3613d0230bb246d0c69e46142c19022f5c4b1b2e3cba236d417
  fetch "https://github.com/fribidi/fribidi/releases/download/v$FRIBIDI_V/fribidi-$FRIBIDI_V.tar.xz" \
        1b1cde5b235d40479e91be2f0e88a309e3214c8ab470ec8a2744d82a5a9ea05c
  fetch "https://github.com/harfbuzz/harfbuzz/releases/download/$HARFBUZZ_V/harfbuzz-$HARFBUZZ_V.tar.xz" \
        77e4f7f98f3d86bf8788b53e6832fb96279956e1c3961988ea3d4b7ca41ddc27
  fetch "https://www.cairographics.org/releases/pixman-$PIXMAN_V.tar.gz" \
        ea1480efada2fd948bc75366f7c349e1c96d3297d09a3fe62626e38e234a625e
  fetch "https://www.cairographics.org/releases/cairo-$CAIRO_V.tar.xz" \
        445ed8208a6e4823de1226a74ca319d3600e83f6369f99b14265006599c32ccb
  fetch "https://download.gnome.org/sources/pango/${PANGO_V%.*}/pango-$PANGO_V.tar.xz" \
        d0076afe01082814b853deec99f9349ece5f2ce83908b8e58ff736b41f78a96b
  fetch "https://lilypond.org/download/sources/v${LILYPOND_V%.*}/lilypond-$LILYPOND_V.tar.gz" \
        ab81ac451ee247db3af0980bef6d87834647fd90ad04e1d98730f1bfd285d393
  done_stage download-lily-deps
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
  # GROWABLE_ARRAYBUFFERS=0: with plain ALLOW_MEMORY_GROWTH, emscripten 6.0.2
  # exposes the heap as a *resizable* ArrayBuffer (wasmMemory.toResizableBuffer)
  # and Chromium's TextDecoder rejects views on it. =0 keeps the classic
  # non-resizable buffer (views re-created on grow), which TextDecoder accepts.
  emcc -O2 -g2 "$ROOT/eval-test.c" $GUILE_FLAGS $WASM_LINK \
    -sALLOW_MEMORY_GROWTH=1 -sGROWABLE_ARRAYBUFFERS=0 \
    -sENVIRONMENT=web --pre-js "$TESTDIR/guile-env-pre.js" \
    $PRELOAD -o "$TESTDIR/web/eval-test.html"
  if "$NODE" -e "require.resolve('playwright')" >/dev/null 2>&1; then
    log "running headless-Chromium test"
    WEBDIR="$TESTDIR/web" "$NODE" "$ROOT/browser-test.js"
  else
    log "playwright not found; serve $TESTDIR/web/eval-test.html and check the console"
  fi
fi

# --- 8. LilyPond rendering-stack deps -----------------------------------------
# The layer LilyPond 2.27's configure hard-gates on (all PKG_CHECK_MODULES):
# fontconfig, freetype2, glib-2.0, gobject-2.0, pangoft2, cairo, libpng, zlib
# (bdw-gc and guile-3.0 are already above). pcre2 avoids meson wrap downloads;
# fribidi and harfbuzz are pango's own deps. Everything static, single-
# threaded: -pthread under emcc flips codegen to shared-memory atomics, which
# we never want — see the no-pthread patches and per-package notes below.

if need_stage extract-lily-deps; then
  log "extracting and patching LilyPond rendering-stack sources"
  for d in zlib-$ZLIB_V libpng-$LIBPNG_V freetype-$FREETYPE_V expat-$EXPAT_V \
           fontconfig-$FONTCONFIG_V pcre2-$PCRE2_V glib-$GLIB_V \
           fribidi-$FRIBIDI_V harfbuzz-$HARFBUZZ_V pixman-$PIXMAN_V \
           cairo-$CAIRO_V pango-$PANGO_V; do
    rm -rf "$SRC/$d"
    tar -C "$SRC" -xf "$DL/${d%%-[0-9]*}-${d##*-}".tar.*
  done
  # glib: kleisauke/wasm-vips's maintained Emscripten series (network shims,
  # posix_spawn, function-pointer-cast fixes), then ours to keep meson's
  # threads dependency (-pthread) out of a single-threaded build.
  patch -p1 -d "$SRC/glib-$GLIB_V" < "$ROOT/patches/glib-$GLIB_V-emscripten-wasm-vips.patch"
  patch -p1 -d "$SRC/glib-$GLIB_V" < "$ROOT/patches/glib-$GLIB_V-emscripten-no-pthread.patch"
  # LilyPond needs GRegex (lily/glib-regex-scheme.cc); the wasm-vips series
  # removes it along with its pcre2 dependency, so reverse that one commit
  # (extracted verbatim from the series). pcre2 is already in the prefix.
  patch -p1 -R -d "$SRC/glib-$GLIB_V" < "$ROOT/patches/glib-$GLIB_V-gregex-removal-to-reverse.patch"
  # glib entry points that smuggle a narrower callback through a wider
  # callback type (g_list_sort, g_array_sort, g_*_free_full, weak pointers,
  # ...) and call it at the wider arity — same call_indirect-trap UB family
  # as the pango and Guile patches; fixed with typed trampolines.
  patch -p1 -d "$SRC/glib-$GLIB_V" < "$ROOT/patches/glib-$GLIB_V-wasm-callback-casts.patch"
  patch -p1 -d "$SRC/harfbuzz-$HARFBUZZ_V" < "$ROOT/patches/harfbuzz-$HARFBUZZ_V-emscripten-no-pthread.patch"
  # pango: run the deferred-FcInit/match/sort worker ops synchronously on
  # wasm (no threads) + give iface_init functions their true 2-arg signature
  # (1-arg versions trap wasm's typed call_indirect — same UB family as the
  # Guile hashtab patch).
  patch -p1 -d "$SRC/pango-$PANGO_V" < "$ROOT/patches/pango-$PANGO_V-wasm-single-thread-and-callback-casts.patch"
  # cairo: production Hacklily's SVG point-and-click patch. Stock cairo's
  # SVG surface never implemented the tag hook (only PDF did), so LilyPond's
  # CAIRO_TAG_LINK textedit: anchors are silently dropped without it.
  # Adapted from unmerged cairo MR !254; same patch the hacklily-renderer
  # image applies (server/renderer-unstable/svg-links.patch).
  patch -p1 -d "$SRC/cairo-$CAIRO_V" < "$ROOT/patches/cairo-$CAIRO_V-svg-links.patch"
  # pango's tests need GIOChannel, which the wasm-vips glib patch trims.
  sed -i "s/^subdir('tests')/# &  # wasm: needs GIOChannel/" "$SRC/pango-$PANGO_V/meson.build"
  # fontconfig's bundled config.sub predates the wasm32 triplet.
  cp "$SRC/guile-$GUILE_V/build-aux/config.sub" "$SRC/fontconfig-$FONTCONFIG_V/"
  done_stage extract-lily-deps
fi

# Meson cross file (glib, harfbuzz, cairo, pango). pkg_config_libdir keeps
# host libraries invisible; --prefer-static (below) makes meson use
# pkg-config --static so Requires.private chains (e.g. fontconfig -> expat)
# reach the link line.
MESON_CROSS="$WORK/emscripten-cross.meson"
cat > "$MESON_CROSS" <<EOF
[binaries]
c = 'emcc'
cpp = 'em++'
ar = 'emar'
ranlib = 'emranlib'
strip = 'emstrip'
pkg-config = 'pkg-config'
exe_wrapper = 'node'

[properties]
pkg_config_libdir = '$PREFIX/lib/pkgconfig'

[host_machine]
system = 'emscripten'
cpu_family = 'wasm32'
cpu = 'wasm32'
endian = 'little'
EOF

# Autotools cross builds: pass BOTH --build and --host (same lesson as
# Guile's configure: with --host alone, conftests run under node and
# cross_compiling stays 'no', so build-machine tools get compiled with emcc).
BUILD_TRIPLET="$(gcc -dumpmachine)"
# emconfigure clobbers PKG_CONFIG_LIBDIR/PATH; EM_PKG_CONFIG_PATH survives
# (freetype/fontconfig/etc. find zlib, libpng, expat through it).
export EM_PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig"

lily_dep() { # name dir extra-configure-args...
  local name=$1 dir=$2; shift 2
  if need_stage "dep-$name"; then
    log "building $name (wasm)"
    (cd "$SRC/$dir"
     emconfigure ./configure --build="$BUILD_TRIPLET" \
       --host=wasm32-unknown-emscripten \
       --disable-shared --enable-static --prefix="$PREFIX" "$@" \
       > "$WORK/$name-configure.log" 2>&1
     emmake make -j"$JOBS" > "$WORK/$name-build.log" 2>&1
     emmake make install > "$WORK/$name-install.log" 2>&1)
    done_stage "dep-$name"
  fi
}

meson_dep() { # name dir extra-meson-args...
  local name=$1 dir=$2; shift 2
  if need_stage "dep-$name"; then
    log "building $name (wasm, meson)"
    (cd "$SRC/$dir"
     rm -rf _build
     meson setup _build --cross-file "$MESON_CROSS" --prefix="$PREFIX" \
       --default-library=static --prefer-static --buildtype=release "$@" \
       > "$WORK/$name-setup.log" 2>&1
     ninja -C _build -j"$JOBS" > "$WORK/$name-build.log" 2>&1
     meson install -C _build > "$WORK/$name-install.log" 2>&1)
    done_stage "dep-$name"
  fi
}

if need_stage dep-zlib; then
  log "building zlib (wasm)"
  (cd "$SRC/zlib-$ZLIB_V"
   emconfigure ./configure --static --prefix="$PREFIX" > "$WORK/zlib-configure.log" 2>&1
   emmake make -j"$JOBS" libz.a > "$WORK/zlib-build.log" 2>&1
   emmake make install > "$WORK/zlib-install.log" 2>&1)
  done_stage dep-zlib
fi

lily_dep libpng libpng-$LIBPNG_V \
  CPPFLAGS="-I$PREFIX/include" LDFLAGS="-L$PREFIX/lib"

# CC_BUILD=gcc: the apinames helper runs on the build machine (a wasm build
# of it can't write ftexport.sym without NODERAWFS). PTHREAD_*=" ": AX_PTHREAD
# tries user flags first and empty flags "work" (musl stubs), keeping
# -pthread out of CFLAGS. harfbuzz=no breaks the freetype<->harfbuzz cycle;
# pango drives harfbuzz itself, LilyPond doesn't need freetype's hb hooks.
lily_dep freetype freetype-$FREETYPE_V \
  CC_BUILD=gcc PTHREAD_CFLAGS=" " PTHREAD_LIBS=" " \
  --with-zlib=yes --with-png=yes --with-harfbuzz=no --with-brotli=no \
  --with-bzip2=no

lily_dep expat expat-$EXPAT_V \
  --without-docbook --without-tests --without-examples

# sysconfdir/localstatedir under the prefix so the fonts.conf tree can be
# preloaded into MEMFS as-is; cross build skips fc-cache at install.
lily_dep fontconfig fontconfig-$FONTCONFIG_V \
  --sysconfdir="$PREFIX/etc" --localstatedir="$PREFIX/var" --disable-docs

lily_dep pcre2 pcre2-$PCRE2_V

meson_dep glib glib-$GLIB_V \
  -Dselinux=disabled -Dxattr=false -Dlibmount=disabled \
  -Dman-pages=disabled -Ddocumentation=false -Dtests=false \
  -Dintrospection=disabled -Dnls=disabled -Dglib_debug=disabled

lily_dep fribidi fribidi-$FRIBIDI_V --disable-docs

# harfbuzz: disable asserts in the release build (-Db_ndebug=if-release),
# matching what upstream harfbuzz itself does from ~9.x on (its meson.build
# sets 'b_ndebug=if-release') and what prod ships (Debian sid's harfbuzz 12.x,
# built as release -> NDEBUG).  Without it, 8.5.0's meson.build leaves meson's
# default b_ndebug=false, so hb_buffer_add_utf8's assert_unicode() is live and
# aborts on a buffer pango hands back in GLYPHS state without clearing — a
# benign reuse prod tolerates (assert is a no-op there) but that takes down the
# whole wasm render, e.g. on a score whose header has C1 control chars
# (U+0080-U+009F, from UTF-8-decoded-as-Latin-1 mojibake).
meson_dep harfbuzz harfbuzz-$HARFBUZZ_V \
  -Db_ndebug=if-release \
  -Dfreetype=enabled -Dglib=enabled -Dgobject=disabled -Dicu=disabled \
  -Dcairo=disabled -Dtests=disabled -Ddocs=disabled -Dbenchmark=disabled \
  -Dintrospection=disabled -Dutilities=disabled

# Library only: pixman's configure hard-codes a -pthread probe that emcc
# accepts, poisoning the demos/test links; the library never sees the flags.
if need_stage dep-pixman; then
  log "building pixman (wasm)"
  (cd "$SRC/pixman-$PIXMAN_V"
   emconfigure ./configure --build="$BUILD_TRIPLET" \
     --host=wasm32-unknown-emscripten \
     --disable-shared --enable-static --prefix="$PREFIX" \
     --disable-arm-simd --disable-arm-neon --disable-arm-a64-neon \
     --disable-mmx --disable-sse2 --disable-ssse3 --disable-vmx \
     --disable-mips-dspr2 --disable-gtk --disable-libpng \
     > "$WORK/pixman-configure.log" 2>&1
   emmake make -j"$JOBS" -C pixman > "$WORK/pixman-build.log" 2>&1
   emmake make -C pixman install > "$WORK/pixman-install.log" 2>&1
   emmake make install-pkgconfigDATA >> "$WORK/pixman-install.log" 2>&1)
  done_stage dep-pixman
fi

meson_dep cairo cairo-$CAIRO_V \
  -Dfontconfig=enabled -Dfreetype=enabled \
  -Dxlib=disabled -Dxcb=disabled -Dquartz=disabled -Ddwrite=disabled \
  -Dglib=disabled -Dspectre=disabled -Dsymbol-lookup=disabled \
  -Dtests=disabled -Dzlib=enabled -Dpng=enabled

# glib-mkenums (arch-independent python) came with the cross glib; expose it
# so meson doesn't fall back to a glib subproject build.
if need_stage dep-pango; then
  log "building pango (wasm, meson)"
  (cd "$SRC/pango-$PANGO_V"
   rm -rf _build
   PATH="$PREFIX/bin:$PATH" \
   meson setup _build --cross-file "$MESON_CROSS" --prefix="$PREFIX" \
     --default-library=static --prefer-static --buildtype=release \
     -Dfontconfig=enabled -Dfreetype=enabled -Dcairo=enabled \
     -Dxft=disabled -Dlibthai=disabled -Dsysprof=disabled \
     -Dintrospection=disabled -Dinstall-tests=false \
     > "$WORK/pango-setup.log" 2>&1
   ninja -C _build -j"$JOBS" > "$WORK/pango-build.log" 2>&1
   meson install -C _build > "$WORK/pango-install.log" 2>&1)
  done_stage dep-pango
fi

# --- 9. pango/cairo smoke test -------------------------------------------------
# Renders text through pango (fontconfig font map -> pangoft2/harfbuzz) onto
# a cairo SVG surface under node — LilyPond's text path, end to end.
log "verifying LilyPond configure gates resolve"
PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig" pkg-config --modversion \
  bdw-gc fontconfig freetype2 glib-2.0 gobject-2.0 pangoft2 cairo \
  libpng zlib guile-3.0

FONTDIR=""
for d in /usr/share/fonts/truetype/dejavu /usr/share/fonts; do
  [ -d "$d" ] && FONTDIR=$d && break
done
if [ -n "$FONTDIR" ]; then
  log "building + running pango/cairo smoke test"
  PANGO_FLAGS="$(PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig" pkg-config --static --cflags --libs pangocairo pangoft2 cairo-svg fontconfig)"
  emcc -O2 "$ROOT/pango-smoke.c" $PANGO_FLAGS -sNODERAWFS=1 \
    -sALLOW_MEMORY_GROWTH=1 -sSTACK_SIZE=4194304 -o "$TESTDIR/pango-smoke.js"
  cat > "$TESTDIR/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>$FONTDIR</dir>
  <cachedir>$WORK/fccache</cachedir>
</fontconfig>
EOF
  mkdir -p "$WORK/fccache"
  (cd "$TESTDIR" && FONTCONFIG_FILE="$TESTDIR/fonts.conf" "$NODE" pango-smoke.js)
else
  log "no host fonts found; skipping pango smoke test run"
fi

# --- 10. LilyPond itself -------------------------------------------------------
# Requires host tools beyond the earlier stages: FontForge, Metafont/MetaPost
# (texlive), t1asm, gettext, bison, flex — Debian: fontforge-nox t1utils
# texlive-binaries texlive-metapost texlive-latex-base gettext bison flex.
# The fonts and share/ tree are built by these *host* tools; only the C++
# binary is cross-compiled.
LILY_TOOLS_MISSING=""
for t in fontforge mf-nowin mpost t1asm msgfmt bison flex; do
  command -v "$t" >/dev/null || LILY_TOOLS_MISSING="$LILY_TOOLS_MISSING $t"
done

if [ -n "$LILY_TOOLS_MISSING" ]; then
  log "skipping LilyPond build; missing host tools:$LILY_TOOLS_MISSING"
else
  if need_stage extract-lilypond; then
    log "extracting LilyPond"
    rm -rf "$SRC/lilypond-$LILYPOND_V"
    tar -C "$SRC" -xf "$DL/lilypond-$LILYPOND_V.tar.gz"
    # success-with-warnings: when warning-as-error is set, the embedded/wasm
    # build must not call exit() on the first warning (Emscripten turns that
    # into an uncatchable ExitStatus through the warm-instance eval path).
    # Instead warnings print + increment a counter the host reads back, so a
    # render can report "success-with-warnings".  CLI behaviour (exit on wae)
    # is preserved by the default true; the wasm configure below passes
    # -DLY_WARNING_AS_ERROR_FATAL_DEFAULT=false to flip only that build.
    patch -p1 -d "$SRC/lilypond-$LILYPOND_V" \
      < "$ROOT/patches/lilypond-$LILYPOND_V-success-with-warnings.patch"
    done_stage extract-lilypond
  fi

  # FlexLexer.h is a compiler-agnostic C++ header, but em++ doesn't search
  # /usr/include; stage it somewhere we can add with -I.
  mkdir -p "$WORK/host-headers"
  cp /usr/include/FlexLexer.h "$WORK/host-headers/"

  if need_stage lilypond; then
    log "building LilyPond (wasm)"
    # - --build + --host puts configure in cross mode (same lesson as Guile
    #   and freetype: without --build, conftests run under node).
    # - PKG_CONFIG="pkg-config --static" so Requires.private chains (expat
    #   behind fontconfig, gmp behind guile, pcre2 behind glib) reach the
    #   final link line.
    # - LDFLAGS: --spill-pointers keeps BDW-GC sound (needs the -g2 name
    #   section); NODERAWFS gives the node binary the real filesystem, so
    #   share/ and fonts need no packaging. Browser builds repackage later.
    mkdir -p "$SRC/lilypond-$LILYPOND_V/build-wasm"
    (cd "$SRC/lilypond-$LILYPOND_V/build-wasm"
     EM_PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig" emconfigure ../configure \
       --build="$(gcc -dumpmachine)" --host=wasm32-unknown-emscripten \
       --prefix="$PREFIX" --disable-documentation \
       CPPFLAGS="-I$WORK/host-headers -DLY_WARNING_AS_ERROR_FATAL_DEFAULT=false" \
       PKG_CONFIG="pkg-config --static" \
       LDFLAGS="-g2 -sBINARYEN_EXTRA_PASSES=--spill-pointers -sSTACK_SIZE=8388608 -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 -sEXIT_RUNTIME=1" \
       > "$WORK/lilypond-configure.log" 2>&1
     emmake make -j"$JOBS" > "$WORK/lilypond-build.log" 2>&1
     emmake make install > "$WORK/lilypond-install.log" 2>&1
     # make install copies the JS loader but not its wasm sidecar.
     cp lily/out/lilypond.wasm "$PREFIX/bin/")
    done_stage lilypond
  fi

  if [ -n "$FONTDIR" ]; then
    log "rendering smoke test score with wasm LilyPond (cairo -> SVG)"
    GUILE_LOAD_PATH="$PREFIX/share/guile/3.0" \
    GUILE_LOAD_COMPILED_PATH="$PREFIX/lib/guile/3.0/ccache" \
    GUILE_AUTO_COMPILE=0 \
    FONTCONFIG_FILE="$TESTDIR/fonts.conf" \
      "$NODE" "$PREFIX/bin/lilypond" -dbackend=cairo --svg \
      -o "$TESTDIR/lily-smoke" "$ROOT/smoke/trivial.ly"
    grep -q "<svg" "$TESTDIR/lily-smoke.svg" \
      && grep -q "textedit://" "$TESTDIR/lily-smoke.svg" \
      && log "LILYPOND WASM RENDER: PASS, with point-and-click anchors ($TESTDIR/lily-smoke.svg)"
  fi

  # --- 11. Scheme .go bytecode ---------------------------------------------
  # The ~3.5 s startup floor of the render above is Guile loading scm/lily
  # from source.  LilyPond's own `make bytecode` can't cross-compile (Guile's
  # auto-compile loads each .go right after writing it, and native Guile
  # can't load wasm32 bytecode), so cross-bytecode.ly loads everything in a
  # *native* LilyPond and then compile-files each .scm with the compiler's
  # target fluids pointed at wasm32.  That needs a native LilyPond, which
  # needs native dev packages of the rendering stack (Debian:
  # libpango1.0-dev libcairo2-dev libfontconfig-dev libfreetype-dev
  # libglib2.0-dev libpng-dev zlib1g-dev libgc-dev).
  NATIVE_LILY_DEPS=yes
  for p in pangoft2 cairo fontconfig freetype2 glib-2.0 gobject-2.0 libpng zlib bdw-gc; do
    pkg-config --exists "$p" || NATIVE_LILY_DEPS=no
  done

  if [ "$NATIVE_LILY_DEPS" = no ]; then
    log "skipping Scheme bytecode: native rendering-stack dev packages missing"
  else
    if need_stage lilypond-native; then
      log "building LilyPond (native: host tooling for .go cross-compilation)"
      mkdir -p "$SRC/lilypond-$LILYPOND_V/build-native"
      (cd "$SRC/lilypond-$LILYPOND_V/build-native"
       PKG_CONFIG_PATH="$NATIVE_PREFIX/lib/pkgconfig" ../configure \
         --prefix="$WORK/native-lilypond" --disable-documentation \
         > "$WORK/lilypond-native-configure.log" 2>&1
       make -j"$JOBS" > "$WORK/lilypond-native-build.log" 2>&1)
      done_stage lilypond-native
    fi

    if need_stage lily-bytecode; then
      log "cross-compiling scm/lily to wasm32 .go bytecode"
      LD_LIBRARY_PATH="$NATIVE_PREFIX/lib" \
      GUILE_AUTO_COMPILE=0 \
      CROSS_SCM_DIR="$PREFIX/share/lilypond/$LILYPOND_V/scm/lily" \
      CROSS_GO_DIR="$PREFIX/lib/lilypond/$LILYPOND_V/ccache/lily" \
        "$SRC/lilypond-$LILYPOND_V/build-native/out/bin/lilypond" \
        "$ROOT/cross-bytecode.ly" > "$WORK/lily-bytecode.log" 2>&1
      GO_N=$(ls "$PREFIX/lib/lilypond/$LILYPOND_V/ccache/lily"/*.go | wc -l)
      log "compiled $GO_N .go files into lib/lilypond/$LILYPOND_V/ccache/lily"
      done_stage lily-bytecode
    fi

    if [ -n "$FONTDIR" ]; then
      log "timed render with bytecode (source-loading startup was ~3.5 s)"
      time ( GUILE_LOAD_PATH="$PREFIX/share/guile/3.0" \
             GUILE_LOAD_COMPILED_PATH="$PREFIX/lib/guile/3.0/ccache" \
             GUILE_AUTO_COMPILE=0 FONTCONFIG_FILE="$TESTDIR/fonts.conf" \
               "$NODE" "$PREFIX/bin/lilypond" -dbackend=cairo --svg \
               -o "$TESTDIR/lily-smoke-go" "$ROOT/smoke/trivial.ly" )
    fi
  fi

  # --- 12. browser bundle ----------------------------------------------------
  # The node build leans on NODERAWFS; the browser build preloads a staged
  # payload into MEMFS (env plumbing + packager-mtime fix: lily-browser-pre.js)
  # and relinks with GROWABLE_ARRAYBUFFERS=0 (plain ALLOW_MEMORY_GROWTH makes
  # the heap's ArrayBuffer resizable, which Chromium's TextDecoder rejects;
  # =0 keeps the classic non-resizable buffer, so memory can start small
  # (~26 MB) and grow instead of a fixed 1 GB allocation).
  if [ "$BROWSER" = yes ] && [ -n "$FONTDIR" ] \
     && [ -f "$PREFIX/lib/lilypond/$LILYPOND_V/ccache/lily/lily.go" ]; then
    WEBLILY="$TESTDIR/web-lily"
    if need_stage lily-browser; then
      log "building lilypond.wasm browser bundle"
      LSTAGE="$WORK/lily-web-stage"
      rm -rf "$LSTAGE" "$WEBLILY"
      mkdir -p "$LSTAGE/share/lilypond/$LILYPOND_V" \
               "$LSTAGE/lib/lilypond/$LILYPOND_V" \
               "$LSTAGE/fonts/text" "$WEBLILY"
      # share subset: python/ and vim/ are not needed at runtime
      for d in fonts ly ps scm; do
        cp -a "$PREFIX/share/lilypond/$LILYPOND_V/$d" \
              "$LSTAGE/share/lilypond/$LILYPOND_V/"
      done
      cp -a "$PREFIX/lib/lilypond/$LILYPOND_V/ccache" \
            "$LSTAGE/lib/lilypond/$LILYPOND_V/"
      # Trace which Guile modules renders actually open and ship only those
      # (36 MB -> ~12 MB; all .go, sources never opened once bytecode exists).
      for score in trivial medium; do
        FS_TRACE_OUT="$WORK/fs-trace-$score.txt" \
        NODE_OPTIONS="--require $ROOT/fs-trace.js" \
        GUILE_LOAD_PATH="$PREFIX/share/guile/3.0" \
        GUILE_LOAD_COMPILED_PATH="$PREFIX/lib/guile/3.0/ccache" \
        GUILE_AUTO_COMPILE=0 FONTCONFIG_FILE="$TESTDIR/fonts.conf" \
          "$NODE" "$PREFIX/bin/lilypond" -dbackend=cairo --svg \
          -o "$TESTDIR/lily-trace-$score" "$ROOT/smoke/$score.ly" \
          > /dev/null 2>&1
      done
      GUILE_CCACHE="$PREFIX/lib/guile/3.0/ccache"
      cat "$WORK/fs-trace-trivial.txt" "$WORK/fs-trace-medium.txt" \
        | sed -n "s|^OPEN $GUILE_CCACHE/||p" | sort -u \
        | while read -r rel; do
            mkdir -p "$LSTAGE/guile-ccache/$(dirname "$rel")"
            cp -p "$GUILE_CCACHE/$rel" "$LSTAGE/guile-ccache/$rel"
          done
      # text fonts (music fonts ship in share/lilypond/fonts)
      find "$FONTDIR" -name 'DejaVu*.ttf' | head -8 > "$WORK/lily-web-fonts.txt"
      [ -s "$WORK/lily-web-fonts.txt" ] \
        || find "$FONTDIR" -name '*.ttf' | head -8 > "$WORK/lily-web-fonts.txt"
      xargs -a "$WORK/lily-web-fonts.txt" -I{} cp {} "$LSTAGE/fonts/text/"
      cat > "$LSTAGE/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/lilypond/fonts/text</dir>
  <cachedir>/fccache</cachedir>
</fontconfig>
EOF
      # Relink lily/out/lilypond with browser flags (the objects are all
      # up to date, so this is link-only), then restore the node binary.
      (cd "$SRC/lilypond-$LILYPOND_V/build-wasm/lily"
       mv out/lilypond out/lilypond.node
       mv out/lilypond.wasm out/lilypond.node.wasm
       # EXIT_RUNTIME=0 + _scm_c_eval_string enable the warm-instance mode
       # (lily-worker.js): main's exit unwinds out of callMain but the
       # runtime and the booted Guile heap stay live, and repeat renders go
       # through scm_c_eval_string.  ENVIRONMENT includes worker so the
       # bundle can run inside a Web Worker.
       emmake make out/lilypond CONFIG_LDFLAGS="-g2 \
         -sBINARYEN_EXTRA_PASSES=--spill-pointers -sSTACK_SIZE=8388608 \
         -sALLOW_MEMORY_GROWTH=1 -sGROWABLE_ARRAYBUFFERS=0 \
         -sEXIT_RUNTIME=0 -sENVIRONMENT=web,worker \
         -sMODULARIZE=1 -sEXPORT_NAME=createLilypond \
         -sEXPORTED_FUNCTIONS=_main,_scm_c_eval_string \
         -sEXPORTED_RUNTIME_METHODS=callMain,FS,ccall \
         --pre-js $ROOT/lily-browser-pre.js \
         --preload-file $LSTAGE@/lilypond" \
         > "$WORK/lily-browser-link.log" 2>&1
       cp out/lilypond "$WEBLILY/lilypond-web.js"
       cp out/lilypond.data "$WEBLILY/"
       # the -g2 name section is only needed at link (--spill-pointers)
       "$EMSDK/upstream/bin/llvm-strip" --strip-all \
         out/lilypond.wasm -o "$WEBLILY/lilypond.wasm"
       rm out/lilypond out/lilypond.wasm out/lilypond.data
       mv out/lilypond.node out/lilypond
       mv out/lilypond.node.wasm out/lilypond.wasm)
      cp "$ROOT/lily-browser.html" "$ROOT/lily-warm.html" \
         "$ROOT/lily-crash.html" "$ROOT/lily-worker.js" "$WEBLILY/"
      done_stage lily-browser
    fi

    # --- 13. dist/ (npm-publishable + locally consumable) -----------------
    # Stages the same four files hacklily's vite plugin serves from the
    # published package, plus the dev HTML pages, README, and package.json —
    # i.e. exactly what `npm publish` and `file:`/env-override consumers
    # expect.  CI bumps the version and publishes from here; locally, point
    # hacklily at this dir (LILYPOND_WASM_DIR=.../lilypond-wasm/dist) to use
    # a freshly built wasm without publishing or copying by hand.
    if need_stage dist; then
      log "staging dist/"
      rm -rf "$ROOT/dist"
      mkdir -p "$ROOT/dist"
      cp "$WEBLILY/lilypond-web.js" "$WEBLILY/lilypond.wasm" \
         "$WEBLILY/lilypond.data" "$WEBLILY/lily-worker.js" "$ROOT/dist/"
      cp "$ROOT/lily-browser.html" "$ROOT/lily-warm.html" \
         "$ROOT/lily-crash.html" "$ROOT/README.md" "$ROOT/package.json" "$ROOT/dist/"
      done_stage dist
    fi

    if "$NODE" -e "require.resolve('playwright')" >/dev/null 2>&1; then
      log "running headless-Chromium LilyPond render tests"
      WEBDIR="$WEBLILY" PAGE=lily-browser.html MATCH="LILY BROWSER:" \
        "$NODE" "$ROOT/browser-test.js"
      WEBDIR="$WEBLILY" PAGE="lily-browser.html?measures=64" \
        MATCH="LILY BROWSER:" "$NODE" "$ROOT/browser-test.js"
      log "running warm-instance render test"
      WEBDIR="$WEBLILY" PAGE=lily-warm.html MATCH="LILY WARM:" \
        "$NODE" "$ROOT/browser-test.js"
      log "running crash-containment test (wasm segfault -> recycle page)"
      WEBDIR="$WEBLILY" "$NODE" "$ROOT/crash-test.js"
    else
      log "playwright not found; serve $WEBLILY/lily-browser.html, lily-warm.html, or lily-crash.html and check the console"
    fi
  fi
fi

log "all done — wasm Guile + LilyPond rendering stack in $PREFIX"
