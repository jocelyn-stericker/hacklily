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

self.addEventListener('unhandledrejection', function (event) {
  // the event object has two special properties:
  // event.promise - the promise that generated the error
  // event.reason  - the unhandled error object
  throw event.reason
})
