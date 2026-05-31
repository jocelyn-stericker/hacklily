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

import type { AnalysisFrame, AnalysisParams } from './AnalysisFrame'
import type { SpeechDecision } from './VadProcessor'

export interface SpectrogramInitMessage {
  type: 'init'
  sab: SharedArrayBuffer
  sampleRate: number
  bufSamples: number
}

// FormantWorker and VadWorker also receive timeStepSamples (forwarded from
// SpectrogramWorker's ParamsMessage) so they can align their output to frames.
export type FormantInitMessage = SpectrogramInitMessage & {
  timeStepSamples: number
}

export type VadInitMessage = SpectrogramInitMessage & {
  timeStepSamples: number
}

// Emitted once per session (or whenever params change) before the first frame.
export type ParamsMessage = { type: 'params' } & AnalysisParams

type AnalysisCore = Pick<AnalysisFrame, 'spectrum' | 'rms'>

export type AnalysisPatch = Partial<
  Pick<
    AnalysisFrame,
    | 'pitchDetected'
    | 'speechDetected'
    | 'f0'
    | 'f1'
    | 'f2'
    | 'f3'
    | 'speechProbability'
  >
>

// Emitted once per spectrogram frame. spectrum/rms are always present;
// voiced/pitch/formant/vad fields are optional and may arrive later via PatchFrameMessage.
// frameIndex is session-local (resets to 0 each recording session).
export type AppendFrameMessage = {
  type: 'frame'
  frameIndex: number
} & AnalysisCore &
  AnalysisPatch

// Overwrites specific fields of a previously emitted frame.
// frameIndex is session-local, matching the index in the preceding ParamsMessage's chunk.
export type PatchFrameMessage = {
  type: 'patch'
  frameIndex: number
} & AnalysisPatch

// Batched patch covering a contiguous run of frames revised together — emitted
// by the VAD worker once per gate push/end, where the gate only ever flips a
// contiguous run to a single value. `frames` carries one decision per frame.
export type PatchFramesMessage = {
  type: 'patch'
  frames: SpeechDecision[]
}

export interface WorkerEndedMessage {
  type: 'ended'
}

export interface AudioReadyMessage {
  type: 'audioReady'
  pcm: Float32Array<ArrayBuffer>
}
