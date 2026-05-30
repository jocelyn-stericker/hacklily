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

// Web Speech API recognition for transcribing recorded audio chunks.
//
// We use the browser's `SpeechRecognition`. The modern (unprefixed) constructor
// can recognize a `MediaStreamTrack` passed to `start()` and honours
// `processLocally`; the legacy prefixed `webkitSpeechRecognition` only listens
// to the live microphone. Since we transcribe recorded chunks (not the live
// mic), we play each chunk's PCM through a `MediaStreamAudioDestinationNode` and
// hand recognition the resulting live track.
//
// These shapes aren't all in the DOM lib yet, so we declare what we use.

/** Recognition language. Matches the default used by the feature probes. */
const TRANSCRIPTION_LANG = 'en-US'
const LOG = '[transcription-web]'

interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike {
  error: string
  message?: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  processLocally?: boolean
  start(audioTrack?: MediaStreamTrack): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionConstructor():
  | SpeechRecognitionConstructor
  | undefined {
  const w = self as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function recognitionErrorMessage(error: string): string {
  switch (error) {
    case 'language-not-supported':
      return 'The selected language is not available for transcription.'
    case 'network':
      return 'Network error during transcription.'
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Transcription was not permitted.'
    case 'audio-capture':
      return 'Could not capture audio for transcription.'
    default:
      return `Transcription failed (${error}).`
  }
}

// A single AudioContext is shared across all recognition calls. Creating one per
// chunk is expensive (each spins up an audio thread); the context is lightweight
// and its nodes (buffer sources, stream destinations) are cheap to create and
// garbage-collect. We lazily create it on first use and keep it open for the
// page's lifetime — closing it between calls would defeat the purpose.
let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  sharedAudioContext ??= new AudioContext()
  return sharedAudioContext
}

// Browsers generally allow only one active SpeechRecognition session at a time.
// transcribeChunks already feeds chunks one at a time, but serialize recognition
// here too so any other caller can't start an overlapping session.
let recognitionChain: Promise<unknown> = Promise.resolve()

export function enqueueRecognition<T>(task: () => Promise<T>): Promise<T> {
  const run = recognitionChain.then(task, task)
  recognitionChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * Recognize a single mono PCM buffer with the Web Speech API and resolve with
 * the joined final transcript (possibly empty if nothing was recognized).
 *
 * The PCM is played in real time through a shared AudioContext into a
 * MediaStream, whose live audio track is handed to `recognition.start()`.
 * `processLocally` forces on-device recognition (the "browser" posture);
 * leaving it false lets the user agent fall back to its remote service
 * (the "cloud" posture).
 */
export async function recognizePcm(
  pcm: Float32Array,
  sampleRate: number,
  processLocally: boolean,
): Promise<string> {
  console.time(LOG + ' recognizePcm')
  try {
    if (pcm.length === 0) return ''

    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      throw new Error('Speech recognition is not available in this browser.')
    }

    const audioContext = getAudioContext()
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    // Pad the buffer with trailing silence so recognition has time to drain the
    // tail of the utterance before `source.onended` fires and we stop. Without
    // this, Chrome cuts off the last syllables — the AudioBufferSource ends
    // before the recognition pipeline has caught up with the audio it received,
    // and Chrome's endpointer never sees an end-of-speech silence to promote the
    // current interim to a final.
    const trailingSilenceSamples = Math.round(0.3 * sampleRate)
    const buffer = audioContext.createBuffer(
      1,
      pcm.length + trailingSilenceSamples,
      sampleRate,
    )
    buffer.getChannelData(0).set(pcm)
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    const destination = audioContext.createMediaStreamDestination()
    source.connect(destination)
    const track = destination.stream.getAudioTracks()[0]
    if (!track) {
      throw new Error('Could not create an audio track for recognition.')
    }

    const recognition = new Ctor()
    recognition.lang = TRANSCRIPTION_LANG
    recognition.processLocally = processLocally
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    return await new Promise<string>((resolve, reject) => {
      // Latest transcript per result index (interim or final). `onresult` fires
      // repeatedly as recognition refines each utterance; overwriting by index
      // collapses duplicates and lets a late `isFinal` simply replace its interim.
      const transcripts: string[] = []
      let settled = false

      const cleanup = () => {
        clearTimeout(watchdog)
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        source.onended = null
        source.disconnect()
        try {
          source.stop()
        } catch {}
      }

      const joinTranscripts = () =>
        transcripts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result?.[0]) {
            transcripts[i] = result[0].transcript
          }
        }
      }

      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return
        if (settled) return
        settled = true
        cleanup()
        reject(new Error(recognitionErrorMessage(event.error)))
      }

      recognition.onend = () => {
        if (settled) return
        settled = true
        cleanup()
        resolve(joinTranscripts())
      }

      source.onended = () => {
        try {
          recognition.stop()
        } catch {}
      }

      const durationMs = (buffer.length / sampleRate) * 1000
      const watchdog = setTimeout(() => {
        try {
          recognition.abort()
        } catch {}
        if (!settled) {
          settled = true
          cleanup()
          resolve(joinTranscripts())
        }
      }, durationMs + 10_000)

      try {
        recognition.start(track)
      } catch (err) {
        settled = true
        cleanup()
        reject(
          err instanceof Error
            ? err
            : new Error('Failed to start speech recognition.'),
        )
        return
      }
      source.start()
    })
  } finally {
    // Note that this can't be faster than realtime due to the fact that the API supports a media stream.
    // We work with what we can get.
    console.timeEnd(LOG + ' recognizePcm')
  }
}
