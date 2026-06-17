// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { AudioRope } from '#/lib/audio/AudioRope'
import type {
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import { assertUnreachable } from '#/lib/utils'

import type { WorkerEndedMessage } from '../workers/workerMessages'

export interface RopeWriterInitMessage {
  type: 'init'
  sampleRate: number
}

export interface RopeWriterSealMessage {
  type: 'seal'
}

export type RopeWriterMessage = RopeWriterInitMessage | RopeWriterSealMessage

export type RopeReadyMessage = {
  type: 'rope-ready'
  rope: AudioRopeShare
  sampleRate: number
}

export type RopeWriterErrorMessage = {
  type: 'error'
  error: string
}

export type RopeWriterOutMessage =
  | RopeReadyMessage
  | AudioRopeGrow
  | AudioRopeSeal
  | WorkerEndedMessage
  | RopeWriterErrorMessage

export type RopeWriterNode = Omit<AudioWorkletNode, 'port'> & {
  port: {
    postMessage: (msg: RopeWriterMessage) => void
    onmessage:
      | ((this: MessagePort, ev: MessageEvent<RopeWriterOutMessage>) => void)
      | null
    start: () => void
    addEventListener: (
      type: 'message',
      listener: (ev: MessageEvent<RopeWriterOutMessage>) => void,
      options?: boolean | AddEventListenerOptions,
    ) => void
    removeEventListener: (
      type: 'message',
      listener: (ev: MessageEvent<RopeWriterOutMessage>) => void,
      options?: boolean | EventListenerOptions,
    ) => void
  }
}

/**
 * Audio worklet that captures realtime input directly into an AudioRope.
 *
 * This collapses the former pair of `AudioRingWriter` (a worklet that wrote
 * mic quanta into a SharedArrayBuffer ring buffer) and `RopeWriterWorker` (a
 * dedicated worker that drained that ring into a rope) into a single
 * processor: each `process()` quantum is appended to the rope on the audio
 * rendering thread, and growth is shipped to the main thread via
 * `port.postMessage`. No intermediate ring buffer is involved; the rope's
 * per-segment SABs are shared with consumers as usual.
 *
 * Leading all-zero quanta are dropped until the first non-zero sample, so a
 * recording starts at real audio rather than a run of silence.
 *
 * The node is reusable across recordings: a fresh `init` resets all state
 * and starts a new rope. `seal` finalizes the current rope and posts
 * `audio-rope-seal` then `ended`; the node then no-ops until the next
 * `init`.
 *
 * Load it:
 * ```
 * import audioWorkletUrl from '#/lib/audio/RopeWriterNode?worker&url'
 * await context.audioWorklet.addModule(audioWorkletUrl)
 * workletNode = new AudioWorkletNode(context, 'rope-writer')
 * ```
 */
export class RopeWriterProcessor extends AudioWorkletProcessor {
  #rope: AudioRope | null = null
  #bufferLength = 0
  #activated = false
  #sealed = false
  #errored = false

  constructor() {
    super()
    this.port.onmessage = ({ data }: MessageEvent<RopeWriterMessage>) => {
      try {
        this.#handleMessage(data)
      } catch (err) {
        this.#postError(err)
      }
    }
  }

  #handleMessage(data: RopeWriterMessage): void {
    switch (data.type) {
      case 'init': {
        const rope = new AudioRope(data.sampleRate)
        const share = rope.shareRope()
        this.#rope = rope
        this.#bufferLength = share.buffers.length
        this.#activated = false
        this.#sealed = false
        this.#errored = false
        this.port.postMessage({
          type: 'rope-ready',
          rope: share,
          sampleRate: data.sampleRate,
        } satisfies RopeReadyMessage)
        return
      }

      case 'seal': {
        const rope = this.#rope
        if (!rope || this.#sealed) return
        this.#sealed = true
        rope.seal()
        this.port.postMessage({
          type: 'audio-rope-seal',
        } satisfies AudioRopeSeal)
        this.port.postMessage({ type: 'ended' } satisfies WorkerEndedMessage)
        return
      }

      default:
        assertUnreachable(data)
    }
  }

  override process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
  ): boolean {
    if (this.#errored || this.#sealed || !this.#rope) return true

    const inp = inputs[0]?.[0]
    if (!inp?.length) return true

    try {
      if (!this.#activated) {
        if (!inp.some((s) => s !== 0)) return true
        this.#activated = true
      }

      this.#rope.append(inp)
      const grow = this.#rope.shareGrowth(this.#bufferLength)
      if (grow) {
        this.#bufferLength += grow.buffers.length
        this.port.postMessage(grow)
      }
    } catch (err) {
      this.#postError(err)
    }
    return true
  }

  #postError(err: unknown): void {
    if (this.#errored) return
    this.#errored = true
    this.#sealed = true
    this.port.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    } satisfies RopeWriterErrorMessage)
  }
}

registerProcessor('rope-writer', RopeWriterProcessor)
