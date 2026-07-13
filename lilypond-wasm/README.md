# lilypond-wasm

This builds LilyPond 2.27.1 and its dependencies for wasm, to run in
a web worker in a browser or Node.js.

**THIS IS PUBLISHED AS-IS, TO SHOW THAT IT IS POSSIBLE. I WILL NOT SUPPORT
THIS AT ALL. IT IS SLOP.**

There's nothing magic here, but the scripts and other patches were made by
generative AI. If you recreate this without generative AI, please let me know
and I will use that instead.

## Building

```sh
./bootstrap.sh            # everything through the node render test
./bootstrap.sh --browser  # + browser bundle + headless-Chromium tests
```

This creates `lilypond-web.js`, `lilypond.wasm`, `lilypond.data`,
`lily-worker.js`.

Debian dependencies: `build-essential pkg-config curl git
python3 gperf libgc-dev libgmp-dev libffi-dev libunistring-dev meson
ninja-build python3-packaging bison flex gettext`, plus for the LilyPond
stage (it builds its fonts/data with host tools): `fontforge-nox t1utils
texlive-binaries texlive-metapost texlive-latex-base` and native
`libpango1.0-dev libcairo2-dev libglib2.0-dev` for the reference binary.
The browser tests additionally want `nodejs` with `playwright` importable
(`npm i playwright && npx playwright install chromium --with-deps`);
without it the bundle is still built and a manual test URL is printed.

## Using it

Build (or download a published bundle), then serve these files from one
directory: `lilypond-web.js`, `lilypond.wasm`, `lilypond.data`,
`lily-worker.js`.

### Warm renders in a Web Worker

`lily-worker.js` keeps one LilyPond instance alive and renders into it
repeatedly — the per-render cost is engraving only, not Guile boot:

```js
const worker = new Worker("lily-worker.js");
worker.onmessage = (e) => {
  const m = e.data;
  if (m.type === "ready") console.log(`warm in ${m.warmup_ms} ms`);
  if (m.type === "log") console.log(m.line); // streamed lilypond log
  if (m.type === "result") {
    if (m.ok) {
      container.innerHTML = m.svg; // all pages concatenated (m.ms ms)
      m.pages; // one SVG string per page
      if (m.midi) m.midi; // Uint8Array, when the score has \midi
    } else console.warn(m.status, m.logs.join("\n")); // compile errors etc.
  }
};
worker.postMessage({
  type: "render",
  id: 1,
  src: "\\version \"2.27.1\"\n{ c'4 d'4 e'4 f'4 }\n",
});
```

The main thread can enforce a timeout with `worker.terminate()` and listen to
errors with `worker.onerror`.

### One-shot (simplest possible)

```js
const M = await createLilypond({ noInitialRun: true, printErr: console.log });
M.FS.writeFile("/input.ly", src);
M.callMain(["-dbackend=cairo", "--svg", "-o", "/out", "/input.ly"]);
const svg = M.FS.readFile("/out.svg", { encoding: "utf8" });
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

## Hacks

- C casted-function-pointers need to have the correct arity and return type in
  WASM. There are six patches that fix this class of issue (glib's container
  sort/free entry points and weak pointers, pango's attribute copying, guile's
  hashtab/extensions, glib iface_init). The class can be re-audited after a
  version bump by recompiling with `-fsyntax-only -Wno-everything
-Wcast-function-type-strict` and filtering for casts that change arity,
  return presence, or a non-i32 value class.
- bdwgc registers no static roots on Emscripten: needed same fix as bdwgc's WASI port
- `--spill-pointers` was needed to make wasm locals visible to the collector
- `cross-bytecode.ly` was needed to compile bytecode. `make bytecode` can't cross compile currently.
- everything is single-threaded to avoid cross-origin isollation requirements
- glib under EMScripten uses [wasm-vips](https://github.com/kleisauke/wasm-vips),
  except GRegex removal is reversed, since we need that
- I used the same patch to fix tags in the SVG cairo backend that I do in Hacklily
- **Chromium's TextDecoder rejects resizable ArrayBuffers**, which is what
  the heap becomes under `ALLOW_MEMORY_GROWTH` on emscripten 6.x:
  `-sGROWABLE_ARRAYBUFFERS=0` keeps the classic buffer so memory can start
  small and still grow.
- we bump mtimes at start when starting to avoid recompiling bytecode,
  since the file packager loses mtimes

## Copyright

I don't think most of this can be copyrighted. The wasm-vips patches are MIT.

LilyPond is GPL-3.0-or-later; Guile is LGPL-3.0-or-later; the other
components carry their usual free licenses (MIT/X11, LGPL, MPL/LGPL for
cairo, FTL/GPL for freetype). The combined `lilypond.wasm` +
`lilypond.data` bundle is therefore effectively GPL-3.0-or-later.
