// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AudioRope } from '#/lib/audio/AudioRope'
import { loudnessGain, measureLoudness } from '#/lib/loudness'

/** Read a whole rope's PCM and measure its loudness-normalization gain. */
export function measureRopeGain(rope: AudioRope): number {
  const pcm = new Float32Array(rope.length)
  rope.read(pcm, 0, 0, rope.length)
  return loudnessGain(measureLoudness(pcm, rope.sampleRate))
}

/**
 * Caches the per-recording loudness gain for each `AudioRope`, so playback
 * and export apply the same value and don't re-measure on every play.
 *
 * Keyed on rope identity plus length: a finalized rope is stable, so it hits
 * the cache; a rope that has grown since it was measured (only possible if it
 * were measured mid-recording) misses and re-measures. Playback and recording
 * never overlap in practice, so the growing case is just a safety net.
 */
export class RopeGainCache {
  #cache = new WeakMap<AudioRope, { length: number; gain: number }>()

  gainFor(rope: AudioRope): number {
    const cached = this.#cache.get(rope)
    if (cached && cached.length === rope.length) return cached.gain
    const gain = rope.length > 0 ? measureRopeGain(rope) : 1
    this.#cache.set(rope, { length: rope.length, gain })
    return gain
  }

  gainsFor(ropes: AudioRope[]): number[] {
    return ropes.map((rope) => this.gainFor(rope))
  }
}
