#!/usr/bin/env bash
# Apply the espeak-ng source patch to the submodule, idempotently.
#
# The submodule is pinned (see .gitmodules / the gitlink) to a pristine
# upstream commit. This overlays the small set of changes needed for a
# phonemes-only, size-optimized WASM build (see patches/espeak-ng-phonemes.patch).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PATCH="$ROOT/patches/espeak-ng-phonemes.patch"

cd "$ROOT/espeak-ng"

if [ ! -e CMakeLists.txt ]; then
  echo "Error: espeak-ng submodule not checked out. Run:" >&2
  echo "  git submodule update --init --recursive" >&2
  exit 1
fi

if git apply --reverse --check "$PATCH" >/dev/null 2>&1; then
  echo "espeak-ng patch already applied — skipping."
elif git apply --check "$PATCH" >/dev/null 2>&1; then
  git apply "$PATCH"
  echo "espeak-ng patch applied."
else
  echo "Error: patch does not apply cleanly to the pinned espeak-ng commit." >&2
  echo "The submodule may be at the wrong revision or already modified." >&2
  exit 1
fi
