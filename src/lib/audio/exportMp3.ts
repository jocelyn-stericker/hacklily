// SPDX-License-Identifier: AGPL-3.0-or-later
// Braat
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { registerMp3Encoder } from '@mediabunny/mp3-encoder'
import {
  AudioBufferSource,
  BufferTarget,
  canEncodeAudio,
  Mp3OutputFormat,
  Output,
  QUALITY_HIGH,
} from 'mediabunny'

import { resample } from '#/lib/analysis/ResampleProcessor'

import type { AudioRope } from './AudioRope'

/**
 * Trigger download of an MP3 containing the ropes laid end-to-end.
 *
 * @param gains one loudness-normalization per rope, all 1s for raw signal
 * See `RopeGainCache`.
 *
 * Must be done in response to a click or other event. Encoding is async; the
 * returned promise resolves once the download has been triggered.
 */
export async function exportMp3(ropes: AudioRope[], gains: number[]) {
  const mp3 = await ropesToMp3(ropes, gains)

  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19)
  const url = URL.createObjectURL(new Blob([mp3], { type: 'audio/mpeg' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `braat-${ts}.mp3`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// LAME has no native browser encoder, so registering mediabunny's WASM encoder
// is generally required. Guarded so we don't clobber a native one if it ever
// lands, and so we only register once per session.
let mp3EncoderReady = false
async function ensureMp3Encoder() {
  if (mp3EncoderReady) return
  if (!(await canEncodeAudio('mp3'))) registerMp3Encoder()
  mp3EncoderReady = true
}

/**
 * Encode mono PCM from one or more `AudioRope`s laid end-to-end as an MP3.
 * Ropes may carry different sample rates (e.g. recordings appended under
 * changed device settings); each is resampled to the highest rate present and
 * concatenated, matching how the playback worklet treats the same ropes.
 *
 * `gains[i]` scales rope `i` for loudness normalization, applied before
 * resampling (gain is linear, so it commutes). Matches the playback worklet so
 * the exported file sounds like what was played.
 */
export async function ropesToMp3(
  ropes: AudioRope[],
  gains: number[],
): Promise<Uint8Array<ArrayBuffer>> {
  const { samples, sampleRate } = mergeRopes(ropes, gains)

  await ensureMp3Encoder()

  const audioBuffer = new AudioBuffer({
    length: Math.max(samples.length, 1),
    numberOfChannels: 1,
    sampleRate,
  })
  audioBuffer.copyToChannel(samples, 0)

  const output = new Output({
    format: new Mp3OutputFormat(),
    target: new BufferTarget(),
  })
  const source = new AudioBufferSource({ codec: 'mp3', bitrate: QUALITY_HIGH })
  output.addAudioTrack(source)

  await output.start()
  if (samples.length > 0) await source.add(audioBuffer)
  source.close()
  await output.finalize()

  const buffer = output.target.buffer
  if (!buffer) throw new Error('MP3 export produced no data')
  return new Uint8Array(buffer)
}

/**
 * Lay ropes end-to-end into a single mono `Float32Array`, resampling each to
 * the highest rate present and applying its per-rope gain. Returns the merged
 * PCM and the common sample rate.
 */
export function mergeRopes(
  ropes: AudioRope[],
  gains: number[],
): { samples: Float32Array<ArrayBuffer>; sampleRate: number } {
  const sampleRate =
    ropes.reduce((max, rope) => Math.max(max, rope.sampleRate), 0) || 44100

  const parts: Float32Array[] = []
  let total = 0
  for (let i = 0; i < ropes.length; i += 1) {
    const rope = ropes[i]!
    const gain = gains[i] ?? 1
    const pcm = new Float32Array(rope.length)
    rope.read(pcm, 0, 0, rope.length)
    if (gain !== 1) {
      for (let j = 0; j < pcm.length; j += 1) pcm[j] = pcm[j]! * gain
    }
    const part =
      rope.sampleRate === sampleRate
        ? pcm
        : resample(pcm, rope.sampleRate, sampleRate)
    parts.push(part)
    total += part.length
  }

  const samples = new Float32Array(total)
  let offset = 0
  for (const part of parts) {
    samples.set(part, offset)
    offset += part.length
  }

  return { samples, sampleRate }
}
