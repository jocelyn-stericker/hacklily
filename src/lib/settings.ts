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

const LOG = '[Settings]'

export type SampleRatePref = 'auto' | 'prefer48000' | 'prefer44100'
export type BrowserPreprocessing = 'default' | 'minimal'

export type VowelChartAverages =
  | 'women'
  | 'men'
  | 'adults'
  | 'children'
  | 'hidden'

// Which speech-to-text tier Braat is allowed to use. A posture rather than a
// specific engine — each tier resolves to a concrete engine at runtime so there
// is always a working fallback:
//   disabled - do not transcribe
//   small    - the lightweight on-device option: the browser's own on-device
//              engine where available, otherwise the bundled Moonshine model.
//              Audio never leaves the browser. See resolveSmallEngine().
//   large    - the bundled Whisper large-v3-turbo model (WebGPU, ~540 MB).
//              Audio never leaves the browser.
//   cloud    - the browser's speech recognition allowed to fall back to its
//              remote service, which can send audio off-device.
export type TranscriptionMode = 'disabled' | 'small' | 'large' | 'cloud'

// Whether a transcription mode runs *on demand* — only when the user asks for it
// (the "Transcribe" action) — rather than automatically as audio is recorded or
// imported. The large (Whisper) model is heavy enough that transcribing every
// chunk as it arrives isn't appropriate on every machine, so it's manual; the
// lighter tiers stay automatic. This predicate is the single switch for that
// policy: change the condition here to make other modes manual (or large
// automatic). When it returns true the automatic transcription paths stand down
// and nothing is transcribed until the user triggers it.
export function isManualTranscription(mode: TranscriptionMode): boolean {
  return mode === 'large'
}

// localStorage flag recording that the bundled Moonshine weights finished
// downloading — see modelDownload.ts. Mirrored here so the legacy-settings
// migration can seed it for users who already had the old "bundled" mode.
const MOONSHINE_DOWNLOADED_KEY = 'braat:model-downloaded:moonshine'

// Map a persisted transcription mode (possibly from an older build that exposed
// the engines directly) onto the current tier vocabulary. The legacy "bundled"
// and "browser" engines both collapse into the "small" tier.
function normalizeTranscriptionMode(value: unknown): TranscriptionMode {
  switch (value) {
    case 'small':
    case 'large':
    case 'cloud':
    case 'disabled':
      return value
    case 'bundled':
      // The bundled engine was Moonshine, which a "small"-tier user can keep
      // using offline — seed its downloaded flag so we don't re-prompt.
      try {
        localStorage.setItem(MOONSHINE_DOWNLOADED_KEY, '1')
      } catch {
        // Best-effort; the runtime availability guard covers a wrong guess.
      }
      return 'small'
    case 'browser':
      return 'small'
    default:
      return DEFAULT_SETTINGS.transcriptionMode
  }
}

export type SettingsRow = {
  inputDeviceId: string | null
  sampleRate: SampleRatePref
  persistentMic: boolean
  browserPreprocessing: BrowserPreprocessing
  transcriptionMode: TranscriptionMode
  vowelChartAverages: VowelChartAverages
}

/** The subset of settings the audio capture path reads. */
export type AudioCaptureSettings = Pick<
  SettingsRow,
  'inputDeviceId' | 'sampleRate' | 'persistentMic' | 'browserPreprocessing'
>

export const DEFAULT_SETTINGS: SettingsRow = {
  inputDeviceId: null,
  sampleRate: 'auto',
  persistentMic: false,
  browserPreprocessing: 'default',
  transcriptionMode: 'disabled',
  vowelChartAverages: 'hidden',
}

const STORAGE_KEY = 'braat:settings'
const listeners = new Set<() => void>()
let cache: SettingsRow | null = null

function readFromStorage(): SettingsRow {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<SettingsRow>
      return {
        ...DEFAULT_SETTINGS,
        ...stored,
        transcriptionMode: normalizeTranscriptionMode(stored.transcriptionMode),
      }
    }
  } catch (err) {
    console.warn(LOG, 'failed to read stored settings:', err)
  }
  return { ...DEFAULT_SETTINGS }
}

export function getSnapshot(): SettingsRow {
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

export function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

export async function updateSettings(
  patch: Partial<SettingsRow>,
): Promise<void> {
  const updated: SettingsRow = { ...getSnapshot(), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  invalidate()
}

/** Build MediaStreamConstraints from settings */
export function buildAudioConstraints(
  settings: AudioCaptureSettings,
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
  settings: AudioCaptureSettings,
): number | undefined {
  if (settings.sampleRate === 'prefer48000') return 48000
  if (settings.sampleRate === 'prefer44100') return 44100
  return undefined
}
