// Warm lilypond.wasm render worker.
//
// Load with `new Worker('lily-worker.js')` from a page served next to
// lilypond-web.js / lilypond.wasm / lilypond.data.  Boots one LilyPond
// instance, pays Guile boot + ly:parse-init once (a full warmup render),
// then serves repeat renders from the warm instance by evaluating the
// per-file loop body of lilypond-all (scm/lily.scm) through
// scm_c_eval_string: lilypond-file -> ly:check-expected-warnings ->
// session-terminate -> ly:reset-options -> ly:reset-all-fonts.  That is
// LilyPond's own no-fork state reset, the same path `lilypond a.ly b.ly`
// uses natively; it needs the build to export _scm_c_eval_string and keep
// the runtime alive after main exits (-sEXIT_RUNTIME=0, see bootstrap.sh).
//
// Protocol (postMessage):
//   -> {type: 'render', id, src}
//   <- {type: 'ready', warmup_ms}          once, after boot+warmup
//   <- {type: 'log', line}                 streamed during renders
//   <- {type: 'result', id, ok, svg, logs, ms}
//
// Containment is the caller's job: this worker cannot interrupt a runaway
// render (single-threaded wasm has no preemption), so the page should
// enforce a deadline with worker.terminate() and spawn a fresh worker —
// the browser analog of the render container being recycled.  A crashed
// or wedged instance never outlives its worker.

importScripts('lilypond-web.js');

const WARMUP_SRC = '\\version "2.27.1"\n{ c\'4 }\n';

// The per-render Scheme.  Everything is looked up explicitly out of the
// (lily) module (the bindings are module-private, and after main exits the
// current module is unspecified).  Failures are reported through
// /render/status rather than the SCM return value to keep the C boundary
// trivial.  Cleanup runs on both success and throw; a throw during cleanup
// itself leaves state suspect, which surfaces as "fatal:" and should make
// the caller recycle the worker.
const RENDER_EVAL = `
(call-with-output-file "/render/status"
  (lambda (status-port)
    (display
     (catch #t
       (lambda ()
         (let* ((lily (resolve-module '(lily)))
                (lilypond-file (module-ref lily 'lilypond-file))
                (session-terminate (module-ref lily 'session-terminate))
                (check-warnings (module-ref lily 'ly:check-expected-warnings))
                (reset-options (module-ref lily 'ly:reset-options))
                (all-options (module-ref lily 'ly:all-options))
                (reset-fonts (module-ref lily 'ly:reset-all-fonts))
                (settings (all-options))
                (failed #f)
                (cleanup (lambda ()
                           (session-terminate)
                           (reset-options settings)
                           (reset-fonts)
                           (flush-all-ports))))
           (catch #t
             (lambda ()
               (lilypond-file (lambda (key file) (set! failed #t))
                              "/render/input.ly")
               (check-warnings)
               (cleanup)
               (if failed "failed" "ok"))
             (lambda (key . args)
               (cleanup)
               (simple-format #f "throw: ~a" key)))))
       (lambda (key . args) (simple-format #f "fatal: ~a" key)))
     status-port)))
`;

let M = null;
let logs = [];
const pushLog = (line) => { logs.push(line); postMessage({ type: 'log', line }); };

const ready = createLilypond({
  noInitialRun: true,
  print: pushLog,
  printErr: pushLog,
}).then((mod) => {
  M = mod;
  const t0 = performance.now();
  M.FS.mkdir('/render');
  M.FS.writeFile('/render/input.ly', WARMUP_SRC);
  // Full first render through main: boots Guile, loads the module tree,
  // runs ly:parse-init, records the session snapshot that session-terminate
  // restores.  ly:exit unwinds out of callMain (ExitStatus); with
  // EXIT_RUNTIME=0 the runtime — and the booted Guile heap — stays live.
  // -o is a C++ global that outlives ly:reset-options, so every later
  // render writes to the same '-o' basename: point it at /render/input.
  try {
    M.callMain(['-dbackend=cairo', '--svg', '-o', '/render/input',
                '/render/input.ly']);
  } catch (e) {
    if (!e || e.name !== 'ExitStatus') throw e;
  }
  // Warm renders parse /render/input.ly and write basename-derived output
  // into the cwd.
  M.ccall('scm_c_eval_string', 'number', ['string'], ['(chdir "/render")']);
  postMessage({ type: 'ready', warmup_ms: Math.round(performance.now() - t0) });
});

onmessage = (e) => {
  const { type, id, src } = e.data;
  if (type !== 'render') return;
  ready.then(() => {
    const t0 = performance.now();
    logs = [];
    for (const f of ['/render/input.svg', '/render/status']) {
      try { M.FS.unlink(f); } catch (_) { /* absent on first render */ }
    }
    M.FS.writeFile('/render/input.ly', src);
    try {
      M.ccall('scm_c_eval_string', 'number', ['string'], [RENDER_EVAL]);
    } catch (err) {
      // A trap or abort escaping the eval means the instance is suspect:
      // report it and let the caller recycle the worker.
      postMessage({
        type: 'result', id, ok: false,
        status: 'exception: ' + (err && (err.stack || err.message || String(err))),
        svg: null, logs, ms: Math.round(performance.now() - t0),
      });
      return;
    }
    let status = 'no status written';
    try { status = M.FS.readFile('/render/status', { encoding: 'utf8' }); } catch (_) {}
    let svg = null;
    try { svg = M.FS.readFile('/render/input.svg', { encoding: 'utf8' }); } catch (_) {}
    postMessage({
      type: 'result', id,
      ok: status === 'ok' && svg !== null,
      status, svg, logs,
      ms: Math.round(performance.now() - t0),
    });
  });
};
