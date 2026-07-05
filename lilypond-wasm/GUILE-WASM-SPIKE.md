# Guile 3 under Emscripten — spike result: **it lives**

*2026-07-05. Follow-up to §2 of `~/HACKLILY_PLANNING.md`. Everything below was
built and run in this workspace; nothing is from memory.*

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

## Layout

```
bootstrap.sh             canonical entry point: downloads (sha256-pinned),
                         patches, builds native Guile + deps + wasm Guile,
                         runs the node tests; --browser adds Chromium test
browser-test.js          headless-Chromium harness (playwright), WEBDIR env
build-deps.sh            exploratory version (operates on top-level dirs);
build-guile-wasm.sh      superseded by bootstrap.sh, kept for the record
patches/                 the two source patches described above
eval-test.c              kill-criterion test (node + browser variants)
run-scheme.c             eval argv[1], with timing
lily-api-test.c          LilyPond-API surface test
guile-env-pre.js         MEMFS mtime + GUILE_AUTO_COMPILE pre-js
webtest/                 browser bundle (eval-test.html + 50 MB .data)
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

1. **The biggest slice is LilyPond's own configure**: `configure.ac` in
   2.27.1 has zero cross-compilation handling (verified by grep) — unlike
   Guile, whose official cross path we merely activated. Expect
   Guile-configure-class archaeology with no precedent to lean on.
   Two good tree facts, also verified: the smob layer registers callbacks
   through properly-typed trampolines (`smobs.tcc` — no hashtab.c-style
   cast UB visible at the C++/Guile boundary), and `.go` compilation of
   `scm/` is an optional side target (`make bytecode`), so v0 can load
   `.scm` source and defer `guild compile --target=wasm32` to later.
2. C++: LilyPond is C++ calling libguile constantly — `em++` handles C++
   fine, but LilyPond mixes C++ exceptions with Guile's longjmp; both map to
   JS exceptions under default `-sSUPPORT_LONGJMP=emscripten`, which is the
   right combination to start with.
3. The rendering stack below Guile has a maintained precedent in
   `VitoVan/pango-cairo-wasm` — adaptation, not copy-paste: recipes pin
   their own versions, and production Hacklily runs a *patched* libcairo
   the wasm build should match. The exact gates in 2.27.1's `configure.ac`
   (all hard-fail `PKG_CHECK_MODULES`, so configure is unreachable until
   they exist in `wasm-install/lib/pkgconfig`): `bdw-gc` (done),
   `fontconfig >= 2.13`, `freetype2 >= 2.10`, `glib-2.0`/`gobject-2.0
   >= 2.64`, `pangoft2 >= 1.44.5` (note: pangoft2, not pangocairo),
   `cairo >= 1.16`, `libpng >= 1.6`, `zlib`. zlib and libpng come free as
   Emscripten ports (`-sUSE_ZLIB -sUSE_LIBPNG`), so the real build list is
   freetype → expat → fontconfig → glib/gobject → harfbuzz → pixman →
   cairo → pango. Ghostscript appears only under documentation /
   classic-backend conditionals — the Cairo backend keeps it out.
   Separate hazard: the `REQUIRED` host tools (Python ≥ 3.10, bison, flex,
   FontForge, TeX/Metafont) must be detected as *build*-machine tools
   while CC/CXX are emcc — mixed build/host discipline this configure has
   never exercised. Cheap first action next session: run `emconfigure`
   over LilyPond's configure and let it die at the first `PKG_CHECK` —
   everything before that line (compiler, host tools, Guile detection)
   runs and shows whether the no-cross-support breakage is shallow or
   structural.
4. `share/` tree + Emmentaler fonts into the FS image, with lazy loading
   and compression (the 40–80 MB estimate still looks right). Fonts and
   the share tree can be lifted from the native build — no FontForge
   under wasm.
5. Native LilyPond 2.27.1 + native Guile already build in this workspace
   (`lily-build.log`, prior session) — that pairing is the reference and
   supplies the host-side tools for cross-compiling `.scm` → `.go`.

Known deferred items: `--spill-pointers` costs perf (unmeasured; can also
try collect-only-at-quiescence later); browser memory-growth workaround
above; `-g2` name sections add binary size (strippable after the pass runs
if it matters).
