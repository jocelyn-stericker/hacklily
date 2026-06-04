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

/// <reference types="@types/dom-speech-recognition" />

import audioWorkletUrl from '#/lib/audio/SabRopeSourceNode?worker&url'
import type { SabRopeSourceNode } from '#/lib/audio/SabRopeSourceNode'
import type { AudioSpan } from '#/lib/transcription'

/** Recognition language. Matches the default used by the feature probes. */
const TRANSCRIPTION_LANG = 'en-US'
// Silence let through after the span's audio so the endpointer can promote the
// last interim to a final. The node keeps emitting zeros once it stops, so this
// is just how long we wait past the reported end before stopping recognition.
const TRAILING_SILENCE_SEC = 0.3
const LOG = '[transcribeWeb]'

type SpeechRecognitionConstructor = new () => SpeechRecognition

function getSpeechRecognitionConstructor():
  | SpeechRecognitionConstructor
  | undefined {
  const w = self as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function recognitionErrorMessage(error: SpeechRecognitionErrorCode): string {
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

// The SabRopeSourceNode worklet module is added to the shared context once and
// reused across recognition calls. Cached against the singleton context, which
// lives for the page's lifetime.
let workletModulePromise: Promise<void> | null = null

function ensureWorkletModule(context: AudioContext): Promise<void> {
  workletModulePromise ??= context.audioWorklet.addModule(audioWorkletUrl)
  return workletModulePromise
}

// Browsers generally allow only one active SpeechRecognition session at a time.
// transcribeChunks already feeds chunks one at a time, but serialize recognition
// here too so any other caller can't start an overlapping session.
let recognitionChain: Promise<unknown> = Promise.resolve()

export function transcribeWeb(
  audio: AudioSpan,
  processLocally: boolean,
): Promise<string> {
  const task = () => recognizePcm(audio, processLocally)

  const run = recognitionChain.then(task, task)
  recognitionChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * Recognize a single recorded audio span with the Web Speech API and resolve
 * with the joined final transcript (possibly empty if nothing was recognized).
 *
 * The span's audio is played in real time by a `SabRopeSourceNode` — reading
 * straight from the (possibly still-growing) rope — into a MediaStream, whose
 * live audio track is handed to `recognition.start()`. `processLocally` forces
 * on-device recognition (the "browser" posture); leaving it false lets the user
 * agent fall back to its remote service (the "cloud" posture).
 *
 * Playback starts as soon as the audio that has landed so far, rather than
 * waiting for `endTime`: we snapshot the rope, forward every subsequent grow
 * (and the seal) to the node so it keeps reading as the recording grows, and
 * post the stop boundary once `endTime` resolves. With a finished recording the
 * end is known up front, so that boundary lands immediately.
 */
export async function recognizePcm(
  audio: AudioSpan,
  processLocally: boolean,
): Promise<string> {
  console.time(LOG + ' recognizePcm')
  try {
    audio.signal.throwIfAborted()

    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      throw new Error('Speech recognition is not available in this browser.')
    }

    const audioContext = getAudioContext()
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    await ensureWorkletModule(audioContext)

    // The node plays the rope from `startTime` into a MediaStream; the resampler
    // matches the rope's rate to the context's. It keeps emitting silence after
    // it stops, which gives the endpointer its end-of-speech silence — see
    // `TRAILING_SILENCE_SEC`.
    const node: SabRopeSourceNode = new AudioWorkletNode(
      audioContext,
      'sab-rope-source-node',
    )
    const destination = audioContext.createMediaStreamDestination()
    node.connect(destination)
    const track = destination.stream.getAudioTracks()[0]
    if (!track) {
      node.disconnect()
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
      // Armed when the node reports the playout end; stops recognition once the
      // trailing silence has flowed through.
      let stopTimer: ReturnType<typeof setTimeout> | null = null
      // Armed once `endTime` resolves (we don't know the span length before
      // then); backstops a recognition that never fires `onend`.
      let watchdog: ReturnType<typeof setTimeout> | null = null
      // Forward future growth/seal of the rope to the node; torn down on cleanup.
      let unsubGrow: (() => void) | null = null
      let unsubSeal: (() => void) | null = null

      const cleanup = () => {
        if (watchdog !== null) clearTimeout(watchdog)
        if (stopTimer !== null) clearTimeout(stopTimer)
        unsubGrow?.()
        unsubSeal?.()
        audio.signal.removeEventListener('abort', onAbort)
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        node.port.onmessage = null
        try {
          node.port.postMessage(null)
        } catch (err) {
          console.warn(LOG, 'node stop failed during cleanup:', err)
        }
        node.disconnect()
      }

      // Cancellation (e.g. the buffer was too short to be speech): tear the graph
      // down and reject so `transcribeChunk` leaves the chunk untranscribed. Can
      // fire any time — before playback, mid-recognition, or while draining.
      const onAbort = () => {
        if (settled) return
        settled = true
        cleanup()
        reject(audio.signal.reason)
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

      // The node renders ahead of the audible clock and reports the context time
      // its final sample plays out. Wait until that time plus the trailing
      // silence has actually elapsed before stopping recognition, so the last
      // syllables aren't clipped.
      node.port.onmessage = ({ data }) => {
        if (data.type !== 'end') return
        const delayMs = Math.max(
          0,
          (data.contextTime + TRAILING_SILENCE_SEC - audioContext.currentTime) *
            1000,
        )
        stopTimer = setTimeout(() => {
          try {
            recognition.stop()
          } catch (err) {
            console.warn(LOG, 'recognition.stop failed on end:', err)
          }
        }, delayMs)
      }

      // Listeners added after an abort never fire, so handle an abort that landed
      // during the awaits above explicitly.
      audio.signal.addEventListener('abort', onAbort)
      if (audio.signal.aborted) {
        onAbort()
        return
      }

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

      // Snapshot and subscribe with no `await` between them, so the node starts
      // at the rope's current buffer count and every later grow lines up (its
      // `oldBufferCount` matches). Recognition is already listening, so playback
      // is captured from the first sample.
      const share = audio.rope.shareRope()
      unsubGrow = audio.rope.onGrow((grow) => {
        try {
          node.port.postMessage({ type: 'growLastRope', grow })
        } catch (err) {
          console.warn(LOG, 'forward grow failed:', err)
        }
      })
      unsubSeal = audio.rope.onSeal(() => {
        try {
          node.port.postMessage({ type: 'sealLastRope' })
        } catch (err) {
          console.warn(LOG, 'forward seal failed:', err)
        }
      })
      node.port.postMessage({
        type: 'setBuffer',
        ropes: [share],
        gains: [1],
      })
      node.port.postMessage({ type: 'start', timeSec: audio.startTime })

      // Stop the node at the span boundary once the recording of the span is
      // complete. `end` bounds playback even when the rope extends past it (one
      // rope can hold several chunks). With a finished recording this resolves
      // right away.
      audio.endTime.then(
        (endTime) => {
          if (settled) return
          watchdog = setTimeout(
            () => {
              try {
                recognition.abort()
              } catch (err) {
                console.warn(LOG, 'recognition.abort failed in watchdog:', err)
              }
              if (!settled) {
                settled = true
                cleanup()
                resolve(joinTranscripts())
              }
            },
            (endTime - audio.startTime + TRAILING_SILENCE_SEC) * 1000 + 10_000,
          )
          node.port.postMessage({ type: 'end', timeSec: endTime })
        },
        (err) => {
          // The span's recording was abandoned before its end was known. Stop
          // recognition and resolve with whatever has been recognized so far.
          if (settled) return
          console.warn(LOG, 'endTime rejected:', err)
          try {
            recognition.stop()
          } catch (stopErr) {
            console.warn(
              LOG,
              'recognition.stop failed on endTime reject:',
              stopErr,
            )
          }
        },
      )
    })
  } finally {
    // Note that this can't be faster than realtime due to the fact that the API supports a media stream.
    // We work with what we can get.
    console.timeEnd(LOG + ' recognizePcm')
  }
}
