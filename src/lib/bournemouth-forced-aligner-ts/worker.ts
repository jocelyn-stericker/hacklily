/*
 * Dedicated Web Worker entry for the BFA TypeScript port.
 *
 * Message protocol (main thread -> worker):
 *   { type: "init", model, config?, wasmPaths?, numThreads?, simd? }
 *   { type: "align", id, audio, transcript?, ph66?, phonemize?, startOffsetSec? }
 *
 * Worker -> main thread:
 *   { type: "ready" }
 *   { type: "result", id, result, phonemized? }
 *   { type: "error", id?, message }
 *
 * `audio` is a Float32Array (16 kHz mono). Transfer its underlying buffer for
 * zero-copy: worker.postMessage(msg, [audio.buffer]).
 *
 * Provide EITHER `transcript` (espeak-ng IPA, phonemized in-worker) OR `ph66`
 * (pre-mapped indices). If both are given, `ph66` wins.
 *
 * Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
 * Copyright (C) Tabahi <tabahi@duck.com>.
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE at the repository root and ATTRIBUTION.md.
 */

import {
  ort,
  createCupeSession,
  PhonemeTimestampAligner,
  phonemizeTranscript,
} from './index.js'
import type { AlignerConfig, PhonemizeOptions } from './types.js'

type InitMessage = {
  type: 'init'
  model: ArrayBuffer | Uint8Array | string
  config?: AlignerConfig
  /** e.g. a CDN dir or bundled path holding ort-wasm*.wasm files. */
  wasmPaths?: string | Record<string, string>
  numThreads?: number
  simd?: boolean
}

type AlignMessage = {
  type: 'align'
  id: number
  audio: Float32Array
  transcript?: string
  ph66?: number[]
  phonemize?: PhonemizeOptions
  startOffsetSec?: number
}

type InboundMessage = InitMessage | AlignMessage

const ctx = self as unknown as DedicatedWorkerGlobalScope

let aligner: PhonemeTimestampAligner | null = null

async function handleInit(msg: InitMessage): Promise<void> {
  if (msg.wasmPaths !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ort.env.wasm as any).wasmPaths = msg.wasmPaths
  }
  if (msg.numThreads !== undefined) ort.env.wasm.numThreads = msg.numThreads
  if (msg.simd !== undefined) ort.env.wasm.simd = msg.simd

  const session = await createCupeSession(msg.model, {
    executionProviders: ['wasm'],
  })
  aligner = new PhonemeTimestampAligner(session, msg.config)
  ctx.postMessage({ type: 'ready' })
}

async function handleAlign(msg: AlignMessage): Promise<void> {
  if (!aligner)
    throw new Error("Worker not initialized: send an 'init' message first.")

  let ph66: number[]
  let phonemized: ReturnType<typeof phonemizeTranscript> | undefined
  if (msg.ph66 && msg.ph66.length > 0) {
    ph66 = msg.ph66
  } else if (msg.transcript !== undefined) {
    phonemized = phonemizeTranscript(msg.transcript, msg.phonemize)
    ph66 = phonemized.ph66
  } else {
    throw new Error("align message requires either 'ph66' or 'transcript'.")
  }

  const result = await aligner.align(msg.audio, ph66, msg.startOffsetSec ?? 0)
  ctx.postMessage({ type: 'result', id: msg.id, result, phonemized })
}

ctx.onmessage = (ev: MessageEvent<InboundMessage>) => {
  const msg = ev.data
  const handle = async () => {
    switch (msg.type) {
      case 'init':
        await handleInit(msg)
        break
      case 'align':
        await handleAlign(msg)
        break
      default:
        throw new Error(
          `Unknown message type: ${(msg as { type: string }).type}`,
        )
    }
  }
  handle().catch((err: unknown) => {
    const id = msg.type === 'align' ? msg.id : undefined
    ctx.postMessage({
      type: 'error',
      id,
      message: err instanceof Error ? err.message : String(err),
    })
  })
}
