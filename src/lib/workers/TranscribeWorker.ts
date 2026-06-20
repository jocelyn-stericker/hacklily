// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/// <reference lib="webworker" />

// Bundled speech-recognition worker (transformers.js). Network is open only
// during `download`; `transcribe` uses only cached weights.
// Reused via the shared pool in transcribeBundled.ts.
import { env, pipeline } from '@huggingface/transformers'
import type {
  AutomaticSpeechRecognitionPipeline,
  ProgressInfo,
  PretrainedModelOptions,
} from '@huggingface/transformers'

import { resample } from '#/lib/analysis/ResampleProcessor'
import { loudnessGain, measureLoudness } from '#/lib/loudness'
import { ortMjsUrl, ortWasmUrl } from '#/lib/ortWasmUrls'

// transformers.js won't use the cache without an "allowed" source. We can't use
// `allowLocalModels` -- it fetches `/models/...` which our SPA serves as index.html,
// poisoning the cache. So `allowRemoteModels = true` unlocks the cache path.
//
// But that would silently download ~540 MB on a miss. We gate `env.fetch` to
// throw unless `networkAllowed` is set, so a cache miss throws instead of
// downloading. (`local_files_only: true` requires `allowLocalModels` -- poisoning.)
env.allowRemoteModels = true
env.allowLocalModels = false

// Prefixes load failures to distinguish them from inference failures.
// transcription.ts matches this string -- duplicated since it can't import here.
const MODEL_LOAD_FAILED_MARKER = 'transcription model could not be loaded'

// Appears in load-failure detail when the offline gate fires.
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
  // transformers.js dtype: "q8" -> *_quantized.onnx; "q4f16" -> 4-bit WebGPU weights.
  options: PretrainedModelOptions
}

const MODEL_CONFIG: Record<TranscribeWorkerModel, ModelConfig> = {
  moonshine: {
    id: 'jstericker/braat-ort-models',
    options: {
      dtype: 'q8',
      session_options: { graphOptimizationLevel: 'disabled' },
    },
  },
  whisper: {
    id: 'onnx-community/whisper-large-v3-turbo',
    options: {
      dtype: 'q4f16',
      device: 'webgpu',
    },
  },
}

// Hard ceiling matching max_position_embeddings; real chunks stop on EOS.
const DECODER_MAX_TOKENS = 512
// Prevents infinite decode; transformers.js default is too low.
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
  // `force` purges cached files first, for corrupt-cache recovery.
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

// Lazy-loaded once per model; a failed load clears the entry so a retry can land.
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

// Multiple threads are silly for moonshine, unstable for whisper.
env.backends.onnx.wasm!.numThreads = 1

// Pinned ORT build for Moonshine: threaded asyncify breaks Safari iOS.
// `numThreads = 1` also avoids needing cross-origin isolation for SharedArrayBuffer.
function configureMoonshineBackend(): void {
  const wasm = env.backends.onnx.wasm
  if (!wasm) return
  wasm.wasmPaths = { mjs: ortMjsUrl, wasm: ortWasmUrl }
}

function loadPipeline(
  model: TranscribeWorkerModel,
  onProgress?: (info: ProgressInfo) => void,
): Promise<AutomaticSpeechRecognitionPipeline> {
  if (model === 'moonshine') configureMoonshineBackend()
  const config = MODEL_CONFIG[model]
  const options: PretrainedModelOptions = {
    ...config.options,
    // Only set on the download path; transcribe passes no callback.
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

function prepareAudio(pcm: Float32Array, sampleRate: number): Float32Array {
  // resample() returns a copy; mutating pcm is safe.
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
      // Tag load failures with the marker so transcription.ts can revert download state.
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

// SPA fallback HTML (200) can shadow config files, causing JSON SyntaxErrors.
function isPoisonedCacheError(err: unknown): boolean {
  if (err instanceof SyntaxError) return true
  const message = err instanceof Error ? err.message : String(err)
  return /JSON|Unexpected (token|character)/i.test(message)
}

// Evict same-origin cache entries that shadow real weights (keyed by huggingface.co).
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

// Delete all cached files for a model so the next load re-fetches from scratch.
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

// Download with the network gate open. `force` purges cached files first.
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
    // Purge poisoned cache and retry once.
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

// onnxruntime sessions aren't re-entrant; serialize inference requests.
let queue: Promise<void> = Promise.resolve()

self.onmessage = ({ data }: MessageEvent<TranscribeWorkerInMessage>) => {
  if (data.type === 'transcribe') {
    queue = queue.then(() => transcribe(data))
  } else {
    void download(data.model, data.force ?? false)
  }
}
