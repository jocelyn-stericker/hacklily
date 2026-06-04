// @vitest-environment jsdom
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

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import {
  DEFAULT_SETTINGS,
  buildAudioConstraints,
  preferredSampleRate,
  updateSettings,
} from './settings'
import type { SettingsRow } from './settings'

// Simple in-memory localStorage mock for testing
class LocalStorageMock {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }
}

describe('settings', () => {
  let mockLocalStorage: LocalStorageMock

  beforeEach(() => {
    mockLocalStorage = new LocalStorageMock()
    global.localStorage = mockLocalStorage as any
    vi.clearAllMocks()

    // Trigger storage event to invalidate cache (simulates cross-tab storage change)
    const event = new Event('storage')
    ;(event as any).key = 'braat:settings'
    dispatchEvent(event)
  })

  afterEach(() => {
    mockLocalStorage.clear()
  })

  describe('buildAudioConstraints', () => {
    it('returns default constraints with browser preprocessing enabled', () => {
      const settings: SettingsRow = {
        inputDeviceId: null,
        sampleRate: 'auto',
        persistentMic: false,
        browserPreprocessing: 'default',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      const constraints = buildAudioConstraints(settings)
      expect(constraints.echoCancellation).toBeUndefined()
      expect(constraints.noiseSuppression).toBeUndefined()
      expect(constraints.autoGainControl).toBeUndefined()
      expect(constraints.deviceId).toBeUndefined()
      expect(constraints.sampleRate).toBeUndefined()
    })

    it('disables preprocessing when set to minimal', () => {
      const settings: SettingsRow = {
        inputDeviceId: null,
        sampleRate: 'auto',
        persistentMic: false,
        browserPreprocessing: 'minimal',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      const constraints = buildAudioConstraints(settings)
      expect(constraints.echoCancellation).toBe(false)
      expect(constraints.noiseSuppression).toBe(false)
      expect(constraints.autoGainControl).toBe(false)
    })

    it('includes device ID when specified', () => {
      const deviceId = 'device-123'
      const settings: SettingsRow = {
        inputDeviceId: deviceId,
        sampleRate: 'auto',
        persistentMic: false,
        browserPreprocessing: 'default',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      const constraints = buildAudioConstraints(settings)
      expect(constraints.deviceId).toEqual({ exact: deviceId })
    })

    it('sets prefer48000 sample rate constraint', () => {
      const settings: SettingsRow = {
        inputDeviceId: null,
        sampleRate: 'prefer48000',
        persistentMic: false,
        browserPreprocessing: 'default',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      const constraints = buildAudioConstraints(settings)
      expect(constraints.sampleRate).toEqual({ ideal: 48000 })
    })

    it('sets prefer44100 sample rate constraint', () => {
      const settings: SettingsRow = {
        inputDeviceId: null,
        sampleRate: 'prefer44100',
        persistentMic: false,
        browserPreprocessing: 'default',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      const constraints = buildAudioConstraints(settings)
      expect(constraints.sampleRate).toEqual({ ideal: 44100 })
    })

    it('combines all constraint options', () => {
      const deviceId = 'device-456'
      const settings: SettingsRow = {
        inputDeviceId: deviceId,
        sampleRate: 'prefer48000',
        persistentMic: true,
        browserPreprocessing: 'minimal',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      const constraints = buildAudioConstraints(settings)
      expect(constraints.echoCancellation).toBe(false)
      expect(constraints.noiseSuppression).toBe(false)
      expect(constraints.autoGainControl).toBe(false)
      expect(constraints.deviceId).toEqual({ exact: deviceId })
      expect(constraints.sampleRate).toEqual({ ideal: 48000 })
    })
  })

  describe('preferredSampleRate', () => {
    it('returns undefined for auto sample rate', () => {
      const settings: SettingsRow = {
        inputDeviceId: null,
        sampleRate: 'auto',
        persistentMic: false,
        browserPreprocessing: 'default',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      expect(preferredSampleRate(settings)).toBeUndefined()
    })

    it('returns 48000 for prefer48000', () => {
      const settings: SettingsRow = {
        inputDeviceId: null,
        sampleRate: 'prefer48000',
        persistentMic: false,
        browserPreprocessing: 'default',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      expect(preferredSampleRate(settings)).toBe(48000)
    })

    it('returns 44100 for prefer44100', () => {
      const settings: SettingsRow = {
        inputDeviceId: null,
        sampleRate: 'prefer44100',
        persistentMic: false,
        browserPreprocessing: 'default',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      expect(preferredSampleRate(settings)).toBe(44100)
    })
  })

  describe('updateSettings', () => {
    it('writes valid JSON to localStorage', async () => {
      await updateSettings({ sampleRate: 'prefer48000' })
      const stored = localStorage.getItem('braat:settings')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.sampleRate).toBe('prefer48000')
    })

    it('preserves other settings when updating', async () => {
      const initial: SettingsRow = {
        inputDeviceId: 'device-789',
        sampleRate: 'prefer48000',
        persistentMic: true,
        browserPreprocessing: 'minimal',
        transcriptionMode: 'small',
        vowelChartAverages: 'hidden',
      }
      localStorage.setItem('braat:settings', JSON.stringify(initial))

      // Trigger storage event to load the initial settings
      const event = new Event('storage')
      ;(event as any).key = 'braat:settings'
      dispatchEvent(event)

      await updateSettings({ sampleRate: 'prefer44100' })
      const stored = JSON.parse(localStorage.getItem('braat:settings') || '{}')
      expect(stored.inputDeviceId).toBe('device-789')
      expect(stored.sampleRate).toBe('prefer44100')
      expect(stored.persistentMic).toBe(true)
      expect(stored.browserPreprocessing).toBe('minimal')
    })

    it('handles invalid JSON in localStorage gracefully', async () => {
      localStorage.setItem('braat:settings', 'invalid json {')

      // Trigger storage event to attempt loading corrupted data
      const event = new Event('storage')
      ;(event as any).key = 'braat:settings'
      dispatchEvent(event)

      await updateSettings({ sampleRate: 'prefer48000' })
      const stored = JSON.parse(localStorage.getItem('braat:settings') || '{}')
      expect(stored.sampleRate).toBe('prefer48000')
      expect(stored.inputDeviceId).toBeNull()
      expect(stored.persistentMic).toBe(false)
    })

    it('includes all default keys in updated settings', async () => {
      await updateSettings({ persistentMic: true })
      const stored = JSON.parse(localStorage.getItem('braat:settings') || '{}')
      expect(stored).toHaveProperty('inputDeviceId')
      expect(stored).toHaveProperty('sampleRate')
      expect(stored).toHaveProperty('persistentMic')
      expect(stored).toHaveProperty('browserPreprocessing')
      expect(stored).toHaveProperty('vowelChartAverages')
    })
  })

  describe('DEFAULT_SETTINGS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_SETTINGS.inputDeviceId).toBeNull()
      expect(DEFAULT_SETTINGS.sampleRate).toBe('auto')
      expect(DEFAULT_SETTINGS.persistentMic).toBe(false)
      expect(DEFAULT_SETTINGS.browserPreprocessing).toBe('default')
      expect(DEFAULT_SETTINGS.vowelChartAverages).toBe('hidden')
    })
  })
})
