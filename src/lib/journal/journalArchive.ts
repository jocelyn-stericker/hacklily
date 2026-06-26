// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Zip export and import for the OPFS voice journal. The OPFS store is
// app-private -- nothing else on the device can see it -- so a user who keeps
// their journal there has no other way to back up, move, or recover recordings
// except through Braat. This module builds a zip of every entry (with a small
// manifest that round-trips the per-entry durations) and merges an imported zip
// back in, deduping by filename.
//
// MP3s are already compressed, so we store them uncompressed (level 0) -- the
// zip is just a container, and level 0 avoids a pointless deflate pass.

import { unzip, zip } from 'fflate'

import { isAudioFileName, writeNamedEntry } from './journalFs'
import type { JournalEntry } from './journalFs'
import { deleteEntryDuration, recordEntryDuration } from './journalStore'

// --- Manifest ---
// A tiny JSON file embedded in the zip so a re-import restores the durations
// (and so a future import path could validate the archive without reading
// every MP3). The version is a guard, not a feature flag: an unknown version is
// rejected rather than guessed at.

const MANIFEST_NAME = 'braat-journal.json'

interface JournalManifest {
  version: 1
  // entry filename -> exact take length in seconds. Missing entries get no
  // duration restored on import, so the summary under-counts only those.
  durations: Record<string, number>
}

function buildManifest(durations: Map<string, number>): JournalManifest {
  const out: Record<string, number> = {}
  for (const [name, sec] of durations) out[name] = sec
  return { version: 1, durations: out }
}

// Parse a manifest from raw zip bytes, or null if it's absent or malformed.
// `level 0` storage means the manifest JSON is uncompressed inside the zip; we
// still go through unzip rather than fishing for it ourselves, so compression
// doesn't matter.
export function parseManifest(data: Uint8Array): JournalManifest | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(data))
  } catch {
    return null
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    typeof (parsed as { version?: unknown }).version !== 'number' ||
    (parsed as { version?: unknown }).version !== 1
  ) {
    return null
  }
  const durations = (parsed as { durations?: unknown }).durations
  if (durations === null || typeof durations !== 'object') return null
  const clean: Record<string, number> = {}
  for (const [k, v] of Object.entries(durations as Record<string, unknown>)) {
    if (typeof v === 'number') clean[k] = v
  }
  return { version: 1, durations: clean }
}

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

// Build a zip of every entry plus the manifest. Returns the archive as a Blob
// ready to hand to the browser's download machinery. `durations` is the full
// map (not filtered to `entries`); the manifest carries whatever we have, so an
// import into a fresh store restores everything even for entries that no longer
// exist on disk here.
export async function buildJournalZip(
  entries: readonly JournalEntry[],
  durations: Map<string, number>,
): Promise<Blob> {
  // Each entry is already loaded as a File (listEntries reads them); pull the
  // bytes into memory before handing the lot to fflate. A single zip holds
  // everything, which is fine for the journal's typical size (tens of MB).
  const files: Record<string, Uint8Array> = {}
  const manifest = buildManifest(durations)
  files[MANIFEST_NAME] = new TextEncoder().encode(JSON.stringify(manifest))
  for (const entry of entries) {
    files[entry.name] = new Uint8Array(await entry.file.arrayBuffer())
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
// Durations from the manifest are restored for every imported entry. Returns
// how many files were written and how many were skipped.

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

  const manifestBytes = unzipped[MANIFEST_NAME]
  const manifest = manifestBytes ? parseManifest(manifestBytes) : null

  // Names already present on disk, so we skip rather than overwrite.
  const existing = new Set<string>()
  for await (const name of handle.keys()) existing.add(name)

  let imported = 0
  let skipped = 0
  for (const [name, bytes] of Object.entries(unzipped)) {
    // Skip directory entries (fflate represents them as empty Uint8Arrays with
    // a trailing slash) and our own manifest.
    if (name.endsWith('/')) continue
    if (name === MANIFEST_NAME) continue
    if (!isAudioFileName(name)) continue
    if (existing.has(name)) {
      skipped += 1
      continue
    }
    await writeNamedEntry(handle, name, bytes)
    const dur = manifest?.durations[name]
    if (typeof dur === 'number') {
      void recordEntryDuration(name, dur)
    } else {
      // No duration for this entry in the archive; clear any stale value from a
      // prior import of a different archive so the summary doesn't lie.
      void deleteEntryDuration(name)
    }
    imported += 1
    onProgress?.(name)
  }

  return { imported, skipped }
}

// Merge a folder of audio files (chosen via an `<input webkitdirectory>` FileList)
// into the journal directory. Files already present on disk are skipped (dedupe
// by filename), matching the zip import. Durations can't be recovered from bare
// audio files, so imported entries get no duration row — the summary under-
// counts them, same as for any external file added to an FSA folder. Only the
// basename of each file is used, so a nested backup folder imports flat.
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
    // No manifest for a folder import; clear any stale duration so the summary
    // doesn't carry a value from a different source.
    void deleteEntryDuration(file.name)
    imported += 1
    onProgress?.(file.name)
  }

  return { imported, skipped }
}
