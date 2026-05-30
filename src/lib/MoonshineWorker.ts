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

// Runs the bundled Moonshine speech-recognition model off the UI thread via
// transformers.js, which bundles its own onnxruntime-web and handles the mel
// front-end and detokenizer. The worker just feeds it 16 kHz mono PCM; the
// model weights and ort wasm download from the Hugging Face hub on first use.
import { env, pipeline } from '@huggingface/transformers'
import type {
  AutomaticSpeechRecognitionPipeline,
  ProgressInfo,
  PretrainedModelOptions,
} from '@huggingface/transformers'

import { resample } from './ResampleProcessor'

// Run onnxruntime-web single-threaded. Still adequete performance, much less memory use.
env.backends.onnx.wasm!.numThreads = 1
env.backends.onnx.wasm!.wasmPaths = {
  // We override this because the asyncify version does not play well with Safari iOS
  // TODO: use optimized ort files with a custom build of onnxruntime, like we do for VAD.
  mjs: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/ort-wasm-simd-threaded.mjs',
  wasm: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/ort-wasm-simd-threaded.wasm',
}

// Moonshine is trained on 16 kHz mono audio.
const MOONSHINE_SAMPLE_RATE = 16_000
const MODEL = 'onnx-community/moonshine-base-ONNX'
// transformers.js has no literal "quantized" dtype; "q8" is the value that maps
// to the *_quantized.onnx weights (see DEFAULT_DTYPE_SUFFIX_MAPPING).
const DTYPE = 'q8' as const
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
const LOG = '[MoonshineWorker]'

export type MoonshineWorkerInMessage = {
  type: 'transcribe'
  id: number
  pcm: Float32Array
  sampleRate: number
}

export type MoonshineWorkerOutMessage =
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id: number; error: string }
  | { type: 'download-progress'; loaded: number; total: number }
  | { type: 'download-ready' }

export type MoonshineWorker = Omit<Worker, 'postMessage' | 'onmessage'> & {
  postMessage: (
    msg: MoonshineWorkerInMessage,
    transfer?: Transferable[],
  ) => void
  onmessage: ((ev: MessageEvent<MoonshineWorkerOutMessage>) => unknown) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<MoonshineWorkerOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

declare function postMessage(message: MoonshineWorkerOutMessage): void

// The pipeline is loaded once, lazily, on the first transcription. A failed
// load clears the cache so a later request can retry (e.g. after a network
// blip downloading the weights).
let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null

function getPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  pipelinePromise ??= loadPipeline().catch((err: unknown) => {
    pipelinePromise = null
    throw err
  })
  return pipelinePromise
}

function loadPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  const options = {
    dtype: DTYPE,
    // onnxruntime-web's "extended" (Level 2) graph optimizer crashes trying to
    // fuse the quantized decoder's tied embed_tokens DequantizeLinear+MatMul
    // into MatMulNBits ("Missing required scale ... weight_merged_0_scale").
    // Capping at "basic" skips that pass, so ort-web runs the same valid
    // DQ+MatMul graph that ort-node does.
    session_options: { graphOptimizationLevel: 'basic' as const },
    // Forward aggregate download progress to the main thread so the UI can show
    // a modal during the one-time model download. transformers.js fires the
    // same progress events whether files are coming from the network or the
    // browser cache, so the consumer is responsible for suppressing the modal
    // on fast cache reads (see MoonshineDownloadModal).
    progress_callback: (info: ProgressInfo) => {
      if (info.status === 'progress_total') {
        postMessage({
          type: 'download-progress',
          loaded: info.loaded,
          total: info.total,
        })
      } else if (info.status === 'ready') {
        postMessage({ type: 'download-ready' })
      }
    },
  } satisfies PretrainedModelOptions
  console.log(LOG, 'loading pipeline', {
    model: MODEL,
    options,
    wasmThreads: env.backends.onnx.wasm?.numThreads,
    wasmProxy: env.backends.onnx.wasm?.proxy,
    webgpuAvailable: typeof navigator !== 'undefined' && 'gpu' in navigator,
  })
  return pipeline('automatic-speech-recognition', MODEL, options)
}

// Peak-normalize a chunk's PCM in place. These small models recognize quiet
// speech much better when the input is scaled up to use the full range; a chunk
// of pure silence (maxAbs === 0) is left untouched.
function normalize(pcm: Float32Array): void {
  let maxAbs = 0
  for (const sample of pcm) maxAbs = Math.max(maxAbs, Math.abs(sample))
  if (maxAbs === 0) return
  const gain = 1 / maxAbs
  pcm.forEach((sample, i) => {
    pcm[i] = sample * gain
  })
}

// Normalize a chunk's mono PCM, resample it to Moonshine's 16 kHz rate
function prepareAudio(pcm: Float32Array, sampleRate: number): Float32Array {
  // resample() returns a copy even when the rate already matches, so it's safe
  // to mutate `pcm` first — it's the worker's own copy of the posted buffer.
  normalize(pcm)
  return resample(pcm, sampleRate, MOONSHINE_SAMPLE_RATE)
}

async function transcribe(data: MoonshineWorkerInMessage): Promise<void> {
  try {
    console.log(LOG, `Transcribing ${data.pcm.length / data.sampleRate}s`)
    console.time(LOG + ' transcribe')
    const transcriber = await getPipeline()
    const audio = prepareAudio(data.pcm, data.sampleRate)
    const seconds = audio.length / MOONSHINE_SAMPLE_RATE
    const maxNewTokens = Math.min(
      DECODER_MAX_TOKENS,
      Math.max(MIN_NEW_TOKENS, Math.ceil(seconds * TOKENS_PER_SECOND)),
    )
    const output = await transcriber(audio, { max_new_tokens: maxNewTokens })
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

// Serialize inference: onnxruntime sessions aren't re-entrant, and the UI fires
// every pending chunk at once, so requests queue behind one another rather than
// running concurrently.
let queue: Promise<void> = Promise.resolve()

self.onmessage = ({ data }: MessageEvent<MoonshineWorkerInMessage>) => {
  queue = queue.then(() => transcribe(data))
}
