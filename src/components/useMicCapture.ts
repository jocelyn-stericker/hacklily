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
  getOrCreateSharedAudioContext,
  resumeSharedAudioContext,
} from '#/lib/audio/sharedAudioContext'
import { preferredSampleRate } from '#/lib/settings'

export function useMicCapture({
  enabled,
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
  enabled: boolean
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

  // Pre-open the mic when persistentMic is enabled so the connection is warm.
  const { inputDeviceId, sampleRate, persistentMic, browserPreprocessing } =
    audioSettings
  const spectrogramEnabled = features?.spectrogram ?? true
  const formantEnabled = features?.formant ?? true
  // Serialize to a primitive dep: prevents pipeline restarts when the caller
  // passes an un-memoized VadParams object literal (new reference each render).
  const vadSettingsKey = JSON.stringify(features?.vad ?? true)
  useEffect(() => {
    void preInitPersistentStream({
      inputDeviceId,
      sampleRate,
      persistentMic,
      browserPreprocessing,
    })
  }, [inputDeviceId, sampleRate, persistentMic, browserPreprocessing])

  const onAppendRef = useRef(onAppend)
  const onChunkStartRef = useRef(onChunkStart)
  const onPatchRef = useRef(onPatch)
  const onRecordingCompleteRef = useRef(onRecordingComplete)
  const onErrorRef = useRef(onError)
  const onAudioRopeGrowRef = useRef(onAudioRopeGrow)
  const onAudioRopeShareRef = useRef(onAudioRopeShare)
  const onAudioRopeSealRef = useRef(onAudioRopeSeal)

  useLayoutEffect(() => {
    onAppendRef.current = onAppend
    onChunkStartRef.current = onChunkStart
    onPatchRef.current = onPatch
    onRecordingCompleteRef.current = onRecordingComplete
    onErrorRef.current = onError
    onAudioRopeGrowRef.current = onAudioRopeGrow
    onAudioRopeShareRef.current = onAudioRopeShare
    onAudioRopeSealRef.current = onAudioRopeSeal
  })

  // Re-resume after a UA-initiated suspension (tab switch, app backgrounding).
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) resumeSharedAudioContext()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const preferredRate = preferredSampleRate(audioSettings)

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    // Fallback context creation: the caller should have called
    // getOrCreateSharedAudioContext() in a gesture handler (handleStart) before
    // enabling capture, but this ensures we always have a context to work with.
    const { context, captureModuleReady } =
      getOrCreateSharedAudioContext(preferredRate)
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
      context,
      captureModuleReady,
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
    return () => ctrl.abort()
  }, [
    enabled,
    inputDeviceId,
    sampleRate,
    preferredRate,
    persistentMic,
    browserPreprocessing,
    spectrogramEnabled,
    formantEnabled,
    vadSettingsKey,
  ])
}
