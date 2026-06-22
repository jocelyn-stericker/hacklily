// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { AudioRope } from './AudioRope'

// The real MP3 path needs AudioBuffer + a WASM/worker LAME encoder, neither of
// which exist under happy-dom. Mock the encoder modules so the download wrapper
// runs deterministically; `mergeRopes` (the non-trivial DSP) is tested directly.
const { mp3Bytes } = vi.hoisted(() => ({ mp3Bytes: new Uint8Array([1, 2, 3]) }))

vi.mock('mediabunny', () => {
  class BufferTarget {
    buffer: ArrayBuffer | null = null
  }
  class Output {
    target: BufferTarget
    constructor(opts: { target: BufferTarget }) {
      this.target = opts.target
    }
    addAudioTrack() {}
    start() {
      return Promise.resolve()
    }
    finalize() {
      this.target.buffer = mp3Bytes.buffer
      return Promise.resolve()
    }
  }
  return {
    Output,
    BufferTarget,
    Mp3OutputFormat: class {},
    AudioBufferSource: class {
      add() {
        return Promise.resolve()
      }
      close() {}
    },
    QUALITY_HIGH: {},
    canEncodeAudio: () => Promise.resolve(false),
  }
})

vi.mock('@mediabunny/mp3-encoder', () => ({ registerMp3Encoder: vi.fn() }))

// happy-dom has no Web Audio API; a minimal AudioBuffer is enough for the
// mocked encoder path.
vi.stubGlobal(
  'AudioBuffer',
  class {
    length: number
    sampleRate: number
    numberOfChannels: number
    #data: Float32Array
    constructor(opts: {
      length: number
      sampleRate: number
      numberOfChannels: number
    }) {
      this.length = opts.length
      this.sampleRate = opts.sampleRate
      this.numberOfChannels = opts.numberOfChannels
      this.#data = new Float32Array(opts.length)
    }
    copyToChannel(source: Float32Array) {
      this.#data.set(source)
    }
  },
)

const { exportMp3, ropesToMp3, mergeRopes } = await import('./exportMp3')

function makeRope(lengthSamples = 44100, sampleRate = 44100): AudioRope {
  const rope = new AudioRope(sampleRate)
  rope.append(new Float32Array(lengthSamples))
  return rope
}

describe('exportMp3', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T14:30:45.123Z'))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('creates a download link and triggers click', async () => {
    const clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      click: clickSpy,
      href: '',
      download: '',
    } as unknown as HTMLAnchorElement)

    await exportMp3([makeRope()], [1])

    expect(clickSpy).toHaveBeenCalled()
  })

  it('generates filename with correct timestamp format and .mp3 extension', async () => {
    const anchorElement = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return anchorElement as unknown as HTMLElement
      return document.createElement.bind(document)(tag)
    })

    await exportMp3([makeRope()], [1])

    expect(anchorElement.download).toBe('braat-2026-01-15_14-30-45.mp3')
  })

  it('revokes object URL after download', async () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

    await exportMp3([makeRope()], [1])
    vi.runAllTimers()

    expect(revokeObjectURLSpy).toHaveBeenCalled()
  })
})

describe('ropesToMp3', () => {
  it('returns the encoded bytes from the output target', async () => {
    const bytes = await ropesToMp3([makeRope(100)], [1])
    expect(bytes).toEqual(mp3Bytes)
  })
})

describe('mergeRopes', () => {
  it('concatenates same-rate ropes end-to-end', () => {
    const { samples, sampleRate } = mergeRopes(
      [makeRope(100), makeRope(100)],
      [1, 1],
    )

    expect(sampleRate).toBe(44100)
    expect(samples.length).toBe(200)
  })

  it('resamples ropes to the highest rate present before concatenating', () => {
    const { samples, sampleRate } = mergeRopes(
      [makeRope(50, 22050), makeRope(50, 44100)],
      [1, 1],
    )

    expect(sampleRate).toBe(44100)
    // The 22.05k rope is upsampled to 44.1k (~100 samples), so the total
    // exceeds the 100 raw samples that were appended.
    expect(samples.length).toBeGreaterThan(100)
  })

  it('produces empty samples at the default rate for no ropes', () => {
    const { samples, sampleRate } = mergeRopes([], [])

    expect(samples.length).toBe(0)
    expect(sampleRate).toBe(44100)
  })

  it('applies the per-rope gain to the merged samples', () => {
    const makeFilled = () => {
      const rope = new AudioRope(44100)
      rope.append(new Float32Array(100).fill(0.4))
      return rope
    }

    const full = mergeRopes([makeFilled()], [1]).samples
    const halved = mergeRopes([makeFilled()], [0.5]).samples

    expect(halved[0]).toBeCloseTo(full[0]! / 2)
  })
})
