// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Alison Jenkins <alison.juliet.jenkins@gmail.com>

// The sub-applications of Braat, as a single source of truth for the shared
// NavBar (and anywhere else that lists the tools). Order here is the order
// shown in the top bar. Keep it small — this is the cross-tool switcher.

import type { LucideIcon } from 'lucide-react'
import { BookOpen, Languages, Metronome, MicVocal } from 'lucide-react'

import { journalEnabled } from '#/lib/journal/journalEnabled'

export interface Tool {
  /** The route path; also how the NavBar decides which tool is active. */
  path: '/' | '/ipa' | '/practice' | '/journal'
  /** Short label shown in the switcher (and read out as the tool name). */
  label: string
  icon: LucideIcon
  /** Optional runtime gate; the tool is shown only when this returns true. */
  isEnabled?: () => boolean
}

export const TOOLS: readonly Tool[] = [
  { path: '/', label: 'Analyze', icon: MicVocal },
  { path: '/ipa', label: 'IPA', icon: Languages },
  { path: '/practice', label: 'Practice', icon: Metronome },
  {
    path: '/journal',
    label: 'Journal',
    icon: BookOpen,
    isEnabled: journalEnabled,
  },
]

/** The tools currently enabled, in display order. */
export function enabledTools(): readonly Tool[] {
  return TOOLS.filter((t) => t.isEnabled?.() ?? true)
}
