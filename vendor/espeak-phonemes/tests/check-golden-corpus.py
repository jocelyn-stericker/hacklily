#!/usr/bin/env python3
"""Verify that an espeak-ng build produces IPA matching the golden corpus.

Usage:
    cd build && python3 ../tests/check-golden-corpus.py

Returns exit code 0 if all entries match, 1 if any mismatch.
"""

import json
import subprocess
import sys
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GOLDEN_NDJSON = REPO_ROOT / "tests" / "golden-corpus.ndjson"

def run_ipa(lang, text):
    espeak = REPO_ROOT / "build" / "src" / "espeak-ng"
    env = os.environ.copy()
    env["ESPEAK_DATA_PATH"] = str(REPO_ROOT / "build")
    env["LD_LIBRARY_PATH"] = str(REPO_ROOT / "build" / "src") + ":" + env.get("LD_LIBRARY_PATH", "")
    result = subprocess.run(
        [str(espeak), "-q", "--ipa", "-v", lang, text],
        capture_output=True, text=True, env=env, timeout=30
    )
    return result.stdout.strip()

errors = 0
checked = 0

with open(GOLDEN_NDJSON) as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        entry = json.loads(line)
        expected = entry["ipa"]
        actual = run_ipa(entry["lang"], entry["text"])
        if expected != actual:
            print(f"MISMATCH [{entry['lang']}] {entry['text']!r}")
            print(f"  expected: {expected!r}")
            print(f"  actual:   {actual!r}")
            print()
            errors += 1
        checked += 1

if errors:
    print(f"\n{errors}/{checked} entries mismatched")
    sys.exit(1)
else:
    print(f"All {checked} entries match golden corpus.")
