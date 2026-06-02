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

import { loudnessGain, measureLoudness } from './loudness'
import type { SabRope } from './SabRope'

/** Read a whole rope's PCM and measure its loudness-normalization gain. */
export function measureRopeGain(rope: SabRope): number {
  const pcm = new Float32Array(rope.length)
  rope.read(pcm, 0, 0, rope.length)
  return loudnessGain(measureLoudness(pcm, rope.sampleRate))
}

/**
 * Caches the per-recording loudness gain for each `SabRope`, so playback
 * and export apply the same value and don't re-measure on every play.
 *
 * Keyed on rope identity plus length: a finalized rope is stable, so it hits
 * the cache; a rope that has grown since it was measured (only possible if it
 * were measured mid-recording) misses and re-measures. Playback and recording
 * never overlap in practice, so the growing case is just a safety net.
 */
export class RopeGainCache {
  #cache = new WeakMap<SabRope, { length: number; gain: number }>()

  gainFor(rope: SabRope): number {
    const cached = this.#cache.get(rope)
    if (cached && cached.length === rope.length) return cached.gain
    const gain = rope.length > 0 ? measureRopeGain(rope) : 1
    this.#cache.set(rope, { length: rope.length, gain })
    return gain
  }

  gainsFor(ropes: SabRope[]): number[] {
    return ropes.map((rope) => this.gainFor(rope))
  }
}
