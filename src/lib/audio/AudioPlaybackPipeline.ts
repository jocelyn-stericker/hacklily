// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AudioRope } from '#/lib/audio/AudioRope'
import type { AudioRopeSourceNode } from '#/lib/audio/AudioRopeSourceNode'
import audioWorkletUrl from '#/lib/audio/AudioRopeSourceNode?worker&url'
import { TypedEventTarget } from '#/lib/TypedEventTarget'
import { assertUnreachable } from '#/lib/utils'

const LOG = '[AudioPlaybackPipeline]'

type AudioPlaybackOutEvents = {
  stop: Event
  positionChanged: CustomEvent<{ timeSec: number }>
  error: CustomEvent<{ error: string }>
}

/**
 * Plays one or more `AudioRope`s laid end-to-end through the
 * `AudioRopeSourceNode` worklet. The worklet handles the seek and any
 * per-rope resampling; this wrapper owns the `AudioContext` and tracks the
 * playback position off `context.currentTime`.
 *
 * Stopping is driven by the worklet: it posts a `RopeEndEvent` when it reaches
 * the end of the final (sealed) rope, carrying the context time its last sample
 * plays out. We stop once `context.currentTime` reaches that. Playback only
 * ever runs on finished recordings, so the final rope is always sealed and the
 * end always arrives.
 */
export class AudioPlaybackPipeline extends TypedEventTarget<AudioPlaybackOutEvents> {
  #context: AudioContext | null = null
  #node: AudioRopeSourceNode | null = null
  #animFrameId: number | null = null
  #startTimeSec = 0
  // `context.currentTime` at which the worklet's first kept sample plays out,
  // from its `RopeStartedEvent`. Null until that lands (module load + resampler
  // warm-up take a variable, unpredictable moment); position holds at
  // `#startTimeSec` until then, then tracks `currentTime` exactly off this.
  #anchorContextTime: number | null = null
  #duration = 0
  // `context.currentTime` at which the worklet's final sample plays out, from
  // its `RopeEndEvent`. Null until the worklet reports the end; we stop once
  // `currentTime` reaches it.
  #stopAtContextTime: number | null = null
  #stopCtrl = new AbortController()

  get stopSignal(): AbortSignal {
    return this.#stopCtrl.signal
  }

  constructor({
    ropes,
    gains,
    startAtSec,
    signal,
    sampleRate,
  }: {
    ropes: Array<AudioRope>
    /** Loudness-normalization gain per rope, aligned to `ropes`. */
    gains: Array<number>
    startAtSec: number
    signal: AbortSignal
    sampleRate?: number
  }) {
    super()
    signal.addEventListener('abort', this.#stop)
    this.#play(ropes, gains, startAtSec, sampleRate).catch((err) => {
      console.error(LOG, 'playback failed:', err)
      this.emit('error', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }

  async #play(
    ropes: Array<AudioRope>,
    gains: Array<number>,
    requestedStartAtSec: number,
    sampleRate?: number,
  ) {
    this.#duration = ropes.reduce(
      (sum, rope) => sum + rope.length / rope.sampleRate,
      0,
    )
    const startAtSec =
      requestedStartAtSec <= this.#duration - 0.05 ? requestedStartAtSec : 0
    this.#startTimeSec = startAtSec

    const context = new AudioContext({ sampleRate, latencyHint: 'interactive' })
    this.#context = context

    await context.audioWorklet.addModule(audioWorkletUrl)
    // Aborted while the module was loading -- release the context and bail.
    if (this.#stopCtrl.signal.aborted) {
      void context.close().catch((err) => {
        console.warn(LOG, 'context.close during abort:', err)
      })
      this.#context = null
      return
    }

    const node: AudioRopeSourceNode = new AudioWorkletNode(
      context,
      'audio-rope-source-node',
    )
    this.#node = node
    node.connect(context.destination)
    // Listen before starting so an immediate `started`/`end` (e.g. a seek
    // already at the tail) isn't missed.
    node.port.onmessage = ({ data }) => {
      switch (data.type) {
        case 'started':
          this.#anchorContextTime = data.contextTime
          break
        case 'end':
          this.#stopAtContextTime = data.contextTime
          break
        default:
          assertUnreachable(data)
      }
    }
    node.port.postMessage({
      type: 'setBuffer',
      ropes: ropes.map((rope) => rope.shareRope()),
      gains,
    })
    node.port.postMessage({ type: 'start', timeSec: startAtSec })

    this.#animFrameId = requestAnimationFrame(this.#animate)
  }

  #animate = () => {
    const context = this.#context
    if (context === null) return
    // Until the worklet anchors the clock, hold at the seek target; after, track
    // the context clock exactly (playback is 1:1 real time).
    const elapsed =
      this.#anchorContextTime === null
        ? 0
        : Math.max(0, context.currentTime - this.#anchorContextTime)
    const timeSec = Math.min(this.#startTimeSec + elapsed, this.#duration)
    this.emit('positionChanged', { timeSec })
    // Stop once the worklet's final sample has actually played out.
    if (
      this.#stopAtContextTime !== null &&
      context.currentTime >= this.#stopAtContextTime
    ) {
      this.emit('stop')
      this.#stop()
      return
    }
    this.#animFrameId = requestAnimationFrame(this.#animate)
  }

  #stop = () => {
    if (this.#animFrameId !== null) {
      cancelAnimationFrame(this.#animFrameId)
      this.#animFrameId = null
    }
    if (this.#node && this.#context) {
      try {
        this.#node.port.postMessage(null)
        this.#node.disconnect()
      } catch (err) {
        console.warn(LOG, 'stop cleanup error:', err)
      }
      // close() is async; swallow its rejection rather than floating it.
      void this.#context.close().catch((err) => {
        console.warn(LOG, 'context.close during stop:', err)
      })
      this.#node = null
      this.#context = null
    }
    this.#stopCtrl.abort()
  }
}
