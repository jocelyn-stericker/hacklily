// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// SubRip (.srt) formatting and parsing for journal transcripts. Each cue is one
// VAD segment: an index, an `HH:MM:SS,mmm --> HH:MM:SS,mmm` timecode line, and
// the transcribed text. The file is UTF-8 with CRLF line endings per the spec.

import type { SpeechSegment } from '#/lib/analysis/vadSegments'

export interface SrtCue {
  /** 1-based cue index, as written in the file. */
  index: number
  /** Cue start, seconds from the start of the recording. */
  startSec: number
  /** Past the cue's last sample, seconds from the start of the recording. */
  endSec: number
  text: string
}

const CRLF = '\r\n'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function pad3(n: number): string {
  return String(n).padStart(3, '0')
}

/** Format seconds as an SRT timecode `HH:MM:SS,mmm`. */
export function formatSrtTime(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) totalSec = 0
  const ms = Math.round(totalSec * 1000)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const milli = ms % 1000
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(milli)}`
}

/** Parse an SRT timecode `HH:MM:SS,mmm` (or `HH:MM:SS.mmm`) to seconds. */
export function parseSrtTime(timecode: string): number | null {
  const m = /^(\d+):(\d{2}):(\d{2})[,.](\d{3})$/.exec(timecode.trim())
  if (!m) return null
  const [, h, mm, ss, ms] = m
  return Number(h!) * 3600 + Number(mm!) * 60 + Number(ss!) + Number(ms!) / 1000
}

/**
 * Build SRT cue text from speech segments and their transcribed text. Segments
 * with empty text are kept (they mark a pause the VAD caught); a recording with
 * no speech yields an empty string.
 */
export function formatSrt(
  segments: ReadonlyArray<SpeechSegment & { text: string }>,
): string {
  if (segments.length === 0) return ''
  const parts: string[] = []
  segments.forEach((seg, i) => {
    parts.push(String(i + 1))
    parts.push(
      `${formatSrtTime(seg.startSec)} --> ${formatSrtTime(seg.endSec)}`,
    )
    parts.push(seg.text)
    parts.push('')
  })
  return parts.join(CRLF)
}

const TIMECODE_LINE =
  /^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})$/

/**
 * Parse an SRT file into cues. Tolerant of missing indices, extra blank lines,
 * and LF or CRLF endings. Returns `null` if the file has no recognizable cues.
 */
export function parseSrt(text: string): SrtCue[] | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const cues: SrtCue[] = []
  let i = 0
  let index = 0
  while (i < lines.length) {
    // Skip blank lines between cues.
    while (i < lines.length && lines[i]!.trim() === '') i++
    if (i >= lines.length) break
    // Optional index line; if present, skip it. Otherwise infer from order.
    const first = lines[i]!.trim()
    const timecodeMatch = TIMECODE_LINE.exec(first)
    if (!timecodeMatch) {
      // Not a timecode -- treat as an index and move to the next line.
      i++
      continue
    }
    const startSec = parseSrtTime(timecodeMatch[1]!)
    const endSec = parseSrtTime(timecodeMatch[2]!)
    if (startSec === null || endSec === null) {
      i++
      continue
    }
    i++
    const textLines: string[] = []
    while (i < lines.length && lines[i] !== '' && lines[i] !== undefined) {
      textLines.push(lines[i]!)
      i++
    }
    index += 1
    cues.push({ index, startSec, endSec, text: textLines.join('\n') })
  }
  return cues.length > 0 ? cues : null
}

/** Serialize cues back to SRT text (CRLF, 1-based indices). */
export function cuesToSrt(cues: ReadonlyArray<SrtCue>): string {
  if (cues.length === 0) return ''
  const parts: string[] = []
  cues.forEach((cue, i) => {
    parts.push(String(i + 1))
    parts.push(
      `${formatSrtTime(cue.startSec)} --> ${formatSrtTime(cue.endSec)}`,
    )
    parts.push(cue.text)
    parts.push('')
  })
  return parts.join(CRLF)
}

/** Derive the sidecar SRT filename for an audio entry: `foo.mp3` -> `foo.srt`. */
export function srtNameFor(audioName: string): string {
  const dot = audioName.lastIndexOf('.')
  const base = dot < 0 ? audioName : audioName.slice(0, dot)
  return `${base}.srt`
}
