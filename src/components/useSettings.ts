// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useSyncExternalStore } from 'react'

import {
  subscribe,
  getSnapshot,
  DEFAULT_SETTINGS,
  updateSettings,
} from '#/lib/settings.ts'
import type { SettingsRow } from '#/lib/settings.ts'

export function useSettings(): [
  SettingsRow,
  (patch: Partial<SettingsRow>) => Promise<void>,
] {
  return [
    useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS),
    updateSettings,
  ]
}
