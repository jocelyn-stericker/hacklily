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

/**
 * Trigger download of a wav containing the audio buffer.
 *
 * Must be done in response to a click or other event.
 */
export function exportWav(buf: AudioBuffer) {
  const wavBuf = audioBufferToWav(buf)

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

// see https://github.com/Experience-Monks/audiobuffer-to-wav/blob/master/index.js
function audioBufferToWav(
  buffer: AudioBuffer,
  opt: { float32?: boolean } = {},
): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = opt.float32 ? WavFormat.Float32 : WavFormat.RawPcm
  const bitDepth = format === WavFormat.Float32 ? 32 : 16

  let result
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1))
  } else {
    result = buffer.getChannelData(0)
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth)
}

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

function interleave(inputL: Float32Array, inputR: Float32Array) {
  const result = new Float32Array(inputL.length + inputR.length)

  let index = 0
  let inputIndex = 0

  while (inputIndex < inputL.length) {
    result[index++] = inputL[inputIndex]!
    result[index++] = inputR[inputIndex]!
    inputIndex++
  }
  return result
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
