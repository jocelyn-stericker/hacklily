// Helpers for reading the dev-only memory probe from a Playwright page.

import type { Page } from '@playwright/test'

import { formatCount } from './format.js'

export interface MemValues {
  [sourceName: string]: {
    description: string
    values: Record<string, number>
  }
}

export interface MemSnapshot {
  timestamp: number
  sources: MemValues
}

/**
 * Read a memory snapshot from the page. Requires the dev build (probe is
 * installed in __root.tsx).
 *
 * Also captures `performance.measureUserAgentSpecificMemory()` and injects it
 * as the `agentMemory` source. That API covers all same-origin agents (main
 * thread, workers, worklets, WASM linear memory) and is rate-limited by the
 * browser to ~20 s intervals -- calls made sooner than that simply block until
 * the interval expires.
 */
export async function readSnapshot(page: Page): Promise<MemSnapshot> {
  const [snap, agentBytes] = await Promise.all([
    page.evaluate(() => {
      const api = (
        window as unknown as { __braatMem?: { snapshot: () => unknown } }
      ).__braatMem
      if (!api) {
        throw new Error(
          'window.__braatMem not found. Is this a dev build? The probe is only installed in dev.',
        )
      }
      return api.snapshot() as MemSnapshot
    }),
    measureAgentMemory(page),
  ])
  if (agentBytes > 0) {
    snap.sources['agentMemory'] = {
      description: 'Agent memory (all threads, incl. workers)',
      values: { totalBytes: agentBytes },
    }
  }
  return snap
}

/**
 * Force GC on the page. Returns false if unavailable (e.g. webkit without
 * the right flag). On chromium, requires --js-flags=--expose-gc.
 */
export async function forceGc(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const api = (window as unknown as { __braatMem?: { gc: () => boolean } })
      .__braatMem
    if (!api) return false
    return api.gc()
  })
}

/**
 * Wait for the probe to be installed and have at least one source registered.
 * Components register on mount, so this confirms the route is live.
 */
export async function waitForProbe(
  page: Page,
  timeoutMs = 10_000,
): Promise<void> {
  // page.waitForFunction runs the predicate inside the browser process and
  // polls natively, avoiding N Node <> browser round-trips at 200ms intervals.
  await page.waitForFunction(
    () => {
      const api = (
        window as unknown as { __braatMem?: { sourceNames: () => string[] } }
      ).__braatMem
      return api != null && api.sourceNames().length > 0
    },
    undefined,
    { timeout: timeoutMs, polling: 200 },
  )
}

/**
 * Get a flat numeric summary from a snapshot: the sum of all numeric values
 * per source, plus a grand total. Used for before/after delta comparisons.
 */
export function summarizeSnapshot(snap: MemSnapshot): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [name, src] of Object.entries(snap.sources)) {
    for (const [key, val] of Object.entries(src.values)) {
      out[`${name}.${key}`] = val
    }
  }
  return out
}

/**
 * Compute the delta between two flat summaries (after - before).
 */
export function delta(
  before: Record<string, number>,
  after: Record<string, number>,
): Record<string, number> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const out: Record<string, number> = {}
  for (const k of keys) {
    out[k] = (after[k] ?? 0) - (before[k] ?? 0)
  }
  return out
}

/**
 * Total bytes across all same-origin agents (main thread + workers + worklets,
 * including WASM linear memory). Wraps `performance.measureUserAgentSpecificMemory`.
 * Returns 0 if the API is unavailable. Blocks for up to ~20 s when called more
 * frequently than Chrome's rate limit allows — callers will see the wait in
 * elapsed time rather than get a silent stale value.
 */
export async function measureAgentMemory(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const api = (
      window as unknown as {
        __braatMem?: { measureAgentMemory: () => Promise<number> }
      }
    ).__braatMem
    if (!api) return 0
    return api.measureAgentMemory()
  })
}

/**
 * Pretty-print a snapshot as a table.
 */
export function formatSnapshot(snap: MemSnapshot): string {
  const lines: string[] = []
  for (const [name, src] of Object.entries(snap.sources)) {
    lines.push(`  [${name}] ${src.description}`)
    for (const [key, val] of Object.entries(src.values)) {
      lines.push(`    ${key}: ${formatCount(val)}`)
    }
  }
  return lines.join('\n')
}
