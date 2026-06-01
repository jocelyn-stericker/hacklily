/* Braat, originally from Experience-Monks/audiobuffer-to-wav
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (c) 2015 Jam3
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

import { resample } from './ResampleProcessor'
import type { SabRope } from './SabRope'

/**
 * Trigger download of a wav containing the ropes laid end-to-end.
 *
 * Must be done in response to a click or other event.
 */
export function exportWav(ropes: SabRope[]) {
  const wavBuf = ropesToWav(ropes)

  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19)
  const url = URL.createObjectURL(new Blob([wavBuf], { type: 'audio/wav' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `braat-${ts}.wav`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

enum WavFormat {
  RawPcm = 1,
  Float32 = 3,
}

/**
 * Encode mono PCM from one or more {@link SabRope}s laid end-to-end as a 16-bit
 * WAV. Ropes may carry different sample rates (e.g. recordings appended under
 * changed device settings); each is resampled to the highest rate present and
 * concatenated, matching how the playback worklet treats the same ropes.
 */
export function ropesToWav(ropes: SabRope[]): ArrayBuffer {
  const sampleRate =
    ropes.reduce((max, rope) => Math.max(max, rope.sampleRate), 0) || 44100

  const parts: Float32Array[] = []
  let total = 0
  for (const rope of ropes) {
    const pcm = new Float32Array(rope.length)
    rope.read(pcm, 0, 0, rope.length)
    const part =
      rope.sampleRate === sampleRate
        ? pcm
        : resample(pcm, rope.sampleRate, sampleRate)
    parts.push(part)
    total += part.length
  }

  const merged = new Float32Array(total)
  let offset = 0
  for (const part of parts) {
    merged.set(part, offset)
    offset += part.length
  }

  return encodeWAV(merged, WavFormat.RawPcm, sampleRate, 1, 16)
}

// WAV encoder adapted from
// https://github.com/Experience-Monks/audiobuffer-to-wav/blob/master/index.js
function encodeWAV(
  samples: Float32Array,
  format: WavFormat,
  sampleRate: number,
  numChannels: number,
  bitDepth: 16 | 32,
) {
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  const dataByteLength = samples.length * bytesPerSample

  const buffer = new ArrayBuffer(44 + dataByteLength)
  const view = new DataView(buffer)

  /* RIFF identifier */
  writeString(view, 0, 'RIFF')
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataByteLength, true)
  /* RIFF type */
  writeString(view, 8, 'WAVE')
  /* format chunk identifier */
  writeString(view, 12, 'fmt ')
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (raw) */
  view.setUint16(20, format, true)
  /* channel count */
  view.setUint16(22, numChannels, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true)
  /* bits per sample */
  view.setUint16(34, bitDepth, true)
  /* data chunk identifier */
  writeString(view, 36, 'data')
  /* data chunk length */
  view.setUint32(40, dataByteLength, true)
  if (format === WavFormat.RawPcm) {
    floatTo16BitPCM(view, 44, samples)
  } else {
    writeFloat32(view, 44, samples)
  }

  return buffer
}

function writeFloat32(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i]!, true)
  }
}

function floatTo16BitPCM(
  output: DataView,
  offset: number,
  input: Float32Array,
) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]!))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
