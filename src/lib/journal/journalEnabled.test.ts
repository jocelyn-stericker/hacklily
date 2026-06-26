// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { afterEach, describe, it, expect } from 'vitest'

import { supportsFileSystemAccess } from '../browserFeatures'
import { journalEnabled } from './journalEnabled'

describe('journalEnabled', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('is false by default', () => {
    expect(journalEnabled()).toBe(false)
  })

  it('is true when the flag is exactly "1"', () => {
    localStorage.setItem('ENABLE_JOURNAL', '1')
    expect(journalEnabled()).toBe(true)
  })

  it('is false for any other value', () => {
    localStorage.setItem('ENABLE_JOURNAL', 'true')
    expect(journalEnabled()).toBe(false)
    localStorage.setItem('ENABLE_JOURNAL', '0')
    expect(journalEnabled()).toBe(false)
  })
})

describe('supportsFileSystemAccess', () => {
  afterEach(() => {
    delete (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker
  })

  it('is false when showDirectoryPicker is absent', () => {
    expect(supportsFileSystemAccess()).toBe(false)
  })

  it('is true when showDirectoryPicker is present', () => {
    ;(
      window as unknown as { showDirectoryPicker?: unknown }
    ).showDirectoryPicker = () => {}
    expect(supportsFileSystemAccess()).toBe(true)
  })
})
