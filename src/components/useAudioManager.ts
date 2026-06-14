// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useSettings } from '#/components/useSettings'
import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import { AudioManager } from '#/lib/audio/AudioManager'
import type { MicCaptureFeatures } from '#/lib/audio/AudioManager'
import type {
  AudioRope,
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import type { RopeGainCache } from '#/lib/loudness/ropeLoudness'
import { preferredSampleRate } from '#/lib/settings'

/**
 * Drives the mic-capture and playback sub-systems of a shared `AudioManager`.
 *
 * The hook is a thin glue layer: it watches its props and forwards every
 * change as a fire-and-forget event into the managers's serialized queue.
 *
 * The hook constructs its own `AudioManager` on mount and destroys it on
 * unmount. The loop instance is returned so callers can call methods like
 * `unlockForGesture()` directly.
 */
export function useAudioManager({
  active,
  recording,
  captureFeatures: features,
  onCaptureAppend: onAppend,
  onCaptureChunkStart: onChunkStart,
  onCapturePatch: onPatch,
  onCaptureComplete: onRecordingComplete,
  onCaptureNotification,
  onAudioRopeGrow,
  onAudioRopeShare,
  onAudioRopeSeal,
  playing: enabled,
  playbackRopes: ropes,
  playbackGainCache: gainCache,
  playbackCursorSec: cursorSec,
  playbackEndSec: endAtSec,
  onPlaybackStop: onStop,
  onPlaybackPositionChanged,
  onError,
}: {
  active: boolean
  recording: boolean
  captureFeatures?: MicCaptureFeatures
  onCaptureAppend: (frame: AnalysisFrame) => void
  onCaptureChunkStart?: (params: AnalysisParams) => void
  onCapturePatch?: (from: number, to: number) => void
  onCaptureComplete: () => void
  onCaptureNotification?: (message: string) => void
  onAudioRopeGrow: (grow: AudioRopeGrow) => void
  onAudioRopeShare: (sabRope: AudioRopeShare) => void
  onAudioRopeSeal: (seal: AudioRopeSeal) => void
  playing: boolean
  playbackRopes: Array<AudioRope>
  playbackGainCache: RopeGainCache
  playbackCursorSec: number
  playbackEndSec?: number
  onPlaybackStop: () => void
  onPlaybackPositionChanged: (timeSec: number) => void
  onError?: (error: string) => void
}) {
  const [audioSettings] = useSettings()
  const { inputDeviceId, sampleRate, persistentMic, browserPreprocessing } =
    audioSettings
  const spectrogramEnabled = features?.spectrogram ?? true
  const formantEnabled = features?.formant ?? true
  const vadSettingsKey = JSON.stringify(features?.vad ?? true)

  const preferredRate = preferredSampleRate(audioSettings)
  const [initialPreferredRate] = useState(preferredRate)
  const [manager, setManager] = useState<AudioManager | null>(null)
  useEffect(() => {
    const newManager = new AudioManager(initialPreferredRate)
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setManager(newManager)
    return () => {
      newManager.destroy()
    }
  }, [initialPreferredRate])

  // -- callback refs (capture) ----------------------------------------------
  const onAppendRef = useRef(onAppend)
  const onChunkStartRef = useRef(onChunkStart)
  const onPatchRef = useRef(onPatch)
  const onRecordingCompleteRef = useRef(onRecordingComplete)
  const onCaptureNotificationRef = useRef(onCaptureNotification)
  const onAudioRopeGrowRef = useRef(onAudioRopeGrow)
  const onAudioRopeShareRef = useRef(onAudioRopeShare)
  const onAudioRopeSealRef = useRef(onAudioRopeSeal)

  // -- callback refs (playback) ---------------------------------------------
  const onStopRef = useRef(onStop)
  const onPlaybackPositionChangedRef = useRef(onPlaybackPositionChanged)

  const onErrorRef = useRef(onError)

  useLayoutEffect(() => {
    onAppendRef.current = onAppend
    onChunkStartRef.current = onChunkStart
    onPatchRef.current = onPatch
    onRecordingCompleteRef.current = onRecordingComplete
    onCaptureNotificationRef.current = onCaptureNotification
    onAudioRopeGrowRef.current = onAudioRopeGrow
    onAudioRopeShareRef.current = onAudioRopeShare
    onAudioRopeSealRef.current = onAudioRopeSeal
    onStopRef.current = onStop
    onPlaybackPositionChangedRef.current = onPlaybackPositionChanged
    onErrorRef.current = onError
  })

  // -- seek discriminator state ---------------------------------------------
  const lastEchoedRef = useRef<number>(cursorSec)
  const reportedHighWaterRef = useRef<number>(cursorSec)
  const cursorSecRef = useRef<number>(cursorSec)
  useLayoutEffect(() => {
    cursorSecRef.current = cursorSec
  })

  // -- subscribe to outbound events -----------------------------------------
  useEffect(() => {
    if (!manager) return

    // Capture events
    const handleAppend = (e: CustomEvent<{ frame: AnalysisFrame }>) => {
      onAppendRef.current(e.detail.frame)
    }
    const handleChunkStart = (e: CustomEvent<{ params: AnalysisParams }>) =>
      onChunkStartRef.current?.(e.detail.params)
    const handlePatch = (e: CustomEvent<{ from: number; to: number }>) => {
      const detail = e.detail
      onPatchRef.current?.(detail.from, detail.to)
    }
    const handleRecordingComplete = () => onRecordingCompleteRef.current()
    const handleCaptureNotification = (e: CustomEvent<{ message: string }>) =>
      onCaptureNotificationRef.current?.(e.detail.message)
    const handleRopeShare = (e: CustomEvent<AudioRopeShare>) =>
      onAudioRopeShareRef.current(e.detail)
    const handleRopeGrow = (e: CustomEvent<AudioRopeGrow>) =>
      onAudioRopeGrowRef.current(e.detail)
    const handleRopeSeal = (e: CustomEvent<AudioRopeSeal>) =>
      onAudioRopeSealRef.current(e.detail)

    // Playback events
    const handlePositionChanged = (e: CustomEvent<{ timeSec: number }>) => {
      const timeSec = e.detail.timeSec
      reportedHighWaterRef.current = Math.max(
        reportedHighWaterRef.current,
        timeSec,
      )
      onPlaybackPositionChangedRef.current(timeSec)
    }
    const handleStop = () => onStopRef.current()
    const handleError = (e: CustomEvent<{ error: string }>) =>
      onErrorRef.current?.(e.detail.error)
    const handleVisibility = async () => {
      if (!document.hidden) {
        manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
        await manager.resumeContext()
      }
    }

    const ac = new AbortController()
    const opts = { signal: ac.signal }

    manager.addEventListener('append', handleAppend, opts)
    manager.addEventListener('chunkStart', handleChunkStart, opts)
    manager.addEventListener('patch', handlePatch, opts)
    manager.addEventListener('recordingComplete', handleRecordingComplete, opts)
    manager.addEventListener('notification', handleCaptureNotification, opts)
    manager.addEventListener('sabRopeShare', handleRopeShare, opts)
    manager.addEventListener('sabRopeGrow', handleRopeGrow, opts)
    manager.addEventListener('sabRopeSeal', handleRopeSeal, opts)
    manager.addEventListener('positionChanged', handlePositionChanged, opts)
    manager.addEventListener('stop', handleStop, opts)
    manager.addEventListener('error', handleError, opts)
    document.addEventListener('visibilitychange', handleVisibility, opts)

    return () => ac.abort()
  }, [manager])

  // -- audio settings -------------------------------------------------------
  useEffect(() => {
    if (!manager) return

    manager.sendEvent({
      type: 'SETTINGS_CHANGE',
      settings: {
        inputDeviceId,
        sampleRate,
        persistentMic,
        browserPreprocessing,
      },
    })
  }, [manager, inputDeviceId, sampleRate, persistentMic, browserPreprocessing])

  // -- feature flags ---------------------------------------------------------
  useEffect(() => {
    if (!manager) return

    manager.sendEvent({
      type: 'MIC_CAPTURE_FEATURES',
      features: {
        spectrogram: spectrogramEnabled,
        formant: formantEnabled,
        vad: JSON.parse(vadSettingsKey) as MicCaptureFeatures['vad'],
      },
    })
  }, [manager, spectrogramEnabled, formantEnabled, vadSettingsKey])

  // ------------------------------------------------------------------------
  useEffect(() => {
    manager?.sendEvent({ type: active ? 'START_CAPTURE' : 'STOP_CAPTURE' })
  }, [manager, active])

  useEffect(() => {
    manager?.sendEvent({
      type: recording ? 'START_RECORDING' : 'STOP_RECORDING',
    })
  }, [manager, recording])

  useEffect(() => {
    if (enabled) {
      const startAt = cursorSecRef.current
      manager?.sendEvent({
        type: 'ENABLE_PLAYBACK',
        startAtSec: startAt,
        ropes,
        gains: gainCache.gainsFor(ropes),
        endAtSec,
      })
      lastEchoedRef.current = startAt
      reportedHighWaterRef.current = startAt
    } else {
      manager?.sendEvent({ type: 'DISABLE_PLAYBACK' })
    }
  }, [manager, enabled, ropes, gainCache, endAtSec])

  // -- seek: real-seek detection -------------------------------------------
  useEffect(() => {
    if (!manager) return

    if (!enabled) {
      lastEchoedRef.current = cursorSec
      return
    }
    const isEcho =
      cursorSec >= lastEchoedRef.current &&
      cursorSec <= reportedHighWaterRef.current
    lastEchoedRef.current = cursorSec
    if (isEcho) return
    reportedHighWaterRef.current = cursorSec
    manager.sendEvent({ type: 'SEEK', timeSec: cursorSec })
  }, [manager, cursorSec, enabled])

  return manager
}
