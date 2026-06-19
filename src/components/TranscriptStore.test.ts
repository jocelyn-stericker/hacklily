// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { describe, it, expect, vi } from 'vitest'

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
  it('stores a transcript and notifies only that chunk’s subscribers', () => {
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
