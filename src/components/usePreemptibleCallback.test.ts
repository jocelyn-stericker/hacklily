// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { usePreemptibleCallback } from './usePreemptibleCallback'

describe('usePreemptibleCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('returns a function', () => {
    const { result } = renderHook(() => usePreemptibleCallback(() => {}))
    expect(typeof result.current).toBe('function')
  })

  it('calls callback on next animation frame', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => usePreemptibleCallback(callback))

    act(() => {
      result.current('test')
      vi.runAllTimers()
    })

    expect(callback).toHaveBeenCalledWith('test')
  })

  it('coalesces rapid calls into single frame', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => usePreemptibleCallback(callback))

    act(() => {
      result.current('first')
      result.current('second')
      result.current('third')
      vi.runAllTimers()
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('third')
  })

  it('uses most recent value when coalescing', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => usePreemptibleCallback(callback))

    act(() => {
      result.current({ x: 1 })
      result.current({ x: 2 })
      result.current({ x: 3 })
      vi.runAllTimers()
    })

    expect(callback).toHaveBeenCalledWith({ x: 3 })
  })

  it('schedules separate frames for sequential calls', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => usePreemptibleCallback(callback))

    act(() => {
      result.current('first')
      vi.runAllTimers()
    })

    act(() => {
      result.current('second')
      vi.runAllTimers()
    })

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback.mock.calls[0]![0]).toBe('first')
    expect(callback.mock.calls[1]![0]).toBe('second')
  })

  it('updates callback ref without rescheduling', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    const { result, rerender } = renderHook(
      ({ callback }) => usePreemptibleCallback(callback),
      { initialProps: { callback: callback1 } },
    )

    act(() => {
      result.current('value')
    })

    rerender({ callback: callback2 })

    act(() => {
      vi.runAllTimers()
    })

    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith('value')
  })

  it('cancels pending frame on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() =>
      usePreemptibleCallback(callback),
    )

    act(() => {
      result.current('test')
      // Don't run timers yet
    })

    unmount()

    act(() => {
      vi.runAllTimers()
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('clears latestValueRef on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() =>
      usePreemptibleCallback(callback),
    )

    act(() => {
      result.current('test')
      // Unmount before frame fires
    })

    unmount()

    // Even if we somehow tried to call it again, the state is cleaned
    // This test mainly ensures the cleanup runs without error
    expect(callback).not.toHaveBeenCalled()
  })

  it('handles undefined as a value', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => usePreemptibleCallback(callback))

    act(() => {
      result.current(undefined as any)
      vi.runAllTimers()
    })

    expect(callback).toHaveBeenCalledWith(undefined)
  })

  it('handles null as a value', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => usePreemptibleCallback(callback))

    act(() => {
      result.current(null as any)
      vi.runAllTimers()
    })

    expect(callback).toHaveBeenCalledWith(null)
  })

  it('maintains separate state across multiple hooks', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    const { result: hook1 } = renderHook(() =>
      usePreemptibleCallback(callback1),
    )
    const { result: hook2 } = renderHook(() =>
      usePreemptibleCallback(callback2),
    )

    act(() => {
      hook1.current('value1')
      hook2.current('value2')
      vi.runAllTimers()
    })

    expect(callback1).toHaveBeenCalledWith('value1')
    expect(callback2).toHaveBeenCalledWith('value2')
  })
})
