/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nynek.ca>
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { checkFeatures } from './checkFeatures'

describe('checkFeatures', () => {
  let originalCrossOriginIsolated: boolean
  let originalSharedArrayBuffer: typeof SharedArrayBuffer | undefined
  let originalSelf: any

  beforeEach(() => {
    originalCrossOriginIsolated =
      (globalThis as any).crossOriginIsolated ?? false
    originalSharedArrayBuffer = globalThis.SharedArrayBuffer
    originalSelf = (globalThis as any).self

    // Create a self object that's a reference to globalThis (like in browsers)
    ;(globalThis as any).self = globalThis
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      value: originalCrossOriginIsolated,
      configurable: true,
    })
    if (originalSharedArrayBuffer) {
      globalThis.SharedArrayBuffer = originalSharedArrayBuffer
    } else {
      delete (globalThis as any).SharedArrayBuffer
    }
    if (originalSelf !== undefined) {
      ;(globalThis as any).self = originalSelf
    }
  })

  it('returns null when both crossOriginIsolated and SharedArrayBuffer are available', () => {
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      value: true,
      configurable: true,
    })
    globalThis.SharedArrayBuffer = class {} as any

    const result = checkFeatures()
    expect(result).toBeNull()
  })

  it('returns error message when crossOriginIsolated is false', () => {
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      value: false,
      configurable: true,
    })

    const result = checkFeatures()
    expect(result).toContain('cross origin isolation')
  })

  it('returns error message when SharedArrayBuffer is undefined', () => {
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      value: true,
      configurable: true,
    })
    delete (globalThis as any).SharedArrayBuffer

    const result = checkFeatures()
    expect(result).toContain('SharedArrayBuffer')
  })
})
