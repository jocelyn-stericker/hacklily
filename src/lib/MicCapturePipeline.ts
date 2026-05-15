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

import type {
  AnalysisChunk,
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis'
import audioWorkletUrl from '#/lib/AudioRingWriter?worker&url'
import type { AudioRingWriterNode } from '#/lib/AudioRingWriter'
import SpectrogramWorker from '#/lib/SpectrogramWorker?worker'

import type { SpectrogramWorkerOutMessage } from './SpectrogramWorker'
import { TypedEventTarget } from './TypedEventTarget'

// Must be a pow of 2 due to bit masking hack for efficient circular buffer
// About 0.75sec at 44100 Hz.
const SAB_BUF_SAMPLES = 32768

type MicCaptureOutEvents = {
  append: CustomEvent<{ frame: AnalysisFrame }>
  chunkStart: CustomEvent<{ params: AnalysisParams }>
  patch: CustomEvent<{ frameIndex: number }>
  recordingComplete: CustomEvent<{ buffer: AudioBuffer }>
  error: CustomEvent<{ error: string }>
}

export class MicCapturePipeline extends TypedEventTarget<MicCaptureOutEvents> {
  #accumulatedChunks: AnalysisChunk[] = []

  #context: AudioContext | null = null
  #sourceNode: MediaStreamAudioSourceNode | null = null
  #workletNode: AudioRingWriterNode | null = null
  #spectrogramWorker: InstanceType<typeof SpectrogramWorker> | null = null
  #stream: MediaStream | null = null
  #sampleRate: number | null = null
  #resolveInitComplete = () => {}
  #started: Promise<void>
  #destroyed: AbortController = new AbortController()

  get destroyed(): AbortSignal {
    return this.#destroyed.signal
  }

  constructor({ signal }: { signal: AbortSignal }) {
    super()
    this.#started = new Promise<void>((resolve) => {
      this.#resolveInitComplete = resolve
    })
    signal.addEventListener('abort', this.#stop)
    void this.#start()
  }

  async #start() {
    try {
      this.#spectrogramWorker = new SpectrogramWorker()
      this.#context = new AudioContext({ sampleRate: 44100 })
      this.#sampleRate = this.#context.sampleRate
      const workletAdded = this.#context.audioWorklet.addModule(audioWorkletUrl)

      this.#stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })
      await workletAdded

      this.#sourceNode = this.#context.createMediaStreamSource(this.#stream)
      this.#workletNode = new AudioWorkletNode(
        this.#context,
        'audio-ring-writer',
      )

      // The worklet is realtime. It writes audio data to a shared audio buffer with a
      // strict time budget. The live worker consumes and processes it.
      const sab = new SharedArrayBuffer(8 + SAB_BUF_SAMPLES * 4)
      this.#workletNode.port.postMessage({
        type: 'init',
        sab,
        bufSamples: SAB_BUF_SAMPLES,
      })
      this.#spectrogramWorker.postMessage({
        type: 'init',
        sab,
        sampleRate: this.#sampleRate,
        bufSamples: SAB_BUF_SAMPLES,
      })

      this.#spectrogramWorker.addEventListener(
        'error',
        this.#handleSpectrogramWorkerError,
        {
          signal: this.destroyed,
          once: true,
        },
      )

      this.#spectrogramWorker.addEventListener(
        'message',
        this.#handleSpectrogramWorkerOutMessage,
        { signal: this.destroyed },
      )
      this.#sourceNode.connect(this.#workletNode)
    } catch (err) {
      this.emit('error', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // Resolves on success or failure.
    this.#resolveInitComplete()
  }

  #handleSpectrogramWorkerError = ({ error }: ErrorEvent) => {
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#spectrogramWorker?.terminate()
    this.#spectrogramWorker = null
  }

  #handleSpectrogramWorkerOutMessage = ({
    data,
  }: MessageEvent<SpectrogramWorkerOutMessage>) => {
    switch (data.type) {
      case 'pcm': {
        const analysisSamples = this.#accumulatedChunks.reduce(
          (memo, chunk) => memo + chunk.timeStepSamples * chunk.frames.length,
          0,
        )

        const buffer = this.#sampleRate
          ? new AudioBuffer({
              length: analysisSamples,
              numberOfChannels: 1,
              sampleRate: this.#sampleRate,
            })
          : new AudioBuffer({
              length: 0,
              numberOfChannels: 1,
              sampleRate: 44100,
            })
        if (data.pcm.length > 0) buffer.copyToChannel(data.pcm, 0)
        this.emit('recordingComplete', { buffer })
        this.#spectrogramWorker!.terminate()
        this.#spectrogramWorker = null
        this.#destroyed.abort()
        return
      }

      case 'params': {
        const params: AnalysisParams = {
          timeStepSamples: data.timeStepSamples,
          sampleRate: data.sampleRate,
          freqStepHz: data.freqStepHz,
          firstBinHz: data.firstBinHz,
        }
        this.#accumulatedChunks.push({ ...params, frames: [] })
        this.emit('chunkStart', { params })
        return
      }

      case 'frame': {
        const frame: AnalysisFrame = {
          spectrum: data.spectrum,
          rms: data.rms,
          speechProbability: data.speechProbability ?? 0,
          pitchDetected: data.pitchDetected ?? false,
          speechDetected: data.speechDetected ?? false,
          f0: data.f0 ?? 0,
          f1: data.f1 ?? null,
          f2: data.f2 ?? null,
          f3: data.f3 ?? null,
        }
        const currentChunk =
          this.#accumulatedChunks[this.#accumulatedChunks.length - 1]
        currentChunk?.frames.push(frame)
        this.emit('append', { frame })
        return
      }

      case 'patch': {
        const currentChunk =
          this.#accumulatedChunks[this.#accumulatedChunks.length - 1]
        const frame = currentChunk?.frames[data.frameIndex]
        if (frame) {
          if (data.pitchDetected !== undefined)
            frame.pitchDetected = data.pitchDetected
          if (data.speechDetected !== undefined)
            frame.speechDetected = data.speechDetected
          if (data.f0 !== undefined) frame.f0 = data.f0
          if (data.f1 !== undefined) frame.f1 = data.f1
          if (data.f2 !== undefined) frame.f2 = data.f2
          if (data.f3 !== undefined) frame.f3 = data.f3
          if (data.speechProbability !== undefined)
            frame.speechProbability = data.speechProbability
          this.emit('patch', { frameIndex: data.frameIndex })
        }
      }
    }
  }

  #stop = async () => {
    await this.#started

    // Send flush before disconnecting so any in-flight audio quanta
    // are processed before the flush message arrives at the worker.
    if (this.#spectrogramWorker) {
      this.#spectrogramWorker.postMessage({ type: 'flush' })
    } else {
      // We'll miss cleanup from inside the 'pcm' event, so emit '#destroyed' here.
      this.#destroyed.abort()
    }
    this.#sourceNode?.disconnect()
    this.#workletNode?.disconnect()
    await this.#context?.close()
    this.#stream?.getTracks().forEach((t) => t.stop())
    // spectrogramWorker is terminated inside onmessage after the PCM response arrives.
  }
}
