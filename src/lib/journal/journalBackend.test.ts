// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { afterEach, describe, expect, it, vi } from 'vitest'

import { journalBackendKind, journalSetupGuidance } from './journalBackend'

const features = vi.hoisted(() => ({
  supportsFileSystemAccess: vi.fn(),
  supportsOpfs: vi.fn(),
  isIos: vi.fn(),
  isStandalone: vi.fn(),
}))

// vitest hoists vi.mock above the imports, so journalBackend sees the mock.
vi.mock('#/lib/browserFeatures', () => features)

afterEach(() => {
  vi.clearAllMocks()
})

describe('journalBackendKind', () => {
  it('prefers FSA when available (Chromium)', () => {
    features.supportsFileSystemAccess.mockReturnValue(true)
    features.isIos.mockReturnValue(false)
    features.supportsOpfs.mockReturnValue(true)
    expect(journalBackendKind()).toBe('fsa')
  })

  it('falls back to OPFS on iOS without FSA', () => {
    features.supportsFileSystemAccess.mockReturnValue(false)
    features.isIos.mockReturnValue(true)
    features.supportsOpfs.mockReturnValue(true)
    expect(journalBackendKind()).toBe('opfs')
  })

  it('uses OPFS on desktop Firefox/Safari (no FSA) so the user can opt in', () => {
    features.supportsFileSystemAccess.mockReturnValue(false)
    features.isIos.mockReturnValue(false)
    features.supportsOpfs.mockReturnValue(true)
    expect(journalBackendKind()).toBe('opfs')
  })

  it('is null when neither FSA nor OPFS is available', () => {
    features.supportsFileSystemAccess.mockReturnValue(false)
    features.isIos.mockReturnValue(true)
    features.supportsOpfs.mockReturnValue(false)
    expect(journalBackendKind()).toBe(null)
  })
})

describe('journalSetupGuidance', () => {
  it('tells FSA users to choose a folder', () => {
    features.supportsFileSystemAccess.mockReturnValue(true)
    expect(journalSetupGuidance()).toBe('choose-folder')
  })

  it('tells iOS users to add to Home Screen', () => {
    features.supportsFileSystemAccess.mockReturnValue(false)
    features.isIos.mockReturnValue(true)
    features.supportsOpfs.mockReturnValue(true)
    expect(journalSetupGuidance()).toBe('add-to-home')
  })

  it('offers desktop non-Chromium users the Chromium recommendation + opt-in', () => {
    features.supportsFileSystemAccess.mockReturnValue(false)
    features.isIos.mockReturnValue(false)
    features.supportsOpfs.mockReturnValue(true)
    expect(journalSetupGuidance()).toBe('use-chromium')
  })

  it('reports unsupported when there is no storage backend at all', () => {
    features.supportsFileSystemAccess.mockReturnValue(false)
    features.isIos.mockReturnValue(false)
    features.supportsOpfs.mockReturnValue(false)
    expect(journalSetupGuidance()).toBe('unsupported')
  })
})
