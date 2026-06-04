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

import { isPowerOfTwo } from '#/lib/dsp/mathUtils'

export interface AudioRingWriterInitMessage {
  type: 'init'
  sab: SharedArrayBuffer
  bufSamples: number
}

export type AudioRingWriterMessage = AudioRingWriterInitMessage | null

export type AudioRingWriterNode = Omit<AudioWorkletNode, 'port'> & {
  port: { postMessage: (msg: AudioRingWriterMessage) => void }
}

/**
 * Audio worklet that writes data to a SharedArrayBuffer in realtime.
 *
 * Load it:
 * ```
 * import audioWorkletUrl from '#/lib/audio/AudioRingWriter?worker&url'
 * await context.audioWorklet.addModule(audioWorkletUrl)
 * workletNode = new AudioWorkletNode(context, 'audio-ring-writer')
 * ```
 *
 * Then, send it a SharedArrayBuffer to write to.
 */
export class AudioRingWriter extends AudioWorkletProcessor {
  #ctrl: Int32Array | null = null
  #data: Float32Array | null = null
  #bufSamples: number | null = null
  #bufMask = 0
  #activated = false

  constructor() {
    super()
    this.port.onmessage = ({ data }: MessageEvent<AudioRingWriterMessage>) => {
      if (data?.type !== 'init' || !data.bufSamples) {
        throw new Error('invalid message')
      }

      if (!isPowerOfTwo(data.bufSamples)) {
        throw new Error(
          `bufSamples must be a power of 2, got ${data.bufSamples}`,
        )
      }

      this.#bufSamples = data.bufSamples
      this.#bufMask = this.#bufSamples - 1

      const sab = data.sab
      // Not sure if we need to align to an 8-byte boundary, but either way, this is
      // a write-only ring buffer, we don't store a read position.
      this.#ctrl = new Int32Array(sab, 0, 2)
      this.#data = new Float32Array(sab, 8, this.#bufSamples)
    }
  }

  override process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
  ): boolean {
    const inp = inputs[0]?.[0]
    if (!inp?.length) return true

    const ctrl = this.#ctrl
    const data = this.#data
    if (!ctrl || !data) return true

    if (!this.#activated) {
      if (!inp.some((s) => s !== 0)) return true
      this.#activated = true
    }

    const wp = Atomics.load(ctrl, 0)
    for (let i = 0; i < inp.length; i++) {
      data[(wp + i) & this.#bufMask] = inp[i]!
    }
    Atomics.store(ctrl, 0, wp + inp.length)
    Atomics.notify(ctrl, 0)

    return true
  }
}

registerProcessor('audio-ring-writer', AudioRingWriter)
