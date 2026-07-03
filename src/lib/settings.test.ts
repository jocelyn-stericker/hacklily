// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import {
  clampVowelChartScale,
  DEFAULT_SETTINGS,
  buildAudioConstraints,
  preferredSampleRate,
  updateSettings,
  VOWEL_CHART_SCALE_MAX,
  VOWEL_CHART_SCALE_MIN,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
        forcedAlignment: false,
        runHeavyWhileRecording: false,
        vowelChartAverages: 'hidden',
        vowelChartScale: 1.0,
        practiceTextSize: 'lg',
        practicePassageId: 'rainbow',
        practiceMode: 'echo',
        practiceRandomize: false,
        practiceAutoAdvance: false,
        practiceReferenceVoice: 'af_heart',
        practicePlayReferenceBeforeTake: false,
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
      expect(stored).toHaveProperty('practiceTextSize')
      expect(stored).toHaveProperty('practicePassageId')
      expect(stored).toHaveProperty('practiceMode')
      expect(stored).toHaveProperty('practiceRandomize')
    })
  })

  describe('DEFAULT_SETTINGS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_SETTINGS.inputDeviceId).toBeNull()
      expect(DEFAULT_SETTINGS.sampleRate).toBe('auto')
      expect(DEFAULT_SETTINGS.persistentMic).toBe(false)
      expect(DEFAULT_SETTINGS.browserPreprocessing).toBe('default')
      expect(DEFAULT_SETTINGS.vowelChartAverages).toBe('hidden')
      expect(DEFAULT_SETTINGS.practiceTextSize).toBe('lg')
      expect(DEFAULT_SETTINGS.practicePassageId).toBe('rainbow')
      expect(DEFAULT_SETTINGS.practiceMode).toBe('echo')
      expect(DEFAULT_SETTINGS.practiceRandomize).toBe(false)
    })
  })
})

describe('clampVowelChartScale', () => {
  it('passes through in-range values', () => {
    expect(clampVowelChartScale(1.5)).toBe(1.5)
  })

  it('clamps below min and above max', () => {
    expect(clampVowelChartScale(0.2)).toBe(VOWEL_CHART_SCALE_MIN)
    expect(clampVowelChartScale(9)).toBe(VOWEL_CHART_SCALE_MAX)
  })

  it('coerces junk to the default (min)', () => {
    expect(clampVowelChartScale('big')).toBe(VOWEL_CHART_SCALE_MIN)
    expect(clampVowelChartScale(NaN)).toBe(VOWEL_CHART_SCALE_MIN)
    expect(clampVowelChartScale(undefined)).toBe(VOWEL_CHART_SCALE_MIN)
  })
})
