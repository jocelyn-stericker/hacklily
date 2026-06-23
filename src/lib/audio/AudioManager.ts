// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import type {
  AudioRope,
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import ropeSourceUrl from '#/lib/audio/AudioRopeSourceNode?worker&url'
import ropeWriterUrl from '#/lib/audio/RopeWriterNode?worker&url'
import type { AudioCaptureSettings } from '#/lib/settings'
import {
  buildAudioConstraints,
  DEFAULT_SETTINGS,
  preferredSampleRate,
  updateSettings,
} from '#/lib/settings'
import { Sink } from '#/lib/Sink'
import { TypedEventTarget } from '#/lib/TypedEventTarget'

import { CapturePipeline } from './CapturePipeline'
import type { MicCaptureFeatures } from './CapturePipeline'
import { PlaybackPipeline } from './PlaybackPipeline'

export type { MicCaptureFeatures }

export type CaptureSubState =
  | 'idle' // no pipeline, no context lease
  | 'warming' // getUserMedia + worklet loading in flight
  | 'warm' // pipeline ready, mic held open, not streaming
  | 'recording' // streaming audio to ring buffer and rope
  | 'resetting' // stop requested, workers draining before next take
  | 'waitingForSettings' // we want to record, but we need settings

export type PlaybackSubState =
  | 'idle' // no playback pipeline
  | 'playing' // playback active

export type AudioPipelineState = {
  capture: CaptureSubState
  playback: PlaybackSubState
}

type TransitionDomain<T extends string> = {
  transitions: Record<T, T[]>
  state: T
  label: string
}

export type InboundEvent =
  | { type: 'START_CAPTURE' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'STOP_CAPTURE' }
  | {
      type: 'ENABLE_PLAYBACK'
      startAtSec?: number
      ropes?: Array<AudioRope>
      gains?: Array<number>
      endAtSec?: number
    }
  | { type: 'DISABLE_PLAYBACK' }
  | { type: 'SEEK'; timeSec: number }
  | { type: 'SETTINGS_CHANGE'; settings: Partial<AudioCaptureSettings> }
  | { type: 'ERROR'; error: string }
  | { type: 'VISIBILITY_CHANGE'; hidden: boolean }
  | { type: 'CONTEXT_INTERRUPTED' }
  | { type: 'MIC_CAPTURE_FEATURES'; features: MicCaptureFeatures }

type OutboundEventMap = {
  // Mic capture — mirrors MicCapturePipeline events
  append: CustomEvent<{ frame: AnalysisFrame }>
  chunkStart: CustomEvent<{ params: AnalysisParams }>
  notification: CustomEvent<{ message: string }>
  patch: CustomEvent<{ from: number; to: number }>
  recordingComplete: CustomEvent<{}>
  sabRopeShare: CustomEvent<AudioRopeShare>
  sabRopeGrow: CustomEvent<AudioRopeGrow>
  sabRopeSeal: CustomEvent<AudioRopeSeal>
  // Playback
  positionChanged: CustomEvent<{ timeSec: number }>
  stop: Event
  // Shared
  error: CustomEvent<{ error: string }>
  stateChanged: CustomEvent<{ state: AudioPipelineState; reason?: string }>
}

function streamKey(settings: AudioCaptureSettings): string {
  return JSON.stringify({
    deviceId: settings.inputDeviceId,
    sampleRate: settings.sampleRate,
    preprocessing: settings.browserPreprocessing,
  })
}

async function fixPersistentStreamConstraint(
  settings: AudioCaptureSettings,
  error: any,
): Promise<string | null> {
  if (error?.constraint === 'deviceId' && settings.inputDeviceId !== null) {
    console.log('[persistentStream] preInit: overconstrainted on deviceId')
    await updateSettings({ inputDeviceId: null })
    return 'Selected mic unavailable, using default'
  } else if (
    error?.constraint === 'sampleRate' &&
    settings.sampleRate !== 'auto'
  ) {
    console.log('[persistentStream] preInit: overconstrainted on sampleRate')
    await updateSettings({ sampleRate: 'auto' })
    return 'Selected sample rate unavailable, using default'
  }
  return null
}

const LOG = '[AudioManager]'

// One `AudioManager` instance owns:
//
// - A single `AudioContext` (created lazily on first `unlockForGesture()` or
//   first pipeline activation).
// - A single per-loop persistent-mic `MediaStream` cache.
// - A capture pipeline and a playback pipeline (independently active).
// - The serialized event queue and outbound event dispatch.
//
// Each route (index, practice) creates one loop and passes it to both its
// capture and playback hooks. The route's gesture handlers must call
// `unlockForGesture()` synchronously so the AudioContext starts in a running
// state on iOS Safari.

export class AudioManager extends TypedEventTarget<OutboundEventMap> {
  // -- state ----------------------------------------------------------------
  #capture: TransitionDomain<CaptureSubState> = {
    transitions: {
      idle: ['warming'],
      warming: ['warm', 'idle', 'waitingForSettings'],
      // 'warm' can drop to 'warming' for a feature / settings rebuild while
      // remaining user-active; START_CAPTURE while warm is still a no-op,
      // guarded explicitly in its handler.
      warm: ['warming', 'recording', 'idle'],
      // 'recording' can drop to 'warming' for a settings rebuild mid-take; the
      // handler awaits the workers before tearing the audio graph down.
      recording: ['resetting', 'warming'],
      // 'resetting' returns to 'recording' after a mid-take feature change
      // (MIC_CAPTURE_FEATURES soft-reset), or to 'warm' after STOP_RECORDING.
      resetting: ['warm', 'idle', 'recording'],
      waitingForSettings: ['warming', 'idle'],
    },
    state: 'idle',
    label: 'capture',
  }

  #playback: TransitionDomain<PlaybackSubState> = {
    transitions: {
      idle: ['playing'],
      playing: ['idle'],
    },
    state: 'idle',
    label: 'playback',
  }

  // -- event loop machinery -------------------------------------------------
  #eventSink = new Sink<InboundEvent>()
  #abortController = new AbortController()
  #destroyed = false

  // -- per-instance context cache ------------------------------------------
  #context: AudioContext | null = null
  #preferredSampleRate: number | undefined
  #contextSampleRate: number | undefined = undefined
  #playbackModuleReady: Promise<void> | null = null
  #captureModuleReady: Promise<void> | null = null
  // Set when the current context is poisoned by a UA interruption (Safari's
  // `interrupted`/`suspended` while we still hold a lease -- webkit.org/b/221334)
  // and must be rebuilt rather than resumed. Consumed by the recovery paths.
  #contextDirty = false
  // True while `#recoverFromInterruption` is tearing down / rebuilding, so the
  // `statechange` listener doesn't re-trigger recovery off the transient
  // suspend/close it causes (or off a fresh context that comes up interrupted).
  #recovering = false

  // -- per-instance persistent-mic stream cache ----------------------------
  #persistentStream: MediaStream | null = null
  #persistentStreamKey: string | null = null

  // -- capture sub-system ---------------------------------------------------
  #capturePipeline: CapturePipeline | null = null
  #captureCtrl: AbortController | null = null
  #captureLease: { release(): Promise<void> } | null = null
  #captureSettings: AudioCaptureSettings = { ...DEFAULT_SETTINGS }
  #captureFeatures: MicCaptureFeatures = {}
  // Tracks the most recently opened non-persistent stream so it can be
  // stopped when the pipeline tears down.
  #captureStream: MediaStream | null = null

  // -- playback sub-system --------------------------------------------------
  #playbackPipeline: PlaybackPipeline | null = null
  #playbackCtrl: AbortController | null = null
  #playbackLease: { release(): Promise<void> } | null = null
  #playbackRopes: Array<AudioRope> = []
  #playbackGains: Array<number> = []
  #playbackEndAtSec: number | undefined = undefined
  #playbackStartAtSec = 0
  // True once the pipeline has reported at least one `positionChanged`. The
  // loop only emits outbound `stop` on DISABLE_PLAYBACK if this is true —
  // aborting before any audio has played is silent, mirroring the worklet's
  // contract (only natural end fires `stop`).
  #playbackProducedAudio = false

  constructor(initialPreferredSampleRate?: number) {
    super()
    this.#preferredSampleRate = initialPreferredSampleRate
    void this.#run()
  }

  // Fire-and-forget: resolves immediately after enqueuing; do not await and
  // assume the resulting state change has happened.
  sendEvent(event: InboundEvent): void {
    if (this.#destroyed) {
      return
    }
    this.#eventSink.push(event)
  }

  getState(): AudioPipelineState {
    return {
      capture: this.#capture.state,
      playback: this.#playback.state,
    }
  }

  /**
   * Creates the AudioContext if not yet created, and resumes it. Idempotent.
   * MUST be called from a user gesture on first invocation so the context
   * starts in a running state on iOS Safari. Subsequent invocations are cheap
   * (just send `resume()` to an already-created context).
   */
  async unlockForGesture(): Promise<void> {
    const { context } = this.#getOrCreateContext()
    await context.resume()
  }

  /**
   * Resumes the AudioContext if it was suspended (e.g. after a tab switch).
   * Safe to call without a user gesture -- it just sends `resume()` to the
   * existing context, which the UA allows if the context was previously
   * running. No-op if the context hasn't been created yet.
   */
  async resumeContext(): Promise<void> {
    if (this.#context && this.#context.state !== 'closed') {
      try {
        await this.#context.resume()
      } catch (err) {
        console.warn(err)
        this.emit('error', { error: `Failed to resume: ${String(err)}` })
      }
    }
  }

  /**
   * Suspends the AudioContext. Called automatically when the last lease is
   * released. No-op if the context hasn't been created or is already
   * suspended/closed.
   */
  async suspendContext(): Promise<void> {
    if (this.#context && this.#context.state === 'running') {
      try {
        await this.#context.suspend()
      } catch (err) {
        console.warn(err)
        this.emit('error', { error: `Failed to suspend: ${String(err)}` })
      }
    }
  }

  /**
   * Decodes and plays a one-shot audio clip (e.g. a synthesised reference MP3)
   * through this instance's AudioContext. Unlike a bare `<audio>` element, the
   * context is unlocked synchronously by `unlockForGesture()` and stays running
   * across the `getUserMedia` await — so this plays reliably even when started
   * after the mic-permission prompt, with no per-element autoplay gating to
   * fight. Routing through the context also inherits the iOS `audioSession`
   * config so the clip is audible with the ringer silent.
   *
   * Returns a handle: `stop()` halts playback immediately (idempotent), and
   * `ended` resolves with `true` on natural end or `false` if `stop()` ran
   * first — letting the caller distinguish "clip finished" (advance the loop)
   * from "we cut it short" (don't).
   *
   * `data` is decoded in place; pass a buffer the caller no longer needs.
   */
  async playClip(
    data: ArrayBuffer,
  ): Promise<{ stop: () => void; ended: Promise<boolean> }> {
    const { context } = this.#getOrCreateContext()
    await context.resume()
    const buffer = await context.decodeAudioData(data)

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)

    let stopped = false
    let settle: (naturalEnd: boolean) => void
    const ended = new Promise<boolean>((resolve) => {
      settle = resolve
    })
    source.onended = () => {
      source.disconnect()
      settle(!stopped)
    }
    source.start()

    return {
      stop: () => {
        if (stopped) return
        stopped = true
        try {
          source.stop()
        } catch {
          // Already stopped/ended — `onended` handles teardown.
        }
      },
      ended,
    }
  }

  /**
   * Stops the run loop. Both sub-states reset to idle at the tail of #run,
   * any active pipelines are torn down, leases are released, and the
   * AudioContext is closed. Does not go through the transition table --
   * valid from any state. Idempotent.
   */
  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#abortController.abort()
  }

  // -------------------------------------------------------------------------
  // STATE TRANSITIONS
  // -------------------------------------------------------------------------

  #transition<T extends string>(
    domain: TransitionDomain<T>,
    to: T,
    reason?: string,
    force = false,
  ): boolean {
    const from = domain.state
    if (!force && !domain.transitions[from].includes(to)) {
      console.warn(
        `${LOG} invalid ${domain.label} transition: ${from} → ${to}${reason ? ` (${reason})` : ''}`,
      )
      return false
    }
    domain.state = to
    console.log(
      `${LOG} ${domain.label}: ${from} → ${to}${reason ? `: ${reason}` : ''}`,
    )
    this.emit('stateChanged', { state: this.getState(), reason })
    return true
  }

  // Force both sub-states to idle without going through the transition table.
  // Used for error recovery and destroy. Emits stateChanged if anything changed.
  #forceIdle(reason: string): void {
    const captureChanged = this.#capture.state !== 'idle'
    const playbackChanged = this.#playback.state !== 'idle'
    this.#capture.state = 'idle'
    this.#playback.state = 'idle'
    if (captureChanged || playbackChanged) {
      this.emit('stateChanged', { state: this.getState(), reason })
    }
  }

  // -------------------------------------------------------------------------
  // RUN LOOP
  // -------------------------------------------------------------------------

  async #run(): Promise<void> {
    const signal = this.#abortController.signal
    while (!signal.aborted) {
      const event = await this.#eventSink.next(signal)
      if (event === null) break
      try {
        await this.#handleEvent(event)
      } catch (error) {
        console.error(`${LOG} error processing event ${event.type}:`, error)
        this.emit('error', { error: String(error) })
      }
    }
    await this.#tearDown()
    // The loop owns its AudioContext. Destroy = close.
    if (this.#context) {
      await this.#context.close()
      this.#context = null
      this.#playbackModuleReady = null
      this.#captureModuleReady = null
      this.#contextSampleRate = undefined
    }
    // Release the persistent stream cache too.
    this.#releasePersistentStream()
    this.#forceIdle('destroyed')
  }

  async #handleEvent(event: InboundEvent): Promise<void> {
    switch (event.type) {
      case 'START_CAPTURE':
        return await this.#handleActivateCapture()

      case 'START_RECORDING': {
        if (this.#capture.state === 'idle') {
          await this.#handleActivateCapture()
        }
        if (this.#capture.state !== 'warm') return
        if (!this.#transition(this.#capture, 'recording', 'start recording'))
          return
        this.#capturePipeline?.record()
        break
      }

      case 'STOP_RECORDING': {
        if (this.#capture.state !== 'recording') return
        if (!this.#transition(this.#capture, 'resetting', 'stop recording'))
          return
        // softReset drains workers without tearing down the audio graph; resolves
        // once fresh workers are ready for the next take.
        if (this.#capturePipeline) {
          try {
            await this.#capturePipeline.softReset()
          } catch (err) {
            await this.#failCapture(err, 'soft reset failed')
            return
          }
        }
        this.#transition(this.#capture, 'warm', 'reset complete')
        // Take finished -- if a deferred recovery was waiting on it, run now.
        this.#scheduleRecoveryIfDirty()
        break
      }

      case 'STOP_CAPTURE': {
        if (this.#capture.state === 'idle') return
        await this.#tearDownCapturePipeline()
        this.#transition(this.#capture, 'idle', 'deactivate capture', true)
        break
      }

      case 'ENABLE_PLAYBACK': {
        const { startAtSec = 0, ropes = [], gains = [], endAtSec } = event
        this.#playbackRopes = ropes
        this.#playbackGains = gains
        this.#playbackEndAtSec = endAtSec
        this.#playbackStartAtSec = startAtSec

        if (this.#playback.state === 'playing') {
          this.#playbackProducedAudio = false
          await this.#tearDownPlaybackPipeline()
          if (ropes.length > 0) {
            await this.#buildPlaybackPipeline()
          }
          return
        }

        if (!this.#transition(this.#playback, 'playing', 'enable playback'))
          return
        if (ropes.length === 0) return
        await this.#buildPlaybackPipeline()
        break
      }

      case 'DISABLE_PLAYBACK': {
        if (this.#playback.state !== 'playing') return
        // Abort the pipeline's controller; that triggers its #stop which fires
        // its own internal cleanup. The pipeline does NOT fire `stop` on a
        // user-initiated abort — only on natural end. So we synthesize the
        // outbound `stop` here, but only if the pipeline has actually produced
        // audio. An ENABLE+DISABLE pair that resolves before any `positionChanged`
        // is silent — the user never heard anything, no "stop" needs to be heard.
        const hadAudio = this.#playbackProducedAudio
        await this.#tearDownPlaybackPipeline()
        this.#playbackProducedAudio = false
        if (!this.#transition(this.#playback, 'idle', 'disable playback'))
          return
        if (hadAudio) this.emit('stop')
        // Playback stopped -- if a deferred recovery was waiting on it, run now.
        this.#scheduleRecoveryIfDirty()
        break
      }

      case 'SEEK': {
        // Seek is a genuine user repositioning. The hook layer filters echo (the
        // positionChanged → cursorSec feedback loop) so only real seeks arrive here.
        if (this.#playback.state !== 'playing') return
        await this.#tearDownPlaybackPipeline()
        this.#playbackStartAtSec = event.timeSec
        await this.#buildPlaybackPipeline()
        break
      }

      case 'SETTINGS_CHANGE': {
        // Capture pre-change state so we can resume correctly after the rebuild.
        const wasRecording =
          this.#capture.state === 'recording' ||
          this.#capture.state === 'waitingForSettings'
        const wasActive = this.#capture.state !== 'idle'

        // Track for future activation / rebuilds even when we're idle.
        const prevInputDeviceId = this.#captureSettings.inputDeviceId
        const prevSampleRate = this.#captureSettings.sampleRate
        const prevBrowserPreprocessing =
          this.#captureSettings.browserPreprocessing
        this.#captureSettings = {
          ...this.#captureSettings,
          ...event.settings,
        }
        // Persistent-mic cache: release on flip-off, invalidate on deviceId / sample
        // rate change. Done unconditionally so a future START_CAPTURE sees the
        // right state.
        await this.#updatePersistentStreamCache(this.#captureSettings)

        const hasRelevantChange =
          this.#captureSettings.inputDeviceId !== prevInputDeviceId ||
          this.#captureSettings.sampleRate !== prevSampleRate ||
          this.#captureSettings.browserPreprocessing !==
            prevBrowserPreprocessing
        if (!hasRelevantChange) return
        if (
          !wasActive ||
          (!this.#capturePipeline &&
            this.#capture.state !== 'waitingForSettings')
        )
          return

        // Wait for any in-flight reset to drain, then tear down the pipeline.
        await this.#tearDownCapturePipeline()

        if (
          !this.#transition(
            this.#capture,
            'warming',
            'rebuild for settings change',
          )
        ) {
          return
        }

        // Update preferred sample rate from new settings, then re-acquire stream
        // and rebuild.
        this.#preferredSampleRate = preferredSampleRate(this.#captureSettings)
        try {
          const pipeline = await this.#buildOrWaitForSettings(
            'contraints failed, resetting',
          )
          if (!pipeline) return

          this.#transition(this.#capture, 'warm', 'rebuild complete')
          // If we were recording when the settings change came in, resume streaming.
          if (wasRecording) {
            this.#transition(
              this.#capture,
              'recording',
              'resume after settings change',
            )
            pipeline.record()
          }
        } catch (err) {
          console.error('SETTINGS_CHANGE rebuild failed:', err)
          await this.#failCapture(err, 'rebuild failed')
        }
        break
      }

      case 'ERROR': {
        await this.#handleError(event)
        break
      }

      case 'VISIBILITY_CHANGE': {
        if (event.hidden) {
          // Backgrounded. Browsers keep an active AudioContext *running* in a
          // background tab (that's how background audio works), so its output
          // path can be silently poisoned (~1-2s of write-ahead latency that
          // never recovers -- webkit.org/b/221334) with no `statechange` and no
          // transition out of 'running' to detect. We can't tell a
          // poisoned-but-running context from a healthy one, so flag any existing
          // context on the way out and rebuild it on return rather than resuming.
          if (this.#context) this.#contextDirty = true
          break
        }
        // Returning to the foreground. Rebuild if the context is flagged (set
        // above, or by a background interruption) or came back non-running;
        // otherwise just resume.
        if (
          this.#context &&
          (this.#contextDirty || this.#context.state !== 'running')
        ) {
          await this.#recoverFromInterruption()
        } else {
          await this.resumeContext()
        }
        break
      }

      case 'CONTEXT_INTERRUPTED': {
        // The context was flagged dirty -- either eagerly by a foreground UA
        // interruption (the `statechange` listener) or as a deferred retry once
        // playback/recording ended (`#scheduleRecoveryIfDirty`). Rebuild so a
        // clean context is ready before the next play gesture. No-op if the flag
        // was already cleared, or if audio is active again (recovery re-bails).
        if (this.#contextDirty) await this.#recoverFromInterruption()
        break
      }

      case 'MIC_CAPTURE_FEATURES': {
        const merged = { ...this.#captureFeatures, ...event.features }
        if (JSON.stringify(merged) === JSON.stringify(this.#captureFeatures))
          return
        this.#captureFeatures = merged
        if (
          this.#capture.state !== 'warm' &&
          this.#capture.state !== 'recording'
        )
          return
        if (!this.#capturePipeline) return
        if (this.#capture.state === 'recording') {
          // Mid-recording: soft-reset to swap worker set for the new features.
          if (
            !this.#transition(
              this.#capture,
              'resetting',
              'feature change mid-recording',
            )
          )
            return
          await this.#capturePipeline.softReset(event.features)
          this.#transition(this.#capture, 'recording', 'feature change applied')
          // softReset() sets #wantRecording=false internally; restart explicitly.
          this.#capturePipeline.record()
        } else {
          // Warm: tear down and rebuild with the new features.
          if (
            !this.#transition(
              this.#capture,
              'warming',
              'feature change warm rebuild',
            )
          )
            return
          // Lease is re-acquired below for the rebuild.
          await this.#drainAndAbortCapture()
          this.#stopTransientCaptureStream()
          try {
            const pipeline = await this.#buildOrWaitForSettings(
              'overconstrained, settings changed',
            )
            if (!pipeline) return
            this.#transition(
              this.#capture,
              'warm',
              'feature change rebuild complete',
            )
          } catch (err) {
            await this.#failCapture(err, 'feature rebuild failed')
          }
        }
        break
      }
    }
  }

  /**
   * Returns the per-instance AudioContext, creating it lazily if needed. If
   * the loop's preferred sample rate has changed since the context was last
   * created, the old context is closed and a fresh one is built. Both worklet
   * modules start loading immediately on first creation.
   */
  #getOrCreateContext(): {
    context: AudioContext
    captureModuleReady: Promise<void>
    playbackModuleReady: Promise<void>
  } {
    const rateChanged =
      this.#context !== null &&
      this.#context.state !== 'closed' &&
      this.#preferredSampleRate !== this.#contextSampleRate
    if (rateChanged) {
      void this.#context!.close()
      this.#context = null
    }

    if (!this.#context || this.#context.state === 'closed') {
      if ('audioSession' in navigator) {
        // Keep playback audible even when the iOS ringer is silent.
        // @ts-expect-error non-standard API
        navigator.audioSession.type = 'play-and-record'
      }
      this.#context = new AudioContext({
        sampleRate: this.#preferredSampleRate,
        latencyHint: 'interactive',
      })
      this.#contextSampleRate = this.#preferredSampleRate
      const ctx = this.#context

      // Detect UA-initiated interruptions. We only ever call `suspend()`
      // ourselves when both leases are released, so a transition out of
      // `running` while a lease is still held means the UA interrupted us (a
      // call/Siri, an output-route change, app backgrounding). Mark the context
      // poisoned, and -- when we're in the foreground -- kick off recovery now so
      // a fresh context exists before the user's next play gesture (which must
      // resume() synchronously to satisfy iOS, leaving no room to rebuild then).
      // While hidden we only flag it; `VISIBILITY_CHANGE` recovers on return,
      // avoiding a getUserMedia re-warm in the background.
      ctx.addEventListener('statechange', () => {
        if (this.#context !== ctx || this.#recovering) return
        const state = ctx.state as string
        const leaseHeld =
          this.#captureLease !== null || this.#playbackLease !== null
        if (
          leaseHeld &&
          state !== 'running' &&
          state !== 'closed' &&
          !this.#contextDirty
        ) {
          console.log(`${LOG} context interrupted by UA (state: ${state})`)
          this.#contextDirty = true
          if (typeof document !== 'undefined' && !document.hidden) {
            this.sendEvent({ type: 'CONTEXT_INTERRUPTED' })
          }
        }
      })

      const resetOnFail = () => {
        if (this.#context === ctx) {
          void this.#context.close()
          this.#context = null
          this.#contextSampleRate = undefined
          this.#playbackModuleReady = null
          this.#captureModuleReady = null
        }
      }

      // Start both module fetches immediately so they overlap the gesture→effect gap.
      this.#playbackModuleReady = ctx.audioWorklet
        .addModule(ropeSourceUrl)
        .catch((err: unknown) => {
          console.error(`${LOG} failed to load playback worklet:`, err)
          resetOnFail()
          throw err
        })
      this.#captureModuleReady = ctx.audioWorklet
        .addModule(ropeWriterUrl)
        .catch((err: unknown) => {
          console.error(`${LOG} failed to load capture worklet:`, err)
          resetOnFail()
          throw err
        })
    }
    return {
      context: this.#context,
      captureModuleReady: this.#captureModuleReady!,
      playbackModuleReady: this.#playbackModuleReady!,
    }
  }

  /**
   * Re-attempts a deferred recovery: if the context is still flagged dirty (e.g.
   * recovery bailed earlier because audio was playing/recording), enqueue a
   * rebuild now that the active take/playback has ended. The handler re-checks
   * the flag and `#recoverFromInterruption` re-checks for active audio, so this
   * is a safe no-op when nothing needs doing.
   */
  #scheduleRecoveryIfDirty(): void {
    if (this.#contextDirty) this.sendEvent({ type: 'CONTEXT_INTERRUPTED' })
  }

  /**
   * Recovers from a Safari output-path interruption (webkit.org/b/221334) by
   * discarding the poisoned context and building a fresh one. Triggered on
   * return-to-foreground (`VISIBILITY_CHANGE`) or by a foreground UA interruption
   * (`CONTEXT_INTERRUPTED`). Bails (resuming in place, leaving the flag set) if
   * audio is actively playing/recording. Otherwise closes the old context so a
   * later `#getOrCreateContext()` builds a clean one, and re-warms capture if it was
   * warm so the route's `active` state stays consistent.
   *
   * `#recovering` suppresses the `statechange` listener for the duration so the
   * suspend/close we cause here -- and a fresh context that comes up
   * interrupted -- don't re-trigger recovery.
   */
  async #recoverFromInterruption(): Promise<void> {
    if (!this.#context || this.#context.state === 'closed') {
      this.#contextDirty = false
      return
    }

    // Don't tear down audio the user is actively hearing or capturing: killing
    // an in-flight take loses buffered frames, and cutting off live playback is
    // jarring. Resume the existing (poisoned) context and leave it flagged --
    // `#scheduleRecoveryIfDirty` re-runs recovery once the take/playback ends.
    if (
      this.#capture.state === 'recording' ||
      this.#playback.state === 'playing'
    ) {
      await this.resumeContext()
      return
    }

    const wasWarm = this.#capture.state === 'warm'
    this.#recovering = true
    try {
      // Playback is idle here (we bail above while it's playing), but tear down
      // defensively in case a pipeline reference lingers. The capture pipeline's
      // nodes live on the dying context, so drop it too. These release their
      // leases, which may suspend the old context -- harmless, we're about to
      // close it.
      await this.#tearDownPlaybackPipeline()
      await this.#tearDownCapturePipeline()

      try {
        await this.#context.close()
      } catch (err) {
        console.warn(`${LOG} failed to close interrupted context:`, err)
      }
      this.#context = null
      this.#contextSampleRate = undefined
      this.#playbackModuleReady = null
      this.#captureModuleReady = null

      // Re-warm capture on a fresh context (built lazily by
      // #buildCapturePipeline) if it was warm before the interruption.
      if (!wasWarm) return
      if (
        !this.#transition(
          this.#capture,
          'warming',
          'rebuild after interruption',
        )
      )
        return
      this.#preferredSampleRate = preferredSampleRate(this.#captureSettings)
      try {
        const pipeline = await this.#buildOrWaitForSettings(
          'overconstrained during interruption rebuild',
        )
        if (!pipeline) return
        this.#transition(
          this.#capture,
          'warm',
          'rebuild after interruption complete',
        )
      } catch (err) {
        await this.#failCapture(err, 'rebuild after interruption failed')
      }
    } finally {
      this.#contextDirty = false
      this.#recovering = false
    }
  }

  #stopTransientCaptureStream(): void {
    if (this.#captureStream && this.#captureStream !== this.#persistentStream) {
      this.#captureStream.getTracks().forEach((t) => t.stop())
    }
    this.#captureStream = null
  }

  /**
   * Resolve the MediaStream for an upcoming capture pipeline construction.
   * Reuses the per-loop cached stream if `persistentMic` is on and the
   * constraints match; otherwise opens a fresh stream and caches it.
   */
  async #acquireCaptureStream(
    settings: AudioCaptureSettings,
  ): Promise<MediaStream | null> {
    if (settings.persistentMic) {
      const key = streamKey(settings)
      if (
        this.#persistentStream &&
        this.#persistentStreamKey === key &&
        this.#persistentStream.active
      ) {
        console.log(LOG, 'preInit: reusing cached persistent stream')
        return this.#persistentStream
      }
    }

    const constraints = buildAudioConstraints(settings)
    console.log(
      LOG,
      'preInit: opening mic stream with constraints:',
      constraints,
    )
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: constraints,
      })
      if (settings.persistentMic) {
        // Release any stale cached stream before installing the new one.
        this.#persistentStream?.getTracks().forEach((t) => t.stop())
        this.#persistentStream = stream
        this.#persistentStreamKey = streamKey(settings)
        const trackSettings = stream.getTracks()[0]?.getSettings()
        console.log(
          LOG,
          'preInit: cached persistent stream settings:',
          trackSettings,
        )
      }
      return stream
    } catch (err) {
      const message = await fixPersistentStreamConstraint(settings, err)
      if (message) {
        this.emit('notification', { message })
        // We'll get recreated with new constraints. Relax.
        return null
      }
      this.emit('error', {
        error: 'Failed to open microphone. Check permissions and try again.',
      })
      console.warn(LOG, 'preInit: failed to open mic stream:', err)
      throw err
    }
  }

  /**
   * Manages the persistent-mic cache in response to settings changes. If
   * `persistentMic` flips off, the cache is released. If a non-`persistentMic`
   * setting changes (e.g. deviceId) the cache is invalidated so the next
   * activate re-opens with the new constraints.
   */
  async #updatePersistentStreamCache(
    settings: AudioCaptureSettings,
  ): Promise<void> {
    if (!settings.persistentMic) {
      this.#releasePersistentStream()
      return
    }
    const key = streamKey(settings)
    if (
      this.#persistentStream &&
      this.#persistentStreamKey === key &&
      this.#persistentStream.active
    ) {
      console.log(
        LOG,
        'preInit: persistent stream already open with matching settings',
      )
      return
    }
    // Stale cache: drop and let the next activate re-open.
    this.#releasePersistentStream()
  }

  // -------------------------------------------------------------------------
  // PER-INSTANCE LEASE TRACKING
  // -------------------------------------------------------------------------
  //
  // The loop only ever holds 2 leases (capture + playback), so the "refcount"
  // is implicit: when both are released, the context is suspended.
  // -------------------------------------------------------------------------

  async #acquire(kind: 'capture' | 'playback') {
    const lease = kind === 'capture' ? this.#captureLease : this.#playbackLease
    if (lease) {
      return
    }

    const setLease = (newLease: null | { release: () => Promise<void> }) => {
      if (kind === 'capture') {
        this.#captureLease = newLease
      } else {
        this.#playbackLease = newLease
      }
    }
    await this.resumeContext()
    setLease({
      release: async () => {
        setLease(null)
        if (this.#playbackLease === null && this.#captureLease === null) {
          await this.suspendContext()
        }
      },
    })
  }

  async #release(kind: 'capture' | 'playback'): Promise<void> {
    await (
      kind === 'capture' ? this.#captureLease : this.#playbackLease
    )?.release()
  }

  // -------------------------------------------------------------------------
  // CAPTURE HANDLERS
  // -------------------------------------------------------------------------

  async #handleActivateCapture(): Promise<void> {
    // Already-active is a no-op (the user asked to activate something that's
    // already up). The state machine allows 'warm' → 'warming' for rebuilds
    // (feature / settings changes), so this guard is in the handler, not the
    // transition table.
    if (this.#capture.state === 'warm' || this.#capture.state === 'recording')
      return
    if (!this.#transition(this.#capture, 'warming', 'activate capture')) return
    try {
      // Update preferred sample rate on the loop from current settings, so the
      // context is (re)created at the right rate before pipelines attach.
      this.#preferredSampleRate = preferredSampleRate(this.#captureSettings)

      // Pre-init the persistent stream cache (release if persistentMic is off).
      await this.#updatePersistentStreamCache(this.#captureSettings)

      const pipeline = await this.#buildOrWaitForSettings(
        'overconstrained, settings changed',
      )
      if (!pipeline) return
    } catch (err) {
      console.error('START_CAPTURE failed:', err)
      await this.#failCapture(err, 'activate failed')
      return
    }
    this.#transition(this.#capture, 'warm', 'pipeline ready')
  }

  async #handleError({ error }: { error: string }): Promise<void> {
    console.error(`${LOG} error:`, error)
    this.emit('error', { error })
    await this.#tearDown()
    this.#forceIdle(`error: ${error}`)
  }

  // -------------------------------------------------------------------------
  // PIPELINE WIRING
  // -------------------------------------------------------------------------

  #wireCapturePipeline(pipeline: CapturePipeline): void {
    const opts = { signal: pipeline.destroyed }
    for (const eventType of [
      'append',
      'chunkStart',
      'patch',
      'recordingComplete',
      'notification',
      'sabRopeShare',
      'sabRopeGrow',
      'sabRopeSeal',
    ] as const) {
      pipeline.addEventListener(
        eventType,
        (e) => this.emit(eventType, e.detail),
        opts,
      )
    }
    pipeline.addEventListener(
      'error',
      (e) => void this.#handleError(e.detail),
      opts,
    )
  }

  #wirePlaybackPipeline(pipeline: PlaybackPipeline): void {
    const opts = { signal: pipeline.stopSignal }
    pipeline.addEventListener(
      'positionChanged',
      (e) => {
        this.#playbackProducedAudio = true
        this.emit('positionChanged', e.detail)
      },
      opts,
    )
    pipeline.addEventListener(
      'stop',
      async () => {
        // Natural end. Tear down our state and forward the stop event. The
        // natural-end stop is the only time the pipeline fires `stop` — a
        // DISABLE_PLAYBACK-aborted pipeline does NOT (see DISABLE_PLAYBACK handler).
        await this.#tearDownPlaybackPipeline()
        this.#playbackProducedAudio = false
        if (this.#playback.state === 'playing') {
          this.#transition(this.#playback, 'idle', 'playback natural end')
        }
        this.emit('stop')
        // Playback finished -- if a deferred recovery was waiting on it, run now.
        this.#scheduleRecoveryIfDirty()
      },
      opts,
    )
    pipeline.addEventListener(
      'error',
      (e) => this.emit('error', e.detail),
      opts,
    )
  }

  // -------------------------------------------------------------------------
  // PIPELINE BUILD / TEAR DOWN
  // -------------------------------------------------------------------------

  // Acquires a stream + context, builds a fresh CapturePipeline from current
  // settings/features, wires it, and installs it as `#capturePipeline`.
  // Throws on failure; the caller decides the recovery transition (see
  // `#failCapture`).
  async #buildCapturePipeline(): Promise<CapturePipeline | null> {
    const stream = await this.#acquireCaptureStream(this.#captureSettings)
    if (!stream) {
      return null
    }
    this.#captureStream = stream
    const shared = this.#getOrCreateContext()
    await this.#acquire('capture')
    const ctrl = new AbortController()
    this.#captureCtrl = ctrl
    const pipeline = new CapturePipeline({
      signal: ctrl.signal,
      settings: this.#captureSettings,
      features: this.#captureFeatures,
      context: shared.context,
      captureModuleReady: shared.captureModuleReady,
      stream,
    })
    this.#capturePipeline = pipeline
    this.#wireCapturePipeline(pipeline)
    // Yield once so the pipeline's async constructor work (if any) can
    // register its listeners before the caller transitions state.
    await Promise.resolve()
    return pipeline
  }

  // Attempts a capture pipeline (re)build. On overconstrained-mic failure
  // (null), tears down and drops to 'waitingForSettings' so a later
  // SETTINGS_CHANGE can retry; the caller just needs to check for null.
  async #buildOrWaitForSettings(
    reason: string,
  ): Promise<CapturePipeline | null> {
    const pipeline = await this.#buildCapturePipeline()
    if (!pipeline) {
      await this.#tearDownCapturePipeline()
      this.#transition(this.#capture, 'waitingForSettings', reason)
    }
    return pipeline
  }

  // Common cleanup for a failed capture build/rebuild: release the lease,
  // abort and clear the controller/pipeline, drop back to idle, and surface
  // the error.
  async #failCapture(err: unknown, reason: string): Promise<void> {
    await this.#release('capture')
    this.#captureCtrl?.abort()
    this.#captureCtrl = null
    this.#capturePipeline = null
    this.#stopTransientCaptureStream()
    this.#transition(this.#capture, 'idle', reason)
    this.emit('error', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // If resetting, waits for in-flight workers to drain (so the rope's last
  // frames can be sealed) before aborting the capture controller. No-op if
  // there's no pipeline/controller to tear down.
  async #drainAndAbortCapture(): Promise<void> {
    const pipeline = this.#capturePipeline
    const ctrl = this.#captureCtrl
    if (!pipeline || !ctrl) return
    if (this.#capture.state === 'resetting') {
      try {
        await pipeline.workersDone
      } catch {
        // Best-effort; we're tearing down anyway.
      }
    }
    ctrl.abort()
    this.#captureCtrl = null
    this.#capturePipeline = null
  }

  #releasePersistentStream() {
    this.#persistentStream?.getTracks().forEach((t) => t.stop())
    this.#persistentStream = null
    this.#persistentStreamKey = null
  }

  async #buildPlaybackPipeline(): Promise<void> {
    if (this.#playbackRopes.length === 0) return
    if (this.#playbackCtrl !== null) return
    this.#preferredSampleRate = preferredSampleRate(this.#captureSettings)
    const shared = this.#getOrCreateContext()
    await this.#acquire('playback')
    const ctrl = new AbortController()
    this.#playbackCtrl = ctrl
    const pipeline = new PlaybackPipeline({
      ropes: this.#playbackRopes,
      gains: this.#playbackGains,
      startAtSec: this.#playbackStartAtSec,
      endAtSec: this.#playbackEndAtSec,
      signal: ctrl.signal,
      context: shared.context,
      moduleReady: shared.playbackModuleReady,
    })
    this.#playbackPipeline = pipeline
    this.#wirePlaybackPipeline(pipeline)
  }

  async #tearDownCapturePipeline(): Promise<void> {
    await this.#drainAndAbortCapture()
    this.#stopTransientCaptureStream()
    await this.#release('capture')
  }

  async #tearDownPlaybackPipeline(): Promise<void> {
    if (this.#playbackPipeline || this.#playbackCtrl) {
      this.#playbackCtrl?.abort()
      this.#playbackCtrl = null
      this.#playbackPipeline = null
      await this.#release('playback')
    }
  }

  async #tearDown(): Promise<void> {
    await this.#tearDownCapturePipeline()
    await this.#tearDownPlaybackPipeline()
  }
}
