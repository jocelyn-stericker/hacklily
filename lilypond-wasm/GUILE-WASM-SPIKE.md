# Guile 3 under Emscripten — spike result: **it lives**

*2026-07-05. Follow-up to §2 of `~/HACKLILY_PLANNING.md`. Everything below was
built and run in this workspace; nothing is from memory.*

*2026-07-06: **LilyPond itself now builds and renders** — see "LilyPond
under Emscripten" below. `lilypond.wasm` engraves real scores through the
cairo backend under node.*

*2026-07-06, later session: **bytecode + browser** — scm/lily cross-compiles
to wasm32 `.go` (startup 3.6 s → 0.97 s), the Guile module payload prunes
36 → 12 MB, and the whole thing renders in headless Chromium from a ~12 MB
(gzipped) bundle. See "Bytecode and the browser" below.*

Guile 3.0.11, cross-compiled with Emscripten 6.0.2 (`--enable-jit=no`,
`--without-threads`, static), **boots and evals Scheme in headless Chromium**
and under node. Verified beyond `(+ 1 2)`:

- GC churn (10k cons cells + string-append of 38 KB) with bdwgc collecting
  normally (447 collections in the smoke test, heap steady at 64 KB)
- the full boot path loads compiled `.go` bytecode (no interpreter fallback)
- **every libguile C API surface LilyPond leans on** (`lily-api-test.c`):
  gsubrs called from Scheme, foreign objects (Grob wrappers), escape-only
  `catch`/`throw` across the C boundary (setjmp/longjmp), `(use-modules
  (srfi srfi-1) (ice-9 regex) (ice-9 format))`, fluids + `with-fluids`

Performance: `(fib 30)` evaluated in the bytecode VM runs **1.56 s in wasm
(no JIT) vs 0.32 s native (aarch64, JIT) — 4.9×**. That is the worst case
(pure Scheme in the VM); LilyPond's hot paths are C++, which wasm runs near
native, so the planning doc's 1.5–3× whole-program estimate stands.

Sizes: `eval-test.wasm` 3.6 MB; Guile module tree 36 MB uncompressed
(30 MB ccache `.go` + 6 MB `.scm`), packed into a 50 MB MEMFS `.data`
(uncompressed; gzip/brotli and lazy loading are untouched headroom).

## The three real bugs (patches in `patches/`)

1. **bdwgc registers no static roots on Emscripten** —
   `gcconfig.h` defines `DATASTART == DATAEND`, so nothing referenced only
   from globals survives GC. Guile keeps *everything* alive through statics;
   boot dies instantly at `GC_is_visible(&static)`. Fix (18 lines): do what
   bdwgc's own WASI port does — `DATASTART=&__global_base`,
   `DATAEND=&__heap_base`. Correct on modern Emscripten because the shadow
   stack sits *below* `__global_base` (stack-first layout since 3.1.25).
   Still broken in bdwgc master; upstreamable.
2. **`hashtab.c` calls hash/assoc functions through casted pointers** —
   30 sites cast 2-arg functions (`scm_ihashq` &c.) to 3-arg
   `scm_t_hash_fn`/`scm_t_assoc_fn`. UB that x86/ARM tolerate; wasm's typed
   `call_indirect` traps. Fixed with six correctly-typed static wrappers.
3. **Extension init functions registered through casted pointers** —
   23 files register 0-arg `scm_init_*` as `void (*)(void *)` via
   `(scm_t_extension_init_func)` casts; traps the same way when boot-9 runs
   `load-extension`. Fixed with generated wrappers (script:
   scratchpad `fix-ext-casts.py`, output committed as the patch).

Both Guile fixes are semantics-preserving on native and upstreamable
(they'd also matter for anyone doing CFI-strict builds).

## Build-infrastructure findings (no source changes)

- **configure hangs**: gnulib's "working nanosleep" conftest relies on
  `alarm()`/SIGALRM, which Emscripten never delivers; under `emconfigure`
  conftests *run* (node), so it spins forever. Pre-seed
  `gl_cv_func_nanosleep=yes` (see `build-deps.sh`).
- **Forcing cross-compilation**: pass *both* `--build` and `--host` so
  autoconf sets `cross_compiling=yes` without trying to run a conftest —
  otherwise node executes the test binary and Guile's configure never takes
  the `GUILE_FOR_BUILD` path. A native Guile of the exact same version
  (built beforehand in `install/`) then compiles all 1029 `.go` files;
  Guile 3.0.11's `target.scm` already knows the `wasm32` triplet.
- **pkg-config**: `emconfigure` clobbers `PKG_CONFIG_LIBDIR`/`PATH`; use
  `EM_PKG_CONFIG_PATH`.
- **`strtol_l`/`strtod_l`**: musl exports the symbols (configure's link
  check passes) but Emscripten's headers don't declare them → i18n.c fails.
  Seed `ac_cv_func_strtol_l=no ac_cv_func_strtod_l=no`.
- **`--spill-pointers`** (the BDW-GC-can't-see-wasm-locals workaround from
  the planning doc): works as a Binaryen extra pass, but needs the name
  section — build with `-g2` or the pass can't find `__stack_pointer` and
  link fails. bdwgc 8.2.x already scans the linear-memory shadow stack via
  `emscripten_stack_get_base()`.
- **MEMFS mtimes**: Emscripten's file packager doesn't preserve mtimes, so
  preloaded `.go` files can look staler than their `.scm` and Guile silently
  falls back to source + interpreter (which then overflows the *JS* stack
  via `invoke_*` trampolines — that's what a deep C-interpreter recursion
  looks like under wasm). Fix in `guile-env-pre.js`: bump ccache mtimes at
  startup, plus `GUILE_AUTO_COMPILE=0`.
- **Chromium + memory growth**: with `-sALLOW_MEMORY_GROWTH` the heap's
  ArrayBuffer is resizable and Chromium's `TextDecoder` refuses it
  (Emscripten 6.0.2). Workaround for now: fixed `-sINITIAL_MEMORY=1024MB`
  for browser builds; node is fine either way. Worth rechecking on emsdk
  upgrades.
- libffi 3.5.2 has the wasm32/Emscripten port upstream (Pyodide's) — no
  fork needed. GMP needs `CC_FOR_BUILD=gcc --disable-assembly`;
  libunistring and bdwgc are routine.

## Prior art (checked 2026-07-05)

No public attempt to build libguile itself for wasm was found — not for
Emscripten, not for WASI — matching the planning doc's assessment. The
reason `target.scm` already knew the `wasm32` triplet: Andy Wingo added
wasm32/wasm64 CPU types on 2023-06-23 on the `wip-tailify` branch
([guile-commits archive](https://www.mail-archive.com/guile-commits@gnu.org/msg17792.html)),
the Scheme→wasm CPS-tailification experiment that became Spritely Hoot.
That work is about compiling *Scheme source* to wasm; it landed the triplet
metadata (endianness, word size) in mainline Guile as a byproduct, which is
exactly what `guild compile --target=wasm32-unknown-emscripten` needs to
cross-compile `.go` bytecode. So Hoot — the "red herring" for LilyPond's
C-API needs — incidentally paved the one piece of Guile plumbing this route
required. The two porting approaches are complementary, not competing:
Hoot reimplements Scheme for wasm-GC; this port runs the real libguile
(C API included) on linear memory.

## The rendering stack (2026-07-05, follow-up session)

The full LilyPond dependency layer now cross-compiles and runs. **Every
pkg-config gate in LilyPond 2.27.1's configure resolves from
`wasm-install/lib/pkgconfig`**: bdw-gc 8.2.12, fontconfig 2.15.0, freetype
26.2.20 (2.13.3), glib/gobject 2.80.3, pangoft2 1.52.2, cairo 1.18.4,
libpng 1.6.43, zlib 1.3.1, guile 3.0.11 — plus expat, pcre2, fribidi,
harfbuzz 8.5.0, pixman 0.42.2 underneath. All static, all single-threaded.
`pango-smoke.c` proves the stack end-to-end under node: fontconfig font
enumeration (DejaVu preloaded via `FONTCONFIG_FILE`), pango layout through
pangofc/harfbuzz/freetype, cairo SVG surface out — real glyph outlines in
the output, `PANGO-CAIRO TEST: PASS`.

What it took, in decreasing order of interest:

- **The function-pointer-cast UB struck a third time** (after hashtab.c and
  the extension inits): GNOME code idiomatically defines interface-init
  callbacks as `void iface_init (FooIface *)` and registers them cast to the
  2-arg `GInterfaceInitFunc` — first `g_object_new` traps `call_indirect`.
  glib's own occurrences come fixed in the vendored wasm-vips patch (below);
  pango's five needed `patches/pango-1.52.2-wasm-single-thread-and-iface-casts.patch`.
- **glib is community-solved**: kleisauke/wasm-vips maintains a rebased
  Emscripten patch series per glib release
  (github.com/kleisauke/glib, branch `wasm-vips-2.80.3`, vendored as
  `patches/glib-2.80.3-emscripten-wasm-vips.patch`; tracking issue is
  gnome/glib#3596). It shims the missing network layer (`res_query` is a
  hard gio requirement), posix_spawn, and — independently of our Guile work
  — that same cast-UB family. Without it, glib does not build; with it,
  glib 2.80.5→2.80.3 was the only version adjustment (no 2.80.5 branch).
- **pango 1.5x spawns a fontconfig worker thread** (`FcInit`/match/sort run
  in a `g_thread_new` loop; consumers cond-wait on results). Under
  single-threaded wasm, `pthread_create` returns ENOSYS and glib aborts.
  The pango patch runs the three ops synchronously at submit time on
  `__EMSCRIPTEN__`; the cond-wait loops see results already present.
- **`-pthread` must be kept out of everything**: under emcc it flips codegen
  to shared-memory atomics (needs COOP/COEP in browsers, mismatched-object
  link errors here). It leaks in through four independent doors: meson
  hardcodes `-pthread -sPTHREAD_POOL_SIZE=4` for its `threads` dependency on
  emscripten (patched out of glib and harfbuzz meson.builds — the
  `thread_count=0` cross-file option only drops the pool size); AX_PTHREAD
  in freetype (seed `PTHREAD_CFLAGS=" " PTHREAD_LIBS=" "` — user flags are
  tried first and empty flags "work" against musl's stubs); pixman's
  hand-rolled probe (build+install only the `pixman/` subdir); harfbuzz/
  cairo/pango CLI tools (`-Dutilities=disabled`, or they inherit flags via
  .pc). cairo's own probe happens to pick `-D_REENTRANT/-lpthread`, which
  is harmless.
- **The `--build`+`--host` lesson generalizes**: freetype compiles its
  `apinames` build tool with `CC_BUILD`, which defaults to `$CC` (emcc)
  unless `cross_compiling=yes` — and that needs both triplets passed, same
  as Guile's configure. With only `--host`, the emcc-built tool runs under
  node and can't even write its output file (no NODERAWFS).
- Small stuff: fontconfig 2.15's bundled config.sub predates the wasm32
  triplet (borrow Guile's); zlib.net deletes old tarballs on release (pin
  the GitHub mirror); glib needs python3-packaging on the host; meson cross
  builds need `--prefer-static` or `Requires.private` chains (fontconfig →
  expat) fall off executable link lines; the cross-built glib's
  `glib-mkenums` is plain python and serves as the build-machine tool for
  pango (`PATH=$PREFIX/bin:$PATH`), avoiding a host-glib dependency.

Everything is reproduced by `bootstrap.sh` (stages `dep-zlib` …
`dep-pango` + a gate check + the smoke test) and exploratorily by
`build-lily-deps.sh`. Meson deps build via a 15-line cross file
(`emscripten-cross.meson`, generated by the scripts).

Upstream-wise this layer adds nothing new to carry: the glib series is
kleisauke's to maintain (send him thanks, not patches), the pango
iface-init signature fixes are upstreamable to GNOME on the same UB
argument as the Guile patches (they're behavior-neutral on native), and
the two meson.build thread tweaks plus the pango sync-fontconfig fallback
are wasm-build-only conditionals GNOME may or may not want — worth an
issue upstream, not worth blocking on.

## LilyPond under Emscripten (2026-07-06)

LilyPond 2.27.1, cross-compiled with em++ against the wasm prefix, **renders
scores to SVG through the cairo backend under node**:

```
GUILE_LOAD_PATH=$PREFIX/share/guile/3.0 \
GUILE_LOAD_COMPILED_PATH=$PREFIX/lib/guile/3.0/ccache \
GUILE_AUTO_COMPILE=0 FONTCONFIG_FILE=smoke/fonts.conf \
node $PREFIX/bin/lilypond -dbackend=cairo --svg -o out smoke/trivial.ly
# => Success: compilation successfully completed
```

Verified: `smoke/trivial.ly` (4 notes) and `smoke/medium.ly` (64 measures)
produce well-formed SVG structurally identical to the native binary's output
(same glyph-group counts; the trivial render was also eyeballed as a PNG —
treble clef, common time, four ascending quarters). `make install` yields a
self-contained prefix: the binary finds `share/lilypond/2.27.1` relative to
its install path with no env var.

### The predicted hard part was shallow

The spike write-up expected "Guile-configure-class archaeology" from a
configure.ac with zero cross-compilation handling. In fact **LilyPond's
configure completed on the first full pass** given the lessons already
learned: `--build`+`--host` (cross mode without running conftests),
`EM_PKG_CONFIG_PATH`, and host tools on PATH. All fourteen PKG_CHECK gates
resolved from the wasm prefix, and the mixed build/host tool discipline the
doc worried about just worked — mf-nowin/mpost/fontforge/t1asm built the
fonts and share tree on the host while em++ compiled the C++, inside one
build tree. Three small pieces of grease:

- `msgfmt` (gettext) and the TeX/FontForge tools must exist on the host —
  Debian: `fontforge-nox t1utils texlive-binaries texlive-metapost
  texlive-latex-base gettext` (plus bison/flex).
- `FlexLexer.h` is a compiler-agnostic C++ header that em++ won't find in
  /usr/include; stage a copy and pass `-I`.
- `PKG_CONFIG="pkg-config --static"`, or the `Requires.private` chains
  (expat behind fontconfig, gmp behind guile, pcre2 behind glib) fall off
  the final link line — same lesson as meson's `--prefer-static`, now on
  the autotools side.

### The two real findings

1. **The wasm-vips glib series removes GRegex** (and its pcre2 dependency)
   — and LilyPond uses GRegex (`lily/glib-regex-scheme.cc`, its Scheme
   regex layer). Fix: reverse that one commit of the series (extracted
   verbatim as `patches/glib-2.80.3-gregex-removal-to-reverse.patch`,
   applied with `patch -R`); our pcre2 was already in the prefix, and
   glib's own pcre2 detection finds it via the meson cross file.
2. **The function-pointer-cast UB struck a fourth time — in libguile
   itself**: `modules.c` `scm_c_define_module` calls the user's
   `void (*init)(void *)` through an `(SCM (*)(void *))` cast. Return-type
   mismatch → `call_indirect` trap, hit at LilyPond's very first
   `Scm_module::boot`. Our API test had covered gsubrs, foreign objects,
   catch/throw — but never `scm_c_define_module` with a nonnull init.
   Fixed with a typed trampoline, appended to
   `patches/guile-3.0.11-wasm-function-pointer-casts.patch` (verified to
   apply against the pristine tarball). Notably, **LilyPond's own C++ needed
   zero patches**: its `lily-modules.cc` already routes every callback
   through correctly-typed trampolines, with a comment citing exactly this
   class of UB — consistent with the earlier `smobs.tcc` observation.

C++ exceptions coexisting with Guile's setjmp/longjmp under the default
`-sSUPPORT_LONGJMP=emscripten` produced no observed issues.

### Numbers

| Measure | Value |
|---|---|
| trivial.ly (4 notes), wasm under node | 3.6 s |
| trivial.ly, native (same machine, aarch64) | 0.39 s |
| medium.ly (64 measures), wasm | 4.3 s (+0.7 s over trivial) |
| medium.ly, native | 0.38 s (marginal cost ≈ 0) |
| `--version` under node | 0.11 s |
| `lilypond.wasm` as linked (-g2 names) | 69 MB |
| stripped (renders identically; names only needed at link for --spill-pointers) | 14 MB (4.6 MB gzipped) |
| share/lilypond (ly+scm+fonts) | 9.1 MB |
| Guile modules (scm + ccache .go) | 36 MB |

The ~3.5 s floor is **Guile boot plus loading LilyPond's `scm/` tree as
source** (the `.go` side target is still deferred; stripping the binary
changes nothing, so it isn't wasm parse time). Engraving itself runs near
native speed — 64 measures cost +0.7 s wasm vs ≈0 native, and most of that
margin is likely also Scheme (engraver callbacks). Cross-compiling the
`scm/` tree to `.go` bytecode (`make bytecode`, `guild compile
--target=wasm32-unknown-emscripten`, exactly as done for Guile's own
modules) is the obvious next lever on both the floor and the margin.

### Build recipe

`bootstrap.sh` now carries it end to end: stage `lilypond` (gated on the
host tools above, skipped with a message otherwise) configures with

```
emconfigure ../configure --build=$(gcc -dumpmachine) \
  --host=wasm32-unknown-emscripten --prefix=$PREFIX \
  --disable-documentation CPPFLAGS=-I$WORK/host-headers \
  PKG_CONFIG="pkg-config --static" \
  LDFLAGS="-g2 -sBINARYEN_EXTRA_PASSES=--spill-pointers \
    -sSTACK_SIZE=8388608 -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 \
    -sEXIT_RUNTIME=1"
```

then `emmake make && emmake make install` (plus copying the
`lilypond.wasm` sidecar next to the installed JS loader, which `make
install` misses), and ends with the cairo render smoke test. The
exploratory equivalent used in this session ran against the top-level
`lilypond-2.27.1/build-wasm/` tree.

## Bytecode and the browser (2026-07-06, later session)

The two items left open above — `.go` bytecode for scm/lily and browser
packaging — are both done.

### Cross-compiling scm/lily to `.go` (`cross-bytecode.ly`)

LilyPond's own `make bytecode` target cannot cross-compile, for a
structural reason: it runs the lilypond binary with `GUILE_AUTO_COMPILE=1`
over `scm/compile.ly` and harvests Guile's fallback ccache — and
auto-compile *loads* each `.go` right after writing it, which a native
Guile cannot do with wasm32 bytecode (32-bit LE ELF). The scm/GNUmakefile
accordingly hard-errors when `CROSS=yes`. Guile's compiler target is just
a set of fluids, though (`with-target` from `(system base target)` — the
same machinery `guild compile --target=` uses, and the same path Guile's
own build used for its 1029 cross-compiled `.go` files). So
`cross-bytecode.ly`, run by the **native** LilyPond binary, splits the two
phases that auto-compile interleaves:

1. load every module `compile.ly` loads (natively, so ly: primitives and
   macros are all live), then
2. `compile-file` each installed `.scm` with the target fluids pointed at
   `wasm32-unknown-emscripten` — same `%auto-compilation-options` and
   `#:env` as auto-compile, but never loading the output.

The `#:env` per file mirrors how each file was loaded: `(lily)` for
`lily.scm` and the ~50 files `ly:load` splices into it (the
`init-scheme-files` list is read out of the live module), each `(lily
FOO)` submodule for the module files, and one special case —
`define-music-display-methods.scm` is `ly:load`ed into `(lily
display-lily)`. Compiling post-hoc instead of at load time is a mild
fidelity gamble (macro bindings could in principle differ), settled
empirically: the output `.go` set matches a native `make bytecode` run
file-for-file (72 files), and the rendered SVGs are **byte-identical**
with and without bytecode. The whole compile takes ~2 s and produces
7.0 MB, installed at `lib/lilypond/2.27.1/ccache/lily/` (the path
`main.cc` prepends to `%load-compiled-path`).

Verified it's really being used: an fs-trace of a render (node fs hooks —
strace isn't available in the container) shows 65 lily `.go` + 80 Guile
`.go` opened and **zero** `.scm` opened from either tree.

### Numbers (node, same machine as the earlier table)

| Measure | source-loaded | with `.go` |
|---|---|---|
| trivial.ly (4 notes) | 3.56 s | **0.97 s** |
| medium.ly (64 measures) | 4.43 s | **1.38 s** |
| 64-measure margin | 0.87 s | 0.41 s |

Startup floor ≈ 3.7× better; the engraving margin halves too (engraver
callbacks are Scheme). The remaining ~1 s is Guile boot + module loading
plus the render itself; native trivial is 0.39 s, so the whole-program
gap is now ~2.5×, inside the planning doc's 1.5–3× estimate.

### Pruning the Guile payload: 36 MB → 12 MB

With bytecode present, a render opens only 80 of Guile's 1029 `.go`
files (12 MB) and no `.scm` at all. A pruned tree with just those 80
files — no sources, `GUILE_LOAD_PATH` pointing at an empty dir — renders
byte-identically: Guile happily loads compiled-only. (The trace is the
union over trivial + medium; other scores could pull a few more modules,
so a production bundle should either keep the trace step per release, as
`bootstrap.sh` now does, or lazy-load stragglers.) The lily side is less
prunable: `ly:load` does its own `%search-load-path` on the source and
hard-errors if the `.scm` is missing (verified: `cannot find: color`), so
`share/lilypond/scm` stays in the bundle even though it's never opened.
`share/lilypond/python` and `vim` are dead weight at runtime and are
dropped.

### Browser packaging

The node build's NODERAWFS is replaced by a MEMFS payload staged at
`/lilypond` (share subset + lily ccache + pruned Guile ccache + DejaVu +
a fonts.conf) and preloaded via emcc `--preload-file`; a relink of
`lily/out/lilypond` (link-only, objects untouched) swaps the flags to

```
-sINITIAL_MEMORY=1024MB (fixed; the TextDecoder-vs-resizable-heap issue)
-sENVIRONMENT=web -sMODULARIZE=1 -sEXPORT_NAME=createLilypond
-sEXPORTED_RUNTIME_METHODS=callMain,FS
```

plus `lily-browser-pre.js`, which sets env (`LILYPOND_DATADIR`/
`LILYPOND_LIBDIR` — relocate.cc's `set_up_directory` honors both, so no
argv0-relative prefix guessing in MEMFS — `GUILE_LOAD_COMPILED_PATH`,
`FONTCONFIG_FILE`, `GUILE_AUTO_COMPILE=0`) and bumps mtimes on both
ccache trees (the packager-loses-mtimes trick from the Guile browser
test, now needed twice). The page writes `/input.ly` with `FS.writeFile`,
runs `callMain(['-dbackend=cairo', '--svg', ...])`, and reads the SVG
back out of MEMFS — one render per instantiation (`EXIT_RUNTIME=1`),
which matches the worker-per-render shape Hacklily's server uses anyway.
Single-threaded build → no COOP/COEP needed.

Headless Chromium (playwright, local http):

| Measure | Value |
|---|---|
| module init (wasm compile + 32 MB data, local) | ~60–75 ms |
| trivial.ly render | 0.70 s |
| medium.ly render (512 textedit anchors intact) | 1.15 s |
| bundle: lilypond.wasm stripped / gzipped | 14.6 MB / 4.4 MB |
| bundle: lilypond.data / gzipped | 32.5 MB / 7.8 MB |
| bundle: loader JS / gzipped | 234 KB / 52 KB |
| **whole bundle over the wire (gzip)** | **~12.2 MB** |

Slightly faster than node (MEMFS beats NODERAWFS's JS↔syscall chatter).
`bootstrap.sh` carries all of it: stages `lilypond-native` (host tooling;
gated on native pango/cairo/glib dev packages), `lily-bytecode`, and with
`--browser` `lily-browser` + two headless-Chromium render tests
(`browser-test.js` grew `PAGE`/`MATCH` env parameters;
`lily-browser.html?measures=64` generates the medium score). On a fresh
machine playwright's Chromium also needs system libs:
`npx playwright install-deps` or the usual `libnspr4 libnss3 …` set.

## Layout

```
bootstrap.sh             canonical entry point: downloads (sha256-pinned),
                         patches, builds native Guile + deps + wasm Guile,
                         runs the node tests, then the LilyPond rendering
                         stack (zlib..pango) + pango/cairo smoke test, then
                         LilyPond itself + a cairo SVG render smoke test
                         (skipped if FontForge/TeX host tools are absent);
                         --browser adds the Chromium test
browser-test.js          headless-Chromium harness (playwright), WEBDIR env
build-deps.sh            exploratory versions (operate on top-level dirs);
build-guile-wasm.sh      superseded by bootstrap.sh, kept for the record
build-lily-deps.sh       exploratory build of the rendering stack, staged
                         (./build-lily-deps.sh [zlib|...|pango|all])
patches/                 Guile/bdwgc patches (above) + rendering-stack
                         patches (vendored wasm-vips glib series, no-pthread
                         meson tweaks, pango single-thread + iface casts)
eval-test.c              kill-criterion test (node + browser variants)
run-scheme.c             eval argv[1], with timing
lily-api-test.c          LilyPond-API surface test
pango-smoke.c            rendering-stack smoke test (pango -> cairo SVG)
smoke/fonts.conf         fontconfig config for running tests by hand
smoke/trivial.ly         4-note render smoke test score
smoke/medium.ly          64-measure timing score
guile-env-pre.js         MEMFS mtime + GUILE_AUTO_COMPILE pre-js
cross-bytecode.ly        scm/lily -> wasm32 .go driver (run by native lilypond)
fs-trace.js              node --require hook logging fs opens (payload pruning)
lily-browser-pre.js      browser build pre-js: env plumbing + mtime fix
lily-browser.html        browser harness page (?measures=N for timing scores)
webtest/                 browser bundle (eval-test.html + 50 MB .data)
webtest-lily/            lilypond browser bundle (stage/ payload + web/)
```

## Upstreaming (assessed 2026-07-05)

Three destinations, very different risk profiles:

- **bdwgc** (static-roots patch): GitHub-native, no CLA/papers, no AI
  policy (README: send a PR, run clang-format). `gcconfig.h` is a museum
  of niche-platform blocks and ours mirrors the adjacent WASI one; there
  is already an open issue on Emscripten GC gaps (bdwgc#650). Send first —
  a merged bdwgc patch means the "novel platform" half of the port is
  upstream forever.
- **Guile** (the two function-pointer-cast patches): frame as **UB fixes**,
  not wasm asks — the same sites trap under clang CFI
  (`-fsanitize=cfi-icall`) on any platform. Behavior-neutral on native.
  Friction points: GNU requires FSF copyright assignment for significant
  changes (confirmed in `HACKING`), and the FSF is currently *drafting*
  LLM-contribution guidance (no ban, no interim policy; their licensing
  lead sketches disclosure practices, and notes human direction/effort
  answers the copyrightability question —
  [LWN, 2025](https://lwn.net/Articles/1040888/)). Disclose LLM assistance
  in the cover letter regardless of policy; for the 800-line wrapper patch,
  ship the ~40-line generator script — a script-generated patch is
  reproducible from the pristine tarball, which is cleaner provenance than
  hand-written code. Re-check FSF policy status at submission time.
- **lilypond-devel**: gets the write-up link, not patches — the April 2025
  "Running lilypond with wasm" thread is exactly the kind of archive entry
  this spike mined, and the planning doc committed to posting even a
  corpse. A mailing-list post is not a code contribution, so no policy
  interacts. No AI policy found in the LilyPond Contributor's Guide either.

The cost asymmetry favors posting: worst realistic outcome is silence,
which equals not posting minus ten minutes. The fork-carry cost if Guile
never merges is low — hashtab.c and the extension registrations are
fossil-stable, and the wrapper patch regenerates by script against future
releases. Publish the repo either way so lilypond.wasm never depends on
upstream's mood.

## What this means for lilypond.wasm

The planning doc's "novel, risky component" is retired; the rest is the
mapped build engineering it predicted:

1. ~~LilyPond's own configure + build~~ **DONE (2026-07-06, see "LilyPond
   under Emscripten")**: configure was shallow, not structural; the
   binary links, installs, and renders. The predicted mixed build/host
   hazard didn't materialize; the smob-layer cleanliness prediction held
   (zero LilyPond patches); the "load `.scm` source, defer `make
   bytecode`" plan worked and is now the main perf lever left.
2. ~~C++ exceptions vs longjmp~~ **no issues observed** under the default
   `-sSUPPORT_LONGJMP=emscripten` across two full renders (exceptions and
   catch/throw both exercised by normal LilyPond startup).
3. ~~The rendering stack below Guile~~ **DONE (2026-07-05, see "The
   rendering stack" section)**: every configure gate resolves from
   `wasm-install/lib/pkgconfig` and the pango→cairo SVG path runs under
   node. ~~One deliberate deviation remains: production Hacklily runs a
   *patched* libcairo~~ **matched (2026-07-06)**: production's
   `svg-links.patch` (hacklily repo, `server/renderer-unstable/`; adapted
   from unmerged cairo MR !254) is now vendored as
   `patches/cairo-1.18.4-svg-links.patch` and applied. It implements the
   tag hook stock cairo's SVG surface lacks, which turned out to be the
   answer to the "missing `textedit:` anchors" puzzle: LilyPond emits
   point-and-click tags by default, and unpatched cairo silently drops
   them — in *any* build, native included. With the patch, the wasm
   render emits one `<a xlink:href="textedit://...">` overlay per note
   (verified: 4 anchors with correct line:col spans on `trivial.ly`),
   so the galley view's anchor-based design carries over unchanged.
4. ~~Browser packaging~~ **DONE (2026-07-06, see "Bytecode and the
   browser")**: renders in headless Chromium from a ~12 MB gzipped
   bundle (MEMFS payload at `/lilypond`, fixed 1 GB memory, MODULARIZE +
   callMain, playwright-tested).
5. ~~`.go` bytecode for `scm/lily`~~ **DONE (2026-07-06, same section)**:
   `make bytecode` can't cross-compile (auto-compile loads what it
   writes), so `cross-bytecode.ly` does load-then-compile-file in the
   native binary with the compiler's target fluids set. Startup
   3.56 s → 0.97 s; output byte-identical; Guile payload prunes
   36 → 12 MB.

Known deferred items: `--spill-pointers` costs perf (unmeasured; can also
try collect-only-at-quiescence later); re-check the memory-growth /
TextDecoder workaround on emsdk upgrades; lazy-loading the `.data` payload
(currently one 32.5 MB preload, 7.8 MB gzipped) and re-using a warm
instance for repeated renders (currently one render per instantiation,
`EXIT_RUNTIME=1`) are the obvious next browser-side levers.
