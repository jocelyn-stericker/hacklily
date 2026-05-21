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

/**
 * Reads fixed-size audio quanta from a SharedArrayBuffer ring buffer written
 * by AudioRingWriter. Intended for use inside dedicated workers.
 *
 * SAB layout (must match AudioRingWriter):
 *   Bytes 0–3:  Int32 writePos — Atomics wait/notify target
 *   Bytes 4–7:  Int32 reserved
 *   Bytes 8+:   Float32[bufSamples] ring buffer
 */
export class AudioRingReader {
  private readonly _ctrl: Int32Array
  private readonly _data: Float32Array
  private readonly _bufMask: number
  private readonly _quantum: number

  /** Called when the writer has lapped the reader. `dropped` is the number of overwritten samples. */
  onOverrun?: (dropped: number) => void

  constructor(sab: SharedArrayBuffer, bufSamples: number, quantum: number) {
    if (!isPowerOfTwo(bufSamples)) {
      throw new Error(`bufSamples must be a power of 2, got ${bufSamples}`)
    }
    this._ctrl = new Int32Array(sab, 0, 2)
    this._data = new Float32Array(sab, 8, bufSamples)
    this._bufMask = bufSamples - 1
    this._quantum = quantum
  }

  async *[Symbol.asyncIterator]() {
    let rp = 0
    const {
      _quantum: quantum,
      _bufMask: bufMask,
      _ctrl: ctrl,
      _data: data,
    } = this
    const bufSize = bufMask + 1

    while (true) {
      let wp = Atomics.load(ctrl, 0)

      if (wp - rp > bufSize) {
        const dropped = wp - rp - bufSize
        this.onOverrun?.(dropped)
        // For us, it's more important that timing stays consistent, than that we
        // have valid data.
        // rp = wp - bufSize
      }

      if (wp - rp < quantum) {
        // ctrl[1] is the stop sentinel, written by MicCapturePipeline after
        // context.close() so all worklet writes are guaranteed to have landed.
        if (Atomics.load(ctrl, 1) !== 0) break
        const r = Atomics.waitAsync(ctrl, 0, wp)
        if (r.async) await r.value
        wp = Atomics.load(ctrl, 0)
      }

      while (wp - rp >= quantum) {
        let audio: Float32Array
        if ((rp & bufMask) + quantum <= bufSize) {
          audio = new Float32Array(
            data.buffer,
            data.byteOffset + (rp & bufMask) * 4,
            quantum,
          )
        } else {
          audio = new Float32Array(quantum)
          for (let i = 0; i < quantum; i++) {
            audio[i] = data[(rp + i) & bufMask]!
          }
        }

        rp += quantum
        yield audio
        wp = Atomics.load(ctrl, 0)
        if (wp - rp > bufSize) {
          const dropped = wp - rp - bufSize
          this.onOverrun?.(dropped)
          // For us, it's more important that timing stays consistent, than that we
          // have valid data.
          // rp = wp - bufSize
        }
      }
    }
  }
}
