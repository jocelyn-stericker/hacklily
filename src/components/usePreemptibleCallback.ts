// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Returns a trigger function that schedules `callback` on the next animation
 * frame with the most recent value passed to it. Rapid calls coalesce into one
 * frame -- only the latest value is used.
 */
export function usePreemptibleCallback<T>(
  callback: (value: T) => void,
): (value: T) => void {
  const frameRef = useRef<number | null>(null)
  const callbackRef = useRef(callback)
  useLayoutEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const latestValueRef = useRef<T | undefined>(undefined)

  const trigger = useCallback((value: T) => {
    latestValueRef.current = value
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        callbackRef.current(latestValueRef.current as T)
        frameRef.current = null
        latestValueRef.current = undefined
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
        latestValueRef.current = undefined
      }
    }
  }, [])

  return trigger
}
