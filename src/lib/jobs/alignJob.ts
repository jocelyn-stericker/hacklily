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
import { withoutTier } from './transcribeJob'
import type { TranscriptSink } from './transcribeJob'
import { WorkerTerminatedError } from './WorkerTerminatedError'

export type AlignJobDeps = {
  sink: TranscriptSink
  onModelUnavailable: () => void
  enabled: () => boolean
  isHeavyAllowed: () => boolean
}

let worker: AlignWorker | null = null
let pendingAlignReject: ((err: Error) => void) | null = null

/** Terminate the align worker and free its memory. Safe to call with no worker running. */
export function terminateAlignWorker(): void {
  if (!worker) return
  worker.terminate()
  worker = null
  pendingAlignReject?.(new WorkerTerminatedError())
  pendingAlignReject = null
}

export function createAlignJob(deps: AlignJobDeps): ChunkWork {
  return {
    kind: 'align',
    liveSpans: false,
    needsWork: (chunk) => {
      if (!deps.enabled()) return false
      if (!deps.isHeavyAllowed()) return false
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

  if (!worker) {
    worker = new AlignWorkerCtor()
  }

  return new Promise<PhonemeTimestamp[]>((resolve, reject) => {
    const cleanup = () => {
      pendingAlignReject = null
      worker!.removeEventListener('message', onMessage)
    }
    const onMessage = (ev: MessageEvent<AlignOutMessage>) => {
      const msg = ev.data
      if (msg.type === 'result') {
        cleanup()
        resolve(msg.phonemeTimestamps)
      } else if (msg.type === 'error') {
        cleanup()
        reject(new Error(msg.message))
      }
    }

    pendingAlignReject = (err) => {
      cleanup()
      reject(err)
    }

    worker!.addEventListener('message', onMessage)

    worker!.postMessage({
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
  } catch (err) {
    const cur = deps.sink.get(chunk)
    if (audio.signal.aborted || err instanceof WorkerTerminatedError) {
      deps.sink.set(chunk, withoutTier(deps.sink.get(chunk), tier))
      return
    }
    if (err instanceof ModelUnavailableError) {
      deps.sink.set(chunk, {
        ...cur,
        [tier]: {
          ...cur?.[tier],
          job: {
            tier,
            status: 'error',
            error: err instanceof Error ? err.message : 'Alignment failed',
          },
        } satisfies TranscriptResult,
      })
      throw err
    }
    deps.sink.set(chunk, {
      ...cur,
      [tier]: {
        ...cur?.[tier],
        job: {
          tier,
          status: 'error',
          error: err instanceof Error ? err.message : 'Alignment failed',
        },
      } satisfies TranscriptResult,
    })
  }
}
