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
  console.log(offlineCtx)
  const result = offlineCtx.createBuffer(numberOfChannels, length, sampleRate)
  for (let c = 0; c < numberOfChannels; c++) {
    const out = result.getChannelData(c)
    if (c < a.numberOfChannels) out.set(a.getChannelData(c), 0)
    if (c < b.numberOfChannels) out.set(b.getChannelData(c), a.length)
  }
  return result
}
