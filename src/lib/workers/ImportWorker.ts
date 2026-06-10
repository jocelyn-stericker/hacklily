// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Web worker to process audio file imports with frame-by-frame analysis and streaming progress updates.

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { analyzeBuffer } from '#/lib/analysis/analyzeBuffer'

export type ImportWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: ImportWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<ImportWorkerOutMessage>) => any) | null
}

export type ImportWorkerInMessage = {
  mono: Float32Array
  fileSampleRate: number
}

export type ImportOkMessage = { ok: AnalysisChunk[] }
export type ImportErrorMessage = { error: string }

export type ImportWorkerOutMessage = ImportOkMessage | ImportErrorMessage

onmessage = async ({
  data: { mono, fileSampleRate },
}: MessageEvent<ImportWorkerInMessage>) => {
  try {
    console.time('import: analyzeBuffer')
    const messages = await analyzeBuffer(mono, fileSampleRate)
    console.timeEnd('import: analyzeBuffer')
    postMessage({ ok: messages })
  } catch (err) {
    postMessage({
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

self.addEventListener('unhandledrejection', function (event) {
  throw event.reason
})
