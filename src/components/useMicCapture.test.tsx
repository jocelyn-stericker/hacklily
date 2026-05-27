// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import type * as SettingsModule from '#/lib/settings'
import type { AppendFrameMessage, ParamsMessage } from '#/lib/workerMessages'

import { useMicCapture } from './useMicCapture'

type MicCaptureProps = Parameters<typeof useMicCapture>[0]
function TestRecorder(props: MicCaptureProps) {
  useMicCapture(props)
  return null
}

let mockWorkerInstances: any[] = []
let mockFormantWorkerInstances: any[] = []
let mockVadWorkerInstances: any[] = []

vi.mock('#/lib/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof SettingsModule>()
  return {
    ...actual,
    useSettings: vi.fn(() => ({
      inputDeviceId: null,
      sampleRate: 'prefer44100',
      persistentMic: false,
      browserPreprocessing: 'default',
    })),
  }
})

vi.mock('#/lib/FormantWorker?worker', () => {
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

vi.mock('#/lib/VadWorker?worker', () => {
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

// Mock the worker module
vi.mock('#/lib/SpectrogramWorker?worker', () => {
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

  const waitForMockWorker = async () => {
    await waitFor(
      () => {
        if (mockWorkerInstances.length === 0) {
          throw new Error('Waiting for worker creation')
        }
      },
      { timeout: 2000 },
    )
    return getMockWorker()
  }

  let mockFrameIndex = 0
  const createMockParamsMessage = (
    overrides?: Partial<Omit<ParamsMessage, 'type'>>,
  ): ParamsMessage => ({
    type: 'params',
    timeStepSamples: 882,
    sampleRate: 44100,
    freqStepHz: 20,
    firstBinHz: 0,
    ...overrides,
  })
  const createMockFrameMessage = (
    overrides?: Partial<AppendFrameMessage>,
  ): AppendFrameMessage => {
    const spectrum = new Float32Array(257)
    spectrum.fill(0.1)
    return {
      type: 'frame',
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
      close: vi.fn(),
    }

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

    // Mock AudioBuffer
    class MockAudioBuffer {
      length: number
      numberOfChannels: number
      sampleRate: number
      private channelData: Float32Array[] = []

      constructor(options: {
        length: number
        numberOfChannels: number
        sampleRate: number
      }) {
        this.length = options.length
        this.numberOfChannels = options.numberOfChannels
        this.sampleRate = options.sampleRate
        for (let i = 0; i < this.numberOfChannels; i++) {
          this.channelData.push(new Float32Array(this.length))
        }
      }

      getChannelData(channel: number): Float32Array {
        return this.channelData[channel] || new Float32Array()
      }

      copyToChannel(source: Float32Array, channelNumber: number) {
        if (this.channelData[channelNumber]) {
          // Only copy up to the buffer length
          const toCopy = Math.min(
            source.length,
            this.channelData[channelNumber].length,
          )
          this.channelData[channelNumber].set(source.slice(0, toCopy))
        }
      }
    }
    global.AudioBuffer = MockAudioBuffer as any

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

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({ video: false }),
      )
    })
  })

  it('creates AudioContext with 44100 sample rate', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect((global.AudioContext as any).lastCall).toEqual({
        sampleRate: 44100,
        latencyHint: 'interactive',
      })
    })
  })

  it('loads audioWorklet module', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalled()
    })
  })

  it('creates AudioWorkletNode with audio-ring-writer', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
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

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()
    getMockWorker().dispatchMessage(createMockParamsMessage())

    await waitFor(() => {
      expect(mockSourceNode.connect).toHaveBeenCalledWith(mockWorkletNode)
    })
  })

  it('initializes worklet and worker with SharedArrayBuffer', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitFor(() => {
      const workletCall = mockWorkletNode.port.postMessage.mock.calls[0]?.[0]
      expect(workletCall?.type).toBe('init')
      expect(workletCall?.sab).toBeInstanceOf(SharedArrayBuffer)
      expect(workletCall?.bufSamples).toBe(8192)

      const workerCall = getMockWorker().postMessage.mock.calls[0]?.[0]
      expect(workerCall?.type).toBe('init')
      expect(workerCall?.sab).toBeInstanceOf(SharedArrayBuffer)
      expect(workerCall?.sampleRate).toBe(44100)
      expect(workerCall?.bufSamples).toBe(8192)
    })
  })

  it('calls onAppend when receiving analysis message', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    getMockWorker().dispatchMessage(createMockParamsMessage())
    const msg = createMockFrameMessage()
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

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    getMockWorker().dispatchMessage(createMockParamsMessage())
    getMockWorker().dispatchMessage(createMockFrameMessage())
    getMockWorker().dispatchMessage(createMockFrameMessage())

    expect(onAppend).toHaveBeenCalledTimes(2)
  })

  it('calls onRecordingComplete with audio buffer on ended message', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const params = createMockParamsMessage({ timeStepSamples: 441 })
    const msg = createMockFrameMessage()
    const pcm = new Float32Array([0.1, 0.2, 0.3])

    getMockWorker().dispatchMessage(params)
    getMockWorker().dispatchMessage(msg)
    getMockWorker().dispatchMessage({ type: 'ended', pcm })

    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalled()
      const [buffer] = onRecordingComplete.mock.calls[0]!
      expect(buffer).toBeInstanceOf(AudioBuffer)
      expect(buffer.sampleRate).toBe(44100)
      expect(buffer.numberOfChannels).toBe(1)
    })
  })

  it('terminates all workers after ended message', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const pcm = new Float32Array([0.1, 0.2, 0.3])
    getMockWorker().dispatchMessage({ type: 'ended', pcm })

    await waitFor(() => {
      expect(getMockWorker().terminate).toHaveBeenCalled()
      expect(getMockFormantWorker().terminate).toHaveBeenCalled()
      expect(getMockVadWorker().terminate).toHaveBeenCalled()
    })
  })

  it('calls onError when getUserMedia fails', async () => {
    const error = new Error('Camera permission denied')
    mockGetUserMedia.mockRejectedValueOnce(error)

    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
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

    const { unmount } = render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()
    getMockWorker().dispatchMessage(createMockParamsMessage())
    await waitFor(() => {
      expect(mockSourceNode.connect).toHaveBeenCalled()
    })

    unmount()

    await waitFor(() => {
      expect(mockSourceNode.disconnect).toHaveBeenCalled()
      expect(mockWorkletNode.disconnect).toHaveBeenCalled()
      expect(mockAudioContext.close).toHaveBeenCalled()
      expect(mockMediaStreamTrack.stop).toHaveBeenCalled()
    })
  })

  it('closes audio context before signalling workers (no flush message sent)', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    const { unmount } = render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()
    getMockWorker().dispatchMessage(createMockParamsMessage())
    await waitFor(() => {
      expect(mockSourceNode.connect).toHaveBeenCalled()
    })

    unmount()

    await waitFor(() => {
      expect(mockAudioContext.close).toHaveBeenCalled()
      const allCalls = getMockWorker().postMessage.mock.calls
      expect(allCalls.every((c: any[]) => c[0]?.type !== 'flush')).toBe(true)
    })
  })

  it('defers teardown if cleanup runs before setup finishes', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

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
      />,
    )

    // Unmount before getUserMedia completes
    unmount()

    // Wait for the setup to complete and teardown to happen
    await waitFor(
      () => {
        expect(mockAudioContext.close).toHaveBeenCalled()
      },
      { timeout: 1000 },
    )
  })

  it('updates callback refs when props change', async () => {
    const onAppend1 = vi.fn()
    const onRecordingComplete1 = vi.fn()
    const onError1 = vi.fn()

    const { rerender } = render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend1}
        onRecordingComplete={onRecordingComplete1}
        onError={onError1}
      />,
    )

    await waitForMockWorker()

    const onAppend2 = vi.fn()
    const onRecordingComplete2 = vi.fn()
    const onError2 = vi.fn()

    rerender(
      <TestRecorder
        enabled={true}
        onAppend={onAppend2}
        onRecordingComplete={onRecordingComplete2}
        onError={onError2}
      />,
    )

    // Wait a tick for the ref updates to happen
    await waitFor(
      () => {
        // This just waits for the next render cycle
        expect(true).toBe(true)
      },
      { timeout: 100 },
    )

    getMockWorker().dispatchMessage(createMockParamsMessage())
    const msg = createMockFrameMessage()
    getMockWorker().dispatchMessage(msg)

    expect(onAppend2).toHaveBeenCalledWith(
      expect.objectContaining({ spectrum: msg.spectrum, rms: msg.rms }),
    )
    expect(onAppend1).not.toHaveBeenCalled()
  })

  it('calculates audio buffer length from accumulated analysis duration', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    // timeStepSamples=882 → 882/44100 ≈ 0.02 sec per frame, 2 frames = 0.04 sec = 1764 samples
    getMockWorker().dispatchMessage(
      createMockParamsMessage({ timeStepSamples: 882 }),
    )
    getMockWorker().dispatchMessage(createMockFrameMessage())
    getMockWorker().dispatchMessage(createMockFrameMessage())
    getMockWorker().dispatchMessage({
      type: 'audioReady',
      pcm: new Float32Array([0.1, 0.2]),
    })
    getMockWorker().dispatchMessage({
      type: 'ended',
    })

    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalled()
      const [buffer] = onRecordingComplete.mock.calls[0]!
      // Duration = 0.02 + 0.02 = 0.04 sec
      // Length = 0.04 * 44100 = 1764 samples
      expect(buffer.length).toBe(Math.round(0.04 * 44100))
    })
  })

  it('copies pcm data to audio buffer channel', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    // Send a params + frame message first to allocate buffer space
    getMockWorker().dispatchMessage(
      createMockParamsMessage({ timeStepSamples: 441 }),
    )
    getMockWorker().dispatchMessage(createMockFrameMessage())

    const pcm = new Float32Array([0.1, 0.2, 0.3, 0.4])
    getMockWorker().dispatchMessage({ type: 'audioReady', pcm })
    getMockWorker().dispatchMessage({ type: 'ended' })

    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalled()
      const [buffer] = onRecordingComplete.mock.calls[0]!
      const data = buffer.getChannelData(0)
      expect(data[0]).toBeCloseTo(0.1, 5)
      expect(data[1]).toBeCloseTo(0.2, 5)
      expect(data[2]).toBeCloseTo(0.3, 5)
      expect(data[3]).toBeCloseTo(0.4, 5)
    })
  })

  it('defers teardown until all initialized workers send ended', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()
    getMockWorker().dispatchMessage(createMockParamsMessage())
    getMockWorker().dispatchMessage(createMockFrameMessage())
    const pcm = new Float32Array([0.1])
    getMockWorker().dispatchMessage({ type: 'ended', pcm })

    // recordingComplete fires immediately — before formant/vad 'ended'
    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalled()
    })

    // teardown (terminate) must not have fired yet — formant and vad are still pending
    expect(getMockWorker().terminate).toHaveBeenCalled() // spectrogram terminates itself
    expect(getMockFormantWorker().terminate).not.toHaveBeenCalled()
    expect(getMockVadWorker().terminate).not.toHaveBeenCalled()

    // formant finishes — teardown still blocked by vad
    getMockFormantWorker().dispatchMessage({ type: 'ended' })
    await waitFor(() => {
      expect(getMockFormantWorker().terminate).toHaveBeenCalled()
    })
    expect(getMockVadWorker().terminate).not.toHaveBeenCalled()

    // vad finishes — teardown fires
    getMockVadWorker().dispatchMessage({ type: 'ended' })
    await waitFor(() => {
      expect(getMockVadWorker().terminate).toHaveBeenCalled()
    })
  })

  it('terminates all workers on ended with no accumulated frames', async () => {
    const onAppend = vi.fn()
    const onRecordingComplete = vi.fn()
    const onError = vi.fn()

    render(
      <TestRecorder
        enabled={true}
        onAppend={onAppend}
        onRecordingComplete={onRecordingComplete}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const pcm = new Float32Array([])
    getMockWorker().dispatchMessage({ type: 'ended', pcm })

    await waitFor(() => {
      expect(getMockWorker().terminate).toHaveBeenCalled()
      expect(getMockFormantWorker().terminate).toHaveBeenCalled()
      expect(getMockVadWorker().terminate).toHaveBeenCalled()
      expect(onRecordingComplete).not.toHaveBeenCalled()
    })
  })
})
