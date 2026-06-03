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
/// <reference lib="webworker" />

// Runs a bundled speech-recognition model off the UI thread via transformers.js.
//
// Downloading is explicit: the network is opened (see `networkAllowed` below)
// only for the duration of a `download` message, which fetches the weights and
// reports progress. A `transcribe` message never opens the network, so it can
// only use weights already in the browser cache and never triggers a download.
// The same worker may handle both — a download leaves the network closed again
// when it finishes, and the now-warmed worker is reused for transcription (see
// the shared pool in transcribeBundled.ts, driven for downloads by
// modelDownload.ts).
import { env, pipeline } from '@huggingface/transformers'
import type {
  AutomaticSpeechRecognitionPipeline,
  ProgressInfo,
  PretrainedModelOptions,
} from '@huggingface/transformers'

import { loudnessGain, measureLoudness } from './loudness'
import { resample } from './ResampleProcessor'

// transformers.js won't even consult its browser cache unless a model source is
// "allowed": with both `allowRemoteModels` and `allowLocalModels` false it throws
// "both local and remote models are disabled" before looking at the cache. And
// `allowLocalModels` can't be the one we enable — it makes the loader fetch a
// same-origin `/models/...` path, which our SPA host answers with index.html
// (200), poisoning the cache. So we leave `allowRemoteModels = true` purely to
// unlock the cache path.
//
// On its own, "remote allowed" means a cache miss *silently downloads* the
// weights — unacceptable for a ~540 MB model on the transcribe path. But
// transformers.js reads the cache via the Cache API directly and only routes
// real *network* requests through `env.fetch`. So we gate the network there:
// fetch is refused unless an explicit download has opened it (`networkAllowed`).
// A transcribe against a missing or partial cache therefore throws instead of
// downloading. (`local_files_only: true` would be the "official" knob, but it
// requires `allowLocalModels = true` and thus the poisoning above.)
env.allowRemoteModels = true
env.allowLocalModels = false

// Marker prefixing an error when the model couldn't be *loaded* during a
// transcribe (missing or corrupt cached weights, a failed session, a refused
// offline fetch) — as opposed to an inference failure after a good load.
// transcription.ts matches this exact phrase to treat the model as unavailable.
// It can't import this value (doing so would run this worker module on the main
// thread), so the phrase is duplicated there — keep the two in sync.
const MODEL_LOAD_FAILED_MARKER = 'transcription model could not be loaded'

// Substring of the env.fetch refusal below, surfaced in load-failure detail.
const OFFLINE_FETCH_MARKER = 'refusing network fetch while offline'

let networkAllowed = false
const baseFetch = env.fetch
env.fetch = (input: string | URL, init?: RequestInit): Promise<Response> => {
  if (networkAllowed) return baseFetch(input, init)
  const url = typeof input === 'string' ? input : input.href
  return Promise.reject(
    new Error(`[TranscribeWorker] ${OFFLINE_FETCH_MARKER}: ${url}`),
  )
}

// Both models are trained on 16 kHz mono audio.
const SAMPLE_RATE = 16_000

export type TranscribeWorkerModel = 'moonshine' | 'whisper'

type ModelConfig = {
  id: string
  // transformers.js dtype suffix. "q8" maps to the *_quantized.onnx weights
  // (see DEFAULT_DTYPE_SUFFIX_MAPPING); "q4f16" to the 4-bit WebGPU weights.
  options: PretrainedModelOptions
}

const MODEL_CONFIG: Record<TranscribeWorkerModel, ModelConfig> = {
  moonshine: {
    id: 'onnx-community/moonshine-base-ONNX',
    options: { dtype: 'q8' },
  },
  whisper: {
    id: 'onnx-community/whisper-large-v3-turbo',
    options: {
      dtype: 'q4f16',
      device: 'webgpu',
    },
  },
}

// Hard ceiling on generated tokens: the decoder can't attend past
// `max_position_embeddings` (from the model's config.json), so requesting more
// than this can't help. It only clamps pathological cases — for any real chunk
// the duration-scaled budget below is far smaller and the model stops on EOS.
const DECODER_MAX_TOKENS = 512
// The model normally emits EOS well before either bound; the budget is
// just a safety net against a decoder that never stops. We need to set this because
// transformers.js normal bound is too low.
const TOKENS_PER_SECOND = 6.5
const MIN_NEW_TOKENS = 16
const LOG = '[TranscribeWorker]'

export type TranscribeWorkerInMessage =
  | {
      type: 'transcribe'
      id: number
      pcm: Float32Array
      sampleRate: number
      model: TranscribeWorkerModel
    }
  // `force` re-downloads from scratch, ignoring (and replacing) any cached
  // files — the recovery path for a corrupt cache that a normal load can't get
  // past (e.g. a truncated weight that yields "Can't create a session").
  | { type: 'download'; model: TranscribeWorkerModel; force?: boolean }

export type TranscribeWorkerOutMessage =
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id: number; error: string }
  | {
      type: 'download-progress'
      model: TranscribeWorkerModel
      loaded: number
      total: number
    }
  | { type: 'download-ready'; model: TranscribeWorkerModel }
  | { type: 'download-error'; model: TranscribeWorkerModel; error: string }

export type TranscribeWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (
    msg: TranscribeWorkerInMessage,
    transfer?: Transferable[],
  ) => void
  onmessage: ((ev: MessageEvent<TranscribeWorkerOutMessage>) => unknown) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<TranscribeWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

declare function postMessage(message: TranscribeWorkerOutMessage): void

// Pipelines are loaded once, lazily, per model. A failed load clears the cache
// entry so a later request can retry (e.g. after a download lands the weights).
let pipelineModel: TranscribeWorkerModel | null = null
let _pipeline: Promise<AutomaticSpeechRecognitionPipeline> | null = null

function getPipeline(
  model: TranscribeWorkerModel,
  onProgress?: (info: ProgressInfo) => void,
): Promise<AutomaticSpeechRecognitionPipeline> {
  pipelineModel ??= model
  if (pipelineModel !== model) {
    throw new Error(
      'Cannot reuse the same TranscribeWorker for multiple models',
    )
  }
  if (_pipeline) {
    return _pipeline
  }
  _pipeline = loadPipeline(model, onProgress).catch((err: unknown) => {
    _pipeline = null
    throw err
  })

  return _pipeline
}

// More than one thread is silly on moonshine, and can be unstable with whisper.
env.backends.onnx.wasm!.numThreads = 1

// Moonshine runs on the onnxruntime-web wasm backend. Pin a specific ORT build
// and force single-threaded: the threaded build's asyncify path doesn't play
// well with Safari iOS, and `numThreads = 1` avoids needing cross-origin
// isolation for SharedArrayBuffer. Whisper runs on WebGPU and doesn't touch the
// wasm backend, so this only applies when loading Moonshine.
// TODO: use optimized ort files with a custom build of onnxruntime, like for VAD.
const LAST_GOOD_CPU_ORT_VERSION = '1.24.3'
function configureMoonshineBackend(): void {
  const wasm = env.backends.onnx.wasm
  if (!wasm) return
  wasm.wasmPaths = {
    mjs: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${LAST_GOOD_CPU_ORT_VERSION}/dist/ort-wasm-simd-threaded.mjs`,
    wasm: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${LAST_GOOD_CPU_ORT_VERSION}/dist/ort-wasm-simd-threaded.wasm`,
  }
}

function loadPipeline(
  model: TranscribeWorkerModel,
  onProgress?: (info: ProgressInfo) => void,
): Promise<AutomaticSpeechRecognitionPipeline> {
  if (model === 'moonshine') configureMoonshineBackend()
  const config = MODEL_CONFIG[model]
  const options: PretrainedModelOptions = {
    ...config.options,
    // Forward aggregate download progress to the main thread so the UI can show
    // a progress bar during the one-time model download. Only set for the
    // download path; the offline transcribe path passes no callback.
    progress_callback: onProgress,
  }
  console.log(LOG, 'loading pipeline', {
    model: config.id,
    options,
    allowRemoteModels: env.allowRemoteModels,
  })
  return pipeline('automatic-speech-recognition', config.id, options)
}

function normalize(pcm: Float32Array, sampleRate: number): void {
  const gain = loudnessGain(measureLoudness(pcm, sampleRate))
  pcm.forEach((sample, i) => {
    pcm[i] = sample * gain
  })
}

// Normalize a chunk's mono PCM, then resample it to the model's 16 kHz rate.
function prepareAudio(pcm: Float32Array, sampleRate: number): Float32Array {
  // resample() returns a copy even when the rate already matches, so it's safe
  // to mutate `pcm` first — it's the worker's own copy of the posted buffer.
  normalize(pcm, sampleRate)
  return resample(pcm, sampleRate, SAMPLE_RATE)
}

async function transcribe(
  data: Extract<TranscribeWorkerInMessage, { type: 'transcribe' }>,
): Promise<void> {
  console.log(
    LOG,
    `Transcribing ${data.pcm.length / data.sampleRate}s with ${data.model}`,
  )
  console.time(LOG + ' transcribe')
  try {
    let transcriber: AutomaticSpeechRecognitionPipeline
    try {
      transcriber = await getPipeline(data.model)
    } catch (err) {
      // Loading the model failed: its cached weights are missing or unusable —
      // an evicted file (the offline-fetch refusal), a corrupt one (a failed
      // onnxruntime session), etc. The model can't be used at all, so tag the
      // error distinctly from an inference failure. The client (transcription.ts)
      // matches the marker, forgets the "downloaded" flag, and reverts the mode
      // so the settings modal re-offers the download.
      console.error(LOG, 'model load failed', err)
      const detail = err instanceof Error ? err.message : String(err)
      postMessage({
        type: 'error',
        id: data.id,
        error: `${MODEL_LOAD_FAILED_MARKER}: ${detail}`,
      })
      return
    }
    const audio = prepareAudio(data.pcm, data.sampleRate)
    const seconds = audio.length / SAMPLE_RATE
    const maxNewTokens = Math.min(
      DECODER_MAX_TOKENS,
      Math.max(MIN_NEW_TOKENS, Math.ceil(seconds * TOKENS_PER_SECOND)),
    )
    const output = await transcriber(audio, {
      max_new_tokens: maxNewTokens,
      language: 'english',
    })
    const text = (
      Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text
    ).trim()
    postMessage({ type: 'result', id: data.id, text })
  } catch (err) {
    console.error(LOG, 'transcription failed', err)
    postMessage({
      type: 'error',
      id: data.id,
      error: err instanceof Error ? err.message : String(err),
    })
  } finally {
    console.timeEnd(LOG + ' transcribe')
  }
}

// A model load fails with a JSON SyntaxError when a non-JSON response (e.g. an
// HTML error/SPA-fallback page served with a 200) was cached under a config
// file's key, shadowing the real weights. transformers.js tries to JSON.parse
// that HTML and throws. This is the signature of a poisoned cache entry, which
// a one-time cache purge can recover from.
function isPoisonedCacheError(err: unknown): boolean {
  if (err instanceof SyntaxError) return true
  const message = err instanceof Error ? err.message : String(err)
  return /JSON|Unexpected (token|character)/i.test(message)
}

// Evict stale, same-origin cache entries from transformers.js's browser cache.
// Legitimate weights are cached under their absolute remote (huggingface.co)
// URL; anything cached under *this app's own origin* is a stale local-path
// entry (e.g. the dev server's index.html) that can only shadow the real file —
// so it's always safe to drop, and it never touches a real downloaded model.
// Returns whether anything was removed.
async function purgePoisonedCache(): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  try {
    const cache = await caches.open(env.cacheKey)
    const keys = await cache.keys()
    let removed = false
    for (const request of keys) {
      if (new URL(request.url).origin === self.location.origin) {
        await cache.delete(request)
        removed = true
      }
    }
    if (removed) console.warn(LOG, 'purged stale same-origin cache entries')
    return removed
  } catch (err) {
    console.warn(LOG, 'failed to purge cache', err)
    return false
  }
}

// Delete every cached file for a model — both correctly-keyed remote entries
// and any stale same-origin ones — so a subsequent load re-fetches from scratch.
// The model's repo id appears in every cache key (the URL path), corrupt or not.
async function purgeModelCache(model: TranscribeWorkerModel): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(env.cacheKey)
    const id = MODEL_CONFIG[model].id
    let removed = 0
    for (const request of await cache.keys()) {
      if (request.url.includes(id) && (await cache.delete(request)))
        removed += 1
    }
    if (removed) console.warn(LOG, `purged ${removed} cached files for ${id}`)
  } catch (err) {
    console.warn(LOG, 'failed to purge model cache', err)
  }
}

// Explicitly download a model's weights into the browser cache. Opens the
// network gate for the duration of the load; only ever reaches a dedicated
// download worker, so this never affects a transcribe worker. With `force`, any
// existing (possibly corrupt) cached files are dropped first so the load can't
// reuse them.
async function download(
  model: TranscribeWorkerModel,
  force: boolean,
): Promise<void> {
  networkAllowed = true
  if (force) await purgeModelCache(model)
  const onProgress = (info: ProgressInfo) => {
    if (info.status === 'progress_total') {
      postMessage({
        type: 'download-progress',
        model,
        loaded: info.loaded,
        total: info.total,
      })
    }
  }
  try {
    await getPipeline(model, onProgress)
    postMessage({ type: 'download-ready', model })
  } catch (err) {
    // A failed load already evicts its cache entry from the pipeline map (see
    // getPipeline), so once we clear any poisoned browser-cache entry a fresh
    // load can re-fetch the real weights. Try that recovery exactly once.
    if (isPoisonedCacheError(err) && (await purgePoisonedCache())) {
      try {
        await getPipeline(model, onProgress)
        postMessage({ type: 'download-ready', model })
        return
      } catch (retryErr) {
        reportDownloadError(model, retryErr)
        return
      }
    }
    reportDownloadError(model, err)
  } finally {
    networkAllowed = false
  }
}

function reportDownloadError(model: TranscribeWorkerModel, err: unknown): void {
  console.error(LOG, 'download failed', err)
  postMessage({
    type: 'download-error',
    model,
    error: err instanceof Error ? err.message : String(err),
  })
}

// Serialize inference: onnxruntime sessions aren't re-entrant, so requests
// queue behind one another rather than running concurrently.
let queue: Promise<void> = Promise.resolve()

self.onmessage = ({ data }: MessageEvent<TranscribeWorkerInMessage>) => {
  if (data.type === 'transcribe') {
    queue = queue.then(() => transcribe(data))
  } else {
    void download(data.model, data.force ?? false)
  }
}
