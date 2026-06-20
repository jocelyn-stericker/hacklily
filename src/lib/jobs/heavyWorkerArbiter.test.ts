// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  acquireHeavy,
  heavyIdleTeardownMs,
  registerHeavyWorker,
  releaseHeavy,
  residentHeavyKind,
} from './heavyWorkerArbiter'

const { getSnapshotMock } = vi.hoisted(() => ({
  getSnapshotMock: vi.fn(() => ({ runHeavyWhileRecording: false })),
}))
vi.mock('#/lib/settings', () => ({
  getSnapshot: getSnapshotMock,
  subscribe: vi.fn(() => () => {}),
}))

afterEach(() => {
  releaseHeavy('transcribe')
  releaseHeavy('align')
  getSnapshotMock.mockReturnValue({ runHeavyWhileRecording: false })
})

describe('acquireHeavy', () => {
  it('evicts the other kind and records residency, never itself', () => {
    const transcribeTeardown = vi.fn()
    const alignTeardown = vi.fn()
    registerHeavyWorker('transcribe', transcribeTeardown)
    registerHeavyWorker('align', alignTeardown)

    acquireHeavy('transcribe')
    expect(alignTeardown).toHaveBeenCalledTimes(1)
    expect(transcribeTeardown).not.toHaveBeenCalled()
    expect(residentHeavyKind()).toBe('transcribe')

    acquireHeavy('align')
    expect(transcribeTeardown).toHaveBeenCalledTimes(1)
    // The already-resident kind isn't torn down a second time.
    expect(alignTeardown).toHaveBeenCalledTimes(1)
    expect(residentHeavyKind()).toBe('align')
  })
})

describe('heavyIdleTeardownMs', () => {
  it('lingers longer when heavy-while-recording is on', () => {
    getSnapshotMock.mockReturnValue({ runHeavyWhileRecording: false })
    const cold = heavyIdleTeardownMs()
    getSnapshotMock.mockReturnValue({ runHeavyWhileRecording: true })
    const warm = heavyIdleTeardownMs()
    expect(warm).toBeGreaterThan(cold)
  })
})
