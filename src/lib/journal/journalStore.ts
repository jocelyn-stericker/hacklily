// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Persists the chosen voice-journal folder handle across reloads and tabs.
//
// A FileSystemDirectoryHandle is structured-cloneable, so it survives in
// IndexedDB (localStorage can't hold it). Permission to the folder does NOT
// persist with it: after a reload `queryPermission` usually returns 'prompt'
// and must be re-granted from a user gesture (see journalFs.ensureAccess).
//
// This is the only IndexedDB use in the app, so it's deliberately tiny: one
// database, one object store, one record under a fixed key.

const DB_NAME = 'braat-journal'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'folder'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const request = fn(tx.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function saveJournalHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await withStore('readwrite', (store) => store.put(handle, HANDLE_KEY))
}

export async function loadJournalHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await withStore<FileSystemDirectoryHandle | undefined>(
      'readonly',
      (store) => store.get(HANDLE_KEY),
    )
    return handle ?? null
  } catch {
    return null
  }
}

export async function clearJournalHandle(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(HANDLE_KEY))
}
