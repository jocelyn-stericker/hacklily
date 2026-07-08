// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { describe, it, expect, vi } from 'vitest'

import { powerToInt8 } from '#/lib/analysis/AnalysisFrame'
import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'

import { TranscriptStore } from './TranscriptStore'

function chunk(): AnalysisChunk {
  return {
    timeStepSamples: 10,
    sampleRate: 100,
    freqStepHz: 0,
    firstBinHz: 0,
    startTimeSec: 0,
    frames: [],
    voiced: true,
  }
}

// Wait for the animation frame the store coalesces a publish into. The store
// schedules its rAF before this one, so by the time this resolves the flush ran.
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

describe('TranscriptStore chunk list', () => {
  it('publishes a fresh snapshot and notifies on the next frame', async () => {
    const store = new TranscriptStore()
    const listener = vi.fn()
    store.subscribeList(listener)
    const chunks = [chunk()]

    store.publishChunkList(chunks)
    expect(listener).not.toHaveBeenCalled() // coalesced to the next frame
    await nextFrame()

    expect(listener).toHaveBeenCalledTimes(1)
    const snapshot = store.getChunkList()
    expect(snapshot).toEqual(chunks)
    // A copy, so its identity changes even when the source array is mutated in
    // place -- that identity change is what re-renders the overlay.
    expect(snapshot).not.toBe(chunks)
  })

  it('coalesces multiple publishes in one frame, keeping the latest', async () => {
    const store = new TranscriptStore()
    const listener = vi.fn()
    store.subscribeList(listener)

    store.publishChunkList([chunk()])
    store.publishChunkList([chunk(), chunk()])
    await nextFrame()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getChunkList()).toHaveLength(2)
  })

  it('stops notifying after unsubscribe', async () => {
    const store = new TranscriptStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribeList(listener)

    unsubscribe()
    store.publishChunkList([chunk()])
    await nextFrame()

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('TranscriptStore per-chunk transcripts', () => {
  it("stores a transcript and notifies only that chunk's subscribers", () => {
    const store = new TranscriptStore()
    const a = chunk()
    const b = chunk()
    const onA = vi.fn()
    const onB = vi.fn()
    store.subscribeChunk(a, onA)
    store.subscribeChunk(b, onB)

    store.setTranscript(a, { small: { text: 'hello' } })

    expect(onA).toHaveBeenCalledTimes(1)
    expect(onB).not.toHaveBeenCalled()
    expect(store.getTranscript(a)).toEqual({ small: { text: 'hello' } })
    expect(store.getTranscript(b)).toBeUndefined()
  })

  it('returns a stable snapshot reference until the transcript changes', () => {
    const store = new TranscriptStore()
    const a = chunk()
    store.setTranscript(a, { small: { text: 'one' } })
    const first = store.getTranscript(a)
    expect(store.getTranscript(a)).toBe(first) // same ref -> no spurious re-render

    store.setTranscript(a, { small: { text: 'two' } })
    expect(store.getTranscript(a)).not.toBe(first)
  })

  it('stops notifying a chunk after unsubscribe', () => {
    const store = new TranscriptStore()
    const a = chunk()
    const onA = vi.fn()
    const unsubscribe = store.subscribeChunk(a, onA)

    unsubscribe()
    store.setTranscript(a, { small: { text: 'hello' } })

    expect(onA).not.toHaveBeenCalled()
  })

  it('supports multiple subscribers on the same chunk', () => {
    const store = new TranscriptStore()
    const a = chunk()
    const one = vi.fn()
    const two = vi.fn()
    store.subscribeChunk(a, one)
    store.subscribeChunk(a, two)

    store.setTranscript(a, { small: { text: 'hi' } })

    expect(one).toHaveBeenCalledTimes(1)
    expect(two).toHaveBeenCalledTimes(1)
  })
})

describe('TranscriptStore weight (spectral tilt via computeSpectralWeight)', () => {
  // A chunk on the shipping 2 ms / 20 Hz grid whose frames carry a
  // low-band-heavy spectrum, stored the way the frame builders store it
  // (pre-emphasized, quantized dB), so the derived weight is a plausible
  // negative alpha ratio.
  function weightChunk(pitchDetected: boolean): AnalysisChunk {
    const sampleRate = 48000
    const a = Math.exp((-2 * Math.PI * 50) / sampleRate)
    const spectrum = new Int8Array(275)
    for (let k = 0; k < 275; k++) {
      const freq = 10 + k * 20
      const gain =
        1 + a * a - 2 * a * Math.cos((2 * Math.PI * freq) / sampleRate)
      spectrum[k] = powerToInt8((freq < 1000 ? 1e-3 : 1e-5) * gain)
    }
    return {
      timeStepSamples: 96,
      sampleRate,
      freqStepHz: 20,
      firstBinHz: 10,
      startTimeSec: 0,
      frames: Array.from({ length: 10 }, () => ({
        pitchDetected,
        f0: pitchDetected ? 150 : 0,
        spectrum,
        rms: 0.0,
        speechDetected: false,
        f1: 0,
        f2: 0,
        f3: 0,
        lunaBrightness: 0,
        speechProbability: 0,
      })),
      voiced: true,
    }
  }

  it('derives a rounded negative weightDb from voiced frames', async () => {
    const store = new TranscriptStore()
    const c = weightChunk(true)
    store.publishChunkList([c])
    await nextFrame()
    // Band energies: 200 bins * 1e-5 over 48 bins * 1e-3 is
    // 10*log10(0.0417) ≈ -13.8, rounded to -14.
    expect(store.getDerived(c).weightDb).toBe(-14)
  })

  it('keeps the 0 sentinel when nothing is voiced', async () => {
    const store = new TranscriptStore()
    const c = weightChunk(false)
    store.publishChunkList([c])
    await nextFrame()
    expect(store.getDerived(c).weightDb).toBe(0)
  })
})
