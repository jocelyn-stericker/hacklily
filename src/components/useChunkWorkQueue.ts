// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import type { AudioRope } from '#/lib/audio/AudioRope'
import { createAlignJob, terminateAlignWorker } from '#/lib/jobs/alignJob'
import { ChunkWorkQueue } from '#/lib/jobs/ChunkWorkQueue'
import { priorityPickNext } from '#/lib/jobs/schedule'
import type { Viewport } from '#/lib/jobs/schedule'
import { createTranscribeJob, requestUpgrade } from '#/lib/jobs/transcribeJob'
import type { TranscriptSink } from '#/lib/jobs/transcribeJob'
import type { TranscriptionMode } from '#/lib/settings'
import { resolveSmallEngine } from '#/lib/transcription'
import type { TranscriptTier } from '#/lib/transcription'
import { terminateBundledWorker } from '#/lib/transcription/transcribeBundled'

import type { TranscriptStore } from './TranscriptStore'
import { useBrowserSpeechRecognitionAvailable } from './useBrowserSpeechRecognitionAvailable'

/**
 * v1 tier policy: only ever auto-run `small` or `cloud`. `large` falls back to
 * `small` for now (we'll wire on-demand large later); `disabled` runs nothing.
 */
export function autoTier(
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
 * passive machine; this hook decides when to poke it -- on structural changes
 * (via the store's list subscription, shared with the overlay), on a mode switch,
 * and on teardown. Returns the imperative handles the route calls.
 */
export function useChunkWorkQueue({
  store,
  analysisMutRef,
  ropesRef,
  getViewport,
  transcriptionMode,
  forcedAlignment,
  runHeavyWhileRecording,
  isRecording,
  onModelUnavailable,
}: {
  store: TranscriptStore
  analysisMutRef: RefObject<AnalysisChunk[]>
  ropesRef: RefObject<AudioRope[]>
  getViewport: () => Viewport | null
  transcriptionMode: TranscriptionMode
  forcedAlignment: boolean
  runHeavyWhileRecording: boolean
  isRecording: boolean
  onModelUnavailable: () => void
}): {
  /** Re-transcribe one chunk on demand (the SpeechStrip button). */
  request: (chunk: AnalysisChunk) => void
  /** The recording rope sealed -- finish in-flight live spans. */
  onSeal: () => void
  /** Wake the queue to re-evaluate chunks (e.g. after a manual transcript save). */
  rescan: () => void
} {
  // Latest mode/callback behind refs so the queue (which calls these later, off
  // the render path) reads current values without being rebuilt. Synced in
  // effects, not during render.
  const modeRef = useRef(transcriptionMode)
  const onModelUnavailableRef = useRef(onModelUnavailable)
  useEffect(() => {
    onModelUnavailableRef.current = onModelUnavailable
  }, [onModelUnavailable])

  const forcedAlignmentRef = useRef(forcedAlignment)
  const isHeavyAllowedRef = useRef(!isRecording || runHeavyWhileRecording)

  // Determine whether the "small" tier maps to a heavy engine (Moonshine vs.
  // browser's native SR). Null while the availability probe is pending -- in
  // that case, treat small as light so transcription isn't blocked at startup.
  const availability = useBrowserSpeechRecognitionAvailable()
  const local = availability?.local ?? null
  const smallEngine = local !== null ? resolveSmallEngine(local) : null
  const isHeavyTierRef = useRef((tier: TranscriptTier): boolean => {
    return tier === 'large' || (tier === 'small' && smallEngine === 'moonshine')
  })
  useEffect(() => {
    isHeavyTierRef.current = (tier: TranscriptTier): boolean =>
      tier === 'large' || (tier === 'small' && smallEngine === 'moonshine')
  }, [smallEngine])

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
          isHeavyAllowed: () => isHeavyAllowedRef.current,
          isHeavyTier: (tier) => isHeavyTierRef.current(tier),
        }),
        createAlignJob({
          sink: transcribeSink,
          onModelUnavailable: () => onModelUnavailableRef.current(),
          enabled: () => forcedAlignmentRef.current,
          isHeavyAllowed: () => isHeavyAllowedRef.current,
        }),
      ],
      priorityPickNext(['align', 'transcribe']),
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

  useEffect(() => {
    forcedAlignmentRef.current = forcedAlignment
    queue.current?.invalidate()
  }, [forcedAlignment, queue])

  // When heavy work becomes disallowed (recording starts while setting is off, or
  // setting is turned off mid-recording), terminate the heavy workers immediately
  // to free their memory. Workers rebuild lazily from cache on next use.
  useEffect(() => {
    isHeavyAllowedRef.current = !isRecording || runHeavyWhileRecording
    queue.current?.invalidate()
    if (isRecording && !runHeavyWhileRecording) {
      terminateBundledWorker('moonshine')
      terminateBundledWorker('whisper')
      terminateAlignWorker()
    }
  }, [isRecording, runHeavyWhileRecording, queue])

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
  // Poke the queue to re-evaluate: a manual transcript save changes a chunk's
  // state (so its `needsWork` may flip, or a queued upgrade may now be backed
  // by manual text on the lower tier), but doesn't change the chunk list, so
  // the list subscription won't wake the queue on its own.
  const rescan = useCallback(() => queue.current?.scan(), [queue])
  return { request, onSeal, rescan }
}
