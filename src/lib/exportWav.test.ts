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

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { exportWav, audioBufferToWav } from './exportWav'

vi.hoisted(() => {
  vi.stubGlobal(
    'AudioContext',
    require('standardized-audio-context-mock').AudioContext,
  )
  vi.stubGlobal(
    'OfflineAudioContext',
    require('standardized-audio-context-mock').AudioContext,
  )
  vi.stubGlobal(
    'AudioBuffer',
    require('standardized-audio-context-mock').AudioBuffer,
  )
})

function readWavHeader(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  return {
    riff: String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    ),
    chunkSize: view.getUint32(4, true),
    wave: String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11),
    ),
    fmt: String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15),
    ),
    fmtChunkSize: view.getUint32(16, true),
    format: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bitDepth: view.getUint16(34, true),
    data: String.fromCharCode(
      view.getUint8(36),
      view.getUint8(37),
      view.getUint8(38),
      view.getUint8(39),
    ),
    dataSize: view.getUint32(40, true),
  }
}

describe('exportWav', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T14:30:45.123Z'))
    audioContext = new AudioContext()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('creates a download link and triggers click', () => {
    const clickSpy = vi.fn()

    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      click: clickSpy,
      href: '',
      download: '',
    } as unknown as HTMLAnchorElement)

    const buffer = audioContext.createBuffer(1, 44100, 44100)

    exportWav(buffer)

    expect(clickSpy).toHaveBeenCalled()
  })

  it('generates filename with correct timestamp format', () => {
    const anchorElement = {
      href: '',
      download: '',
      click: vi.fn(),
    }

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return anchorElement as unknown as HTMLElement
      }
      return document.createElement.bind(document)(tag)
    })

    const buffer = audioContext.createBuffer(1, 44100, 44100)
    exportWav(buffer)

    expect(anchorElement.download).toMatch(
      /^braat-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.wav$/,
    )
    expect(anchorElement.download).toBe('braat-2026-01-15_14-30-45.wav')
  })

  it('revokes object URL after download', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

    const buffer = audioContext.createBuffer(1, 44100, 44100)
    exportWav(buffer)

    vi.runAllTimers()

    expect(revokeObjectURLSpy).toHaveBeenCalled()
  })

  it('creates and downloads a WAV file without error', () => {
    const buffer = audioContext.createBuffer(1, 44100, 44100)
    const anchorElement = {
      click: vi.fn(),
      href: '',
      download: '',
    }

    vi.spyOn(document, 'createElement').mockReturnValueOnce(
      anchorElement as unknown as HTMLAnchorElement,
    )

    // Should complete without error
    exportWav(buffer)

    // Verify the anchor was clicked
    expect(anchorElement.click).toHaveBeenCalled()
  })
})

describe('audioBufferToWav', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = new AudioContext()
  })

  it('encodes mono audio as 16-bit PCM WAV', () => {
    const buffer = audioContext.createBuffer(1, 44100, 44100)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.sin((2 * Math.PI * i * 440) / 44100) * 0.5
    }

    const wav = audioBufferToWav(buffer)

    expect(wav).toBeInstanceOf(ArrayBuffer)
    const header = readWavHeader(wav)
    expect(header.channels).toBe(1)
    expect(header.sampleRate).toBe(44100)
    expect(header.bitDepth).toBe(16)
    expect(header.format).toBe(1) // PCM
  })

  it('encodes stereo audio as interleaved 16-bit PCM WAV', () => {
    const buffer = audioContext.createBuffer(2, 44100, 44100)

    for (let ch = 0; ch < 2; ch++) {
      const channel = buffer.getChannelData(ch)
      for (let i = 0; i < channel.length; i++) {
        channel[i] =
          Math.sin((2 * Math.PI * i * (440 + ch * 100)) / 44100) * 0.5
      }
    }

    const wav = audioBufferToWav(buffer)

    const header = readWavHeader(wav)
    expect(header.channels).toBe(2)
    expect(header.sampleRate).toBe(44100)
    expect(header.bitDepth).toBe(16)
    expect(header.blockAlign).toBe(4)
  })

  it('encodes audio as 32-bit float when float32 option is true', () => {
    const buffer = audioContext.createBuffer(1, 44100, 44100)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < 100; i++) {
      channel[i] = 0.5
    }

    const wav = audioBufferToWav(buffer, { float32: true })

    const header = readWavHeader(wav)
    expect(header.bitDepth).toBe(32)
    expect(header.format).toBe(3) // FLOAT32
  })

  it('has correct WAV header structure', () => {
    const buffer = audioContext.createBuffer(1, 100, 48000)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < channel.length; i++) {
      channel[i] = 0.1
    }

    const wav = audioBufferToWav(buffer)
    const header = readWavHeader(wav)

    expect(header.riff).toBe('RIFF')
    expect(header.wave).toBe('WAVE')
    expect(header.fmt).toBe('fmt ')
    expect(header.data).toBe('data')
    expect(header.fmtChunkSize).toBe(16)
  })

  it('calculates correct byte rate (sample rate × block align)', () => {
    const buffer = audioContext.createBuffer(2, 100, 48000)

    const wav = audioBufferToWav(buffer)
    const header = readWavHeader(wav)

    const expectedByteRate = 48000 * 4 // 48000 Hz * 2 channels * 2 bytes per sample
    expect(header.byteRate).toBe(expectedByteRate)
  })

  it('encodes correct data size in header', () => {
    const buffer = audioContext.createBuffer(1, 1000, 44100)

    const wav = audioBufferToWav(buffer)
    const header = readWavHeader(wav)

    const expectedDataSize = 1000 * 2 // 1000 samples * 2 bytes per sample (16-bit)
    expect(header.dataSize).toBe(expectedDataSize)
  })

  it('encodes correct file size in RIFF header', () => {
    const buffer = audioContext.createBuffer(1, 1000, 44100)

    const wav = audioBufferToWav(buffer)
    const header = readWavHeader(wav)

    // RIFF size = 36 + dataSize (excludes the 8-byte RIFF header itself)
    const expectedChunkSize = 36 + header.dataSize
    expect(header.chunkSize).toBe(expectedChunkSize)
  })

  it('handles different sample rates', () => {
    const sampleRates = [8000, 16000, 44100, 48000, 96000]

    for (const sr of sampleRates) {
      const buffer = audioContext.createBuffer(1, 100, sr)

      const wav = audioBufferToWav(buffer)
      const header = readWavHeader(wav)

      expect(header.sampleRate).toBe(sr)
    }
  })

  it('clamps sample values to [-1, 1] during 16-bit conversion', () => {
    const buffer = audioContext.createBuffer(1, 4, 44100)
    const channel = buffer.getChannelData(0)

    channel[0] = 2.0 // Over range
    channel[1] = -2.0 // Under range
    channel[2] = 0.5 // Normal
    channel[3] = -0.5 // Normal

    const wav = audioBufferToWav(buffer)
    const view = new DataView(wav)

    // Skip to data section (44 bytes)
    const sample0 = view.getInt16(44, true)
    const sample1 = view.getInt16(46, true)

    // Over/under range should be clamped to max/min 16-bit signed int
    expect(sample0).toBe(0x7fff) // Max positive
    expect(sample1).toBe(-0x8000) // Max negative
  })

  it('correctly converts float samples to 16-bit PCM', () => {
    const buffer = audioContext.createBuffer(1, 2, 44100)
    const channel = buffer.getChannelData(0)

    channel[0] = 0.5
    channel[1] = -0.5

    const wav = audioBufferToWav(buffer)
    const view = new DataView(wav)

    const sample0 = view.getInt16(44, true)
    const sample1 = view.getInt16(46, true)

    // 0.5 -> 0.5 * 0x7fff = 16383
    expect(sample0).toBe(16383)
    // -0.5 -> -0.5 * 0x8000 = -16384
    expect(sample1).toBe(-16384)
  })

  it('handles zero samples correctly', () => {
    const buffer = audioContext.createBuffer(1, 1, 44100)
    const channel = buffer.getChannelData(0)
    channel[0] = 0.0

    const wav = audioBufferToWav(buffer)
    const view = new DataView(wav)

    const sample = view.getInt16(44, true)
    expect(sample).toBe(0)
  })

  it('preserves stereo channel separation in interleaved format', () => {
    const buffer = audioContext.createBuffer(2, 4, 44100)

    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)

    left[0] = 0.5
    left[1] = 0.25
    right[0] = -0.5
    right[1] = -0.25

    const wav = audioBufferToWav(buffer)
    const view = new DataView(wav)

    // Interleaved: L0, R0, L1, R1, ...
    const l0 = view.getInt16(44, true)
    const r0 = view.getInt16(46, true)
    const l1 = view.getInt16(48, true)
    const r1 = view.getInt16(50, true)

    expect(l0).toBeCloseTo(16383, 1)
    expect(r0).toBeCloseTo(-16384, 1)
    expect(l1).toBeCloseTo(8191, 1)
    expect(r1).toBeCloseTo(-8192, 1)
  })

  it('encodes 32-bit float samples correctly', () => {
    const buffer = audioContext.createBuffer(1, 2, 44100)
    const channel = buffer.getChannelData(0)

    channel[0] = 0.5
    channel[1] = -0.5

    const wav = audioBufferToWav(buffer, { float32: true })
    const view = new DataView(wav)

    const sample0 = view.getFloat32(44, true)
    const sample1 = view.getFloat32(48, true)

    expect(sample0).toBeCloseTo(0.5, 5)
    expect(sample1).toBeCloseTo(-0.5, 5)
  })

  it('handles empty buffer', () => {
    const buffer = audioContext.createBuffer(1, 0, 44100)

    const wav = audioBufferToWav(buffer)

    expect(wav).toBeInstanceOf(ArrayBuffer)
    expect(wav.byteLength).toBe(44) // Just the header
  })

  it('handles single sample', () => {
    const buffer = audioContext.createBuffer(1, 1, 44100)
    const channel = buffer.getChannelData(0)
    channel[0] = 0.1

    const wav = audioBufferToWav(buffer)

    expect(wav.byteLength).toBe(44 + 2) // Header + 1 sample (16-bit)
  })
})
