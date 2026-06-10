// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import type { SpeechDecision } from '#/lib/analysis/VadProcessor'
import type { SabRopeGrow, SabRopeShare } from '#/lib/audio/SabRope'

export interface RopeConsumerInitMessage {
  type: 'init'
  rope: SabRopeShare
  sampleRate: number
}

export type RopeGrowMessage = {
  type: 'rope-grow'
  grow: SabRopeGrow
}

export type RopeSealMessage = {
  type: 'rope-seal'
}

export type ParamsMessage = {
  type: 'params'
} & AnalysisParams

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
    | 'spectrum'
    | 'rms'
  >
>

export type PatchFrameMessage = {
  type: 'patch'
  frameIndex: number
} & AnalysisPatch

export type PatchFramesMessage = {
  type: 'patch'
  frames: SpeechDecision[]
}

export interface WorkerEndedMessage {
  type: 'ended'
}
