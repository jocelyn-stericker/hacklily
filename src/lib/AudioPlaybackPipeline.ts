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

import { TypedEventTarget } from './TypedEventTarget'

type AudioPlaybackOutEvents = {
  stop: Event
  positionChanged: CustomEvent<{ timeSec: number }>
}

export class AudioPlaybackPipeline extends TypedEventTarget<AudioPlaybackOutEvents> {
  #context: AudioContext | null = null
  #source: AudioBufferSourceNode | null = null
  #animFrameId: number | null = null
  #startTimeSec = 0
  #duration = 0
  #stopCtrl = new AbortController()

  get stopSignal(): AbortSignal {
    return this.#stopCtrl.signal
  }

  constructor({
    audioBuffer,
    startAtSec,
    signal,
  }: {
    audioBuffer: AudioBuffer
    startAtSec: number
    signal: AbortSignal
  }) {
    super()
    signal.addEventListener('abort', this.#stop)
    this.#play(audioBuffer, startAtSec)
  }

  #play(audioBuffer: AudioBuffer, requestedStartAtSec: number) {
    this.#duration = audioBuffer.duration
    const startAtSec =
      requestedStartAtSec - 0.01 <= audioBuffer.duration
        ? requestedStartAtSec
        : 0
    this.#startTimeSec = startAtSec

    this.#context = new AudioContext({ sampleRate: 44100 })
    const thisSource = this.#context.createBufferSource()
    thisSource.buffer = audioBuffer
    thisSource.connect(this.#context.destination)
    this.#source = thisSource

    thisSource.onended = () => {
      if (this.#source === thisSource) {
        this.#animate()
        this.emit('stop')
        this.#stop()
      }
    }

    thisSource.start(0, startAtSec)
    this.#animFrameId = requestAnimationFrame(this.#animate)
  }

  #animate = () => {
    if (this.#context === null) return
    const timeSec = Math.min(
      this.#context.currentTime + this.#startTimeSec,
      this.#duration,
    )
    this.emit('positionChanged', { timeSec })
    this.#animFrameId = requestAnimationFrame(this.#animate)
  }

  #stop = () => {
    if (this.#animFrameId !== null) {
      cancelAnimationFrame(this.#animFrameId)
      this.#animFrameId = null
    }
    if (this.#source && this.#context) {
      try {
        this.#source.stop()
        void this.#context.close()
      } catch {
        // already stopped
      }
      this.#source = null
      this.#context = null
    }
    this.#stopCtrl.abort()
  }
}
