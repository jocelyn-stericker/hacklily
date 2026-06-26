// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// File System Access wrappers for the voice journal: read/write audio files in
// a user-chosen folder. The pure helpers at the top (name generation, audio
// filtering, sorting) carry no handle I/O so they're unit-testable under jsdom
// without a real directory; the handle operations below build on them.

// --- Pure core (no handle I/O) ---

// Extensions we treat as journal-playable audio. An existing folder may hold
// files Braat didn't write, so we filter by extension rather than assuming our
// own naming. The browser still decides what it can actually decode.
const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'm4a',
  'aac',
  'ogg',
  'oga',
  'opus',
  'flac',
  'weba',
  'webm',
  'mp4',
  'aiff',
  'aif',
  'caf',
])

export function isAudioFileName(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return false
  return AUDIO_EXTENSIONS.has(name.slice(dot + 1).toLowerCase())
}

// Sortable, Windows-legal timestamp base (no `.mp3`) in the user's local time,
// so a filename reads as the wall-clock moment they recorded: e.g.
// `2026-06-26_14-30-05`.
export function journalEntryBaseName(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`
  )
}

// A unique `<timestamp>.mp3` name for `date`, avoiding any name already present
// in `existing` (case-insensitively). Two saves within the same second collide
// on the base, so the second gets a `-2` suffix, the third `-3`, and so on.
export function uniqueEntryName(
  date: Date,
  existing: Iterable<string>,
): string {
  const base = journalEntryBaseName(date)
  const taken = new Set<string>()
  for (const n of existing) taken.add(n.toLowerCase())
  let name = `${base}.mp3`
  let i = 2
  while (taken.has(name.toLowerCase())) {
    name = `${base}-${i}.mp3`
    i += 1
  }
  return name
}

export function sortEntriesByModifiedDesc<T extends { lastModified: number }>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((a, b) => b.lastModified - a.lastModified)
}

// --- Handle I/O ---

export type JournalAccess = 'granted' | 'prompt' | 'denied'

export interface JournalEntry {
  name: string
  lastModified: number
  file: File
}

function normalizeAccess(state: PermissionState | undefined): JournalAccess {
  return state === 'granted' || state === 'denied' ? state : 'prompt'
}

// Read-only permission check. Safe to call without a user gesture (e.g. on
// mount) to decide whether the folder is ready or needs reconnecting.
//
// OPFS directory handles (the iOS journal backend) have no permission model --
// they expose no queryPermission/requestPermission -- and are always accessible,
// so we report 'granted' for them. That lets the recorder and route, which gate
// on ensureAccess === 'granted', drive an OPFS journal with no special-casing.
export async function queryAccess(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<JournalAccess> {
  if (typeof handle.queryPermission !== 'function') return 'granted'
  return normalizeAccess(await handle.queryPermission({ mode }))
}

// Ensure access to the folder, prompting if necessary. The prompt path calls
// requestPermission, which the browser only honours from a user gesture, so
// call this from a click handler when re-granting.
export async function ensureAccess(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<JournalAccess> {
  const current = await queryAccess(handle, mode)
  if (current === 'granted') return 'granted'
  return normalizeAccess(await handle.requestPermission?.({ mode }))
}

// Write `bytes` as a timestamped MP3 into the folder, avoiding collisions with
// existing names. Returns the final filename (the caller uses it for an Undo).
export async function writeEntry(
  handle: FileSystemDirectoryHandle,
  bytes: Uint8Array,
  date: Date = new Date(),
): Promise<string> {
  const existing: string[] = []
  for await (const name of handle.keys()) existing.push(name)
  const name = uniqueEntryName(date, existing)
  const fileHandle = await handle.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  // No try/finally: if write rejects we leave the stream un-closed so nothing is
  // committed, rather than flushing a partial file.
  await writable.write(bytes as unknown as BufferSource)
  await writable.close()
  return name
}

// Write `bytes` into the folder under an exact filename, used by the zip
// import path: imported entries keep the name they had in the archive (so a
// re-import round-trips and a merge dedupes by name). The caller is responsible
// for collision handling. Throws if a file with `name` already exists.
export async function writeNamedEntry(
  handle: FileSystemDirectoryHandle,
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  const fileHandle = await handle.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(bytes as unknown as BufferSource)
  await writable.close()
}

export async function deleteEntry(
  handle: FileSystemDirectoryHandle,
  name: string,
): Promise<void> {
  await handle.removeEntry(name)
}

// List the folder's audio files, newest first. Ordered by file `lastModified`
// rather than name, since an existing folder won't follow our timestamp naming.
export async function listEntries(
  handle: FileSystemDirectoryHandle,
): Promise<JournalEntry[]> {
  const entries: JournalEntry[] = []
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue
    if (!isAudioFileName(entry.name)) continue
    try {
      const file = await entry.getFile()
      entries.push({ name: entry.name, lastModified: file.lastModified, file })
    } catch {
      // Skip files we can't read (removed or locked mid-iteration).
    }
  }
  return sortEntriesByModifiedDesc(entries)
}
