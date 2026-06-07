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

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { readAudioSpan } from '#/lib/audio/AudioSpan'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import { ModelUnavailableError, TRANSCRIPT_TIERS } from '#/lib/transcription'
import type { TranscriptResult, TranscriptTier } from '#/lib/transcription'
import AlignWorkerCtor from '#/lib/workers/AlignWorker?worker'
import type { AlignWorker, AlignOutMessage } from '#/lib/workers/AlignWorker'

import type { PhonemeTimestamp } from '../alignment'
import type { ChunkWork } from './ChunkWorkQueue'
import { withoutTier } from './transcribeJob'
import type { TranscriptSink } from './transcribeJob'

export type AlignJobDeps = {
  sink: TranscriptSink
  onModelUnavailable: () => void
}

let worker: AlignWorker | null = null

export function createAlignJob(deps: AlignJobDeps): ChunkWork {
  return {
    kind: 'align',
    liveSpans: false,
    needsWork: (chunk) => {
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
    const onMessage = (ev: MessageEvent<AlignOutMessage>) => {
      const msg = ev.data
      if (msg.type === 'result') {
        worker!.removeEventListener('message', onMessage)
        resolve(msg.phonemeTimestamps)
      } else if (msg.type === 'error') {
        worker!.removeEventListener('message', onMessage)
        reject(new Error(msg.message))
      }
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
  } catch (err) {
    const cur = deps.sink.get(chunk)
    if (audio.signal.aborted) {
      // Cancelled (re-chunked, or too short to be speech): remove alignment
      // Should not happen for alignment, since we don't process live audio.
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
