// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type {
  AnalysisChunk,
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import { resolveSpectrogramParams } from '#/lib/analysis/SpectrogramProcessor'
import type { AudioRingWriterNode } from '#/lib/audio/AudioRingWriter'
import type {
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import type { AudioCaptureSettings } from '#/lib/settings'
import { DEFAULT_SETTINGS } from '#/lib/settings'
import { TypedEventTarget } from '#/lib/TypedEventTarget'
import FormantWorker from '#/lib/workers/FormantWorker?worker'
import type { FormantWorkerOutMessage } from '#/lib/workers/FormantWorker'
import RopeWriterWorker from '#/lib/workers/RopeWriterWorker?worker'
import type { RopeWriterWorkerOutMessage } from '#/lib/workers/RopeWriterWorker'
import SpectrogramWorker from '#/lib/workers/SpectrogramWorker?worker'
import type { SpectrogramWorkerOutMessage } from '#/lib/workers/SpectrogramWorker'
import VadWorker from '#/lib/workers/VadWorker?worker'
import type { VadWorkerOutMessage } from '#/lib/workers/VadWorker'
import type {
  AnalysisPatch,
  PatchFrameMessage,
  PatchFramesMessage,
} from '#/lib/workers/workerMessages'

import type { VadParams } from '../analysis/VadProcessor'

export type MicCaptureFeatures = {
  spectrogram?: boolean
  formant?: boolean
  vad?: boolean | Partial<VadParams>
}

export type CapturePipelineEventMap = {
  append: CustomEvent<{ frame: AnalysisFrame }>
  chunkStart: CustomEvent<{ params: AnalysisParams }>
  notification: CustomEvent<{ message: string }>
  patch: CustomEvent<{ from: number; to: number }>
  recordingComplete: CustomEvent<{}>
  error: CustomEvent<{ error: string }>
  sabRopeShare: CustomEvent<AudioRopeShare>
  sabRopeGrow: CustomEvent<AudioRopeGrow>
  sabRopeSeal: CustomEvent<AudioRopeSeal>
}

const CAPTURE_SAB_BUF_SAMPLES = 8192
const LOG_CAPTURE = '[CapturePipeline]'

export class CapturePipeline extends TypedEventTarget<CapturePipelineEventMap> {
  #analysis: AnalysisChunk | null = null

  #context: AudioContext | null = null
  #sourceNode: MediaStreamAudioSourceNode | null = null
  #workletNode: AudioRingWriterNode | null = null
  #ropeWriterWorker: InstanceType<typeof RopeWriterWorker> | null = null
  #spectrogramWorker: InstanceType<typeof SpectrogramWorker> | null = null
  #formantWorker: InstanceType<typeof FormantWorker> | null = null
  #vadWorker: InstanceType<typeof VadWorker> | null = null
  #stream: MediaStream | null = null
  #sampleRate: number | null = null
  #resolveInitComplete = () => {}
  #started: Promise<void>
  #destroyed: AbortController = new AbortController()
  #settings: AudioCaptureSettings
  #features: Required<MicCaptureFeatures>
  #sab: SharedArrayBuffer | null = null
  #pendingWorkers = 0
  #numFreqs = 0
  #recordingCompleteEmitted = false
  #ropeWriterSignal = new AbortController()
  #spectrogramSignal = new AbortController()
  #formantSignal = new AbortController()
  #vadSignal = new AbortController()
  #resolveWorkersDone = () => {}
  #workersDone: Promise<void> = Promise.resolve()
  #wantRecording = false
  #recordingBegun = false
  #resetting = false

  get destroyed(): AbortSignal {
    return this.#destroyed.signal
  }

  get workersDone(): Promise<void> {
    return this.#workersDone
  }

  constructor({
    signal,
    settings = DEFAULT_SETTINGS,
    features = {},
    context,
    captureModuleReady,
    stream,
  }: {
    signal: AbortSignal
    settings?: AudioCaptureSettings
    features?: MicCaptureFeatures
    context: AudioContext
    captureModuleReady: Promise<void>
    stream: MediaStream
  }) {
    super()
    this.#settings = settings
    this.#features = {
      spectrogram: true,
      formant: true,
      vad: true,
      ...features,
    }
    this.#started = new Promise<void>((resolve) => {
      this.#resolveInitComplete = resolve
    })
    signal.addEventListener('abort', this.#stop)
    void this.#start(context, captureModuleReady, stream)
  }

  async #start(
    context: AudioContext,
    captureModuleReady: Promise<void>,
    stream: MediaStream,
  ) {
    const settings = this.#settings
    try {
      console.log(LOG_CAPTURE, 'start: settings:', {
        inputDeviceId: settings.inputDeviceId ?? '(default)',
        sampleRate: settings.sampleRate,
        browserPreprocessing: settings.browserPreprocessing,
        persistentMic: settings.persistentMic,
      })

      this.#ropeWriterWorker = new RopeWriterWorker()
      if (this.#features.spectrogram)
        this.#spectrogramWorker = new SpectrogramWorker()
      if (this.#features.formant) this.#formantWorker = new FormantWorker()
      if (this.#features.vad) this.#vadWorker = new VadWorker()

      this.#context = context
      console.log(
        LOG_CAPTURE,
        'start: AudioContext sampleRate:',
        this.#context.sampleRate,
      )

      await captureModuleReady

      this.#stream = stream
      const track = this.#stream.getTracks()[0]
      track?.addEventListener(
        'ended',
        async () => {
          this.emit('error', { error: 'Microphone disconnected' })
          await this.#stop()
        },
        { signal: this.destroyed },
      )
      console.log(
        LOG_CAPTURE,
        'start: received track settings:',
        track?.getSettings(),
      )
      console.log(LOG_CAPTURE, 'start: track label:', track?.label)

      this.#sampleRate = this.#context.sampleRate
      this.#workletNode = new AudioWorkletNode(
        this.#context,
        'audio-ring-writer',
      )

      this.#sourceNode = this.#context.createMediaStreamSource(this.#stream)

      this.#sab = new SharedArrayBuffer(8 + CAPTURE_SAB_BUF_SAMPLES * 4)
      this.#workletNode.port.postMessage({
        type: 'init',
        sab: this.#sab,
        bufSamples: CAPTURE_SAB_BUF_SAMPLES,
      })

      this.#setupWorkerListeners()
    } catch (err) {
      this.emit('error', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    this.#resolveInitComplete()
    if (this.#wantRecording) this.#beginRecording()
  }

  record(): void {
    this.#wantRecording = true
    if (this.#resetting) return
    this.#beginRecording()
  }

  #beginRecording(): void {
    if (this.#recordingBegun) return
    if (!this.#ropeWriterWorker || !this.#sab || this.#sampleRate === null) {
      return
    }
    this.#recordingBegun = true
    this.#workersDone = new Promise<void>((resolve) => {
      this.#resolveWorkersDone = resolve
    })
    this.#ropeWriterWorker.postMessage({
      type: 'init',
      sab: this.#sab,
      sampleRate: this.#sampleRate,
      bufSamples: CAPTURE_SAB_BUF_SAMPLES,
    })
    this.#pendingWorkers++
  }

  async softReset(features?: MicCaptureFeatures): Promise<void> {
    if (this.#destroyed.signal.aborted) return
    await this.#started
    this.#resetting = true
    this.#wantRecording = false

    if (features) {
      this.#features = {
        spectrogram: true,
        formant: true,
        vad: true,
        ...features,
      }
    }

    if (this.#recordingBegun && this.#sab) {
      const ctrl = new Int32Array(this.#sab, 0, 2)
      Atomics.store(ctrl, 1, 1)
      Atomics.notify(ctrl, 0)
      this.#recordingBegun = false
      await this.#workersDone
    } else {
      // No recording was in flight to drain — workers (if any were created
      // by #start) still need to be terminated before we replace them below.
      this.#teardownWorkers()
    }

    this.#sourceNode?.disconnect()

    this.#sab = new SharedArrayBuffer(8 + CAPTURE_SAB_BUF_SAMPLES * 4)
    this.#workletNode?.port.postMessage({
      type: 'init',
      sab: this.#sab,
      bufSamples: CAPTURE_SAB_BUF_SAMPLES,
    })

    this.#ropeWriterWorker = new RopeWriterWorker()
    if (this.#features.spectrogram)
      this.#spectrogramWorker = new SpectrogramWorker()
    if (this.#features.formant) this.#formantWorker = new FormantWorker()
    if (this.#features.vad) this.#vadWorker = new VadWorker()

    this.#setupWorkerListeners()

    this.#recordingCompleteEmitted = false
    this.#pendingWorkers = 0
    this.#analysis = null

    this.#resetting = false

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- record() may re-raise during the await
    if (this.#wantRecording) this.#beginRecording()
  }

  #setupWorkerListeners(): void {
    if (!this.#ropeWriterWorker) return
    this.#ropeWriterWorker.addEventListener(
      'error',
      this.#handleRopeWriterWorkerError,
      { signal: this.#ropeWriterSignal.signal, once: true },
    )
    this.#ropeWriterWorker.addEventListener(
      'message',
      this.#handleRopeWriterWorkerOutMessage,
      { signal: this.#ropeWriterSignal.signal },
    )

    if (this.#spectrogramWorker) {
      this.#spectrogramWorker.addEventListener(
        'error',
        this.#handleSpectrogramWorkerError,
        { signal: this.#spectrogramSignal.signal, once: true },
      )
      this.#spectrogramWorker.addEventListener(
        'message',
        this.#handleSpectrogramWorkerOutMessage,
        { signal: this.#spectrogramSignal.signal },
      )
    }

    if (this.#formantWorker) {
      this.#formantWorker.addEventListener(
        'error',
        this.#handleFormantWorkerError,
        { signal: this.#formantSignal.signal, once: true },
      )
      this.#formantWorker.addEventListener(
        'message',
        this.#handleFormantWorkerOutMessage,
        { signal: this.#formantSignal.signal },
      )
    }

    if (this.#vadWorker) {
      this.#vadWorker.addEventListener('error', this.#handleVadWorkerError, {
        signal: this.#vadSignal.signal,
        once: true,
      })
      this.#vadWorker.addEventListener(
        'message',
        this.#handleVadWorkerOutMessage,
        { signal: this.#vadSignal.signal },
      )
    }
  }

  #teardownWorkers(): void {
    this.#ropeWriterWorker?.terminate()
    this.#ropeWriterWorker = null
    this.#ropeWriterSignal.abort()
    this.#ropeWriterSignal = new AbortController()

    this.#spectrogramWorker?.terminate()
    this.#spectrogramWorker = null
    this.#spectrogramSignal.abort()
    this.#spectrogramSignal = new AbortController()

    this.#formantWorker?.terminate()
    this.#formantWorker = null
    this.#formantSignal.abort()
    this.#formantSignal = new AbortController()

    this.#vadWorker?.terminate()
    this.#vadWorker = null
    this.#vadSignal.abort()
    this.#vadSignal = new AbortController()
  }

  #teardown(): void {
    this.#teardownWorkers()
    this.#destroyed.abort()
  }

  #onWorkerDone(): void {
    if (--this.#pendingWorkers === 0) {
      if (!this.#recordingCompleteEmitted) {
        this.#recordingCompleteEmitted = true
        this.emit('recordingComplete', {})
      }
      this.#teardownWorkers()
      this.#resolveWorkersDone()
    }
  }

  #handleRopeWriterWorkerError = ({ error }: ErrorEvent): void => {
    if (!this.#ropeWriterWorker) return
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#ropeWriterWorker.terminate()
    this.#ropeWriterWorker = null
    this.#forwardRopeSeal()
    this.#onWorkerDone()
  }

  #handleSpectrogramWorkerError = ({ error }: ErrorEvent): void => {
    if (!this.#spectrogramWorker) return
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#spectrogramWorker.terminate()
    this.#spectrogramWorker = null
    this.#onWorkerDone()
  }

  #handleFormantWorkerError = ({ error }: ErrorEvent): void => {
    if (!this.#formantWorker) return
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#formantWorker.terminate()
    this.#formantWorker = null
    this.#onWorkerDone()
  }

  #handleVadWorkerError = ({ error }: ErrorEvent): void => {
    if (!this.#vadWorker) return
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#vadWorker.terminate()
    this.#vadWorker = null
    this.#onWorkerDone()
  }

  #initConsumerWorkers(rope: AudioRopeShare, sampleRate: number): void {
    const sp = resolveSpectrogramParams(
      {
        effectiveWindowLengthSec: 0.005,
        maxFrequencyHz: Math.min(5500, sampleRate / 2),
        timeStepSec: 0.002,
        freqStepHz: 20,
        windowShape: 'gaussian',
      },
      sampleRate,
    )

    const params: AnalysisParams = {
      timeStepSamples: Math.round(sp.actualTimeStepSec * sampleRate),
      sampleRate,
      freqStepHz: sp.actualFreqStepHz,
      firstBinHz: sp.f1Hz,
    }

    this.#analysis = {
      ...params,
      startTimeSec: 0,
      frames: [],
      voiced: false,
    }
    this.#numFreqs = sp.numFreqs
    this.emit('chunkStart', { params })

    if (this.#spectrogramWorker) {
      this.#spectrogramWorker.postMessage({ type: 'init', rope, sampleRate })
      this.#pendingWorkers++
    }

    if (this.#formantWorker) {
      this.#formantWorker.postMessage({ type: 'init', rope, sampleRate })
      this.#pendingWorkers++
    }

    if (this.#vadWorker) {
      this.#vadWorker.postMessage({
        type: 'init',
        rope,
        sampleRate,
        params:
          typeof this.#features.vad === 'boolean' ? {} : this.#features.vad,
      })
      this.#pendingWorkers++
    }

    if (this.#workletNode) {
      this.#sourceNode?.connect(this.#workletNode)
    }
  }

  #forwardRopeGrow(grow: AudioRopeGrow): void {
    this.#spectrogramWorker?.postMessage({ type: 'rope-grow', grow })
    this.#formantWorker?.postMessage({ type: 'rope-grow', grow })
    this.#vadWorker?.postMessage({ type: 'rope-grow', grow })
    this.emit('sabRopeGrow', grow)
  }

  #forwardRopeSeal(): void {
    this.#spectrogramWorker?.postMessage({ type: 'rope-seal' })
    this.#formantWorker?.postMessage({ type: 'rope-seal' })
    this.#vadWorker?.postMessage({ type: 'rope-seal' })
    this.emit('sabRopeSeal', { type: 'audio-rope-seal' })
  }

  #handleRopeWriterWorkerOutMessage = ({
    data,
  }: MessageEvent<RopeWriterWorkerOutMessage>): void => {
    switch (data.type) {
      case 'rope-ready': {
        this.#initConsumerWorkers(data.rope, data.sampleRate)
        this.emit('sabRopeShare', data.rope)
        return
      }

      case 'audio-rope-grow': {
        this.#forwardRopeGrow(data)
        return
      }

      case 'audio-rope-seal': {
        this.#forwardRopeSeal()
        return
      }

      case 'ended': {
        if (!this.#ropeWriterWorker) return
        this.#ropeWriterWorker.terminate()
        this.#ropeWriterWorker = null
        this.#onWorkerDone()
        return
      }
    }
  }

  #maybeEmitRecordingComplete(): void {
    if (
      !this.#recordingCompleteEmitted &&
      (this.#analysis?.frames.length ?? 0) > 0
    ) {
      this.#recordingCompleteEmitted = true
      this.emit('recordingComplete', {})
    }
  }

  #handleSpectrogramWorkerOutMessage = ({
    data,
  }: MessageEvent<SpectrogramWorkerOutMessage>): void => {
    switch (data.type) {
      case 'ended': {
        if (!this.#spectrogramWorker) return
        this.#maybeEmitRecordingComplete()
        this.#spectrogramWorker.terminate()
        this.#spectrogramWorker = null
        this.#onWorkerDone()
        return
      }

      case 'patch':
        this.#handlePatch(data)
        return
    }
  }

  #handleFormantWorkerOutMessage = ({
    data,
  }: MessageEvent<FormantWorkerOutMessage>): void => {
    switch (data.type) {
      case 'patch': {
        this.#handlePatch(data)
        break
      }
      case 'ended': {
        if (!this.#formantWorker) break
        this.#maybeEmitRecordingComplete()
        this.#formantWorker.terminate()
        this.#formantWorker = null
        this.#onWorkerDone()
        break
      }
    }
  }

  #handleVadWorkerOutMessage = ({
    data,
  }: MessageEvent<VadWorkerOutMessage>): void => {
    switch (data.type) {
      case 'patch': {
        this.#handlePatchFrames(data)
        break
      }
      case 'ended': {
        if (!this.#vadWorker) break
        this.#maybeEmitRecordingComplete()
        this.#vadWorker.terminate()
        this.#vadWorker = null
        this.#onWorkerDone()
        break
      }
    }
  }

  #applyPatchFields(frame: AnalysisFrame, data: AnalysisPatch): void {
    if (data.spectrum !== undefined) frame.spectrum = data.spectrum
    if (data.rms !== undefined) frame.rms = data.rms
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
    if (data.lunaBrightness !== undefined)
      frame.lunaBrightness = data.lunaBrightness
  }

  #ensureFrame(frameIndex: number): { frame: AnalysisFrame; isNew: boolean } {
    const frames = this.#analysis!.frames
    const isNew = frameIndex >= frames.length
    while (frames.length <= frameIndex) {
      const frame: AnalysisFrame = {
        spectrum: new Float32Array(this.#numFreqs),
        rms: 0,
        speechProbability: 0,
        pitchDetected: false,
        speechDetected: null,
        f0: 0,
        f1: null,
        f2: null,
        f3: null,
        lunaBrightness: null,
      }
      frames.push(frame)
    }
    return { frame: frames[frameIndex]!, isNew }
  }

  #handlePatch = (data: PatchFrameMessage): void => {
    const { frame, isNew } = this.#ensureFrame(data.frameIndex)
    this.#applyPatchFields(frame, data)
    if (isNew) {
      this.emit('append', { frame })
    } else {
      this.emit('patch', {
        from: data.frameIndex,
        to: data.frameIndex + 1,
      })
    }
  }

  #handlePatchFrames = (data: PatchFramesMessage): void => {
    let appendFrom = Infinity
    let appendTo = -Infinity
    let patchFrom = Infinity
    let patchTo = -Infinity
    for (const decision of data.frames) {
      const { frame, isNew } = this.#ensureFrame(decision.frameIndex)
      this.#applyPatchFields(frame, decision)
      if (isNew) {
        if (decision.frameIndex < appendFrom) appendFrom = decision.frameIndex
        if (decision.frameIndex + 1 > appendTo)
          appendTo = decision.frameIndex + 1
      } else {
        if (decision.frameIndex < patchFrom) patchFrom = decision.frameIndex
        if (decision.frameIndex + 1 > patchTo) patchTo = decision.frameIndex + 1
      }
    }
    if (patchTo > patchFrom)
      this.emit('patch', { from: patchFrom, to: patchTo })
    for (let i = appendFrom; i < appendTo; i++) {
      this.emit('append', { frame: this.#analysis!.frames[i]! })
    }
  }

  #stopping: Promise<void> | null = null
  #stop = async (): Promise<void> => {
    if (!this.#stopping) {
      this.#stopping = (async () => {
        try {
          console.log(LOG_CAPTURE, 'stop: waiting for start to complete')
          await this.#started
          console.log(
            LOG_CAPTURE,
            'stop: tearing down; persistentMic:',
            this.#settings.persistentMic,
          )

          this.#sourceNode?.disconnect()
          this.#workletNode?.disconnect()
          if (this.#recordingBegun && this.#sab) {
            const ctrl = new Int32Array(this.#sab, 0, 2)
            Atomics.store(ctrl, 1, 1)
            Atomics.notify(ctrl, 0)
            this.#recordingBegun = false
            void this.#workersDone.then(() => this.#teardown())
          } else {
            this.#teardown()
          }
        } finally {
          this.#stopping = null
        }
      })()
    }

    await this.#stopping
  }
}
