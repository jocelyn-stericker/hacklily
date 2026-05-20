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

// Parameters shared by all frames within a chunk. Constant across one recording
// or import session; a new AnalysisChunk is created if these ever change.
export type AnalysisParams = {
  timeStepSamples: number
  sampleRate: number
  freqStepHz: number
  // Center of first frequency bin
  firstBinHz: number
}

export type AnalysisFrame = {
  spectrum: Float32Array
  rms: number
  // Silero VAD v5 speech probability (0 = silence, 1 = speech)
  speechProbability: number
  // True when pitch analysis detected a voiced frame (f0 > 0)
  pitchDetected: boolean
  // True when VAD determined we are in a voiced speech segment (with hysteresis)
  speechDetected: boolean
  f0: number // 0 when unvoiced
  f1: number | null // null when pitch undetected or formant not detected
  f2: number | null
  f3: number | null
}

export type AnalysisChunk = AnalysisParams & { frames: AnalysisFrame[] }

// Frames confirmed voiced by both pitch and VAD, with F1 and F2 present. Used as a type predicate in VowelChart.
export type VoicedAnalysisFrame = AnalysisFrame & {
  pitchDetected: true
  speechDetected: true
  f1: number
  f2: number
}

export function totalFrames(chunks: AnalysisChunk[]): number {
  return chunks.reduce((sum, c) => sum + c.frames.length, 0)
}

export function getFrame(
  chunks: AnalysisChunk[],
  index: number,
): AnalysisFrame | undefined {
  let remaining = index
  for (const chunk of chunks) {
    if (remaining < chunk.frames.length) return chunk.frames[remaining]
    remaining -= chunk.frames.length
  }
  return undefined
}
