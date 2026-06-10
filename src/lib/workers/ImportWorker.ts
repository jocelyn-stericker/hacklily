// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Web worker to process audio file imports with frame-by-frame analysis and streaming progress updates.

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { totalFrames } from '#/lib/analysis/AnalysisFrame'
import { analyzeBuffer } from '#/lib/analysis/analyzeBuffer'
import { AudioRope } from '#/lib/audio/AudioRope'
import type { AudioRopeShare } from '#/lib/audio/AudioRope'

export type ImportWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: ImportWorkerInMessage, transfer?: Transferable[]) => null
  onmessage: ((ev: MessageEvent<ImportWorkerOutMessage>) => any) | null
}

export type ImportWorkerInMessage = {
  mono: Float32Array
  fileSampleRate: number
}

export type ImportOkMessage = { ok: AnalysisChunk[]; rope: AudioRopeShare }
export type ImportErrorMessage = { error: string }

export type ImportWorkerOutMessage = ImportOkMessage | ImportErrorMessage

onmessage = async ({
  data: { mono, fileSampleRate },
}: MessageEvent<ImportWorkerInMessage>) => {
  try {
    console.time('import: analyzeBuffer')
    const messages = await analyzeBuffer(mono, fileSampleRate)
    console.timeEnd('import: analyzeBuffer')

    // We allow zero-length (or very short) tracks, and shorten the PCM data to be
    // exactly the same time as analysisSamples.
    // TODO: find an alternative so that we don't drop samples at the end of a file
    const timeStepSamples = messages[0]?.timeStepSamples ?? 0
    const analysisSamples = timeStepSamples * totalFrames(messages)

    // Mirror the mono PCM, trimmed to the analysed length, into a AudioRope --
    // the single audio representation for playback, export, and
    // transcription. One rope covers the whole clip; it never grows, so
    // seal it in one shot (no spare buffer, appends forbidden).
    const rope = new AudioRope(fileSampleRate)
    rope.seal(mono.subarray(0, analysisSamples))

    const share = rope.shareRope()
    postMessage({
      ok: messages,
      rope: share,
    } satisfies ImportWorkerOutMessage)
  } catch (err) {
    postMessage({
      error: err instanceof Error ? err.message : String(err),
    } satisfies ImportWorkerOutMessage)
  }
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
