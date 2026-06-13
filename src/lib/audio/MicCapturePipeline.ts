// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { toast } from 'sonner'

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
import {
  buildAudioConstraints,
  DEFAULT_SETTINGS,
  updateSettings,
} from '#/lib/settings'
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

const SAB_BUF_SAMPLES = 8192

type MicCaptureOutEvents = {
  append: CustomEvent<{ frame: AnalysisFrame }>
  chunkStart: CustomEvent<{ params: AnalysisParams }>
  patch: CustomEvent<{ from: number; to: number }>
  recordingComplete: Event
  error: CustomEvent<{ error: string }>
  sabRopeShare: CustomEvent<AudioRopeShare>
  sabRopeGrow: CustomEvent<AudioRopeGrow>
  sabRopeSeal: CustomEvent<AudioRopeSeal>
}

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
    console.log(LOG, 'preInit: persistent stream settings:', trackSettings)
  } catch (err) {
    const fixed = await fixSettingsConstraint(settings, err)
    if (!fixed) {
      toast('Failed to open microphone. Check permissions and try again.')
    }
    console.warn(LOG, 'preInit: failed to open persistent stream:', err)
  }
}

export type MicCaptureFeatures = {
  spectrogram?: boolean
  formant?: boolean
  vad?: boolean | Partial<VadParams>
}

export class MicCapturePipeline extends TypedEventTarget<MicCaptureOutEvents> {
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
  // Per-worker abort controllers so workers can be torn down independently (e.g.
  // during a soft-reset for a new recording) without killing the main #destroyed
  // signal that governs the full pipeline lifecycle.
  #ropeWriterSignal = new AbortController()
  #spectrogramSignal = new AbortController()
  #formantSignal = new AbortController()
  #vadSignal = new AbortController()
  // Resolved when all workers from the current recording have terminated.
  #resolveWorkersDone = () => {}
  #workersDone: Promise<void> = Promise.resolve()
  // Split lifecycle: the constructor warms up (workers, worklet, stream, SAB)
  // but does not stream audio. `record()` flips `#wantRecording`; once warm
  // setup has finished, `#beginRecording` initialises the rope writer, which in
  // turn inits the consumer workers and connects the source — only then does
  // audio reach the ring buffer and rope. `#recordingBegun` guards both against
  // double-starting and against signalling a rope writer that was never inited.
  #wantRecording = false
  #recordingBegun = false
  // Set during softReset() so that race-condition record() calls are deferred
  // until the new workers are ready.
  #resetting = false

  get destroyed(): AbortSignal {
    return this.#destroyed.signal
  }

  constructor({
    signal,
    settings = DEFAULT_SETTINGS,
    features = {},
    context,
    captureModuleReady,
  }: {
    signal: AbortSignal
    settings?: AudioCaptureSettings
    features?: MicCaptureFeatures
    /** Shared AudioContext to record through. Must already be resumed or resuming. */
    context: AudioContext
    /** Promise that resolves once the audio-ring-writer worklet is registered. */
    captureModuleReady: Promise<void>
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
    void this.#start(context, captureModuleReady)
  }

  async #start(context: AudioContext, captureModuleReady: Promise<void>) {
    const settings = this.#settings
    try {
      const key = streamKey(settings)

      console.log(LOG, 'start: settings:', {
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
        LOG,
        'start: AudioContext sampleRate:',
        this.#context.sampleRate,
      )

      await captureModuleReady

      const constraints = buildAudioConstraints(settings)
      console.log(LOG, 'start: requested audio constraints:', constraints)

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
      this.#workletNode = new AudioWorkletNode(
        this.#context,
        'audio-ring-writer',
      )

      this.#sourceNode = this.#context.createMediaStreamSource(this.#stream)

      this.#sab = new SharedArrayBuffer(8 + SAB_BUF_SAMPLES * 4)
      this.#workletNode.port.postMessage({
        type: 'init',
        sab: this.#sab,
        bufSamples: SAB_BUF_SAMPLES,
      })

      this.#setupWorkerListeners()
    } catch (err) {
      const settingsChanged = await fixSettingsConstraint(settings, err)
      if (settingsChanged) {
        return
      }

      this.emit('error', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    this.#resolveInitComplete()
    // If `record()` was called while warm setup was still in flight, start
    // streaming now that the rope writer, worklet, and SAB exist.
    if (this.#wantRecording) this.#beginRecording()
  }

  /**
   * Begin streaming audio into the ring buffer and rope. Safe to call before
   * warm setup finishes (it will start once `#start` completes) and idempotent
   * across repeated calls. Without this, `active` keeps the pipeline warm but
   * silent.
   */
  record() {
    this.#wantRecording = true
    if (this.#resetting) return
    this.#beginRecording()
  }

  #beginRecording() {
    if (this.#recordingBegun) return
    // Warm setup not finished yet (or failed). The tail of `#start` re-checks
    // `#wantRecording` and calls us again once everything exists.
    if (!this.#ropeWriterWorker || !this.#sab || this.#sampleRate === null) {
      return
    }
    this.#recordingBegun = true
    // Reset the workers-done promise so softReset can await this recording's workers.
    this.#workersDone = new Promise<void>((resolve) => {
      this.#resolveWorkersDone = resolve
    })
    // Initing the rope writer kicks off `rope-ready`, which inits the consumer
    // workers and connects the source node (see #initConsumerWorkers).
    this.#ropeWriterWorker.postMessage({
      type: 'init',
      sab: this.#sab,
      sampleRate: this.#sampleRate,
      bufSamples: SAB_BUF_SAMPLES,
    })
    this.#pendingWorkers++
  }

  /**
   * Prepare the pipeline for a new recording without tearing down the audio
   * graph (stream, source node, worklet). Signals the current recording to end,
   * waits for workers to finish, then creates fresh workers and a new SAB.
   */
  async softReset(features?: MicCaptureFeatures): Promise<void> {
    if (this.#destroyed.signal.aborted) return
    await this.#started
    this.#resetting = true
    // Clear the previous recording's request. If record() is called during the
    // reset it will re-raise the flag; the tail below picks it up.
    this.#wantRecording = false

    if (features) {
      this.#features = {
        spectrogram: true,
        formant: true,
        vad: true,
        ...features,
      }
    }

    // Signal the current recording to end so the rope writer flushes and seals.
    if (this.#recordingBegun && this.#sab) {
      const ctrl = new Int32Array(this.#sab, 0, 2)
      Atomics.store(ctrl, 1, 1)
      Atomics.notify(ctrl, 0)
      this.#recordingBegun = false
    }

    // Wait for workers from the current recording to finish processing.
    await this.#workersDone

    // Disconnect source from worklet so the new recording gets a clean connection.
    this.#sourceNode?.disconnect()

    // Fresh SAB and worklet init.
    this.#sab = new SharedArrayBuffer(8 + SAB_BUF_SAMPLES * 4)
    this.#workletNode?.port.postMessage({
      type: 'init',
      sab: this.#sab,
      bufSamples: SAB_BUF_SAMPLES,
    })

    // Create fresh workers.
    this.#ropeWriterWorker = new RopeWriterWorker()
    if (this.#features.spectrogram)
      this.#spectrogramWorker = new SpectrogramWorker()
    if (this.#features.formant) this.#formantWorker = new FormantWorker()
    if (this.#features.vad) this.#vadWorker = new VadWorker()

    this.#setupWorkerListeners()

    // Reset per-recording state.
    this.#recordingCompleteEmitted = false
    this.#pendingWorkers = 0
    this.#analysis = null

    this.#resetting = false

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- record() may re-raise during the await
    if (this.#wantRecording) this.#beginRecording()
  }

  #setupWorkerListeners() {
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

  // Terminate workers and clean up their listeners without aborting the main
  // pipeline signal. Used both for full teardown (via #teardown) and soft-reset
  // (where the audio graph lives on).
  #teardownWorkers() {
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

  #teardown() {
    this.#teardownWorkers()
    this.#destroyed.abort()
  }

  #onWorkerDone() {
    if (--this.#pendingWorkers === 0) {
      // Final fallback: if no consumer worker emitted recordingComplete (e.g.
      // all features disabled, or zero-frame recording), emit it now so callers
      // are never left waiting.
      if (!this.#recordingCompleteEmitted) {
        this.#recordingCompleteEmitted = true
        this.emit('recordingComplete')
      }
      this.#teardownWorkers()
      this.#resolveWorkersDone()
    }
  }

  #handleRopeWriterWorkerError = ({ error }: ErrorEvent) => {
    if (!this.#ropeWriterWorker) return
    this.emit('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.#ropeWriterWorker.terminate()
    this.#ropeWriterWorker = null
    // Seal the rope on consumer-side so their AudioRopeReader loops can exit cleanly.
    // Without this, consumers block forever on Atomics.waitAsync if the writer crashes
    // before it called rope.seal() itself.
    this.#forwardRopeSeal()
    this.#onWorkerDone()
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

  #initConsumerWorkers(rope: AudioRopeShare, sampleRate: number) {
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

  #forwardRopeGrow(grow: AudioRopeGrow) {
    this.#spectrogramWorker?.postMessage({ type: 'rope-grow', grow })
    this.#formantWorker?.postMessage({ type: 'rope-grow', grow })
    this.#vadWorker?.postMessage({ type: 'rope-grow', grow })
    this.emit('sabRopeGrow', grow)
  }

  #forwardRopeSeal() {
    this.#spectrogramWorker?.postMessage({ type: 'rope-seal' })
    this.#formantWorker?.postMessage({ type: 'rope-seal' })
    this.#vadWorker?.postMessage({ type: 'rope-seal' })
    this.emit('sabRopeSeal', { type: 'audio-rope-seal' })
  }

  #handleRopeWriterWorkerOutMessage = ({
    data,
  }: MessageEvent<RopeWriterWorkerOutMessage>) => {
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

  #maybeEmitRecordingComplete() {
    if (
      !this.#recordingCompleteEmitted &&
      (this.#analysis?.frames.length ?? 0) > 0
    ) {
      this.#recordingCompleteEmitted = true
      this.emit('recordingComplete')
    }
  }

  #handleSpectrogramWorkerOutMessage = ({
    data,
  }: MessageEvent<SpectrogramWorkerOutMessage>) => {
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
  }: MessageEvent<FormantWorkerOutMessage>) => {
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
  }: MessageEvent<VadWorkerOutMessage>) => {
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

  #applyPatchFields(frame: AnalysisFrame, data: AnalysisPatch) {
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
        speechDetected: false,
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

  #handlePatch = (data: PatchFrameMessage) => {
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

  #handlePatchFrames = (data: PatchFramesMessage) => {
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
    // Patch before append: at speech onset the batch contains pre-roll patch
    // frames (existing, now voiced) AND the new onset frame (voiced). If append
    // fired first, handleAppend's `voiced ||= true` would mark the whole chunk
    // voiced before reconcileVoicingAt can split it at the pre-roll boundary.
    if (patchTo > patchFrom)
      this.emit('patch', { from: patchFrom, to: patchTo })
    for (let i = appendFrom; i < appendTo; i++) {
      this.emit('append', { frame: this.#analysis!.frames[i]! })
    }
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
    if (this.#recordingBegun && this.#sab) {
      const ctrl = new Int32Array(this.#sab, 0, 2)
      Atomics.store(ctrl, 1, 1)
      Atomics.notify(ctrl, 0)
      this.#recordingBegun = false
      // Teardown after workers finish, in the background.
      void this.#workersDone.then(() => this.#teardown())
    } else {
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
