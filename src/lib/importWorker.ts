// Web worker to process audio file imports with frame-by-frame analysis and streaming progress updates.

import { analyzeBuffer } from '#/lib/analysis'
import type { AnalysisChunk } from '#/lib/AnalysisFrame'

export type ImportWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: ImportWorkerInMessage) => null
  onmessage: ((ev: MessageEvent<ImportWorkerOutMessage>) => any) | null
}

export type ImportWorkerInMessage = {
  mono: Float32Array
  fileSampleRate: number
}

export type OkMessage = { ok: AnalysisChunk }
export type ErrorMessage = { error: string }

export type ImportWorkerOutMessage = OkMessage | ErrorMessage

// Web worker to process an audio file import
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
