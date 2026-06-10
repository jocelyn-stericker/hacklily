// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { SabRope } from '#/lib/audio/SabRope'

import {
  computeSealResolutions,
  priorityPickNext,
  reconcileLiveSpans,
} from './schedule'
import type { LiveSpanEntry, NeedsWork } from './schedule'

function chunk(opts: {
  frames: number
  timeStepSamples?: number
  sampleRate?: number
  voiced?: boolean
  recordingStart?: boolean
  startTimeSec?: number
}): AnalysisChunk {
  return {
    timeStepSamples: opts.timeStepSamples ?? 10,
    sampleRate: opts.sampleRate ?? 100,
    freqStepHz: 0,
    firstBinHz: 0,
    startTimeSec: opts.startTimeSec ?? 0,
    frames: Array.from({ length: opts.frames }),
    voiced: opts.voiced ?? true,
    recordingStart: opts.recordingStart,
  }
}

function rope(length: number, sampleRate = 100): SabRope {
  const r = new SabRope(sampleRate)
  if (length > 0) r.append(new Float32Array(length))
  return r
}

const all: NeedsWork = () => true
const none: NeedsWork = () => false

function span(): LiveSpanEntry {
  let resolveEndTime!: (n: number) => void
  const endTime = new Promise<number>((r) => {
    resolveEndTime = r
  })
  return { abortController: new AbortController(), endTime, resolveEndTime }
}

describe('priorityPickNext', () => {
  it('picks the earlier-ranked kind regardless of job order', () => {
    const c = chunk({ frames: 5 })
    const pick = priorityPickNext(['align', 'transcribe'])
    expect(
      pick(
        [
          { kind: 'transcribe', chunk: c },
          { kind: 'align', chunk: c },
        ],
        null,
      ),
    ).toEqual({ kind: 'align', chunk: c })
  })

  it('reorders by kindOrder', () => {
    const c = chunk({ frames: 5 })
    const pick = priorityPickNext(['transcribe', 'align'])
    expect(
      pick(
        [
          { kind: 'align', chunk: c },
          { kind: 'transcribe', chunk: c },
        ],
        null,
      ),
    ).toEqual({ kind: 'transcribe', chunk: c })
  })

  it('prefers a visible chunk, then earliest, within a kind', () => {
    const a = chunk({ frames: 10, startTimeSec: 0 }) // off-screen
    const b = chunk({ frames: 10, startTimeSec: 3 }) // on-screen
    const pick = priorityPickNext(['transcribe'])
    const jobs = [
      { kind: 'transcribe', chunk: a },
      { kind: 'transcribe', chunk: b },
    ]
    expect(pick(jobs, { leftSec: 3.2, rightSec: 3.8 })).toEqual({
      kind: 'transcribe',
      chunk: b,
    })
    expect(pick(jobs, { leftSec: 10, rightSec: 11 })).toEqual({
      kind: 'transcribe',
      chunk: a,
    })
  })

  it('lets kind rank outweigh viewport', () => {
    const a = chunk({ frames: 10, startTimeSec: 0 }) // off-screen
    const b = chunk({ frames: 10, startTimeSec: 3 }) // on-screen
    const pick = priorityPickNext(['align', 'transcribe'])
    // transcribe b is visible, align a isn't -- align still wins on kind rank.
    expect(
      pick(
        [
          { kind: 'transcribe', chunk: b },
          { kind: 'align', chunk: a },
        ],
        { leftSec: 3.2, rightSec: 3.8 },
      ),
    ).toEqual({ kind: 'align', chunk: a })
  })

  it('returns null when there is nothing to do', () => {
    expect(priorityPickNext(['transcribe'])([], null)).toBeNull()
  })
})

describe('reconcileLiveSpans', () => {
  it('creates spans for voiced chunks needing work while recording', () => {
    const voiced = chunk({ frames: 5, voiced: true })
    const unvoiced = chunk({ frames: 3, voiced: false })
    const result = reconcileLiveSpans(
      [voiced, unvoiced],
      new Map(),
      [rope(1000)],
      all,
    )
    expect(result.create).toEqual([voiced])
  })

  it('does not create spans once the rope is sealed', () => {
    const sealed = rope(1000)
    sealed.seal()
    const voiced = chunk({ frames: 5, voiced: true })
    const result = reconcileLiveSpans([voiced], new Map(), [sealed], all)
    expect(result.create).toHaveLength(0)
  })

  it('does not create a span for a chunk that no longer needs work', () => {
    const done = chunk({ frames: 5, voiced: true })
    const result = reconcileLiveSpans([done], new Map(), [rope(1000)], none)
    expect(result.create).toHaveLength(0)
  })

  it('aborts spans for chunks gone unvoiced or removed', () => {
    const nowUnvoiced = chunk({ frames: 5, voiced: false })
    const removed = chunk({ frames: 5, voiced: true })
    const liveSpans = new Map<AnalysisChunk, LiveSpanEntry>([
      [nowUnvoiced, span()],
      [removed, span()],
    ])
    const result = reconcileLiveSpans(
      [nowUnvoiced],
      liveSpans,
      [rope(1000)],
      all,
    )
    expect(result.abort.has(nowUnvoiced)).toBe(true)
    expect(result.abort.has(removed)).toBe(true)
  })

  it('resolves a span when its successor is unvoiced (segment ended)', () => {
    const voiced = chunk({ frames: 5, voiced: true })
    const unvoiced = chunk({ frames: 3, voiced: false })
    const s = span()
    const liveSpans = new Map([[voiced, s]])
    const result = reconcileLiveSpans(
      [voiced, unvoiced],
      liveSpans,
      [rope(1000)],
      all,
    )
    expect(result.resolve).toHaveLength(1)
    expect(result.resolve[0]!.chunk).toBe(voiced)
    expect(result.resolve[0]!.endTime).toBe(0.5) // 5 frames * 10 samples / 100 Hz
  })

  it('does not resolve while the chunk is still the last voiced one', () => {
    const voiced = chunk({ frames: 5, voiced: true })
    const liveSpans = new Map([[voiced, span()]])
    const result = reconcileLiveSpans([voiced], liveSpans, [rope(1000)], all)
    expect(result.resolve).toHaveLength(0)
  })
})

describe('computeSealResolutions', () => {
  it('resolves all pending spans, clamped to the rope length', () => {
    const c = chunk({ frames: 5, voiced: true })
    const s = span()
    const result = computeSealResolutions([c], new Map([[c, s]]), [rope(30)])
    expect(result).toHaveLength(1)
    expect(result[0]!.span).toBe(s)
    expect(result[0]!.endTime).toBe(0.3) // clamped to the 30 recorded samples
  })

  it('skips spans whose chunk is no longer present', () => {
    const orphan = chunk({ frames: 5, voiced: true })
    const present = chunk({ frames: 3, voiced: true })
    const result = computeSealResolutions(
      [present],
      new Map([[orphan, span()]]),
      [rope(100)],
    )
    expect(result).toHaveLength(0)
  })
})
