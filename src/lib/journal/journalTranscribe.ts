// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Journal transcript generation: decode a journal audio file, run VAD on a
// worker to split it into speech segments, transcribe each segment with the
// user's transcription settings, and write an SRT sidecar next to the audio.
//
// All heavy work (VAD, transcription) runs off the main thread. Decode happens
// on the main thread via AudioContext.decodeAudioData (one-shot, not streaming).
// This is probably fine.

import { autoTier } from '#/components/useChunkWorkQueue'
import type { SpeechSegment } from '#/lib/analysis/vadSegments'
import { AudioRope } from '#/lib/audio/AudioRope'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import type { TranscriptionMode } from '#/lib/settings'
import {
  ModelUnavailableError,
  runTranscriptionForEngine,
  tryResolveEngine,
} from '#/lib/transcription'
import type { TranscriptionEngine } from '#/lib/transcription'
import VadBatchWorkerCtor from '#/lib/workers/VadBatchWorker?worker'
import type {
  VadBatchWorker,
  VadBatchWorkerOutMessage,
} from '#/lib/workers/VadBatchWorker'

import { writeEntrySrt } from './journalFs'
import { formatSrt } from './journalSrt'

// A span over already-decoded audio has nothing to cancel, so it carries a
// never-aborting signal like in AudioSpan.ts, which keeps this const
// private. We only need it to satisfy the AudioSpan shape.
const NEVER_ABORT = new AbortController().signal

const LOG = '[journalTranscribe]'

/** Status reported as transcription progresses, for the route to surface. */
export type TranscribeStatus =
  | { kind: 'idle' }
  | {
      kind: 'running'
      phase: 'decoding' | 'vad' | 'transcribing'
      done: number
      total: number
    }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

export interface TranscribeEntryOptions {
  /** The audio file to transcribe. */
  file: File
  /** Directory handle holding the entry, for writing the SRT sidecar. */
  handle: FileSystemDirectoryHandle
  /** The audio entry's filename (used to derive the sidecar name). */
  audioName: string
  /** Current transcription mode (drives which engine runs). */
  mode: TranscriptionMode
  /**
   * Override the tier resolved from `mode`. Used by "improve transcript" to
   * force `large` (Whisper) regardless of the user's setting. When set, this
   * takes precedence over the `autoTier` policy.
   */
  forceTier?: 'small' | 'large' | 'cloud'
  /** Called on each status change; the route uses this to update the UI. */
  onStatus?: (status: TranscribeStatus) => void
  /** Abort the job before it completes. */
  signal?: AbortSignal
}

/**
 * Decode an audio file to mono PCM at its native sample rate. Throws on a
 * decode failure (corrupt or unsupported file). The caller owns the buffer.
 */
async function decodeToMono(
  file: File,
): Promise<{ mono: Float32Array; sampleRate: number }> {
  const arrayBuffer = await file.arrayBuffer()
  let ctx: AudioContext | null = null
  try {
    ctx = new AudioContext()
    const buffer = await ctx.decodeAudioData(arrayBuffer)
    const { numberOfChannels, length, sampleRate } = buffer
    const mono = new Float32Array(length)
    for (let c = 0; c < numberOfChannels; c++) {
      const ch = buffer.getChannelData(c)
      for (let i = 0; i < length; i++) mono[i]! += ch[i]! / numberOfChannels
    }
    return { mono, sampleRate }
  } finally {
    ctx?.close().catch(() => {})
  }
}

/** Run VAD on a worker thread; reject on error or if aborted. Sends a copy of
 * `mono` (not a transfer) so the caller still owns the buffer for downstream use
 * (the AudioRope the segments are transcribed from). */
function runVadOnWorker(
  mono: Float32Array,
  sampleRate: number,
  signal?: AbortSignal,
): Promise<SpeechSegment[]> {
  return new Promise<SpeechSegment[]>((resolve, reject) => {
    const worker = new VadBatchWorkerCtor() as VadBatchWorker
    const cleanup = () => {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal) {
      if (signal.aborted) return onAbort()
      signal.addEventListener('abort', onAbort, { once: true })
    }
    worker.onmessage = ({ data }: MessageEvent<VadBatchWorkerOutMessage>) => {
      if (signal) signal.removeEventListener('abort', onAbort)
      cleanup()
      if ('ok' in data) resolve(data.ok)
      else reject(new Error(data.error))
    }
    worker.onerror = () => {
      if (signal) signal.removeEventListener('abort', onAbort)
      cleanup()
      reject(new Error('VAD worker failed'))
    }
    // Copy the buffer: the worker gets its own, and `mono` stays intact for the
    // AudioRope the segments are transcribed from. (Transferring would detach
    // `mono` on this side, leaving it zero-filled)
    const copy = mono.slice()
    worker.postMessage({ mono: copy, sampleRate }, [
      copy.buffer as Transferable,
    ])
  })
}

/**
 * Transcribe one journal entry end-to-end: decode, VAD, transcribe each
 * segment, and write the SRT sidecar. Resolves with a {@link TranscribeStatus}
 * of `done` or `error`. No-op (resolves `done`) when `mode` is `disabled` or
 * the recording has no speech segments.
 */
export async function transcribeEntry({
  file,
  handle,
  audioName,
  mode,
  forceTier,
  onStatus,
  signal,
}: TranscribeEntryOptions): Promise<TranscribeStatus> {
  if (mode === 'disabled' && !forceTier) {
    const idle = { kind: 'idle' as const }
    onStatus?.(idle)
    return idle
  }

  const report = (s: TranscribeStatus) => onStatus?.(s)

  try {
    // Resolve the engine up front so a missing model fails fast, before the
    // decode/VAD work. Use the same tier policy as the analysis tool: `large`
    // falls back to `small`, never running the heavy Whisper model
    // automatically. `forceTier` overrides this for "improve transcript".
    const tier = forceTier ?? autoTier(mode, false)
    if (tier === null) {
      const idle = { kind: 'idle' as const }
      report(idle)
      return idle
    }
    // `autoTier` with `upgrade=false` only returns 'small', 'cloud', or null
    const engine: TranscriptionEngine | null = await tryResolveEngine(
      tier as Exclude<TranscriptionMode, 'disabled'>,
    )
    if (engine === null) {
      const err = {
        kind: 'error' as const,
        message:
          'Transcription model not downloaded. Open Settings to download it.',
      }
      report(err)
      return err
    }

    report({ kind: 'running', phase: 'decoding', done: 0, total: 0 })
    const { mono, sampleRate } = await decodeToMono(file)
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    report({ kind: 'running', phase: 'vad', done: 0, total: 0 })
    const segments = await runVadOnWorker(mono, sampleRate, signal)
    if (segments.length === 0) {
      // No speech: write an empty SRT so backfill doesn't retry, and report done.
      await writeEntrySrt(handle, audioName, '')
      const done = { kind: 'done' as const }
      report(done)
      return done
    }

    // Build an AudioRope over the whole clip so segments can be transcribed as
    // AudioSpans. The rope never grows; seal it in one shot.
    const rope = new AudioRope(sampleRate)
    rope.seal(mono)

    const total = segments.length
    const results: Array<SpeechSegment & { text: string }> = []
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const seg = segments[i]!
      report({ kind: 'running', phase: 'transcribing', done: i, total })
      const span: AudioSpan = {
        rope,
        startTime: seg.startSec,
        endTime: Promise.resolve(seg.endSec),
        signal: NEVER_ABORT,
      }
      const text = await runTranscriptionForEngine(engine, span)
      results.push({ ...seg, text })
    }

    const srt = formatSrt(results)
    await writeEntrySrt(handle, audioName, srt)

    console.info(LOG, 'transcribed', audioName, ':', total, 'segments')
    const done = { kind: 'done' as const }
    report(done)
    return done
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      const idle = { kind: 'idle' as const }
      report(idle)
      return idle
    }
    const message =
      err instanceof ModelUnavailableError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Transcription failed'
    console.error(LOG, 'failed for', audioName, ':', err)
    const error = { kind: 'error' as const, message }
    report(error)
    return error
  }
}

/**
 * Decode an audio file, run VAD, and return an SRT skeleton: one cue per speech
 * segment with `<voiced>` as placeholder text. Used to seed the SRT editor when
 * no transcript sidecar exists yet (e.g. transcription is disabled or hasn't
 * run). Returns an empty string if no speech segments are found.
 */
export async function generateSrtSkeleton(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  const { mono, sampleRate } = await decodeToMono(file)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const segments = await runVadOnWorker(mono, sampleRate, signal)
  if (segments.length === 0) return ''
  return formatSrt(segments.map((seg) => ({ ...seg, text: '<voiced>' })))
}
