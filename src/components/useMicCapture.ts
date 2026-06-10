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

export function useMicCapture({
  enabled,
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

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    const pipeline = new MicCapturePipeline({
      signal: ctrl.signal,
      settings: {
        inputDeviceId,
        sampleRate,
        persistentMic,
        browserPreprocessing,
      },
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
  }, [enabled, inputDeviceId, sampleRate, persistentMic, browserPreprocessing])
}
