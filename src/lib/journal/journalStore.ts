// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Small IndexedDB store for the voice journal. It holds three things, each in
// its own object store of the single `braat-journal` database:
//
//   - handles:   the chosen FSA folder handle. A FileSystemDirectoryHandle is
//                structured-cloneable, so it survives here (localStorage can't
//                hold it). Permission to the folder does NOT persist with it:
//                after a reload `queryPermission` usually returns 'prompt' and
//                must be re-granted from a user gesture (see journalFs).
//   - durations: entry filename -> exact take length in seconds, recorded when
//                we write a recording (the encoder doesn't store this cheaply).
//                Powers the "minutes since last export" summary without decoding
//                every file.
//   - meta:      misc scalars, currently just the last-export timestamp.

const DB_NAME = 'braat-journal'
const DB_VERSION = 2
const STORE_HANDLES = 'handles'
const STORE_DURATIONS = 'durations'
const STORE_META = 'meta'
const HANDLE_KEY = 'folder'
const LAST_EXPORT_KEY = 'lastExportAt'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      // Create any store that doesn't exist yet -- runs for both fresh installs
      // and the v1 -> v2 upgrade (which only had `handles`).
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES)
      }
      if (!db.objectStoreNames.contains(STORE_DURATIONS)) {
        db.createObjectStore(STORE_DURATIONS)
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode)
      const request = fn(tx.objectStore(storeName))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

// --- Folder handle (FSA) ---

export async function saveJournalHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await withStore(STORE_HANDLES, 'readwrite', (store) =>
    store.put(handle, HANDLE_KEY),
  )
}

export async function loadJournalHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await withStore<FileSystemDirectoryHandle | undefined>(
      STORE_HANDLES,
      'readonly',
      (store) => store.get(HANDLE_KEY),
    )
    return handle ?? null
  } catch {
    return null
  }
}

export async function clearJournalHandle(): Promise<void> {
  await withStore(STORE_HANDLES, 'readwrite', (store) =>
    store.delete(HANDLE_KEY),
  )
}

// --- Entry durations ---
// All best-effort: duration metadata is a convenience, never load-bearing, so a
// failure (e.g. private-mode IndexedDB) is swallowed rather than surfaced.

export async function recordEntryDuration(
  name: string,
  durationSec: number,
): Promise<void> {
  try {
    await withStore(STORE_DURATIONS, 'readwrite', (store) =>
      store.put(durationSec, name),
    )
  } catch {
    // Non-critical; the summary just under-counts this entry.
  }
}

export async function deleteEntryDuration(name: string): Promise<void> {
  try {
    await withStore(STORE_DURATIONS, 'readwrite', (store) => store.delete(name))
  } catch {
    // Non-critical; a stale row is harmless (summaries intersect with reality).
  }
}

// Map of entry name -> duration seconds for every recording we've measured.
export async function loadEntryDurations(): Promise<Map<string, number>> {
  try {
    const db = await openDb()
    try {
      return await new Promise<Map<string, number>>((resolve, reject) => {
        const tx = db.transaction(STORE_DURATIONS, 'readonly')
        const store = tx.objectStore(STORE_DURATIONS)
        const keysReq = store.getAllKeys()
        const valsReq = store.getAll()
        tx.oncomplete = () => {
          const map = new Map<string, number>()
          // We only ever write string keys (entry names) and number values.
          const keys = keysReq.result as string[]
          const vals = valsReq.result as number[]
          keys.forEach((k, i) => {
            const v = vals[i]
            if (typeof v === 'number') map.set(k, v)
          })
          resolve(map)
        }
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  } catch {
    return new Map()
  }
}

// --- Last-export timestamp (epoch ms) ---

export async function getLastExportAt(): Promise<number | null> {
  try {
    const value = await withStore<number | undefined>(
      STORE_META,
      'readonly',
      (store) => store.get(LAST_EXPORT_KEY),
    )
    return value ?? null
  } catch {
    return null
  }
}

export async function setLastExportAt(timestampMs: number): Promise<void> {
  try {
    await withStore(STORE_META, 'readwrite', (store) =>
      store.put(timestampMs, LAST_EXPORT_KEY),
    )
  } catch {
    // Non-critical; the next summary just keeps counting from the old mark.
  }
}
