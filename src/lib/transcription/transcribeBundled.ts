// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { readAudioSpan } from '#/lib/audio/AudioSpan'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import {
  acquireHeavy,
  heavyIdleTeardownMs,
  registerHeavyWorker,
  releaseHeavy,
} from '#/lib/jobs/heavyWorkerArbiter'
import { WorkerTerminatedError } from '#/lib/jobs/WorkerTerminatedError'
import TranscribeWorkerCtor from '#/lib/workers/TranscribeWorker?worker'
import type {
  TranscribeWorker,
  TranscribeWorkerModel,
  TranscribeWorkerOutMessage,
} from '#/lib/workers/TranscribeWorker'

// Runs a transformers.js speech model in a dedicated web worker per model (lazy).
// Workers are offline-only: they use weights already in the browser cache, never
// fetching. Idle workers are torn down after IDLE_TEARDOWN_MS and rebuilt on
// demand from the cache (re-init cost only, no re-download).

const LOG = '[transcribeBundled]'

// One worker per model so Moonshine (wasm) and Whisper (WebGPU) can coexist.
const workers = new Map<TranscribeWorkerModel, TranscribeWorker>()
let nextTranscribeId = 0
const pendingTranscriptions = new Map<
  number,
  {
    model: TranscribeWorkerModel
    resolve: (text: string) => void
    reject: (error: Error) => void
  }
>()

// After an idle period (see heavyIdleTeardownMs) we terminate the worker to free
// its weights. Long enough that consecutive chunks keep the warm worker; short
// enough to avoid competing with recording buffers for the session. Re-init from
// cache only, no re-download.
let idleTimer: ReturnType<typeof setTimeout> | null = null

function cancelIdleTeardown(): void {
  if (idleTimer === null) return
  clearTimeout(idleTimer)
  idleTimer = null
}

// Schedule teardown after all requests settle. Re-armed on each settlement so it
// fires only after a genuine quiet period.
function scheduleIdleTeardown(): void {
  cancelIdleTeardown()
  idleTimer = setTimeout(() => {
    idleTimer = null
    if (pendingTranscriptions.size > 0) return
    for (const worker of workers.values()) worker.terminate()
    workers.clear()
    releaseHeavy('transcribe')
  }, heavyIdleTeardownMs())
}

// Single-residency: evicting the transcribe workers also frees their slot so the
// arbiter can hand off to alignment. Registered once at module load. The third
// arg re-arms the idle timer on a settings change so a shorter (cold) window
// applies to an already-idle worker instead of waiting out the old timer.
registerHeavyWorker(
  'transcribe',
  () => {
    teardownWorker('moonshine')
    teardownWorker('whisper')
    releaseHeavy('transcribe')
  },
  () => {
    if (idleTimer !== null) scheduleIdleTeardown()
  },
)

// iOS Safari OOM-kills the tab with no catchable signal when memory peaks during
// inference. We leave a localStorage breadcrumb while a worker transcription runs
// and clear it on drain or pagehide. If set on next load, the session was killed
// mid-transcription -- see `consumeBundledCrashFlag`.
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

// OOM kills don't fire pagehide; normal unloads do. Clear here so a clean
// unload mid-transcription doesn't look like a crash on next load.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', clearBundledActive)
}

/**
 * True if the previous session was OOM-killed during a worker transcription.
 * Reads and clears the breadcrumb -- reports `true` at most once per crash.
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

// On settle: if queue empty, drop crash breadcrumb and start idle countdown.
function onTranscriptionSettled(): void {
  if (pendingTranscriptions.size > 0) return
  clearBundledActive()
  scheduleIdleTeardown()
}

// Terminate a worker and remove it from the pool so the next request rebuilds.
// Rejects any pending transcriptions for this model so in-flight passes unblock.
function teardownWorker(model: TranscribeWorkerModel): void {
  const worker = workers.get(model)
  if (!worker) return
  worker.terminate()
  workers.delete(model)
  const terminated = new WorkerTerminatedError()
  for (const [id, pending] of pendingTranscriptions) {
    if (pending.model === model) {
      pendingTranscriptions.delete(id)
      pending.reject(terminated)
    }
  }
  if (pendingTranscriptions.size === 0) {
    clearBundledActive()
    scheduleIdleTeardown()
  }
}

/** Terminate a bundled model worker and free its memory. Safe to call with no worker running. */
export function terminateBundledWorker(model: TranscribeWorkerModel): void {
  teardownWorker(model)
}

/** Live counts for the memory probe. */
export function transcribeWorkerStats(): {
  workerCount: number
  pendingCount: number
} {
  return { workerCount: workers.size, pendingCount: pendingTranscriptions.size }
}

function getWorker(model: TranscribeWorkerModel): TranscribeWorker {
  const existing = workers.get(model)
  if (existing) return existing

  const worker = new TranscribeWorkerCtor()
  worker.addEventListener(
    'message',
    ({ data }: MessageEvent<TranscribeWorkerOutMessage>) => {
      // Only result/error expected -- transcribe workers don't receive download messages.
      if (data.type !== 'result' && data.type !== 'error') return
      const pending = pendingTranscriptions.get(data.id)
      if (!pending) return
      pendingTranscriptions.delete(data.id)
      if (data.type === 'result') pending.resolve(data.text)
      else pending.reject(new Error(data.error))
      onTranscriptionSettled()
    },
  )
  // Worker-level failure: reject all pending requests, tear down the worker to
  // free weights, and clear the crash breadcrumb (clean failure, not a kill).
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
  // Evict the alignment worker (if any) before we build/use Moonshine, so the
  // two large models never sit resident together.
  acquireHeavy('transcribe')
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
    // Abort: drop the pending entry and reject; the worker finishes in background.
    const onAbort = () => {
      if (!pendingTranscriptions.delete(id)) return
      detach()
      onTranscriptionSettled()
      reject(audio.signal.reason)
    }
    pendingTranscriptions.set(id, {
      model,
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
    // Transfer (not clone) the PCM: the caller is done with it, so no second
    // copy stays resident on this thread.
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
 * Download a model into the browser cache via the shared worker pool, keeping
 * the warmed worker resident for the next transcription. Using the same pool
 * avoids reloading a large model immediately after tearing it down (unstable).
 * Returns a cancel function that tears down the worker.
 */
export function downloadWithWorker(
  model: TranscribeWorkerModel,
  force: boolean,
  handlers: WorkerDownloadHandlers,
): () => void {
  // `force` recovery: drop the existing worker so the reload can't reuse a stale
  // in-memory pipeline.
  if (force) teardownWorker(model)
  const worker = getWorker(model)
  // Keep the worker alive during download even if an idle teardown is armed.
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
      // Worker stays in pool; start idle countdown in case the user never transcribes.
      scheduleIdleTeardown()
    } else if (data.type === 'download-error' && data.model === model) {
      cleanup()
      // Tear down after failure so a retry or later transcription starts fresh.
      teardownWorker(model)
      handlers.onError(data.error)
    }
  }
  // Worker-level failure: never delivers download-error, so surface it here.
  const onError = (event: ErrorEvent) => {
    cleanup()
    teardownWorker(model)
    handlers.onError(event.message || 'The model failed to download.')
  }

  worker.addEventListener('message', onMessage)
  worker.addEventListener('error', onError)
  worker.postMessage({ type: 'download', model, force })

  // Cancel: stop listening and kill the worker (its in-flight fetch dies with it).
  return () => {
    cleanup()
    teardownWorker(model)
  }
}
