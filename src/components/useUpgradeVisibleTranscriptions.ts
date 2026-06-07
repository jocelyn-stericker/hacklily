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

import { useMemo } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame.ts'
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
