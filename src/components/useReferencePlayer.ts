// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useCallback, useEffect, useRef, useState } from 'react'

import type { AudioManager } from '#/lib/audio/AudioManager'
import { mediaUrl } from '#/lib/mediaConfig'
import type { ReferencePlayback } from '#/lib/practiceState'
import type { ReferenceManifest } from '#/lib/referenceManifest'

type Dispatch = (action: ReferencePlayerAction) => void

export type ReferencePlayerAction =
  | {
      type: 'START_REFERENCE'
      passageId: string
      segmentIndex: number
      voiceId: string
    }
  | { type: 'REFERENCE_STATUS'; status: ReferencePlayback['status'] }
  | { type: 'STOP_REFERENCE' }
  | { type: 'REFERENCE_ENDED' }

type LoadedKey = `${string}#${number}#${string}`

function keyFor(p: ReferencePlayback): LoadedKey {
  return `${p.passageId}#${p.segmentIndex}#${p.voiceId}`
}

/**
 * Reducer-driven reference-clip player. The reducer (in `practiceState.ts`) is
 * the single source of truth for which clip is loaded (`state.referencePlayback`).
 * This hook watches `referencePlayback` and drives playback to match it, and
 * exposes `toggle(...)`, which dispatches `START_REFERENCE` for a new clip (or
 * `STOP_REFERENCE` to stop the one already loaded).
 *
 * Playback goes through the shared `AudioManager`'s `AudioContext` (decode +
 * `AudioBufferSourceNode`), *not* a bare `<audio>` element. This matters for the
 * practice lifecycle, which requests the mic *before* the reference plays: the
 * context is unlocked synchronously by `unlockForGesture()` in the start gesture
 * and stays running across the `getUserMedia` await, so the clip plays reliably
 * even when it starts seconds later, after the permission prompt — with no
 * per-element autoplay gating to fight. It also means "clip finished" is the
 * buffer node's private `ended`, decoupled from any media-element error event
 * (a load failure can no longer masquerade as a finished clip and skip the loop
 * to recording).
 */
export function useReferencePlayer(
  dispatch: Dispatch,
  referencePlayback: ReferencePlayback | null,
  audioManager: AudioManager | null,
): {
  toggle: (passageId: string, segmentIndex: number, voiceId: string) => void
  manifest: ReferenceManifest | null
} {
  const [manifest, setManifest] = useState<ReferenceManifest | null>(null)
  const manifestRef = useRef<ReferenceManifest | null>(null)
  useEffect(() => {
    manifestRef.current = manifest
  }, [manifest])

  // The clip currently loaded (loading or playing). Set synchronously when a
  // load starts so the effect dedupes re-runs caused by REFERENCE_STATUS
  // dispatches (which mutate `referencePlayback`'s identity).
  const loadedKeyRef = useRef<LoadedKey | null>(null)
  // Handle for the currently playing buffer source, so we can stop it.
  const handleRef = useRef<{ stop: () => void } | null>(null)
  // Bumped whenever the desired clip changes; an in-flight async load checks it
  // after each await and bails if it's been superseded (or stopped).
  const requestIdRef = useRef(0)

  // Fetch the manifest once.
  useEffect(() => {
    let cancelled = false
    fetch(mediaUrl('/references/manifest.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then((m: ReferenceManifest | null) => {
        if (!cancelled && m) setManifest(m)
      })
      .catch(() => {
        // Manifest is optional; references may not be built yet.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Drive playback to match `referencePlayback`. Imperative (keyed by
  // `loadedKeyRef`) rather than cleanup-based, because REFERENCE_STATUS
  // dispatches below re-run this effect with a new `referencePlayback` identity
  // while the same clip is still playing — the key check makes those no-ops.
  useEffect(() => {
    if (!referencePlayback) {
      requestIdRef.current++ // cancel any in-flight load
      handleRef.current?.stop()
      handleRef.current = null
      loadedKeyRef.current = null
      return
    }
    const key = keyFor(referencePlayback)
    if (loadedKeyRef.current === key) return // already loading/playing this clip

    const clip =
      manifestRef.current?.passages[referencePlayback.passageId]?.segments[
        referencePlayback.segmentIndex
      ]?.clips[referencePlayback.voiceId]
    if (!clip || !audioManager) {
      // No clip (manifest not fetched, references not synthesised, or this voice
      // has no clip) or no audio context yet. Treat it like the clip ending so an
      // active loop falls through to recording instead of stalling in the
      // reference phase. Outside a loop this just clears playback.
      requestIdRef.current++
      handleRef.current?.stop()
      handleRef.current = null
      loadedKeyRef.current = null
      dispatch({ type: 'REFERENCE_ENDED' })
      return
    }

    const requestId = ++requestIdRef.current
    handleRef.current?.stop()
    handleRef.current = null
    loadedKeyRef.current = key
    dispatch({ type: 'REFERENCE_STATUS', status: 'loading' })

    void (async () => {
      try {
        const resp = await fetch(mediaUrl(clip.url))
        if (!resp.ok) throw new Error(`reference fetch failed: ${resp.status}`)
        const data = await resp.arrayBuffer()
        if (requestId !== requestIdRef.current) return // superseded while fetching
        const handle = await audioManager.playClip(data)
        if (requestId !== requestIdRef.current) {
          handle.stop() // superseded while decoding
          return
        }
        handleRef.current = handle
        dispatch({ type: 'REFERENCE_STATUS', status: 'playing' })
        const naturalEnd = await handle.ended
        if (requestId !== requestIdRef.current) return // we stopped it
        handleRef.current = null
        loadedKeyRef.current = null
        if (naturalEnd) dispatch({ type: 'REFERENCE_ENDED' })
      } catch {
        if (requestId !== requestIdRef.current) return
        // Fetch/decode failure — treat like the clip ending so a loop advances
        // to recording instead of stalling in the reference phase.
        handleRef.current = null
        loadedKeyRef.current = null
        dispatch({ type: 'REFERENCE_ENDED' })
      }
    })()
  }, [referencePlayback, audioManager, dispatch])

  const toggle = useCallback(
    (passageId: string, segmentIndex: number, voiceId: string) => {
      const current = referencePlayback
      // Same clip currently loaded → stop (like take playback).
      if (
        current &&
        current.passageId === passageId &&
        current.segmentIndex === segmentIndex &&
        current.voiceId === voiceId
      ) {
        dispatch({ type: 'STOP_REFERENCE' })
        return
      }
      // New clip → reducer is authoritative; the effect above loads it.
      dispatch({ type: 'START_REFERENCE', passageId, segmentIndex, voiceId })
    },
    [dispatch, referencePlayback],
  )

  return { toggle, manifest }
}
