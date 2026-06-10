// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/// <reference lib="webworker" />

// Downloads the CUPE ONNX model from HuggingFace, accepts PCM audio with a
// sample rate and transcript from the main thread, resamples to 16 kHz, and runs
// the forced-alignment pipeline -- all off the UI thread.

import {
  createCupeSession,
  PhonemeTimestampAligner,
  phonemizeTranscript,
  ort,
} from '#/lib/alignment/index'
import type {
  PhonemeTimestamp,
  PhonemizedTranscript,
} from '#/lib/alignment/types'
import { resample } from '#/lib/analysis/ResampleProcessor'
import { getESpeak } from '#/lib/ipa/espeak'

const LAST_GOOD_CPU_ORT_VERSION = '1.24.3'
const LOG = '[AlignWorker]'

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

const MODEL_URL =
  'https://huggingface.co/jstericker/CUPE-2i-ONNX/resolve/main/onnx/en_libri1000_ua01c_e4_val_GER%3D0.2186_q8.onnx'

// The Cache API store transformers.js uses for model weights (its default
// `env.cacheKey`). We reuse it so the CUPE weights live alongside -- and are
// managed/evicted together with -- the transcription models, keyed by their
// remote URL exactly as transformers.js keys its own entries.
const TRANSFORMERS_CACHE_KEY = 'transformers-cache'

// ---------------------------------------------------------------------------
// Cached model download
// ---------------------------------------------------------------------------

/**
 * Fetch the model weights, serving them from (and populating) the shared
 * transformers.js browser cache. Streams the download so progress can be
 * reported. Falls back to a plain fetch if the Cache API is unavailable.
 */
async function fetchModelCached(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  let cache: Cache | undefined
  try {
    if (typeof caches !== 'undefined') {
      cache = await caches.open(TRANSFORMERS_CACHE_KEY)
    }
  } catch (err) {
    console.warn(`${LOG} cache unavailable`, err)
  }

  const cached = await cache?.match(url)
  if (cached) {
    return cached.arrayBuffer()
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to download alignment model: ${response.status} ${response.statusText}`,
    )
  }

  const total = Number(response.headers.get('content-length')) || 0
  const reader = response.body?.getReader()
  let bytes: Uint8Array<ArrayBuffer>
  if (reader) {
    const chunks: Uint8Array[] = []
    let loaded = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      onProgress?.(loaded, total)
    }
    bytes = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
  } else {
    bytes = new Uint8Array(await response.arrayBuffer())
    onProgress?.(bytes.length, bytes.length)
  }

  if (cache) {
    try {
      await cache.put(url, new Response(bytes, { headers: response.headers }))
    } catch (err) {
      console.warn(`${LOG} failed to cache alignment model`, err)
    }
  }

  return bytes.buffer
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export type AlignInMessage = {
  type: 'align'
  /** PCM audio data to align. */
  pcm: Float32Array
  /** Sample rate of the PCM data. */
  sampleRate: number
  /** Start time in seconds for offsetting timestamps. */
  startTime: number
  /** Transcript to align against (plain text, e.g. "butterfly"). */
  transcript: string
}

export type AlignOutMessage =
  | {
      type: 'progress'
      stage: string
      loaded?: number
      total?: number
    }
  | {
      type: 'result'
      phonemeTimestamps: PhonemeTimestamp[]
      spectralLength: number
      totalFrames: number
      phonemized: PhonemizedTranscript
    }
  | { type: 'error'; message: string }

export type AlignWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (msg: AlignInMessage, transfer?: Transferable[]) => void
  onmessage: ((ev: MessageEvent<AlignOutMessage>) => unknown) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<AlignOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

declare function postMessage(message: AlignOutMessage): void

// ---------------------------------------------------------------------------
// Lazy, cached state
// ---------------------------------------------------------------------------

let _session: PhonemeTimestampAligner | undefined
let _sessionPromise: Promise<PhonemeTimestampAligner> | undefined

function getSession(): Promise<PhonemeTimestampAligner> {
  if (_session) return Promise.resolve(_session)
  if (!_sessionPromise) {
    // TODO: Obviously, this model parallelizes very well. It would be nice to configure more threads when
    // the system allows.
    ort.env.wasm.numThreads = 1
    ort.env.wasm.wasmPaths = {
      mjs: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${LAST_GOOD_CPU_ORT_VERSION}/dist/ort-wasm-simd-threaded.mjs`,
      wasm: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${LAST_GOOD_CPU_ORT_VERSION}/dist/ort-wasm-simd-threaded.wasm`,
    }
    _sessionPromise = fetchModelCached(MODEL_URL, (loaded, total) => {
      postMessage({ type: 'progress', stage: 'download', loaded, total })
    })
      .then((model) => createCupeSession(model))
      .then((sess) => {
        _session = new PhonemeTimestampAligner(sess, {
          durationMax: 10,
        })
        return _session
      })
  }
  return _sessionPromise
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleAlign(msg: AlignInMessage): Promise<void> {
  const { pcm, sampleRate, startTime, transcript } = msg

  // 1. Phonemize via espeak
  const espeak = await getESpeak()
  const ipa = espeak.textToIPA(transcript, {
    sep: '|',
    keepStress: false,
    voice: 'en-us',
  })
  const phonemized = phonemizeTranscript(ipa)

  // 2. Download model
  console.time(`${LOG} ensureModel`)
  const session = await getSession()
  console.timeEnd(`${LOG} ensureModel`)

  // 3. Resample to 16 kHz
  const audio = resample(pcm, sampleRate, 16000)

  // 5. Align (timestamps offset by startTime for absolute times)
  const result = await session.align(audio, phonemized.ph66, startTime)

  postMessage({
    type: 'result',
    phonemeTimestamps: result.phonemeTimestamps,
    spectralLength: result.spectralLength,
    totalFrames: result.totalFrames,
    phonemized,
  })
}

self.onmessage = (ev: MessageEvent<AlignInMessage>): void => {
  handleAlign(ev.data).catch((err: unknown) => {
    postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    })
  })
}

void getSession()
