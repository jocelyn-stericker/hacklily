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

export function checkFeatures() {
  if (!self.crossOriginIsolated) {
    return 'This page was loaded without cross origin isolation, which Braat requires for live analysis. Either the server is not sending the correct headers, or your browser does not support this feature. Live analysis will not work.'
  } else if (typeof SharedArrayBuffer === 'undefined') {
    return 'Cross origin isolation is enabled, but SharedArrayBuffer is not available in this browser. Live analysis will not work.'
  }
  return null
}

// Minimal shape of the on-device Web Speech API. The static `available` and
// `install` members are only present on the unprefixed `SpeechRecognition`
// constructor in browsers that support local (on-device) transcription. They
// are not yet in the standard DOM lib types, so we declare what we use.
interface OnDeviceSpeechRecognition {
  available?: (options: {
    langs: string[]
    // Defaults to false, in which case cloud-backed recognition counts toward
    // availability. Set true to probe specifically for on-device support.
    processLocally?: boolean
  }) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>
}

function getSpeechRecognition(): OnDeviceSpeechRecognition | undefined {
  return (self as unknown as { SpeechRecognition?: OnDeviceSpeechRecognition })
    .SpeechRecognition
}

function getWebkitSpeechRecognition(): unknown {
  return (self as unknown as { webkitSpeechRecognition?: unknown })
    .webkitSpeechRecognition
}

// Minimal constructor shape used only by the track-support probe below.
type MinimalSpeechRecognition = {
  start(audioTrack?: unknown): void
  stop(): void
}
type MinimalSpeechRecognitionConstructor = new () => MinimalSpeechRecognition

// Whether `SpeechRecognition.start(track)` actually accepts a MediaStreamTrack.
//
// Braat transcribes recorded chunks by feeding them in as an audio track, so
// this is a hard requirement: without it, transcription can't work at all.
// There's no standardised feature-detect (web-speech-api#126), and the failure
// mode is silent — a browser that doesn't know the argument ignores it and
// starts listening to the live microphone instead of our chunk.
//
// So we probe behaviourally (after Shaka Player): call start() with a non-track
// value. A browser that supports the parameter validates its type and throws
// TypeError; one that doesn't ignores the extra argument and starts. The probe
// runs in a detached iframe so the no-support branch can't trigger a microphone
// permission prompt. Memoised: it touches the DOM and the answer is stable for
// the life of the page.
let trackRecognitionSupported: boolean | undefined

export function supportsTrackRecognition(): boolean {
  trackRecognitionSupported ??= probeTrackRecognition()
  return trackRecognitionSupported
}

/** Test-only: clears the memoised probe result so it re-runs. */
export function resetTrackRecognitionProbeForTests(): void {
  trackRecognitionSupported = undefined
}

function probeTrackRecognition(): boolean {
  if (typeof document === 'undefined') return false
  const frame = document.createElement('iframe')
  document.body.appendChild(frame)
  const win = frame.contentWindow as
    | (Window & {
        SpeechRecognition?: MinimalSpeechRecognitionConstructor
        webkitSpeechRecognition?: MinimalSpeechRecognitionConstructor
      })
    | null
  const Ctor = win?.SpeechRecognition ?? win?.webkitSpeechRecognition
  if (!Ctor) {
    frame.remove()
    return false
  }
  const recognition = new Ctor()
  // Detach before starting: a removed iframe can't prompt for the microphone,
  // so the no-support branch (which really does start listening) stays silent.
  frame.remove()
  try {
    recognition.start(0)
    // Reached only when the argument was ignored — track input isn't supported.
    recognition.stop()
    return false
  } catch (err) {
    // TypeError means start() validated the argument, so track input is
    // supported. Any other failure: treat as unsupported.
    return (err as any)?.name === 'TypeError'
  }
}

// Whether the device can run the large (Whisper) model, which is WebGPU-only.
// Memoised: the answer is stable for the life of the page, and requesting an
// adapter is not free. Mirrors `supportsTrackRecognition`.
let webGpuAvailable: boolean | undefined

export async function isWebGpuAvailable(): Promise<boolean> {
  if (webGpuAvailable === undefined) webGpuAvailable = await probeWebGpu()
  return webGpuAvailable
}

async function probeWebGpu(): Promise<boolean> {
  // `navigator.gpu` isn't in the DOM lib yet, so declare the slice we use.
  const gpu = (
    navigator as unknown as {
      gpu?: { requestAdapter(): Promise<unknown> }
    }
  ).gpu
  if (!gpu) return false
  try {
    return (await gpu.requestAdapter()) != null
  } catch {
    return false
  }
}

/**
 * Whether any kind of browser-based speech recognition is available, whether
 * on-device or cloud-backed.
 *
 * The mere presence of `SpeechRecognition` is not enough: when it exposes the
 * `available` probe, that probe is authoritative, and a result of "unavailable"
 * (queried without `processLocally`, so cloud recognition still counts) means
 * transcription is genuinely unavailable. Browsers with the older standard API
 * (no probe) or only the legacy prefixed `webkitSpeechRecognition` are assumed
 * to support browser-based transcription.
 */
export async function isBrowserTranscriptionAvailable(
  lang = 'en-US',
): Promise<boolean> {
  // We can only transcribe recorded chunks if start() accepts an audio track.
  if (!supportsTrackRecognition()) return false
  const speechRecognition = getSpeechRecognition()
  if (speechRecognition) {
    if (typeof speechRecognition.available === 'function') {
      try {
        const status = await speechRecognition.available({ langs: [lang] })
        return status !== 'unavailable'
      } catch {
        return false
      }
    }
    return true
  }
  return getWebkitSpeechRecognition() !== undefined
}

export type LocalTranscriptionStatus =
  // The on-device model is installed and ready to use.
  | 'downloaded'
  // The browser supports on-device transcription, but the model still needs to
  // be downloaded (or is currently downloading) before it can be used.
  | 'available'
  // On-device transcription is not supported in this browser.
  | false

/**
 * Reports whether local (on-device) transcription is downloaded, available to
 * download, or unavailable. Only the unprefixed `SpeechRecognition` exposes the
 * `available` probe, so a browser that only has the prefixed
 * `webkitSpeechRecognition` is treated as having no local transcription (even
 * though browser-based transcription may still be available — see
 * `isBrowserTranscriptionAvailable`)
 */
export async function checkLocalTranscription(
  lang = 'en-US',
): Promise<LocalTranscriptionStatus> {
  // We can only transcribe recorded chunks if start() accepts an audio track.
  if (!supportsTrackRecognition()) return false
  const speechRecognition = getSpeechRecognition()
  if (!speechRecognition || typeof speechRecognition.available !== 'function') {
    return false
  }

  try {
    const status = await speechRecognition.available({
      langs: [lang],
      processLocally: true,
    })
    switch (status) {
      case 'available':
        return 'downloaded'
      case 'downloadable':
      case 'downloading':
        return 'available'
      default:
        return false
    }
  } catch {
    return false
  }
}
