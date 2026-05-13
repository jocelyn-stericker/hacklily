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

import { isPowerOfTwo } from './mathUtils'

export interface InitMessage {
  type: 'init'
  sab: SharedArrayBuffer
  bufSamples: number
}

export type AudioWorkletMessage = InitMessage | null

export type AudioRingWriterNode = Omit<AudioWorkletNode, 'port'> & {
  port: { postMessage: (msg: AudioWorkletMessage) => void }
}

/**
 * Audio worklet that writes data to a SharedArrayBuffer in realtime.
 *
 * Load it:
 * ```
 * import audioWorkletUrl from '#/lib/worklet?worker&url'
 * await context.audioWorklet.addModule(audioWorkletUrl)
 * workletNode = new AudioWorkletNode(context, 'audio-ring-writer')
 * ```
 *
 * Then, send it a SharedArrayBuffer to write to.
 */
export class AudioRingWriter extends AudioWorkletProcessor {
  private _ctrl: Int32Array | null = null
  private _data: Float32Array | null = null
  private _bufSamples: number | null = null
  private _bufMask = 0

  constructor() {
    super()
    this.port.onmessage = ({ data }: MessageEvent<AudioWorkletMessage>) => {
      if (data?.type !== 'init' || !data.bufSamples) {
        throw new Error('invalid message')
      }

      if (!isPowerOfTwo(data.bufSamples)) {
        throw new Error(
          `bufSamples must be a power of 2, got ${data.bufSamples}`,
        )
      }

      this._bufSamples = data.bufSamples
      this._bufMask = this._bufSamples - 1

      const sab = data.sab
      // Not sure if we need to align to an 8-byte boundary, but either way, this is
      // a write-only ring buffer, we don't store a read position.
      this._ctrl = new Int32Array(sab, 0, 2)
      this._data = new Float32Array(sab, 8, this._bufSamples)
    }
  }

  override process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
  ): boolean {
    const inp = inputs[0]?.[0]
    if (!inp || !inp[0]) return true

    const ctrl = this._ctrl
    const data = this._data
    if (!ctrl || !data) return true

    const wp = Atomics.load(ctrl, 0)
    for (let i = 0; i < inp.length; i++) {
      data[(wp + i) & this._bufMask] = inp[i]!
    }
    Atomics.store(ctrl, 0, wp + inp.length)
    Atomics.notify(ctrl, 0)

    return true
  }
}

registerProcessor('audio-ring-writer', AudioRingWriter)
