// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import ringWriterUrl from '#/lib/audio/AudioRingWriter?worker&url'
import ropeSourceUrl from '#/lib/audio/AudioRopeSourceNode?worker&url'

let CONTEXT: AudioContext | null = null
// Separate promises per worklet — each pipeline awaits only what it needs.
let PLAYBACK_MODULE_READY: Promise<void> | null = null
let CAPTURE_MODULE_READY: Promise<void> | null = null
// The sampleRate argument used when CONTEXT was created. Tracked so a changed
// preference triggers a fresh context rather than silently using the old rate.
let CONTEXT_SAMPLE_RATE: number | undefined = undefined
// Number of active leases. Each hook that needs the context calls
// acquireSharedAudioContext and must call release(). The context is only
// suspended when all leases are released, preventing one hook from killing the
// context while another is still using it.
let ACTIVE_LEASES = 0

export type SharedAudioContext = {
  context: AudioContext
  /** Resolves once `audio-rope-source-node` is registered (playback worklet). */
  playbackModuleReady: Promise<void>
  /** Resolves once `audio-ring-writer` is registered (capture worklet). */
  captureModuleReady: Promise<void>
}

/**
 * Returns the long-lived shared AudioContext, creating it if needed. Must be
 * called synchronously within a user gesture on first use so the context starts
 * in a running state on iOS Safari.
 *
 * Safe to call from both recording-start and play-start gestures so that
 * playback can begin without a further gesture after a recording session.
 *
 * If `sampleRate` differs from the one used at creation, the old context is
 * closed and a fresh one is created on the next gesture call.
 *
 * This does NOT acquire a lease — use `acquireSharedAudioContext` for that.
 */
export function getOrCreateSharedAudioContext(
  sampleRate?: number,
): SharedAudioContext {
  const rateChanged =
    CONTEXT !== null &&
    CONTEXT.state !== 'closed' &&
    sampleRate !== CONTEXT_SAMPLE_RATE
  if (rateChanged) {
    void CONTEXT!.close()
    CONTEXT = null
  }

  if (!CONTEXT || CONTEXT.state === 'closed') {
    if ('audioSession' in navigator) {
      // Keep playback audible even when the iOS ringer is silent.
      // @ts-expect-error non-standard API
      navigator.audioSession.type = 'play-and-record'
    }
    CONTEXT = new AudioContext({ sampleRate, latencyHint: 'interactive' })
    CONTEXT_SAMPLE_RATE = sampleRate
    const ctx = CONTEXT

    const resetOnFail = () => {
      if (CONTEXT === ctx) {
        void CONTEXT.close()
        CONTEXT = null
        CONTEXT_SAMPLE_RATE = undefined
        PLAYBACK_MODULE_READY = null
        CAPTURE_MODULE_READY = null
      }
    }

    // Start both module fetches immediately so they overlap the gesture→effect gap.
    PLAYBACK_MODULE_READY = ctx.audioWorklet
      .addModule(ropeSourceUrl)
      .catch((err: unknown) => {
        console.error(
          '[sharedAudioContext] failed to load playback worklet:',
          err,
        )
        resetOnFail()
        throw err
      })
    CAPTURE_MODULE_READY = ctx.audioWorklet
      .addModule(ringWriterUrl)
      .catch((err: unknown) => {
        console.error(
          '[sharedAudioContext] failed to load capture worklet:',
          err,
        )
        resetOnFail()
        throw err
      })
  }
  void CONTEXT.resume()
  return {
    context: CONTEXT,
    playbackModuleReady: PLAYBACK_MODULE_READY!,
    captureModuleReady: CAPTURE_MODULE_READY!,
  }
}

/**
 * Like `getOrCreateSharedAudioContext` but also acquires a lease. The returned
 * `release` function must be called when the caller no longer needs the audio
 * context. When all leases are released the context is suspended to release the
 * audio hardware.
 *
 * Use this from hook effects that hold a long-lived reference to the context.
 * Gesture handlers that only touch the context to ensure it exists should use
 * `getOrCreateSharedAudioContext` directly.
 */
export function acquireSharedAudioContext(
  sampleRate?: number,
): SharedAudioContext & { release(): void } {
  const shared = getOrCreateSharedAudioContext(sampleRate)
  ACTIVE_LEASES++
  let released = false
  return {
    ...shared,
    release: () => {
      if (released) return
      released = true
      ACTIVE_LEASES--
      if (ACTIVE_LEASES <= 0) suspendSharedAudioContext()
    },
  }
}

/**
 * Resume the shared context if it exists and is not closed. Call from a
 * `visibilitychange` handler to recover from a UA-initiated suspension (tab
 * switch, app backgrounding) without needing a new user gesture.
 */
export function resumeSharedAudioContext(): void {
  if (CONTEXT && CONTEXT.state !== 'closed') {
    void CONTEXT.resume()
  }
}

/**
 * Suspend the shared context. Called automatically when the last lease is
 * released. Also callable directly if the context must be released outside the
 * lease system. No-op if absent or already suspended/closed.
 */
export function suspendSharedAudioContext(): void {
  if (CONTEXT && CONTEXT.state === 'running') {
    void CONTEXT.suspend()
  }
}
