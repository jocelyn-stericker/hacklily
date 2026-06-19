// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useMemo } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { bestResult, needsTier } from '#/lib/transcription'
import type { TranscriptTier } from '#/lib/transcription'

import { useAnalysisChunks, useTranscripts } from './TranscriptStore'
import type { TranscriptStore } from './TranscriptStore'

export function useUpgradeVisibleTranscriptions(
  store: TranscriptStore,
  viewportLeftSec: number,
  viewportRightSec: number,
  upgradeTier: TranscriptTier | null,
  requestTranscription: (chunk: AnalysisChunk) => void,
): (() => void) | null {
  // Subscribe over the whole (identity-stable) chunk list rather than the
  // visible subset: the viewport bounds change far more often than the chunk
  // list, and filtering before subscribing would resubscribe `useTranscripts`
  // to the same chunks on every pan. The viewport filter is cheap and lives in
  // the computation below.
  const chunks = useAnalysisChunks(store)
  const transcripts = useTranscripts(store, chunks)

  const upgrade = useMemo(() => {
    if (!upgradeTier) return null
    const upgradeableChunks: AnalysisChunk[] = []
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]!
      if (!chunk.voiced) continue
      const durationSec =
        (chunk.frames.length * chunk.timeStepSamples) / chunk.sampleRate
      const endSec = chunk.startTimeSec + durationSec
      if (chunk.startTimeSec >= viewportRightSec || endSec <= viewportLeftSec)
        continue
      const transcript = transcripts[i]
      // Something to upgrade from, and the target tier still wants work.
      if (
        transcript !== undefined &&
        bestResult(transcript) !== undefined &&
        needsTier(transcript, upgradeTier)
      ) {
        upgradeableChunks.push(chunk)
      }
    }
    return upgradeableChunks.length > 0
      ? () => {
          for (const chunk of upgradeableChunks) {
            requestTranscription(chunk)
          }
        }
      : null
  }, [
    upgradeTier,
    requestTranscription,
    chunks,
    transcripts,
    viewportLeftSec,
    viewportRightSec,
  ])

  return upgrade
}
