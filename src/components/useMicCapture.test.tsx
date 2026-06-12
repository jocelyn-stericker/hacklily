// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.

// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import type * as SettingsModule from '#/components/useSettings'
import type { PatchFrameMessage } from '#/lib/workers/workerMessages'

import { useMicCapture } from './useMicCapture'

// Mutable holder updated in beforeEach so the mock factory closes over a
// stable reference while each test gets a fresh mockAudioContext.
const sharedCtxHolder = vi.hoisted(() => ({ current: null as any }))

vi.mock('#/lib/audio/sharedAudioContext', () => ({
  getOrCreateSharedAudioContext: vi.fn(() => ({
    context: sharedCtxHolder.current,
    playbackModuleReady: Promise.resolve(),
    captureModuleReady: Promise.resolve(),
  })),
  resumeSharedAudioContext: vi.fn(),
}))

type MicCaptureProps = Parameters<typeof useMicCapture>[0]
// `onAudioRopeSeal` is irrelevant to these tests; default it so each case can
// omit it.
function TestRecorder(
  props: Omit<MicCaptureProps, 'onAudioRopeSeal'> &
    Partial<Pick<MicCaptureProps, 'onAudioRopeSeal'>>,
) {
  useMicCapture({ onAudioRopeSeal: () => {}, ...props })
  return null
}

let mockWorkerInstances: any[] = []
let mockFormantWorkerInstances: any[] = []
let mockVadWorkerInstances: any[] = []
let mockRopeWriterWorkerInstances: any[] = []

vi.mock('#/components/useSettings', async (importOriginal) => {
  const actual = await importOriginal<typeof SettingsModule>()
  return {
    ...actual,
    useSettings: vi.fn(() => [
      {
        inputDeviceId: null,
        sampleRate: 'prefer44100',
        persistentMic: false,
        browserPreprocessing: 'default',
      },
    ]),
  }
})

vi.mock('#/lib/workers/FormantWorker?worker', () => {
  class MockFormantWorker {
    postMessage = vi.fn()
    terminate = vi.fn()
    private messageListeners: ((event: MessageEvent) => void)[] = []

    addEventListener(
      type: string,
      listener: (event: any) => void,
      options?: AddEventListenerOptions,
    ) {
      if (type !== 'message') return
      this.messageListeners.push(listener)
      options?.signal?.addEventListener('abort', () =>
        this.removeEventListener(type, listener),
      )
    }

    removeEventListener(type: string, listener: (event: any) => void) {
      if (type !== 'message') return
      const idx = this.messageListeners.indexOf(listener)
      if (idx !== -1) this.messageListeners.splice(idx, 1)
    }

    dispatchMessage(data: any) {
      const event = new MessageEvent('message', { data })
      for (const listener of [...this.messageListeners]) {
        listener(event)
      }
    }
  }

  return {
    default: class {
      constructor() {
        const worker = new MockFormantWorker()
        mockFormantWorkerInstances.push(worker)
        return worker
      }
    },
  }
})

vi.mock('#/lib/workers/VadWorker?worker', () => {
  class MockVadWorker {
    postMessage = vi.fn()
    terminate = vi.fn()
    private messageListeners: ((event: MessageEvent) => void)[] = []

    addEventListener(
      type: string,
      listener: (event: any) => void,
      options?: AddEventListenerOptions,
    ) {
      if (type !== 'message') return
      this.messageListeners.push(listener)
      options?.signal?.addEventListener('abort', () =>
        this.removeEventListener(type, listener),
      )
    }

    removeEventListener(type: string, listener: (event: any) => void) {
      if (type !== 'message') return
      const idx = this.messageListeners.indexOf(listener)
      if (idx !== -1) this.messageListeners.splice(idx, 1)
    }

    dispatchMessage(data: any) {
      const event = new MessageEvent('message', { data })
      for (const listener of [...this.messageListeners]) {
        listener(event)
      }
    }
  }

  return {
    default: class {
      constructor() {
        const worker = new MockVadWorker()
        mockVadWorkerInstances.push(worker)
        return worker
      }
    },
  }
})

vi.mock('#/lib/workers/RopeWriterWorker?worker', () => {
  class MockRopeWriterWorker {
    postMessage = vi.fn()
    terminate = vi.fn()
    messageListeners: ((event: MessageEvent) => void)[] = []

    addEventListener(
      type: string,
      listener: (event: any) => void,
      options?: AddEventListenerOptions,
    ) {
      if (type !== 'message') return
      this.messageListeners.push(listener)
      options?.signal?.addEventListener('abort', () =>
        this.removeEventListener(type, listener),
      )
    }

    removeEventListener(type: string, listener: (event: any) => void) {
      if (type !== 'message') return
      const idx = this.messageListeners.indexOf(listener)
      if (idx !== -1) this.messageListeners.splice(idx, 1)
    }

    dispatchMessage(data: any) {
      const event = new MessageEvent('message', { data })
      for (const listener of [...this.messageListeners]) {
        listener(event)
      }
    }
  }

  return {
    default: class {
      constructor() {
        const worker = new MockRopeWriterWorker()
        mockRopeWriterWorkerInstances.push(worker)
        return worker
      }
    },
  }
})

// Mock the worker module
vi.mock('#/lib/workers/SpectrogramWorker?worker', () => {
  class MockWorker {
    postMessage = vi.fn()
    terminate = vi.fn()
    private messageListeners: ((event: MessageEvent) => void)[] = []

    addEventListener(
      type: string,
      listener: (event: any) => void,
      options?: AddEventListenerOptions,
    ) {
      if (type !== 'message') return
      this.messageListeners.push(listener)
      options?.signal?.addEventListener('abort', () =>
        this.removeEventListener(type, listener),
      )
    }

    removeEventListener(type: string, listener: (event: any) => void) {
      if (type !== 'message') return
      const idx = this.messageListeners.indexOf(listener)
      if (idx !== -1) this.messageListeners.splice(idx, 1)
    }

    dispatchMessage(data: any) {
      const event = new MessageEvent('message', { data })
      for (const listener of [...this.messageListeners]) {
        listener(event)
      }
    }
  }

  return {
    default: class {
      constructor() {
        const worker = new MockWorker()
        mockWorkerInstances.push(worker)
        return worker
      }
    },
  }
})

describe('AudioRecorder', () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>
  let mockAudioContext: any
  let mockSourceNode: any
  let mockWorkletNode: any
  let mockMessageChannel: any
  let mockMediaStreamTrack: any

  const getMockWorker = () => {
    if (mockWorkerInstances.length === 0) {
      throw new Error('No mock worker instances created')
    }
    return mockWorkerInstances[mockWorkerInstances.length - 1]
  }

  const getMockFormantWorker = () => {
    if (mockFormantWorkerInstances.length === 0) {
      throw new Error('No mock formant worker instances created')
    }
    return mockFormantWorkerInstances[mockFormantWorkerInstances.length - 1]
  }

  const getMockVadWorker = () => {
    if (mockVadWorkerInstances.length === 0) {
      throw new Error('No mock VAD worker instances created')
    }
    return mockVadWorkerInstances[mockVadWorkerInstances.length - 1]
  }

  const getMockRopeWriterWorker = () => {
    if (mockRopeWriterWorkerInstances.length === 0) {
      throw new Error('No mock RopeWriter worker instances created')
    }
    return mockRopeWriterWorkerInstances[
      mockRopeWriterWorkerInstances.length - 1
    ]
  }

  const waitForConsumerInit = async () => {
    await waitFor(() => {
      const calls = getMockWorker().postMessage.mock.calls
      const initCall = calls.find((c: any[]) => c[0]?.type === 'init')
      if (!initCall) throw new Error('Waiting for SpectrogramWorker init')
    })
  }

  const waitForMockRopeWriterWorker = async () => {
    await waitFor(
      () => {
        if (mockRopeWriterWorkerInstances.length === 0) {
          throw new Error('Waiting for RopeWriter worker creation')
        }
      },
      { timeout: 2000 },
    )
    return getMockRopeWriterWorker()
  }

  const dispatchRopeReady = async () => {
    await waitFor(() => {
      const ropeWriter = getMockRopeWriterWorker()
      const calls = ropeWriter.postMessage.mock.calls
      const initCall = calls.find((c: any[]) => c[0]?.type === 'init')
      if (!initCall) throw new Error('Waiting for RopeWriter init')
      const hasListener = ropeWriter.messageListeners?.length > 0
      if (!hasListener) throw new Error('Waiting for RopeWriter listener')
    })
    getMockRopeWriterWorker().dispatchMessage({
      type: 'rope-ready',
      rope: {
        type: 'audio-rope',
        buffers: [new SharedArrayBuffer(4096)],
        ctrlPtr: new SharedArrayBuffer(8),
        sampleRate: 44100,
      },
      sampleRate: 44100,
    })
    await waitFor(() => {
      const calls = getMockWorker().postMessage.mock.calls
      const initCall = calls.find((c: any[]) => c[0]?.type === 'init')
      if (!initCall) throw new Error('Waiting for SpectrogramWorker init')
    })
  }

  let mockFrameIndex = 0
  const createMockPatchMessage = (
    overrides?: Partial<PatchFrameMessage>,
  ): PatchFrameMessage => {
    const spectrum = new Float32Array(257)
    spectrum.fill(0.1)
    return {
      type: 'patch',
      frameIndex: mockFrameIndex++,
      pitchDetected: true,
      speechDetected: true,
      f0: 100,
      f1: 500,
      f2: 1500,
      f3: 2500,
      spectrum,
      rms: 0.5,
      speechProbability: 0,
      ...overrides,
    }
  }

  beforeEach(() => {
    mockWorkerInstances = []
    mockFormantWorkerInstances = []
    mockVadWorkerInstances = []
    mockRopeWriterWorkerInstances = []
    mockFrameIndex = 0

    // Mock MediaStreamTrack
    mockMediaStreamTrack = {
      stop: vi.fn(),
      getSettings: vi.fn(() => ({})),
      addEventListener: vi.fn(),
    }

    // Mock MediaStream
    const mockMediaStream = {
      getTracks: vi.fn(() => [mockMediaStreamTrack]),
    }

    // Mock getUserMedia
    mockGetUserMedia = vi.fn().mockResolvedValue(mockMediaStream)
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      configurable: true,
    })

    // Mock MessagePort
    let messageHandler: ((event: MessageEvent) => void) | null = null
    const mockPort = {
      postMessage: vi.fn(),
      _onmessage: null as any,
      set onmessage(fn: ((event: MessageEvent) => void) | null) {
        messageHandler = fn
      },
      get onmessage() {
        return messageHandler
      },
    } as any

    // Mock MessageChannel
    mockMessageChannel = {
      port1: mockPort,
      port2: mockPort,
    }
    const MockMessageChannelClass = function () {
      return mockMessageChannel
    } as any
    global.MessageChannel = MockMessageChannelClass

    // Mock AudioWorkletNode
    let workletMessageHandler: ((event: MessageEvent) => void) | null = null
    mockWorkletNode = {
      port: {
        postMessage: vi.fn(),
        _onmessage: null as any,
        set onmessage(fn: ((event: MessageEvent) => void) | null) {
          workletMessageHandler = fn
        },
        get onmessage() {
          return workletMessageHandler
        },
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as any

    // Mock AudioContext
    mockSourceNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    }

    mockAudioContext = {
      sampleRate: 44100,
      audioWorklet: {
        addModule: vi.fn().mockResolvedValue(undefined),
      },
      createMediaStreamSource: vi.fn(() => mockSourceNode),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    }
    sharedCtxHolder.current = mockAudioContext

    // Wrap the constructors to return our mocks
    const MockAudioContextClass = function (options: any) {
      MockAudioContextClass.calls = (MockAudioContextClass.calls || 0) + 1
      MockAudioContextClass.lastCall = options
      return mockAudioContext
    } as any
    MockAudioContextClass.calls = 0
    global.AudioContext = MockAudioContextClass

    const MockAudioWorkletNodeClass = function (context: any, name: string) {
      MockAudioWorkletNodeClass.calls =
        (MockAudioWorkletNodeClass.calls || 0) + 1
      MockAudioWorkletNodeClass.lastCall = [context, name]
      return mockWorkletNode
    } as any
    MockAudioWorkletNodeClass.calls = 0
    global.AudioWorkletNode = MockAudioWorkletNodeClass

    // Mock requestAnimationFrame and cancelAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(() => cb(), 0)
      return 1
    })
    global.cancelAnimationFrame = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls getUserMedia with audio constraints and video=false', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({ video: false }),
      )
    })
  })

  it('creates AudioWorkletNode with audio-ring-writer', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitFor(() => {
      expect((global.AudioWorkletNode as any).lastCall).toEqual([
        mockAudioContext,
        'audio-ring-writer',
      ])
    })
  })

  it('connects source node to worklet node', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()

    await waitFor(() => {
      expect(mockSourceNode.connect).toHaveBeenCalledWith(mockWorkletNode)
    })
  })

  it('initializes worklet and worker with SharedArrayBuffer', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitFor(() => {
      const workletCall = mockWorkletNode.port.postMessage.mock.calls[0]?.[0]
      expect(workletCall?.type).toBe('init')
      expect(workletCall?.sab).toBeInstanceOf(SharedArrayBuffer)
      expect(workletCall?.bufSamples).toBe(8192)
    })

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()

    await waitFor(() => {
      const ropeWriterCall =
        getMockRopeWriterWorker().postMessage.mock.calls[0]?.[0]
      expect(ropeWriterCall?.type).toBe('init')
      expect(ropeWriterCall?.sab).toBeInstanceOf(SharedArrayBuffer)
      expect(ropeWriterCall?.sampleRate).toBe(44100)
      expect(ropeWriterCall?.bufSamples).toBe(8192)

      const workerCall = getMockWorker().postMessage.mock.calls[0]?.[0]
      expect(workerCall?.type).toBe('init')
      expect(workerCall?.rope).toBeDefined()
      expect(workerCall?.sampleRate).toBe(44100)
    })
  })

  it('calls onAppend when receiving analysis message', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitForConsumerInit()

    const msg = createMockPatchMessage()
    getMockWorker().dispatchMessage(msg)

    expect(onAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        spectrum: msg.spectrum,
        rms: msg.rms,
        pitchDetected: msg.pitchDetected,
        speechDetected: msg.speechDetected,
      }),
    )
  })

  it('accumulates analysis messages', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitForConsumerInit()

    getMockWorker().dispatchMessage(createMockPatchMessage())
    getMockWorker().dispatchMessage(createMockPatchMessage())

    expect(onAppend).toHaveBeenCalledTimes(2)
  })

  it('emits append only for new frames, patch for updates (regression: transcription spam)', async () => {
    const onAppend = vi.fn()
    const onPatch = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onPatch={onPatch}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitForConsumerInit()

    // First patch to frame 0 should emit append (new frame)
    getMockWorker().dispatchMessage(createMockPatchMessage({ frameIndex: 0 }))
    expect(onAppend).toHaveBeenCalledTimes(1)
    expect(onPatch).toHaveBeenCalledTimes(0)

    // Second patch to frame 0 should emit patch (update existing frame)
    getMockWorker().dispatchMessage(createMockPatchMessage({ frameIndex: 0 }))
    expect(onAppend).toHaveBeenCalledTimes(1) // still 1, not 2
    expect(onPatch).toHaveBeenCalledTimes(1)

    // Patch to frame 1 should emit append (new frame)
    getMockWorker().dispatchMessage(createMockPatchMessage({ frameIndex: 1 }))
    expect(onAppend).toHaveBeenCalledTimes(2)
    expect(onPatch).toHaveBeenCalledTimes(1)

    // Another patch to frame 1 should emit patch (update existing frame)
    getMockWorker().dispatchMessage(createMockPatchMessage({ frameIndex: 1 }))
    expect(onAppend).toHaveBeenCalledTimes(2) // still 2, not 3
    expect(onPatch).toHaveBeenCalledTimes(2)
  })

  it('calls onRecordingComplete on ended message when frames were produced', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitForConsumerInit()

    const msg = createMockPatchMessage()

    getMockWorker().dispatchMessage(msg)
    getMockWorker().dispatchMessage({ type: 'ended' })

    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalled()
    })
  })

  it('terminates all workers after ended message', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitForConsumerInit()

    getMockWorker().dispatchMessage({ type: 'ended' })
    getMockFormantWorker().dispatchMessage({ type: 'ended' })
    getMockVadWorker().dispatchMessage({ type: 'ended' })
    getMockRopeWriterWorker().dispatchMessage({ type: 'ended' })

    await waitFor(() => {
      expect(getMockWorker().terminate).toHaveBeenCalled()
      expect(getMockFormantWorker().terminate).toHaveBeenCalled()
      expect(getMockVadWorker().terminate).toHaveBeenCalled()
      expect(getMockRopeWriterWorker().terminate).toHaveBeenCalled()
    })
  })

  it('calls onError when getUserMedia fails', async () => {
    const error = new Error('Camera permission denied')
    mockGetUserMedia.mockRejectedValueOnce(error)

    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Camera permission denied')
    })
  })

  it('cleans up resources on unmount', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    const { unmount } = render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitFor(() => {
      expect(mockSourceNode.connect).toHaveBeenCalled()
    })

    unmount()

    await waitFor(() => {
      expect(mockSourceNode.disconnect).toHaveBeenCalled()
      expect(mockWorkletNode.disconnect).toHaveBeenCalled()
      expect(mockAudioContext.suspend).toHaveBeenCalled()
      expect(mockMediaStreamTrack.stop).toHaveBeenCalled()
    })
  })

  it('suspends audio context before signalling workers (no flush message sent)', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    const { unmount } = render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitFor(() => {
      expect(mockSourceNode.connect).toHaveBeenCalled()
    })

    unmount()

    await waitFor(() => {
      expect(mockAudioContext.suspend).toHaveBeenCalled()
      const allCalls = getMockWorker().postMessage.mock.calls
      expect(allCalls.every((c: any[]) => c[0]?.type !== 'flush')).toBe(true)
    })
  })

  it('defers teardown if cleanup runs before setup finishes', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    // Create a promise that won't resolve immediately
    const slowGetUserMedia = vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              getTracks: () => [mockMediaStreamTrack],
            })
          }, 100)
        }),
    )

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: slowGetUserMedia,
      },
      configurable: true,
    })

    const { unmount } = render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    // Unmount before getUserMedia completes
    unmount()

    // Wait for the setup to complete and teardown to happen
    await waitFor(
      () => {
        expect(mockAudioContext.suspend).toHaveBeenCalled()
      },
      { timeout: 1000 },
    )
  })

  it('updates callback refs when props change', async () => {
    const onAppend1 = vi.fn()
    const onRecordingComplete1 = vi.fn()
    const onError1 = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    const { rerender } = render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend1}
        onRecordingComplete={onRecordingComplete1}
        onError={onError1}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitForConsumerInit()

    const onAppend2 = vi.fn()
    const onRecordingComplete2 = vi.fn()
    const onError2 = vi.fn()

    rerender(
      <TestRecorder
        enabled={true}
        onAppend={onAppend2}
        onRecordingComplete={onRecordingComplete2}
        onError={onError2}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitFor(
      () => {
        expect(true).toBe(true)
      },
      { timeout: 100 },
    )

    const msg = createMockPatchMessage()
    getMockWorker().dispatchMessage(msg)

    expect(onAppend2).toHaveBeenCalledWith(
      expect.objectContaining({ spectrum: msg.spectrum, rms: msg.rms }),
    )
    expect(onAppend1).not.toHaveBeenCalled()
  })

  it('defers teardown until all initialized workers send ended', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitForConsumerInit()
    getMockWorker().dispatchMessage(createMockPatchMessage())
    getMockWorker().dispatchMessage({ type: 'ended' })

    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalled()
    })

    expect(getMockWorker().terminate).toHaveBeenCalled()
    expect(getMockFormantWorker().terminate).not.toHaveBeenCalled()
    expect(getMockVadWorker().terminate).not.toHaveBeenCalled()
    expect(getMockRopeWriterWorker().terminate).not.toHaveBeenCalled()

    getMockFormantWorker().dispatchMessage({ type: 'ended' })
    await waitFor(() => {
      expect(getMockFormantWorker().terminate).toHaveBeenCalled()
    })
    expect(getMockVadWorker().terminate).not.toHaveBeenCalled()
    expect(getMockRopeWriterWorker().terminate).not.toHaveBeenCalled()

    getMockVadWorker().dispatchMessage({ type: 'ended' })
    await waitFor(() => {
      expect(getMockVadWorker().terminate).toHaveBeenCalled()
    })
    expect(getMockRopeWriterWorker().terminate).not.toHaveBeenCalled()

    getMockRopeWriterWorker().dispatchMessage({ type: 'ended' })
    await waitFor(() => {
      expect(getMockRopeWriterWorker().terminate).toHaveBeenCalled()
    })
  })

  it('terminates all workers on ended with no accumulated frames', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()
    const onAudioRopeGrow = vi.fn()
    const onAudioRopeShare = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
        onAudioRopeGrow={onAudioRopeGrow}
        onAudioRopeShare={onAudioRopeShare}
      />,
    )

    await waitForMockRopeWriterWorker()
    await dispatchRopeReady()
    await waitForConsumerInit()

    getMockWorker().dispatchMessage({ type: 'ended' })
    getMockFormantWorker().dispatchMessage({ type: 'ended' })
    getMockVadWorker().dispatchMessage({ type: 'ended' })
    getMockRopeWriterWorker().dispatchMessage({ type: 'ended' })

    await waitFor(() => {
      expect(getMockWorker().terminate).toHaveBeenCalled()
      expect(getMockFormantWorker().terminate).toHaveBeenCalled()
      expect(getMockVadWorker().terminate).toHaveBeenCalled()
      expect(getMockRopeWriterWorker().terminate).toHaveBeenCalled()
      // recordingComplete fires as a final fallback even with no frames,
      // so callers are never left waiting for a transition that will never come.
      expect(onRecordingComplete).toHaveBeenCalled()
    })
  })
})
