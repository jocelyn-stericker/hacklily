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

import {
  createCollection,
  createTransaction,
  localStorageCollectionOptions,
} from '@tanstack/db'

export type SampleRatePref = 'auto' | 'prefer48000' | 'prefer44100'
export type BrowserPreprocessing = 'default' | 'minimal'

export type AudioSettingsRow = {
  id: 'audioSettings'
  inputDeviceId: string | null
  sampleRate: SampleRatePref
  persistentMic: boolean
  browserPreprocessing: BrowserPreprocessing
}

export const DEFAULT_SETTINGS: AudioSettingsRow = {
  id: 'audioSettings',
  inputDeviceId: null,
  sampleRate: 'auto',
  persistentMic: false,
  browserPreprocessing: 'default',
}

export const settingsCollection = createCollection(
  localStorageCollectionOptions<AudioSettingsRow, AudioSettingsRow['id']>({
    storageKey: 'braat:settings',
    getKey: (row) => row.id,
  }),
)

export async function updateSettings(
  patch: Partial<Omit<AudioSettingsRow, 'id'>>,
): Promise<void> {
  const current = settingsCollection.get('audioSettings') ?? {
    ...DEFAULT_SETTINGS,
  }
  const updated: AudioSettingsRow = { ...current, ...patch }
  const tx = createTransaction({
    mutationFn: async ({ transaction }) => {
      settingsCollection.utils.acceptMutations(transaction)
    },
  })
  tx.mutate(() => {
    if (settingsCollection.get('audioSettings')) {
      settingsCollection.update('audioSettings', (draft) => {
        Object.assign(draft, patch)
      })
    } else {
      settingsCollection.insert(updated)
    }
  })
  await tx.isPersisted.promise
}
window.settingsCollection = settingsCollection

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
