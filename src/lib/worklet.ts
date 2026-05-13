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

const SAB_BUF_SAMPLES = 4096
const SAB_BUF_MASK = SAB_BUF_SAMPLES - 1

class VoiceProcessor extends AudioWorkletProcessor {
  private _ctrl: Int32Array | null = null
  private _data: Float32Array | null = null

  constructor() {
    super()
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'init') {
        const sab = e.data.sab as SharedArrayBuffer
        this._ctrl = new Int32Array(sab, 0, 2)
        this._data = new Float32Array(sab, 8, SAB_BUF_SAMPLES)
      }
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
      data[(wp + i) & SAB_BUF_MASK] = inp[i]!
    }
    Atomics.store(ctrl, 0, wp + inp.length)
    Atomics.notify(ctrl, 0, 1)

    return true
  }
}

registerProcessor('voice-processor', VoiceProcessor)
