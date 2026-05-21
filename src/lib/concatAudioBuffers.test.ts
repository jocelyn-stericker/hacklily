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

import { vi, describe, it, expect, beforeEach } from 'vitest'

import { concatAudioBuffers } from './concatAudioBuffers'

vi.hoisted(() => {
  // Set up mock globally before importing
  vi.stubGlobal(
    'AudioContext',
    require('standardized-audio-context-mock').AudioContext,
  )
  // This is intentional! The OfflineAudioContext does not provide createBuffer.
  vi.stubGlobal(
    'OfflineAudioContext',
    require('standardized-audio-context-mock').AudioContext,
  )
})

describe('concatAudioBuffers', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    // AudioContext not available in Node.js test environment
    audioContext = new AudioContext()
  })

  describe('basic concatenation', () => {
    it('concatenates two mono buffers', () => {
      const buffer1 = audioContext.createBuffer(1, 100, 44100)
      const buffer2 = audioContext.createBuffer(1, 100, 44100)

      const ch1 = buffer1.getChannelData(0)
      const ch2 = buffer2.getChannelData(0)
      for (let i = 0; i < 100; i++) {
        ch1[i] = i / 100
        ch2[i] = (i + 100) / 100
      }

      const result = concatAudioBuffers(buffer1, buffer2)

      expect(result.length).toBe(200)
      expect(result.numberOfChannels).toBe(1)
      expect(result.sampleRate).toBe(44100)

      const resultCh = result.getChannelData(0)
      for (let i = 0; i < 100; i++) {
        expect(resultCh[i]).toBeCloseTo(i / 100, 5)
        expect(resultCh[i + 100]).toBeCloseTo((i + 100) / 100, 5)
      }
    })

    it('concatenates two stereo buffers', () => {
      const buffer1 = audioContext.createBuffer(2, 50, 44100)
      const buffer2 = audioContext.createBuffer(2, 50, 44100)

      for (let c = 0; c < 2; c++) {
        const ch1 = buffer1.getChannelData(c)
        const ch2 = buffer2.getChannelData(c)
        for (let i = 0; i < 50; i++) {
          ch1[i] = c + i / 50
          ch2[i] = c + (i + 50) / 50
        }
      }

      const result = concatAudioBuffers(buffer1, buffer2)

      expect(result.length).toBe(100)
      expect(result.numberOfChannels).toBe(2)
      expect(result.sampleRate).toBe(44100)
    })
  })

  describe('channel mismatch handling', () => {
    it('promotes mono + stereo to stereo', () => {
      const mono = audioContext.createBuffer(1, 50, 44100)
      const stereo = audioContext.createBuffer(2, 50, 44100)

      const monoFirst = concatAudioBuffers(mono, stereo)
      expect(monoFirst.numberOfChannels).toBe(2)
      expect(monoFirst.length).toBe(100)

      const stereoFirst = concatAudioBuffers(stereo, mono)
      expect(stereoFirst.numberOfChannels).toBe(2)
      expect(stereoFirst.length).toBe(100)
    })

    it('handles mismatched channel counts (takes maximum)', () => {
      const buffer1 = audioContext.createBuffer(1, 100, 44100)
      const buffer2 = audioContext.createBuffer(4, 100, 44100)

      const result = concatAudioBuffers(buffer1, buffer2)
      expect(result.numberOfChannels).toBe(4)
    })

    it('fills missing channels with silence', () => {
      const mono = audioContext.createBuffer(1, 50, 44100)
      const ch = mono.getChannelData(0)
      for (let i = 0; i < 50; i++) ch[i] = 0.5

      const stereo = audioContext.createBuffer(2, 50, 44100)
      const stereoL = stereo.getChannelData(0)
      const stereoR = stereo.getChannelData(1)
      for (let i = 0; i < 50; i++) {
        stereoL[i] = 0.7
        stereoR[i] = 0.3
      }

      const result = concatAudioBuffers(mono, stereo)
      const resultL = result.getChannelData(0)
      const resultR = result.getChannelData(1)

      for (let i = 0; i < 50; i++) {
        expect(resultL[i]).toBeCloseTo(0.5, 5)
        expect(resultR[i]).toBeCloseTo(0, 5)
      }

      for (let i = 50; i < 100; i++) {
        expect(resultL[i]).toBeCloseTo(0.7, 5)
        expect(resultR[i]).toBeCloseTo(0.3, 5)
      }
    })
  })

  describe('sample rate handling', () => {
    it('preserves first buffer sample rate', () => {
      const buffer1 = audioContext.createBuffer(1, 100, 44100)
      const buffer2 = audioContext.createBuffer(1, 100, 44100)

      const result = concatAudioBuffers(buffer1, buffer2)
      expect(result.sampleRate).toBe(44100)
    })
  })

  describe('edge cases', () => {
    it('concatenates empty buffer with non-empty buffer', () => {
      const empty = audioContext.createBuffer(1, 0, 44100)
      const nonempty = audioContext.createBuffer(1, 100, 44100)
      const ch = nonempty.getChannelData(0)
      for (let i = 0; i < 100; i++) ch[i] = 0.5

      const result = concatAudioBuffers(empty, nonempty)
      expect(result.length).toBe(100)
      const resultCh = result.getChannelData(0)
      for (let i = 0; i < 100; i++) {
        expect(resultCh[i]).toBeCloseTo(0.5, 5)
      }
    })

    it('concatenates non-empty buffer with empty buffer', () => {
      const nonempty = audioContext.createBuffer(1, 100, 44100)
      const empty = audioContext.createBuffer(1, 0, 44100)
      const ch = nonempty.getChannelData(0)
      for (let i = 0; i < 100; i++) ch[i] = 0.5

      const result = concatAudioBuffers(nonempty, empty)
      expect(result.length).toBe(100)
      const resultCh = result.getChannelData(0)
      for (let i = 0; i < 100; i++) {
        expect(resultCh[i]).toBeCloseTo(0.5, 5)
      }
    })

    it('concatenates two empty buffers', () => {
      const empty1 = audioContext.createBuffer(1, 0, 44100)
      const empty2 = audioContext.createBuffer(1, 0, 44100)

      const result = concatAudioBuffers(empty1, empty2)
      expect(result.length).toBe(0)
      expect(result.numberOfChannels).toBe(1)
    })

    it('handles large buffers (several seconds of audio)', () => {
      const sampleRate = 44100
      const duration = 5
      const buffer1 = audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate,
      )
      const buffer2 = audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate,
      )

      const result = concatAudioBuffers(buffer1, buffer2)
      expect(result.length).toBe(sampleRate * duration * 2)
      expect(result.duration).toBeCloseTo(10, 1)
    })
  })

  describe('data integrity', () => {
    it('preserves exact sample values from both buffers', () => {
      const buffer1 = audioContext.createBuffer(1, 3, 44100)
      const buffer2 = audioContext.createBuffer(1, 3, 44100)

      const ch1 = buffer1.getChannelData(0)
      const ch2 = buffer2.getChannelData(0)
      ch1[0] = 0.123
      ch1[1] = -0.456
      ch1[2] = 0.789
      ch2[0] = -0.321
      ch2[1] = 0.654
      ch2[2] = -0.987

      const result = concatAudioBuffers(buffer1, buffer2)
      const resultCh = result.getChannelData(0)

      expect(resultCh[0]).toBeCloseTo(0.123, 5)
      expect(resultCh[1]).toBeCloseTo(-0.456, 5)
      expect(resultCh[2]).toBeCloseTo(0.789, 5)
      expect(resultCh[3]).toBeCloseTo(-0.321, 5)
      expect(resultCh[4]).toBeCloseTo(0.654, 5)
      expect(resultCh[5]).toBeCloseTo(-0.987, 5)
    })
  })
})
