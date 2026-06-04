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

import { readAudioSpan } from '#/lib/transcription'
import type { AudioSpan } from '#/lib/transcription'
// Runs a transformers.js speech model ("moonshine" or "whisper") in a web worker
// so inference stays off the UI thread. A worker is created lazily per model on
// first use; each posted chunk is matched to its result by id. These transcribe
// workers are offline (see TranscribeWorker.ts) — they only use weights already
// downloaded via modelDownload.ts, never fetching anything themselves. To keep
// the resident footprint small on memory-constrained devices, idle workers are
// torn down after a spell of inactivity and rebuilt on the next request (the
// weights come straight from the browser cache, so the rebuild is download-free).
import TranscribeWorkerCtor from '#/lib/workers/TranscribeWorker?worker'
import type {
  TranscribeWorker,
  TranscribeWorkerModel,
  TranscribeWorkerOutMessage,
} from '#/lib/workers/TranscribeWorker'

const LOG = '[transcribeBundled]'

// One worker per model so the Moonshine (wasm) and Whisper (WebGPU) sessions can
// coexist; in practice the user has only one mode selected at a time.
const workers = new Map<TranscribeWorkerModel, TranscribeWorker>()
let nextTranscribeId = 0
const pendingTranscriptions = new Map<
  number,
  { resolve: (text: string) => void; reject: (error: Error) => void }
>()

// Once a model has been idle this long, terminate its worker to release the
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
// settles, so the timer only fires after a genuine quiet period. Tears down all
// idle workers at once.
function scheduleIdleTeardown(): void {
  cancelIdleTeardown()
  idleTimer = setTimeout(() => {
    idleTimer = null
    if (pendingTranscriptions.size > 0) return
    for (const worker of workers.values()) worker.terminate()
    workers.clear()
  }, IDLE_TEARDOWN_MS)
}

// Crash breadcrumb. iOS Safari kills the whole tab when it crosses its
// (device-dependent) memory ceiling, and a bundled model is the heaviest thing
// Braat loads — on a low-memory device the load/inference peak can trip it.
// There's no catchable signal for that kill, so instead we leave a localStorage
// breadcrumb while a worker transcription is actually running and clear it the
// moment the work drains. A clean unload (pagehide) also clears it. So if the
// flag is still set on the next load, the previous session was killed
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
 * Whether the previous session was terminated while a worker transcription was
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

// Terminate a model's worker (releasing its loaded weights) and drop the pool
// reference so the next request builds a fresh one. No-op if absent.
function teardownWorker(model: TranscribeWorkerModel): void {
  const worker = workers.get(model)
  if (!worker) return
  worker.terminate()
  workers.delete(model)
}

function getWorker(model: TranscribeWorkerModel): TranscribeWorker {
  const existing = workers.get(model)
  if (existing) return existing

  const worker = new TranscribeWorkerCtor()
  worker.addEventListener(
    'message',
    ({ data }: MessageEvent<TranscribeWorkerOutMessage>) => {
      // Download messages can't reach a transcribe worker (it's never sent a
      // download request), so only result/error are expected here.
      if (data.type !== 'result' && data.type !== 'error') return
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
    teardownWorker(model)
    cancelIdleTeardown()
    const error = new Error(
      event.message || 'The transcription model failed to load.',
    )
    for (const pending of pendingTranscriptions.values()) pending.reject(error)
    pendingTranscriptions.clear()
    clearBundledActive()
  })

  workers.set(model, worker)
  return worker
}

/** Transcribe one recorded audio span with the given on-device worker model. */
export async function transcribeWithWorker(
  audio: AudioSpan,
  model: TranscribeWorkerModel,
): Promise<string> {
  const worker = getWorker(model)
  audio.signal.throwIfAborted()
  const pcm = await readAudioSpan(audio)
  audio.signal.throwIfAborted()
  const sampleRate = audio.rope.sampleRate
  cancelIdleTeardown()
  markBundledActive()
  const id = nextTranscribeId++
  return new Promise<string>((resolve, reject) => {
    const detach = () => {
      audio.signal.removeEventListener('abort', onAbort)
    }
    // Inference isn't cancelable mid-run, so on abort we just stop waiting: drop
    // the pending entry (its eventual result is ignored) and reject. The worker
    // finishes in the background and goes idle.
    const onAbort = () => {
      if (!pendingTranscriptions.delete(id)) return
      detach()
      onTranscriptionSettled()
      reject(audio.signal.reason)
    }
    pendingTranscriptions.set(id, {
      resolve: (text) => {
        detach()
        resolve(text)
      },
      reject: (err) => {
        detach()
        reject(err)
      },
    })
    audio.signal.addEventListener('abort', onAbort)
    // Transfer the PCM rather than cloning it: the worker treats its copy as
    // owned, and the caller doesn't touch `pcm` again, so handing over the
    // buffer avoids keeping a second copy of the audio resident on this thread.
    worker.postMessage({ type: 'transcribe', id, pcm, sampleRate, model }, [
      pcm.buffer,
    ])
  })
}

export type WorkerDownloadHandlers = {
  onProgress: (loaded: number, total: number) => void
  onReady: () => void
  onError: (error: string) => void
}

/**
 * Download a model's weights into the browser cache, then keep the warmed worker
 * resident in the shared pool so the next transcription reuses it. Going through
 * the same pool as `transcribeWithWorker` (rather than a throwaway download
 * worker) means a large model is loaded once: tearing one down and immediately
 * reloading it — the old download-then-transcribe handoff — is unstable.
 *
 * Returns a cancel function that aborts the wait and tears down the worker.
 */
export function downloadWithWorker(
  model: TranscribeWorkerModel,
  force: boolean,
  handlers: WorkerDownloadHandlers,
): () => void {
  // `force` is the corrupt-cache recovery path: drop any existing worker first
  // so the reload starts from a fresh worker that can't reuse an already-loaded
  // (and presumably stale) in-memory pipeline.
  if (force) teardownWorker(model)
  const worker = getWorker(model)
  // While the download runs the worker must stay resident even if a prior
  // transcription left an idle teardown armed.
  cancelIdleTeardown()

  const cleanup = () => {
    worker.removeEventListener('message', onMessage)
    worker.removeEventListener('error', onError)
  }
  const onMessage = ({ data }: MessageEvent<TranscribeWorkerOutMessage>) => {
    if (data.type === 'download-progress' && data.model === model) {
      handlers.onProgress(data.loaded, data.total)
    } else if (data.type === 'download-ready' && data.model === model) {
      cleanup()
      handlers.onReady()
      // Leave the warmed worker in the pool, but don't let it sit resident
      // forever if the user never transcribes — start the idle countdown.
      scheduleIdleTeardown()
    } else if (data.type === 'download-error' && data.model === model) {
      cleanup()
      // The failed load may have left the worker in a bad state; tear it down so
      // a retry (or a later transcribe) builds a fresh one.
      teardownWorker(model)
      handlers.onError(data.error)
    }
  }
  // A worker-level failure never delivers a download-error message; surface it
  // here. (The pool's own error listener also fires, tearing the worker down.)
  const onError = (event: ErrorEvent) => {
    cleanup()
    teardownWorker(model)
    handlers.onError(event.message || 'The model failed to download.')
  }

  worker.addEventListener('message', onMessage)
  worker.addEventListener('error', onError)
  worker.postMessage({ type: 'download', model, force })

  // Cancel: a download isn't otherwise cancelable, so stop listening and kill
  // the worker (its in-flight fetch dies with it).
  return () => {
    cleanup()
    teardownWorker(model)
  }
}
