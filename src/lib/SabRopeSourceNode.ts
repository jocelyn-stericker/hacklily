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

import { ResamplerStreamProcessor } from './ResampleProcessor'
import { SabRope } from './SabRope'
import type { SabRopeGrow, SabRopeShare } from './SabRope'

export interface RopeInitMessage {
  type: 'setBuffer'
  ropes: Array<SabRopeShare>
}

export interface RopeGrowLastMessage {
  type: 'growLastRope'
  grow: SabRopeGrow
}

export interface RopeStartMessage {
  type: 'start'
  timeSec: number
}

export type AudioRopeSourceNodeMessage =
  | RopeInitMessage
  | RopeGrowLastMessage
  | RopeStartMessage
  | null

export type AudioRopeSourceNodeNode = Omit<AudioWorkletNode, 'port'> & {
  port: { postMessage: (msg: AudioRopeSourceNodeMessage) => void }
}

/** Source samples fed per `feed()` call. Bounds the over-feed of the resampler
 * ring; small enough that one render quantum needs only a handful of feeds. */
const FEED_CHUNK = 128

/**
 * Audio worklet that writes one or more SabRopes to output in realtime.
 *
 * The ropes are laid end-to-end on a single timeline: rope 0 plays first, then
 * rope 1, and so on. Each rope carries its own sample rate. A rope already at
 * the output rate is read straight through; a rope at a different rate is run
 * through a {@link ResamplerStreamProcessor}, whose windowed-sinc kernel
 * anti-aliases on downsampling.
 *
 * Playback is a forward stream with a single random-access seek per `start`.
 * On seek the resampler is primed `kernelHalf` samples ahead of the target so
 * its kernel sees real audio on both sides (no fade-in transient); the warm-up
 * output is discarded. Rope-to-rope joins start a fresh resampler, so the
 * trailing/leading ~`kernelHalf` samples at a join taper — inherent to mixing
 * independent recordings at independent rates.
 *
 * The final rope may still be growing on the producer side: post `setBuffer`
 * with the rope shares, `growLastRope` after every producer `append` (to ship
 * the segment buffers the shared `length` already points at), `start` to seek
 * and begin playback, and `null` to pause.
 *
 * Load it:
 * ```
 * import audioWorkletUrl from '#/lib/SabRopeSourceNode?worker&url'
 * await context.audioWorklet.addModule(audioWorkletUrl)
 * workletNode = new AudioWorkletNode(context, 'sab-rope-source-node')
 * ```
 */
export class AudioRopeSourceNode extends AudioWorkletProcessor {
  /** Ropes laid end-to-end; the last one may still be growing. */
  #ropes: Array<SabRope> = []
  #playing = false

  /** Index of the rope currently being played; -1 when not started. */
  #curRope = -1
  /** Next source sample (within `#ropes[#curRope]`) to feed/read. */
  #inputCursor = 0
  /** Resampler for the current rope, or null when it plays through unresampled. */
  #resampler: ResamplerStreamProcessor | null = null
  /** Output samples still to discard for seek priming. */
  #dropOutput = 0

  /** Scratch for feeding the resampler and for draining discarded warm-up. */
  #scratch = new Float32Array(FEED_CHUNK)

  constructor() {
    super()
    this.port.onmessage = ({
      data,
    }: MessageEvent<AudioRopeSourceNodeMessage>) => {
      if (data === null) {
        // Pause; keep ropes and position so a later `start` can resume.
        this.#playing = false
        return
      }

      switch (data.type) {
        case 'setBuffer': {
          this.#ropes = data.ropes.map((share) => new SabRope(share))
          this.#playing = false
          this.#curRope = -1
          this.#resampler = null
          break
        }
        case 'growLastRope': {
          this.#ropes[this.#ropes.length - 1]?.grow(data.grow)
          break
        }
        case 'start': {
          this.#seek(data.timeSec)
          break
        }
      }
    }
  }

  /** Seek to `time` seconds on the concatenated timeline and begin playing. */
  #seek(time: number) {
    let cumulative = 0
    for (let r = 0; r < this.#ropes.length; r += 1) {
      const rope = this.#ropes[r]!
      const dur = rope.length / rope.sampleRate
      // Land on this rope if `time` falls within it, or on the last rope for
      // anything at/past the end (so live playback can start at the write head).
      if (time < cumulative + dur || r === this.#ropes.length - 1) {
        const localSrc = Math.min(
          Math.max(0, (time - cumulative) * rope.sampleRate),
          rope.length,
        )
        this.#startRope(r, localSrc)
        this.#playing = true
        return
      }
      cumulative += dur
    }
    // No ropes to play.
    this.#playing = false
    this.#curRope = -1
    this.#resampler = null
  }

  /**
   * Begin playing `#ropes[r]` from source sample `localSrc`. Sets up either a
   * primed resampler (rate mismatch) or a direct passthrough (rate match).
   */
  #startRope(r: number, localSrc: number) {
    const rope = this.#ropes[r]!
    this.#curRope = r
    this.#dropOutput = 0

    if (rope.sampleRate === sampleRate) {
      this.#resampler = null
      this.#inputCursor = Math.min(Math.round(localSrc), rope.length)
      return
    }

    const resampler = new ResamplerStreamProcessor(rope.sampleRate, sampleRate)
    this.#resampler = resampler
    // Prime: start `kernelHalf` samples early so the kernel sees real audio on
    // both sides of the target, then drop the warm-up output.
    const start = Math.max(
      0,
      Math.floor(localSrc) - resampler.warmupInputSamples,
    )
    this.#inputCursor = start
    this.#dropOutput = Math.round(
      ((localSrc - start) * sampleRate) / rope.sampleRate,
    )
  }

  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
  ): boolean {
    const out = outputs[0]
    const ch0 = out?.[0]
    // Outputs arrive zeroed, so a silent quantum just returns.
    if (!ch0 || !this.#playing || this.#curRope < 0) {
      return true
    }

    const frames = ch0.length
    let produced = 0
    while (produced < frames) {
      const rope = this.#ropes[this.#curRope]
      if (!rope) break

      if (this.#resampler === null) {
        // Passthrough: copy source samples straight into the output.
        const avail = rope.length - this.#inputCursor
        if (avail > 0) {
          const n = Math.min(frames - produced, avail)
          rope.read(ch0, this.#inputCursor, produced, n)
          this.#inputCursor += n
          produced += n
          continue
        }
        if (!this.#advanceRope()) break
        continue
      }

      // Resampling: drain ready output, else feed more, else advance.
      if (this.#resampler.available() > 0) {
        if (this.#dropOutput > 0) {
          const want = Math.min(this.#dropOutput, this.#scratch.length)
          this.#dropOutput -= this.#resampler.drain(
            this.#scratch.subarray(0, want),
          )
        } else {
          produced += this.#resampler.drain(ch0.subarray(produced))
        }
        continue
      }
      if (this.#inputCursor < rope.length) {
        const chunk = Math.min(
          rope.length - this.#inputCursor,
          this.#scratch.length,
        )
        rope.read(this.#scratch, this.#inputCursor, 0, chunk)
        this.#resampler.feed(this.#scratch.subarray(0, chunk))
        this.#inputCursor += chunk
        continue
      }
      if (!this.#advanceRope()) break
    }

    // Mono source: mirror into any remaining output channels.
    for (let c = 1; c < out.length; c += 1) {
      out[c]!.set(ch0)
    }

    return true
  }

  /**
   * Move to the next rope, or report that none remains. The last rope is the
   * live one, so its exhaustion means "wait for more data", not "advance".
   *
   * The next rope gets a fresh resampler (mandatory — rates may differ), so a
   * resampled rope's leading/trailing ~`kernelHalf` samples taper against its
   * own edges rather than blending across the seam. That's a ~1-2 ms transition
   * at joins between independent recordings, which is acceptable here; a single
   * continuous resampler can't span ropes of different rates anyway.
   */
  #advanceRope(): boolean {
    if (this.#curRope >= this.#ropes.length - 1) return false
    this.#startRope(this.#curRope + 1, 0)
    return true
  }
}

registerProcessor('sab-rope-source-node', AudioRopeSourceNode)
