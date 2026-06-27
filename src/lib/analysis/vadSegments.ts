// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// VAD-only speech segment extraction: a lightweight slice of analyzeBuffer that
// skips spectrogram/formant/pitch and returns just the voiced time ranges. Used
// by the journal transcript pipeline to split a recording into utterances for
// transcription without paying for full analysis.

import { resample } from './ResampleProcessor'
import type { VadParams } from './VadProcessor'
import { SpeechGate, VadStreamProcessor } from './VadProcessor'

export interface SpeechSegment {
  /** Segment start, seconds into the input. */
  startSec: number
  /** Past the segment's last sample, seconds into the input. */
  endSec: number
}

const VAD_CHUNK = 512
const VAD_SAMPLE_RATE = 16000

// Frame step for the SpeechGate. The batch path in analyzeBuffer uses the
// spectrogram's 2 ms step; we don't run a spectrogram here, so pick a step that
// matches the VAD chunk cadence (32 ms) -- coarse enough to be cheap, fine
// enough that pre/post-roll and redemption resolve cleanly. Decisions map back
// to seconds via this rate.
const FRAME_STEP_SEC = VAD_CHUNK / VAD_SAMPLE_RATE

/**
 * Run Silero VAD over `input` (mono PCM at `sampleRate`) and return the voiced
 * speech segments as `{startSec, endSec}` ranges. `vadParams` overrides the
 * SpeechGate defaults (same thresholds/pre-roll/post-roll as the analysis path).
 *
 * Heavy: runs ONNX inference per 32 ms chunk on the calling thread. Don't call
 * on the main thread for non-trivial audio -- use the VadBatchWorker.
 */
export async function vadSegments(
  input: Float32Array,
  sampleRate: number,
  vadParams?: Partial<VadParams>,
): Promise<SpeechSegment[]> {
  const vad16k = resample(input, sampleRate, VAD_SAMPLE_RATE, 50)
  const vad = new VadStreamProcessor()
  const numChunks = Math.ceil(vad16k.length / VAD_CHUNK)
  const probs = new Float32Array(Math.max(1, numChunks))
  const chunk = new Float32Array(VAD_CHUNK)
  for (let i = 0; i < numChunks; i++) {
    const start = i * VAD_CHUNK
    const end = Math.min(start + VAD_CHUNK, vad16k.length)
    chunk.fill(0)
    chunk.set(vad16k.subarray(start, end))
    await vad.feed(chunk)
    probs[i] = vad.speechProbability
  }

  // Gate the per-chunk probabilities into speech/silence decisions. No onset
  // feature (HF energy) -- the gate falls back to the blind pre-roll pad, which
  // is fine for transcription segment boundaries (we only need approximate
  // utterance spans, not consonant-precise onsets).
  const speech = new Uint8Array(probs.length)
  const gate = new SpeechGate(
    1 / FRAME_STEP_SEC,
    (d) => {
      speech[d.frameIndex] = d.speechDetected ? 1 : 0
    },
    vadParams,
  )
  for (let i = 0; i < probs.length; i++) gate.push(i, probs[i]!)
  gate.end()

  // Group contiguous speech frames into segments.
  const segments: SpeechSegment[] = []
  let startFrame = -1
  for (let i = 0; i <= speech.length; i++) {
    const voiced = i < speech.length && speech[i] === 1
    if (voiced && startFrame < 0) {
      startFrame = i
    } else if (!voiced && startFrame >= 0) {
      segments.push({
        startSec: startFrame * FRAME_STEP_SEC,
        endSec: i * FRAME_STEP_SEC,
      })
      startFrame = -1
    }
  }
  return segments
}
