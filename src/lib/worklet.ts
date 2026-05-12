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

declare const currentTime: number

class VoiceProcessor extends AudioWorkletProcessor {
  private _workerPort: MessagePort | null = null
  private _started = false

  constructor() {
    super()
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'init') {
        this._workerPort = e.data.workerPort as MessagePort
      }
    }
  }

  override process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
  ): boolean {
    const inp = inputs[0]?.[0]
    if (!inp || !inp[0]) return true

    if (!this._started) {
      this._started = true
      this.port.postMessage({ type: 'start' as const, currentTime })
    }

    if (this._workerPort) {
      const copy = inp.slice()
      this._workerPort.postMessage({ audio: copy, currentTime }, [copy.buffer])
    }

    return true
  }
}

registerProcessor('voice-processor', VoiceProcessor)
