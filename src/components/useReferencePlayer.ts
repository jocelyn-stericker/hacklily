// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useCallback, useEffect, useRef, useState } from 'react'

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

// A 1-sample silent WAV used only to "bless" the <audio> element. Playing this
// synchronously inside a user gesture marks the element as user-activated in
// Safari, which — unlike Chrome — does not carry activation across the `await`
// on getUserMedia or the React round-trips before the real clip loads. Without
// it the real play() (fired from an effect once the mic is warm) is rejected
// and the reference never sounds. See `unlock` below.
function buildSilentWav(): string {
  const bytes = new Uint8Array(45)
  const view = new DataView(bytes.buffer)
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 37, true) // 36 + dataSize
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, 8000, true) // sample rate
  view.setUint32(28, 8000, true) // byte rate
  view.setUint16(32, 1, true) // block align
  view.setUint16(34, 8, true) // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, 1, true) // data size
  view.setUint8(44, 128) // one sample of 8-bit silence (centre)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `data:audio/wav;base64,${btoa(binary)}`
}
const SILENT_WAV = buildSilentWav()

/**
 * Reducer-driven reference-clip player. The reducer (in `practiceState.ts`) is
 * the single source of truth for which clip is loaded (`state.referencePlayback`).
 * This hook owns the `HTMLAudioElement` and:
 *
 *   - watches `referencePlayback` and loads/stops the audio to match it
 *     (the single effect below is the only place `audio.src` is set);
 *   - translates media-element events into `REFERENCE_STATUS` / `STOP_REFERENCE`
 *     dispatches so the reducer tracks buffering/playing/ended;
 *   - exposes `toggle(...)`, which dispatches `START_REFERENCE` for a new clip,
 *     or pauses/resumes the loaded clip in place (calling the element directly,
 *     since the element event will report the resulting status back).
 *
 * Kept separate from the rope-based `useAudioManager` (which is for the user's
 * own takes); reference clips are just decoded audio files, so a plain
 * `<audio>` is the simplest correct path and avoids touching the worklet graph.
 */
export function useReferencePlayer(
  dispatch: Dispatch,
  referencePlayback: ReferencePlayback | null,
): {
  toggle: (passageId: string, segmentIndex: number, voiceId: string) => void
  unlock: () => void
  manifest: ReferenceManifest | null
} {
  const [manifest, setManifest] = useState<ReferenceManifest | null>(null)
  const manifestRef = useRef<ReferenceManifest | null>(null)
  useEffect(() => {
    manifestRef.current = manifest
  }, [manifest])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedKeyRef = useRef<LoadedKey | null>(null)
  const unlockedRef = useRef(false)

  // Create the audio element once and wire its events to dispatches.
  useEffect(() => {
    if (typeof Audio === 'undefined') return
    const el = new Audio()
    el.preload = 'auto'
    audioRef.current = el

    const onPlay = () =>
      dispatch({ type: 'REFERENCE_STATUS', status: 'playing' })
    const onEnded = () => {
      loadedKeyRef.current = null
      dispatch({ type: 'REFERENCE_ENDED' })
    }
    const onWaiting = () =>
      dispatch({ type: 'REFERENCE_STATUS', status: 'loading' })
    const onPlaying = () =>
      dispatch({ type: 'REFERENCE_STATUS', status: 'playing' })
    const onError = () => {
      loadedKeyRef.current = null
      // Treat a media error like the clip ending so an active loop advances to
      // recording instead of stalling in the reference phase. When no loop is
      // running this behaves exactly like STOP_REFERENCE (just clears playback).
      dispatch({ type: 'REFERENCE_ENDED' })
    }
    el.addEventListener('play', onPlay)
    el.addEventListener('ended', onEnded)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('playing', onPlaying)
    el.addEventListener('error', onError)

    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('error', onError)
      el.pause()
      el.removeAttribute('src')
      el.load()
      audioRef.current = null
    }
  }, [dispatch])

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

  // Drive the audio element to match `referencePlayback`. This is the only
  // place `audio.src` is set, so the reducer state is authoritative for what's
  // loaded.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (!referencePlayback) {
      el.pause()
      if (loadedKeyRef.current !== null) {
        el.removeAttribute('src')
        el.load()
      }
      loadedKeyRef.current = null
      return
    }
    const key = keyFor(referencePlayback)
    if (loadedKeyRef.current === key) return // already loaded; events drive status
    const clip =
      manifestRef.current?.passages[referencePlayback.passageId]?.segments[
        referencePlayback.segmentIndex
      ]?.clips[referencePlayback.voiceId]
    if (!clip) {
      // No clip available (manifest not fetched yet, references not synthesised,
      // or this voice has no clip). Treat it like the clip ending so an active
      // loop falls through to recording instead of stalling in the reference
      // phase. Outside a loop this just clears playback (same as STOP_REFERENCE).
      loadedKeyRef.current = null
      dispatch({ type: 'REFERENCE_ENDED' })
      return
    }
    loadedKeyRef.current = key
    el.src = mediaUrl(clip.url)
    el.currentTime = 0
    void el.play().catch(() => {
      // Autoplay rejection — will remain paused; event will report status.
    })
  }, [referencePlayback, dispatch])

  // Bless the <audio> element for Safari. MUST be called synchronously from a
  // user gesture (the same place the route calls `audioManager.unlockForGesture()`).
  // Plays a 1-sample silent clip on the element so the real play() — which fires
  // later from an effect, after getUserMedia resolves — is permitted. This is
  // deliberately orthogonal to the reducer-driven load path: it never touches
  // `loadedKeyRef` or `el.src` once the real clip is loading, so it can't
  // suppress the actual playback.
  const unlock = useCallback(() => {
    const el = audioRef.current
    if (!el || unlockedRef.current) return
    if (loadedKeyRef.current !== null) return // a real clip is already loaded
    unlockedRef.current = true
    el.src = SILENT_WAV
    void el.play().then(
      () => {
        // Only tear the priming clip back down if no real clip has since taken
        // over the element (the load effect sets loadedKeyRef before play()).
        if (loadedKeyRef.current === null) {
          el.pause()
          el.removeAttribute('src')
          el.load()
        }
      },
      () => {
        // Rejected (e.g. not actually in a gesture) — allow a later retry.
        unlockedRef.current = false
        if (loadedKeyRef.current === null) el.removeAttribute('src')
      },
    )
  }, [])

  const toggle = useCallback(
    (passageId: string, segmentIndex: number, voiceId: string) => {
      const el = audioRef.current
      if (!el) return
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

  return { toggle, unlock, manifest }
}
