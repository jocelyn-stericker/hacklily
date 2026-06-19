// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type { AudioRope } from '#/lib/audio/AudioRope'
import type {
  AudioRopeSourceNode,
  AudioRopeSourceNodeMessage,
} from '#/lib/audio/AudioRopeSourceNode'
import { TypedEventTarget } from '#/lib/TypedEventTarget'
import { assertUnreachable } from '#/lib/utils'

const LOG_PLAYBACK = '[PlaybackPipeline]'

type PlaybackPipelineEventMap = {
  stop: Event
  positionChanged: CustomEvent<{ timeSec: number }>
  error: CustomEvent<{ error: string }>
}

export class PlaybackPipeline extends TypedEventTarget<PlaybackPipelineEventMap> {
  #context: AudioContext | null = null
  #node: AudioRopeSourceNode | null = null
  #animFrameId: number | null = null
  #startTimeSec = 0
  #anchorContextTime: number | null = null
  #duration = 0
  #stopAtContextTime: number | null = null
  #stopCtrl = new AbortController()

  get stopSignal(): AbortSignal {
    return this.#stopCtrl.signal
  }

  constructor({
    ropes,
    gains,
    startAtSec,
    endAtSec,
    signal,
    context,
    moduleReady,
  }: {
    ropes: Array<AudioRope>
    gains: Array<number>
    startAtSec: number
    endAtSec?: number
    signal: AbortSignal
    context: AudioContext
    moduleReady: Promise<void>
  }) {
    super()
    signal.addEventListener('abort', this.#stop)
    this.#play(context, moduleReady, ropes, gains, startAtSec, endAtSec).catch(
      (err) => {
        console.error(LOG_PLAYBACK, 'playback failed:', err)
        this.emit('error', {
          error: err instanceof Error ? err.message : String(err),
        })
      },
    )
  }

  async #play(
    context: AudioContext,
    moduleReady: Promise<void>,
    ropes: Array<AudioRope>,
    gains: Array<number>,
    requestedStartAtSec: number,
    endAtSec?: number,
  ): Promise<void> {
    this.#duration = ropes.reduce(
      (sum, rope) => sum + rope.length / rope.sampleRate,
      0,
    )
    if (endAtSec !== undefined && endAtSec < this.#duration) {
      this.#duration = endAtSec
    }
    const startAtSec =
      requestedStartAtSec <= this.#duration - 0.05 ? requestedStartAtSec : 0
    this.#startTimeSec = startAtSec

    this.#context = context

    await context.resume()
    await moduleReady

    if (this.#stopCtrl.signal.aborted) {
      return
    }

    const node: AudioRopeSourceNode = new AudioWorkletNode(
      context,
      'audio-rope-source-node',
    )
    this.#node = node
    node.connect(context.destination)
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
    const shares = ropes.map((rope) => rope.shareRope())
    const setBufferMsg: AudioRopeSourceNodeMessage = {
      type: 'setBuffer',
      ropes: shares,
      gains,
    }
    node.port.postMessage(setBufferMsg)
    node.port.postMessage({ type: 'start', timeSec: startAtSec })
    if (endAtSec !== undefined) {
      node.port.postMessage({ type: 'end', timeSec: endAtSec })
    }

    this.#animFrameId = requestAnimationFrame(this.#animate)
  }

  #animate = (): void => {
    const context = this.#context
    if (context === null) return
    const elapsed =
      this.#anchorContextTime === null
        ? 0
        : Math.max(0, context.currentTime - this.#anchorContextTime)
    const timeSec = Math.min(this.#startTimeSec + elapsed, this.#duration)
    this.emit('positionChanged', { timeSec })
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

  #stop = (): void => {
    if (this.#animFrameId !== null) {
      cancelAnimationFrame(this.#animFrameId)
      this.#animFrameId = null
    }
    if (this.#context) {
      if (this.#node) {
        try {
          this.#node.port.postMessage(null)
          this.#node.disconnect()
        } catch (err) {
          console.warn(LOG_PLAYBACK, 'stop cleanup error:', err)
        }
        this.#node = null
      }
      this.#context = null
    }
    this.#stopCtrl.abort()
  }
}
