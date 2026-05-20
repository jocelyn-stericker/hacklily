/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { useSyncExternalStore } from 'react'

export type SampleRatePref = 'auto' | 'prefer48000' | 'prefer44100'
export type BrowserPreprocessing = 'default' | 'minimal'

export type AudioSettingsRow = {
  inputDeviceId: string | null
  sampleRate: SampleRatePref
  persistentMic: boolean
  browserPreprocessing: BrowserPreprocessing
}

export const DEFAULT_SETTINGS: AudioSettingsRow = {
  inputDeviceId: null,
  sampleRate: 'auto',
  persistentMic: false,
  browserPreprocessing: 'default',
}

const STORAGE_KEY = 'braat:settings'
const listeners = new Set<() => void>()
let cache: AudioSettingsRow | null = null

function readFromStorage(): AudioSettingsRow {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

function getSnapshot(): AudioSettingsRow {
  cache ??= readFromStorage()
  return cache
}

function invalidate(): void {
  cache = readFromStorage()
  for (const fn of listeners) fn()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) invalidate()
  })
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

export function useSettings(): AudioSettingsRow {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS)
}

export async function updateSettings(
  patch: Partial<AudioSettingsRow>,
): Promise<void> {
  const updated: AudioSettingsRow = { ...getSnapshot(), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  invalidate()
}

/** Build MediaStreamConstraints from settings */
export function buildAudioConstraints(
  settings: AudioSettingsRow,
): MediaTrackConstraints {
  const minimal = settings.browserPreprocessing === 'minimal'
  const constraints: MediaTrackConstraints = {
    echoCancellation: minimal ? false : undefined,
    noiseSuppression: minimal ? false : undefined,
    autoGainControl: minimal ? false : undefined,
  }
  if (settings.inputDeviceId) {
    constraints.deviceId = { exact: settings.inputDeviceId }
  }
  if (settings.sampleRate !== 'auto') {
    constraints.sampleRate = {
      ideal: settings.sampleRate === 'prefer48000' ? 48000 : 44100,
    }
  }
  return constraints
}

/** Preferred AudioContext sampleRate from settings (undefined = let browser decide) */
export function preferredSampleRate(
  settings: AudioSettingsRow,
): number | undefined {
  if (settings.sampleRate === 'prefer48000') return 48000
  if (settings.sampleRate === 'prefer44100') return 44100
  return undefined
}
