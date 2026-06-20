// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Keeps at most one heavy ML worker resident at a time. Transcription (Moonshine
// ~120 MB) and alignment (~160 MB) each load a large model; left to coexist they
// push 4 GB devices into OOM kills. Both worker owners register a teardown here
// and call `acquireHeavy` before building/using their worker, so acquiring one
// kind frees the other first. Single-residency is a safety invariant, not a
// tunable -- the only knob is how long an idle worker lingers before unloading.
//
// Dependency-light by design: this module imports only settings, never the
// worker modules, so the worker modules can import it without a cycle.

import { getSnapshot, subscribe } from '#/lib/settings'

export type HeavyKind = 'transcribe' | 'align'

const teardowns = new Map<HeavyKind, () => void>()
let resident: HeavyKind | null = null

// Callbacks that re-arm a worker's idle-unload timer; run when settings change so
// toggling the warm-idle window (runHeavyWhileRecording) takes effect on an
// already-idle worker instead of waiting out the timer armed under the old value.
const reschedulers = new Set<() => void>()
let settingsSubscribed = false

// Idle-unload delays. Cold is the memory-sensitive default; warm applies when
// the user enabled heavy work while recording (a "less memory-sensitive" signal)
// and only lengthens how long an idle worker stays warm -- it never lets two
// workers coexist. Tunable.
const COLD_IDLE_MS = 10_000
const WARM_IDLE_MS = 60_000

/**
 * Register a kind's teardown so `acquireHeavy` can evict it for another kind.
 * `onIdleTimeoutChange`, if given, re-arms the worker's idle timer when settings
 * change (so the warm/cold idle window updates an already-idle worker).
 */
export function registerHeavyWorker(
  kind: HeavyKind,
  teardown: () => void,
  onIdleTimeoutChange?: () => void,
): void {
  teardowns.set(kind, teardown)
  if (!onIdleTimeoutChange) return
  reschedulers.add(onIdleTimeoutChange)
  if (!settingsSubscribed) {
    settingsSubscribed = true
    subscribe(() => {
      for (const reschedule of reschedulers) reschedule()
    })
  }
}

/**
 * Make `kind` the sole resident heavy worker: tear down every other registered
 * kind first (freeing its weights) before the caller builds/uses its worker.
 */
export function acquireHeavy(kind: HeavyKind): void {
  for (const [other, teardown] of teardowns) {
    if (other !== kind) teardown()
  }
  resident = kind
}

/** A kind's worker was torn down (idle unload or eviction): clear residency. */
export function releaseHeavy(kind: HeavyKind): void {
  if (resident === kind) resident = null
}

/** The currently resident heavy kind, or null. For the memory probe. */
export function residentHeavyKind(): HeavyKind | null {
  return resident
}

/** Idle delay before an unused heavy worker unloads, shared by both kinds. */
export function heavyIdleTeardownMs(): number {
  return getSnapshot().runHeavyWhileRecording ? WARM_IDLE_MS : COLD_IDLE_MS
}
