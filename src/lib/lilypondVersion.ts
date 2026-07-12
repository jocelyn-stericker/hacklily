/**
 * Picks the render backend version (stable vs. unstable) for a piece of
 * LilyPond source, based on its `\version "x.y.z"` declaration.
 *
 * The boundary (2.x where x > 26 → unstable) is a project-wide invariant;
 * it was previously duplicated in App.tsx, Preview.tsx, and ModalPublish.tsx,
 * which is how a future LilyPond version bump would silently desync routing.
 */
const VERSION_RE = /\\version\s*"(\d+)\.?(\d+)?\.?(\d+)?/;

export type RenderVersion = "stable" | "unstable";

/**
 * Returns `[major, minor, patch]` parsed from the first `\version "…"` in
 * `src`, or `null` if none is present. Missing components default to 0.
 */
export function parseLilyPondVersion(
  src: string,
): [number, number, number] | null {
  const m = VERSION_RE.exec(src);
  if (!m) {
    return null;
  }
  const to = (s: string | undefined): number =>
    s === undefined || s === "" ? 0 : parseInt(s, 10);
  return [to(m[1]), to(m[2]), to(m[3])];
}

/**
 * `true` iff `src` declares a LilyPond version routed to the unstable
 * backend (2.27+). Versions without a `\version` fall back to stable.
 */
export function isUnstableVersion(src: string): boolean {
  const v = parseLilyPondVersion(src);
  return v !== null && v[0] === 2 && v[1] > 26;
}

/** Convenience: returns the backend version string for `src`. */
export function renderVersionFor(src: string): RenderVersion {
  return isUnstableVersion(src) ? "unstable" : "stable";
}
