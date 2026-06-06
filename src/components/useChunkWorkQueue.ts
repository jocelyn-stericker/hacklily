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

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { SabRope } from '#/lib/audio/SabRope'
import { ChunkWorkQueue } from '#/lib/jobs/ChunkWorkQueue'
import { priorityPickNext } from '#/lib/jobs/schedule'
import type { Viewport } from '#/lib/jobs/schedule'
import { createTranscribeJob, requestUpgrade } from '#/lib/jobs/transcribeJob'
import type { TranscriptSink } from '#/lib/jobs/transcribeJob'
import type { TranscriptionMode } from '#/lib/settings'
import type { TranscriptTier } from '#/lib/transcription'

import type { TranscriptStore } from './TranscriptStore'

/**
 * v1 tier policy: only ever auto-run `small` or `cloud`. `large` falls back to
 * `small` for now (we'll wire on-demand large later); `disabled` runs nothing.
 */
function autoTier(
  mode: TranscriptionMode,
  upgrade: boolean,
): TranscriptTier | null {
  switch (mode) {
    case 'small':
      return 'small'
    case 'large':
      return upgrade ? 'large' : 'small'
    case 'cloud':
      return 'cloud'
    case 'disabled':
      return null
  }
}

/**
 * Owns the chunk queue's lifecycle and reactive triggers. The queue is a
 * passive machine; this hook decides when to poke it — on structural changes
 * (via the store's list subscription, shared with the overlay), on a mode switch,
 * and on teardown. Returns the imperative handles the route calls.
 */
export function useChunkWorkQueue({
  store,
  analysisMutRef,
  ropesRef,
  getViewport,
  transcriptionMode,
  onModelUnavailable,
}: {
  store: TranscriptStore
  analysisMutRef: RefObject<AnalysisChunk[]>
  ropesRef: RefObject<SabRope[]>
  getViewport: () => Viewport | null
  transcriptionMode: TranscriptionMode
  onModelUnavailable: () => void
}): {
  /** Re-transcribe one chunk on demand (the SpeechStrip button). */
  request: (chunk: AnalysisChunk) => void
  /** The recording rope sealed — finish in-flight live spans. */
  onSeal: () => void
} {
  // Latest mode/callback behind refs so the queue (which calls these later, off
  // the render path) reads current values without being rebuilt. Synced in
  // effects, not during render.
  const modeRef = useRef(transcriptionMode)
  const onModelUnavailableRef = useRef(onModelUnavailable)
  useEffect(() => {
    onModelUnavailableRef.current = onModelUnavailable
  }, [onModelUnavailable])

  // The transcript sink closes over `store` (a prop), not a ref, so it's stable
  // and safe to share between the queue and the upgrade trigger. The tier/ref
  // closures stay inline below (the queue invokes them later, off render).
  const [transcribeSink] = useState(
    (): TranscriptSink => ({
      get: (chunk) => store.getTranscript(chunk),
      set: (chunk, transcript) => store.setTranscript(chunk, transcript),
    }),
  )

  const queue = useRef<ChunkWorkQueue>(null)
  useEffect(() => {
    queue.current = new ChunkWorkQueue(
      [
        createTranscribeJob({
          sink: transcribeSink,
          autoTier: (upgrade) => autoTier(modeRef.current, upgrade),
          onModelUnavailable: () => onModelUnavailableRef.current(),
        }),
      ],
      priorityPickNext(['transcribe']),
      {
        getChunks: () => analysisMutRef.current,
        getRopes: () => ropesRef.current,
        getViewport: getViewport,
      },
    )

    // Abort live spans on unmount.
    return () => queue.current?.dispose()
  }, [transcribeSink, analysisMutRef, ropesRef, getViewport])

  // Structural changes (publishChunkList) wake the scheduler. This is the shared
  // notification hub: one `subscribeList`, two consumers (overlay + queue).
  useEffect(
    () => store.subscribeList(() => queue.current?.scan()),
    [store, queue],
  )

  // A mode switch: update the ref first, then supersede the in-flight pass and
  // re-scan under the new tier.
  useEffect(() => {
    modeRef.current = transcriptionMode
    queue.current?.invalidate()
  }, [transcriptionMode, queue])

  const request = useCallback(
    (chunk: AnalysisChunk) => {
      requestUpgrade(
        {
          sink: transcribeSink,
          autoTier: (upgrade) => autoTier(modeRef.current, upgrade),
        },
        chunk,
      )
      queue.current?.scan()
    },
    [transcribeSink, queue],
  )
  const onSeal = useCallback(() => queue.current?.seal(), [queue])
  return { request, onSeal }
}
