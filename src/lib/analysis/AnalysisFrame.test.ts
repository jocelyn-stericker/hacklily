// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import type { AnalysisChunk, AnalysisFrame } from './AnalysisFrame'
import {
  appendFrame,
  computeDbMax,
  frameTimeSec,
  framesToChunks,
  framesVoiced,
  mergeChunkAt,
  reconcileVoicingAt,
  totalFrames,
  getFrame,
  frameDbMax,
} from './AnalysisFrame'

const DEFAULT_PARAMS = {
  timeStepSamples: 882,
  sampleRate: 44100,
  freqStepHz: 20,
  firstBinHz: 0,
}

function makeChunk(frames: AnalysisFrame[], startTimeSec = 0): AnalysisChunk {
  return {
    ...DEFAULT_PARAMS,
    frames,
    startTimeSec,
    voiced: framesVoiced(frames),
  }
}

function makeFrame(
  spectrum: Float32Array,
  overrides: Partial<AnalysisFrame> = {},
): AnalysisFrame {
  return {
    pitchDetected: false,
    speechDetected: false,
    f0: 0,
    f1: null,
    f2: null,
    f3: null,
    lunaBrightness: null,
    rms: 0,
    speechProbability: 0,
    spectrum,
    ...overrides,
  }
}

describe('computeDbMax', () => {
  describe('basic dB conversion', () => {
    it('converts spectrum values to dB correctly', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([1.0]))]),
      ])
      expect(result).toBeCloseTo(0, 2)
    })

    it('converts power values using correct formula', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([100.0]))]),
      ])
      expect(result).toBeCloseTo(20, 1)
    })
  })

  describe('edge cases', () => {
    it('returns null for empty frames array', () => {
      const result = computeDbMax([])
      expect(result).toBeNull()
    })

    it('returns null when all spectrum values are zero or negative', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([0, -1, -100]))]),
      ])
      expect(result).toBeNull()
    })

    it('ignores zero and negative values in spectrum', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([1.0, 0, -5, 10.0, -0.5]))]),
      ])
      expect(result).toBeCloseTo(10, 1)
    })

    it('handles single frame with no valid spectrum values', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([0, 0, 0]))]),
      ])
      expect(result).toBeNull()
    })
  })

  describe('range specification', () => {
    it('respects from and to range parameters', () => {
      const chunk = makeChunk([
        makeFrame(new Float32Array([1.0])),
        makeFrame(new Float32Array([100.0])),
        makeFrame(new Float32Array([1000.0])),
      ])
      const result = computeDbMax([chunk], 1, 2)
      expect(result).toBeCloseTo(20, 1)
    })

    it('handles from=to (empty range)', () => {
      const result = computeDbMax(
        [makeChunk([makeFrame(new Float32Array([100.0]))])],
        0,
        0,
      )
      expect(result).toBeNull()
    })

    it('processes multiple frames with varying spectrum values', () => {
      const frames = Array.from({ length: 10 }, (_, i) =>
        makeFrame(new Float32Array([10 ** (i / 10)])),
      )
      const result = computeDbMax([makeChunk(frames)])
      expect(result).not.toBeNull()
      expect(isFinite(result!)).toBe(true)
    })
  })

  describe('voiced and unvoiced frames', () => {
    it('processes both voiced and unvoiced frames equally', () => {
      const spectrum = new Float32Array([50.0])
      const voicedFrame = makeFrame(spectrum, {
        pitchDetected: true,
        speechDetected: true,
        rms: 0.5,
        f0: 200,
        f1: 700,
        f2: 1200,
        f3: 2500,
      })
      const unvoicedFrame = makeFrame(spectrum, { rms: 0.3 })

      const voicedResult = computeDbMax([makeChunk([voicedFrame])])
      const unvoicedResult = computeDbMax([makeChunk([unvoicedFrame])])

      expect(voicedResult).toBeCloseTo(unvoicedResult ?? 0, 2)
    })
  })

  describe('numerical edge cases', () => {
    it('handles very large spectrum values', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([1e10]))]),
      ])
      expect(result).not.toBeNull()
      expect(isFinite(result!)).toBe(true)
    })

    it('handles mixed positive and negative values (ignoring negatives)', () => {
      const result = computeDbMax([
        makeChunk([makeFrame(new Float32Array([0.1, -10, 10, -100, 100]))]),
      ])
      expect(result).toBeCloseTo(20, 1)
    })
  })
})

// timeStepSec = 882 / 44100 = 0.02s per frame
const STEP = DEFAULT_PARAMS.timeStepSamples / DEFAULT_PARAMS.sampleRate

describe('frameTimeSec', () => {
  const empty = makeFrame(new Float32Array(1))

  it('returns 0 for empty chunks array', () => {
    expect(frameTimeSec([], 0)).toBe(0)
  })

  it('returns correct time for first frame of single chunk', () => {
    const chunk = makeChunk([empty, empty, empty], 0)
    expect(frameTimeSec([chunk], 0)).toBeCloseTo(0)
  })

  it('returns correct time for a mid-chunk frame', () => {
    const chunk = makeChunk([empty, empty, empty], 5)
    expect(frameTimeSec([chunk], 2)).toBeCloseTo(5 + 2 * STEP)
  })

  it('returns end-of-chunk time when index equals chunk length (boundary falls to next chunk)', () => {
    const chunk0 = makeChunk([empty, empty], 0)
    const chunk1 = makeChunk([empty, empty], 2 * STEP)
    // globalIndex 2 == end of chunk0 == start of chunk1
    expect(frameTimeSec([chunk0, chunk1], 2)).toBeCloseTo(2 * STEP)
  })

  it('correctly indexes into second chunk', () => {
    const chunk0 = makeChunk([empty, empty], 0)
    const chunk1 = makeChunk([empty, empty], 2 * STEP)
    expect(frameTimeSec([chunk0, chunk1], 3)).toBeCloseTo(2 * STEP + 1 * STEP)
  })

  it('returns total duration when index is past all frames', () => {
    const chunk = makeChunk([empty, empty], 0)
    expect(frameTimeSec([chunk], 10)).toBeCloseTo(2 * STEP)
  })
})

describe('totalFrames', () => {
  const emptyFrame = makeFrame(new Float32Array(1))

  it('returns 0 for empty chunks array', () => {
    expect(totalFrames([])).toBe(0)
  })

  it('returns frame count for single chunk', () => {
    const chunk = makeChunk([emptyFrame, emptyFrame, emptyFrame])
    expect(totalFrames([chunk])).toBe(3)
  })

  it('sums frames across multiple chunks', () => {
    const chunk1 = makeChunk([emptyFrame, emptyFrame])
    const chunk2 = makeChunk([emptyFrame, emptyFrame, emptyFrame])
    const chunk3 = makeChunk([emptyFrame])
    expect(totalFrames([chunk1, chunk2, chunk3])).toBe(6)
  })
})

describe('getFrame', () => {
  const f1 = makeFrame(new Float32Array([1]))
  const f2 = makeFrame(new Float32Array([2]))
  const f3 = makeFrame(new Float32Array([3]))
  const f4 = makeFrame(new Float32Array([4]))
  const f5 = makeFrame(new Float32Array([5]))

  it('returns undefined for empty chunks', () => {
    expect(getFrame([], 0)).toBeUndefined()
  })

  it('returns first frame from first chunk', () => {
    const chunk = makeChunk([f1, f2, f3])
    const frame = getFrame([chunk], 0)
    expect(frame?.spectrum[0]).toBe(1)
  })

  it('returns frame within single chunk', () => {
    const chunk = makeChunk([f1, f2, f3])
    const frame = getFrame([chunk], 2)
    expect(frame?.spectrum[0]).toBe(3)
  })

  it('returns undefined for index past all frames', () => {
    const chunk = makeChunk([f1, f2])
    expect(getFrame([chunk], 10)).toBeUndefined()
  })

  it('spans multiple chunks correctly', () => {
    const chunk1 = makeChunk([f1, f2])
    const chunk2 = makeChunk([f3, f4, f5])
    expect(getFrame([chunk1, chunk2], 0)?.spectrum[0]).toBe(1)
    expect(getFrame([chunk1, chunk2], 1)?.spectrum[0]).toBe(2)
    expect(getFrame([chunk1, chunk2], 2)?.spectrum[0]).toBe(3)
    expect(getFrame([chunk1, chunk2], 4)?.spectrum[0]).toBe(5)
  })

  it('returns undefined when index exceeds all frames across chunks', () => {
    const chunk1 = makeChunk([f1, f2])
    const chunk2 = makeChunk([f3])
    expect(getFrame([chunk1, chunk2], 5)).toBeUndefined()
  })
})

describe('frameDbMax', () => {
  it('returns null for frame with no positive spectrum values', () => {
    const frame = makeFrame(new Float32Array([0, -1, -100]))
    expect(frameDbMax(frame)).toBeNull()
  })

  it('converts single value to dB correctly', () => {
    const frame = makeFrame(new Float32Array([1.0]))
    expect(frameDbMax(frame)).toBeCloseTo(0, 2)
  })

  it('finds maximum dB value among positive spectrum values', () => {
    const frame = makeFrame(new Float32Array([1.0, 10.0, 100.0, 5.0]))
    expect(frameDbMax(frame)).toBeCloseTo(10 * Math.log10(100.0), 1)
  })

  it('ignores zero and negative values', () => {
    const frame = makeFrame(new Float32Array([0.1, 0, -5, 10.0, -100, 1.0]))
    expect(frameDbMax(frame)).toBeCloseTo(10 * Math.log10(10.0), 1)
  })

  it('handles very small positive values', () => {
    const frame = makeFrame(new Float32Array([0.00001]))
    expect(frameDbMax(frame)).toBeLessThan(0)
  })

  it('handles very large values', () => {
    const frame = makeFrame(new Float32Array([1e10]))
    const result = frameDbMax(frame)
    expect(result).not.toBeNull()
    expect(isFinite(result!)).toBe(true)
    expect(result).toBeGreaterThan(50)
  })
})

// Build an invariant-correct chunk list from a voicing pattern.
function voicePattern(values: boolean[]): AnalysisChunk[] {
  const frames = values.map((v) =>
    makeFrame(new Float32Array([1]), { speechDetected: v }),
  )
  return framesToChunks(frames, DEFAULT_PARAMS, 0)
}

// Flatten the per-frame speechDetected stream across chunks.
function voicing(chunks: AnalysisChunk[]): (boolean | null)[] {
  return chunks.flatMap((c) => c.frames.map((f) => f.speechDetected))
}

// Assert both chunk invariants hold and that the list is fully coalesced
// (adjacent chunks always differ in voicing -- no redundant fragmentation).
function expectInvariants(chunks: AnalysisChunk[]): void {
  for (const chunk of chunks) {
    expect(chunk.frames.length).toBeGreaterThan(0)
    for (const frame of chunk.frames) {
      expect(frame.speechDetected).toBe(chunk.voiced)
    }
    expect(framesVoiced(chunk.frames)).toBe(chunk.voiced)
  }
  for (let i = 1; i < chunks.length; i++) {
    expect(chunks[i]!.voiced).not.toBe(chunks[i - 1]!.voiced)
  }
}

// Set the frame at globalIndex's voicing and reconcile, as a VAD patch would.
function flip(
  chunks: AnalysisChunk[],
  globalIndex: number,
  value: boolean,
): boolean {
  getFrame(chunks, globalIndex)!.speechDetected = value
  return reconcileVoicingAt(chunks, globalIndex)
}

describe('framesToChunks', () => {
  it('returns no chunks for an empty frame list', () => {
    expect(framesToChunks([], DEFAULT_PARAMS, 0)).toEqual([])
  })

  it('groups a uniform stream into a single chunk', () => {
    const chunks = voicePattern([false, false, false])
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.voiced).toBe(false)
    expect(chunks[0]!.frames).toHaveLength(3)
    expect(chunks[0]!.startTimeSec).toBe(0)
    expectInvariants(chunks)
  })

  it('splits at every voicing transition with aligned start times', () => {
    const chunks = voicePattern([false, false, true, true, true, false])
    expect(chunks.map((c) => c.voiced)).toEqual([false, true, false])
    expect(chunks.map((c) => c.frames.length)).toEqual([2, 3, 1])
    expect(chunks.map((c) => c.startTimeSec)).toEqual([0, 2 * STEP, 5 * STEP])
    expectInvariants(chunks)
  })
})

describe('reconcileVoicingAt', () => {
  it('is a no-op (returns false) when the frame did not change voicing', () => {
    const chunks = voicePattern([true, true, true])
    expect(flip(chunks, 1, true)).toBe(false)
    expect(chunks).toHaveLength(1)
    expectInvariants(chunks)
  })

  it('isolates a frame flipped inside a uniform chunk', () => {
    const chunks = voicePattern([false, false, false, false, false])
    expect(flip(chunks, 2, true)).toBe(true)
    expect(voicing(chunks)).toEqual([false, false, true, false, false])
    expect(chunks.map((c) => c.frames.length)).toEqual([2, 1, 2])
    expectInvariants(chunks)
  })

  it('merges back to one chunk when the flip is undone', () => {
    const chunks = voicePattern([false, false, false, false, false])
    flip(chunks, 2, true)
    expect(flip(chunks, 2, false)).toBe(true)
    expect(chunks).toHaveLength(1)
    expect(voicing(chunks)).toEqual([false, false, false, false, false])
    expectInvariants(chunks)
  })

  it('coalesces a redemption-style tail reverted frame by frame', () => {
    // Whole stream optimistically voiced, then the trailing half reverts to
    // silence one frame at a time (increasing index), as the gate emits it.
    const chunks = voicePattern(Array(8).fill(true))
    for (let i = 4; i < 8; i++) flip(chunks, i, false)
    expect(chunks.map((c) => c.voiced)).toEqual([true, false])
    expect(chunks.map((c) => c.frames.length)).toEqual([4, 4])
    expectInvariants(chunks)
  })

  it('coalesces an onset run marked voiced frame by frame', () => {
    const chunks = voicePattern(Array(8).fill(false))
    for (let i = 2; i < 6; i++) flip(chunks, i, true)
    expect(chunks.map((c) => c.voiced)).toEqual([false, true, false])
    expect(chunks.map((c) => c.frames.length)).toEqual([2, 4, 2])
    expectInvariants(chunks)
  })
})

// Variant helpers for the nullable (pending) world.
function voicePatternNullable(values: (boolean | null)[]): AnalysisChunk[] {
  const frames = values.map((v) =>
    makeFrame(new Float32Array([1]), { speechDetected: v }),
  )
  return framesToChunks(frames, DEFAULT_PARAMS, 0)
}

// Apply a nullable patch and reconcile, as a VAD update would once a frame's
// speechDetected becomes known.
function flipNullable(
  chunks: AnalysisChunk[],
  globalIndex: number,
  value: boolean | null,
): boolean {
  getFrame(chunks, globalIndex)!.speechDetected = value
  return reconcileVoicingAt(chunks, globalIndex)
}

// In the realtime path handleAppend sets the last chunk's voiced to null when
// a pending frame lands in it. The offline builder leaves voiced at the first
// frame's value, so mark those chunks here to model the realtime state.
function markPendingChunks(chunks: AnalysisChunk[]): void {
  for (const chunk of chunks) {
    if (chunk.frames.some((f) => f.speechDetected === null)) {
      chunk.voiced = null
    }
  }
}

describe('reconcileVoicingAt with pending frames', () => {
  it('is a no-op when a trailing frame is still pending', () => {
    // A trailing null frame matches the chunk's pending voiced flag, so the
    // patch didn't flip anything -- nothing to do.
    const chunks = voicePatternNullable([true, true, null])
    markPendingChunks(chunks)
    expect(reconcileVoicingAt(chunks, 2)).toBe(false)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.voiced).toBe(null)
  })

  it('un-pends the chunk when a trailing frame resolves to its value', () => {
    // The trailing null resolves to the chunk's confirmed value: it should
    // coalesce in place, with voiced transitioning from null to true.
    const chunks = voicePatternNullable([true, true, null])
    markPendingChunks(chunks)
    expect(flipNullable(chunks, 2, true)).toBe(false)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.voiced).toBe(true)
  })

  it('splits off a trailing frame that resolves to a different value', () => {
    // The trailing null resolves to the opposite value: it should split off as
    // a new last chunk, with the original chunk un-pending to true.
    const chunks = voicePatternNullable([true, true, null])
    markPendingChunks(chunks)
    expect(flipNullable(chunks, 2, false)).toBe(true)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]!.voiced).toBe(true)
    expect(chunks[0]!.frames.length).toBe(2)
    expect(chunks[1]!.voiced).toBe(false)
    expect(chunks[1]!.frames.length).toBe(1)
  })

  it('leaves a frame reverting to pending in place', () => {
    // A confirmed middle frame going null can't happen in the real pipeline
    // (the VAD only ever resolves pending frames, never un-resolves them), so
    // reconcile treats it as a no-op rather than reordering the timeline: the
    // frame stays where it is, grouped with its chunk.
    const chunks = voicePattern([true, true, true, true])
    expect(flipNullable(chunks, 1, null)).toBe(false)
    expect(chunks).toHaveLength(1)
    expect(getFrame(chunks, 1)!.speechDetected).toBe(null)
    expect(voicing(chunks)).toEqual([true, null, true, true])
  })

  it('never leaves a pending frame as the only frame of its chunk', () => {
    // A no-op on pending never splits a null off, so it can't be stranded as a
    // chunk of its own -- it always stays grouped with its neighbours.
    const chunks = voicePattern([true, true, true, true])
    flipNullable(chunks, 1, null)
    for (const chunk of chunks) {
      if (chunk.frames.some((f) => f.speechDetected === null)) {
        expect(chunk.frames.length).toBeGreaterThan(1)
      }
    }
  })
})

describe('appendFrame', () => {
  it('splits a voiced frame off the end of an unvoiced chunk', () => {
    // A frame that arrives already voiced must start its own chunk, not flip the
    // whole preceding unvoiced run to voiced. The legacy `||=` absorbed it:
    // `false || true === true` voiced every prior frame with no split.
    const chunks = voicePattern([false, false])
    appendFrame(
      chunks,
      makeFrame(new Float32Array([1]), { speechDetected: true }),
    )
    expect(chunks.map((c) => c.voiced)).toEqual([false, true])
    expect(chunks.map((c) => c.frames.length)).toEqual([2, 1])
    expectInvariants(chunks)
  })

  it('splits an unvoiced frame off the end of a voiced chunk', () => {
    // The symmetric case: a frame that arrives unvoiced after a voiced run must
    // split rather than be absorbed. The legacy `||=` left it voiced:
    // `true || false === true`.
    const chunks = voicePattern([true, true])
    appendFrame(
      chunks,
      makeFrame(new Float32Array([1]), { speechDetected: false }),
    )
    expect(chunks.map((c) => c.voiced)).toEqual([true, false])
    expect(chunks.map((c) => c.frames.length)).toEqual([2, 1])
    expectInvariants(chunks)
  })

  it('leaves the last chunk voicing unchanged when a pending frame is appended', () => {
    // A pending (null) frame optimistically continues the current run: we keep
    // calling the chunk by its existing voicing to avoid flicker, and split only
    // later if the VAD resolves the frame to the opposite value. So voiced is
    // unchanged either way. The legacy `||=` got the voiced case right
    // (`true || null === true`) but nulled an unvoiced chunk
    // (`false || null === null`).
    const onVoiced = voicePattern([true, true])
    appendFrame(
      onVoiced,
      makeFrame(new Float32Array([1]), { speechDetected: null }),
    )
    expect(onVoiced.at(-1)!.voiced).toBe(true)

    const onUnvoiced = voicePattern([false, false])
    appendFrame(
      onUnvoiced,
      makeFrame(new Float32Array([1]), { speechDetected: null }),
    )
    expect(onUnvoiced.at(-1)!.voiced).toBe(false)
  })
})

describe('mergeChunkAt', () => {
  it('merges the chunk starting at globalIndex into the previous one', () => {
    const a = makeChunk([makeFrame(new Float32Array([1]))], 0)
    const b = makeChunk([makeFrame(new Float32Array([2]))], STEP)
    const chunks = [a, b]
    expect(mergeChunkAt(chunks, 1)).toBe(true)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.frames).toHaveLength(2)
    expect(chunks[0]!.startTimeSec).toBe(0)
  })

  it('is a no-op when no chunk starts at globalIndex', () => {
    const chunks = [makeChunk([makeFrame(new Float32Array([1]))])]
    expect(mergeChunkAt(chunks, 1)).toBe(false)
    expect(chunks).toHaveLength(1)
  })

  it('refuses to merge across a differing time base', () => {
    const a = makeChunk([makeFrame(new Float32Array([1]))], 0)
    const b: AnalysisChunk = {
      ...DEFAULT_PARAMS,
      timeStepSamples: DEFAULT_PARAMS.timeStepSamples * 2,
      frames: [makeFrame(new Float32Array([2]))],
      startTimeSec: STEP,
      voiced: false,
    }
    const chunks = [a, b]
    expect(mergeChunkAt(chunks, 1)).toBe(false)
    expect(chunks).toHaveLength(2)
  })

  it('refuses to merge a chunk that starts a recording', () => {
    const a = makeChunk([makeFrame(new Float32Array([1]))], 0)
    const b = makeChunk([makeFrame(new Float32Array([2]))], STEP)
    b.recordingStart = true
    const chunks = [a, b]
    expect(mergeChunkAt(chunks, 1)).toBe(false)
    expect(chunks).toHaveLength(2)
  })
})

describe('reconcileVoicingAt across recording boundaries', () => {
  const voiced = (v: boolean) =>
    makeFrame(new Float32Array([1]), { speechDetected: v })

  it('never merges a flipped boundary frame into the previous recording', () => {
    // Recording A: two silent frames. Recording B: two voiced frames, marked as
    // a new recording (own sample rate / dB normalization).
    const a = makeChunk([voiced(false), voiced(false)], 0)
    const b = makeChunk([voiced(true), voiced(true)], 2 * STEP)
    b.recordingStart = true
    const chunks = [a, b]

    // B's first frame reverts to silence -- it now matches A's last frame, but
    // the recording boundary must keep them in separate chunks.
    expect(flip(chunks, 2, false)).toBe(true)
    expect(voicing(chunks)).toEqual([false, false, false, true])
    expect(chunks).toHaveLength(3)

    // Each chunk is still internally uniform, and the boundary chunk is intact.
    for (const chunk of chunks) {
      for (const frame of chunk.frames) {
        expect(frame.speechDetected).toBe(chunk.voiced)
      }
    }
    const boundary = chunks.find((c) => c.recordingStart)!
    expect(boundary.frames).toHaveLength(1)
    expect(boundary.voiced).toBe(false)
  })
})
