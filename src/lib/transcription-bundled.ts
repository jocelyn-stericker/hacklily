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

// The "bundled" mode runs the Moonshine model in a web worker (transformers.js
// + onnxruntime-web), so the ~70 MB download and inference stay off the UI
// thread. One worker is kept for the page's lifetime, created lazily on first
// use; each posted chunk is matched to its result by id.
import MoonshineWorkerCtor from '#/lib/MoonshineWorker?worker'
import type {
  MoonshineWorker,
  MoonshineWorkerOutMessage,
} from '#/lib/MoonshineWorker'

let moonshineWorker: MoonshineWorker | null = null
let nextTranscribeId = 0
const pendingTranscriptions = new Map<
  number,
  { resolve: (text: string) => void; reject: (error: Error) => void }
>()

function getMoonshineWorker(): MoonshineWorker {
  if (moonshineWorker) return moonshineWorker

  const worker = new MoonshineWorkerCtor()
  worker.addEventListener(
    'message',
    ({ data }: MessageEvent<MoonshineWorkerOutMessage>) => {
      const pending = pendingTranscriptions.get(data.id)
      if (!pending) return
      pendingTranscriptions.delete(data.id)
      if (data.type === 'result') pending.resolve(data.text)
      else pending.reject(new Error(data.error))
    },
  )
  // A worker-level failure (e.g. the model script failing to load) never
  // delivers per-request results, so reject everything in flight rather than
  // leaving those promises to hang. Terminate the errored worker to free its
  // loaded model weights, then drop the reference so the next request builds
  // a fresh one.
  worker.addEventListener('error', (event) => {
    worker.terminate()
    moonshineWorker = null
    const error = new Error(
      event.message || 'The bundled transcription model failed to load.',
    )
    for (const pending of pendingTranscriptions.values()) pending.reject(error)
    pendingTranscriptions.clear()
  })

  moonshineWorker = worker
  return worker
}

/** Transcribe one chunk's PCM with the bundled Moonshine worker. */
export function transcribeBundled(
  pcm: Float32Array,
  sampleRate: number,
): Promise<string> {
  const worker = getMoonshineWorker()
  const id = nextTranscribeId++
  return new Promise<string>((resolve, reject) => {
    pendingTranscriptions.set(id, { resolve, reject })
    worker.postMessage({ type: 'transcribe', id, pcm, sampleRate })
  })
}
