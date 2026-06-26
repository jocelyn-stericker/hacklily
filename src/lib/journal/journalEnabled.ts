// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// The voice journal is gated behind a hardcoded localStorage flag while it's in
// development. Set `localStorage.ENABLE_JOURNAL = 1` in the console to turn it
// on. The flag gates the menu items, the WelcomeModal link, and the /journal
// route (which redirects to / without it).

export function journalEnabled(): boolean {
  try {
    return localStorage.getItem('ENABLE_JOURNAL') === '1'
  } catch {
    // localStorage can throw in some privacy modes / sandboxed contexts.
    return false
  }
}
