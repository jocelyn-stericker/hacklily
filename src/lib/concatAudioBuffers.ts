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

import { resample } from './ResampleProcessor'

export function concatAudioBuffers(
  a: AudioBuffer,
  b: AudioBuffer,
): AudioBuffer {
  const sampleRate = Math.max(a.sampleRate, b.sampleRate)
  const numberOfChannels = Math.max(a.numberOfChannels, b.numberOfChannels)

  const aLen = Math.round((a.length * sampleRate) / a.sampleRate)
  const length = aLen + Math.round((b.length * sampleRate) / b.sampleRate)

  const result = new AudioBuffer({ numberOfChannels, length, sampleRate })
  const parts: [AudioBuffer, number][] = [
    [a, 0],
    [b, aLen],
  ]
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const out = result.getChannelData(channel)
    for (const [buf, offset] of parts) {
      if (channel < buf.numberOfChannels) {
        const data = buf.getChannelData(channel)
        out.set(
          buf.sampleRate === sampleRate
            ? data
            : resample(data, buf.sampleRate, sampleRate),
          offset,
        )
      }
    }
  }
  return result
}
