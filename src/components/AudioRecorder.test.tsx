import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import type { TimelineState } from '#/components/Plot'
import type { AnalysisMessage } from '#/lib/analysis'

import { AudioRecorder } from './AudioRecorder'

let mockWorkerInstances: any[] = []

// Mock the worker module
vi.mock('#/lib/liveWorker?worker', () => {
  class MockWorker {
    postMessage = vi.fn()
    terminate = vi.fn()
    private workerMessageHandler: ((event: MessageEvent) => void) | null = null

    set onmessage(fn: ((event: MessageEvent) => void) | null) {
      this.workerMessageHandler = fn
    }

    get onmessage() {
      return this.workerMessageHandler
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

  const createMockAnalysisMessage = (
    overrides?: Partial<AnalysisMessage>,
  ): AnalysisMessage => {
    const spectrum = new Float32Array(257)
    spectrum.fill(0.1)
    return {
      voiced: true,
      f0: 100,
      f1: 500,
      f2: 1500,
      f3: 2500,
      spectrum,
      rms: 0.5,
      timeStepSec: 0.02,
      freqStepHz: 20,
      firstBinHz: 0,
      speechProbability: 0,
      ...overrides,
    }
  }

  beforeEach(() => {
    mockWorkerInstances = []

    // Mock MediaStreamTrack
    mockMediaStreamTrack = {
      stop: vi.fn(),
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
      setTimeout(cb, 0)
      return 1
    })
    global.cancelAnimationFrame = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders null', () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    const { container } = render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('calls getUserMedia with audio=true and video=false', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: false,
      })
    })
  })

  it('creates AudioContext with 44100 sample rate', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect((global.AudioContext as any).lastCall).toEqual({
        sampleRate: 44100,
      })
    })
  })

  it('loads audioWorklet module', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalled()
    })
  })

  it('creates AudioWorkletNode with audio-ring-writer', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
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
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(mockSourceNode.connect).toHaveBeenCalledWith(mockWorkletNode)
    })
  })

  it('initializes worklet and worker with SharedArrayBuffer', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitFor(() => {
      const workletCall = mockWorkletNode.port.postMessage.mock.calls[0]?.[0]
      expect(workletCall?.type).toBe('init')
      expect(workletCall?.sab).toBeInstanceOf(SharedArrayBuffer)
      expect(workletCall?.bufSamples).toBe(4096)

      const workerCall = getMockWorker().postMessage.mock.calls[0]?.[0]
      expect(workerCall?.type).toBe('init')
      expect(workerCall?.sab).toBeInstanceOf(SharedArrayBuffer)
      expect(workerCall?.sampleRate).toBe(44100)
      expect(workerCall?.bufSamples).toBe(4096)
    })
  })

  it('calls onAppend when receiving analysis message', async () => {
    const onAppend = vi.fn(() => 10)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    const msg = createMockAnalysisMessage()

    await waitForMockWorker()

    getMockWorker().onmessage({ data: msg })

    expect(onAppend).toHaveBeenCalledWith(msg)
  })

  it('accumulates analysis messages', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const msg1 = createMockAnalysisMessage()
    const msg2 = createMockAnalysisMessage({ timeStepSec: 0.02 })

    getMockWorker().onmessage({ data: msg1 })
    getMockWorker().onmessage({ data: msg2 })

    expect(onAppend).toHaveBeenCalledTimes(2)
  })

  it('calls onReset with accumulated analysis and audio buffer on pcm message', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const msg = createMockAnalysisMessage({ timeStepSec: 0.01 })
    const pcm = new Float32Array([0.1, 0.2, 0.3])

    getMockWorker().onmessage({ data: msg })
    getMockWorker().onmessage({ data: { type: 'pcm', pcm } })

    await waitFor(() => {
      expect(onReset).toHaveBeenCalled()
      const [analysis, buffer] = onReset.mock.calls[0]!
      expect(analysis).toHaveLength(1)
      expect(analysis[0]).toEqual(msg)
      expect(buffer).toBeInstanceOf(AudioBuffer)
      expect(buffer.sampleRate).toBe(44100)
      expect(buffer.numberOfChannels).toBe(1)
    })
  })

  it('terminates worker after pcm message', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const pcm = new Float32Array([0.1, 0.2, 0.3])
    getMockWorker().onmessage({ data: { type: 'pcm', pcm } })

    await waitFor(() => {
      expect(getMockWorker().terminate).toHaveBeenCalled()
    })
  })

  it('updates timeline state when cursor advances', async () => {
    const onAppend = vi.fn(() => 5)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    const initialState: TimelineState = {
      viewportLeftSec: 0,
      viewportRightSec: 10,
      cursorSec: 0,
      hoverSec: null,
      trackDurationSec: 0,
    }

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    // Start with timeline state callback
    onTimelineStateChanged.mockImplementation((fn) => {
      fn(initialState)
    })

    const msg = createMockAnalysisMessage()
    getMockWorker().onmessage({ data: msg })

    // Let RAF execute
    await waitFor(() => {
      expect(onTimelineStateChanged).toHaveBeenCalled()
    })
  })

  it('scrolls viewport when cursor is near the right edge', async () => {
    const onAppend = vi.fn(() => 9)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    const initialState: TimelineState = {
      viewportLeftSec: 0,
      viewportRightSec: 10,
      cursorSec: 0,
      hoverSec: null,
      trackDurationSec: 0,
    }

    let currentState = initialState

    onTimelineStateChanged.mockImplementation((fn) => {
      currentState = fn(currentState)
    })

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const msg = createMockAnalysisMessage()
    getMockWorker().onmessage({ data: msg })

    await waitFor(() => {
      expect(onTimelineStateChanged).toHaveBeenCalled()
    })

    // Cursor at 9 should trigger scroll since viewport is [0, 10]
    // Threshold is 90% from left, so 0 + 10 * 0.9 = 9
    const updatedState = currentState
    expect(updatedState.cursorSec).toBe(9)
  })

  it('calls onError when getUserMedia fails', async () => {
    const error = new Error('Camera permission denied')
    mockGetUserMedia.mockRejectedValueOnce(error)

    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Camera permission denied')
    })
  })

  it('cleans up resources on unmount', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    const { unmount } = render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

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

  it('sends flush message before cleanup', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    const { unmount } = render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(mockSourceNode.connect).toHaveBeenCalled()
    })

    unmount()

    await waitFor(() => {
      expect(getMockWorker().postMessage).toHaveBeenCalledWith({
        type: 'flush',
      })
    })
  })

  it('cancels RAF on cleanup', async () => {
    const onAppend = vi.fn(() => 5)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    const { unmount } = render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const msg = createMockAnalysisMessage()
    getMockWorker().onmessage({ data: msg })

    unmount()

    await waitFor(() => {
      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })
  })

  it('defers teardown if cleanup runs before setup finishes', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
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
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
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
    const onAppend1 = vi.fn(() => 0)
    const onReset1 = vi.fn()
    const onTimelineStateChanged1 = vi.fn()
    const onError1 = vi.fn()

    const { rerender } = render(
      <AudioRecorder
        onAppend={onAppend1}
        onReset={onReset1}
        onTimelineStateChanged={onTimelineStateChanged1}
        onError={onError1}
      />,
    )

    await waitForMockWorker()

    const onAppend2 = vi.fn(() => 0)
    const onReset2 = vi.fn()
    const onTimelineStateChanged2 = vi.fn()
    const onError2 = vi.fn()

    rerender(
      <AudioRecorder
        onAppend={onAppend2}
        onReset={onReset2}
        onTimelineStateChanged={onTimelineStateChanged2}
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

    const msg = createMockAnalysisMessage()
    getMockWorker().onmessage({ data: msg })

    expect(onAppend2).toHaveBeenCalledWith(msg)
    expect(onAppend1).not.toHaveBeenCalled()
  })

  it('calculates audio buffer length from accumulated analysis duration', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const msg1 = createMockAnalysisMessage({ timeStepSec: 0.02 })
    const msg2 = createMockAnalysisMessage({ timeStepSec: 0.02 })
    const pcm = new Float32Array([0.1, 0.2])

    getMockWorker().onmessage({ data: msg1 })
    getMockWorker().onmessage({ data: msg2 })
    getMockWorker().onmessage({ data: { type: 'pcm', pcm } })

    await waitFor(() => {
      expect(onReset).toHaveBeenCalled()
      const [, buffer] = onReset.mock.calls[0]!
      // Duration = 0.02 + 0.02 = 0.04 sec
      // Length = 0.04 * 44100 = 1764 samples
      expect(buffer.length).toBe(Math.round(0.04 * 44100))
    })
  })

  it('copies pcm data to audio buffer channel', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    // Send an analysis message first to allocate buffer space
    const msg = createMockAnalysisMessage({ timeStepSec: 0.01 })
    getMockWorker().onmessage({ data: msg })

    const pcm = new Float32Array([0.1, 0.2, 0.3, 0.4])
    getMockWorker().onmessage({ data: { type: 'pcm', pcm } })

    await waitFor(() => {
      expect(onReset).toHaveBeenCalled()
      const [, buffer] = onReset.mock.calls[0]!
      const data = buffer.getChannelData(0)
      expect(data[0]).toBeCloseTo(0.1, 5)
      expect(data[1]).toBeCloseTo(0.2, 5)
      expect(data[2]).toBeCloseTo(0.3, 5)
      expect(data[3]).toBeCloseTo(0.4, 5)
    })
  })

  it('handles empty pcm data', async () => {
    const onAppend = vi.fn(() => 0)
    const onReset = vi.fn()
    const onTimelineStateChanged = vi.fn()
    const onError = vi.fn()

    render(
      <AudioRecorder
        onAppend={onAppend}
        onReset={onReset}
        onTimelineStateChanged={onTimelineStateChanged}
        onError={onError}
      />,
    )

    await waitForMockWorker()

    const pcm = new Float32Array([])
    getMockWorker().onmessage({ data: { type: 'pcm', pcm } })

    await waitFor(() => {
      expect(onReset).toHaveBeenCalled()
      const [, buffer] = onReset.mock.calls[0]!
      expect(buffer).toBeInstanceOf(AudioBuffer)
    })
  })
})
