// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useEffect, useLayoutEffect, useRef } from 'react'

import { useSettings } from '#/components/useSettings'
import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import type {
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import {
  MicCapturePipeline,
  preInitPersistentStream,
} from '#/lib/audio/MicCapturePipeline'
import type { MicCaptureFeatures } from '#/lib/audio/MicCapturePipeline'
import {
  acquireSharedAudioContext,
  resumeSharedAudioContext,
} from '#/lib/audio/sharedAudioContext'
import { preferredSampleRate } from '#/lib/settings'

/**
 * Drives the mic-capture pipeline with two independent levers:
 *
 * - `active` controls the pipeline's *lifetime*. While active, the context,
 *   worklet, and workers are spun up and kept warm so that starting a recording
 *   is fast. The decision of when to stay warm (e.g. always, with a persistent
 *   mic) belongs to the caller — pass `active` accordingly.
 * - `recording` controls *streaming*. Audio only reaches the ring buffer and
 *   rope while recording; an active-but-not-recording pipeline is idle.
 *
 * A recording is one rope, and the consumer workers are bound to it at init, so
 * each recording needs fresh workers. On the recording falling edge we call
 * `softReset()` on the existing pipeline to create new workers without tearing
 * down the audio graph (stream, source node, worklet).
 */
export function useMicCapture({
  active,
  recording,
  features,
  onAppend,
  onChunkStart,
  onPatch,
  onRecordingComplete,
  onError,
  onAudioRopeGrow,
  onAudioRopeShare,
  onAudioRopeSeal,
}: {
  active: boolean
  recording: boolean
  features?: MicCaptureFeatures
  onAppend: (frame: AnalysisFrame) => void
  onChunkStart?: (params: AnalysisParams) => void
  onPatch?: (from: number, to: number) => void
  onRecordingComplete: () => void
  onError: (error: string) => void
  onAudioRopeGrow: (grow: AudioRopeGrow) => void
  onAudioRopeShare: (sabRope: AudioRopeShare) => void
  onAudioRopeSeal: (seal: AudioRopeSeal) => void
}) {
  const [audioSettings] = useSettings()

  // persistentMic is still passed through to the pipeline for cross-instance
  // stream caching, but the hook no longer reads it to decide warmth — that's
  // `active`, which the caller derives.
  const { inputDeviceId, sampleRate, persistentMic, browserPreprocessing } =
    audioSettings
  const spectrogramEnabled = features?.spectrogram ?? true
  const formantEnabled = features?.formant ?? true
  // Serialize to a primitive dep: prevents pipeline restarts when the caller
  // passes an un-memoized VadParams object literal (new reference each render).
  const vadSettingsKey = JSON.stringify(features?.vad ?? true)

  const onAppendRef = useRef(onAppend)
  const onChunkStartRef = useRef(onChunkStart)
  const onPatchRef = useRef(onPatch)
  const onRecordingCompleteRef = useRef(onRecordingComplete)
  const onErrorRef = useRef(onError)
  const onAudioRopeGrowRef = useRef(onAudioRopeGrow)
  const onAudioRopeShareRef = useRef(onAudioRopeShare)
  const onAudioRopeSealRef = useRef(onAudioRopeSeal)
  // Lets the lifetime effect see the current `recording` without depending on
  // it (which would tear the pipeline down on every record toggle). Used so a
  // pipeline rebuilt mid-recording — e.g. on a settings change — keeps streaming.
  const recordingRef = useRef(recording)

  useLayoutEffect(() => {
    onAppendRef.current = onAppend
    onChunkStartRef.current = onChunkStart
    onPatchRef.current = onPatch
    onRecordingCompleteRef.current = onRecordingComplete
    onErrorRef.current = onError
    onAudioRopeGrowRef.current = onAudioRopeGrow
    onAudioRopeShareRef.current = onAudioRopeShare
    onAudioRopeSealRef.current = onAudioRopeSeal
    recordingRef.current = recording
  })

  // Re-resume after a UA-initiated suspension (tab switch, app backgrounding).
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) resumeSharedAudioContext()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Release the cached persistent stream when the mic is no longer meant to be
  // kept open. Warming it while persistentMic is on is now the caller's job (it
  // sets `active`), but the cached stream still has to be torn down when the
  // setting flips off — otherwise an idle warm pipeline's stale snapshot would
  // keep the mic open.
  useEffect(() => {
    if (persistentMic) return
    void preInitPersistentStream({
      inputDeviceId,
      sampleRate,
      persistentMic: false,
      browserPreprocessing,
    })
  }, [persistentMic, inputDeviceId, sampleRate, browserPreprocessing])

  const preferredRate = preferredSampleRate(audioSettings)

  // The current warm pipeline, so the recording effect can start streaming on it.
  const pipelineRef = useRef<MicCapturePipeline | null>(null)
  // Holds the release function for the current shared context lease. Swapped
  // atomically on pipeline recreation so the refcount never hits zero while
  // both the old and new pipeline exist.
  const releaseRef = useRef<(() => void) | null>(null)

  // Pipeline lifetime — keyed on `active` (and settings), never on `recording`,
  // so starting/stopping a recording does not tear down and rebuild the workers.
  useEffect(() => {
    if (!active) {
      releaseRef.current?.()
      releaseRef.current = null
      return
    }
    const ctrl = new AbortController()
    const shared = acquireSharedAudioContext(preferredRate)
    // Swap leases atomically: hold the new one before releasing the old so the
    // refcount never drops to zero across the pipeline recreation.
    releaseRef.current?.()
    releaseRef.current = () => shared.release()
    const pipeline = new MicCapturePipeline({
      signal: ctrl.signal,
      settings: {
        inputDeviceId,
        sampleRate,
        persistentMic,
        browserPreprocessing,
      },
      features: {
        spectrogram: spectrogramEnabled,
        formant: formantEnabled,
        vad: JSON.parse(vadSettingsKey) as MicCaptureFeatures['vad'],
      },
      context: shared.context,
      captureModuleReady: shared.captureModuleReady,
    })
    pipeline.addEventListener(
      'append',
      (e) => onAppendRef.current(e.detail.frame),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'chunkStart',
      (e) => onChunkStartRef.current?.(e.detail.params),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'patch',
      (e) => onPatchRef.current?.(e.detail.from, e.detail.to),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'recordingComplete',
      () => {
        onRecordingCompleteRef.current()
      },
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'error',
      (e) => onErrorRef.current(e.detail.error),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'sabRopeShare',
      (e) => onAudioRopeShareRef.current(e.detail),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'sabRopeGrow',
      (e) => onAudioRopeGrowRef.current(e.detail),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'sabRopeSeal',
      (e) => onAudioRopeSealRef.current(e.detail),
      { signal: pipeline.destroyed },
    )
    pipelineRef.current = pipeline
    // If we're created (or rebuilt) while already recording — a simultaneous
    // active+recording start, or a settings change mid-recording — begin
    // streaming now; the `recording` effect's rising edge won't fire for us.
    if (recordingRef.current) pipeline.record()
    return () => {
      ctrl.abort()
      if (pipelineRef.current === pipeline) pipelineRef.current = null
    }
  }, [
    active,
    inputDeviceId,
    sampleRate,
    preferredRate,
    persistentMic,
    browserPreprocessing,
    spectrogramEnabled,
    formantEnabled,
    vadSettingsKey,
  ])

  // Streaming — keyed only on `recording`. Rising edge: start streaming on the
  // existing warm pipeline. Falling edge: soft-reset the pipeline so workers are
  // rebuilt for the next take without tearing down the audio graph.
  const prevRecordingRef = useRef(false)
  useEffect(() => {
    const wasRecording = prevRecordingRef.current
    prevRecordingRef.current = recording
    if (recording && !wasRecording) {
      resumeSharedAudioContext()
      pipelineRef.current?.record()
    } else if (!recording && wasRecording) {
      void pipelineRef.current?.softReset()
    }
  }, [recording])

  // Unmount cleanup: release the shared context lease.
  useEffect(() => {
    return () => {
      releaseRef.current?.()
      releaseRef.current = null
    }
  }, [])
}
