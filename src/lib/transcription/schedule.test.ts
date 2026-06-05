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

import { describe, it, expect } from 'vitest'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { SabRope } from '#/lib/audio/SabRope'

import type { ChunkTranscript } from './index'
import {
  computeSealResolutions,
  reconcileLiveSpans,
  selectNextChunk,
} from './schedule'
import type { LiveSpanEntry, TranscriptLookup } from './schedule'

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

// Build a lookup from a Map, defaulting to "nothing transcribed".
function lookup(
  map = new Map<AnalysisChunk, ChunkTranscript>(),
): TranscriptLookup {
  return (c) => map.get(c)
}

function span(): LiveSpanEntry {
  let resolveEndTime!: (n: number) => void
  const endTime = new Promise<number>((r) => {
    resolveEndTime = r
  })
  return { abortController: new AbortController(), endTime, resolveEndTime }
}

describe('selectNextChunk', () => {
  it('prefers a visible chunk over an earlier off-screen one', () => {
    const a = chunk({ frames: 10, startTimeSec: 0 }) // 0–1s, off-screen
    const b = chunk({ frames: 10, startTimeSec: 3 }) // 3–4s, on-screen
    const pick = selectNextChunk(
      [a, b],
      lookup(),
      new Set(),
      { leftSec: 3.2, rightSec: 3.8 },
      'small',
    )
    expect(pick).toBe(b)
  })

  it('falls back to the first eligible chunk when none are visible', () => {
    const a = chunk({ frames: 10, startTimeSec: 0 })
    const b = chunk({ frames: 10, startTimeSec: 3 })
    const pick = selectNextChunk(
      [a, b],
      lookup(),
      new Set(),
      { leftSec: 10, rightSec: 11 },
      'small',
    )
    expect(pick).toBe(a)
  })

  it('skips unvoiced, attempted, done, and in-flight chunks', () => {
    const unvoiced = chunk({ frames: 5, voiced: false })
    const attempted = chunk({ frames: 5 })
    const done = chunk({ frames: 5 })
    const running = chunk({ frames: 5 })
    const target = chunk({ frames: 5 })
    const map = new Map<AnalysisChunk, ChunkTranscript>([
      [done, { results: { small: 'hi' } }],
      [
        running,
        { results: {}, job: { tier: 'small', status: 'transcribing' } },
      ],
    ])
    const pick = selectNextChunk(
      [unvoiced, attempted, done, running, target],
      lookup(map),
      new Set([attempted]),
      null,
      'small',
    )
    expect(pick).toBe(target)
  })

  it('re-selects a chunk whose only result is at a different tier', () => {
    const c = chunk({ frames: 5 })
    const map = new Map<AnalysisChunk, ChunkTranscript>([
      [c, { results: { small: 'hi' } }],
    ])
    expect(selectNextChunk([c], lookup(map), new Set(), null, 'large')).toBe(c)
    expect(
      selectNextChunk([c], lookup(map), new Set(), null, 'small'),
    ).toBeNull()
  })

  it('re-selects a chunk whose last job errored', () => {
    const c = chunk({ frames: 5 })
    const map = new Map<AnalysisChunk, ChunkTranscript>([
      [c, { results: {}, job: { tier: 'small', status: 'error', error: 'x' } }],
    ])
    expect(selectNextChunk([c], lookup(map), new Set(), null, 'small')).toBe(c)
  })
})

describe('reconcileLiveSpans', () => {
  it('creates spans for voiced, untranscribed chunks while recording', () => {
    const voiced = chunk({ frames: 5, voiced: true })
    const unvoiced = chunk({ frames: 3, voiced: false })
    const result = reconcileLiveSpans(
      [voiced, unvoiced],
      new Map(),
      [rope(1000)],
      lookup(),
      'small',
    )
    expect(result.create).toEqual([voiced])
  })

  it('does not create spans once the rope is sealed', () => {
    const sealed = rope(1000)
    sealed.seal()
    const voiced = chunk({ frames: 5, voiced: true })
    const result = reconcileLiveSpans(
      [voiced],
      new Map(),
      [sealed],
      lookup(),
      'small',
    )
    expect(result.create).toHaveLength(0)
  })

  it('does not recreate a span for a chunk already done at the tier', () => {
    const done = chunk({ frames: 5, voiced: true })
    const map = new Map<AnalysisChunk, ChunkTranscript>([
      [done, { results: { small: 'hi' } }],
    ])
    const result = reconcileLiveSpans(
      [done],
      new Map(),
      [rope(1000)],
      lookup(map),
      'small',
    )
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
      lookup(),
      'small',
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
      lookup(),
      'small',
    )
    expect(result.resolve).toHaveLength(1)
    expect(result.resolve[0]!.chunk).toBe(voiced)
    expect(result.resolve[0]!.endTime).toBe(0.5) // 5 frames * 10 samples / 100 Hz
  })

  it('does not resolve while the chunk is still the last voiced one', () => {
    const voiced = chunk({ frames: 5, voiced: true })
    const liveSpans = new Map([[voiced, span()]])
    const result = reconcileLiveSpans(
      [voiced],
      liveSpans,
      [rope(1000)],
      lookup(),
      'small',
    )
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
