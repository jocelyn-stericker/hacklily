// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Download state for on-device transcription models, driven by the settings modal.
// Three downloadables:
//   - "browser":   Web Speech `SpeechRecognition.install()` (no byte progress).
//   - "moonshine"/"whisper": fetched via the shared TranscribeWorker pool so the
//                  warmed worker is reused for transcription (byte progress, cancelable).
//
// Worker-model "downloaded" state is a localStorage flag; the browser engine's
// readiness comes from the `checkLocalTranscription` probe. The flag is a hint --
// missing cache weights are caught at transcription time (toast + revert).

/// <reference types="@types/dom-speech-recognition" />

import { downloadWithWorker } from '#/lib/transcription/transcribeBundled'

const LOG = '[modelDownload]'

/** A transformers.js model the worker can fetch and cache. */
export type WorkerDownloadModel = 'moonshine' | 'whisper'
/** Everything the settings modal can download. */
export type DownloadModel = 'browser' | WorkerDownloadModel

export type DownloadState =
  // Not downloading (whether the model is downloaded: see isModelDownloaded).
  | { status: 'idle' }
  // `total === 0` = size unknown or unreported (browser engine) -- indeterminate spinner.
  | { status: 'downloading'; loaded: number; total: number }
  | { status: 'failed'; error: string }

export const IDLE: DownloadState = { status: 'idle' }

const LANG = 'en-US'

// ---------------------------------------------------------------------------
// Download-state store (per model)
// ---------------------------------------------------------------------------

const states = new Map<DownloadModel, DownloadState>()
const stateListeners = new Set<() => void>()

export function getState(model: DownloadModel): DownloadState {
  return states.get(model) ?? IDLE
}

export function setState(model: DownloadModel, next: DownloadState): void {
  states.set(model, next)
  for (const fn of stateListeners) fn()
}

export function subscribeState(fn: () => void): () => void {
  stateListeners.add(fn)
  return () => {
    stateListeners.delete(fn)
  }
}

// ---------------------------------------------------------------------------
// Downloaded-ness (worker models: localStorage flag; bumps on any completion)
// ---------------------------------------------------------------------------

function downloadedKey(model: WorkerDownloadModel): string {
  return `braat:model-downloaded:${model}`
}

const downloadedListeners = new Set<() => void>()
// Incremented on any download completion so consumers (including the browser
// availability probe) re-read.
export let downloadedVersion = 0

function bumpDownloaded(): void {
  downloadedVersion += 1
  for (const fn of downloadedListeners) fn()
}

export function subscribeDownloaded(fn: () => void): () => void {
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
 * Clear a worker model's "downloaded" flag when cache eviction makes it unusable,
 * so the settings modal re-offers the download. Bumps the version to notify UI.
 */
export function clearModelDownloaded(model: WorkerDownloadModel): void {
  try {
    localStorage.removeItem(downloadedKey(model))
  } catch (err) {
    console.warn(LOG, 'failed to clear download flag:', err)
  }
  bumpDownloaded()
}

// ---------------------------------------------------------------------------
// Worker-model downloads (Moonshine / Whisper)
// ---------------------------------------------------------------------------

// Cancel handles for in-flight worker downloads. Downloads run on the shared pool
// so the warmed worker is reused for transcription (reloading right after is unstable).
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

// `install()` has no cancel; bumping the token lets us ignore a late resolution
// and reset state. The browser may keep downloading in the background.
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
 * Install the browser's on-device speech engine for `lang` if needed.
 * Browsers without the `install()` API are treated as already ready.
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
 * Begin downloading a model. No-op if already downloading. `{ force: true }`
 * discards cached files -- recovery for a corrupt cache.
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
