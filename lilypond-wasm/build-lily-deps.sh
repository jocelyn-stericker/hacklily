#!/bin/bash
# Build LilyPond's rendering-stack dependencies with Emscripten, static,
# into wasm-install/ — the layer between Guile (build-deps.sh) and LilyPond
# itself: zlib, libpng, freetype, expat, fontconfig, pcre2, glib, fribidi,
# harfbuzz, pixman, cairo, pango.
#
# Exploratory version operating on top-level source dirs (like build-deps.sh);
# the canonical, sha256-pinned version of every stage lives in bootstrap.sh.
#
# Usage: ./build-lily-deps.sh [stage|all]   (stage = zlib, libpng, ...)
set -ex
cd "$(dirname "$0")"
source emsdk/emsdk_env.sh
PREFIX="$PWD/wasm-install"
mkdir -p "$PREFIX"
JOBS="${JOBS:-$(nproc)}"
export CFLAGS="-O2"
HOST=wasm32-unknown-emscripten

# emconfigure clobbers PKG_CONFIG_LIBDIR/PATH; EM_PKG_CONFIG_PATH survives.
export EM_PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig"

# Meson cross file for the meson-based deps (glib, harfbuzz, cairo, pango).
CROSS="$PWD/emscripten-cross.meson"
cat > "$CROSS" <<EOF
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

meson_dep() { # dir extra-meson-args...
  local dir=$1; shift
  (cd "$dir"
   rm -rf _build
   meson setup _build --cross-file "$CROSS" --prefix="$PREFIX" \
     --default-library=static --prefer-static --buildtype=release "$@"
   ninja -C _build -j"$JOBS"
   meson install -C _build)
}

STAGE="${1:-all}"
want() { [ "$STAGE" = "$1" ] || [ "$STAGE" = all ]; }

if want zlib; then
  # zlib's hand-rolled configure; emconfigure sets CC and friends.
  (cd zlib-1.3.1
   emconfigure ./configure --static --prefix="$PREFIX"
   emmake make -j"$JOBS" libz.a
   emmake make install)
fi

if want libpng; then
  (cd libpng-1.6.43
   emconfigure ./configure --build="$(gcc -dumpmachine)" --host=$HOST --disable-shared --enable-static \
     --prefix="$PREFIX" \
     CPPFLAGS="-I$PREFIX/include" LDFLAGS="-L$PREFIX/lib"
   emmake make -j"$JOBS"
   emmake make install)
fi

if want freetype; then
  # harfbuzz=no breaks the freetype<->harfbuzz cycle; LilyPond doesn't need
  # freetype's harfbuzz hooks (pango drives harfbuzz itself).
  # CC_BUILD=gcc: the apinames helper tool runs on the build machine — as a
  # node/wasm binary it can't write ftexport.sym (no NODERAWFS).
  # PTHREAD_*=" ": emcc accepts -pthread, but that flips codegen to
  # shared-memory atomics; the whole stack is single-threaded. AX_PTHREAD
  # tries user flags first, and empty flags "work" (musl stubs), so this
  # keeps -pthread out of CFLAGS.
  (cd freetype-2.13.3
   emconfigure ./configure --build="$(gcc -dumpmachine)" --host=$HOST --disable-shared --enable-static \
     --prefix="$PREFIX" CC_BUILD=gcc PTHREAD_CFLAGS=" " PTHREAD_LIBS=" " \
     --with-zlib=yes --with-png=yes --with-harfbuzz=no --with-brotli=no \
     --with-bzip2=no
   emmake make -j"$JOBS"
   emmake make install)
fi

if want expat; then
  (cd expat-2.7.1
   emconfigure ./configure --build="$(gcc -dumpmachine)" --host=$HOST --disable-shared --enable-static \
     --prefix="$PREFIX" --without-docbook --without-tests --without-examples
   emmake make -j"$JOBS"
   emmake make install)
fi

if want fontconfig; then
  # Cross build skips fc-cache at install; config/cache dirs live under the
  # prefix so the whole tree can be preloaded into MEMFS as-is.
  # Its bundled config.sub predates the wasm32 triplet; borrow Guile's.
  (cd fontconfig-2.15.0
   cp ../guile-3.0.11/build-aux/config.sub .
   emconfigure ./configure --build="$(gcc -dumpmachine)" --host=$HOST --disable-shared --enable-static \
     --prefix="$PREFIX" --sysconfdir="$PREFIX/etc" \
     --localstatedir="$PREFIX/var" --disable-docs
   emmake make -j"$JOBS"
   emmake make install)
fi

if want pcre2; then
  # glib dependency; building it ourselves avoids meson wrap downloads.
  (cd pcre2-10.44
   emconfigure ./configure --build="$(gcc -dumpmachine)" --host=$HOST --disable-shared --enable-static \
     --prefix="$PREFIX"
   emmake make -j"$JOBS"
   emmake make install)
fi

if want glib; then
  meson_dep glib-2.80.3 \
    -Dselinux=disabled -Dxattr=false -Dlibmount=disabled \
    -Dman-pages=disabled -Ddocumentation=false -Dtests=false \
    -Dintrospection=disabled -Dnls=disabled -Dglib_debug=disabled
fi

if want fribidi; then
  # Release tarballs ship prebuilt docs, so no c2man needed.
  (cd fribidi-1.0.16
   emconfigure ./configure --build="$(gcc -dumpmachine)" --host=$HOST --disable-shared --enable-static \
     --prefix="$PREFIX" --disable-docs
   emmake make -j"$JOBS"
   emmake make install)
fi

if want harfbuzz; then
  meson_dep harfbuzz-8.5.0 \
    -Dfreetype=enabled -Dglib=enabled -Dgobject=disabled -Dicu=disabled \
    -Dcairo=disabled -Dtests=disabled -Ddocs=disabled -Dbenchmark=disabled \
    -Dintrospection=disabled -Dutilities=disabled
fi

if want pixman; then
  (cd pixman-0.42.2
   emconfigure ./configure --build="$(gcc -dumpmachine)" --host=$HOST --disable-shared --enable-static \
     --prefix="$PREFIX" \
     --disable-arm-simd --disable-arm-neon --disable-arm-a64-neon \
     --disable-mmx --disable-sse2 --disable-ssse3 --disable-vmx \
     --disable-mips-dspr2 --disable-gtk --disable-libpng
   # Library only: pixman's configure hard-codes a -pthread probe that emcc
   # accepts, poisoning the demos/test link (shared-memory vs non-atomics
   # objects). The library itself never sees those flags.
   emmake make -j"$JOBS" -C pixman
   emmake make -C pixman install
   emmake make install-pkgconfigDATA)
fi

if want cairo; then
  meson_dep cairo-1.18.4 \
    -Dfontconfig=enabled -Dfreetype=enabled \
    -Dxlib=disabled -Dxcb=disabled -Dquartz=disabled -Ddwrite=disabled \
    -Dglib=disabled -Dspectre=disabled -Dsymbol-lookup=disabled \
    -Dtests=disabled -Dzlib=enabled -Dpng=enabled
fi

if want pango; then
  # glib-mkenums (arch-independent python) came with the cross glib; expose
  # it so meson doesn't fall back to a glib subproject build.
  # Tests need GIOChannel, which the wasm-vips glib patch trims from gio.
  sed -i "s/^subdir('tests')/# &  # wasm: needs GIOChannel/" pango-1.52.2/meson.build
  PATH="$PREFIX/bin:$PATH" \
  meson_dep pango-1.52.2 \
    -Dfontconfig=enabled -Dfreetype=enabled -Dcairo=enabled \
    -Dxft=disabled -Dlibthai=disabled -Dsysprof=disabled \
    -Dintrospection=disabled -Dinstall-tests=false
fi
