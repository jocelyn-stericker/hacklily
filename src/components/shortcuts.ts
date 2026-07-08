// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Alison Jenkins <alison.juliet.jenkins@gmail.com>

// Central registry for keyboard shortcuts. This is the single source of truth
// for the key strings, human labels, and scoping used across the app. Handlers
// and `enabled` conditions stay in the components (they close over component
// state); only the static metadata lives here so that `useHotkeys` bindings, the
// Toolbar hints, and the help modal never drift apart.

import { useEffect } from 'react'
import { useHotkeysContext } from 'react-hotkeys-hook'

// A scope maps to the route (or the always-on root) that registers the binding.
// react-hotkeys-hook only fires a scoped hotkey while its scope is active, which
// is what lets `space` mean different things on the timeline vs. practice route.
export type ShortcutScope = 'global' | 'timeline' | 'practice'

export interface Shortcut {
  /** react-hotkeys-hook key string, e.g. `mod+o`, `shift+arrowleft`. */
  keys: string
  /** Human-readable action, shown in the help modal and tooltips. */
  label: string
  /** Scope the binding belongs to; also the route that must be mounted. */
  scope: ShortcutScope
  /** Display grouping in the help modal. */
  group: string
}

export const SHORTCUTS = {
  // --- Timeline route (spectrogram / recording) ---
  playPause: {
    keys: 'space',
    label: 'Play / pause',
    scope: 'timeline',
    group: 'Playback',
  },
  jumpStart: {
    keys: 'shift+arrowleft',
    label: 'Back to start',
    scope: 'timeline',
    group: 'Playback',
  },
  jumpEnd: {
    keys: 'shift+arrowright',
    label: 'Jump to end',
    scope: 'timeline',
    group: 'Playback',
  },
  jumpBack: {
    keys: 'arrowleft',
    label: 'Back 0.5s',
    scope: 'timeline',
    group: 'Playback',
  },
  jumpForward: {
    keys: 'arrowright',
    label: 'Forward 0.5s',
    scope: 'timeline',
    group: 'Playback',
  },
  record: {
    keys: 'r',
    label: 'Record from microphone',
    scope: 'timeline',
    group: 'Recording',
  },
  upgradeTranscripts: {
    keys: 't',
    label: 'Upgrade all visible transcripts',
    scope: 'timeline',
    group: 'Transcription',
  },
  vowelChartBigger: {
    keys: 'equal, w',
    label: 'Enlarge vowel chart',
    scope: 'timeline',
    group: 'View',
  },
  vowelChartSmaller: {
    keys: 'minus, s',
    label: 'Shrink vowel chart',
    scope: 'timeline',
    group: 'View',
  },
  toggleFormantsWithoutSpeech: {
    keys: 's',
    label: 'Show unvoiced formants',
    scope: 'timeline',
    group: 'View',
  },
  newSession: {
    keys: 'n',
    label: 'New session',
    scope: 'timeline',
    group: 'File',
  },
  openFile: {
    keys: 'mod+o',
    label: 'Open audio file',
    scope: 'timeline',
    group: 'File',
  },
  exportAudio: {
    keys: 'mod+e',
    label: 'Export mono MP3',
    scope: 'timeline',
    group: 'File',
  },
  saveToJournal: {
    keys: 'mod+s',
    label: 'Save to voice journal',
    scope: 'timeline',
    group: 'File',
  },
  audioSettings: {
    keys: 'mod+comma',
    label: 'Audio settings',
    scope: 'timeline',
    group: 'File',
  },

  // --- Practice route ---
  practiceAdvance: {
    keys: 'space',
    label: 'Start / next take / end',
    scope: 'practice',
    group: 'Practice',
  },
  practiceEnd: {
    keys: 'esc',
    label: 'End session',
    scope: 'practice',
    group: 'Practice',
  },
  practicePrev: {
    keys: 'arrowleft',
    label: 'Previous sentence',
    scope: 'practice',
    group: 'Practice',
  },
  practiceNext: {
    keys: 'arrowright',
    label: 'Next sentence',
    scope: 'practice',
    group: 'Practice',
  },
  practiceReplayRef: {
    keys: 'f',
    label: 'Replay reference',
    scope: 'practice',
    group: 'Practice',
  },

  // --- Global (always active) ---
  help: {
    keys: 'shift+slash',
    label: 'Keyboard shortcuts',
    scope: 'global',
    group: 'General',
  },
} as const satisfies Record<string, Shortcut>

export type ShortcutId = keyof typeof SHORTCUTS

/**
 * Mouse-gesture hints. Not bound via useHotkeys (they're pointer interactions),
 * but surfaced in the help modal so the Ctrl/Cmd-click affordances are
 * discoverable alongside the keyboard shortcuts.
 */
export interface PointerHint {
  /** Modifier that must be held while clicking. */
  modifier: 'mod'
  label: string
  scope: ShortcutScope
  group: string
}

export const POINTER_HINTS: readonly PointerHint[] = [
  {
    modifier: 'mod',
    label: 'Play reference, then record a take',
    scope: 'practice',
    group: 'Mouse',
  },
]

const isMacPlatform = (): boolean =>
  typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac')

// Display names for non-modifier key tokens. Anything not listed is upper-cased
// (single letters) or title-cased as-is.
const KEY_LABELS: Record<string, string> = {
  arrowleft: '←',
  arrowright: '→',
  arrowup: '↑',
  arrowdown: '↓',
  comma: ',',
  period: '.',
  slash: '/',
  space: 'Space',
  esc: 'Esc',
  escape: 'Esc',
  enter: 'Enter',
  backspace: '⌫',
  equal: '+',
  minus: '-',
}

function labelForToken(token: string, isMac: boolean): string {
  switch (token) {
    case 'mod':
      return isMac ? '⌘' : 'Ctrl'
    case 'ctrl':
    case 'control':
      return isMac ? '⌃' : 'Ctrl'
    case 'shift':
      return isMac ? '⇧' : 'Shift'
    case 'alt':
    case 'option':
      return isMac ? '⌥' : 'Alt'
    case 'meta':
      return isMac ? '⌘' : 'Win'
  }
  const known = KEY_LABELS[token]
  if (known !== undefined) return known
  if (token.length <= 1) return token.toUpperCase()
  return token.charAt(0).toUpperCase() + token.slice(1)
}

/**
 * Format a react-hotkeys-hook key string for display depending on platform.
 */
export function formatKeys(
  keys: string,
  isMac: boolean = isMacPlatform(),
): string {
  // A `,` separates interchangeable keys (react-hotkeys-hook syntax), a `+`
  // separates keys in one combo. Render alternatives as "X / Y".
  return keys
    .split(',')
    .map((combo) => {
      const parts = combo
        .split('+')
        .map((t) => labelForToken(t.trim().toLowerCase(), isMac))
      return isMac ? parts.join('') : parts.join('+')
    })
    .join(' / ')
}

/**
 * A shortcut's registry label e.g. `Record from microphone (R)`.
 *
 * Use this, don't hardcode strings in the UI.
 */
export function shortcutTitle(id: ShortcutId): string {
  const s = SHORTCUTS[id]
  return `${s.label} (${formatKeys(s.keys)})`
}

/**
 * Activate a hotkey scope while mounted.
 */
export function useActiveScope(scope: ShortcutScope): void {
  const { enableScope, disableScope } = useHotkeysContext()
  useEffect(() => {
    enableScope(scope)
    return () => disableScope(scope)
  }, [scope, enableScope, disableScope])
}
