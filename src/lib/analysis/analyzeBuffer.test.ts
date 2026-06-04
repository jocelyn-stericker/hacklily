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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { AnalysisChunk, AnalysisFrame } from './AnalysisFrame'
import { framesVoiced } from './AnalysisFrame'
import { analyzeBuffer } from './analyzeBuffer'

// analyzeBuffer returns chunks split at voicing boundaries; most per-frame
// assertions only care about the flat frame stream.
function allFrames(chunks: AnalysisChunk[]): AnalysisFrame[] {
  return chunks.flatMap((c) => c.frames)
}

// Controllable mock: each feed() call consumes the next entry in probsByChunk,
// falling back to defaultProb when the array is exhausted.
const mockVadState = vi.hoisted(() => ({
  probsByChunk: [] as number[],
  defaultProb: 0,
}))

vi.mock('#/lib/analysis/VadProcessor', async (importOriginal) => {
  class VadStreamProcessor {
    speechProbability = 0
    private idx = 0

    async feed(_: Float32Array): Promise<void> {
      this.speechProbability =
        mockVadState.probsByChunk[this.idx] ?? mockVadState.defaultProb
      this.idx++
    }

    reset(): void {
      this.idx = 0
      this.speechProbability = 0
    }
  }

  // Keep the real SpeechGate (pure logic); only the ONNX-backed processor is mocked.
  return { ...(await importOriginal<object>()), VadStreamProcessor }
})

function generateSinusoid(
  freqHz: number,
  durationSec: number,
  sampleRate: number,
): Float32Array {
  const n = Math.floor(durationSec * sampleRate)
  const samples = new Float32Array(n)
  const phase = (2 * Math.PI * freqHz) / sampleRate
  for (let i = 0; i < n; i++) samples[i] = Math.sin(phase * i)
  return samples
}

function generateSilence(
  durationSec: number,
  sampleRate: number,
): Float32Array {
  return new Float32Array(Math.floor(durationSec * sampleRate))
}

const SAMPLE_RATE = 44100
// Internal constants from analyzeBuffer defaults
const TIME_STEP_SEC = 0.002
const VAD_CHUNK_DUR_SEC = 512 / 16000 // 0.032 s
const PREROLL_FRAMES = Math.ceil(0.05 / TIME_STEP_SEC) // 25

describe('analyzeBuffer', () => {
  beforeEach(() => {
    mockVadState.probsByChunk = []
    mockVadState.defaultProb = 0
  })

  describe('output structure', () => {
    it('returns chunks with expected metadata', async () => {
      const result = await analyzeBuffer(
        generateSilence(0.5, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      // Pure silence is uniformly unvoiced → a single chunk.
      expect(result.length).toBe(1)
      const chunk = result[0]!
      expect(chunk.sampleRate).toBe(SAMPLE_RATE)
      expect(chunk.startTimeSec).toBe(0)
      expect(chunk.timeStepSamples).toBeGreaterThan(0)
      expect(chunk.freqStepHz).toBeGreaterThan(0)
      expect(chunk.frames.length).toBeGreaterThan(0)
    })

    it('produces approximately one frame per TIME_STEP_SEC', async () => {
      const durationSec = 0.5
      const result = await analyzeBuffer(
        generateSilence(durationSec, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      const expectedFrames = durationSec / TIME_STEP_SEC
      expect(allFrames(result).length).toBeGreaterThan(expectedFrames * 0.8)
      expect(allFrames(result).length).toBeLessThan(expectedFrames * 1.2)
    })

    it('longer input produces more frames than shorter input', async () => {
      const short = await analyzeBuffer(
        generateSilence(0.2, SAMPLE_RATE),
        SAMPLE_RATE,
      )
      const long = await analyzeBuffer(
        generateSilence(1.0, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      expect(allFrames(long).length).toBeGreaterThan(allFrames(short).length)
    })

    it('each frame has a non-empty spectrum Float32Array', async () => {
      const result = await analyzeBuffer(
        generateSilence(0.1, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      for (const frame of allFrames(result)) {
        expect(frame.spectrum).toBeInstanceOf(Float32Array)
        expect(frame.spectrum.length).toBeGreaterThan(0)
      }
    })

    it('timeStepSamples is round(TIME_STEP_SEC * sampleRate)', async () => {
      const result = await analyzeBuffer(
        generateSilence(0.5, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      expect(result[0]!.timeStepSamples).toBe(
        Math.round(TIME_STEP_SEC * SAMPLE_RATE),
      )
    })
  })

  describe('chunk invariants', () => {
    // Speech bracketed by silence forces multiple chunks, exercising the split.
    async function mixedResult() {
      for (let i = 0; i < 10; i++) mockVadState.probsByChunk.push(0)
      for (let i = 0; i < 10; i++) mockVadState.probsByChunk.push(0.9)
      mockVadState.defaultProb = 0
      return analyzeBuffer(generateSilence(1.5, SAMPLE_RATE), SAMPLE_RATE)
    }

    it('splits speech and silence into separate chunks', async () => {
      const result = await mixedResult()
      expect(result.length).toBeGreaterThan(1)
      expect(result.some((c) => c.voiced)).toBe(true)
      expect(result.some((c) => !c.voiced)).toBe(true)
    })

    it('every frame in a chunk shares its speechDetected, matching voiced', async () => {
      const result = await mixedResult()
      for (const chunk of result) {
        expect(chunk.frames.length).toBeGreaterThan(0)
        for (const frame of chunk.frames) {
          expect(frame.speechDetected).toBe(chunk.voiced)
        }
        expect(framesVoiced(chunk.frames)).toBe(chunk.voiced)
      }
    })

    it('chunk startTimeSec is contiguous and frame-aligned', async () => {
      const result = await mixedResult()
      const step = result[0]!.timeStepSamples / result[0]!.sampleRate
      let expectedStart = 0
      for (const chunk of result) {
        expect(chunk.startTimeSec).toBeCloseTo(expectedStart)
        expectedStart += chunk.frames.length * step
      }
    })
  })

  describe('silence input', () => {
    it('produces near-zero RMS for all frames', async () => {
      const result = await analyzeBuffer(
        generateSilence(0.3, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      for (const frame of allFrames(result)) {
        expect(frame.rms).toBeCloseTo(0, 10)
      }
    })

    it('has no pitch detected and f0 = 0', async () => {
      const result = await analyzeBuffer(
        generateSilence(0.3, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      for (const frame of allFrames(result)) {
        expect(frame.pitchDetected).toBe(false)
        expect(frame.f0).toBe(0)
      }
    })

    it('has null formants on all frames', async () => {
      const result = await analyzeBuffer(
        generateSilence(0.3, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      for (const frame of allFrames(result)) {
        expect(frame.f1).toBeNull()
        expect(frame.f2).toBeNull()
        expect(frame.f3).toBeNull()
      }
    })
  })

  describe('VAD speech detection', () => {
    it('speechDetected and speechProbability are 0 when VAD returns 0', async () => {
      mockVadState.defaultProb = 0
      const result = await analyzeBuffer(
        generateSilence(0.5, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      for (const frame of allFrames(result)) {
        expect(frame.speechDetected).toBe(false)
        expect(frame.speechProbability).toBeCloseTo(0)
      }
    })

    it('most frames are speechDetected when VAD probability is above positive threshold', async () => {
      mockVadState.defaultProb = 0.5
      const result = await analyzeBuffer(
        generateSilence(0.5, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      const speechCount = allFrames(result).filter(
        (f) => f.speechDetected,
      ).length
      // All frames with prob=0.5 (onset on first chunk) → speaking = true for all
      expect(speechCount).toBe(allFrames(result).length)
    })

    it('speechProbability reflects the VAD output for each frame', async () => {
      mockVadState.defaultProb = 0.42
      const result = await analyzeBuffer(
        generateSilence(0.3, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      for (const frame of allFrames(result)) {
        expect(frame.speechProbability).toBeCloseTo(0.42, 2)
      }
    })

    it('hysteresis: stays speaking when prob drops between NEGATIVE (0.25) and POSITIVE (0.3) thresholds', async () => {
      // Chunks 0-9: silent; chunks 10-19: speaking; chunks 20-29: between thresholds (stays speaking)
      for (let i = 0; i < 10; i++) mockVadState.probsByChunk.push(0)
      for (let i = 0; i < 10; i++) mockVadState.probsByChunk.push(0.5)
      for (let i = 0; i < 10; i++) mockVadState.probsByChunk.push(0.27)

      const result = await analyzeBuffer(
        generateSilence(1, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      // Frames in the middle of the between-threshold region (chunks 22–27)
      const regionStart = Math.floor((22 * VAD_CHUNK_DUR_SEC) / TIME_STEP_SEC)
      const regionEnd = Math.floor((27 * VAD_CHUNK_DUR_SEC) / TIME_STEP_SEC)

      for (let x = regionStart; x < regionEnd; x++) {
        expect(allFrames(result)[x]?.speechDetected).toBe(true)
      }
    })

    it('stops speaking when prob drops below NEGATIVE threshold (0.25)', async () => {
      // Chunks 0-9: speaking; chunks 10+: firmly silent (0.1 < 0.25)
      for (let i = 0; i < 10; i++) mockVadState.probsByChunk.push(0.5)
      mockVadState.defaultProb = 0.1

      const result = await analyzeBuffer(
        generateSilence(1, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      // Frames well into the silent region (chunks 15–25), clear of any preroll
      const silentStart = Math.floor((15 * VAD_CHUNK_DUR_SEC) / TIME_STEP_SEC)
      const silentEnd = Math.floor((25 * VAD_CHUNK_DUR_SEC) / TIME_STEP_SEC)

      for (let x = silentStart; x < silentEnd; x++) {
        expect(allFrames(result)[x]?.speechDetected).toBe(false)
      }
    })
  })

  describe('VAD pre-roll', () => {
    it(`marks ${PREROLL_FRAMES} frames before a speech onset as speechDetected`, async () => {
      // Chunks 0-19: silence; chunk 20+: speech
      // Onset at chunk 20 → frame ~320; preroll covers frames ~295–319.
      for (let i = 0; i < 20; i++) mockVadState.probsByChunk.push(0)
      mockVadState.defaultProb = 0.5

      const result = await analyzeBuffer(
        generateSilence(1, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      // Onset frame: first frame whose tMid falls in chunk 20 (t >= 20 * 0.032 = 0.64 s)
      // tMid = (x + 0.5) * 0.002 >= 0.64 → x >= 319.5 → x = 320
      const onsetFrame = 320

      // Frames in the preroll window should be speechDetected
      const prerollStart = onsetFrame - PREROLL_FRAMES // 295
      for (let x = prerollStart; x < onsetFrame; x++) {
        expect(allFrames(result)[x]?.speechDetected).toBe(true)
      }

      // Frame just before the preroll window should NOT be speechDetected
      expect(allFrames(result)[prerollStart - 1]?.speechDetected).toBe(false)
    })

    it('frames well before the preroll window remain speechDetected=false', async () => {
      // Same setup: speech starts at chunk 20 (frame ~320), preroll covers frames 295–319.
      // Frames 0–270 are safely outside the preroll region.
      for (let i = 0; i < 20; i++) mockVadState.probsByChunk.push(0)
      mockVadState.defaultProb = 0.5

      const result = await analyzeBuffer(
        generateSilence(1, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      for (let x = 0; x < 270; x++) {
        expect(allFrames(result)[x]?.speechDetected).toBe(false)
      }
    })
  })

  describe('formant validity filter', () => {
    it('f1, f2, f3 are null on every unvoiced frame', async () => {
      const result = await analyzeBuffer(
        generateSilence(0.5, SAMPLE_RATE),
        SAMPLE_RATE,
      )

      for (const frame of allFrames(result)) {
        if (!frame.pitchDetected) {
          expect(frame.f1).toBeNull()
          expect(frame.f2).toBeNull()
          expect(frame.f3).toBeNull()
        }
      }
    })
  })

  describe('voiced signal', () => {
    it('detects pitch on a pure 150 Hz sinusoid', async () => {
      const input = generateSinusoid(150, 0.5, SAMPLE_RATE)
      const result = await analyzeBuffer(input, SAMPLE_RATE)

      const voicedFrames = allFrames(result).filter((f) => f.pitchDetected)
      expect(voicedFrames.length).toBeGreaterThan(0)
    })

    it('f0 is close to 150 Hz on voiced frames of a 150 Hz sinusoid', async () => {
      const input = generateSinusoid(150, 0.5, SAMPLE_RATE)
      const result = await analyzeBuffer(input, SAMPLE_RATE)

      const voicedFrames = allFrames(result).filter((f) => f.pitchDetected)
      expect(voicedFrames.length).toBeGreaterThan(0)

      const avgF0 =
        voicedFrames.reduce((sum, f) => sum + f.f0, 0) / voicedFrames.length
      expect(avgF0).toBeGreaterThan(100)
      expect(avgF0).toBeLessThan(250)
    })

    it('RMS is non-zero for a voiced frame', async () => {
      const input = generateSinusoid(150, 0.5, SAMPLE_RATE)
      const result = await analyzeBuffer(input, SAMPLE_RATE)

      const maxRms = Math.max(...allFrames(result).map((f) => f.rms))
      expect(maxRms).toBeGreaterThan(0)
    })
  })
})
