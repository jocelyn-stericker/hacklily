// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/// <reference lib="webworker" />

import { ResamplerStreamProcessor } from '#/lib/analysis/ResampleProcessor'
import type { SpeechDecision, VadParams } from '#/lib/analysis/VadProcessor'
import {
  SpeechGate,
  VadStreamProcessor,
  VAD_CHUNK,
} from '#/lib/analysis/VadProcessor'
import { AudioRopeReader } from '#/lib/audio/AudioRopeReader'

import type {
  WorkerEndedMessage,
  PatchFramesMessage,
  VadInitMessage,
  RopeGrowMessage,
  RopeSealMessage,
} from './workerMessages'

const QUANTUM = 128
const VAD_RATE = 16000
const LOG = '[VadWorker]'
const TIME_STEP_SEC = 0.002

export type VadWorkerInMessage =
  | VadInitMessage
  | RopeGrowMessage
  | RopeSealMessage
  | null

export type VadWorkerOutMessage = PatchFramesMessage | WorkerEndedMessage

export type VadWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: VadWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<VadWorkerOutMessage>) => any) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<VadWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

declare function postMessage(message: VadWorkerOutMessage): void

let ropeReader: AudioRopeReader | null = null

self.onmessage = ({ data }: MessageEvent<VadWorkerInMessage>) => {
  if (!data) return
  if (data.type === 'init') {
    ropeReader = new AudioRopeReader(data.rope, QUANTUM)
    const timeStepSamples = Math.round(TIME_STEP_SEC * data.sampleRate)
    void runAnalysis(
      ropeReader,
      data.sampleRate,
      timeStepSamples,
      data.params,
    ).then(() => {
      postMessage({ type: 'ended' })
      console.log(LOG, 'complete')
    })
    return
  }
  if (!ropeReader) return
  if (data.type === 'rope-grow') ropeReader.grow(data.grow)
  else ropeReader.seal()
}

export async function runAnalysis(
  reader: AudioRopeReader,
  sampleRate: number,
  timeStepSamples: number,
  params: Partial<VadParams> = {},
): Promise<void> {
  const vadResampler = new ResamplerStreamProcessor(sampleRate, VAD_RATE, 50)
  const vadDrainBuf = new Float32Array(256)
  const vad = new VadStreamProcessor()

  const pendingDecisions: SpeechDecision[] = []
  const gate = new SpeechGate(
    sampleRate / timeStepSamples,
    (decision) => {
      pendingDecisions.push(decision)
    },
    params,
  )

  function flushDecisions() {
    if (pendingDecisions.length === 0) return
    postMessage({
      type: 'patch',
      frames: pendingDecisions.slice(),
    } satisfies PatchFramesMessage)
    pendingDecisions.length = 0
  }

  const CHUNK_SEC = VAD_CHUNK / VAD_RATE
  const timeStepSec = timeStepSamples / sampleRate
  const vadProbs: number[] = []

  let samplesPending = 0
  let frameIndex = 0
  let nextFrame = 0
  let vadSamplesFed = 0

  const ONSET_HP_HZ = 300
  const hpCoeff = 1 / (1 + (2 * Math.PI * ONSET_HP_HZ) / sampleRate)
  const frameHfEnergy: number[] = []
  let hpPrevIn = 0
  let hpPrevOut = 0
  let hfAcc = 0
  let hfCount = 0

  function gateReadyFrames() {
    while (nextFrame < frameIndex) {
      const coveringChunk = Math.floor(
        ((nextFrame + 0.5) * timeStepSec) / CHUNK_SEC,
      )
      if (coveringChunk >= vadProbs.length) break
      gate.push(
        nextFrame,
        vadProbs[coveringChunk]!,
        frameHfEnergy[nextFrame] ?? NaN,
      )
      flushDecisions()
      nextFrame++
    }
  }

  let vadChain: Promise<void> = Promise.resolve()

  function enqueueVadChunk(buf: Float32Array) {
    vadSamplesFed += buf.length
    const expectedChunks = Math.floor(vadSamplesFed / VAD_CHUNK)
    vadChain = vadChain.then(() =>
      vad
        .feed(buf, (prob) => vadProbs.push(prob))
        .then(gateReadyFrames, () => {
          while (vadProbs.length < expectedChunks) vadProbs.push(0)
          gateReadyFrames()
        }),
    )
  }

  for await (const inp of reader) {
    vadResampler.feed(inp)
    const n = vadResampler.drain(vadDrainBuf)

    for (const x of inp) {
      const hp = hpCoeff * (hpPrevOut + x - hpPrevIn)
      hpPrevIn = x
      hpPrevOut = hp
      hfAcc += hp * hp
      hfCount++
      samplesPending += 1
      if (samplesPending > timeStepSamples) {
        samplesPending -= timeStepSamples
        frameHfEnergy[frameIndex] = hfCount > 0 ? hfAcc / hfCount : 0
        frameIndex++
        hfAcc = 0
        hfCount = 0
      }
    }

    if (n > 0) enqueueVadChunk(vadDrainBuf.slice(0, n))
    gateReadyFrames()
  }

  await vadChain.catch(() => {})
  await vad.flush((prob) => vadProbs.push(prob)).catch(() => {})
  gateReadyFrames()

  const lastChunk = vadProbs.length - 1
  while (nextFrame < frameIndex) {
    const coveringChunk = Math.min(
      lastChunk,
      Math.floor(((nextFrame + 0.5) * timeStepSec) / CHUNK_SEC),
    )
    gate.push(
      nextFrame,
      coveringChunk >= 0 ? vadProbs[coveringChunk]! : 0,
      frameHfEnergy[nextFrame] ?? NaN,
    )
    flushDecisions()
    nextFrame++
  }

  gate.end()
  flushDecisions()
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
