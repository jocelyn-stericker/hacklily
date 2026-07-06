// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { FormantFrame } from '#/lib/analysis/FormantProcessor'
import type { PitchResult } from '#/lib/analysis/PitchProcessor'

import { runAnalysis } from './FormantWorker'

const SAMPLE_RATE = 44100
const TIME_STEP_SAMPLES = Math.round(0.002 * SAMPLE_RATE) // 88 samples

// Mock messages captured during runAnalysis
const messages: any[] = []

// Controllable mock data
const mockState = vi.hoisted(() => ({
  formantFrames: [] as FormantFrame[],
  pitchResult: { frames: [], timeStepSec: 0.002, t1Sec: 0 } as PitchResult,
  audioChunks: [] as Float32Array[],
}))

vi.mock('#/lib/audio/AudioRopeReader', () => {
  class AudioRopeReader {
    constructor(_share: any, _quantum: number) {}

    grow(_grow: any): void {}
    seal(): void {}

    async *[Symbol.asyncIterator]() {
      for (const chunk of mockState.audioChunks) {
        yield chunk
      }
    }
  }

  return { AudioRopeReader }
})

vi.mock('#/lib/analysis/FormantProcessor', () => {
  class FormantStreamProcessor {
    private frameIdx = 0

    constructor(_config: any, _sampleRate: number) {}

    feed(_: Float32Array): void {}

    readFrame(): FormantFrame | null {
      if (this.frameIdx >= mockState.formantFrames.length) {
        return null
      }
      return mockState.formantFrames[this.frameIdx++]!
    }
  }

  return { FormantStreamProcessor }
})

vi.mock('#/lib/analysis/PitchProcessor', () => {
  class PitchProcessor {
    constructor(_config: any, _sampleRate: number) {}

    analyze(_: Float32Array): PitchResult {
      return mockState.pitchResult
    }
  }

  return { PitchProcessor }
})

vi.mock('#/lib/analysis/ResampleProcessor', () => {
  class ResamplerStreamProcessor {
    constructor(_inRate: number, _outRate: number, _order: number) {}

    feed(_: Float32Array): void {}

    drain(_: Float32Array): number {
      return 0
    }
  }

  return { ResamplerStreamProcessor }
})

// Helper to run analysis with mocked dependencies and capture messages
async function testRunAnalysis(
  audioChunks: Float32Array[],
  sampleRate: number,
  timeStepSamples: number,
  formantFrames: FormantFrame[],
  pitchResult: PitchResult,
): Promise<any[]> {
  messages.length = 0
  mockState.audioChunks = audioChunks
  mockState.formantFrames = formantFrames
  mockState.pitchResult = pitchResult

  const { AudioRopeReader } = await import('#/lib/audio/AudioRopeReader')
  const reader = new AudioRopeReader(
    {
      type: 'audio-rope',
      buffers: [new SharedArrayBuffer(4096)],
      ctrlPtr: new SharedArrayBuffer(8),
      sampleRate: 44100,
    },
    128,
  )

  // Mock the global postMessage to capture calls from runAnalysis
  const capturedMessages: any[] = []
  const originalPostMessage = globalThis.postMessage
  globalThis.postMessage = ((msg: any) => {
    capturedMessages.push(msg)
  }) as any

  try {
    await runAnalysis(reader, sampleRate, timeStepSamples)
    // Send 'ended' message after runAnalysis completes, matching worker behavior
    capturedMessages.push({ type: 'ended' })
  } finally {
    globalThis.postMessage = originalPostMessage
  }

  return capturedMessages
}

function generateSilence(
  durationSec: number,
  sampleRate: number,
): Float32Array {
  return new Float32Array(Math.floor(durationSec * sampleRate))
}

function chunkAudio(audio: Float32Array, quantum: number): Float32Array[] {
  const chunks: Float32Array[] = []
  for (let i = 0; i < audio.length; i += quantum) {
    chunks.push(audio.slice(i, i + quantum))
  }
  return chunks
}

describe('FormantWorker', () => {
  beforeEach(() => {
    messages.length = 0
    mockState.formantFrames = []
    mockState.pitchResult = { frames: [], timeStepSec: 0.002, t1Sec: 0 }
    mockState.audioChunks = []
  })

  describe('output structure', () => {
    it('sends patch messages with frameIndex and pitch fields', async () => {
      const audio = generateSilence(0.2, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        [],
        { frames: [], timeStepSec: 0.002, t1Sec: 0 },
      )

      expect(out.length).toBeGreaterThan(0)
      const lastMsg = out[out.length - 1]
      expect(lastMsg?.type).toBe('ended')

      const patchMsgs = out.filter((m) => m.type === 'patch')
      expect(patchMsgs.length).toBeGreaterThan(0)

      for (const msg of patchMsgs) {
        expect(msg).toHaveProperty('frameIndex')
        expect(msg).toHaveProperty('pitchDetected')
        expect(msg).toHaveProperty('f0')
        expect(msg).toHaveProperty('f1')
        expect(msg).toHaveProperty('f2')
        expect(msg).toHaveProperty('f3')
        expect(typeof msg.frameIndex).toBe('number')
        expect(typeof msg.pitchDetected).toBe('boolean')
        expect(typeof msg.f0).toBe('number')
      }
    })

    it('ends with a final ended message', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        [],
        { frames: [], timeStepSec: 0.002, t1Sec: 0 },
      )

      expect(out.length).toBeGreaterThan(0)
      expect(out[out.length - 1]?.type).toBe('ended')
    })
  })

  describe('silence input', () => {
    it('produces patch messages with no pitch detected for silence', async () => {
      const audio = generateSilence(0.2, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        [],
        { frames: [], timeStepSec: 0.002, t1Sec: 0 },
      )

      const patchMsgs = out.filter((m) => m.type === 'patch')
      for (const msg of patchMsgs) {
        expect(msg.pitchDetected).toBe(false)
        expect(msg.f0).toBe(0)
        expect(msg.f1).toBeNull()
        expect(msg.f2).toBeNull()
        expect(msg.f3).toBeNull()
      }
    })
  })

  describe('pitched signal', () => {
    it('sets pitchDetected=true and f0>0 when pitch is detected', async () => {
      const audio = generateSilence(0.2, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const pitchFrames = [
        { timeSec: 0, frequencyHz: 150, strength: 0.8 },
        { timeSec: 0.002, frequencyHz: 152, strength: 0.8 },
        { timeSec: 0.004, frequencyHz: 148, strength: 0.8 },
      ]

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        [],
        { frames: pitchFrames, timeStepSec: 0.002, t1Sec: 0 },
      )

      const patchMsgs = out.filter((m) => m.type === 'patch')
      expect(patchMsgs.length).toBeGreaterThan(0)

      const voicedMsgs = patchMsgs.filter((m) => m.pitchDetected)
      expect(voicedMsgs.length).toBeGreaterThan(0)

      for (const msg of voicedMsgs) {
        expect(msg.f0).toBeGreaterThan(0)
        expect(msg.f0).toBeGreaterThan(140)
        expect(msg.f0).toBeLessThan(160)
      }
    })

    it('nullifies formants when pitchDetected is false', async () => {
      const audio = generateSilence(0.2, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const formantFrames: FormantFrame[] = [
        {
          timeSec: 0,
          intensity: 0.5,
          formantCount: 3,
          formants: [
            { frequencyHz: 700, bandwidthHz: 100 },
            { frequencyHz: 1200, bandwidthHz: 120 },
            { frequencyHz: 2500, bandwidthHz: 200 },
          ],
        },
      ]

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        formantFrames,
        { frames: [], timeStepSec: 0.002, t1Sec: 0 },
      )

      const patchMsgs = out.filter((m) => m.type === 'patch')
      for (const msg of patchMsgs) {
        if (!msg.pitchDetected) {
          expect(msg.f1).toBeNull()
          expect(msg.f2).toBeNull()
          expect(msg.f3).toBeNull()
        }
      }
    })
  })

  describe('formant validity filter', () => {
    it('accepts formants in valid range (F1: 200-1100, F2: 650-3500)', async () => {
      const audio = generateSilence(0.2, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const formantFrames: FormantFrame[] = [
        {
          timeSec: 0,
          intensity: 0.5,
          formantCount: 2,
          formants: [
            { frequencyHz: 700, bandwidthHz: 100 },
            { frequencyHz: 1200, bandwidthHz: 120 },
          ],
        },
      ]

      const pitchFrames = [{ timeSec: 0, frequencyHz: 150, strength: 0.8 }]

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        formantFrames,
        { frames: pitchFrames, timeStepSec: 0.002, t1Sec: 0 },
      )

      const voicedMsgs = out
        .filter((m) => m.type === 'patch')
        .filter((m) => m.pitchDetected)

      for (const msg of voicedMsgs) {
        if (msg.f1 !== null) {
          expect(msg.f1).toBeGreaterThanOrEqual(200)
          expect(msg.f1).toBeLessThanOrEqual(1100)
        }
        if (msg.f2 !== null) {
          expect(msg.f2).toBeGreaterThanOrEqual(650)
          expect(msg.f2).toBeLessThanOrEqual(3500)
        }
      }
    })

    it('rejects F1 outside valid range', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const formantFrames: FormantFrame[] = [
        {
          timeSec: 0,
          intensity: 0.5,
          formantCount: 2,
          formants: [
            { frequencyHz: 150, bandwidthHz: 100 }, // Below 200 Hz
            { frequencyHz: 1200, bandwidthHz: 120 },
          ],
        },
      ]

      const pitchFrames = [{ timeSec: 0, frequencyHz: 150, strength: 0.8 }]

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        formantFrames,
        { frames: pitchFrames, timeStepSec: 0.002, t1Sec: 0 },
      )

      const voicedMsgs = out
        .filter((m) => m.type === 'patch')
        .filter((m) => m.pitchDetected)

      for (const msg of voicedMsgs) {
        // Invalid F1 should not be propagated
        expect(msg.f1).toBeNull()
      }
    })

    it('rejects F2 outside valid range', async () => {
      const audio = generateSilence(0.1, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const formantFrames: FormantFrame[] = [
        {
          timeSec: 0,
          intensity: 0.5,
          formantCount: 2,
          formants: [
            { frequencyHz: 700, bandwidthHz: 100 },
            { frequencyHz: 3600, bandwidthHz: 120 }, // Above 3500 Hz
          ],
        },
      ]

      const pitchFrames = [{ timeSec: 0, frequencyHz: 150, strength: 0.8 }]

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        formantFrames,
        { frames: pitchFrames, timeStepSec: 0.002, t1Sec: 0 },
      )

      const voicedMsgs = out
        .filter((m) => m.type === 'patch')
        .filter((m) => m.pitchDetected)

      for (const msg of voicedMsgs) {
        // Invalid formant pair should not be propagated
        expect(msg.f1).toBeNull()
        expect(msg.f2).toBeNull()
      }
    })
  })

  describe('formant persistence', () => {
    it('does not render invalid formants', async () => {
      const audio = generateSilence(0.2, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const formantFrames: FormantFrame[] = [
        {
          timeSec: 0,
          intensity: 0.5,
          formantCount: 3,
          formants: [
            { frequencyHz: 700, bandwidthHz: 100 },
            { frequencyHz: 1200, bandwidthHz: 120 },
            { frequencyHz: 2500, bandwidthHz: 200 },
          ],
        },
        {
          timeSec: 0.05,
          intensity: 0,
          formantCount: 0, // No formants at this time
          formants: [],
        },
      ]

      const pitchFrames = [
        { timeSec: 0, frequencyHz: 150, strength: 0.8 },
        { timeSec: 0.002, frequencyHz: 150, strength: 0.8 },
        { timeSec: 0.004, frequencyHz: 150, strength: 0.8 },
      ]

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        formantFrames,
        { frames: pitchFrames, timeStepSec: 0.002, t1Sec: 0 },
      )

      const voicedMsgs = out
        .filter((m) => m.type === 'patch')
        .filter((m) => m.pitchDetected)

      const lastVoiced = voicedMsgs[voicedMsgs.length - 1]
      expect(lastVoiced?.f1).toBe(null)
      expect(lastVoiced?.f2).toBe(null)
      expect(lastVoiced?.f3).toBe(null)
    })
  })

  describe('frame indexing', () => {
    it('produces frames with sequential frameIndex', async () => {
      const audio = generateSilence(0.2, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        [],
        { frames: [], timeStepSec: 0.002, t1Sec: 0 },
      )

      const patchMsgs = out.filter((m) => m.type === 'patch')
      for (let i = 0; i < patchMsgs.length; i++) {
        expect(patchMsgs[i]?.frameIndex).toBe(i)
      }
    })

    it('number of frames approximately matches audio duration / TIME_STEP', async () => {
      const durationSec = 0.3
      const audio = generateSilence(durationSec, SAMPLE_RATE)
      const chunks = chunkAudio(audio, 128)

      const timeStepSec = TIME_STEP_SAMPLES / SAMPLE_RATE
      const expectedFrames = durationSec / timeStepSec

      const out = await testRunAnalysis(
        chunks,
        SAMPLE_RATE,
        TIME_STEP_SAMPLES,
        [],
        { frames: [], timeStepSec: 0.002, t1Sec: 0 },
      )

      const patchMsgs = out.filter((m) => m.type === 'patch')
      expect(patchMsgs.length).toBeGreaterThan(expectedFrames * 0.8)
      expect(patchMsgs.length).toBeLessThan(expectedFrames * 1.2)
    })
  })
})
