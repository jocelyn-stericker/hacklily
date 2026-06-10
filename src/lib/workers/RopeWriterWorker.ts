// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/// <reference lib="webworker" />

import { AudioRingReader } from '#/lib/audio/AudioRingReader'
import { AudioRope } from '#/lib/audio/AudioRope'
import type {
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'

import type { WorkerEndedMessage } from './workerMessages'

const LOG = '[RopeWriterWorker]'
const QUANTUM = 128

export interface RopeWriterInitMessage {
  type: 'init'
  sab: SharedArrayBuffer
  sampleRate: number
  bufSamples: number
}

export type RopeWriterInMessage = RopeWriterInitMessage | null

export type RopeReadyMessage = {
  type: 'rope-ready'
  rope: AudioRopeShare
  sampleRate: number
}

export type RopeWriterWorkerOutMessage =
  | RopeReadyMessage
  | AudioRopeGrow
  | AudioRopeSeal
  | WorkerEndedMessage

export type RopeWriterWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: RopeWriterInMessage) => null
  onmessage: ((ev: MessageEvent<RopeWriterWorkerOutMessage>) => any) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<RopeWriterWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

declare function postMessage(
  message: RopeWriterWorkerOutMessage,
  transfer?: Transferable[],
): void

self.onmessage = async ({ data }: MessageEvent<RopeWriterInMessage>) => {
  if (data?.type !== 'init') return

  const reader = new AudioRingReader(data.sab, data.bufSamples, QUANTUM)
  reader.onOverrun = (dropped) => {
    console.warn(LOG, `ring buffer overrun: ${dropped} samples lost`)
  }

  const rope = new AudioRope(data.sampleRate)
  const share = rope.shareRope()

  postMessage({
    type: 'rope-ready',
    rope: share,
    sampleRate: data.sampleRate,
  })

  let bufferLength = share.buffers.length

  for await (const inp of reader) {
    rope.append(inp)
    const grow = rope.shareGrowth(bufferLength)
    if (grow) {
      bufferLength += grow.buffers.length
      postMessage(grow)
    }
  }

  rope.seal()
  postMessage({ type: 'audio-rope-seal' } satisfies AudioRopeSeal)
  postMessage({ type: 'ended' })
  console.log(LOG, 'complete')
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
