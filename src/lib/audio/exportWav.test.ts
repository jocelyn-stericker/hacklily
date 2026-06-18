// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { AudioRope } from './AudioRope'
import { exportWav, ropesToWav } from './exportWav'

function makeRope(lengthSamples = 44100, sampleRate = 44100): AudioRope {
  const rope = new AudioRope(sampleRate)
  rope.append(new Float32Array(lengthSamples))
  return rope
}

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
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T14:30:45.123Z'))
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

    exportWav([makeRope()], [1])

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

    exportWav([makeRope()], [1])

    expect(anchorElement.download).toMatch(
      /^braat-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.wav$/,
    )
    expect(anchorElement.download).toBe('braat-2026-01-15_14-30-45.wav')
  })

  it('revokes object URL after download', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

    exportWav([makeRope()], [1])

    vi.runAllTimers()

    expect(revokeObjectURLSpy).toHaveBeenCalled()
  })

  it('creates and downloads a WAV file without error', () => {
    const anchorElement = {
      click: vi.fn(),
      href: '',
      download: '',
    }

    vi.spyOn(document, 'createElement').mockReturnValueOnce(
      anchorElement as unknown as HTMLAnchorElement,
    )

    // Should complete without error
    exportWav([makeRope()], [1])

    // Verify the anchor was clicked
    expect(anchorElement.click).toHaveBeenCalled()
  })
})

describe('ropesToWav', () => {
  it('concatenates same-rate ropes end-to-end', () => {
    const wav = ropesToWav([makeRope(100), makeRope(100)], [1, 1])
    const header = readWavHeader(wav)

    expect(header.sampleRate).toBe(44100)
    expect(header.channels).toBe(1)
    expect(header.bitDepth).toBe(16)
    expect(header.dataSize).toBe(200 * 2) // 200 samples, 16-bit
  })

  it('resamples ropes to the highest rate present before concatenating', () => {
    const wav = ropesToWav([makeRope(50, 22050), makeRope(50, 44100)], [1, 1])
    const header = readWavHeader(wav)

    expect(header.sampleRate).toBe(44100)
    // The 22.05k rope is upsampled to 44.1k (~100 samples), so the total
    // exceeds the 100 raw samples that were appended.
    expect(header.dataSize / 2).toBeGreaterThan(100)
  })

  it('produces a header-only WAV for no ropes', () => {
    const wav = ropesToWav([], [])
    const header = readWavHeader(wav)

    expect(wav.byteLength).toBe(44)
    expect(header.sampleRate).toBe(44100)
  })

  it('applies the per-rope gain to the encoded samples', () => {
    const makeFilled = () => {
      const rope = new AudioRope(44100)
      rope.append(new Float32Array(100).fill(0.4))
      return rope
    }

    const full = new DataView(ropesToWav([makeFilled()], [1]))
    const halved = new DataView(ropesToWav([makeFilled()], [0.5]))
    // Halving the gain halves the encoded sample value.
    expect(halved.getInt16(44, true)).toBe(
      Math.round(full.getInt16(44, true) / 2),
    )
  })
})
