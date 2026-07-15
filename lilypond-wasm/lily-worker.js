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
//   <- {type: 'result', id, ok, recycle, pages, midi, logs, status,
//        warnings, errors, ms}
//      status: ok | failed | fatal
//      recycle: true for fatal — conservatively recycle the worker (it
//               may still be usable; recycling is just the safe choice).
//               A genuine wasm trap (e.g. an out-of-bounds memory access
//               from an FFI pointer dereference) crashes the renderer
//               before this message can be sent, so the only reliable
//               signal of a dead instance is no result at all / a dead
//               worker — the caller should terminate + respawn on that
//               regardless of `recycle`.
//      warnings/errors: diagnostics counted by ly:reset-log-counters; for
//               badging only, they never change status.  ok = engraved
//               (output sound, instance fine); failed = parser failed the
//               file (output suspect but returned so the caller can show
//               what engraved; instance still fine, keep warm); fatal =
//               lilypond-file or cleanup raised, or ly:exit was called —
//               the render aborted with no pages (the instance is often
//               still usable, so recycle is conservative, not required).
//               ok is true iff pages exist and not fatal.
//      pages: one SVG string per page (LilyPond writes input.svg for a
//             single page but input-1.svg, input-2.svg, ... when it breaks
//             the score across pages); midi: Uint8Array of input.midi when the
//             score has a \midi block, else null.
//
// Containment is the caller's job: this worker cannot interrupt a runaway
// render (single-threaded wasm has no preemption), so the page should
// enforce a deadline with worker.terminate() and spawn a fresh worker —
// the browser analog of the render container being recycled.  A crashed
// or wedged instance never outlives its worker.

importScripts("lilypond-web.js");

const WARMUP_SRC = '\\version "2.27.1"\n{ c\'4 }\n';

// The per-render Scheme.  Everything is looked up explicitly out of the
// (lily) module (the bindings are module-private, and after main exits the
// current module is unspecified).  Failures are reported through
// /render/status rather than the SCM return value to keep the C boundary
// trivial.  Cleanup runs on both success and throw; a throw during cleanup
// itself leaves state suspect, which surfaces as "fatal:" and should make
// the caller recycle the worker.
//
// /render/status is two lines:
//   <status>      one of ok | failed | fatal
//   warnings=<n> errors=<m>
// Counters (ly:reset-log-counters / ly:warning-count / ly:error-count, added
// by the success-with-warnings patch) carry warning/error counts for badging
// only — they never change the status.  ok = engraved (warnings/non-fatal
// errors, if any, are in the counts, output is sound); failed = the parser
// failed the file (ly:parser-error set the failed flag, output may be
// partial/wrong but is returned so the caller can show what engraved);
// fatal = lilypond-file or cleanup raised, or ly:exit was called; the render
// aborted with no pages.  The warm build keeps the runtime alive across
// ly:exit, so the instance is often still usable — recycle is conservative,
// not required.  A real wasm trap (out-of-bounds memory access, e.g. from
// an FFI dereference) crashes the renderer before /render/status is written,
// so it surfaces as a dead worker rather than a fatal message; the caller
// must respawn on a dead worker regardless of `recycle`.
// warning-as-error is a no-op under the success-with-warnings build (it
// neither promotes warnings to errors nor exits), by design: the host
// engraves, surfaces diagnostics via the counters, and keeps the warm
// instance.
const RENDER_EVAL = `
(call-with-output-file "/render/status"
  (lambda (port)
    (let* ((lily (resolve-module '(lily)))
           (lilypond-file (module-ref lily 'lilypond-file))
           (session-terminate (module-ref lily 'session-terminate))
           (check-warnings (module-ref lily 'ly:check-expected-warnings))
           (reset-options (module-ref lily 'ly:reset-options))
           (all-options (module-ref lily 'ly:all-options))
           (reset-fonts (module-ref lily 'ly:reset-all-fonts))
           (reset-log-counters (module-ref lily 'ly:reset-log-counters))
           (warning-count (module-ref lily 'ly:warning-count))
           (error-count (module-ref lily 'ly:error-count))
           (settings (all-options))
           (failed #f)
           (cleanup (lambda ()
                      (session-terminate)
                      (reset-options settings)
                      (reset-fonts)
                      (flush-all-ports))))
      (reset-log-counters)
      (let ((status
             (catch #t
               (lambda ()
                 (catch #t
                   (lambda ()
                     (lilypond-file (lambda (key file) (set! failed #t))
                                    "/tmp/hacklily.ly")
                     (check-warnings)
                     (cleanup)
                     (if failed "failed" "ok"))
                   (lambda (key . args)
                     (cleanup)
                     "fatal")))
               (lambda (key . args)
                 "fatal")))
            (w (warning-count))
            (e (error-count)))
        ;; No counter-based status upgrade: warnings and non-fatal errors are
        ;; reported only as the warnings=/errors= counts (for badging).  A
        ;; non-fatal error that engraved (programming error) or any warning
        ;; stays "ok"; only a parser failure (failed flag) becomes "failed",
        ;; and only a raised exception (lilypond-file or cleanup) becomes
        ;; "fatal" — both raise paths collapse to fatal because the caller's
        ;; action is the same (recycle the suspect instance).
        (display status port)
        (newline port)
        (simple-format port "warnings=~a errors=~a" w e)))))
`;

let M = null;
let logs = [];
const pushLog = (line) => {
  logs.push(line);
  postMessage({ type: "log", line });
};

const ready = createLilypond({
  noInitialRun: true,
  print: pushLog,
  printErr: pushLog,
}).then((mod) => {
  M = mod;
  const t0 = performance.now();
  M.FS.mkdir("/render");
  // The input path is load-bearing: LilyPond embeds it in diagnostics
  // ("/tmp/hacklily.ly:line:col") and in SVG textedit: note-click links, so
  // writing it at /tmp/hacklily.ly keeps the wasm worker on the same path
  // the server-based renderer uses (after the client's cleanLogs rewrite
  // of /tmp/lyp/wrappers/hacklily.ly -> /tmp/hacklily.ly).  The editor's
  // error-squiggle regex (Editor.tsx) and the sanitizer's textedit: allowlist
  // (Preview.sanitize.test.ts) both key off "hacklily.ly", so a wasm render
  // reaches them with no client-side rewriting.  Output still goes to the
  // /render cwd via -o /render/input, so the output-naming logic below is
  // untouched.
  M.FS.writeFile("/tmp/hacklily.ly", WARMUP_SRC);
  // Full first render through main: boots Guile, loads the module tree,
  // runs ly:parse-init, records the session snapshot that session-terminate
  // restores.  ly:exit unwinds out of callMain (ExitStatus); with
  // EXIT_RUNTIME=0 the runtime — and the booted Guile heap — stays live.
  // -o is a C++ global that outlives ly:reset-options, so every later
  // render writes to the same '-o' basename: point it at /render/input.
  try {
    M.callMain([
      "-dbackend=cairo",
      "--svg",
      "-o",
      "/render/input",
      "/tmp/hacklily.ly",
    ]);
  } catch (e) {
    if (!e || e.name !== "ExitStatus") throw e;
  }
  // Warm renders parse /tmp/hacklily.ly and write basename-derived output
  // into the cwd (/render, via the -o basename snapshotted above).
  M.ccall("scm_c_eval_string", "number", ["string"], ['(chdir "/render")']);
  postMessage({ type: "ready", warmup_ms: Math.round(performance.now() - t0) });
});

// Everything a render leaves in /render as output: status, input.svg or
// input-N.svg pages, input.midi (the -o basename is /render/input).  The
// input itself lives at /tmp/hacklily.ly, outside /render, so it is never
// swept here.  Cleared before each render
// so a shorter score can't pick up a longer predecessor's stale pages.
const isRenderOutput = (name) =>
  name === "status" || (/^input[-.]/.test(name) && name !== "input.ly");

onmessage = (e) => {
  const { type, id, src } = e.data;
  if (type !== "render") return;
  ready.then(() => {
    const t0 = performance.now();
    logs = [];
    for (const f of M.FS.readdir("/render")) {
      if (isRenderOutput(f)) {
        try {
          M.FS.unlink("/render/" + f);
        } catch (_) {}
      }
    }
    M.FS.writeFile("/tmp/hacklily.ly", src);
    try {
      M.ccall("scm_c_eval_string", "number", ["string"], [RENDER_EVAL]);
    } catch (err) {
      // A catchable raise escaping scm_c_eval_string means the instance is
      // suspect: report fatal and tell the caller to recycle the worker.  In
      // practice a real wasm trap (out-of-bounds memory access from FFI, etc.)
      // takes down the whole renderer before this catch runs, so this path
      // is a backstop for catchable aborts / OOM, not the common trap case —
      // and the common case (dead worker) is handled by the caller respawning.
      // The stack goes into logs so the status field stays a clean enum.
      postMessage({
        type: "result",
        id,
        ok: false,
        status: "fatal",
        recycle: true,
        warnings: 0,
        errors: 0,
        pages: [],
        midi: null,
        logs: logs.concat([String((err && (err.stack || err.message)) || err)]),
        ms: Math.round(performance.now() - t0),
      });
      return;
    }
    let status = "no status written";
    let warnings = 0;
    let errors = 0;
    try {
      const raw = M.FS.readFile("/render/status", { encoding: "utf8" });
      const lines = raw.split("\n");
      status = lines[0] || "no status written";
      const m = /warnings=(\d+)\s+errors=(\d+)/.exec(lines[1] || "");
      if (m) {
        warnings = parseInt(m[1], 10);
        errors = parseInt(m[2], 10);
      }
    } catch (_) {}
    // Single page -> input.svg; multiple pages -> input-1.svg, input-2.svg, ...
    const pages = M.FS.readdir("/render")
      .map((f) => /^input(?:-(\d+))?\.svg$/.exec(f))
      .filter(Boolean)
      .sort((a, b) => (+a[1] || 0) - (+b[1] || 0))
      .map((m) => M.FS.readFile("/render/" + m[0], { encoding: "utf8" }));
    let midi = null;
    try {
      midi = M.FS.readFile("/render/input.midi");
    } catch (_) {}
    // status is one of: ok | failed | fatal (see RENDER_EVAL).
    //   ok     — engraved; any warnings/non-fatal errors are in warnings/
    //            errors (for badging).  Output is sound; instance is fine.
    //   failed — parser failed the file; output may be partial/wrong but we
    //            return what engraved so the caller can show it.  Instance is
    //            fine — keep the warm worker.
    //   fatal  — lilypond-file or cleanup raised, or ly:exit was called; the
    //            render aborted with no pages.  The instance is often still
    //            usable (the warm build survives ly:exit), so recycle is
    //            conservative — but recycling is always safe, and a real wasm
    //            trap crashes the renderer before this runs (the caller
    //            respawns on a dead worker regardless).
    // ok = "there are pages to show and the result is usable"; a pages-less
    // render is not ok, and a fatal render is never ok even if stale pages
    // happen to exist (the caller may still inspect `pages` defensively,
    // but it must not trust them).  A missing status file is treated as
    // fatal — something went sideways reading the result.
    if (status === "no status written") status = "fatal";
    const recycle = status === "fatal";
    postMessage({
      type: "result",
      id,
      ok: pages.length > 0 && !recycle,
      status,
      recycle,
      warnings,
      errors,
      pages,
      midi,
      logs,
      ms: Math.round(performance.now() - t0),
    });
  });
};
