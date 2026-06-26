// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Resolves where the voice journal stores its files. Two backends share the
// same FileSystemDirectoryHandle API, so the rest of the journal (journalFs,
// the recorder, the route) stays backend-agnostic:
//
//   - 'fsa':  a user-chosen folder via the File System Access API (Chromium).
//             Durable by nature -- a real OS folder the user owns and can see.
//   - 'opfs': the Origin Private File System, used where FSA is absent (iOS, and
//             desktop Firefox/Safari if the user opts in). App-private, and only
//             durable when the browser has granted persistent storage; on iOS
//             that additionally requires running as an installed Home Screen
//             app. This backend carries a `persisted` flag; the UI blocks saving
//             when it is false, since otherwise the data could be evicted.

import {
  isIos,
  isStandalone,
  supportsFileSystemAccess,
  supportsOpfs,
} from '#/lib/browserFeatures'
import { loadJournalHandle } from '#/lib/journal/journalStore'

// Subdirectory of the OPFS root that holds journal entries, so other future
// OPFS uses don't collide with (or get swept up in) the journal.
const OPFS_JOURNAL_DIR = 'journal'

// localStorage flag set when a desktop user explicitly chooses the OPFS journal
// over switching to a Chromium browser. On iOS, installing to the Home Screen is
// the opt-in instead, so this flag isn't consulted there.
const OPFS_OPT_IN_KEY = 'braat-journal-opfs'

export type JournalBackendKind = 'fsa' | 'opfs'

export interface JournalBackend {
  kind: JournalBackendKind
  handle: FileSystemDirectoryHandle
  // FSA folders are always durable, so this is true for them. For OPFS it
  // reflects the live persistent-storage state; callers must not save when it
  // is false.
  persisted: boolean
}

// Which backend this platform can use, or null if neither is available (the
// journal can't run here at all). FSA wins when present -- it gives real,
// user-visible files -- and OPFS is the fallback everywhere else it exists.
export function journalBackendKind(): JournalBackendKind | null {
  if (supportsFileSystemAccess()) return 'fsa'
  if (supportsOpfs()) return 'opfs'
  return null
}

function hasOptedIntoOpfs(): boolean {
  try {
    return localStorage.getItem(OPFS_OPT_IN_KEY) === '1'
  } catch {
    return false
  }
}

function setOptedIntoOpfs(): void {
  try {
    localStorage.setItem(OPFS_OPT_IN_KEY, '1')
  } catch {
    // Private modes can throw; the worst case is re-showing the prompt later.
  }
}

// Get (creating if needed) the OPFS journal directory handle.
export async function getOpfsJournalDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(OPFS_JOURNAL_DIR, { create: true })
}

// Whether script-writable storage is currently persistent (i.e. exempt from
// WebKit's 7-day eviction). Never throws.
export async function isPersisted(): Promise<boolean> {
  try {
    // `storage` and `persisted` are typed as always present but can be absent in
    // older/edge browsers, so the optional chains are deliberate runtime guards.
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    return (await navigator.storage?.persisted?.()) === true
  } catch {
    return false
  }
}

// Request persistent storage. On WebKit this is granted by heuristic -- chiefly,
// whether the page is running as an installed Home Screen app -- with no prompt.
// Returns the resulting state. Never throws.
export async function requestPersistence(): Promise<boolean> {
  try {
    if (await isPersisted()) return true
    // Deliberate runtime guard (see isPersisted).
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    return (await navigator.storage?.persist?.()) === true
  } catch {
    return false
  }
}

// Set up the OPFS journal on a desktop browser that lacks FSA, after the user
// chooses to continue here instead of switching to Chromium. Records the opt-in
// so later visits resolve straight to the journal, then requests persistence.
//
// Acquires the directory first and only records the opt-in once that succeeds:
// getDirectory() can throw even though the API is present (e.g. a Firefox
// private window throws SecurityError), and we don't want to persist an opt-in
// that would make every later load fail. The throw propagates to the caller.
export async function setupOpfsJournal(): Promise<JournalBackend> {
  const handle = await getOpfsJournalDir()
  setOptedIntoOpfs()
  const persisted = await requestPersistence()
  return { kind: 'opfs', handle, persisted }
}

// Resolve the journal's backend without any user gesture, for deciding whether
// the UI shows "Save"/entries vs. setup guidance. Returns null when the journal
// isn't set up yet on this platform:
//   - FSA:  no folder has been chosen.
//   - OPFS on iOS: not running as an installed Home Screen app (a plain Safari
//           tab can't keep data safely, so the UI prompts to Add to Home Screen).
//   - OPFS on desktop: the user hasn't opted in over switching to Chromium.
// When it does return an OPFS backend we still include it even if
// `persisted` is false, so the route can list/play/export existing entries;
// `persisted` then gates saving.
export async function loadJournalBackend(): Promise<JournalBackend | null> {
  const kind = journalBackendKind()
  if (kind === 'fsa') {
    const handle = await loadJournalHandle()
    return handle ? { kind, handle, persisted: true } : null
  }
  if (kind === 'opfs') {
    // iOS needs an installed Home Screen app for durable storage; desktop needs
    // an explicit opt-in (we steer to Chromium first).
    if (isIos() ? !isStandalone() : !hasOptedIntoOpfs()) return null
    try {
      // iOS: re-ask on load -- promptless on WebKit, so this just re-acquires
      // persistence for the installed app. Desktop: only observe. The request
      // already happened at opt-in (setupOpfsJournal) and the warning banner's
      // button can retry, so we don't silently re-grant here -- otherwise a
      // revoked permission (e.g. Firefox) would be masked on every reload.
      const persisted = isIos()
        ? await requestPersistence()
        : await isPersisted()
      const handle = await getOpfsJournalDir()
      return { kind, handle, persisted }
    } catch {
      // getDirectory() can throw where OPFS is unavailable despite the API being
      // present (e.g. private browsing). Treat as not-set-up so the UI falls
      // back to setup guidance instead of hanging on a rejected promise.
      return null
    }
  }
  return null
}

// What to tell the user when there's no usable backend yet (loadJournalBackend
// returned null). Synchronous -- it only inspects platform capabilities:
//   - 'choose-folder': FSA is available but no folder has been picked.
//   - 'add-to-home':   iOS, but not yet an installed Home Screen app.
//   - 'use-chromium':  desktop without FSA -- recommend Chromium, but the user
//                      can continue with the OPFS store + manual export.
//   - 'unsupported':   no usable storage at all (very old browser).
export type JournalSetupGuidance =
  | 'choose-folder'
  | 'add-to-home'
  | 'use-chromium'
  | 'unsupported'

export function journalSetupGuidance(): JournalSetupGuidance {
  const kind = journalBackendKind()
  if (kind === 'fsa') return 'choose-folder'
  if (kind === 'opfs') return isIos() ? 'add-to-home' : 'use-chromium'
  return 'unsupported'
}
