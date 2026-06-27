// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Offline VAD worker: runs Silero VAD over a whole audio buffer on a worker
// thread and returns the voiced speech segments. Used by the journal transcript
// pipeline to split a recording into utterances without blocking the UI.

import type { SpeechSegment } from '#/lib/analysis/vadSegments'
import { vadSegments } from '#/lib/analysis/vadSegments'

export type VadBatchWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: VadBatchWorkerInMessage, transfer?: Transferable[]) => null
  onmessage: ((ev: MessageEvent<VadBatchWorkerOutMessage>) => any) | null
}

export type VadBatchWorkerInMessage = {
  mono: Float32Array
  sampleRate: number
}

export type VadBatchOkMessage = { ok: SpeechSegment[] }
export type VadBatchErrorMessage = { error: string }

export type VadBatchWorkerOutMessage = VadBatchOkMessage | VadBatchErrorMessage

onmessage = async ({
  data: { mono, sampleRate },
}: MessageEvent<VadBatchWorkerInMessage>) => {
  try {
    console.time('vad: vadSegments')
    const segments = await vadSegments(mono, sampleRate)
    console.timeEnd('vad: vadSegments')
    postMessage({ ok: segments } satisfies VadBatchWorkerOutMessage)
  } catch (err) {
    postMessage({
      error: err instanceof Error ? err.message : String(err),
    } satisfies VadBatchWorkerOutMessage)
  }
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
