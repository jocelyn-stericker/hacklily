/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
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
