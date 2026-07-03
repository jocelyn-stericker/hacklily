// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Alison Jenkins <alison.juliet.jenkins@gmail.com>

import { describe, expect, it } from 'vitest'

import { formatKeys, SHORTCUTS } from './shortcuts'
import type { Shortcut } from './shortcuts'

describe('formatKeys', () => {
  it('formats macOS combos with concatenated glyphs', () => {
    expect(formatKeys('mod+o', true)).toBe('⌘O')
    expect(formatKeys('shift+arrowleft', true)).toBe('⇧←')
    expect(formatKeys('mod+comma', true)).toBe('⌘,')
    expect(formatKeys('shift+slash', true)).toBe('⇧/')
  })

  it('formats non-macOS combos with +-joined names', () => {
    expect(formatKeys('mod+o', false)).toBe('Ctrl+O')
    expect(formatKeys('shift+arrowleft', false)).toBe('Shift+←')
    expect(formatKeys('mod+e', false)).toBe('Ctrl+E')
  })

  it('formats single keys the same on both platforms', () => {
    for (const mac of [true, false]) {
      expect(formatKeys('r', mac)).toBe('R')
      expect(formatKeys('space', mac)).toBe('Space')
      expect(formatKeys('esc', mac)).toBe('Esc')
      expect(formatKeys('arrowright', mac)).toBe('→')
    }
  })
})

describe('SHORTCUTS registry', () => {
  const entries = Object.values(SHORTCUTS) as Shortcut[]

  it('has non-empty keys and labels for every entry', () => {
    for (const s of entries) {
      expect(s.keys.length).toBeGreaterThan(0)
      expect(s.label.length).toBeGreaterThan(0)
    }
  })

  // The global scope is always active alongside exactly one route scope, so a
  // key must be unique within each {global + route} active set. Different route
  // scopes may reuse a key (e.g. `space`) because they are never active together.
  it('has no key collisions within any active scope set', () => {
    for (const route of ['timeline', 'practice'] as const) {
      const active = entries.filter(
        (s) => s.scope === 'global' || s.scope === route,
      )
      const seen = new Map<string, string>()
      for (const s of active) {
        const prev = seen.get(s.keys)
        expect(
          prev,
          `key "${s.keys}" collides in ${route} scope (${prev} vs ${s.label})`,
        ).toBeUndefined()
        seen.set(s.keys, s.label)
      }
    }
  })
})
