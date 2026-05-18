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

// Helpers for importing audio files, concatenating buffers, and computing dB scaling bounds.

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
