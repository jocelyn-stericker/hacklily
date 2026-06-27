// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import {
  formatSrt,
  formatSrtTime,
  parseSrt,
  parseSrtTime,
  srtNameFor,
} from './journalSrt'

describe('srtNameFor', () => {
  it('replaces the audio extension with .srt', () => {
    expect(srtNameFor('2026-06-26_14-30-05.mp3')).toBe(
      '2026-06-26_14-30-05.srt',
    )
    expect(srtNameFor('clip.wav')).toBe('clip.srt')
  })

  it('appends .srt when there is no extension', () => {
    expect(srtNameFor('README')).toBe('README.srt')
  })
})

describe('formatSrtTime', () => {
  it('formats zero as 00:00:00,000', () => {
    expect(formatSrtTime(0)).toBe('00:00:00,000')
  })

  it('formats hours, minutes, seconds, milliseconds', () => {
    expect(formatSrtTime(3661.5)).toBe('01:01:01,500')
  })

  it('clamps negative values to zero', () => {
    expect(formatSrtTime(-5)).toBe('00:00:00,000')
  })

  it('rounds milliseconds', () => {
    expect(formatSrtTime(1.9995)).toBe('00:00:02,000')
  })
})

describe('parseSrtTime', () => {
  it('parses a standard SRT timecode', () => {
    expect(parseSrtTime('01:01:01,500')).toBe(3661.5)
  })

  it('accepts a period separator instead of comma', () => {
    expect(parseSrtTime('00:00:01.500')).toBe(1.5)
  })

  it('returns null for a malformed timecode', () => {
    expect(parseSrtTime('1:01:01')).toBeNull()
  })
})

describe('formatSrt / parseSrt round-trip', () => {
  const segments = [
    { startSec: 0, endSec: 1.5, text: 'Hello world.' },
    { startSec: 2.0, endSec: 4.5, text: 'This is a test.' },
  ]

  it('formats segments into SRT cues with 1-based indices', () => {
    const srt = formatSrt(segments)
    expect(srt).toContain('1\r\n00:00:00,000 --> 00:00:01,500\r\nHello world.')
    expect(srt).toContain(
      '2\r\n00:00:02,000 --> 00:00:04,500\r\nThis is a test.',
    )
  })

  it('returns an empty string for no segments', () => {
    expect(formatSrt([])).toBe('')
  })

  it('round-trips through parseSrt', () => {
    const srt = formatSrt(segments)
    const parsed = parseSrt(srt)!
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.index).toBe(1)
    expect(parsed[0]!.startSec).toBe(0)
    expect(parsed[0]!.endSec).toBe(1.5)
    expect(parsed[0]!.text).toBe('Hello world.')
    expect(parsed[1]!.index).toBe(2)
    expect(parsed[1]!.startSec).toBe(2.0)
    expect(parsed[1]!.endSec).toBe(4.5)
    expect(parsed[1]!.text).toBe('This is a test.')
  })
})

describe('parseSrt edge cases', () => {
  it('returns null for an empty string', () => {
    expect(parseSrt('')).toBeNull()
  })

  it('returns null for text with no cues', () => {
    expect(parseSrt('just some text\n\n')).toBeNull()
  })

  it('handles missing index lines (infers from order)', () => {
    const srt =
      '00:00:00,000 --> 00:00:01,000\nFirst\n\n00:00:02,000 --> 00:00:03,000\nSecond\n'
    const parsed = parseSrt(srt)!
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.index).toBe(1)
    expect(parsed[1]!.index).toBe(2)
  })

  it('handles multi-line cue text', () => {
    const srt = '1\n00:00:00,000 --> 00:00:02,000\nLine one\nLine two\n\n'
    const parsed = parseSrt(srt)!
    expect(parsed[0]!.text).toBe('Line one\nLine two')
  })

  it('handles CRLF line endings', () => {
    const srt = '1\r\n00:00:00,000 --> 00:00:01,000\r\nHello\r\n\r\n'
    const parsed = parseSrt(srt)!
    expect(parsed[0]!.text).toBe('Hello')
  })
})
