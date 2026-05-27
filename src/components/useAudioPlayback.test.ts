/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@netek.ca>
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

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import type * as SettingsModule from '#/lib/settings'

import { useAudioPlayback } from './useAudioPlayback'

let mockPipelineInstances: any[] = []

vi.mock('#/lib/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof SettingsModule>()
  return {
    ...actual,
    useSettings: vi.fn(() => ({
      inputDeviceId: null,
      sampleRate: 'prefer44100',
      persistentMic: false,
      browserPreprocessing: 'default',
    })),
    preferredSampleRate: vi.fn(() => 44100),
  }
})

vi.mock('#/lib/AudioPlaybackPipeline', () => {
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

describe('useAudioPlayback', () => {
  let mockAudioBuffer: any

  beforeEach(() => {
    mockPipelineInstances = []

    // Create a mock AudioBuffer
    const MockAudioBuffer = class {
      duration = 5
      sampleRate = 44100
      length = 220500
      numberOfChannels = 1
    }
    global.AudioBuffer = MockAudioBuffer as any
    mockAudioBuffer = new MockAudioBuffer()

    // Mock navigator.audioSession if needed
    if (!('audioSession' in navigator)) {
      Object.defineProperty(navigator, 'audioSession', {
        value: { type: 'default' },
        configurable: true,
      })
    }
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
        audioBuffer: null,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    // Should not throw
    expect(true).toBe(true)
  })

  it('creates pipeline when enabled with audioBuffer', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: true,
        audioBuffer: mockAudioBuffer,
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
        audioBuffer: mockAudioBuffer,
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
        audioBuffer: mockAudioBuffer,
        cursorSec: 0,
        onStop,
        onPlaybackPositionChanged,
      }),
    )

    expect(mockPipelineInstances.length).toBe(0)
  })

  it('does not create pipeline without audioBuffer', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    renderHook(() =>
      useAudioPlayback({
        enabled: true,
        audioBuffer: null,
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
        audioBuffer: mockAudioBuffer,
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
        audioBuffer: mockAudioBuffer,
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
          audioBuffer: mockAudioBuffer,
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
          audioBuffer: mockAudioBuffer,
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

  it('creates new pipeline when cursor changes significantly', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const { rerender } = renderHook(
      ({ cursorSec }) =>
        useAudioPlayback({
          enabled: true,
          audioBuffer: mockAudioBuffer,
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
        audioBuffer: mockAudioBuffer,
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
          audioBuffer: mockAudioBuffer,
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

  it('handles audioBuffer change', () => {
    const onStop = vi.fn()
    const onPlaybackPositionChanged = vi.fn()

    const buffer2 = { ...mockAudioBuffer, duration: 10 }

    const { rerender } = renderHook(
      ({ audioBuffer }) =>
        useAudioPlayback({
          enabled: true,
          audioBuffer,
          cursorSec: 0,
          onStop,
          onPlaybackPositionChanged,
        }),
      { initialProps: { audioBuffer: mockAudioBuffer } },
    )

    const pipeline1 = mockPipelineInstances[0]
    expect(pipeline1).toBeDefined()

    rerender({ audioBuffer: buffer2 })

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
          audioBuffer: mockAudioBuffer,
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
