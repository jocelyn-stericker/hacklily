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

// Downloads the CUPE ONNX model from HuggingFace, accepts a rope with a time
// range and transcript from the main thread, resamples to 16 kHz, and runs the
// forced-alignment pipeline — all off the UI thread.

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
import { SabRope } from '#/lib/audio/SabRope'
import type { SabRopeShare } from '#/lib/audio/SabRope'
import { getESpeak } from '#/lib/ipa/espeak'

const LAST_GOOD_CPU_ORT_VERSION = '1.24.3'
const LOG = '[AlignWorker]'

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

const MODEL_URL =
  'https://huggingface.co/jstericker/CUPE-2i-ONNX/resolve/main/onnx/en_libri1000_ua01c_e4_val_GER%3D0.2186_q8.onnx'

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export type AlignInMessage = {
  type: 'align'
  /** Shared audio rope containing the recording. */
  rope: SabRopeShare
  /** Start time in seconds within the rope. */
  startTime: number
  /** End time in seconds within the rope. */
  endTime: number
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
  postMessage: (msg: AlignInMessage) => void
  onmessage: ((ev: MessageEvent<AlignOutMessage>) => unknown) | null
  addEventListener: (
    type: 'message',
    listener: (ev: MessageEvent<AlignOutMessage>) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void
}

declare function postMessage(message: AlignOutMessage): void

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendProgress(stage: string, loaded?: number, total?: number): void {
  postMessage({ type: 'progress', stage, loaded, total })
}

/** Stream a fetch with progress updates. */
async function fetchWithProgress(
  url: string,
  label: string,
): Promise<ArrayBuffer> {
  sendProgress(`downloading-${label}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download ${url} (${res.status})`)
  }

  const total = Number(res.headers.get('content-length')) || undefined

  if (!total || !res.body) {
    const buf = await res.arrayBuffer()
    sendProgress(`downloaded-${label}`, buf.byteLength, buf.byteLength)
    return buf
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    sendProgress(`downloading-${label}`, loaded, total)
  }

  const combined = new Uint8Array(loaded)
  let pos = 0
  for (const chunk of chunks) {
    combined.set(chunk, pos)
    pos += chunk.length
  }
  sendProgress(`downloaded-${label}`, loaded, total)
  return combined.buffer
}

// ---------------------------------------------------------------------------
// Lazy, cached state
// ---------------------------------------------------------------------------

let modelBuffer: ArrayBuffer | null = null
let aligner: PhonemeTimestampAligner | null = null

async function ensureModel(): Promise<void> {
  if (modelBuffer) return

  modelBuffer = await fetchWithProgress(MODEL_URL, 'model')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(ort.env.wasm as any).wasmPaths = {
  mjs: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${LAST_GOOD_CPU_ORT_VERSION}/dist/ort-wasm-simd-threaded.mjs`,
  wasm: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${LAST_GOOD_CPU_ORT_VERSION}/dist/ort-wasm-simd-threaded.wasm`,
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleAlign(msg: AlignInMessage): Promise<void> {
  const { rope: ropeShare, startTime, endTime, transcript } = msg

  // 1. Phonemize via espeak
  sendProgress('espeak')
  const espeak = await getESpeak()
  const ipa = espeak.textToIPA(transcript, {
    sep: '|',
    keepStress: false,
    voice: 'en-us',
  })
  const phonemized = phonemizeTranscript(ipa)

  // 2. Download model
  sendProgress('model')
  console.time(`${LOG} ensureModel`)
  await ensureModel()
  console.timeEnd(`${LOG} ensureModel`)

  // 3. Read audio from rope and resample to 16 kHz
  sendProgress('reading-audio')
  const rope = new SabRope(ropeShare)
  const startSample = Math.round(startTime * rope.sampleRate)
  const endSample = Math.min(Math.round(endTime * rope.sampleRate), rope.length)
  const count = Math.max(0, endSample - startSample)
  const pcm = new Float32Array(count)
  if (count > 0) rope.read(pcm, startSample, 0, count)

  sendProgress('resampling')
  const audio = resample(pcm, rope.sampleRate, 16000)

  // 4. Configure onnxruntime-wasm and create the CUPE session / aligner
  if (!aligner) {
    sendProgress('configuring-ort')

    sendProgress('creating-session')
    const session = await createCupeSession(new Uint8Array(modelBuffer!))
    aligner = new PhonemeTimestampAligner(session, {
      durationMax: 10,
    })
  }

  // 5. Align (timestamps offset by startTime for absolute times)
  sendProgress('aligning')
  const result = await aligner.align(audio, phonemized.ph66, startTime)

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
