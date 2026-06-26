// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { readAudioSpan } from '#/lib/audio/AudioSpan'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import { getLunaBrightness } from '#/lib/ipa/acousticGenderSpace'
import { ModelUnavailableError, TRANSCRIPT_TIERS } from '#/lib/transcription'
import type { TranscriptResult, TranscriptTier } from '#/lib/transcription'
import AlignWorkerCtor from '#/lib/workers/AlignWorker?worker'
import type { AlignWorker, AlignOutMessage } from '#/lib/workers/AlignWorker'

import type { PhonemeTimestamp } from '../alignment'
import type { ChunkWork } from './ChunkWorkQueue'
import {
  acquireHeavy,
  heavyIdleTeardownMs,
  registerHeavyWorker,
  releaseHeavy,
} from './heavyWorkerArbiter'
import { withoutTier } from './transcribeJob'
import type { TranscriptSink } from './transcribeJob'
import { WorkerTerminatedError } from './WorkerTerminatedError'

export type AlignJobDeps = {
  sink: TranscriptSink
  onModelUnavailable: () => void
  enabled: () => boolean
  /** Whether recording is in progress -- alignment is deferred until it stops. */
  isRecording: () => boolean
  /** Notified after the job writes lunaBrightness into a chunk's frames, so the
   *  overlay can re-derive brightness (the in-place write isn't React-observable).
   *  Optional: tests omit it. */
  onFramesMutated?: (chunk: AnalysisChunk) => void
}

let worker: AlignWorker | null = null
let pendingAlignReject: ((err: Error) => void) | null = null

// After an idle period (see heavyIdleTeardownMs) terminate the worker to free its
// weights -- alignment runs in a post-recording batch, so once it drains the
// model can unload. Re-init from cache only on next use, no re-download.
let idleTimer: ReturnType<typeof setTimeout> | null = null

function cancelIdleTeardown(): void {
  if (idleTimer === null) return
  clearTimeout(idleTimer)
  idleTimer = null
}

// Schedule teardown after the batch settles; re-armed on each settled job so it
// fires only after a genuine quiet period.
function scheduleIdleTeardown(): void {
  cancelIdleTeardown()
  idleTimer = setTimeout(() => {
    idleTimer = null
    if (pendingAlignReject !== null) return
    terminateAlignWorker()
  }, heavyIdleTeardownMs())
}

/** Terminate the align worker and free its memory. Safe to call with no worker running. */
export function terminateAlignWorker(): void {
  cancelIdleTeardown()
  releaseHeavy('align')
  if (!worker) return
  worker.terminate()
  worker = null
  pendingAlignReject?.(new WorkerTerminatedError())
  pendingAlignReject = null
}

// Single-residency: the arbiter evicts alignment for transcription via this. The
// third arg re-arms the idle timer on a settings change so a shorter (cold)
// window applies to an already-idle worker instead of waiting out the old timer.
registerHeavyWorker('align', terminateAlignWorker, () => {
  if (idleTimer !== null) scheduleIdleTeardown()
})

/** True if the alignment worker is alive (weights loaded in memory). */
export function alignWorkerLive(): boolean {
  return worker !== null
}

/** True if an alignment job is currently running. */
export function alignJobActive(): boolean {
  return pendingAlignReject !== null
}

export function createAlignJob(deps: AlignJobDeps): ChunkWork {
  return {
    kind: 'align',
    liveSpans: false,
    needsWork: (chunk) => {
      if (!deps.enabled()) return false
      // Alignment isn't real-time; defer the whole batch until recording stops so
      // its model never coexists with transcription (or recording buffers).
      if (deps.isRecording()) return false
      const t = deps.sink.get(chunk)
      for (const tier of TRANSCRIPT_TIERS) {
        if (t?.[tier]?.text) {
          if (!t[tier].phonemes) {
            return true
          }
        }
      }
      return false
    },
    resolve: async () => {
      return (chunk, audio) => alignOne(deps, chunk, audio)
    },
    onUnavailable: deps.onModelUnavailable,
  }
}

async function runAlignmentOnWorker(
  audio: AudioSpan,
  transcript: string,
  startTimeSec: number,
): Promise<PhonemeTimestamp[]> {
  const pcm = await readAudioSpan(audio)

  // Evict the transcription worker (if any) before we build/use the aligner, so
  // the two large models never sit resident together. Cancel any pending unload
  // since we're about to use the worker again.
  acquireHeavy('align')
  cancelIdleTeardown()
  if (!worker) {
    worker = new AlignWorkerCtor()
  }
  // Capture the instance so teardown targets this worker even after the
  // module-level `worker` is nulled (e.g. by terminateAlignWorker).
  const activeWorker = worker

  return new Promise<PhonemeTimestamp[]>((resolve, reject) => {
    // Aborting the signal detaches the listener regardless of whether the
    // module still references this worker. terminate() stops the worker thread
    // but does not remove listeners on the main-thread Worker object.
    const ac = new AbortController()
    const cleanup = () => {
      pendingAlignReject = null
      ac.abort()
    }

    activeWorker.addEventListener(
      'message',
      (ev: MessageEvent<AlignOutMessage>) => {
        const msg = ev.data
        if (msg.type === 'result') {
          cleanup()
          // Worker stays warm for the next chunk in the batch; arm the idle
          // unload in case this was the last one.
          scheduleIdleTeardown()
          resolve(msg.phonemeTimestamps)
        } else if (msg.type === 'error') {
          cleanup()
          scheduleIdleTeardown()
          reject(new Error(msg.message))
        }
      },
      { signal: ac.signal },
    )

    pendingAlignReject = (err) => {
      cleanup()
      reject(err)
    }

    activeWorker.postMessage({
      type: 'align',
      pcm,
      sampleRate: audio.rope.sampleRate,
      startTime: startTimeSec,
      transcript,
    })
  })
}

async function alignOne(
  deps: AlignJobDeps,
  chunk: AnalysisChunk,
  audio: AudioSpan,
): Promise<void> {
  const prior = deps.sink.get(chunk)
  // What tier should we align? Take the highest one with text.
  let tier: TranscriptTier | undefined
  for (const iTier of TRANSCRIPT_TIERS.toReversed()) {
    if (prior?.[iTier]?.text && !prior[iTier].phonemes) {
      tier = iTier
      break
    }
  }
  if (!tier) {
    return
  }

  // Claim the chunk synchronously (before the first await) so a concurrent pass
  // skips it.
  deps.sink.set(chunk, {
    ...prior,
    [tier]: {
      ...prior?.[tier],
      job: { tier, status: 'aligning' },
    } satisfies TranscriptResult,
  })

  try {
    const phonemes = await runAlignmentOnWorker(
      audio,
      prior![tier]!.text!,
      chunk.startTimeSec,
    )
    const cur = deps.sink.get(chunk)
    deps.sink.set(chunk, {
      ...cur,
      [tier]: {
        text: cur?.[tier]?.text,
        phonemes,
        job: undefined,
      } satisfies TranscriptResult,
    })

    const timeStepSec = chunk.timeStepSamples / chunk.sampleRate
    for (let i = 0; i < chunk.frames.length; i++) {
      const frame = chunk.frames[i]!
      const frameMs = (chunk.startTimeSec + (i + 0.5) * timeStepSec) * 1000
      const phoneme = phonemes.find(
        (p) => p.startMs <= frameMs && frameMs < p.endMs,
      )
      if (
        phoneme &&
        phoneme.phonemeId !== 0 &&
        phoneme.phonemeId !== 66 &&
        frame.f1 !== null &&
        frame.f2 !== null
      ) {
        frame.lunaBrightness = getLunaBrightness(
          phoneme.phonemeLabel,
          frame.f1,
          frame.f2,
        )
      }
    }
    // The lunaBrightness writes above aren't seen by the React compiler (in-place
    // mutation), so signal the store to re-derive brightness for this chunk.
    deps.onFramesMutated?.(chunk)
  } catch (err) {
    const cur = deps.sink.get(chunk)
    if (audio.signal.aborted || err instanceof WorkerTerminatedError) {
      deps.sink.set(chunk, withoutTier(deps.sink.get(chunk), tier))
      return
    }
    if (err instanceof ModelUnavailableError) {
      const message = err instanceof Error ? err.message : 'Alignment failed'
      console.error('[alignJob]', message, err)
      deps.sink.set(chunk, {
        ...cur,
        [tier]: {
          ...cur?.[tier],
          job: {
            tier,
            status: 'error',
            error: message,
          },
        } satisfies TranscriptResult,
      })
      throw err
    }
    const message = err instanceof Error ? err.message : 'Alignment failed'
    console.error('[alignJob]', message, err)
    deps.sink.set(chunk, {
      ...cur,
      [tier]: {
        ...cur?.[tier],
        job: {
          tier,
          status: 'error',
          error: message,
        },
      } satisfies TranscriptResult,
    })
  }
}
