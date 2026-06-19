// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'

import { stashTake, takePracticeData } from './practiceHandoff'

describe('practiceHandoff', () => {
  afterEach(() => {
    delete (window as any).__braatPracticeHandoff
  })

  describe('stashTake', () => {
    it('stores data on window.__braatPracticeHandoff', () => {
      const pcm = new Float32Array([0.1, 0.2, 0.3])
      stashTake({ pcm, sampleRate: 44100 })

      expect(window.__braatPracticeHandoff).toBeDefined()
      expect(window.__braatPracticeHandoff!.pcm).toBe(pcm)
      expect(window.__braatPracticeHandoff!.sampleRate).toBe(44100)
    })

    it('stores optional fields', () => {
      const pcm = new Float32Array([1])
      stashTake({ pcm, sampleRate: 22050, passageId: 'pangram' })

      expect(window.__braatPracticeHandoff!.passageId).toBe('pangram')
    })

    it('overwrites previous data', () => {
      stashTake({ pcm: new Float32Array([1]), sampleRate: 44100 })
      const pcm2 = new Float32Array([2])
      stashTake({ pcm: pcm2, sampleRate: 22050 })

      expect(window.__braatPracticeHandoff!.pcm).toBe(pcm2)
      expect(window.__braatPracticeHandoff!.sampleRate).toBe(22050)
    })
  })

  describe('takePracticeData', () => {
    it('returns null when there is no opener', () => {
      expect(takePracticeData()).toBeNull()
    })

    it('returns null when opener has no handoff data', () => {
      Object.defineProperty(window, 'opener', {
        value: {},
        writable: true,
        configurable: true,
      })
      expect(takePracticeData()).toBeNull()
    })

    it('returns data from opener and clears it', () => {
      const pcm = new Float32Array([0.5, -0.5])
      const opener = { __braatPracticeHandoff: { pcm, sampleRate: 48000 } }
      Object.defineProperty(window, 'opener', {
        value: opener,
        writable: true,
        configurable: true,
      })

      const result = takePracticeData()

      expect(result).not.toBeNull()
      expect(result!.pcm).toBe(pcm)
      expect(result!.sampleRate).toBe(48000)
      expect(opener.__braatPracticeHandoff).toBeUndefined()
    })

    it('preserves optional fields through the round trip', () => {
      const pcm = new Float32Array([1])
      const opener = {
        __braatPracticeHandoff: {
          pcm,
          sampleRate: 44100,
          passageId: 'drill-1',
        },
      }
      Object.defineProperty(window, 'opener', {
        value: opener,
        writable: true,
        configurable: true,
      })

      const result = takePracticeData()

      expect(result!.passageId).toBe('drill-1')
    })

    it('is idempotent — second call returns null', () => {
      const opener = {
        __braatPracticeHandoff: {
          pcm: new Float32Array([1]),
          sampleRate: 44100,
        },
      }
      Object.defineProperty(window, 'opener', {
        value: opener,
        writable: true,
        configurable: true,
      })

      takePracticeData()
      expect(takePracticeData()).toBeNull()
    })
  })
})
