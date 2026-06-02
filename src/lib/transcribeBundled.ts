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

// The "bundled" mode runs the Moonshine model in a web worker (transformers.js
// + onnxruntime-web), so the ~70 MB download and inference stay off the UI
// thread. The worker is created lazily on first use; each posted chunk is
// matched to its result by id. To keep the resident footprint small on
// memory-constrained devices, the worker (and the model weights it holds) is
// torn down after a spell of inactivity and rebuilt on the next request — the
// weights come straight from the browser cache, so the rebuild is download-free.
import { useSyncExternalStore } from 'react'

import MoonshineWorkerCtor from '#/lib/MoonshineWorker?worker'
import type {
  MoonshineWorker,
  MoonshineWorkerOutMessage,
} from '#/lib/MoonshineWorker'

const LOG = '[transcribeBundled]'

let moonshineWorker: MoonshineWorker | null = null
let nextTranscribeId = 0
const pendingTranscriptions = new Map<
  number,
  { resolve: (text: string) => void; reject: (error: Error) => void }
>()

// Download state for the bundled Moonshine model. `failed` is reached only via
// a worker-level error during load — per-chunk inference errors don't touch
// this state.
//
// transformers.js fires the same `progress_total` events whether files come
// from the network or the browser cache, so reacting to the first event would
// flash a "downloading" modal during every warm load. We hold the first burst
// of events in a pending state and only promote to `downloading` after
// `SHOW_AFTER_MS`; a cache read finishes well before then and the modal stays
// hidden.
export type MoonshineDownloadState =
  | { status: 'idle' }
  | { status: 'downloading'; loaded: number; total: number }
  | { status: 'failed'; error: string }

const SHOW_AFTER_MS = 750

let downloadState: MoonshineDownloadState = { status: 'idle' }
const downloadListeners = new Set<() => void>()
const IDLE_DOWNLOAD_STATE: MoonshineDownloadState = { status: 'idle' }

let pendingShowTimer: ReturnType<typeof setTimeout> | null = null
let pendingLoaded = 0
let pendingTotal = 0

function setDownloadState(next: MoonshineDownloadState): void {
  downloadState = next
  for (const fn of downloadListeners) fn()
}

function subscribeDownload(fn: () => void): () => void {
  downloadListeners.add(fn)
  return () => {
    downloadListeners.delete(fn)
  }
}

function cancelPendingShow(): void {
  if (pendingShowTimer === null) return
  clearTimeout(pendingShowTimer)
  pendingShowTimer = null
}

function noteDownloadProgress(loaded: number, total: number): void {
  if (downloadState.status === 'downloading') {
    setDownloadState({ status: 'downloading', loaded, total })
    return
  }
  if (downloadState.status === 'failed') return
  // Idle: stash the latest values and arm the visibility timer on first event.
  pendingLoaded = loaded
  pendingTotal = total
  if (pendingShowTimer !== null) return
  pendingShowTimer = setTimeout(() => {
    pendingShowTimer = null
    setDownloadState({
      status: 'downloading',
      loaded: pendingLoaded,
      total: pendingTotal,
    })
  }, SHOW_AFTER_MS)
}

function noteDownloadReady(): void {
  cancelPendingShow()
  if (downloadState.status === 'downloading') {
    setDownloadState(IDLE_DOWNLOAD_STATE)
  }
}

function noteDownloadFailed(error: string): void {
  // Only surface the failed modal if a download was already visible or pending —
  // a fresh-load failure during the deferred window still warrants a modal.
  const wasShowing =
    downloadState.status === 'downloading' || pendingShowTimer !== null
  cancelPendingShow()
  if (wasShowing) setDownloadState({ status: 'failed', error })
}

export function useMoonshineDownloadState(): MoonshineDownloadState {
  return useSyncExternalStore(
    subscribeDownload,
    () => downloadState,
    () => IDLE_DOWNLOAD_STATE,
  )
}

/** Dismiss a `failed` state. No-op while downloading or idle. */
export function dismissMoonshineDownloadState(): void {
  if (downloadState.status === 'failed') setDownloadState(IDLE_DOWNLOAD_STATE)
}

// Once the model has been idle this long, terminate the worker to release its
// weights. Long enough that back-to-back chunks (and a user transcribing one
// recording after another) keep the warm worker; short enough that the model
// doesn't sit resident competing with the recording buffers for the rest of the
// session. Rebuilding reads the cached weights, so the cost is re-init, not a
// re-download.
const IDLE_TEARDOWN_MS = 60_000
let idleTimer: ReturnType<typeof setTimeout> | null = null

function cancelIdleTeardown(): void {
  if (idleTimer === null) return
  clearTimeout(idleTimer)
  idleTimer = null
}

// Schedule a teardown once nothing is in flight. Re-armed every time a request
// settles, so the timer only fires after a genuine quiet period.
function scheduleIdleTeardown(): void {
  cancelIdleTeardown()
  idleTimer = setTimeout(() => {
    idleTimer = null
    if (pendingTranscriptions.size > 0) return
    moonshineWorker?.terminate()
    moonshineWorker = null
  }, IDLE_TEARDOWN_MS)
}

// Crash breadcrumb. iOS Safari kills the whole tab when it crosses its
// (device-dependent) memory ceiling, and the bundled model is the heaviest
// thing Braat loads — on a low-memory device the load/inference peak can trip
// it. There's no catchable signal for that kill, so instead we leave a
// localStorage breadcrumb while a bundled transcription is actually running and
// clear it the moment the work drains. A clean unload (pagehide) also clears it.
// So if the flag is still set on the next load, the previous session was killed
// mid-transcription — see `consumeBundledCrashFlag`.
const CRASH_FLAG_KEY = 'braat:bundled-transcription-active'

function markBundledActive(): void {
  try {
    localStorage.setItem(CRASH_FLAG_KEY, '1')
  } catch (err) {
    console.warn(LOG, 'markBundledActive failed:', err)
  }
}

function clearBundledActive(): void {
  try {
    localStorage.removeItem(CRASH_FLAG_KEY)
  } catch (err) {
    console.warn(LOG, 'clearBundledActive failed:', err)
  }
}

// A jetsam/OOM kill never fires pagehide; a normal navigation or tab close
// does. Clearing the breadcrumb here keeps an ordinary unload mid-transcription
// from looking like a crash on the next load.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', clearBundledActive)
}

/**
 * Whether the previous session was terminated while a bundled transcription was
 * in flight (i.e. an uncaught tab crash, most likely an out-of-memory kill).
 * Reads and clears the breadcrumb, so it reports `true` at most once per crash.
 */
export function consumeBundledCrashFlag(): boolean {
  let crashed = false
  try {
    crashed = localStorage.getItem(CRASH_FLAG_KEY) !== null
    if (crashed) localStorage.removeItem(CRASH_FLAG_KEY)
  } catch (err) {
    console.warn(LOG, 'consumeBundledCrashFlag failed:', err)
  }
  return crashed
}

// Called whenever a request settles; once the queue is empty there's no work to
// crash on, so drop the breadcrumb and start the idle countdown.
function onTranscriptionSettled(): void {
  if (pendingTranscriptions.size > 0) return
  clearBundledActive()
  scheduleIdleTeardown()
}

function getMoonshineWorker(): MoonshineWorker {
  if (moonshineWorker) return moonshineWorker

  const worker = new MoonshineWorkerCtor()
  worker.addEventListener(
    'message',
    ({ data }: MessageEvent<MoonshineWorkerOutMessage>) => {
      if (data.type === 'download-progress') {
        noteDownloadProgress(data.loaded, data.total)
        return
      }
      if (data.type === 'download-ready') {
        noteDownloadReady()
        return
      }
      const pending = pendingTranscriptions.get(data.id)
      if (!pending) return
      pendingTranscriptions.delete(data.id)
      if (data.type === 'result') pending.resolve(data.text)
      else pending.reject(new Error(data.error))
      onTranscriptionSettled()
    },
  )
  // A worker-level failure (e.g. the model script failing to load) never
  // delivers per-request results, so reject everything in flight rather than
  // leaving those promises to hang. Terminate the errored worker to free its
  // loaded model weights, then drop the reference so the next request builds
  // a fresh one. This is a caught, clean failure — not a crash — so clear the
  // breadcrumb.
  worker.addEventListener('error', (event) => {
    worker.terminate()
    moonshineWorker = null
    cancelIdleTeardown()
    const error = new Error(
      event.message || 'The bundled transcription model failed to load.',
    )
    for (const pending of pendingTranscriptions.values()) pending.reject(error)
    pendingTranscriptions.clear()
    clearBundledActive()
    // If a download was in flight (visible or still in its deferred window) when
    // the worker died, surface the failure in the download modal so the user
    // sees something more actionable than the chunk-level error indicator.
    noteDownloadFailed(error.message)
  })

  moonshineWorker = worker
  return worker
}

/** Transcribe one chunk's PCM with the bundled Moonshine worker. */
export function transcribeBundled(
  pcm: Float32Array,
  sampleRate: number,
): Promise<string> {
  cancelIdleTeardown()
  markBundledActive()
  const worker = getMoonshineWorker()
  const id = nextTranscribeId++
  return new Promise<string>((resolve, reject) => {
    pendingTranscriptions.set(id, { resolve, reject })
    // Transfer the PCM rather than cloning it: the worker treats its copy as
    // owned, and the caller doesn't touch `pcm` again, so handing over the
    // buffer avoids keeping a second copy of the audio resident on this thread.
    worker.postMessage({ type: 'transcribe', id, pcm, sampleRate }, [
      pcm.buffer,
    ])
  })
}
