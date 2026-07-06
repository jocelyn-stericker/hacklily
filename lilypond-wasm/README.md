# lilypond-wasm

[GNU LilyPond](https://lilypond.org) compiled to WebAssembly: engrave real
scores to SVG **in the browser**, no server, with warm re-renders fast
enough for live feedback while typing.

This is the real thing, not a reimplementation: LilyPond 2.27.1, the real
libguile (Guile 3.0.11, bytecode VM, C API and all), and the full text
stack it needs — fontconfig, freetype, glib/gobject, pango, harfbuzz,
cairo — cross-compiled with Emscripten into one single-threaded wasm
binary. Output is byte-identical in structure to a native LilyPond build,
including `textedit://` point-and-click anchors on every note.

| Measure (headless Chromium) | Value |
|---|---|
| first render (module init + Guile boot + engrave) | ~0.7 s |
| **warm re-render, 4-note score** | **~40 ms** |
| warm re-render, 64-measure score | ~0.4–0.5 s |
| bundle over the wire (gzip: wasm + data + loader) | ~12 MB |
| memory | starts ~26 MB, grows on demand |

## Using it

Build (or download a published bundle), then serve these files from one
directory: `lilypond-web.js`, `lilypond.wasm`, `lilypond.data`,
`lily-worker.js`.

### Warm renders in a Web Worker (recommended)

`lily-worker.js` keeps one LilyPond instance alive and renders into it
repeatedly — the per-render cost is engraving only, not Guile boot:

```js
const worker = new Worker('lily-worker.js');
worker.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'ready')  console.log(`warm in ${m.warmup_ms} ms`);
  if (m.type === 'log')    console.log(m.line);       // streamed lilypond log
  if (m.type === 'result') {
    if (m.ok) container.innerHTML = m.svg;            // rendered in m.ms ms
    else console.warn(m.status, m.logs.join('\n'));   // compile errors etc.
  }
};
worker.postMessage({
  type: 'render', id: 1,
  src: '\\version "2.27.1"\n{ c\'4 d\'4 e\'4 f\'4 }\n',
});
```

Two rules the caller owns:

- **Deadlines.** Single-threaded wasm cannot interrupt a runaway render
  (there is no preemption), so enforce a timeout with `worker.terminate()`
  and spawn a fresh worker. Also listen on `worker.onerror`. This is the
  browser analog of recycling a render container.
- **One render at a time per worker.** Renders are serialized inside the
  instance; queue or debounce on your side.

### One-shot (simplest possible)

```js
const M = await createLilypond({ noInitialRun: true, printErr: console.log });
M.FS.writeFile('/input.ly', src);
M.callMain(['-dbackend=cairo', '--svg', '-o', '/out', '/input.ly']);
const svg = M.FS.readFile('/out.svg', { encoding: 'utf8' });
```

### Under node

The node build (a separate link of the same objects, using the host
filesystem directly) behaves like a normal `lilypond` binary:

```sh
GUILE_LOAD_PATH=$PREFIX/share/guile/3.0 \
GUILE_LOAD_COMPILED_PATH=$PREFIX/lib/guile/3.0/ccache \
GUILE_AUTO_COMPILE=0 \
node $PREFIX/bin/lilypond -dbackend=cairo --svg -o out score.ly
```

## Building

```sh
./bootstrap.sh            # everything through the node render test
./bootstrap.sh --browser  # + browser bundle + headless-Chromium tests
```

`bootstrap.sh` is the single, idempotent entry point: it downloads every
source sha256-pinned (including emsdk), applies the patches, builds a
native Guile (the cross build needs one of the exact same version), the
wasm dependency stack, wasm Guile, LilyPond, cross-compiles the Scheme
libraries to bytecode, and runs render tests at each level. Stages are
stamped under `work/`; re-running skips what's done.

Host prerequisites (Debian names): `build-essential pkg-config curl git
python3 gperf libgc-dev libgmp-dev libffi-dev libunistring-dev meson
ninja-build python3-packaging bison flex gettext`, plus for the LilyPond
stage (it builds its fonts/data with host tools): `fontforge-nox t1utils
texlive-binaries texlive-metapost texlive-latex-base` and native
`libpango1.0-dev libcairo2-dev libglib2.0-dev` for the reference binary.
The browser tests additionally want `nodejs` with `playwright` importable
(`npm i playwright && npx playwright install chromium --with-deps`);
without it the bundle is still built and a manual test URL is printed.

## How it works, and the hacks

The full build-archaeology story — every finding, with dates and numbers —
is in [GUILE-WASM-SPIKE.md](GUILE-WASM-SPIKE.md). The short version:

**The one recurring class of real bug** is C's casted-function-pointer
idiom: calling a function through a pointer of a different arity or return
type is UB that x86/ARM tolerate but wasm's typed `call_indirect` traps.
It struck five times, in code untouched for decades: Guile's `hashtab.c`,
Guile's extension-init registry, Guile's `scm_c_define_module`, GNOME's
interface-init callbacks (glib/pango), and pango's `(GFunc)` destructor
casts — the last found only when warm re-renders started exercising font
*finalization*, which a render-once-and-exit process never reaches. All
fixes are semantics-preserving on native (`patches/`) and would equally be
needed under clang CFI; they're upstream candidates, not wasm-specific
forks.

Beyond that, in decreasing order of interest:

- **bdwgc registers no static roots on Emscripten** — `DATASTART ==
  DATAEND` in `gcconfig.h`, so anything reachable only from C globals gets
  collected and Guile dies at boot. 18-line fix mirroring bdwgc's own WASI
  port.
- **GC vs. wasm locals**: Binaryen's `--spill-pointers` pass makes pointers
  in wasm locals visible to the collector via the linear-memory shadow
  stack (needs the name section at link; the shipped binary is stripped
  after).
- **Warm instance without fork**: LilyPond already has a no-fork
  per-file state reset (`session-terminate` + `ly:reset-options` +
  `ly:reset-all-fonts` — how `lilypond a.ly b.ly` works on platforms
  without fork). `lily-worker.js` runs exactly that loop body per render
  through an exported `scm_c_eval_string`, with `-sEXIT_RUNTIME=0` keeping
  the booted Guile heap alive after main exits.
- **Bytecode is cross-compiled** (`cross-bytecode.ly`): LilyPond's `make
  bytecode` can't cross (Guile auto-compile loads each `.go` it writes;
  a native Guile can't load wasm32 bytecode), so the native LilyPond
  binary loads every module and then `compile-file`s with the compiler's
  target fluids set to `wasm32-unknown-emscripten`. Startup 3.6 s → 0.97 s
  under node; output byte-identical. The Guile module payload is pruned by
  fs-tracing an actual render: 36 → 12 MB.
- **Everything is single-threaded**: pango 1.5x's fontconfig worker thread
  is patched to run synchronously; `-pthread` must be kept out of every
  compile (it flips codegen to shared-memory atomics), and it leaks in
  through at least four independent doors (meson's `threads` dependency,
  AX_PTHREAD, pixman's probe, bundled CLI tools). No COOP/COEP headers
  needed as a result.
- **glib under Emscripten** is a solved-by-the-community problem: the
  [wasm-vips](https://github.com/kleisauke/wasm-vips) patch series is
  vendored, with its GRegex removal reversed (LilyPond's Scheme regex
  layer needs GRegex).
- **cairo's SVG surface drops link tags** (in any build, native included);
  the vendored patch (from cairo MR !254, as used by Hacklily production)
  implements the tag hook, which is what makes point-and-click anchors
  work.
- **Chromium's TextDecoder rejects resizable ArrayBuffers**, which is what
  the heap becomes under `ALLOW_MEMORY_GROWTH` on emscripten 6.x:
  `-sGROWABLE_ARRAYBUFFERS=0` keeps the classic buffer so memory can start
  small and still grow.
- **The file packager loses mtimes**, making preloaded `.go` bytecode look
  staler than its `.scm` source — Guile then silently falls back to the
  interpreter and overflows the JS stack. The pre-js bumps mtimes at boot.

## Repo layout

```
bootstrap.sh        canonical build: download → patch → build → test
patches/            Guile/bdwgc/glib/pango/cairo patches (see above)
lily-worker.js      warm-instance Web Worker render API
lily-warm.html      warm-instance test page (browser-test.js drives it)
lily-browser.html   one-shot test page
lily-browser-pre.js pre-js: env plumbing + mtime fix for the browser build
cross-bytecode.ly   scm/lily → wasm32 .go, run by the native binary
browser-test.js     headless-Chromium harness (playwright)
smoke/              test scores + fontconfig config
GUILE-WASM-SPIKE.md the full engineering log
```

## Status and limits

- One page-size/backend configuration exercised so far: `-dbackend=cairo
  --svg`. PDF/PNG via cairo should be close but are untested.
- MIDI output files are produced but not surfaced by the worker protocol
  yet.
- The `.data` payload is one eager 32.5 MB preload (7.8 MB gzipped);
  lazy-loading is the next size lever.
- Upstreaming: the bdwgc static-roots fix and the Guile/pango cast fixes
  are upstream candidates (they fix UB visible under clang CFI on any
  platform); the glib series is maintained by wasm-vips.

## License

LilyPond is GPL-3.0-or-later; Guile is LGPL-3.0-or-later; the other
components carry their usual free licenses (MIT/X11, LGPL, MPL/LGPL for
cairo, FTL/GPL for freetype). The combined `lilypond.wasm` +
`lilypond.data` bundle is therefore effectively **GPL-3.0-or-later**: if
you ship it, comply with the GPL (this repo's `bootstrap.sh` fetches the
complete corresponding sources, and `patches/` is the complete set of
modifications). The build scripts, worker, and test pages in this repo
are GPL-3.0-or-later as well.
