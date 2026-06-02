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

import audioWorkletUrl from '#/lib/SabRopeSourceNode?worker&url'

import type { SabRope } from './SabRope'
import type { AudioRopeSourceNodeNode } from './SabRopeSourceNode'
import { TypedEventTarget } from './TypedEventTarget'

const LOG = '[AudioPlaybackPipeline]'

type AudioPlaybackOutEvents = {
  stop: Event
  positionChanged: CustomEvent<{ timeSec: number }>
  error: CustomEvent<{ error: string }>
}

/**
 * Plays one or more `SabRope`s laid end-to-end through the
 * `AudioRopeSourceNode` worklet. The worklet handles the seek and any
 * per-rope resampling; this wrapper owns the `AudioContext`, tracks the
 * playback position off `context.currentTime`, and emits `stop` once the
 * concatenated timeline runs out (the worklet itself never signals an end).
 */
export class AudioPlaybackPipeline extends TypedEventTarget<AudioPlaybackOutEvents> {
  #context: AudioContext | null = null
  #node: AudioRopeSourceNodeNode | null = null
  #animFrameId: number | null = null
  #startTimeSec = 0
  // `context.currentTime` when playback began; `addModule` adds a variable
  // delay, so we measure elapsed time from here rather than from context start.
  #baseTimeSec = 0
  #duration = 0
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
    ropes: Array<SabRope>
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
    ropes: Array<SabRope>,
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

    const context = new AudioContext({ sampleRate, latencyHint: 'playback' })
    this.#context = context

    await context.audioWorklet.addModule(audioWorkletUrl)
    // Aborted while the module was loading — release the context and bail.
    if (this.#stopCtrl.signal.aborted) {
      void context.close().catch((err) => {
        console.warn(LOG, 'context.close during abort:', err)
      })
      this.#context = null
      return
    }

    const node: AudioRopeSourceNodeNode = new AudioWorkletNode(
      context,
      'sab-rope-source-node',
    )
    this.#node = node
    node.connect(context.destination)
    node.port.postMessage({
      type: 'setBuffer',
      ropes: ropes.map((rope) => rope.shareRope()),
      gains,
    })
    node.port.postMessage({ type: 'start', timeSec: startAtSec })

    this.#baseTimeSec = context.currentTime
    this.#animFrameId = requestAnimationFrame(this.#animate)
  }

  #animate = () => {
    const context = this.#context
    if (context === null) return
    const timeSec = Math.min(
      this.#startTimeSec + (context.currentTime - this.#baseTimeSec),
      this.#duration,
    )
    this.emit('positionChanged', { timeSec })
    if (timeSec >= this.#duration) {
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
