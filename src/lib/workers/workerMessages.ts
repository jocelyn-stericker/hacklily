// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import type { SpeechDecision } from '#/lib/analysis/VadProcessor'
import type { SabRopeShare } from '#/lib/audio/SabRope'

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
export type ParamsMessage = {
  type: 'params'
  rope: SabRopeShare
} & AnalysisParams

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
    | 'lunaBrightness'
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

// Batched patch covering a contiguous run of frames revised together -- emitted
// by the VAD worker once per gate push/end, where the gate only ever flips a
// contiguous run to a single value. `frames` carries one decision per frame.
export type PatchFramesMessage = {
  type: 'patch'
  frames: SpeechDecision[]
}

export interface WorkerEndedMessage {
  type: 'ended'
}
