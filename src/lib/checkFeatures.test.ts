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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  checkFeatures,
  checkLocalTranscription,
  isBrowserTranscriptionAvailable,
  resetTrackRecognitionProbeForTests,
  supportsTrackRecognition,
} from './checkFeatures'

// Drive the behavioural track-support probe by faking the iframe it creates.
// `mode` controls what the iframe's SpeechRecognition.start() does:
//   'supported'   - validates the argument and throws TypeError (track input ok)
//   'unsupported' - ignores the extra argument and "starts" (no track input)
//   'no-ctor'     - the iframe has no SpeechRecognition at all
function fakeTrackProbe(mode: 'supported' | 'unsupported' | 'no-ctor') {
  const contentWindow =
    mode === 'no-ctor'
      ? {}
      : {
          SpeechRecognition: class {
            start() {
              if (mode === 'supported') throw new TypeError('not a track')
            }
            stop() {}
          },
        }
  const frame = { contentWindow, remove: () => {} }
  ;(globalThis as any).document = {
    createElement: () => frame,
    body: { appendChild: () => {} },
  }
  resetTrackRecognitionProbeForTests()
}

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

describe('transcription feature checks', () => {
  let originalSelf: any

  beforeEach(() => {
    originalSelf = (globalThis as any).self
    ;(globalThis as any).self = globalThis
    // Default: this browser supports feeding a track to recognition, so the
    // availability tests below exercise the downstream `available`-probe logic.
    fakeTrackProbe('supported')
  })

  afterEach(() => {
    delete (globalThis as any).SpeechRecognition
    delete (globalThis as any).webkitSpeechRecognition
    delete (globalThis as any).document
    resetTrackRecognitionProbeForTests()
    if (originalSelf !== undefined) {
      ;(globalThis as any).self = originalSelf
    }
  })

  describe('isBrowserTranscriptionAvailable', () => {
    it('returns false when neither constructor exists', async () => {
      await expect(isBrowserTranscriptionAvailable()).resolves.toBe(false)
    })

    it('returns true for the standard SpeechRecognition without a probe', async () => {
      ;(globalThis as any).SpeechRecognition = class {}
      await expect(isBrowserTranscriptionAvailable()).resolves.toBe(true)
    })

    it('returns true when only the prefixed SpeechRecognition exists', async () => {
      ;(globalThis as any).webkitSpeechRecognition = class {}
      await expect(isBrowserTranscriptionAvailable()).resolves.toBe(true)
    })

    it('returns true when the probe reports a non-unavailable status', async () => {
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockResolvedValue('downloadable'),
      }
      await expect(isBrowserTranscriptionAvailable()).resolves.toBe(true)
    })

    it('returns false when the probe reports unavailable', async () => {
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockResolvedValue('unavailable'),
      }
      await expect(isBrowserTranscriptionAvailable()).resolves.toBe(false)
    })

    it('probes without processLocally so cloud recognition counts', async () => {
      const available = vi.fn().mockResolvedValue('available')
      ;(globalThis as any).SpeechRecognition = { available }
      await isBrowserTranscriptionAvailable('fr-FR')
      expect(available).toHaveBeenCalledWith({ langs: ['fr-FR'] })
    })

    it('returns false when the probe rejects', async () => {
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockRejectedValue(new Error('boom')),
      }
      await expect(isBrowserTranscriptionAvailable()).resolves.toBe(false)
    })
  })

  describe('checkLocalTranscription', () => {
    it('returns unavailable when there is no SpeechRecognition', async () => {
      await expect(checkLocalTranscription()).resolves.toBe(false)
    })

    it('returns unavailable for the prefixed-only constructor', async () => {
      // The prefixed constructor has no `available` probe.
      ;(globalThis as any).webkitSpeechRecognition = class {}
      await expect(checkLocalTranscription()).resolves.toBe(false)
    })

    it('maps "available" to downloaded', async () => {
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockResolvedValue('available'),
      }
      await expect(checkLocalTranscription()).resolves.toBe('downloaded')
    })

    it('maps "downloadable" to available', async () => {
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockResolvedValue('downloadable'),
      }
      await expect(checkLocalTranscription()).resolves.toBe('available')
    })

    it('maps "downloading" to available', async () => {
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockResolvedValue('downloading'),
      }
      await expect(checkLocalTranscription()).resolves.toBe('available')
    })

    it('maps "unavailable" to unavailable', async () => {
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockResolvedValue('unavailable'),
      }
      await expect(checkLocalTranscription()).resolves.toBe(false)
    })

    it('probes on-device support for the requested language', async () => {
      const available = vi.fn().mockResolvedValue('available')
      ;(globalThis as any).SpeechRecognition = { available }
      await checkLocalTranscription('fr-FR')
      expect(available).toHaveBeenCalledWith({
        langs: ['fr-FR'],
        processLocally: true,
      })
    })

    it('returns unavailable when the probe rejects', async () => {
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockRejectedValue(new Error('boom')),
      }
      await expect(checkLocalTranscription()).resolves.toBe(false)
    })
  })

  describe('supportsTrackRecognition', () => {
    it('is true when start() validates the argument (throws TypeError)', () => {
      fakeTrackProbe('supported')
      expect(supportsTrackRecognition()).toBe(true)
    })

    it('is false when start() ignores the extra argument', () => {
      fakeTrackProbe('unsupported')
      expect(supportsTrackRecognition()).toBe(false)
    })

    it('is false when the iframe has no SpeechRecognition', () => {
      fakeTrackProbe('no-ctor')
      expect(supportsTrackRecognition()).toBe(false)
    })

    it('is false when there is no document (e.g. a worker)', () => {
      resetTrackRecognitionProbeForTests()
      delete (globalThis as any).document
      expect(supportsTrackRecognition()).toBe(false)
    })

    it('memoises the result', () => {
      const createElement = vi.fn(() => ({
        contentWindow: {
          SpeechRecognition: class {
            start() {
              throw new TypeError('not a track')
            }
            stop() {}
          },
        },
        remove: () => {},
      }))
      ;(globalThis as any).document = {
        createElement,
        body: { appendChild: () => {} },
      }
      resetTrackRecognitionProbeForTests()
      expect(supportsTrackRecognition()).toBe(true)
      expect(supportsTrackRecognition()).toBe(true)
      expect(createElement).toHaveBeenCalledTimes(1)
    })
  })

  describe('track-input requirement gates availability', () => {
    it('isBrowserTranscriptionAvailable is false without track support', async () => {
      fakeTrackProbe('unsupported')
      // A constructor whose probe would otherwise report availability.
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockResolvedValue('available'),
      }
      await expect(isBrowserTranscriptionAvailable()).resolves.toBe(false)
    })

    it('checkLocalTranscription is false without track support', async () => {
      fakeTrackProbe('unsupported')
      ;(globalThis as any).SpeechRecognition = {
        available: vi.fn().mockResolvedValue('available'),
      }
      await expect(checkLocalTranscription()).resolves.toBe(false)
    })
  })
})
