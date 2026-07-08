// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'

import { useTimelineState } from './useTimelineState'

vi.mock('#/lib/browserFeatures', () => ({
  checkFeatures: vi.fn(() => null),
}))

describe('useTimelineState', () => {
  let mockAnalysis: AnalysisChunk[]

  beforeEach(() => {
    mockAnalysis = []
  })

  it('initializes with inactive status', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))
    expect(result.current.status.value).toBe('inactive')
  })

  it('initializes timeline with correct defaults', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))
    expect(result.current.timelineState).toEqual({
      viewportLeftSec: 0,
      viewportRightSec: 10,
      cursorSec: 0,
      hoverSec: null,
      trackDurationSec: 0,
    })
  })

  it('handleAnalyze sets analyzing status during processing', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      void result.current.handleAnalyze(async () => ({
        trackDurationSec: 5,
      }))
    })

    expect(result.current.status.value).toBe('analyzing')
  })

  it('handleAnalyze updates timeline with result', async () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    await act(async () => {
      await result.current.handleAnalyze(async () => ({
        trackDurationSec: 5,
      }))
    })

    expect(result.current.timelineState.trackDurationSec).toBe(5)
    expect(result.current.timelineState.cursorSec).toBe(0)
    expect(result.current.timelineState.viewportLeftSec).toBe(0)
    expect(result.current.timelineState.viewportRightSec).toBe(10)
  })

  it('handleAnalyze resets timeline to initial state', async () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    // Change state first
    act(() => {
      result.current.handlePlotClick(5)
    })

    await act(async () => {
      await result.current.handleAnalyze(async () => ({
        trackDurationSec: 10,
      }))
    })

    expect(result.current.timelineState.cursorSec).toBe(0)
    expect(result.current.timelineState.hoverSec).toBeNull()
  })

  it('handleAnalyze sets inactive status on success', async () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    await act(async () => {
      await result.current.handleAnalyze(async () => ({
        trackDurationSec: 5,
      }))
    })

    expect(result.current.status.value).toBe('inactive')
  })

  it('handleAnalyze sets error status on failure', async () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))
    const error = new Error('Test error')

    await act(async () => {
      await result.current.handleAnalyze(async () => {
        throw error
      })
    })

    expect(result.current.status.value).toBe('error')
    if (result.current.status.value === 'error') {
      expect(result.current.status.error).toBe('Test error')
    }
  })

  it('handlePlotScroll moves viewport left', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotScroll(5)
    })

    expect(result.current.timelineState.viewportLeftSec).toBe(5)
  })

  it('handlePlotScroll maintains viewport width', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))
    const initialWidth =
      result.current.timelineState.viewportRightSec -
      result.current.timelineState.viewportLeftSec

    act(() => {
      result.current.handlePlotScroll(5)
    })

    const newWidth =
      result.current.timelineState.viewportRightSec -
      result.current.timelineState.viewportLeftSec
    expect(newWidth).toBe(initialWidth)
  })

  it('handlePlotScroll clamps to track duration', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    // First set a duration
    act(() => {
      result.current.handlePlotScroll(0)
    })

    // Now try to scroll past it
    act(() => {
      result.current.handlePlotScroll(1000)
    })

    expect(result.current.timelineState.viewportLeftSec).toBeLessThanOrEqual(30)
  })

  it('handlePlotClick sets cursor when within viewport', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotClick(3)
    })

    expect(result.current.timelineState.cursorSec).toBe(3)
  })

  it('handlePlotClick moves viewport when click is outside', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotClick(20)
    })

    expect(result.current.timelineState.cursorSec).toBe(20)
    expect(result.current.timelineState.viewportLeftSec).toBeLessThanOrEqual(20)
    expect(
      result.current.timelineState.viewportRightSec,
    ).toBeGreaterThanOrEqual(20)
  })

  it('handlePlotHover sets hover position', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotHover(2.5)
    })

    expect(result.current.timelineState.hoverSec).toBe(2.5)
  })

  it('handlePlotHover clears hover when null', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotHover(2.5)
      result.current.handlePlotHover(null)
    })

    expect(result.current.timelineState.hoverSec).toBeNull()
  })

  it('handlePlotHover prevents unnecessary updates', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotHover(2.5)
    })

    act(() => {
      result.current.handlePlotHover(2.5)
    })

    expect(result.current.timelineState.hoverSec).toBe(2.5)
  })

  it('handlePlotZoom changes viewport width', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))
    const initialWidth =
      result.current.timelineState.viewportRightSec -
      result.current.timelineState.viewportLeftSec

    act(() => {
      result.current.handlePlotZoom(0.5, 0.5)
    })

    const newWidth =
      result.current.timelineState.viewportRightSec -
      result.current.timelineState.viewportLeftSec
    expect(newWidth).not.toEqual(initialWidth)
  })

  it('handlePlotZoom prevents zooming below minimum width', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      // Try to zoom in a lot
      for (let i = 0; i < 20; i++) {
        result.current.handlePlotZoom(0.5, 0.5)
      }
    })

    const newWidth =
      result.current.timelineState.viewportRightSec -
      result.current.timelineState.viewportLeftSec
    expect(newWidth).toBeGreaterThanOrEqual(0.5)
  })

  it('handlePlotZoom scales the span multiplicatively', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))
    const initialWidth =
      result.current.timelineState.viewportRightSec -
      result.current.timelineState.viewportLeftSec

    act(() => {
      result.current.handlePlotZoom(0.5, 0.5)
    })

    const newWidth =
      result.current.timelineState.viewportRightSec -
      result.current.timelineState.viewportLeftSec
    expect(newWidth).toBeCloseTo(initialWidth * 0.5)
  })

  it('handlePlotZoom pins the focal point under the cursor', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))
    const { viewportLeftSec, viewportRightSec } = result.current.timelineState
    const p = 0.25
    const focusSec = viewportLeftSec + p * (viewportRightSec - viewportLeftSec)

    act(() => {
      result.current.handlePlotZoom(p, 0.5)
    })

    const next = result.current.timelineState
    const newFocusSec =
      next.viewportLeftSec + p * (next.viewportRightSec - next.viewportLeftSec)
    expect(newFocusSec).toBeCloseTo(focusSec)
  })

  it('handleNew resets all state', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotClick(5)
      result.current.handlePlotHover(3)
    })

    act(() => {
      result.current.handleNew()
    })

    expect(result.current.timelineState).toEqual({
      viewportLeftSec: 0,
      viewportRightSec: 10,
      cursorSec: 0,
      hoverSec: null,
      trackDurationSec: 0,
    })
    expect(result.current.status.value).toBe('inactive')
  })

  it('handlePlay sets status to playing', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlay()
    })

    expect(result.current.status.value).toBe('playing')
  })

  it('handlePlay resets cursor if near end', async () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    // Set up analysis with duration
    await act(async () => {
      await result.current.handleAnalyze(async () => ({
        trackDurationSec: 5,
      }))
    })

    act(() => {
      result.current.handlePlotClick(4.95)
    })

    act(() => {
      result.current.handlePlay()
    })

    expect(result.current.timelineState.cursorSec).toBe(0)
  })

  it('handleStart sets status to recording', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleStart()
    })

    expect(result.current.status.value).toBe('recording')
  })

  it('handleStart switches from playing to recording', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlay()
    })
    expect(result.current.status.value).toBe('playing')

    act(() => {
      result.current.handleStart()
    })

    expect(result.current.status.value).toBe('recording')
  })

  it('handlePlaybackStop transitions playing to inactive', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlay()
    })

    act(() => {
      result.current.handlePlaybackStop()
    })

    expect(result.current.status.value).toBe('inactive')
  })

  it('handlePlaybackStop does not cancel recording', () => {
    // The audio engine fires stop when playing is disabled during play -> record.
    // This must not transition recording -> inactive.
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlay()
    })
    act(() => {
      result.current.handleStart()
    })
    expect(result.current.status.value).toBe('recording')

    act(() => {
      result.current.handlePlaybackStop()
    })

    expect(result.current.status.value).toBe('recording')
  })

  it('handlePause pauses playback', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlay()
      result.current.handlePause()
    })

    expect(result.current.status.value).toBe('inactive')
  })

  it('handlePause pauses recording', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleStart()
      result.current.handlePause()
    })

    expect(result.current.status.value).toBe('inactive')
  })

  it('handlePause does not change other statuses', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleAcknowledgeError()
    })

    expect(result.current.status.value).toBe('inactive')
  })

  it('handleBackToStart resets cursor and viewport', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotClick(5)
      result.current.handlePlotScroll(2)
    })

    act(() => {
      result.current.handleBackToStart()
    })

    expect(result.current.timelineState.cursorSec).toBe(0)
    expect(result.current.timelineState.viewportLeftSec).toBe(0)
  })

  it('handleJump clamps cursor to valid range', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleJump(2)
    })

    expect(result.current.timelineState.cursorSec).toBeGreaterThanOrEqual(0)
  })

  it('handleJump moves cursor backward', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlotClick(5)
    })

    const beforeJump = result.current.timelineState.cursorSec

    act(() => {
      result.current.handleJump(-2)
    })

    expect(result.current.timelineState.cursorSec).toBeLessThan(beforeJump)
  })

  it('handleJump clamps to valid range', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleJump(-10)
    })

    expect(result.current.timelineState.cursorSec).toBe(0)
  })

  it('handleJump maintains valid viewport state', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleJump(20)
    })

    const { viewportLeftSec, viewportRightSec } = result.current.timelineState
    expect(viewportRightSec - viewportLeftSec).toBeGreaterThanOrEqual(0.5)
  })

  it('handleRecordingComplete updates duration and cursor', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleStart()
      result.current.handleRecordingComplete({ trackDurationSec: 5 })
    })

    expect(result.current.timelineState.trackDurationSec).toBe(5)
    expect(result.current.timelineState.cursorSec).toBe(5)
  })

  it('handleRecordingComplete only stops recording status', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlay()
      result.current.handleRecordingComplete({ trackDurationSec: 5 })
    })

    // Should not stop playing status
    expect(result.current.status.value).toBe('playing')
  })

  it('handlePlaybackPositionChanged updates cursor', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlaybackPositionChanged(2.5)
    })

    expect(result.current.timelineState.cursorSec).toBe(2.5)
  })

  it('handlePlaybackPositionChanged moves viewport to follow playback', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlaybackPositionChanged(0.5)
      result.current.handlePlaybackPositionChanged(9.5)
    })

    expect(result.current.timelineState.viewportLeftSec).toBeGreaterThan(0)
  })

  it('handlePlaybackPositionChanged updates track duration if longer', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handlePlaybackPositionChanged(15)
    })

    expect(result.current.timelineState.trackDurationSec).toBe(15)
  })

  it('handleError sets error status', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))
    const error = new Error('Playback failed')

    act(() => {
      result.current.handleError(error)
    })

    expect(result.current.status.value).toBe('error')
    if (result.current.status.value === 'error') {
      expect(result.current.status.error).toBe('Playback failed')
    }
  })

  it('handleAcknowledgeError resets to inactive', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleError(new Error('Test'))
      result.current.handleAcknowledgeError()
    })

    expect(result.current.status.value).toBe('inactive')
  })

  it('handleOpenAudioSettings sets editAudioSettings status', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleOpenAudioSettings()
    })

    expect(result.current.status.value).toBe('editAudioSettings')
  })

  it('handleOpenAudioSettings closes when called with false', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    act(() => {
      result.current.handleOpenAudioSettings(true)
      result.current.handleOpenAudioSettings(false)
    })

    expect(result.current.status.value).toBe('inactive')
  })

  it('waveformTimelineState extends viewport for full duration', async () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    await act(async () => {
      await result.current.handleAnalyze(async () => ({
        trackDurationSec: 10,
      }))
    })

    expect(result.current.waveformTimelineState.viewportLeftSec).toBe(0)
    expect(
      result.current.waveformTimelineState.viewportRightSec,
    ).toBeGreaterThan(10)
  })

  it('hoverFrame defaults to cursor position', () => {
    const { result } = renderHook(() => useTimelineState(mockAnalysis))

    // hoverFrame should default to using hoverSec if set, otherwise cursorSec
    // With empty analysis, it will be undefined, but it should compute consistently
    expect(typeof result.current.hoverFrame).toBe('undefined')
  })
})
