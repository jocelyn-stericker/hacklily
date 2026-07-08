// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@netcek.ca>

// Dev-only memory probe. Components and routes register named "sources" that
// report counts/bytes of retained structures (tiles, ropes, frames, workers).
// The probe aggregates them into a snapshot readable via `window.__braatMem`.
//
// In production builds, `import.meta.env.DEV` is `false` and every function
// here is dead-code-eliminated to a no-op, so the probe costs nothing in
// shipped code.

export interface MemSourceSnapshot {
  description: string
  values: Record<string, number>
}

export interface MemSnapshot {
  timestamp: number
  sources: Record<string, MemSourceSnapshot>
}

type Getter = () => Record<string, number>

interface Registration {
  name: string
  description: string
  get: Getter
}

const registrations = new Map<string, Registration>()

/**
 * Register a named source of memory-relevant counts/bytes. Returns an
 * unregister function. No-op in production.
 *
 * The getter should be cheap (just reading ref lengths / array sizes). It's
 * called on every snapshot.
 */
export function registerMemSource(
  name: string,
  description: string,
  get: Getter,
): () => void {
  if (!import.meta.env.DEV) return () => {}
  registrations.set(name, { name, description, get })
  return () => {
    registrations.delete(name)
  }
}

/**
 * Take a snapshot of all registered sources. No-op (returns empty) in
 * production.
 */
export function snapshot(): MemSnapshot {
  if (!import.meta.env.DEV) return { timestamp: 0, sources: {} }
  const sources: Record<string, MemSourceSnapshot> = {}
  for (const [name, reg] of registrations) {
    try {
      const values = reg.get()
      sources[name] = { description: reg.description, values }
    } catch (err) {
      sources[name] = {
        description: reg.description,
        values: { error: 1 },
      }
      // Don't let a broken source kill the whole snapshot.
      console.warn(`[memProbe] source "${name}" threw:`, err)
    }
  }
  return { timestamp: performance.now(), sources }
}

/**
 * List registered source names. For debugging ("is my component wired in?").
 */
export function sourceNames(): string[] {
  if (!import.meta.env.DEV) return []
  return [...registrations.keys()]
}

/**
 * Install `window.__braatMem` in dev builds. Call once from the root layout.
 * No-op in production.
 */
export function installMemProbe(): () => void {
  if (!import.meta.env.DEV) return () => {}

  const api = {
    snapshot,
    sourceNames: sourceNames,
    /** Best-effort GC. Requires `--js-flags=--expose-gc` (Chromium) or Safari
     * Web Inspector. Returns false if unavailable. */
    gc(): boolean {
      if (typeof globalThis.gc === 'function') {
        globalThis.gc()
        return true
      }
      return false
    },
    /**
     * Total bytes used by all same-origin agents: main thread, workers, and
     * worklets, including WASM linear memory (e.g. Moonshine model weights).
     *
     * Two separate requirements must both hold:
     *  - The page is cross-origin isolated (COOP + COEP, which the dev server
     *    provides). Guarded below via `crossOriginIsolated`.
     *  - The browser is doing site isolation (a dedicated renderer process per
     *    site). This is not implied by cross-origin isolation: a page can be
     *    cross-origin isolated yet still have the API throw SecurityError, e.g.
     *    under Playwright's `chromium-headless-shell` binary, which skips site
     *    isolation. We can't detect this in-page, so the call below may still
     *    reject even when `crossOriginIsolated` is true.
     *
     * Chrome rate-limits this to ~20 s intervals; the promise blocks until the
     * measurement is available. Returns 0 if the API is unavailable.
     */
    measureAgentMemory(): Promise<number> {
      if (!('measureUserAgentSpecificMemory' in performance)) {
        return Promise.resolve(0)
      }
      if (!self.crossOriginIsolated) {
        return Promise.reject(
          new Error(
            'measureUserAgentSpecificMemory requires cross-origin isolation ' +
              '(crossOriginIsolated is false... COOP/COEP headers may not be ' +
              'taking effect in this context)',
          ),
        )
      }
      return (
        performance as unknown as {
          measureUserAgentSpecificMemory(): Promise<{ bytes: number }>
        }
      )
        .measureUserAgentSpecificMemory()
        .then((r) => r.bytes)
    },
  }

  Object.defineProperty(globalThis, '__braatMem', {
    value: api,
    writable: false,
    configurable: true,
  })

  return () => {
    delete (globalThis as Record<string, unknown>).__braatMem
  }
}
