// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.

// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { useSettings } from '#/components/useSettings'

import { useAudioManager } from './useAudioManager'

// ---------------------------------------------------------------------------
// Stub AudioManager (hoisted so the mock factory can reference it).
// ---------------------------------------------------------------------------

const stubLoopClass = vi.hoisted(() => {
  class StubLoop {
    events: any[] = []
    contextResumeCalls = 0
    destroyed = false

    sendEvent(event: any): void {
      this.events.push(event)
    }

    getState() {
      return { capture: 'idle' as const, playback: 'idle' as const }
    }

    resumeContext() {
      this.contextResumeCalls++
    }

    unlockForGesture = vi.fn(async () => {})

    destroy(): void {
      this.destroyed = true
    }

    addEventListener() {}
    removeEventListener() {}
  }
  return StubLoop
})

vi.mock('#/lib/audio/AudioManager', () => ({
  AudioManager: stubLoopClass,
}))

// ---------------------------------------------------------------------------
// Settings mock (matches existing pattern).
// ---------------------------------------------------------------------------

type SettingsSubset = {
  inputDeviceId: string | null
  sampleRate: 'auto' | 'prefer48000' | 'prefer44100'
  persistentMic: boolean
  browserPreprocessing: 'default' | 'minimal'
  [key: string]: unknown
}

const defaultSettings: SettingsSubset = {
  inputDeviceId: null,
  sampleRate: 'auto',
  persistentMic: false,
  browserPreprocessing: 'default',
}

let currentSettings: SettingsSubset = { ...defaultSettings }

vi.mock('#/components/useSettings', () => ({
  useSettings: vi.fn(() => [currentSettings]),
}))

const mockGainCache = { gainsFor: () => [] } as any

describe('useAudio', () => {
  const NO_ROPES: never[] = []

  function getEvents(result: {
    current: ReturnType<typeof useAudioManager>
  }): any[] {
    return (result.current as any)?.events ?? []
  }

  beforeEach(() => {
    currentSettings = { ...defaultSettings }
    vi.mocked(useSettings).mockClear()
    vi.mocked(useSettings).mockImplementation(
      () => [currentSettings] as unknown as ReturnType<typeof useSettings>,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function renderWithProps(
    props: Partial<Parameters<typeof useAudioManager>[0]>,
  ) {
    return renderHook(() =>
      useAudioManager({
        active: true,
        recording: false,
        onCaptureAppend: () => {},
        onCaptureComplete: () => {},
        onError: () => {},
        onAudioRopeGrow: () => {},
        onAudioRopeShare: () => {},
        onAudioRopeSeal: () => {},
        playing: false,
        playbackRopes: [],
        playbackGainCache: mockGainCache,
        playbackCursorSec: 0,
        onPlaybackStop: () => {},
        onPlaybackPositionChanged: () => {},
        ...props,
      }),
    )
  }

  // -- capture tests --------------------------------------------------------

  it('sends START_CAPTURE on mount when active', () => {
    const { result } = renderWithProps({ active: true })
    const events = getEvents(result)
    expect(events.map((e) => e.type)).toContain('START_CAPTURE')
  })

  it('does not send START_CAPTURE on mount when not active', () => {
    const { result } = renderWithProps({ active: false })
    const events = getEvents(result)
    expect(events.map((e) => e.type)).not.toContain('START_CAPTURE')
  })

  it('sends STOP_CAPTURE when active flips off', () => {
    const { rerender, result } = renderHook(
      ({ active }: { active: boolean }) =>
        useAudioManager({
          active,
          recording: false,
          onCaptureAppend: () => {},
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: false,
          playbackRopes: [],
          playbackGainCache: mockGainCache,
          playbackCursorSec: 0,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      { initialProps: { active: true } },
    )
    getEvents(result).length = 0
    rerender({ active: false })
    const events = getEvents(result)
    expect(events.map((e) => e.type)).toContain('STOP_CAPTURE')
  })

  it('sends START_RECORDING on recording rising edge', () => {
    const { rerender, result } = renderHook(
      ({ recording }: { recording: boolean }) =>
        useAudioManager({
          active: true,
          recording,
          onCaptureAppend: () => {},
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: false,
          playbackRopes: [],
          playbackGainCache: mockGainCache,
          playbackCursorSec: 0,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      { initialProps: { recording: false } },
    )
    getEvents(result).length = 0
    rerender({ recording: true })
    const events = getEvents(result)
    expect(events.map((e) => e.type)).toContain('START_RECORDING')
  })

  it('sends STOP_RECORDING on recording falling edge', () => {
    const { rerender, result } = renderHook(
      ({ recording }: { recording: boolean }) =>
        useAudioManager({
          active: true,
          recording,
          onCaptureAppend: () => {},
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: false,
          playbackRopes: [],
          playbackGainCache: mockGainCache,
          playbackCursorSec: 0,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      { initialProps: { recording: true } },
    )
    getEvents(result).length = 0
    rerender({ recording: false })
    const events = getEvents(result)
    expect(events.map((e) => e.type)).toContain('STOP_RECORDING')
  })

  it('sends SETTINGS_CHANGE when settings change', () => {
    const { rerender, result } = renderHook(() =>
      useAudioManager({
        active: true,
        recording: false,
        onCaptureAppend: () => {},
        onCaptureComplete: () => {},
        onError: () => {},
        onAudioRopeGrow: () => {},
        onAudioRopeShare: () => {},
        onAudioRopeSeal: () => {},
        playing: false,
        playbackRopes: [],
        playbackGainCache: mockGainCache,
        playbackCursorSec: 0,
        onPlaybackStop: () => {},
        onPlaybackPositionChanged: () => {},
      }),
    )
    getEvents(result).length = 0
    currentSettings = { ...currentSettings, inputDeviceId: 'mic-2' }
    rerender()
    const events = getEvents(result)
    const set = events.find((e) => e.type === 'SETTINGS_CHANGE')
    expect(set).toBeDefined()
    if (set?.type === 'SETTINGS_CHANGE') {
      expect(set.settings.inputDeviceId).toBe('mic-2')
    }
  })

  it('sends MIC_CAPTURE_FEATURES when features change', () => {
    const { rerender, result } = renderHook(
      ({ features }: { features: any }) =>
        useAudioManager({
          active: true,
          recording: false,
          captureFeatures: features,
          onCaptureAppend: () => {},
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: false,
          playbackRopes: [],
          playbackGainCache: mockGainCache,
          playbackCursorSec: 0,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      {
        initialProps: {
          features: { spectrogram: true, formant: true, vad: true },
        },
      },
    )
    getEvents(result).length = 0
    rerender({ features: { spectrogram: false, formant: true, vad: true } })
    const events = getEvents(result)
    const ev = events.find((e) => e.type === 'MIC_CAPTURE_FEATURES')
    expect(ev).toBeDefined()
    if (ev?.type === 'MIC_CAPTURE_FEATURES') {
      expect(ev.features.spectrogram).toBe(false)
    }
  })

  it('does not recreate the loop when callbacks change', () => {
    const onAppend1 = () => {}
    const onAppend2 = () => {}
    const { rerender, result } = renderHook(
      ({ onAppend }: { onAppend: () => void }) =>
        useAudioManager({
          active: true,
          recording: false,
          onCaptureAppend: onAppend,
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: false,
          playbackRopes: [],
          playbackGainCache: mockGainCache,
          playbackCursorSec: 0,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      { initialProps: { onAppend: onAppend1 } },
    )
    rerender({ onAppend: onAppend2 })
    const events = getEvents(result)
    expect(events.filter((e) => e.type === 'START_CAPTURE').length).toBe(1)
  })

  it('constructs its own AudioManager internally', () => {
    const { result } = renderHook(() =>
      useAudioManager({
        active: true,
        recording: false,
        onCaptureAppend: () => {},
        onCaptureComplete: () => {},
        onError: () => {},
        onAudioRopeGrow: () => {},
        onAudioRopeShare: () => {},
        onAudioRopeSeal: () => {},
        playing: false,
        playbackRopes: [],
        playbackGainCache: mockGainCache,
        playbackCursorSec: 0,
        onPlaybackStop: () => {},
        onPlaybackPositionChanged: () => {},
      }),
    )
    const manager = result.current
    expect(manager).not.toBeNull()
    expect((manager as any).events.length).toBeGreaterThan(0)
  })

  // -- playback tests -------------------------------------------------------

  it('does not send ENABLE_PLAYBACK on mount when disabled', () => {
    const { result } = renderWithProps({ playing: false })
    const events = getEvents(result)
    expect(events.map((e) => e.type)).not.toContain('ENABLE_PLAYBACK')
  })

  it('sends ENABLE_PLAYBACK with startAtSec when enabled', () => {
    const { result } = renderWithProps({
      playing: true,
      playbackCursorSec: 2.5,
    })
    const events = getEvents(result)
    const ev = events.find((e) => e.type === 'ENABLE_PLAYBACK')
    expect(ev).toBeDefined()
    if (ev?.type === 'ENABLE_PLAYBACK') {
      expect(ev.startAtSec).toBe(2.5)
    }
  })

  it('sends DISABLE_PLAYBACK when enabled flips off', () => {
    const { rerender, result } = renderHook(
      ({ enabled }) =>
        useAudioManager({
          active: false,
          recording: false,
          onCaptureAppend: () => {},
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: enabled,
          playbackRopes: [],
          playbackGainCache: mockGainCache,
          playbackCursorSec: 0,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      { initialProps: { enabled: true } },
    )
    getEvents(result).length = 0
    rerender({ enabled: false })
    const events = getEvents(result)
    expect(events.map((e) => e.type)).toContain('DISABLE_PLAYBACK')
  })

  it('sends ENABLE_PLAYBACK with ropes when enabled', () => {
    const ropes = [
      { length: 44100, sampleRate: 44100, shareRope: vi.fn() },
    ] as any
    const { result } = renderWithProps({ playing: true, playbackRopes: ropes })
    const events = getEvents(result)
    const ev = events.find((e) => e.type === 'ENABLE_PLAYBACK')
    expect(ev).toBeDefined()
    if (ev?.type === 'ENABLE_PLAYBACK') {
      expect(ev.ropes).toBe(ropes)
      expect(ev.endAtSec).toBeUndefined()
    }
  })

  it('forwards endAtSec through ENABLE_PLAYBACK', () => {
    const ropes = [
      { length: 44100, sampleRate: 44100, shareRope: vi.fn() },
    ] as any
    const { result } = renderWithProps({
      playing: true,
      playbackRopes: ropes,
      playbackEndSec: 1.0,
    })
    const events = getEvents(result)
    const ev = events.find((e) => e.type === 'ENABLE_PLAYBACK')
    expect(ev).toBeDefined()
    if (ev?.type === 'ENABLE_PLAYBACK') {
      expect(ev.endAtSec).toBe(1.0)
    }
  })

  it('sends a SEEK event for a backward cursor (real seek)', () => {
    const { rerender, result } = renderHook(
      ({ cursorSec }) =>
        useAudioManager({
          active: false,
          recording: false,
          onCaptureAppend: () => {},
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: true,
          playbackRopes: NO_ROPES,
          playbackGainCache: mockGainCache,
          playbackCursorSec: cursorSec,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      { initialProps: { cursorSec: 5.0 } },
    )
    getEvents(result).length = 0
    rerender({ cursorSec: 1.0 })
    const events = getEvents(result)
    const seek = events.find((e) => e.type === 'SEEK')
    expect(seek).toBeDefined()
    if (seek?.type === 'SEEK') {
      expect(seek.timeSec).toBe(1.0)
    }
  })

  it('does not send SEEK for an echo cursor (within reportedHighWater)', () => {
    const { rerender, result } = renderHook(
      ({ cursorSec }) =>
        useAudioManager({
          active: false,
          recording: false,
          onCaptureAppend: () => {},
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: true,
          playbackRopes: NO_ROPES,
          playbackGainCache: mockGainCache,
          playbackCursorSec: cursorSec,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      { initialProps: { cursorSec: 0 } },
    )
    getEvents(result).length = 0
    rerender({ cursorSec: 0 })
    const events = getEvents(result)
    expect(events.map((e) => e.type)).not.toContain('SEEK')
  })

  it('sends SEEK for a forward cursor past the reported high-water mark', () => {
    const { rerender, result } = renderHook(
      ({ cursorSec }) =>
        useAudioManager({
          active: false,
          recording: false,
          onCaptureAppend: () => {},
          onCaptureComplete: () => {},
          onError: () => {},
          onAudioRopeGrow: () => {},
          onAudioRopeShare: () => {},
          onAudioRopeSeal: () => {},
          playing: true,
          playbackRopes: NO_ROPES,
          playbackGainCache: mockGainCache,
          playbackCursorSec: cursorSec,
          onPlaybackStop: () => {},
          onPlaybackPositionChanged: () => {},
        }),
      { initialProps: { cursorSec: 1.0 } },
    )
    getEvents(result).length = 0
    rerender({ cursorSec: 5.0 })
    const events = getEvents(result)
    const seek = events.find((e) => e.type === 'SEEK')
    expect(seek).toBeDefined()
    if (seek?.type === 'SEEK') {
      expect(seek.timeSec).toBe(5.0)
    }
  })

  it('returns the constructed loop for external use', () => {
    const { result } = renderHook(() =>
      useAudioManager({
        active: false,
        recording: false,
        onCaptureAppend: () => {},
        onCaptureComplete: () => {},
        onError: () => {},
        onAudioRopeGrow: () => {},
        onAudioRopeShare: () => {},
        onAudioRopeSeal: () => {},
        playing: false,
        playbackRopes: [],
        playbackGainCache: mockGainCache,
        playbackCursorSec: 0,
        onPlaybackStop: () => {},
        onPlaybackPositionChanged: () => {},
      }),
    )
    const manager = result.current
    expect(manager).not.toBeNull()
    expect(typeof manager?.unlockForGesture).toBe('function')
  })
})
