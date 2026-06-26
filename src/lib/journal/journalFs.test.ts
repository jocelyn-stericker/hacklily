// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect, vi } from 'vitest'

import {
  ensureAccess,
  isAudioFileName,
  journalEntryBaseName,
  queryAccess,
  sortEntriesByModifiedDesc,
  uniqueEntryName,
} from './journalFs'

describe('isAudioFileName', () => {
  it('accepts known audio extensions, case-insensitively', () => {
    expect(isAudioFileName('take.mp3')).toBe(true)
    expect(isAudioFileName('TAKE.MP3')).toBe(true)
    expect(isAudioFileName('clip.wav')).toBe(true)
    expect(isAudioFileName('clip.m4a')).toBe(true)
    expect(isAudioFileName('clip.opus')).toBe(true)
  })

  it('rejects non-audio and extension-less names', () => {
    expect(isAudioFileName('notes.txt')).toBe(false)
    expect(isAudioFileName('README')).toBe(false)
    expect(isAudioFileName('.hidden')).toBe(false)
    expect(isAudioFileName('archive.zip')).toBe(false)
  })
})

describe('journalEntryBaseName', () => {
  it('produces a sortable, Windows-legal timestamp in local time', () => {
    // Constructed with local components so the expectation is timezone-agnostic.
    const date = new Date(2026, 5, 26, 14, 30, 5, 123)
    expect(journalEntryBaseName(date)).toBe('2026-06-26_14-30-05')
  })
})

describe('uniqueEntryName', () => {
  const date = new Date(2026, 5, 26, 14, 30, 5, 123)

  it('uses the plain timestamp name when nothing collides', () => {
    expect(uniqueEntryName(date, [])).toBe('2026-06-26_14-30-05.mp3')
  })

  it('adds a numeric suffix on a same-second collision', () => {
    expect(uniqueEntryName(date, ['2026-06-26_14-30-05.mp3'])).toBe(
      '2026-06-26_14-30-05-2.mp3',
    )
  })

  it('keeps incrementing past further collisions', () => {
    expect(
      uniqueEntryName(date, [
        '2026-06-26_14-30-05.mp3',
        '2026-06-26_14-30-05-2.mp3',
      ]),
    ).toBe('2026-06-26_14-30-05-3.mp3')
  })

  it('matches existing names case-insensitively', () => {
    expect(uniqueEntryName(date, ['2026-06-26_14-30-05.MP3'])).toBe(
      '2026-06-26_14-30-05-2.mp3',
    )
  })
})

describe('access permission shim', () => {
  // An OPFS directory handle exposes no permission methods.
  const opfsHandle = {} as FileSystemDirectoryHandle

  it('queryAccess reports OPFS handles (no permission methods) as granted', async () => {
    await expect(queryAccess(opfsHandle)).resolves.toBe('granted')
  })

  it('ensureAccess never prompts for an OPFS handle', async () => {
    await expect(ensureAccess(opfsHandle)).resolves.toBe('granted')
  })

  it('queryAccess delegates to queryPermission for an FSA handle', async () => {
    const queryPermission = vi.fn().mockResolvedValue('granted')
    const handle = { queryPermission } as unknown as FileSystemDirectoryHandle
    await expect(queryAccess(handle)).resolves.toBe('granted')
    expect(queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
  })

  it('ensureAccess requests permission when an FSA handle is not yet granted', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    const handle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission,
    } as unknown as FileSystemDirectoryHandle
    await expect(ensureAccess(handle)).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
  })
})

describe('sortEntriesByModifiedDesc', () => {
  it('orders newest first without mutating the input', () => {
    const input = [
      { name: 'a', lastModified: 100 },
      { name: 'b', lastModified: 300 },
      { name: 'c', lastModified: 200 },
    ]
    const sorted = sortEntriesByModifiedDesc(input)
    expect(sorted.map((e) => e.name)).toEqual(['b', 'c', 'a'])
    expect(input.map((e) => e.name)).toEqual(['a', 'b', 'c'])
  })
})
