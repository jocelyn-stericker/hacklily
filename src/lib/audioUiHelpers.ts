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

import type { AnalysisChunk } from './analysis'

const LN10_10 = 10 / Math.log(10)

export function computeDbBounds(
  chunks: AnalysisChunk[],
  from = 0,
  to = Infinity,
): { min: number; max: number } | null {
  let minDb = Infinity
  let maxDb = -Infinity
  let idx = 0
  outer: for (const chunk of chunks) {
    for (const frame of chunk.frames) {
      if (idx >= to) break outer
      if (idx >= from) {
        for (const raw of frame.spectrum) {
          if (raw > 0) {
            const db = LN10_10 * Math.log(raw)
            if (db < minDb) minDb = db
            if (db > maxDb) maxDb = db
          }
        }
      }
      idx++
    }
  }
  if (!isFinite(minDb)) return null
  return { min: Math.max(minDb, -120), max: maxDb }
}

export async function importAudioFile(file: File): Promise<{
  analysis: AnalysisChunk[]
  dbBounds: { min: number; max: number } | null
  buffer: AudioBuffer
}> {
  const audioImporter = new Worker(
    new URL('./importWorker.ts', import.meta.url),
  )
  console.time('import: decode')
  const arrayBuffer = await file.arrayBuffer()

  const ctx = new AudioContext({ sampleRate: 44100 })
  const newAudioBuffer = await ctx.decodeAudioData(arrayBuffer)
  await ctx.close()

  const {
    numberOfChannels,
    length,
    sampleRate: fileSampleRate,
  } = newAudioBuffer

  const mono = new Float32Array(length)
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = newAudioBuffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      mono[i]! += ch[i]! / numberOfChannels
    }
  }
  console.timeEnd('import: decode')

  audioImporter.postMessage({ mono, fileSampleRate })
  return new Promise((resolve, reject) => {
    audioImporter.onmessage = ({
      data,
    }: MessageEvent<{ ok: AnalysisChunk } | { error: string }>) => {
      audioImporter.terminate()
      if ('ok' in data) {
        const analysisSamples = data.ok.timeStepSamples * data.ok.frames.length

        // Fit it to the analysis samples, keep it mono
        const shortenedMono = new AudioBuffer({
          length: analysisSamples,
          numberOfChannels: 1,
          sampleRate: 44100,
        })
        shortenedMono.copyToChannel(mono, 0)

        const chunks: AnalysisChunk[] = [data.ok]
        resolve({
          analysis: chunks,
          dbBounds: computeDbBounds(chunks),
          buffer: shortenedMono,
        })
      } else {
        reject(data.error)
      }
    }
  })
}

export function concatAudioBuffers(
  a: AudioBuffer,
  b: AudioBuffer,
): AudioBuffer {
  const sampleRate = a.sampleRate
  const numberOfChannels = Math.max(a.numberOfChannels, b.numberOfChannels)
  const length = a.length + b.length
  const offlineCtx = new OfflineAudioContext(
    numberOfChannels,
    length,
    sampleRate,
  )
  const result = offlineCtx.createBuffer(numberOfChannels, length, sampleRate)
  for (let c = 0; c < numberOfChannels; c++) {
    const out = result.getChannelData(c)
    if (c < a.numberOfChannels) out.set(a.getChannelData(c), 0)
    if (c < b.numberOfChannels) out.set(b.getChannelData(c), a.length)
  }
  return result
}
