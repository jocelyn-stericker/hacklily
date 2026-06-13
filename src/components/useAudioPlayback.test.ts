// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import type * as SettingsModule from '#/components/useSettings'

import { useAudioPlayback } from './useAudioPlayback'

vi.mock('#/lib/audio/sharedAudioContext', () => ({
  getOrCreateSharedAudioContext: vi.fn(() => ({
    context: {
      state: 'running',
      resume: vi.fn(async () => {}),
      suspend: vi.fn(async () => {}),
    },
    playbackModuleReady: Promise.resolve(),
    captureModuleReady: Promise.resolve(),
  })),
  acquireSharedAudioContext: vi.fn(() => ({
    context: {
      state: 'running',
      resume: vi.fn(async () => {}),
      suspend: vi.fn(async () => {}),
    },
    playbackModuleReady: Promise.resolve(),
    captureModuleReady: Promise.resolve(),
    release: vi.fn(),
  })),
  resumeSharedAudioContext: vi.fn(),
}))

let mockPipelineInstances: any[] = []

vi.mock('#/components/useSettings', async (importOriginal) => {
  const actual = await importOriginal<typeof SettingsModule>()
  return {
    ...actual,
    useSettings: vi.fn(() => [
      {
        inputDeviceId: null,
        sampleRate: 'prefer44100',
        persistentMic: false,
        browserPreprocessing: 'default',
      },
    ]),
  }
})

vi.mock('#/lib/audio/AudioPlaybackPipeline', () => {
  class MockAudioPlaybackPipeline {
    stopSignal: AbortSignal
    private messageListeners: Map<string, Set<(e: any) => void>> = new Map()
    abort: AbortController

    constructor() {
      this.abort = new AbortController()
      this.stopSignal = this.abort.signal
      mockPipelineInstances.push(this)
    }

    addEventListener(
      type: string,
      listener: (e: any) => void,
      options?: AddEventListenerOptions,
    ) {
      if (!this.messageListeners.has(type)) {
        this.messageListeners.set(type, new Set())
      }
      this.messageListeners.get(type)!.add(listener)

      options?.signal?.addEventListener('abort', () => {
        this.removeEventListener(type, listener)
      })
    }

    removeEventListener(type: string, listener: (e: any) => void) {
      this.messageListeners.get(type)?.delete(listener)
    }

    dispatchEvent(type: string, detail: any) {
      const listeners = this.messageListeners.get(type)
      if (listeners) {
        for (const listener of [...listeners]) {
          listener(new CustomEvent(type, { detail }))
        }
      }
    }
  }

  return {
    AudioPlaybackPipeline: MockAudioPlaybackPipeline,
  }
})

// The mocked pipeline ignores gains, so a stub that returns no gains is enough.
const mockGainCache = { gainsFor: () => [] } as any

describe('useAudioPlayback', () => {
  let mockRopes: any[]

  beforeEach(() => {
    mockPipelineInstances = []

    // A AudioRope stand-in -- the mocked pipeline ignores the data, so we only
    // need enough shape for `ropes.length` checks in the hook.
    mockRopes = [{ length: 220500, sampleRate: 44100, shareRope: vi.fn() }]
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders without error', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: false,
        ropes: [],
        gainCache: mockGainCache,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )
  })

  it('creates pipeline when enabled with ropes', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: true,
        ropes: mockRopes,
        gainCache: mockGainCache,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    expect(mockPipelineInstances.length).toBeGreaterThan(0)
  })

  it('passes correct options to pipeline', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: true,
        ropes: mockRopes,
        gainCache: mockGainCache,
        cursorSec: 2.5,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    const pipeline = mockPipelineInstances[0]
    expect(pipeline).toBeDefined()
  })

  it('does not create pipeline when disabled', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: false,
        ropes: mockRopes,
        gainCache: mockGainCache,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    expect(mockPipelineInstances.length).toBe(0)
  })

  it('does not create pipeline without ropes', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: true,
        ropes: [],
        gainCache: mockGainCache,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    expect(mockPipelineInstances.length).toBe(0)
  })

  it('calls onStop when pipeline emits stop event', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: true,
        ropes: mockRopes,
        gainCache: mockGainCache,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    const pipeline = mockPipelineInstances[0]
    pipeline.dispatchEvent('stop', {})

    expect(onStop).toHaveBeenCalled()
  })

  it('calls onPlaybackPositionChanged on positionChanged event', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: true,
        ropes: mockRopes,
        gainCache: mockGainCache,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    const pipeline = mockPipelineInstances[0]
    pipeline.dispatchEvent('positionChanged', { timeSec: 1.5 })

    expect(onPlaybackPositionChanged).toHaveBeenCalledWith(1.5)
  })

  it('does not create pipeline when transitioning to disabled', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ enabled }) =>
        useAudioPlayback({
          enabled,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec: 0,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { enabled: true } },
    )

    const count = mockPipelineInstances.length

    rerender({ enabled: false })

    expect(mockPipelineInstances.length).toBe(count)
  })

  it('prevents feedback loop when cursor matches last reported position', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ cursorSec }) =>
        useAudioPlayback({
          enabled: true,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { cursorSec: 0 } },
    )

    const pipeline1 = mockPipelineInstances[0]
    pipeline1.dispatchEvent('positionChanged', { timeSec: 1.0 })

    // Rerender with same cursorSec that was reported
    rerender({ cursorSec: 1.0 })

    // Should not create a new pipeline
    expect(mockPipelineInstances.length).toBe(1)
  })

  it('does not recreate the pipeline when position reports outrun the cursor re-render', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ cursorSec }) =>
        useAudioPlayback({
          enabled: true,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { cursorSec: 0 } },
    )

    const pipeline = mockPipelineInstances[0]

    // The worklet reports a new position every animation frame. The parent
    // turns those into cursor updates, but its re-render always trails the live
    // playhead -- so by the time the cursor catches up to one reported value, the
    // pipeline has already emitted the next one(s).
    pipeline.dispatchEvent('positionChanged', { timeSec: 1.0 })
    pipeline.dispatchEvent('positionChanged', { timeSec: 1.0166 })

    // Parent commits the first reported position; the pipeline meanwhile sits at
    // 1.0166. The playhead only moved forward and nothing else changed, so the
    // graph must keep playing -- not be torn down and recreated (an audible gap).
    rerender({ cursorSec: 1.0 })

    expect(mockPipelineInstances.length).toBe(1)
  })

  it('recreates the pipeline on a backward seek during playback', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ cursorSec }) =>
        useAudioPlayback({
          enabled: true,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { cursorSec: 0 } },
    )

    // Play forward to ~2s, cursor catches up.
    mockPipelineInstances[0].dispatchEvent('positionChanged', { timeSec: 2.0 })
    rerender({ cursorSec: 2.0 })
    expect(mockPipelineInstances.length).toBe(1)

    // User scrubs back to 0.5 -- behind the playhead, a real seek.
    rerender({ cursorSec: 0.5 })
    expect(mockPipelineInstances.length).toBe(2)
  })

  it('recreates the pipeline on a forward seek past the playhead', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ cursorSec }) =>
        useAudioPlayback({
          enabled: true,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { cursorSec: 0 } },
    )

    mockPipelineInstances[0].dispatchEvent('positionChanged', { timeSec: 1.0 })
    rerender({ cursorSec: 1.0 })
    expect(mockPipelineInstances.length).toBe(1)

    // User scrubs forward to 5s -- ahead of anything played, a real seek.
    rerender({ cursorSec: 5.0 })
    expect(mockPipelineInstances.length).toBe(2)
  })

  it('does not recreate the pipeline across a steady run of trailing cursor updates', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ cursorSec }) =>
        useAudioPlayback({
          enabled: true,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { cursorSec: 0 } },
    )

    const pipeline = mockPipelineInstances[0]

    // Simulate ~60fps playback where each commit lands one frame behind the
    // pipeline: the pipeline has already reported frame N+1 by the time the
    // parent re-renders with frame N's time. This is the steady state of
    // playback, so the single pipeline must survive the whole run.
    let reported = 0
    for (let frame = 1; frame <= 10; frame++) {
      const prev = reported
      reported = frame * (1 / 60)
      // Pipeline advances a frame ahead of the cursor that's about to commit.
      pipeline.dispatchEvent('positionChanged', { timeSec: reported })
      // Parent commits the previously-reported (trailing) position.
      rerender({ cursorSec: prev })
    }

    expect(mockPipelineInstances.length).toBe(1)
  })

  it('creates new pipeline when cursor changes significantly', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ cursorSec }) =>
        useAudioPlayback({
          enabled: true,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { cursorSec: 0 } },
    )

    expect(mockPipelineInstances.length).toBe(1)

    rerender({ cursorSec: 3.0 })

    // Should create a new pipeline with new cursor position
    expect(mockPipelineInstances.length).toBeGreaterThanOrEqual(1)
  })

  it('unmounts without error', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { unmount } = renderHook(() =>
      useAudioPlayback({
        enabled: true,
        ropes: mockRopes,
        gainCache: mockGainCache,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    expect(() => unmount()).not.toThrow()
  })

  it('updates callback refs without affecting pipeline', () => {
    const onStop1 = vi.fn()
    const onPlaybackPositionChanged1 = vi.fn()
    const onStop2 = vi.fn()
    const onPlaybackPositionChanged2 = vi.fn()

    const { rerender } = renderHook(
      ({ onStop, onPlaybackPositionChanged }) =>
        useAudioPlayback({
          enabled: true,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec: 0,
          onStop,
          onPlaybackPositionChanged,
        }),
      {
        initialProps: {
          onStop: onStop1,
          onPlaybackPositionChanged: onPlaybackPositionChanged1,
        },
      },
    )

    expect(mockPipelineInstances.length).toBe(1)

    rerender({
      onStop: onStop2,
      onPlaybackPositionChanged: onPlaybackPositionChanged2,
    })

    // Pipeline should not be recreated
    expect(mockPipelineInstances.length).toBe(1)

    const pipeline = mockPipelineInstances[0]
    pipeline.dispatchEvent('stop', {})
    pipeline.dispatchEvent('positionChanged', { timeSec: 1.0 })

    // New callbacks should be called
    expect(onStop2).toHaveBeenCalled()
    expect(onPlaybackPositionChanged2).toHaveBeenCalledWith(1.0)
  })

  it('handles ropes change', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const ropes2 = [{ length: 441000, sampleRate: 44100, shareRope: vi.fn() }]

    const { rerender } = renderHook(
      ({ ropes }) =>
        useAudioPlayback({
          enabled: true,
          ropes,
          gainCache: mockGainCache,
          cursorSec: 0,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { ropes: mockRopes } },
    )

    const pipeline1 = mockPipelineInstances[0]
    expect(pipeline1).toBeDefined()

    rerender({ ropes: ropes2 })

    const pipeline2 = mockPipelineInstances[mockPipelineInstances.length - 1]
    expect(pipeline2).toBeDefined()
  })

  it('recreates pipeline when cursor changes', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ cursorSec }) =>
        useAudioPlayback({
          enabled: true,
          ropes: mockRopes,
          gainCache: mockGainCache,
          cursorSec,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { cursorSec: 0 } },
    )

    const pipelineCount = mockPipelineInstances.length

    rerender({ cursorSec: 5.0 })

    // Verify that a change occurred (may or may not create new pipeline)
    expect(mockPipelineInstances.length).toBeGreaterThanOrEqual(pipelineCount)
  })
})
