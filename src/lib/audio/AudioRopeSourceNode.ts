// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { ResamplerStreamProcessor } from '#/lib/analysis/ResampleProcessor'
import type { AudioRopeGrow, AudioRopeShare } from '#/lib/audio/AudioRope'
import { assertUnreachable } from '#/lib/utils'

import { AudioRope } from './AudioRope'

export interface RopeInitMessage {
  type: 'setBuffer'
  ropes: Array<AudioRopeShare>
  /** One loudness-normalization gain per rope, aligned to `ropes`. */
  gains: Array<number>
}

export interface RopeGrowLastMessage {
  type: 'growLastRope'
  grow: AudioRopeGrow
}

export interface RopeSealLastMessage {
  type: 'sealLastRope'
}

export interface RopeStartMessage {
  type: 'start'
  timeSec: number
}

export interface RopeEndMessage {
  type: 'end'
  timeSec: number
}

/**
 * Fired once per `start` when the first kept output sample is written. Anchors
 * the clock: position = `startAtSec + (currentTime - contextTime)`.
 */
export interface RopeStartedEvent {
  type: 'started'
  contextTime: number
}

export interface RopeEndEvent {
  type: 'end'
  /**
   * Context time when the last rendered sample plays out. Wait for
   * `context.currentTime` to reach this before tearing down -- stopping sooner clips the tail.
   */
  contextTime: number
}

export type AudioRopeSourceNodeOutEvent = RopeStartedEvent | RopeEndEvent

export type AudioRopeSourceNodeMessage =
  | RopeInitMessage
  | RopeGrowLastMessage
  | RopeSealLastMessage
  | RopeStartMessage
  | RopeEndMessage
  | null

export type AudioRopeSourceNode = Omit<AudioWorkletNode, 'port'> & {
  port: {
    postMessage: (msg: AudioRopeSourceNodeMessage) => void
    onmessage:
      | ((
          this: MessagePort,
          msg: MessageEvent<AudioRopeSourceNodeOutEvent>,
        ) => void)
      | null
  }
}

type Cursor = {
  rope: number
  /** Next source sample within rope to feed/read */
  frame: number
}

/** Source samples per `feed()` call; small enough that one render quantum needs only a handful. */
const FEED_CHUNK = 128

/**
 * Audio worklet that writes one or more AudioRopes to output in realtime.
 *
 * Ropes lay end-to-end on a single timeline. Each rope may have its own sample
 * rate; rate mismatches go through a windowed-sinc `ResamplerStreamProcessor`,
 * primed `kernelHalf` samples early so seeks have no fade-in transient.
 *
 * The final rope may still be growing: post `setBuffer`, send `growLastRope`
 * after each producer append, `start` to seek, `null` to pause. A dry
 * still-growing rope stalls; a dry sealed rope ends playback and posts
 * `RopeEndEvent`. An explicit `end` message stops at a chosen time.
 *
 * Load it:
 * ```
 * import audioWorkletUrl from '#/lib/audio/AudioRopeSourceNode?worker&url'
 * await context.audioWorklet.addModule(audioWorkletUrl)
 * workletNode = new AudioWorkletNode(context, 'audio-rope-source-node')
 * ```
 */
export class AudioRopeSourceNodeProcessor extends AudioWorkletProcessor {
  /** Ropes laid end-to-end; the last one may still be growing. */
  #ropes: Array<AudioRope> = []
  #gains: Array<number> = []
  #playing = false

  #cursor: Cursor | null = null
  /** Null when the current rope plays through at native rate. */
  #resampler: ResamplerStreamProcessor | null = null
  /** Output samples still to discard for seek priming. */
  #dropOutput = 0

  /** Scratch for feeding the resampler and draining warm-up. */
  #scratch = new Float32Array(FEED_CHUNK)

  #end: { rope: number; frame: number } | null = null

  /** Set by `start`; cleared after the first kept sample fires `RopeStartedEvent`. */
  #announceStart = false

  constructor() {
    super()
    this.port.onmessage = ({
      data,
    }: MessageEvent<AudioRopeSourceNodeMessage>) => {
      if (data === null) {
        // Pause; position retained for resume.
        this.#playing = false
        return
      }

      switch (data.type) {
        case 'setBuffer': {
          this.#ropes = data.ropes.map((share) => new AudioRope(share))
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
          // Ordered after the last `growLastRope` so real buffers are in place before the spare is trimmed.
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
      // `#startRope` is reused on rope joins but must not re-anchor; flag lives here.
      this.#announceStart = true
    } else {
      // No ropes to play.
      this.#playing = false
      this.#cursor = null
      this.#resampler = null
      this.#announceStart = false
    }
  }

  /** Post the clock anchor at `offset` frames into the current quantum. Fires once per `start`. */
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

  /** Begin playing from `cursor`, setting up a primed resampler or direct passthrough. */
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
    // Prime `kernelHalf` samples early so the kernel has context on both sides; drop warm-up output.
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
    // Set when the rope runs dry and there's no next rope.
    let exhausted = false
    while (produced < frames) {
      const rope = this.#ropes[this.#cursor.rope]
      if (!rope) break

      if (this.#resampler === null) {
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

    // Stop on scheduled end or sealed exhaustion. A dry growing rope stalls until more data arrives.
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
      // Last written sample plays out `produced` frames after quantum start.
      this.port.postMessage({
        type: 'end',
        contextTime: currentTime + produced / sampleRate,
      } satisfies RopeEndEvent)
    }

    for (let c = 1; c < out.length; c += 1) {
      out[c]!.set(ch0)
    }

    return true
  }

  /**
   * Move to the next rope (with a fresh resampler), or return false if at the
   * last rope. Each rope gets its own resampler -- rates may differ, and the
   * ~`kernelHalf` taper at joins is acceptable for independent recordings.
   */
  #advanceRope(): boolean {
    if (!this.#cursor || this.#cursor.rope >= this.#ropes.length - 1)
      return false
    this.#startRope({ rope: this.#cursor.rope + 1, frame: 0 })
    return true
  }

  /**
   * Scale `buf[start, end)` by the current rope's loudness gain.
   * Linear gain commutes with resampling, so post-resampler application is correct.
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

registerProcessor('audio-rope-source-node', AudioRopeSourceNodeProcessor)
