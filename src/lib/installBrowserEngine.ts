/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// On first use, the browser's on-device speech recognition engine may need to
// download a language model. The unprefixed `SpeechRecognition` exposes a
// static `install()` method paired with `available()`; we call it explicitly
// before the first browser-mode transcription so the user can see a progress
// modal instead of an opaque pause. A subscribable status backs that modal.

import { useSyncExternalStore } from 'react'

interface OnDeviceSpeechRecognitionCtor {
  available?: (options: {
    langs: string[]
    processLocally?: boolean
  }) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>
  install?: (options: {
    langs: string[]
    processLocally?: boolean
  }) => Promise<boolean>
}

function getSpeechRecognitionCtor(): OnDeviceSpeechRecognitionCtor | undefined {
  return (
    self as unknown as { SpeechRecognition?: OnDeviceSpeechRecognitionCtor }
  ).SpeechRecognition
}

export type BrowserEngineInstallState =
  | { status: 'idle' }
  | { status: 'installing'; lang: string }
  | { status: 'failed'; lang: string; error: string }

let state: BrowserEngineInstallState = { status: 'idle' }
const listeners = new Set<() => void>()
const IDLE_STATE: BrowserEngineInstallState = { status: 'idle' }

function setState(next: BrowserEngineInstallState): void {
  state = next
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useBrowserEngineInstallState(): BrowserEngineInstallState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE_STATE,
  )
}

/** Dismiss a `failed` state. No-op while installing or idle. */
export function dismissBrowserEngineInstallState(): void {
  if (state.status === 'failed') setState(IDLE_STATE)
}

// Concurrent transcribe calls share a single install: the first sets the
// promise, the rest await it. Cleared on settle so a failed attempt can be
// retried by a later transcription.
const installPromises = new Map<string, Promise<void>>()

/**
 * Ensure the browser's on-device speech recognition engine is installed for
 * `lang`, downloading it first if needed. Resolves once the engine is ready;
 * rejects if the engine could not be installed.
 *
 * Browsers that don't expose the `install()` API are treated as ready — the
 * legacy path is for `start()` to trigger any required download itself.
 */
export function ensureBrowserEngineInstalled(lang = 'en-US'): Promise<void> {
  const existing = installPromises.get(lang)
  if (existing) return existing
  const promise = doInstall(lang)
  installPromises.set(lang, promise)
  void promise
    .catch(() => {})
    .finally(() => {
      installPromises.delete(lang)
    })
  return promise
}

async function doInstall(lang: string): Promise<void> {
  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor?.available || !Ctor.install) {
    // No probe + install API: nothing actionable here. Let recognition.start()
    // sort out any lazy download itself.
    return
  }

  let status: 'available' | 'downloadable' | 'downloading' | 'unavailable'
  try {
    status = await Ctor.available({ langs: [lang], processLocally: true })
  } catch {
    // The probe is best-effort; if it throws, fall back to letting start()
    // handle download (or fail with a normal recognition error).
    return
  }
  if (status === 'available') return
  if (status === 'unavailable') {
    const error =
      'On-device speech recognition is not available for this language.'
    setState({ status: 'failed', lang, error })
    throw new Error(error)
  }

  // 'downloadable' or 'downloading' — kick off (or attach to) the install.
  setState({ status: 'installing', lang })
  try {
    const ok = await Ctor.install({ langs: [lang], processLocally: true })
    if (!ok) {
      throw new Error(
        'The on-device speech recognition model could not be installed.',
      )
    }
    if (state.status === 'installing' && state.lang === lang) {
      setState(IDLE_STATE)
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'The on-device speech recognition model could not be installed.'
    setState({ status: 'failed', lang, error: message })
    throw new Error(message)
  }
}
