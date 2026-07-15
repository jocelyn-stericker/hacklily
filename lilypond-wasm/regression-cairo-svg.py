#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
#
# regression-cairo-svg.py — run the LilyPond regression corpus through the
# cairo → SVG backend on *both* the native aarch64 LilyPond 2.27.1 and the
# wasm (node) LilyPond 2.27.1, and count how many files crash each backend.
#
# This is the crash-hunting pass described in AGENTS.md / the user's brief:
# correctness comparison comes later; for now we only want "does it finish
# without aborting / segfaulting / trapping" for every .ly under
# input/regression/.
#
# Why per-file invocations instead of `lilypond -dread-file-list`: a single
# segfault / wasm trap kills the whole batch, so we'd lose crash attribution.
# Each file gets its own subprocess, its own log, and its own exit code.
#
# Crash model (see lily/main.cc exit codes + the brief's notes):
#   ok        — exit 0 (warnings are fine; some regression files emit them
#               deliberately and still exit 0)
#   fail      — exit 1/2/3 with no signal and no emscripten abort marker:
#               lilypond reported a parse/engraver error and exited cleanly
#   crash     — killed by signal (native: segfault/SIGABRT/etc.), OR timed
#               out, OR (wasm only) exited non-zero with an emscripten abort
#               / trap / OOM marker on stderr. Wasm traps don't raise signals:
#               Emscripten catches them and calls abort(), exiting 1 — so for
#               the wasm backend we also scan stderr for the abort signature.
#
# Resume: results are appended to <out>/<backend>/results.jsonl as each file
# finishes. Re-running skips files already recorded (unless --no-resume), so
# an interrupted long wasm sweep isn't lost.
#
# Usage:
#   ./regression-cairo-svg.py                 # run both backends, -j 4
#   ./regression-cairo-svg.py --backend wasm --jobs 3 --timeout 240
#   ./regression-cairo-svg.py --backend native --limit 50     # quick smoke
#   ./regression-cairo-svg.py --filter svg                    # only *svg*.ly
#
# Env overrides: GUILE_WASM_WORK (work dir; default ./work).
#
# Requires the lilypond-wasm bootstrap.sh to have completed stages
# lilypond, lilypond-native, and lily-bytecode (so both the wasm node binary
# with .go bytecode and the native aarch64 binary exist).

import argparse
import json
import os
import re
import signal
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORK = Path(os.environ.get("GUILE_WASM_WORK", ROOT / "work"))
LILY_V = "2.27.1"
LILY_SRC = WORK / "src" / f"lilypond-{LILY_V}"
DEFAULT_CORPUS = LILY_SRC / "input" / "regression"

NATIVE_BIN = LILY_SRC / "build-native" / "out" / "bin" / "lilypond"
NATIVE_LIB = WORK / "native-install" / "lib"
NATIVE_DATADIR = LILY_SRC / "build-native" / "out" / "share" / "lilypond" / "current"

WASM_BIN = WORK / "wasm-install" / "bin" / "lilypond"
WASM_GUILE_LOAD = WORK / "wasm-install" / "share" / "guile" / "3.0"
WASM_GUILE_CC = WORK / "wasm-install" / "lib" / "guile" / "3.0" / "ccache"
WASM_DATADIR = WORK / "wasm-install" / "share" / "lilypond" / LILY_V

FONTS_CONF = WORK / "test" / "fonts.conf"

# Emscripten's abort / wasm-trap footprint in stderr. A clean lilypond
# failure prints `fatal error: failed files: "..."` and exits 1 with *none*
# of these; a wasm trap / abort() prints one of them and exits non-zero.
ABORT_RE = re.compile(
    r"Aborted\(|RuntimeError|wasm trap|unreachable executed|SIGABRT|"
    r"Aborted by|abort\(\)|out of memory|Aborted\(reason|"
    r"wasm-function\[|wasm://wasm/",
    re.IGNORECASE,
)


def env_for(backend: str) -> dict:
    e = dict(os.environ)
    # Keep PATH so `node` resolves for the wasm backend.
    if FONTS_CONF.exists():
        e["FONTCONFIG_FILE"] = str(FONTS_CONF)
    if backend == "native":
        e["LD_LIBRARY_PATH"] = (
            str(NATIVE_LIB) + os.pathsep + e.get("LD_LIBRARY_PATH", "")
        )
        e["LILYPOND_DATADIR"] = str(NATIVE_DATADIR)
    else:  # wasm
        e["GUILE_LOAD_PATH"] = str(WASM_GUILE_LOAD)
        e["GUILE_LOAD_COMPILED_PATH"] = str(WASM_GUILE_CC)
        e["GUILE_AUTO_COMPILE"] = "0"
        e["LILYPOND_DATADIR"] = str(WASM_DATADIR)
    return e


def argv_for(backend: str, ly_path: Path, out_prefix: Path) -> list[str]:
    head = [str(NATIVE_BIN)] if backend == "native" else ["node", str(WASM_BIN)]
    return head + ["-dbackend=cairo", "--svg", "-o", str(out_prefix), str(ly_path)]


def classify(backend: str, rc: int | None, timed_out: bool, aborted: bool) -> tuple[str, str]:
    """Return (status, detail). status ∈ {ok, fail, crash}."""
    if timed_out:
        return "crash", "timeout"
    if rc is None:
        return "crash", "no-exit"
    if rc < 0:
        try:
            name = signal.Signals(-rc).name
        except ValueError:
            name = f"signal {-rc}"
        return "crash", name
    if rc == 0:
        return "ok", ""
    # rc > 0: a clean lilypond-reported failure, *unless* the wasm backend
    # aborted via Emscripten (traps don't raise signals; they exit 1 with
    # an abort marker on stderr).
    if backend == "wasm" and aborted:
        return "crash", f"abort(exit {rc})"
    return "fail", f"exit {rc}"


def run_one(backend: str, ly_path: Path, workdir: Path, log_path: Path,
            timeout: float, corpus_root: Path) -> dict:
    # Per-file working dir keeps multipage outputs (score-1.svg, score-2.svg,
    # ...) from colliding across files — two files named foo.ly and foo-1.ly
    # would otherwise both write foo-1.svg.
    workdir.mkdir(parents=True, exist_ok=True)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    out_prefix = workdir / "score"
    argv = argv_for(backend, ly_path, out_prefix)
    env = env_for(backend)

    t0 = time.time()
    aborted = False
    with open(log_path, "wb") as lf:
        proc = subprocess.Popen(
            argv, stdout=lf, stderr=subprocess.STDOUT, env=env,
            cwd=str(workdir), start_new_session=True,
        )
        rc: int | None = None
        timed_out = False
        try:
            rc = proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            except ProcessLookupError:
                pass
            try:
                rc = proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                rc = None
        dur = time.time() - t0
    if backend == "wasm":
        try:
            with open(log_path, "rb") as f:
                aborted = bool(ABORT_RE.search(f.read().decode("utf-8", "replace")))
        except OSError:
            aborted = False

    status, detail = classify(backend, rc, timed_out, aborted)
    return {
        "file": str(ly_path.relative_to(corpus_root)),
        "status": status,
        "exit_code": rc,
        "timed_out": timed_out,
        "detail": detail,
        "duration_s": round(dur, 2),
        "log": str(log_path),
    }


def load_done(results_file: Path) -> dict[str, dict]:
    done = {}
    if results_file.exists():
        for line in results_file.read_text().splitlines():
            if not line.strip():
                continue
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            done[r["file"]] = r
    return done


def discover(corpus: Path, filt: str | None, limit: int | None) -> list[Path]:
    files = sorted(p for p in corpus.rglob("*.ly") if p.is_file())
    if filt:
        files = [p for p in files if filt in str(p.relative_to(corpus))]
    if limit:
        files = files[:limit]
    return files


def run_backend(backend: str, corpus: Path, files: list[Path], out_root: Path,
                jobs: int, timeout: float, resume: bool) -> dict[str, dict]:
    bdir = out_root / backend
    (bdir / "logs").mkdir(parents=True, exist_ok=True)
    (bdir / "output").mkdir(parents=True, exist_ok=True)
    results_file = bdir / "results.jsonl"
    done = load_done(results_file) if resume else {}
    todo = [f for f in files if str(f.relative_to(corpus)) not in done]
    print(f"[{backend}] {len(files)} files: "
          f"{len(done)} already done, {len(todo)} to run", flush=True)

    if todo:
        # Open results.jsonl in append, line-buffered.
        rfh = open(results_file, "a", buffering=1)
        try:
            with ThreadPoolExecutor(max_workers=jobs) as ex:
                futs = {}
                for ly in todo:
                    rel = ly.relative_to(corpus)
                    safe = re.sub(r"[^A-Za-z0-9._-]", "_", str(rel))
                    workdir = bdir / "output" / safe
                    log_path = bdir / "logs" / f"{safe}.log"
                    futs[ex.submit(run_one, backend, ly, workdir, log_path,
                                   timeout, corpus)] = rel
                n = 0
                for fut in as_completed(futs):
                    res = fut.result()
                    rfh.write(json.dumps(res) + "\n")
                    n += 1
                    done[res["file"]] = res
                    if n % 25 == 0 or n == len(todo):
                        print(f"[{backend}] {n}/{len(todo)} "
                              f"(last: {res['file']} → {res['status']})", flush=True)
        finally:
            rfh.close()

    return done


def summarize(backend: str, done: dict[str, dict]) -> dict:
    counts = {"ok": 0, "fail": 0, "crash": 0}
    crashes = []
    for res in done.values():
        s = res["status"]
        counts[s] = counts.get(s, 0) + 1
        if s == "crash":
            crashes.append(res)
    crashes.sort(key=lambda r: r["file"])
    return {
        "backend": backend,
        "total": len(done),
        "ok": counts["ok"],
        "fail": counts["fail"],
        "crash": counts["crash"],
        "crashes": crashes,
    }


def write_crashes(out_root: Path, backend: str, crashes: list[dict]):
    p = out_root / backend / "crashes.txt"
    with open(p, "w") as f:
        for c in crashes:
            f.write(f"{c['file']}\t{c['detail']}\tlog={c['log']}\n")
    return p


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--backend", choices=["native", "wasm", "both"],
                    default="both")
    ap.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS,
                    help=f"corpus root (default: {DEFAULT_CORPUS})")
    ap.add_argument("--out", type=Path, default=ROOT / "regression-results",
                    help="output root (default: ./regression-results)")
    ap.add_argument("--jobs", "-j", type=int, default=4,
                    help="parallel lilypond processes (native ~91MB each, "
                         "wasm ~800MB each — mind RAM)")
    ap.add_argument("--timeout", type=float, default=180.0,
                    help="per-file timeout in seconds (default 180)")
    ap.add_argument("--limit", type=int, default=None,
                    help="only run the first N files (debugging)")
    ap.add_argument("--filter", default=None,
                    help="substring filter on corpus-relative path")
    ap.add_argument("--no-resume", action="store_true",
                    help="ignore prior results.jsonl; re-run everything")
    args = ap.parse_args()

    # Sanity-check that the binaries / data exist; warn + skip otherwise.
    backends = ["native", "wasm"] if args.backend == "both" else [args.backend]
    for b in backends:
        binp = NATIVE_BIN if b == "native" else WASM_BIN
        datadir = NATIVE_DATADIR if b == "native" else WASM_DATADIR
        if not binp.exists():
            print(f"WARNING: {b} binary not found at {binp}; skipping {b}",
                  file=sys.stderr)
        if not datadir.exists():
            print(f"WARNING: {b} datadir missing at {datadir}",
                  file=sys.stderr)
    if not args.corpus.exists():
        print(f"ERROR: corpus not found at {args.corpus}", file=sys.stderr)
        sys.exit(2)

    args.out.mkdir(parents=True, exist_ok=True)
    files = discover(args.corpus, args.filter, args.limit)
    print(f"Discovered {len(files)} .ly files under {args.corpus}", flush=True)
    if not files:
        print("Nothing to do.", file=sys.stderr)
        sys.exit(0)

    summaries = {}
    for b in backends:
        done = run_backend(b, args.corpus, files, args.out, args.jobs,
                           args.timeout, resume=not args.no_resume)
        s = summarize(b, done)
        cp = write_crashes(args.out, b, s["crashes"])
        summaries[b] = s
        print(f"[{b}] crash list → {cp}", flush=True)

    # Combined report.
    print("\n" + "=" * 60)
    print("REGRESSION CAIRO-SVG CRASH SWEEP — SUMMARY")
    print("=" * 60)
    hdr = f"{'backend':<8} {'total':>6} {'ok':>6} {'fail':>6} {'crash':>6}"
    print(hdr)
    print("-" * len(hdr))
    for b in backends:
        s = summaries[b]
        print(f"{b:<8} {s['total']:>6} {s['ok']:>6} {s['fail']:>6} {s['crash']:>6}")
    print()
    for b in backends:
        s = summaries[b]
        print(f"{b} crashes ({s['crash']}):")
        for c in s["crashes"]:
            print(f"  {c['file']}  [{c['detail']}]")
        print()

    summary_path = args.out / "summary.json"
    with open(summary_path, "w") as f:
        json.dump({b: {k: v for k, v in s.items() if k != "crashes"}
                   | {"crashes": [c["file"] for c in s["crashes"]]}
                   for b, s in summaries.items()}, f, indent=2)
    print(f"summary → {summary_path}")


if __name__ == "__main__":
    main()