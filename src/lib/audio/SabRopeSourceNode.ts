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

import { ResamplerStreamProcessor } from '#/lib/analysis/ResampleProcessor'
import type { SabRopeGrow, SabRopeShare } from '#/lib/audio/SabRope'
import { assertUnreachable } from '#/lib/utils'

import { SabRope } from './SabRope'

export interface RopeInitMessage {
  type: 'setBuffer'
  ropes: Array<SabRopeShare>
  /** One loudness-normalization gain per rope, aligned to `ropes`. */
  gains: Array<number>
}

export interface RopeGrowLastMessage {
  type: 'growLastRope'
  grow: SabRopeGrow
}

export interface RopeSealLastMessage {
  type: 'sealLastRope'
}

export interface RopeStartMessage {
  type: 'start'
  timeSec: number
}

// Stop playing once the cursor gets to this time
export interface RopeEndMessage {
  type: 'end'
  timeSec: number
}

/**
 * Posted once per `start`, the instant the worklet writes its first kept
 * (post-warmup) output sample. Anchors the playback clock: `contextTime` is when
 * that sample plays out, and it corresponds to the seek target the consumer
 * requested. Lets the consumer track position as `startAtSec + (currentTime -
 * contextTime)` — exact, since playback is 1:1 real time — instead of guessing
 * when audio actually began.
 */
export interface RopeStartedEvent {
  type: 'started'
  contextTime: number
}

export interface RopeEndEvent {
  type: 'end'
  /**
   * Context time at which the last rendered sample plays out. The worklet
   * renders ahead of the audible clock, so a consumer should wait until
   * `context.currentTime` reaches this before tearing the graph down — stopping
   * on receipt would clip the buffered tail.
   */
  contextTime: number
}

/** Messages the worklet posts back to the main thread. */
export type SabRopeSourceNodeOutEvent = RopeStartedEvent | RopeEndEvent

export type SabRopeSourceNodeMessage =
  | RopeInitMessage
  | RopeGrowLastMessage
  | RopeSealLastMessage
  | RopeStartMessage
  | RopeEndMessage
  | null

export type SabRopeSourceNode = Omit<AudioWorkletNode, 'port'> & {
  port: {
    postMessage: (msg: SabRopeSourceNodeMessage) => void
    onmessage:
      | ((
          this: MessagePort,
          msg: MessageEvent<SabRopeSourceNodeOutEvent>,
        ) => void)
      | null
  }
}

type Cursor = {
  rope: number
  /** Next source sample within rope to feed/read */
  frame: number
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
 * through a `ResamplerStreamProcessor`, whose windowed-sinc kernel
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
 * Reaching the end of a still-growing final rope just stalls (silence) until
 * more data lands. Once that rope is `seal()`ed, reaching its end is a true
 * end: playback stops and the worklet posts a `RopeEndEvent`. An explicit
 * `end` message stops at a chosen time instead.
 *
 * Load it:
 * ```
 * import audioWorkletUrl from '#/lib/audio/SabRopeSourceNode?worker&url'
 * await context.audioWorklet.addModule(audioWorkletUrl)
 * workletNode = new AudioWorkletNode(context, 'sab-rope-source-node')
 * ```
 */
export class SabRopeSourceNodeProcessor extends AudioWorkletProcessor {
  /** Ropes laid end-to-end; the last one may still be growing. */
  #ropes: Array<SabRope> = []
  /** Loudness-normalization gain per rope, parallel to ropes. */
  #gains: Array<number> = []
  #playing = false

  /** Null when not started */
  #cursor: Cursor | null = null
  /** Resampler for the current rope, or null when it plays through unresampled. */
  #resampler: ResamplerStreamProcessor | null = null
  /** Output samples still to discard for seek priming. */
  #dropOutput = 0

  /** Scratch for feeding the resampler and for draining discarded warm-up. */
  #scratch = new Float32Array(FEED_CHUNK)

  #end: { rope: number; frame: number } | null = null

  /** Set on `start`; cleared once the first kept sample posts a `RopeStartedEvent`. */
  #announceStart = false

  constructor() {
    super()
    this.port.onmessage = ({
      data,
    }: MessageEvent<SabRopeSourceNodeMessage>) => {
      if (data === null) {
        // Pause; keep ropes and position so a later `start` can resume.
        this.#playing = false
        return
      }

      switch (data.type) {
        case 'setBuffer': {
          this.#ropes = data.ropes.map((share) => new SabRope(share))
          this.#gains = data.gains
          this.#playing = false
          this.#cursor = null
          this.#end = null
          break
        }
        case 'growLastRope': {
          this.#ropes[this.#ropes.length - 1]?.grow(data.grow)
          break
        }
        case 'sealLastRope': {
          // Ordered after the last `growLastRope`, so every real buffer is in
          // place before the spare is trimmed. The shared `sealed` flag is
          // already visible; this just frees this copy's spare.
          this.#ropes[this.#ropes.length - 1]?.seal()
          break
        }
        case 'start': {
          this.#seek(data.timeSec)
          this.#end = null
          break
        }
        case 'end': {
          this.#scheduleEnd(data.timeSec)
          break
        }
        default:
          assertUnreachable(data)
      }
    }
  }

  #timeSecToCursor(time: number): Cursor | null {
    let cumulative = 0
    for (let r = 0; r < this.#ropes.length; r += 1) {
      const rope = this.#ropes[r]!
      const dur = rope.length / rope.sampleRate
      if (time < cumulative + dur || r === this.#ropes.length - 1) {
        const localSrc = Math.min(
          Math.max(0, (time - cumulative) * rope.sampleRate),
          rope.length,
        )
        return { rope: r, frame: localSrc }
      }
      cumulative += dur
    }

    return null
  }

  /** Seek to `time` seconds on the concatenated timeline and begin playing. */
  #seek(time: number) {
    const cursor = this.#timeSecToCursor(time)
    if (cursor) {
      this.#startRope(cursor)
      this.#playing = true
      // Anchor the clock on the first sample we actually emit (rope joins reuse
      // `#startRope` but must not re-anchor, so the flag lives here).
      this.#announceStart = true
    } else {
      // No ropes to play.
      this.#playing = false
      this.#cursor = null
      this.#resampler = null
      this.#announceStart = false
    }
  }

  /**
   * Post the playback-clock anchor for the first kept output sample of this
   * `start`, written at `offset` frames into the current quantum. Fires once.
   */
  #maybeAnnounceStart(offset: number) {
    if (!this.#announceStart) return
    this.#announceStart = false
    this.port.postMessage({
      type: 'started',
      contextTime: currentTime + offset / sampleRate,
    } satisfies RopeStartedEvent)
  }

  #scheduleEnd(time: number) {
    this.#end = this.#timeSecToCursor(time)
  }

  /**
   * Begin playing `#ropes[r]` from source sample `localSrc`. Sets up either a
   * primed resampler (rate mismatch) or a direct passthrough (rate match).
   */
  #startRope(cursor: Cursor) {
    const rope = this.#ropes[cursor.rope]!
    this.#cursor = {
      rope: cursor.rope,
      frame: Math.min(Math.round(cursor.frame), rope.length),
    }
    this.#dropOutput = 0

    if (rope.sampleRate === sampleRate) {
      this.#resampler = null
      return
    }

    const resampler = new ResamplerStreamProcessor(rope.sampleRate, sampleRate)
    this.#resampler = resampler
    // Prime: start `kernelHalf` samples early so the kernel sees real audio on
    // both sides of the target, then drop the warm-up output.
    const start = Math.max(
      0,
      Math.floor(cursor.frame) - resampler.warmupInputSamples,
    )
    this.#cursor.frame = start
    this.#dropOutput = Math.round(
      ((cursor.frame - start) * sampleRate) / rope.sampleRate,
    )
  }

  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
  ): boolean {
    const out = outputs[0]
    const ch0 = out?.[0]
    // Outputs arrive zeroed, so a silent quantum just returns.
    if (!ch0 || !this.#playing || !this.#cursor) {
      return true
    }

    const frames = ch0.length
    let produced = 0
    // Set when the current rope runs dry and `#advanceRope` finds nothing to
    // move to — i.e. we're parked at the end of the final rope.
    let exhausted = false
    while (produced < frames) {
      const rope = this.#ropes[this.#cursor.rope]
      if (!rope) break

      if (this.#resampler === null) {
        // Passthrough: copy source samples straight into the output.
        const avail = rope.length - this.#cursor.frame
        if (avail > 0) {
          const n = Math.min(frames - produced, avail)
          rope.read(ch0, this.#cursor.frame, produced, n)
          this.#applyGain(ch0, produced, produced + n)
          this.#maybeAnnounceStart(produced)
          this.#cursor.frame += n
          produced += n
          continue
        }
        if (this.#advanceRope()) continue
        exhausted = true
        break
      }

      // Resampling: drain ready output, else feed more, else advance.
      if (this.#resampler.available() > 0) {
        if (this.#dropOutput > 0) {
          const want = Math.min(this.#dropOutput, this.#scratch.length)
          this.#dropOutput -= this.#resampler.drain(
            this.#scratch.subarray(0, want),
          )
        } else {
          const got = this.#resampler.drain(ch0.subarray(produced))
          this.#applyGain(ch0, produced, produced + got)
          if (got > 0) this.#maybeAnnounceStart(produced)
          produced += got
        }
        continue
      }
      if (this.#cursor.frame < rope.length) {
        const chunk = Math.min(
          rope.length - this.#cursor.frame,
          this.#scratch.length,
        )
        rope.read(this.#scratch, this.#cursor.frame, 0, chunk)
        this.#resampler.feed(this.#scratch.subarray(0, chunk))
        this.#cursor.frame += chunk
        continue
      }
      if (this.#advanceRope()) continue
      exhausted = true
      break
    }

    // Stop and signal `end` when either a scheduled end time has passed, or the
    // final rope is exhausted and sealed (no more data is ever coming). A
    // growing final rope that runs dry just stalls — silence now, resume once
    // the producer appends more.
    const end = this.#end
    const reachedScheduledEnd =
      end !== null &&
      (this.#cursor.rope > end.rope ||
        (this.#cursor.rope === end.rope &&
          this.#cursor.frame >=
            end.frame + (this.#resampler?.warmupInputSamples ?? 0)))
    const reachedSealedEnd =
      exhausted && (this.#ropes[this.#cursor.rope]?.sealed ?? false)

    if (reachedScheduledEnd || reachedSealedEnd) {
      this.#playing = false
      // `currentTime` is this quantum's first frame; the last sample we wrote
      // this quantum plays out `produced` frames later.
      this.port.postMessage({
        type: 'end',
        contextTime: currentTime + produced / sampleRate,
      } satisfies RopeEndEvent)
    }

    // Mono source: mirror into any remaining output channels.
    for (let c = 1; c < out.length; c += 1) {
      out[c]!.set(ch0)
    }

    return true
  }

  /**
   * Move to the next rope, or report that none remains (the caller then either
   * stalls for more data or, if the final rope is sealed, ends). The last rope
   * is the live one, so it has no successor to advance to.
   *
   * The next rope gets a fresh resampler (mandatory — rates may differ), so a
   * resampled rope's leading/trailing ~`kernelHalf` samples taper against its
   * own edges rather than blending across the seam. That's a ~1-2 ms transition
   * at joins between independent recordings, which is acceptable here; a single
   * continuous resampler can't span ropes of different rates anyway.
   */
  #advanceRope(): boolean {
    if (!this.#cursor || this.#cursor.rope >= this.#ropes.length - 1)
      return false
    this.#startRope({ rope: this.#cursor.rope + 1, frame: 0 })
    return true
  }

  /**
   * Scale `buf[start, end)` by the current rope's loudness gain. The region was
   * just produced from `#ropes[#curRope]` (before any join), so the gain is
   * keyed on `#curRope` and stays correct across seeks. A linear gain commutes
   * with resampling, so applying it after the resampler is equivalent.
   */
  #applyGain(buf: Float32Array, start: number, end: number) {
    if (!this.#cursor) {
      return
    }
    const gain = this.#gains[this.#cursor.rope] ?? 1
    if (gain === 1) return
    for (let i = start; i < end; i += 1) buf[i]! *= gain
  }
}

registerProcessor('sab-rope-source-node', SabRopeSourceNodeProcessor)
