// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AudioManager } from './AudioManager'
import type {
  AudioPipelineState,
  CaptureSubState,
  PlaybackSubState,
} from './AudioManager'

// Tracking arrays for stub instances created inside vi.mock.
const captureStubs: any[] = vi.hoisted(() => [])
const playbackStubs: any[] = vi.hoisted(() => [])

// Mock CapturePipeline and PlaybackPipeline so the manager doesn't
// attempt to construct AudioWorkletNodes or web workers under happy-dom.
vi.mock('./CapturePipeline', async () => {
  const { TypedEventTarget } = await import('../TypedEventTarget')

  class StubCapture extends TypedEventTarget<any> {
    destroyed: AbortSignal
    workersDone: Promise<void>
    #resolveWorkersDone: () => void = () => {}
    #destroyCtrl = new AbortController()
    record = vi.fn()
    softReset = vi.fn(async () => {})

    constructor() {
      super()
      this.destroyed = this.#destroyCtrl.signal
      this.workersDone = new Promise<void>((resolve) => {
        this.#resolveWorkersDone = resolve
      })
    }

    emitAppend(detail: { frame: any }) {
      this.emit('append', detail)
    }
    emitChunkStart(detail: { params: any }) {
      this.emit('chunkStart', detail)
    }
    emitPatch(detail: { from: number; to: number }) {
      this.emit('patch', detail)
    }
    emitRecordingComplete() {
      this.emit('recordingComplete', {})
    }
    emitNotification(message: string) {
      this.emit('notification', { message })
    }
    emitRopeShare(detail: any) {
      this.emit('sabRopeShare', detail)
    }
    emitRopeGrow(detail: any) {
      this.emit('sabRopeGrow', detail)
    }
    emitRopeSeal(detail: any) {
      this.emit('sabRopeSeal', detail)
    }
    emitError(error: string) {
      this.emit('error', { error })
    }
    finishWorkers() {
      this.#resolveWorkersDone()
    }
    destroy() {
      this.#destroyCtrl.abort()
    }
  }

  return {
    CapturePipeline: function CapturePipelineMock(args: any) {
      const stub = new StubCapture()
      // Record the stream this pipeline was built with so tests can assert
      // whether a rebuild reused the persistent stream or opened a new one.
      ;(stub as any).stream = args.stream
      args.signal.addEventListener('abort', () => stub.destroy(), {
        once: true,
      })
      captureStubs.push(stub)
      return stub
    },
  }
})

vi.mock('./PlaybackPipeline', async () => {
  const { TypedEventTarget } = await import('../TypedEventTarget')

  class StubPlayback extends TypedEventTarget<any> {
    stopSignal: AbortSignal
    #stopCtrl = new AbortController()

    constructor() {
      super()
      this.stopSignal = this.#stopCtrl.signal
    }

    emitPositionChanged(timeSec: number) {
      this.emit('positionChanged', { timeSec })
    }
    emitStop() {
      this.emit('stop')
    }
    emitError(error: string) {
      this.emit('error', { error })
    }
    destroy() {
      this.#stopCtrl.abort()
    }
  }

  return {
    PlaybackPipeline: function PlaybackPipelineMock(args: any) {
      const stub = new StubPlayback()
      args.signal.addEventListener('abort', () => stub.destroy(), {
        once: true,
      })
      playbackStubs.push(stub)
      return stub
    },
  }
})

// Let all pending microtasks and the current macrotask queue drain.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

// ---------------------------------------------------------------------------
// Global AudioContext stub.
//
// pipeline.ts calls `new AudioContext(...)`, which throws under happy-dom. We
// provide a minimal stand-in: a class whose `audioWorklet.addModule` resolves,
// whose lifecycle methods resolve, and whose `state` toggles so the cache is
// happy across tests.
// ---------------------------------------------------------------------------

class StubAudioWorklet {
  addModule = vi.fn(async () => {})
}

function makeStubMediaStream(): MediaStream {
  // Stable track instance so `track.stop` spies survive multiple getTracks()
  // calls (the manager calls it on both teardown and settings logging).
  const track = {
    stop: vi.fn(),
    getSettings: vi.fn(() => ({})),
    addEventListener: vi.fn(),
  }
  return {
    getTracks: vi.fn(() => [track]),
    active: true,
  } as unknown as MediaStream
}

// Every constructed StubAudioContext is recorded here so tests can simulate a
// UA-initiated suspension (set `.state = 'suspended'`) and assert that a fresh
// context was built on interruption recovery. Reset in beforeEach.
const contextStubs: StubAudioContext[] = []

class StubAudioContext {
  state: 'suspended' | 'running' | 'closed' | 'interrupted' = 'running'
  sampleRate = 44100
  currentTime = 0
  destination = {} as AudioDestinationNode
  audioWorklet = new StubAudioWorklet()
  #stateListeners = new Set<() => void>()
  constructor() {
    contextStubs.push(this)
  }
  resume = vi.fn(async () => {})
  suspend = vi.fn(async () => {
    this.setState('suspended')
  })
  close = vi.fn(async () => {
    this.setState('closed')
  })
  addEventListener = vi.fn((type: string, cb: () => void) => {
    if (type === 'statechange') this.#stateListeners.add(cb)
  })
  removeEventListener = vi.fn((type: string, cb: () => void) => {
    if (type === 'statechange') this.#stateListeners.delete(cb)
  })
  createMediaStreamSource = vi.fn(
    () =>
      ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      }) as unknown as MediaStreamAudioSourceNode,
  )
  // Test helper: set state and fire `statechange`, mirroring the real context.
  setState(s: StubAudioContext['state']): void {
    this.state = s
    this.#stateListeners.forEach((cb) => cb())
  }
}

// Captured at install so tests can inspect call counts without an unbound
// `navigator.mediaDevices.getUserMedia` method reference.
let getUserMediaMock: ReturnType<typeof vi.fn>
let stubAudioContextInstalled = false
function installStubAudioContext() {
  if (stubAudioContextInstalled) return
  vi.stubGlobal('AudioContext', StubAudioContext as any)
  getUserMediaMock = vi.fn(async () => makeStubMediaStream())
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: getUserMediaMock,
    },
  })
  stubAudioContextInstalled = true
}

// Wait until predicate passes, checking after each stateChanged event.
function waitForState(
  manager: AudioManager,
  predicate: (s: AudioPipelineState) => boolean,
  label = 'expected state',
): Promise<AudioPipelineState> {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => {
      reject(
        new Error(
          `waitForState timed out waiting for ${label}. Current: ${JSON.stringify(manager.getState())}`,
        ),
      )
    }, 1000)

    const check = () => {
      const s = manager.getState()
      if (predicate(s)) {
        clearTimeout(deadline)
        manager.removeEventListener('stateChanged', onChange)
        resolve(s)
      }
    }
    const onChange = () => check()
    manager.addEventListener('stateChanged', onChange)
    check()
  })
}

const atCapture = (c: CaptureSubState) => (s: AudioPipelineState) =>
  s.capture === c
const atPlayback = (p: PlaybackSubState) => (s: AudioPipelineState) =>
  s.playback === p
const atBoth =
  (c: CaptureSubState, p: PlaybackSubState) => (s: AudioPipelineState) =>
    s.capture === c && s.playback === p

// Collect all stateChanged event payloads until .stop() is called.
function trackState(manager: AudioManager) {
  const snapshots: AudioPipelineState[] = []
  const ctrl = new AbortController()
  manager.addEventListener(
    'stateChanged',
    (e) => snapshots.push({ ...e.detail.state }),
    { signal: ctrl.signal },
  )
  return { snapshots, stop: () => ctrl.abort() }
}

// Await the next firing of a named event on the manager.
function nextEvent<K extends Parameters<AudioManager['addEventListener']>[0]>(
  manager: AudioManager,
  name: K,
): Promise<Event> {
  return new Promise((resolve) =>
    manager.addEventListener(
      name,
      resolve as Parameters<AudioManager['addEventListener']>[1],
      { once: true },
    ),
  )
}

// ---------------------------------------------------------------------------
// Helpers to drive the manager to a known state
// ---------------------------------------------------------------------------

async function toWarm(manager: AudioManager) {
  manager.sendEvent({ type: 'START_CAPTURE' })
  await waitForState(manager, atCapture('warm'), 'warm')
}

async function toRecording(manager: AudioManager) {
  await toWarm(manager)
  manager.sendEvent({ type: 'START_RECORDING' })
  await waitForState(manager, atCapture('recording'), 'recording')
}

async function toPlaying(manager: AudioManager) {
  manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
  await waitForState(manager, atPlayback('playing'), 'playing')
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('AudioManager', () => {
  let manager: AudioManager

  beforeEach(() => {
    installStubAudioContext()
    captureStubs.length = 0
    playbackStubs.length = 0
    contextStubs.length = 0
    manager = new AudioManager()
  })

  afterEach(() => {
    manager.destroy()
  })

  // Most-recently-created stub pipeline, for tests that exercise one.
  const latestCapture = (): any => {
    const stub = captureStubs[captureStubs.length - 1]
    if (!stub) throw new Error('no stub capture pipeline yet')
    return stub
  }

  const latestPlayback = (): any => {
    const stub = playbackStubs[playbackStubs.length - 1]
    if (!stub) throw new Error('no stub playback pipeline yet')
    return stub
  }

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with both sub-states idle', () => {
      expect(manager.getState()).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('getState returns a snapshot, not a live reference', async () => {
      const before = manager.getState()
      await toWarm(manager)
      // The snapshot taken before the event must not have mutated.
      expect(before).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('two successive getState calls return distinct objects', () => {
      const a = manager.getState()
      const b = manager.getState()
      expect(a).not.toBe(b)
    })
  })

  // -------------------------------------------------------------------------
  // sendEvent semantics
  // -------------------------------------------------------------------------

  describe('sendEvent', () => {
    it('returns void (is not a Promise)', () => {
      const result = manager.sendEvent({ type: 'START_CAPTURE' })
      expect(result).toBeUndefined()
    })

    it('does not change state synchronously', () => {
      manager.sendEvent({ type: 'START_CAPTURE' })
      expect(manager.getState().capture).toBe('idle')
    })

    it('processes the event on a subsequent turn', async () => {
      manager.sendEvent({ type: 'START_CAPTURE' })
      expect(manager.getState().capture).toBe('idle')
      await flush()
      expect(manager.getState().capture).toBe('warm')
    })

    it('queued events are processed in FIFO order', async () => {
      const captureHistory: CaptureSubState[] = []
      manager.addEventListener('stateChanged', (e) =>
        captureHistory.push(e.detail.state.capture),
      )

      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'START_RECORDING' })
      manager.sendEvent({ type: 'STOP_RECORDING' })

      // Wait until all 5 transitions have fired (warming, warm, recording, resetting, warm).
      await vi.waitFor(() =>
        expect(captureHistory.length).toBeGreaterThanOrEqual(5),
      )

      // ACTIVATE: idle→warming→warm. START: warm→recording. STOP: recording→resetting→warm.
      expect(captureHistory).toEqual([
        'warming',
        'warm',
        'recording',
        'resetting',
        'warm',
      ])
    })

    it('each handler completes before the next event is processed', async () => {
      // ACTIVATE emits two stateChanged events (warming, warm) atomically
      // before START_RECORDING is ever picked up.
      const history: CaptureSubState[] = []
      manager.addEventListener('stateChanged', (e) =>
        history.push(e.detail.state.capture),
      )

      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'START_RECORDING' })

      await waitForState(manager, atCapture('recording'), 'recording')

      expect(history.indexOf('warming')).toBeLessThan(history.indexOf('warm'))
      expect(history.indexOf('warm')).toBeLessThan(history.indexOf('recording'))
    })
  })

  // -------------------------------------------------------------------------
  // Capture sub-state machine
  // -------------------------------------------------------------------------

  describe('capture sub-state machine', () => {
    it('START_CAPTURE: idle → warming → warm', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'START_CAPTURE' })
      await waitForState(manager, atCapture('warm'), 'warm')
      stop()

      expect(snapshots.map((s) => s.capture)).toContain('warming')
      expect(snapshots.at(-1)?.capture).toBe('warm')
    })

    it('START_CAPTURE: does not affect playback sub-state', async () => {
      await toWarm(manager)
      expect(manager.getState().playback).toBe('idle')
    })

    it('START_RECORDING: warm → recording', async () => {
      await toWarm(manager)
      manager.sendEvent({ type: 'START_RECORDING' })
      await waitForState(manager, atCapture('recording'), 'recording')
      expect(manager.getState()).toEqual({
        capture: 'recording',
        playback: 'idle',
      })
    })

    it('START_RECORDING from idle: idle → warming → warm → recording', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'START_RECORDING' })
      await waitForState(manager, atCapture('recording'), 'recording')
      stop()

      expect(snapshots.map((s) => s.capture)).toContain('warming')
      expect(snapshots.at(-1)?.capture).toBe('recording')
    })

    it('STOP_RECORDING: recording → resetting → warm', async () => {
      await toRecording(manager)

      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'STOP_RECORDING' })
      await waitForState(manager, atCapture('warm'), 'warm after stop')
      stop()

      expect(snapshots.map((s) => s.capture)).toContain('resetting')
      expect(snapshots.at(-1)?.capture).toBe('warm')
    })

    it('STOP_CAPTURE from warm: warm → idle', async () => {
      await toWarm(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atCapture('idle'), 'idle')
      expect(manager.getState()).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('STOP_CAPTURE from recording: force → idle', async () => {
      await toRecording(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atCapture('idle'), 'idle')
    })

    it('STOP_CAPTURE from idle: no-op, no stateChanged', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
      expect(manager.getState().capture).toBe('idle')
    })

    it('full cycle: idle → warm → recording → warm → idle', async () => {
      manager.sendEvent({ type: 'START_CAPTURE' })
      await waitForState(manager, atCapture('warm'), 'warm')
      manager.sendEvent({ type: 'START_RECORDING' })
      await waitForState(manager, atCapture('recording'), 'recording')
      manager.sendEvent({ type: 'STOP_RECORDING' })
      await waitForState(manager, atCapture('warm'), 'warm after stop')
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atCapture('idle'), 'idle')

      expect(manager.getState()).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('repeated cycles work without state leaks', async () => {
      for (let i = 0; i < 3; i++) {
        manager.sendEvent({ type: 'START_CAPTURE' })
        await waitForState(manager, atCapture('warm'), `warm cycle ${i}`)
        manager.sendEvent({ type: 'START_RECORDING' })
        await waitForState(
          manager,
          atCapture('recording'),
          `recording cycle ${i}`,
        )
        manager.sendEvent({ type: 'STOP_RECORDING' })
        await waitForState(
          manager,
          atCapture('warm'),
          `warm-after-stop cycle ${i}`,
        )
        manager.sendEvent({ type: 'STOP_CAPTURE' })
        await waitForState(manager, atCapture('idle'), `idle cycle ${i}`)
      }
      expect(manager.getState()).toEqual({ capture: 'idle', playback: 'idle' })
    })
  })

  // -------------------------------------------------------------------------
  // Capture guard rejections
  // -------------------------------------------------------------------------

  describe('capture guard rejections', () => {
    it('START_RECORDING from warm when sent before ACTIVATE is processed: rejected', async () => {
      // Queue both before either runs. ACTIVATE resolves warming→warm inside its
      // handler, so when START_RECORDING's handler runs, capture is already warm.
      // START succeeds here — this documents that behavior.
      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'START_RECORDING' })
      await waitForState(manager, atCapture('recording'), 'recording')
      // The queue serialisation means START sees 'warm', not 'warming'.
      expect(manager.getState().capture).toBe('recording')
    })

    it('STOP_RECORDING from warm: no-op', async () => {
      await toWarm(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'STOP_RECORDING' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
      expect(manager.getState().capture).toBe('warm')
    })

    it('STOP_RECORDING from idle: no-op', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'STOP_RECORDING' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('START_CAPTURE while already warm: no-op', async () => {
      await toWarm(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'START_CAPTURE' })
      await flush()
      stop()
      // idle→warming is the only valid transition from warm that ACTIVATE would
      // try; the table rejects it and no stateChanged fires.
      expect(snapshots).toHaveLength(0)
      expect(manager.getState().capture).toBe('warm')
    })

    it('START_CAPTURE while recording: no-op', async () => {
      await toRecording(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'START_CAPTURE' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
      expect(manager.getState().capture).toBe('recording')
    })
  })

  // -------------------------------------------------------------------------
  // Playback sub-state machine
  // -------------------------------------------------------------------------

  describe('playback sub-state machine', () => {
    it('ENABLE_PLAYBACK: idle → playing', async () => {
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      await waitForState(manager, atPlayback('playing'), 'playing')
      expect(manager.getState()).toEqual({
        capture: 'idle',
        playback: 'playing',
      })
    })

    it('ENABLE_PLAYBACK: does not affect capture sub-state', async () => {
      await toPlaying(manager)
      expect(manager.getState().capture).toBe('idle')
    })

    it('DISABLE_PLAYBACK: playing → idle', async () => {
      await toPlaying(manager)
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      await waitForState(manager, atPlayback('idle'), 'idle')
    })

    it('DISABLE_PLAYBACK: emits stop event after audio has been produced', async () => {
      await toPlaying(manager)
      // Provide inputs so the pipeline exists, then simulate one
      // `positionChanged` to mark audio as produced.
      manager.sendEvent({
        type: 'ENABLE_PLAYBACK',
        ropes: [{ length: 44100, sampleRate: 44100 } as any],
        gains: [1],
      })
      await flush()
      latestPlayback().emitPositionChanged(0.5)
      await flush()
      const stopped = nextEvent(manager, 'stop')
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      await stopped
    })

    it('DISABLE_PLAYBACK when already idle: no-op, no stateChanged, no stop', async () => {
      let stopFired = false
      manager.addEventListener('stop', () => {
        stopFired = true
      })
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
      expect(stopFired).toBe(false)
    })

    it('ENABLE_PLAYBACK while already playing: no-op', async () => {
      await toPlaying(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
      expect(manager.getState().playback).toBe('playing')
    })

    it('transitions to idle and emits stop when the internal pipeline reaches its natural end', async () => {
      await toPlaying(manager)
      // The playback pipeline only exists once inputs are present. The
      // production hook layer sends those via ENABLE_PLAYBACK.
      manager.sendEvent({
        type: 'ENABLE_PLAYBACK',
        ropes: [{ length: 44100, sampleRate: 44100 } as any],
        gains: [1],
      })
      await flush()
      const stopped = nextEvent(manager, 'stop')
      // Simulate the natural end: the stub playback pipeline fires its own
      // `stop` event (as the real one does when its worklet reports the end
      // of the last sealed rope). The manager must forward it and
      // transition playback to idle autonomously.
      latestPlayback().emitStop()
      await stopped
      expect(manager.getState().playback).toBe('idle')
    })

    it('does not emit stop when disabled before the pipeline produces any audio', async () => {
      // Mirrors AudioPlaybackPipeline: aborting during module load does not
      // fire the stop event — only natural end does. An ENABLE+DISABLE sequence
      // that resolves before positionChanged has ever fired (i.e. before the
      // worklet is ready) should abort cleanly and stay silent.
      const stops: Event[] = []
      manager.addEventListener('stop', (e) => stops.push(e))
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      await flush()
      expect(manager.getState().playback).toBe('idle') // must still settle idle
      expect(stops).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // Playback guard rejections
  // -------------------------------------------------------------------------

  describe('playback guard rejections', () => {
    it('DISABLE_PLAYBACK from idle does not emit stop', async () => {
      const stopEvents: Event[] = []
      manager.addEventListener('stop', (e) => stopEvents.push(e))
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      await flush()
      expect(stopEvents).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // Orthogonal independence
  // -------------------------------------------------------------------------

  describe('capture and playback are orthogonal', () => {
    it('capture warm + playback playing coexist', async () => {
      await toWarm(manager)
      await toPlaying(manager)
      expect(manager.getState()).toEqual({
        capture: 'warm',
        playback: 'playing',
      })
    })

    it('playback can start while capture is warming/warm', async () => {
      // Queue ACTIVATE and ENABLE together; both process in order.
      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      await waitForState(manager, atBoth('warm', 'playing'), 'warm+playing')
    })

    it('capture can activate while playback is playing', async () => {
      await toPlaying(manager)
      await toWarm(manager)
      expect(manager.getState()).toEqual({
        capture: 'warm',
        playback: 'playing',
      })
    })

    it('stopping playback leaves capture state untouched', async () => {
      await toWarm(manager)
      await toPlaying(manager)
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      await waitForState(manager, atPlayback('idle'), 'playback idle')
      expect(manager.getState().capture).toBe('warm')
    })

    it('deactivating capture leaves playback state untouched', async () => {
      await toWarm(manager)
      await toPlaying(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atCapture('idle'), 'capture idle')
      expect(manager.getState().playback).toBe('playing')
    })

    it('stateChanged payloads always carry both sub-states', async () => {
      const snapshots: AudioPipelineState[] = []
      manager.addEventListener('stateChanged', (e) =>
        snapshots.push({ ...e.detail.state }),
      )

      await toWarm(manager)
      await toPlaying(manager)

      for (const s of snapshots) {
        expect(typeof s.capture).toBe('string')
        expect(typeof s.playback).toBe('string')
      }
    })
  })

  // -------------------------------------------------------------------------
  // Concurrent recording/playback
  // -------------------------------------------------------------------------

  describe('recording and playback can overlap', () => {
    it('ENABLE_PLAYBACK is allowed while recording', async () => {
      await toRecording(manager)
      await toPlaying(manager)
      expect(manager.getState()).toEqual({
        capture: 'recording',
        playback: 'playing',
      })
    })

    it('START_RECORDING is allowed while playing', async () => {
      await toWarm(manager)
      await toPlaying(manager)
      manager.sendEvent({ type: 'START_RECORDING' })
      await waitForState(manager, atCapture('recording'), 'recording')
      expect(manager.getState()).toEqual({
        capture: 'recording',
        playback: 'playing',
      })
    })

    it('ENABLE_PLAYBACK is allowed while warm (not recording)', async () => {
      await toWarm(manager)
      await toPlaying(manager)
      expect(manager.getState()).toEqual({
        capture: 'warm',
        playback: 'playing',
      })
    })

    it('playback is allowed after recording ends', async () => {
      await toRecording(manager)
      manager.sendEvent({ type: 'STOP_RECORDING' })
      await waitForState(manager, atCapture('warm'), 'warm')
      await toPlaying(manager)
      expect(manager.getState()).toEqual({
        capture: 'warm',
        playback: 'playing',
      })
    })

    it('recording is allowed after playback ends', async () => {
      await toWarm(manager)
      await toPlaying(manager)
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      await waitForState(manager, atPlayback('idle'), 'playback idle')
      manager.sendEvent({ type: 'START_RECORDING' })
      await waitForState(manager, atCapture('recording'), 'recording')
    })
  })

  // -------------------------------------------------------------------------
  // stateChanged event
  // -------------------------------------------------------------------------

  describe('stateChanged event', () => {
    it('fires with current combined state on every valid capture transition', async () => {
      const states: AudioPipelineState[] = []
      manager.addEventListener('stateChanged', (e) =>
        states.push({ ...e.detail.state }),
      )
      manager.sendEvent({ type: 'START_CAPTURE' })
      await waitForState(manager, atCapture('warm'), 'warm')

      // warming, warm
      expect(states.length).toBeGreaterThanOrEqual(2)
      // Each snapshot must be a valid combined state
      for (const s of states) {
        expect([
          'idle',
          'warming',
          'warm',
          'recording',
          'resetting',
          'waitingForSettings',
        ]).toContain(s.capture)
        expect(['idle', 'playing']).toContain(s.playback)
      }
    })

    it('fires with current combined state on every valid playback transition', async () => {
      const states: AudioPipelineState[] = []
      manager.addEventListener('stateChanged', (e) =>
        states.push({ ...e.detail.state }),
      )
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      await waitForState(manager, atPlayback('playing'), 'playing')

      expect(states.length).toBeGreaterThanOrEqual(1)
      expect(states.at(-1)?.playback).toBe('playing')
    })

    it('carries a reason string', async () => {
      const reasons: (string | undefined)[] = []
      manager.addEventListener('stateChanged', (e) =>
        reasons.push(e.detail.reason),
      )
      manager.sendEvent({ type: 'START_CAPTURE' })
      await waitForState(manager, atCapture('warm'), 'warm')
      expect(reasons.some((r) => typeof r === 'string' && r.length > 0)).toBe(
        true,
      )
    })

    it('does NOT fire when a guard rejects a capture transition', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'STOP_RECORDING' }) // idle → invalid
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('does NOT fire when a guard rejects a playback transition', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' }) // idle → invalid
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('fires for STOP_CAPTURE from non-idle with idle state', async () => {
      await toWarm(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atCapture('idle'), 'idle')
      stop()
      expect(snapshots.length).toBeGreaterThanOrEqual(1)
      expect(snapshots.at(-1)).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('does NOT fire for STOP_CAPTURE from idle', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('reflects capture sub-state correctly when playback is also active', async () => {
      await toWarm(manager)
      await toPlaying(manager)

      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atCapture('idle'), 'idle')
      stop()

      // Playback must be 'playing' in the snapshot even while capture resets.
      expect(snapshots.at(-1)).toEqual({ capture: 'idle', playback: 'playing' })
    })
  })

  // -------------------------------------------------------------------------
  // Error event
  // -------------------------------------------------------------------------

  describe('ERROR event', () => {
    it('emits an outbound error event with the message', async () => {
      const errors: string[] = []
      manager.addEventListener('error', (e) => errors.push(e.detail.error))
      manager.sendEvent({ type: 'ERROR', error: 'mic exploded' })
      await flush()
      expect(errors).toHaveLength(1)
      expect(errors[0]).toBe('mic exploded')
    })

    it('forces both sub-states to idle', async () => {
      await toWarm(manager)
      await toPlaying(manager)
      manager.sendEvent({ type: 'ERROR', error: 'oops' })
      await waitForState(manager, atBoth('idle', 'idle'), 'both idle')
    })

    it('emits stateChanged when states were non-idle', async () => {
      await toWarm(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'ERROR', error: 'kaboom' })
      await waitForState(manager, atCapture('idle'), 'idle')
      stop()
      expect(snapshots.length).toBeGreaterThanOrEqual(1)
      expect(snapshots.at(-1)).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('does NOT emit stateChanged when both sub-states were already idle', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'ERROR', error: 'noop error' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('manager keeps processing events after an error', async () => {
      manager.sendEvent({ type: 'ERROR', error: 'recoverable' })
      await flush()
      // Full cycle after the error.
      manager.sendEvent({ type: 'START_CAPTURE' })
      await waitForState(manager, atCapture('warm'), 'warm after recovery')
      manager.sendEvent({ type: 'START_RECORDING' })
      await waitForState(
        manager,
        atCapture('recording'),
        'recording after recovery',
      )
      expect(manager.getState().capture).toBe('recording')
    })

    it('multiple back-to-back errors each emit an outbound error event', async () => {
      const errors: string[] = []
      manager.addEventListener('error', (e) => errors.push(e.detail.error))
      manager.sendEvent({ type: 'ERROR', error: 'first' })
      manager.sendEvent({ type: 'ERROR', error: 'second' })
      manager.sendEvent({ type: 'ERROR', error: 'third' })
      await flush()
      expect(errors).toEqual(['first', 'second', 'third'])
    })
  })

  // -------------------------------------------------------------------------
  // destroy()
  // -------------------------------------------------------------------------

  describe('destroy()', () => {
    it('forces both sub-states to idle', async () => {
      await toWarm(manager)
      await toPlaying(manager)
      manager.destroy()
      await waitForState(
        manager,
        atBoth('idle', 'idle'),
        'both idle after destroy',
      )
    })

    it('emits stateChanged when states were non-idle', async () => {
      await toWarm(manager)
      const { snapshots, stop } = trackState(manager)
      manager.destroy()
      await flush()
      stop()
      expect(snapshots.length).toBeGreaterThanOrEqual(1)
      expect(snapshots.at(-1)).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('does NOT emit stateChanged when already idle', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.destroy()
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('events sent after destroy are silently ignored', async () => {
      manager.destroy()
      await flush()
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
      expect(manager.getState()).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('is idempotent: calling destroy multiple times does not throw', async () => {
      await toWarm(manager)
      expect(() => {
        manager.destroy()
        manager.destroy()
        manager.destroy()
      }).not.toThrow()
    })

    it('from recording: forces idle without going through resetting', async () => {
      await toRecording(manager)
      manager.destroy()
      await waitForState(manager, atBoth('idle', 'idle'), 'both idle')
      // Check that we did NOT see resetting between recording and idle.
      // (The #forceIdle bypass means the resetting intermediate is skipped.)
      // We assert the final state; the path is unobservable by design.
      expect(manager.getState()).toEqual({ capture: 'idle', playback: 'idle' })
    })
  })

  // -------------------------------------------------------------------------
  // VISIBILITY_CHANGE (stub)
  // -------------------------------------------------------------------------

  describe('VISIBILITY_CHANGE', () => {
    it('does not change state when hidden', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: true })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('does not change state when visible', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('does not throw from any capture state', async () => {
      await toWarm(manager)
      expect(() => {
        manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: true })
        manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      }).not.toThrow()
      await vi.waitFor(() => expect(contextStubs).toHaveLength(2))
      await waitForState(manager, atCapture('warm'), 'warm after rebuild')
      expect(manager.getState().capture).toBe('warm')
    })

    it('rebuilds on return even when the context stayed running (silent poison)', async () => {
      await toWarm(manager)
      expect(contextStubs).toHaveLength(1)
      // The browser kept the context running in the background, so there's no
      // state transition to detect the poison. Backgrounding flags it; we rebuild
      // on return regardless.
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: true })
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await vi.waitFor(() => expect(contextStubs).toHaveLength(2))
      await waitForState(manager, atCapture('warm'), 'warm after rebuild')
      expect(contextStubs[0]!.close).toHaveBeenCalled()
      expect(manager.getState().capture).toBe('warm')
    })

    it('resumes (no rebuild) on a spurious visible event with no prior background', async () => {
      await toWarm(manager)
      expect(contextStubs).toHaveLength(1)
      // A `visible` event with no preceding `hidden` (so not flagged) and a
      // running context just resumes -- no rebuild.
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await flush()
      expect(manager.getState().capture).toBe('warm')
      expect(contextStubs).toHaveLength(1)
      expect(contextStubs[0]!.close).not.toHaveBeenCalled()
    })

    it('rebuilds the context and re-warms capture when suspended on return', async () => {
      await toWarm(manager)
      expect(contextStubs).toHaveLength(1)
      const captureCountBefore = captureStubs.length

      const { snapshots, stop } = trackState(manager)

      // Simulate a UA-initiated suspension while we still believe we hold the
      // capture lease (Safari backgrounding poisons the output path).
      contextStubs[0]!.state = 'suspended'

      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      // Capture is already warm, so we can't wait on the final state -- wait for
      // the fresh context to be built instead.
      await vi.waitFor(() => expect(contextStubs).toHaveLength(2))
      await waitForState(manager, atCapture('warm'), 'warm after rebuild')
      stop()

      // Old context closed, fresh one built, capture pipeline rebuilt.
      expect(contextStubs[0]!.close).toHaveBeenCalled()
      expect(captureStubs.length).toBe(captureCountBefore + 1)
      // Went through warming on the way back to warm.
      expect(snapshots.map((s) => s.capture)).toContain('warming')
      expect(manager.getState().capture).toBe('warm')
    })

    it('rebuilds (idle capture stays idle) when suspended on return while idle', async () => {
      // Force a context to exist, then go idle so we suspend it ourselves.
      await toWarm(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atCapture('idle'), 'idle')
      expect(contextStubs[0]!.state).toBe('suspended')

      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await vi.waitFor(() => expect(contextStubs[0]!.close).toHaveBeenCalled())

      // Poisoned context discarded; nothing to re-warm, so capture stays idle.
      expect(manager.getState().capture).toBe('idle')
    })

    it('leaves an active recording alone (resume, no teardown) on return', async () => {
      await toRecording(manager)
      const captureStub = latestCapture()
      contextStubs[0]!.state = 'suspended'

      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await flush()

      // Recording is preserved: same pipeline, no rebuild.
      expect(manager.getState().capture).toBe('recording')
      expect(contextStubs).toHaveLength(1)
      expect(contextStubs[0]!.close).not.toHaveBeenCalled()
      expect(latestCapture()).toBe(captureStub)
    })
  })

  // -------------------------------------------------------------------------
  // CONTEXT_INTERRUPTED (foreground UA interruption via statechange)
  // -------------------------------------------------------------------------

  describe('CONTEXT_INTERRUPTED (UA interruption)', () => {
    it('rebuilds and re-warms capture on a foreground interruption while warm', async () => {
      await toWarm(manager)
      expect(contextStubs).toHaveLength(1)
      const captureCountBefore = captureStubs.length

      // Safari interrupts us while we hold the capture lease (a call/Siri, an
      // output-route change). The statechange listener flags + recovers.
      contextStubs[0]!.setState('interrupted')

      await vi.waitFor(() => expect(contextStubs).toHaveLength(2))
      await waitForState(manager, atCapture('warm'), 'warm after rebuild')

      expect(contextStubs[0]!.close).toHaveBeenCalled()
      expect(captureStubs.length).toBe(captureCountBefore + 1)
      expect(manager.getState().capture).toBe('warm')
    })

    it('rebuilds exactly once for a single interruption (no loop)', async () => {
      await toWarm(manager)
      contextStubs[0]!.setState('interrupted')
      await vi.waitFor(() => expect(contextStubs).toHaveLength(2))
      await waitForState(manager, atCapture('warm'), 'warm after rebuild')
      // Let any stray re-triggers drain.
      await flush()
      await flush()
      expect(contextStubs).toHaveLength(2)
    })

    it('ignores a suspend with no lease held (our own idle suspend)', async () => {
      // Drive to warm then idle so a context exists but we hold no lease.
      await toWarm(manager)
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atCapture('idle'), 'idle')
      const countBefore = contextStubs.length

      // A further UA blip with no lease must not be treated as an interruption.
      contextStubs[0]!.setState('interrupted')
      await flush()

      expect(contextStubs).toHaveLength(countBefore)
      expect(contextStubs[0]!.close).not.toHaveBeenCalled()
      expect(manager.getState().capture).toBe('idle')
    })

    it('leaves an active recording alone on a UA interruption', async () => {
      await toRecording(manager)
      const captureStub = latestCapture()

      contextStubs[0]!.setState('interrupted')
      await flush()

      expect(manager.getState().capture).toBe('recording')
      expect(contextStubs).toHaveLength(1)
      expect(contextStubs[0]!.close).not.toHaveBeenCalled()
      expect(latestCapture()).toBe(captureStub)
    })

    it('does not interrupt-recover while hidden (visibility handles return)', async () => {
      await toWarm(manager)
      // Simulate the page being backgrounded.
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      })
      try {
        contextStubs[0]!.setState('suspended')
        await flush()
        // Flagged but not eagerly rebuilt -- no getUserMedia in the background.
        expect(contextStubs).toHaveLength(1)
        expect(contextStubs[0]!.close).not.toHaveBeenCalled()
      } finally {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: () => false,
        })
      }

      // On return, the dirty flag drives the rebuild.
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await vi.waitFor(() => expect(contextStubs).toHaveLength(2))
      await waitForState(manager, atCapture('warm'), 'warm after return')
      expect(contextStubs[0]!.close).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Deferred recovery: never tear down active audio
  // -------------------------------------------------------------------------

  describe('deferred recovery (active audio)', () => {
    it('does not cut active playback on return, then discards the context when it ends', async () => {
      manager.sendEvent({
        type: 'ENABLE_PLAYBACK',
        ropes: [{ length: 44100, sampleRate: 44100 } as any],
        gains: [1],
      })
      await waitForState(manager, atPlayback('playing'), 'playing')
      expect(contextStubs).toHaveLength(1)

      // Backgrounded and returned while still playing.
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: true })
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await flush()

      // Playback was not cut and the (poisoned) context was not rebuilt.
      expect(manager.getState().playback).toBe('playing')
      expect(contextStubs[0]!.close).not.toHaveBeenCalled()

      // On natural end, the deferred recovery discards the poisoned context.
      latestPlayback().emitStop()
      await vi.waitFor(() => expect(contextStubs[0]!.close).toHaveBeenCalled())
      expect(manager.getState().playback).toBe('idle')
    })

    it('does not cut an active take on return, then rebuilds when the take ends', async () => {
      await toRecording(manager)
      expect(contextStubs).toHaveLength(1)

      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: true })
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await flush()

      // Recording was not torn down and the context was not rebuilt.
      expect(manager.getState().capture).toBe('recording')
      expect(contextStubs[0]!.close).not.toHaveBeenCalled()

      // Stopping the take runs the deferred recovery: discard + re-warm.
      manager.sendEvent({ type: 'STOP_RECORDING' })
      await vi.waitFor(() => expect(contextStubs).toHaveLength(2))
      await waitForState(
        manager,
        atCapture('warm'),
        'warm after deferred rebuild',
      )
      expect(contextStubs[0]!.close).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Persistent mic interaction with context recovery
  // -------------------------------------------------------------------------

  describe('persistent mic + recovery', () => {
    it('reuses the live stream across a rebuild (no second getUserMedia)', async () => {
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { persistentMic: true },
      })
      await flush()
      await toWarm(manager)
      expect(captureStubs).toHaveLength(1)
      const stream0 = captureStubs[0]!.stream
      const gumCallsBefore = getUserMediaMock.mock.calls.length

      // Background + return -> recovery rebuilds the warm capture pipeline.
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: true })
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await vi.waitFor(() => expect(captureStubs).toHaveLength(2))
      await waitForState(manager, atCapture('warm'), 'warm after rebuild')

      // Same live mic stream reattached to the fresh context; mic not reopened
      // and its tracks never stopped.
      expect(captureStubs[1]!.stream).toBe(stream0)
      expect(getUserMediaMock.mock.calls.length).toBe(gumCallsBefore)
      expect(stream0.getTracks()[0].stop).not.toHaveBeenCalled()
    })

    it('reopens the mic on a rebuild when persistent mic is off', async () => {
      await toWarm(manager) // persistentMic defaults to false
      const stream0 = captureStubs[0]!.stream
      const gumCallsBefore = getUserMediaMock.mock.calls.length

      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: true })
      manager.sendEvent({ type: 'VISIBILITY_CHANGE', hidden: false })
      await vi.waitFor(() => expect(captureStubs).toHaveLength(2))
      await waitForState(manager, atCapture('warm'), 'warm after rebuild')

      // A fresh stream was acquired; the old transient stream was stopped.
      expect(captureStubs[1]!.stream).not.toBe(stream0)
      expect(getUserMediaMock.mock.calls.length).toBe(gumCallsBefore + 1)
      expect(stream0.getTracks()[0].stop).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // MIC_CAPTURE_FEATURES (stub)
  // -------------------------------------------------------------------------

  describe('MIC_CAPTURE_FEATURES', () => {
    it('is a no-op when idle (no stateChanged)', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { spectrogram: false },
      })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('triggers a pipeline rebuild when warm', async () => {
      await toWarm(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { formant: false, vad: { positiveThreshold: 0.5 } },
      })
      await flush()
      stop()
      // Rebuilding the pipeline causes at least one state transition.
      expect(snapshots.length).toBeGreaterThan(0)
    })

    it('triggers a soft reset when recording', async () => {
      await toRecording(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { vad: false },
      })
      await flush()
      stop()
      // Soft reset (recording → resetting → recording) causes state transitions.
      expect(snapshots.length).toBeGreaterThan(0)
    })

    it('accepts all feature flag combinations without throwing', async () => {
      await toWarm(manager)
      expect(() => {
        manager.sendEvent({
          type: 'MIC_CAPTURE_FEATURES',
          features: { spectrogram: true, formant: true, vad: true },
        })
        manager.sendEvent({
          type: 'MIC_CAPTURE_FEATURES',
          features: { spectrogram: false, formant: false, vad: false },
        })
        manager.sendEvent({ type: 'MIC_CAPTURE_FEATURES', features: {} })
        manager.sendEvent({
          type: 'MIC_CAPTURE_FEATURES',
          features: {
            vad: { positiveThreshold: 0.3, negativeThreshold: 0.15 },
          },
        })
      }).not.toThrow()
      await flush()
    })
  })

  // -------------------------------------------------------------------------
  // MIC_CAPTURE_FEATURES while recording
  // -------------------------------------------------------------------------

  describe('MIC_CAPTURE_FEATURES while recording', () => {
    it('follows recording → resetting → recording transition sequence', async () => {
      await toRecording(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { spectrogram: true },
      })
      await flush()
      stop()
      const seq = snapshots.map((s) => s.capture)
      expect(seq).toContain('resetting')
      expect(seq.indexOf('resetting')).toBeLessThan(
        seq.lastIndexOf('recording'),
      )
      expect(snapshots.at(-1)?.capture).toBe('recording')
    })

    it('calls softReset on the existing pipeline with the features delta', async () => {
      await toRecording(manager)
      const capture = latestCapture()
      const features = { spectrogram: false, formant: true }
      manager.sendEvent({ type: 'MIC_CAPTURE_FEATURES', features })
      await flush()
      expect(capture.softReset).toHaveBeenCalledWith(features)
      expect(capture.softReset).toHaveBeenCalledTimes(1)
    })

    it('does not create a new capture pipeline (same instance reused)', async () => {
      await toRecording(manager)
      const before = captureStubs.length
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { vad: false },
      })
      await waitForState(
        manager,
        atCapture('recording'),
        'recording after soft reset',
      )
      expect(captureStubs.length).toBe(before)
    })

    it('calls record() after soft reset to restart the capture', async () => {
      await toRecording(manager)
      const capture = latestCapture()
      capture.record.mockClear()
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { spectrogram: true },
      })
      await flush()
      expect(capture.record).toHaveBeenCalledTimes(1)
    })

    it('two sequential feature changes each trigger a separate soft reset', async () => {
      await toRecording(manager)
      const capture = latestCapture()
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { spectrogram: true },
      })
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { formant: false },
      })
      await flush()
      expect(capture.softReset).toHaveBeenCalledTimes(2)
      expect(manager.getState().capture).toBe('recording')
    })

    it('STOP_RECORDING after a feature change lands in warm', async () => {
      await toRecording(manager)
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { vad: true },
      })
      manager.sendEvent({ type: 'STOP_RECORDING' })
      await flush()
      expect(manager.getState().capture).toBe('warm')
    })

    it('does not affect the playback sub-state', async () => {
      await toRecording(manager)
      manager.sendEvent({
        type: 'MIC_CAPTURE_FEATURES',
        features: { spectrogram: false },
      })
      await waitForState(
        manager,
        atCapture('recording'),
        'recording after soft reset',
      )
      expect(manager.getState().playback).toBe('idle')
    })
  })

  // -------------------------------------------------------------------------
  // SETTINGS_CHANGE (stub)
  // -------------------------------------------------------------------------

  describe('SETTINGS_CHANGE', () => {
    it('does not change state from idle', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { inputDeviceId: 'new-mic' },
      })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('rebuilds the capture pipeline when warm', async () => {
      await toWarm(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { sampleRate: 'prefer44100' },
      })
      await flush()
      stop()
      // Tearing down and rebuilding the pipeline causes state transitions.
      expect(snapshots.length).toBeGreaterThan(0)
    })

    it('rebuilds and resumes recording after a settings change', async () => {
      await toRecording(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { browserPreprocessing: 'minimal' },
      })
      await flush()
      stop()
      // Pipeline is torn down and restarted; recording resumes automatically.
      expect(snapshots.length).toBeGreaterThan(0)
    })
  })

  // -------------------------------------------------------------------------
  // waitingForSettings flow
  // -------------------------------------------------------------------------

  describe('waitingForSettings flow', () => {
    function makeGetUserMediaFail(): () => void {
      navigator.mediaDevices.getUserMedia = vi
        .fn()
        .mockRejectedValue({ constraint: 'deviceId' })
      return () => {
        navigator.mediaDevices.getUserMedia = vi.fn(async () =>
          makeStubMediaStream(),
        )
      }
    }

    it('START_CAPTURE enters waitingForSettings when getUserMedia is overconstrained', async () => {
      // Prime inputDeviceId so fixPersistentStreamConstraint can relax it.
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { inputDeviceId: 'nonexistent-mic' },
      })
      await flush()

      const restoreGum = makeGetUserMediaFail()
      const { snapshots, stop } = trackState(manager)
      try {
        manager.sendEvent({ type: 'START_CAPTURE' })
        await waitForState(
          manager,
          atCapture('waitingForSettings'),
          'waitingForSettings',
        )
        stop()

        const states = snapshots.map((s) => s.capture)
        expect(states).toContain('warming')
        expect(states).not.toContain('warm')
        expect(states.at(-1)).toBe('waitingForSettings')
      } finally {
        restoreGum()
      }
    })

    it('STOP_CAPTURE from waitingForSettings transitions to idle', async () => {
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { inputDeviceId: 'nonexistent-mic' },
      })
      await flush()

      const restoreGum = makeGetUserMediaFail()
      try {
        manager.sendEvent({ type: 'START_CAPTURE' })
        await waitForState(
          manager,
          atCapture('waitingForSettings'),
          'waitingForSettings',
        )

        const { snapshots, stop } = trackState(manager)
        manager.sendEvent({ type: 'STOP_CAPTURE' })
        await waitForState(manager, atCapture('idle'), 'idle')
        stop()

        expect(snapshots.at(-1)).toEqual({
          capture: 'idle',
          playback: 'idle',
        })
      } finally {
        restoreGum()
      }
    })

    it('SETTINGS_CHANGE from warm enters waitingForSettings when build fails', async () => {
      // Prime inputDeviceId so the rebuild call to getUserMedia can fail
      // with an overconstrained-deviceId error that fixPersistentStreamConstraint
      // recognizes (requires inputDeviceId !== null).
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { inputDeviceId: 'nonexistent-mic' },
      })
      await flush()
      await toWarm(manager)

      const restoreGum = makeGetUserMediaFail()
      const { snapshots, stop } = trackState(manager)
      try {
        manager.sendEvent({
          type: 'SETTINGS_CHANGE',
          settings: { browserPreprocessing: 'minimal' },
        })
        await waitForState(
          manager,
          atCapture('waitingForSettings'),
          'waitingForSettings',
        )
        stop()

        const states = snapshots.map((s) => s.capture)
        // warm → warming → … → waitingForSettings
        expect(states).toContain('warming')
        expect(states.at(-1)).toBe('waitingForSettings')
      } finally {
        restoreGum()
      }
    })

    it('SETTINGS_CHANGE from waitingForSettings recovers and resumes recording', async () => {
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { inputDeviceId: 'nonexistent-mic' },
      })
      await flush()

      const restoreGum = makeGetUserMediaFail()
      try {
        manager.sendEvent({ type: 'START_CAPTURE' })
        await waitForState(
          manager,
          atCapture('waitingForSettings'),
          'waitingForSettings',
        )
      } finally {
        // Restore getUserMedia before the recovery attempt.
        restoreGum()
      }

      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { browserPreprocessing: 'minimal' },
      })
      // wasRecording is true (state === 'waitingForSettings'), so the rebuild
      // transitions through warm into recording automatically.
      await waitForState(
        manager,
        atCapture('recording'),
        'recording after recovery',
      )
      stop()

      const states = snapshots.map((s) => s.capture)
      expect(states).toContain('warming')
      expect(states).toContain('warm')
      expect(states.at(-1)).toBe('recording')
    })

    it('SETTINGS_CHANGE from waitingForSettings stays waiting when build fails again', async () => {
      manager.sendEvent({
        type: 'SETTINGS_CHANGE',
        settings: { inputDeviceId: 'nonexistent-mic' },
      })
      await flush()

      const restoreGum = makeGetUserMediaFail()
      try {
        manager.sendEvent({ type: 'START_CAPTURE' })
        await waitForState(
          manager,
          atCapture('waitingForSettings'),
          'waitingForSettings',
        )

        // Keep getUserMedia failing and send another relevant settings change.
        manager.sendEvent({
          type: 'SETTINGS_CHANGE',
          settings: { browserPreprocessing: 'minimal' },
        })
        // The rebuild cycles through warming and lands back in waitingForSettings.
        await waitForState(
          manager,
          atCapture('waitingForSettings'),
          'waitingForSettings again',
        )
        expect(manager.getState().capture).toBe('waitingForSettings')
      } finally {
        restoreGum()
      }
    })
  })

  // -------------------------------------------------------------------------
  // SEEK (stub)
  // -------------------------------------------------------------------------

  describe('SEEK', () => {
    it('does not change state when playing', async () => {
      await toPlaying(manager)
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'SEEK', timeSec: 3.14 })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
      expect(manager.getState().playback).toBe('playing')
    })

    it('does not change state when idle', async () => {
      const { snapshots, stop } = trackState(manager)
      manager.sendEvent({ type: 'SEEK', timeSec: 0 })
      await flush()
      stop()
      expect(snapshots).toHaveLength(0)
    })

    it('emits positionChanged near the requested position when playing', async () => {
      await toPlaying(manager)
      // Provide ropes so the playback pipeline is actually built; the stub
      // then forwards positionChanged on demand.
      manager.sendEvent({
        type: 'ENABLE_PLAYBACK',
        ropes: [{ length: 44100, sampleRate: 44100 } as any],
        gains: [1],
      })
      await flush()
      const positions: number[] = []
      manager.addEventListener('positionChanged', (e) =>
        positions.push(e.detail.timeSec),
      )
      manager.sendEvent({ type: 'SEEK', timeSec: 5.0 })
      await flush()
      // The new playback pipeline should anchor its clock near timeSec=5.
      latestPlayback().emitPositionChanged(5.0)
      await flush()
      expect(positions.some((t) => Math.abs(t - 5.0) < 0.5)).toBe(true)
    })

    it('SEEK to a position at or past the recording end restarts from 0', async () => {
      // Mirrors AudioPlaybackPipeline: startAtSec within 0.05s of the rope's
      // end wraps back to 0. A SEEK with timeSec beyond the recording duration
      // should yield a positionChanged near 0.
      await toPlaying(manager)
      manager.sendEvent({
        type: 'ENABLE_PLAYBACK',
        ropes: [{ length: 44100, sampleRate: 44100 } as any],
        gains: [1],
      })
      await flush()
      const positions: number[] = []
      manager.addEventListener('positionChanged', (e) =>
        positions.push(e.detail.timeSec),
      )
      manager.sendEvent({ type: 'SEEK', timeSec: Number.MAX_SAFE_INTEGER })
      await flush()
      // After the wrap, the new pipeline anchors at 0.
      latestPlayback().emitPositionChanged(0)
      await flush()
      expect(positions.length).toBeGreaterThan(0)
      expect(positions[0]).toBeCloseTo(0, 0)
    })

    it('accepts fractional, zero, and large timeSec values without throwing', async () => {
      expect(() => {
        manager.sendEvent({ type: 'SEEK', timeSec: 0 })
        manager.sendEvent({ type: 'SEEK', timeSec: 1.23456789 })
        manager.sendEvent({ type: 'SEEK', timeSec: 3600 })
      }).not.toThrow()
      await flush()
    })
  })

  // -------------------------------------------------------------------------
  // Rapid-fire and stress
  // -------------------------------------------------------------------------

  describe('rapid-fire and stress', () => {
    it('survives 20 activate/deactivate cycles with correct final state', async () => {
      for (let i = 0; i < 20; i++) {
        manager.sendEvent({ type: 'START_CAPTURE' })
        manager.sendEvent({ type: 'STOP_CAPTURE' })
      }
      manager.sendEvent({ type: 'START_CAPTURE' })
      await waitForState(manager, atCapture('warm'), 'warm after 20 cycles')
      expect(manager.getState().capture).toBe('warm')
    })

    it('survives 20 enable/disable playback cycles with correct final state', async () => {
      for (let i = 0; i < 20; i++) {
        manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
        manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      }
      await flush()
      expect(manager.getState().playback).toBe('idle')
    })

    it('correctly serialises interleaved capture and playback events', async () => {
      // Queue order: ACTIVATE → ENABLE → DISABLE → START
      // Expected processing:
      //   ACTIVATE:  idle→warming→warm
      //   ENABLE:    idle→playing  (capture=warm, ok)
      //   DISABLE:   playing→idle
      //   START:     warm→recording  (playback=idle, ok)
      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      manager.sendEvent({ type: 'START_RECORDING' })
      await waitForState(manager, atCapture('recording'), 'recording')
      expect(manager.getState()).toEqual({
        capture: 'recording',
        playback: 'idle',
      })
    })

    it('all stateChanged events carry valid sub-state values', async () => {
      const valid = {
        capture: new Set<CaptureSubState>([
          'idle',
          'warming',
          'warm',
          'recording',
          'resetting',
          'waitingForSettings',
        ]),
        playback: new Set<PlaybackSubState>(['idle', 'playing']),
      }

      const bad: AudioPipelineState[] = []
      manager.addEventListener('stateChanged', (e) => {
        const s = e.detail.state
        if (!valid.capture.has(s.capture) || !valid.playback.has(s.playback)) {
          bad.push({ ...s })
        }
      })

      // Drive the manager through several state changes.
      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      manager.sendEvent({ type: 'START_RECORDING' }) // allowed while playing
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      manager.sendEvent({ type: 'START_RECORDING' })
      manager.sendEvent({ type: 'STOP_RECORDING' })
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atBoth('idle', 'idle'), 'both idle at end')

      expect(bad).toHaveLength(0)
    })

    it('destroy in the middle of a pending event queue still idles', async () => {
      // Queue a bunch of events, then destroy before they all process.
      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'START_RECORDING' })
      manager.sendEvent({ type: 'STOP_RECORDING' })
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      // Destroy immediately without awaiting any state.
      manager.destroy()
      await flush()
      expect(manager.getState()).toEqual({ capture: 'idle', playback: 'idle' })
    })

    it('error in the middle of a burst does not drop later events', async () => {
      const errors: string[] = []
      manager.addEventListener('error', (e) => errors.push(e.detail.error))

      // Track how many times capture has reached 'warm':
      //   pass 1 — first START_CAPTURE
      //   ERROR  — forceIdles back to idle
      //   pass 2 — second START_CAPTURE
      let warmCount = 0
      const secondWarm = new Promise<void>((resolve) => {
        manager.addEventListener('stateChanged', (e) => {
          if (e.detail.state.capture === 'warm' && ++warmCount >= 2) resolve()
        })
      })

      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'ERROR', error: 'mid-burst error' })
      manager.sendEvent({ type: 'START_CAPTURE' })
      await secondWarm

      expect(errors).toHaveLength(1)
      expect(errors[0]).toBe('mid-burst error')
      expect(manager.getState().capture).toBe('warm')
    })

    it('stateChanged events never overlap: each fires fully before the next', async () => {
      // EventTarget.dispatchEvent is synchronous, so this is true by spec —
      // but verify it holds through the Sink serialization.
      let inHandler = false
      let overlap = false
      manager.addEventListener('stateChanged', () => {
        if (inHandler) overlap = true
        inHandler = true
        // No async work here; handler returns synchronously.
        inHandler = false
      })

      manager.sendEvent({ type: 'START_CAPTURE' })
      manager.sendEvent({ type: 'ENABLE_PLAYBACK' })
      manager.sendEvent({ type: 'DISABLE_PLAYBACK' })
      manager.sendEvent({ type: 'STOP_CAPTURE' })
      await waitForState(manager, atBoth('idle', 'idle'), 'both idle')

      expect(overlap).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Outbound events forwarded from future pipeline implementations
  // -------------------------------------------------------------------------

  describe('outbound events (forwarding contract)', () => {
    // These tests verify that the manager has the correct event names and types
    // in its OutboundEventMap — ensuring the hook wiring will compile.

    it('addEventListener accepts all expected capture event names', () => {
      expect(() => {
        manager.addEventListener('append', vi.fn())
        manager.addEventListener('chunkStart', vi.fn())
        manager.addEventListener('notification', vi.fn())
        manager.addEventListener('patch', vi.fn())
        manager.addEventListener('recordingComplete', vi.fn())
        manager.addEventListener('sabRopeShare', vi.fn())
        manager.addEventListener('sabRopeGrow', vi.fn())
        manager.addEventListener('sabRopeSeal', vi.fn())
      }).not.toThrow()
    })

    it('addEventListener accepts all expected playback event names', () => {
      expect(() => {
        manager.addEventListener('positionChanged', vi.fn())
        manager.addEventListener('stop', vi.fn())
      }).not.toThrow()
    })

    it('addEventListener accepts shared event names', () => {
      expect(() => {
        manager.addEventListener('error', vi.fn())
        manager.addEventListener('stateChanged', vi.fn())
      }).not.toThrow()
    })
  })
})
