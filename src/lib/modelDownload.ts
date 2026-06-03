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

// Single source of truth for explicitly downloading the on-device transcription
// models, driven entirely by the transcription settings modal — nothing else may
// start a download. Three things can be downloaded:
//   - "browser":   the browser's own on-device speech model, via the Web Speech
//                  `SpeechRecognition.install()` API (no byte progress).
//   - "moonshine"/"whisper": transformers.js models, fetched through the shared
//                  TranscribeWorker pool (see transcribeBundled.ts) so the warmed
//                  worker is reused for transcription (byte progress, cancelable
//                  by terminating the worker).
//
// "Downloaded" detection for the worker models is a localStorage flag set on a
// completed download; the browser engine's readiness comes from the authoritative
// `checkLocalTranscription` probe instead. The transcribe path treats a flag as a
// hint only — if the weights turn out to be missing (e.g. cache eviction), the
// runtime guard in transcription.ts surfaces a toast and reverts.

/// <reference types="@types/dom-speech-recognition" />

import { useSyncExternalStore } from 'react'

import { downloadWithWorker } from '#/lib/transcribeBundled'

const LOG = '[modelDownload]'

/** A transformers.js model the worker can fetch and cache. */
export type WorkerDownloadModel = 'moonshine' | 'whisper'
/** Everything the settings modal can download. */
export type DownloadModel = 'browser' | WorkerDownloadModel

export type DownloadState =
  // Not downloading. (Whether the model is *downloaded* is a separate query —
  // see isModelDownloaded / the browser availability probe.)
  | { status: 'idle' }
  // `total === 0` means the size isn't known yet (or, for the browser engine,
  // is never reported) — render an indeterminate spinner.
  | { status: 'downloading'; loaded: number; total: number }
  | { status: 'failed'; error: string }

const IDLE: DownloadState = { status: 'idle' }

// On-device speech recognition language, matching the feature probes.
const LANG = 'en-US'

// ---------------------------------------------------------------------------
// Download-state store (per model)
// ---------------------------------------------------------------------------

const states = new Map<DownloadModel, DownloadState>()
const stateListeners = new Set<() => void>()

function getState(model: DownloadModel): DownloadState {
  return states.get(model) ?? IDLE
}

function setState(model: DownloadModel, next: DownloadState): void {
  states.set(model, next)
  for (const fn of stateListeners) fn()
}

function subscribeState(fn: () => void): () => void {
  stateListeners.add(fn)
  return () => {
    stateListeners.delete(fn)
  }
}

export function useDownloadState(model: DownloadModel): DownloadState {
  return useSyncExternalStore(
    subscribeState,
    () => getState(model),
    () => IDLE,
  )
}

// ---------------------------------------------------------------------------
// Downloaded-ness (worker models: localStorage flag; bumps on any completion)
// ---------------------------------------------------------------------------

function downloadedKey(model: WorkerDownloadModel): string {
  return `braat:model-downloaded:${model}`
}

const downloadedListeners = new Set<() => void>()
// Incremented whenever any download completes, so consumers (including the
// browser-availability probe, which can't observe the install otherwise) re-read.
let downloadedVersion = 0

function bumpDownloaded(): void {
  downloadedVersion += 1
  for (const fn of downloadedListeners) fn()
}

function subscribeDownloaded(fn: () => void): () => void {
  downloadedListeners.add(fn)
  return () => {
    downloadedListeners.delete(fn)
  }
}

export function isModelDownloaded(model: WorkerDownloadModel): boolean {
  try {
    return localStorage.getItem(downloadedKey(model)) !== null
  } catch {
    return false
  }
}

/**
 * Forget a worker model's "downloaded" flag. Used when the transcribe path finds
 * a file missing from the cache (the model isn't actually usable), so the
 * settings modal re-offers the download. Bumps the version so any open UI
 * re-reads the flag.
 */
export function clearModelDownloaded(model: WorkerDownloadModel): void {
  try {
    localStorage.removeItem(downloadedKey(model))
  } catch (err) {
    console.warn(LOG, 'failed to clear download flag:', err)
  }
  bumpDownloaded()
}

export function useModelDownloaded(model: WorkerDownloadModel): boolean {
  return useSyncExternalStore(
    subscribeDownloaded,
    () => isModelDownloaded(model),
    () => false,
  )
}

/**
 * A counter that increments every time a model finishes downloading. Consumers
 * that can't otherwise observe a completion (notably the browser on-device
 * availability probe) can depend on it to re-run.
 */
export function useDownloadVersion(): number {
  return useSyncExternalStore(
    subscribeDownloaded,
    () => downloadedVersion,
    () => 0,
  )
}

// ---------------------------------------------------------------------------
// Worker-model downloads (Moonshine / Whisper)
// ---------------------------------------------------------------------------

// A cancel handle for each in-flight worker-model download. The download runs on
// the shared worker pool (see transcribeBundled.ts) so the warmed worker is
// reused for the subsequent transcription rather than torn down and rebuilt —
// reloading a large model right after deleting it is unstable. Present only
// while downloading; cancel = invoke the handle.
const downloadCancels = new Map<WorkerDownloadModel, () => void>()

function startWorkerDownload(model: WorkerDownloadModel, force: boolean): void {
  if (downloadCancels.has(model)) return
  setState(model, { status: 'downloading', loaded: 0, total: 0 })

  const cancel = downloadWithWorker(model, force, {
    onProgress: (loaded, total) => {
      setState(model, { status: 'downloading', loaded, total })
    },
    onReady: () => {
      downloadCancels.delete(model)
      markWorkerDownloaded(model)
      setState(model, IDLE)
      bumpDownloaded()
    },
    onError: (error) => {
      downloadCancels.delete(model)
      setState(model, { status: 'failed', error })
    },
  })
  downloadCancels.set(model, cancel)
}

function markWorkerDownloaded(model: WorkerDownloadModel): void {
  try {
    localStorage.setItem(downloadedKey(model), '1')
  } catch (err) {
    console.warn(LOG, 'failed to record download flag:', err)
  }
}

// ---------------------------------------------------------------------------
// Browser on-device engine install
// ---------------------------------------------------------------------------

// The Web Speech `install()` has no cancel and no progress. We model "cancel" as
// abandoning the wait: bump the token so a late resolution is ignored and reset
// the visible state. The browser may keep downloading in the background.
let browserInstallToken = 0

async function startBrowserDownload(): Promise<void> {
  const token = ++browserInstallToken
  setState('browser', { status: 'downloading', loaded: 0, total: 0 })
  try {
    await installBrowserEngine(LANG)
    if (token !== browserInstallToken) return
    setState('browser', IDLE)
    // The availability probe can't observe the install, so nudge it to re-run.
    bumpDownloaded()
  } catch (err) {
    if (token !== browserInstallToken) return
    setState('browser', {
      status: 'failed',
      error:
        err instanceof Error
          ? err.message
          : 'The on-device speech recognition model could not be installed.',
    })
  }
}

/**
 * Ensure the browser's on-device speech recognition engine is installed for
 * `lang`, downloading it first if needed. Resolves once the engine is ready;
 * rejects if it could not be installed. Browsers without the `install()` API are
 * treated as ready (the legacy path lets `start()` trigger any lazy download).
 */
async function installBrowserEngine(lang: string): Promise<void> {
  if (
    !('available' in SpeechRecognition) ||
    !('install' in SpeechRecognition)
  ) {
    return
  }

  let status: 'available' | 'downloadable' | 'downloading' | 'unavailable'
  try {
    status = await SpeechRecognition.available({
      langs: [lang],
      processLocally: true,
    })
  } catch {
    // Best-effort probe; let start() handle any lazy download (or fail later).
    return
  }
  if (status === 'available') return
  if (status === 'unavailable') {
    throw new Error(
      'On-device speech recognition is not available for this language.',
    )
  }

  const ok = await SpeechRecognition.install({
    langs: [lang],
    processLocally: true,
  })
  if (!ok) {
    throw new Error(
      'The on-device speech recognition model could not be installed.',
    )
  }
}

// ---------------------------------------------------------------------------
// Public controls
// ---------------------------------------------------------------------------

/**
 * Begin downloading a model. No-op if it's already downloading. Pass
 * `{ force: true }` to re-download from scratch, discarding any cached files —
 * the recovery path for a corrupt cache that a normal load can't get past.
 */
export function startDownload(
  model: DownloadModel,
  { force = false }: { force?: boolean } = {},
): void {
  if (model === 'browser') {
    void startBrowserDownload()
  } else {
    startWorkerDownload(model, force)
  }
}

/** Cancel an in-flight download and reset its state to idle. */
export function cancelDownload(model: DownloadModel): void {
  if (model === 'browser') {
    // Invalidate the in-flight install so its resolution is ignored.
    browserInstallToken += 1
  } else {
    downloadCancels.get(model)?.()
    downloadCancels.delete(model)
  }
  setState(model, IDLE)
}

/** Dismiss a `failed` state back to idle. No-op otherwise. */
export function dismissDownloadError(model: DownloadModel): void {
  if (getState(model).status === 'failed') setState(model, IDLE)
}
