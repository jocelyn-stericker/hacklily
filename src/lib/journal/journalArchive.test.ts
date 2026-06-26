// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import { parseManifest, summarizeSinceExport } from './journalArchive'

describe('summarizeSinceExport', () => {
  const durations = new Map<string, number>([
    ['a.mp3', 10],
    ['b.mp3', 20],
    ['c.mp3', 30],
  ])

  it('counts every entry when there was no prior export', () => {
    const entries = [
      { name: 'a.mp3', lastModified: 100 },
      { name: 'b.mp3', lastModified: 200 },
      { name: 'c.mp3', lastModified: 300 },
    ]
    expect(summarizeSinceExport(entries, durations, null)).toEqual({
      count: 3,
      seconds: 60,
    })
  })

  it('excludes entries at or before the last-export mark', () => {
    const entries = [
      { name: 'a.mp3', lastModified: 100 },
      { name: 'b.mp3', lastModified: 200 },
      { name: 'c.mp3', lastModified: 300 },
    ]
    // 200 is the boundary: an entry modified exactly at it is NOT new.
    expect(summarizeSinceExport(entries, durations, 200)).toEqual({
      count: 1,
      seconds: 30,
    })
  })

  it('counts entries without a known duration but skips their seconds', () => {
    const entries = [
      { name: 'a.mp3', lastModified: 100 },
      { name: 'unknown.mp3', lastModified: 150 },
      { name: 'c.mp3', lastModified: 300 },
    ]
    expect(summarizeSinceExport(entries, durations, 99)).toEqual({
      count: 3,
      seconds: 40,
    })
  })

  it('returns nothing when every entry predates the export', () => {
    const entries = [{ name: 'a.mp3', lastModified: 100 }]
    expect(summarizeSinceExport(entries, durations, 100)).toEqual({
      count: 0,
      seconds: 0,
    })
  })
})

describe('parseManifest', () => {
  const encode = (s: string) => new TextEncoder().encode(s)

  it('round-trips a well-formed manifest', () => {
    const manifest = { version: 1, durations: { 'a.mp3': 10.5, 'b.mp3': 20 } }
    expect(parseManifest(encode(JSON.stringify(manifest)))).toEqual(manifest)
  })

  it('drops non-number duration values', () => {
    const manifest = {
      version: 1,
      durations: { 'a.mp3': 10, 'bad.mp3': 'oops', 'b.mp3': 20 },
    }
    expect(parseManifest(encode(JSON.stringify(manifest)))).toEqual({
      version: 1,
      durations: { 'a.mp3': 10, 'b.mp3': 20 },
    })
  })

  it('rejects an unknown version', () => {
    const manifest = { version: 2, durations: {} }
    expect(parseManifest(encode(JSON.stringify(manifest)))).toBeNull()
  })

  it('rejects malformed JSON', () => {
    expect(parseManifest(encode('{not json'))).toBeNull()
  })

  it('rejects a non-object root', () => {
    expect(parseManifest(encode('"hello"'))).toBeNull()
  })

  it('rejects a missing durations object', () => {
    expect(parseManifest(encode(JSON.stringify({ version: 1 })))).toBeNull()
  })
})
