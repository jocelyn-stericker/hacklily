// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Zip export and import for the OPFS voice journal. The OPFS store is
// app-private -- nothing else on the device can see it -- so a user who keeps
// their journal there has no other way to back up, move, or recover recordings
// except through Braat. This module builds a zip of every entry and merges an
// imported zip back in, deduping by filename. Durations are not carried in the
// archive; they are re-measured on import by decoding each file.
//
// MP3s are already compressed, so we store them uncompressed (level 0) -- the
// zip is just a container, and level 0 avoids a pointless deflate pass.

import { unzip, zip } from 'fflate'

import { isAudioFileName, writeNamedEntry } from './journalFs'
import type { JournalEntry } from './journalFs'
import { srtNameFor } from './journalSrt'
import { deleteEntryDuration, recordEntryDuration } from './journalStore'

// --- Summary ---
// Count entries newer than the last export, and sum their durations. Pure so it
// can be unit-tested without a real directory. `durations` may be sparse (a
// duration is only recorded when Braat wrote the take; an imported or external
// file won't have one), so entries without a duration contribute to the count
// but not to the seconds total.

export interface ExportSummary {
  count: number
  seconds: number
}

export function summarizeSinceExport(
  entries: readonly { name: string; lastModified: number }[],
  durations: Map<string, number>,
  lastExportAt: number | null,
): ExportSummary {
  let count = 0
  let seconds = 0
  for (const entry of entries) {
    if (lastExportAt !== null && entry.lastModified <= lastExportAt) continue
    count += 1
    const dur = durations.get(entry.name)
    if (typeof dur === 'number') seconds += dur
  }
  return { count, seconds }
}

// --- Export ---

// Build a zip of every entry. Returns the archive as a Blob ready to hand to
// the browser's download machinery. SRT sidecar transcripts (if present in the
// folder) are included so a backup round-trips them.
export async function buildJournalZip(
  entries: readonly JournalEntry[],
  handle: FileSystemDirectoryHandle,
): Promise<Blob> {
  // Each entry is already loaded as a File (listEntries reads them); pull the
  // bytes into memory before handing the lot to fflate. A single zip holds
  // everything, which is fine for the journal's typical size (tens of MB).
  const files: Record<string, Uint8Array> = {}
  for (const entry of entries) {
    files[entry.name] = new Uint8Array(await entry.file.arrayBuffer())
    // Include the SRT sidecar if one exists.
    const srtName = srtNameFor(entry.name)
    try {
      const srtFile = await (await handle.getFileHandle(srtName)).getFile()
      files[srtName] = new Uint8Array(await srtFile.arrayBuffer())
    } catch {
      // No sidecar, fine.
    }
  }

  // level 0: store, since MP3s are already compressed.
  const data = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (err, out) => {
      if (err) reject(err)
      else resolve(out)
    })
  })
  return new Blob([data as BlobPart], { type: 'application/zip' })
}

// --- Import ---
// Merge a zip into an existing journal directory. Files in the archive whose
// name already exists on disk are skipped (dedupe by filename), so a re-import
// of the same backup is a no-op rather than a duplicate-everything operation.
// Each imported entry is decoded to measure its duration. Returns how many
// files were written and how many were skipped.

// Decode `bytes` as audio to measure its duration in seconds. Best-effort:
// returns null on a decode failure (corrupt file, unsupported codec, private
// mode blocking AudioContext creation, etc.) so callers can fall back to no
// duration rather than surfacing an error. A throwaway AudioContext is created
// per call; import and backfill are rare, user-initiated batch ops, so the
// construction cost is acceptable, and creating per-file avoids holding one
// open across awaits.
export async function measureAudioDuration(
  bytes: Uint8Array,
): Promise<number | null> {
  let ctx: AudioContext | null = null
  try {
    ctx = new AudioContext()
    const buffer = await ctx.decodeAudioData(bytes.slice().buffer)
    return buffer.duration
  } catch {
    return null
  } finally {
    ctx?.close().catch(() => {})
  }
}

export interface ImportResult {
  imported: number
  skipped: number
}

export async function importJournalZip(
  handle: FileSystemDirectoryHandle,
  file: File,
  onProgress?: (name: string) => void,
): Promise<ImportResult> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const unzipped = await new Promise<Record<string, Uint8Array>>(
    (resolve, reject) => {
      unzip(buf, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    },
  )

  // Names already present on disk, so we skip rather than overwrite.
  const existing = new Set<string>()
  for await (const name of handle.keys()) existing.add(name)

  let imported = 0
  let skipped = 0
  for (const [name, bytes] of Object.entries(unzipped)) {
    // Skip directory entries (fflate represents them as empty Uint8Arrays with
    // a trailing slash).
    if (name.endsWith('/')) continue
    // SRT sidecar transcripts: write alongside the audio if the audio is
    // present (in this zip or already on disk).
    if (name.toLowerCase().endsWith('.srt')) {
      // Write the sidecar only if its audio is present (in this zip or already
      // on disk). Match by sidecar name (`foo.mp3` -> `foo.srt`) rather than a
      // bare extension strip: the audio keeps its extension, so stripping
      // `.srt` to `foo` would never match `foo.mp3`.
      const hasAudio =
        Object.keys(unzipped).some(
          (n) => isAudioFileName(n) && srtNameFor(n) === name,
        ) ||
        [...existing].some((n) => isAudioFileName(n) && srtNameFor(n) === name)
      if (!hasAudio || existing.has(name)) continue
      await writeNamedEntry(handle, name, bytes)
      continue
    }
    if (!isAudioFileName(name)) continue
    if (existing.has(name)) {
      skipped += 1
      continue
    }
    await writeNamedEntry(handle, name, bytes)
    // Decode the file so the summary and list can show it. If decoding fails,
    // clear any stale value from a prior import so the summary doesn't lie.
    const measured = await measureAudioDuration(bytes)
    if (measured !== null) void recordEntryDuration(name, measured)
    else void deleteEntryDuration(name)
    imported += 1
    onProgress?.(name)
  }

  return { imported, skipped }
}

// Merge a folder of audio files (chosen via an `<input webkitdirectory>` FileList)
// into the journal directory. Files already present on disk are skipped (dedupe
// by filename), matching the zip import. Each imported file is decoded to
// measure its duration, so the summary and list can show it; entries that fail
// to decode get no duration row and are under-counted in the summary, same as
// any un-decodable file. Only the basename of each file is used, so a nested
// backup folder imports flat.
export async function importJournalFolder(
  handle: FileSystemDirectoryHandle,
  files: FileList | File[],
  onProgress?: (name: string) => void,
): Promise<ImportResult> {
  // Names already present on disk, so we skip rather than overwrite.
  const existing = new Set<string>()
  for await (const name of handle.keys()) existing.add(name)

  let imported = 0
  let skipped = 0
  for (const file of files) {
    // webkitdirectory includes directory entries as 0-byte files; skip those.
    if (file.size === 0 && !isAudioFileName(file.name)) continue
    if (!isAudioFileName(file.name)) continue
    if (existing.has(file.name)) {
      skipped += 1
      continue
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    await writeNamedEntry(handle, file.name, bytes)
    // Decode to measure the duration. If decoding fails, clear any stale
    // duration so the summary doesn't carry a value from a different source.
    const measured = await measureAudioDuration(bytes)
    if (measured !== null) void recordEntryDuration(file.name, measured)
    else void deleteEntryDuration(file.name)
    imported += 1
    onProgress?.(file.name)
  }

  return { imported, skipped }
}
