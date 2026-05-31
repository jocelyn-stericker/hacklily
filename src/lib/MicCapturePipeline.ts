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

import { toast } from 'sonner'

import type {
  AnalysisChunk,
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/AnalysisFrame'
import audioWorkletUrl from '#/lib/AudioRingWriter?worker&url'
import type { AudioRingWriterNode } from '#/lib/AudioRingWriter'
import FormantWorker from '#/lib/FormantWorker?worker'
import SpectrogramWorker from '#/lib/SpectrogramWorker?worker'
import VadWorker from '#/lib/VadWorker?worker'

import type { FormantWorkerOutMessage } from './FormantWorker'
import type { AudioCaptureSettings } from './settings'
import {
  buildAudioConstraints,
  DEFAULT_SETTINGS,
  preferredSampleRate,
  updateSettings,
} from './settings'
import type { SpectrogramWorkerOutMessage } from './SpectrogramWorker'
import { TypedEventTarget } from './TypedEventTarget'
import type { VadWorkerOutMessage } from './VadWorker'
import type {
  AnalysisPatch,
  AppendFrameMessage,
  PatchFrameMessage,
  PatchFramesMessage,
} from './workerMessages'

// Must be a pow of 2 due to bit masking hack for efficient circular buffer
// About 0.2sec at 44100 Hz.
const SAB_BUF_SAMPLES = 8192

type MicCaptureOutEvents = {
  append: CustomEvent<{ frame: AnalysisFrame }>
  chunkStart: CustomEvent<{ params: AnalysisParams }>
  patch: CustomEvent<{ from: number; to: number }>
  recordingComplete: CustomEvent<{ buffer: AudioBuffer }>
  error: CustomEvent<{ error: string }>
}

// Cached persistent stream — key tracks the settings it was opened with so we
// can invalidate it when settings change.
let STREAM: MediaStream | null = null
let STREAM_KEY: string | null = null

function streamKey(settings: AudioCaptureSettings): string {
  return JSON.stringify({
    deviceId: settings.inputDeviceId,
    sampleRate: settings.sampleRate,
    preprocessing: settings.browserPreprocessing,
  })
}

const LOG = '[MicCapturePipeline]'

async function fixSettingsConstraint(
  settings: AudioCaptureSettings,
  error: any,
) {
  if (error?.constraint === 'deviceId' && settings.inputDeviceId !== null) {
    console.log(LOG, 'preInit: overconstrainted on deviceId')
    await updateSettings({
      inputDeviceId: null,
    })
    toast('Selected mic unavailable, using default')
    return true
  } else if (
    error?.constraint === 'sampleRate' &&
    settings.sampleRate !== 'auto'
  ) {
    console.log(LOG, 'preInit: overconstrainted on sampleRate')
    await updateSettings({
      sampleRate: 'auto',
    })
    toast('Selected sample rate unavailable, using default')
    return true
  }

  return false
}

/**
 * Pre-open the mic stream if persistentMic is enabled.
 */
export async function preInitPersistentStream(
  settings: AudioCaptureSettings,
): Promise<void> {
  if (!settings.persistentMic) {
    if (STREAM) {
      console.log(LOG, 'persistentMic disabled — releasing cached stream')
      STREAM.getTracks().forEach((t) => t.stop())
      STREAM = null
      STREAM_KEY = null
    }
    return
  }
  const key = streamKey(settings)
  if (STREAM && STREAM_KEY === key) {
    console.log(
      LOG,
      'preInit: persistent stream already open with matching settings',
    )
    return
  }

  if (STREAM) {
    console.log(LOG, 'preInit: releasing stale persistent stream')
    STREAM.getTracks().forEach((t) => t.stop())
    STREAM = null
    STREAM_KEY = null
  }

  const constraints = buildAudioConstraints(settings)
  console.log(
    LOG,
    'preInit: opening persistent stream with constraints:',
    constraints,
  )
  try {
    STREAM = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: constraints,
    })
    STREAM_KEY = key
    const trackSettings = STREAM.getTracks()[0]?.getSettings()
    console.log(
      LOG,
      'preInit: persistent stream opened; track settings:',
      trackSettings,
    )
  } catch (err) {
    if (
      (err as any)?.constraint === 'deviceId' &&
      settings.inputDeviceId !== null
    ) {
      await fixSettingsConstraint(settings, err)
    }
    console.warn(LOG, 'preInit: failed to open persistent stream:', err)
  }
}

/**
 * `MicCapturePipeline` orchestrates the live recording path:
 *
 * - An **AudioWorklet** (`AudioRingWriter`) writes PCM into a SAB ring buffer with minimal latency.
 * - Two parallel **Web Workers** both read from the same SAB:
 *   - **SpectrogramWorker** — generates spectrogram frames, accumulates PCM for playback, and sends a `params` message that also triggers `FormantWorker` initialization.
 *   - **FormantWorker** — runs pitch (F0) and formant (F1–F3) analysis, patching earlier frames via `patch` messages.
 *
 * **Stop protocol**: the SAB sentinel (`ctrl[1] = 1`) is written _after_ `AudioContext.close()` resolves, guaranteeing all worklet writes have landed before workers exit their read loops.
 */
export class MicCapturePipeline extends TypedEventTarget<MicCaptureOutEvents> {
  #analysis: AnalysisChunk | null = null
  #accumulatedPcm: Float32Array<ArrayBuffer>[] = []
  // Patches that arrived before their frame; keyed by session-local frameIndex.
  #pendingPatches = new Map<number, PatchFrameMessage>()

  #context: AudioContext | null = null
  #sourceNode: MediaStreamAudioSourceNode | null = null
  #workletNode: AudioRingWriterNode | null = null
  #spectrogramWorker: InstanceType<typeof SpectrogramWorker> | null = null
  #formantWorker: InstanceType<typeof FormantWorker> | null = null
  #vadWorker: InstanceType<typeof VadWorker> | null = null
  #stream: MediaStream | null = null
  #sampleRate: number | null = null
  #resolveInitComplete = () => {}
  #started: Promise<void>
  #destroyed: AbortController = new AbortController()
  #settings: AudioCaptureSettings
  #sab: SharedArrayBuffer | null = null
  #pendingWorkers = 0

  get destroyed(): AbortSignal {
    return this.#destroyed.signal
  }

  constructor({
    signal,
    settings = DEFAULT_SETTINGS,
  }: {
    signal: AbortSignal
    settings?: AudioCaptureSettings
  }) {
    super()
    this.#settings = settings
    this.#started = new Promise<void>((resolve) => {
      this.#resolveInitComplete = resolve
    })
    signal.addEventListener('abort', this.#stop)
    void this.#start()
  }

  async #start() {
    const settings = this.#settings
    try {
      const key = streamKey(settings)

      console.log(LOG, 'start: settings:', {
        inputDeviceId: settings.inputDeviceId ?? '(default)',
        sampleRate: settings.sampleRate,
        browserPreprocessing: settings.browserPreprocessing,
        persistentMic: settings.persistentMic,
      })

      this.#spectrogramWorker = new SpectrogramWorker()
      this.#formantWorker = new FormantWorker()
      this.#vadWorker = new VadWorker()

      const preferredRate = preferredSampleRate(settings)
      console.log(
        LOG,
        'start: creating AudioContext with sampleRate:',
        preferredRate ?? '(browser default)',
      )
      this.#context = new AudioContext({
        sampleRate: preferredRate,
        latencyHint: 'interactive',
      })
      console.log(
        LOG,
        'start: AudioContext actual sampleRate:',
        this.#context.sampleRate,
      )

      const constraints = buildAudioConstraints(settings)
      console.log(LOG, 'start: requested audio constraints:', constraints)

      // Reuse the persistent stream only if it matches current settings and is active.
      if (
        settings.persistentMic &&
        STREAM &&
        STREAM_KEY === key &&
        STREAM.active
      ) {
        console.log(LOG, 'start: reusing cached persistent stream')
        this.#stream = STREAM
      } else {
        console.log(LOG, 'start: calling getUserMedia')
        this.#stream = await navigator.mediaDevices.getUserMedia({
          audio: constraints,
          video: false,
        })
        if (settings.persistentMic) {
          STREAM?.getTracks().forEach((track) => track.stop())

          console.log(LOG, 'start: caching stream as persistent')
          STREAM = this.#stream
          STREAM_KEY = key
        }
      }

      const track = this.#stream.getTracks()[0]
      track?.addEventListener(
        'ended',
        async () => {
          toast('Microphone disconnected')
          await this.#stop()
        },
        { signal: this.destroyed },
      )
      console.log(LOG, 'start: received track settings:', track?.getSettings())
      console.log(LOG, 'start: track label:', track?.label)

      this.#sampleRate = this.#context.sampleRate
      await this.#context.audioWorklet.addModule(audioWorkletUrl)
      this.#workletNode = new AudioWorkletNode(
        this.#context,
        'audio-ring-writer',
      )

      this.#sourceNode = this.#context.createMediaStreamSource(this.#stream)

      // The worklet is realtime. It writes audio data to a shared audio buffer with a
      // strict time budget. The live worker consumes and processes it.
      this.#sab = new SharedArrayBuffer(8 + SAB_BUF_SAMPLES * 4)
      this.#workletNode.port.postMessage({
        type: 'init',
        sab: this.#sab,
        bufSamples: SAB_BUF_SAMPLES,
      })
      this.#spectrogramWorker.postMessage({
        type: 'init',
        sab: this.#sab,
        sampleRate: this.#sampleRate,
        bufSamples: SAB_BUF_SAMPLES,
      })
      this.#pendingWorkers++

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
    } catch (err) {
      const settingsChanged = await fixSettingsConstraint(settings, err)
      if (settingsChanged) {
        // The pipeline will be re-triggered.
        return
      }

      this.emit('error', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // Resolves on success or failure.
    this.#resolveInitComplete()
  }

  #teardown() {
    this.#spectrogramWorker?.terminate()
    this.#spectrogramWorker = null
    this.#formantWorker?.terminate()
    this.#formantWorker = null
    this.#vadWorker?.terminate()
    this.#vadWorker = null
    this.#destroyed.abort()
  }

  #onWorkerDone() {
    if (--this.#pendingWorkers === 0) {
      this.#teardown()
    }
  }

  #handleSpectrogramWorkerError = ({ error }: ErrorEvent) => {
    if (!this.#spectrogramWorker) return
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#spectrogramWorker.terminate()
    this.#spectrogramWorker = null
    this.#onWorkerDone()
  }

  #handleFormantWorkerError = ({ error }: ErrorEvent) => {
    if (!this.#formantWorker) return
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#formantWorker.terminate()
    this.#formantWorker = null
    this.#onWorkerDone()
  }

  #handleVadWorkerError = ({ error }: ErrorEvent) => {
    if (!this.#vadWorker) return
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#vadWorker.terminate()
    this.#vadWorker = null
    this.#onWorkerDone()
  }

  #handleSpectrogramWorkerOutMessage = ({
    data,
  }: MessageEvent<SpectrogramWorkerOutMessage>) => {
    switch (data.type) {
      case 'audioReady': {
        this.#accumulatedPcm.push(data.pcm)
        return
      }
      case 'ended': {
        if (!this.#spectrogramWorker) return
        const analysisSamples =
          (this.#analysis?.timeStepSamples ?? 0) *
          (this.#analysis?.frames.length ?? 0)

        if (analysisSamples > 0) {
          console.assert(
            analysisSamples <=
              this.#accumulatedPcm.reduce(
                (memo, chunk) => memo + chunk.length,
                0,
              ),
            LOG,
            'fewer audio samples than analysis samples',
            analysisSamples,
            this.#accumulatedPcm.reduce(
              (memo, chunk) => memo + chunk.length,
              0,
            ),
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
          let offset = 0
          for (const chunk of this.#accumulatedPcm) {
            if (offset + chunk.length <= analysisSamples) {
              buffer.copyToChannel(chunk, 0, offset)
            } else {
              buffer.copyToChannel(
                chunk.subarray(0, Math.max(0, analysisSamples - offset)),
                0,
                offset,
              )
            }
            offset += chunk.length
          }
          this.emit('recordingComplete', { buffer })
        }
        this.#spectrogramWorker.terminate()
        this.#spectrogramWorker = null
        this.#onWorkerDone()
        return
      }

      case 'params': {
        const params: AnalysisParams = {
          timeStepSamples: data.timeStepSamples,
          sampleRate: data.sampleRate,
          freqStepHz: data.freqStepHz,
          firstBinHz: data.firstBinHz,
        }
        this.#analysis = {
          ...params,
          startTimeSec: 0,
          frames: [],
          voiced: false,
        }
        this.#pendingPatches.clear()

        if (this.#formantWorker && this.#sab) {
          this.#formantWorker.postMessage({
            type: 'init',
            sab: this.#sab,
            sampleRate: data.sampleRate,
            bufSamples: SAB_BUF_SAMPLES,
            timeStepSamples: data.timeStepSamples,
          })
          this.#pendingWorkers++

          this.#formantWorker.addEventListener(
            'error',
            this.#handleFormantWorkerError,
            {
              signal: this.destroyed,
              once: true,
            },
          )

          this.#formantWorker.addEventListener(
            'message',
            this.#handleFormantWorkerOutMessage,
            { signal: this.destroyed },
          )
        }

        if (this.#vadWorker && this.#sab) {
          this.#vadWorker.postMessage({
            type: 'init',
            sab: this.#sab,
            sampleRate: data.sampleRate,
            bufSamples: SAB_BUF_SAMPLES,
            timeStepSamples: data.timeStepSamples,
          })
          this.#pendingWorkers++

          this.#vadWorker.addEventListener(
            'error',
            this.#handleVadWorkerError,
            {
              signal: this.destroyed,
              once: true,
            },
          )

          this.#vadWorker.addEventListener(
            'message',
            this.#handleVadWorkerOutMessage,
            { signal: this.destroyed },
          )
        }

        if (this.#workletNode) {
          this.#sourceNode?.connect(this.#workletNode)
        }
        // To hear loopback
        // this.#sourceNode.connect(this.#context.destination)

        this.emit('chunkStart', { params })
        return
      }

      case 'frame':
        this.#handleAppend(data)
        return

      case 'patch':
        this.#handlePatch(data)
    }
  }

  #handleFormantWorkerOutMessage = ({
    data,
  }: MessageEvent<FormantWorkerOutMessage>) => {
    switch (data.type) {
      case 'patch': {
        this.#handlePatch(data)
        break
      }
      case 'ended': {
        if (!this.#formantWorker) break
        this.#formantWorker.terminate()
        this.#formantWorker = null
        this.#onWorkerDone()
        break
      }
    }
  }

  #handleVadWorkerOutMessage = ({
    data,
  }: MessageEvent<VadWorkerOutMessage>) => {
    switch (data.type) {
      case 'patch': {
        this.#handlePatchFrames(data)
        break
      }
      case 'ended': {
        if (!this.#vadWorker) break
        this.#vadWorker.terminate()
        this.#vadWorker = null
        this.#onWorkerDone()
        break
      }
    }
  }

  #handleAppend = (data: AppendFrameMessage) => {
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
    this.#analysis?.frames.push(frame)!
    this.emit('append', { frame })
    const pending = this.#pendingPatches.get(data.frameIndex)
    if (pending) {
      this.#pendingPatches.delete(data.frameIndex)
      this.#handlePatch(pending)
    }
  }

  #applyPatchFields(frame: AnalysisFrame, data: AnalysisPatch) {
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
  }

  #pendPatch(data: PatchFrameMessage) {
    const existing = this.#pendingPatches.get(data.frameIndex)
    this.#pendingPatches.set(
      data.frameIndex,
      existing ? { ...existing, ...data } : data,
    )
  }

  #handlePatch = (data: PatchFrameMessage) => {
    const frame = this.#analysis?.frames[data.frameIndex]
    if (frame) {
      this.#applyPatchFields(frame, data)
      this.emit('patch', {
        from: data.frameIndex,
        to: data.frameIndex + 1,
      })
    } else {
      this.#pendPatch(data)
    }
  }

  // VAD emits one batch per gate push/end covering a contiguous run of frames
  // flipped to a single value. Apply every frame first, then emit a single
  // patch event spanning [from, to) so the route reconciles and repaints once.
  #handlePatchFrames = (data: PatchFramesMessage) => {
    let from = Infinity
    let to = -Infinity
    for (const decision of data.frames) {
      const frame = this.#analysis?.frames[decision.frameIndex]
      if (frame) {
        this.#applyPatchFields(frame, decision)
        if (decision.frameIndex < from) from = decision.frameIndex
        if (decision.frameIndex + 1 > to) to = decision.frameIndex + 1
      } else {
        // Frame not appended yet (VAD normally lags the spectrogram, so this is
        // rare): stash it to be applied — and patched individually — on append.
        this.#pendPatch({ type: 'patch', ...decision })
      }
    }
    if (to > from) this.emit('patch', { from, to })
  }

  #stop = async () => {
    console.log(LOG, 'stop: waiting for start to complete')
    await this.#started
    console.log(
      LOG,
      'stop: tearing down; persistentMic:',
      this.#settings.persistentMic,
    )

    this.#sourceNode?.disconnect()
    this.#workletNode?.disconnect()
    await this.#context?.close()
    // Write the stop sentinel after the audio context is fully closed so all
    // worklet writes are guaranteed to have landed before workers see it.
    if (this.#sab) {
      const ctrl = new Int32Array(this.#sab, 0, 2)
      Atomics.store(ctrl, 1, 1)
      Atomics.notify(ctrl, 0)
    } else {
      // Workers were never started (e.g. getUserMedia failed); terminate any
      // workers that were allocated before the failure and abort listeners.
      this.#teardown()
    }
    if (!this.#settings.persistentMic) {
      this.#stream?.getTracks().forEach((t) => t.stop())
      if (STREAM === this.#stream) {
        STREAM = null
        STREAM_KEY = null
      }
    }
  }
}
