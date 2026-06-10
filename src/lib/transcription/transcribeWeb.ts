// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Web Speech API transcription for recorded audio chunks.
//
// The unprefixed `SpeechRecognition` can recognize a `MediaStreamTrack` and
// honours `processLocally`; the legacy `webkitSpeechRecognition` only listens
// to the live mic. We play recorded PCM through a MediaStreamAudioDestinationNode
// and pass the resulting track to recognition.
//
// Some shapes aren't in the DOM lib yet, so we declare what we use.

/// <reference types="@types/dom-speech-recognition" />

import type { AudioSpan } from '#/lib/audio/AudioSpan'
import audioWorkletUrl from '#/lib/audio/SabRopeSourceNode?worker&url'
import type { SabRopeSourceNode } from '#/lib/audio/SabRopeSourceNode'

/** Recognition language. Matches the default used by the feature probes. */
const TRANSCRIPTION_LANG = 'en-US'
// Wait this long past the playout end before stopping recognition, so the
// endpointer can promote the last interim to a final result.
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

// Shared across all recognition calls: creating one per chunk is expensive
// (audio thread spin-up). Lazily created and kept open for the page's lifetime.
let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  sharedAudioContext ??= new AudioContext()
  return sharedAudioContext
}

// Added once to the shared context; reused across all recognition calls.
let workletModulePromise: Promise<void> | null = null

function ensureWorkletModule(context: AudioContext): Promise<void> {
  workletModulePromise ??= context.audioWorklet.addModule(audioWorkletUrl)
  return workletModulePromise
}

// Browsers allow only one active SpeechRecognition at a time; serialize here.
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
 * Recognize a recorded audio span with the Web Speech API; resolves with the
 * joined transcript (empty if nothing recognized).
 *
 * Audio is played in real time via `SabRopeSourceNode` into a MediaStream
 * handed to `recognition.start()`. `processLocally` forces on-device recognition.
 *
 * Playback starts immediately from whatever audio has landed, forwarding later
 * grows and the seal; the stop boundary is posted once `endTime` resolves.
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

    // Plays from `startTime` into a MediaStream; resamples to the context rate.
    // Emits silence after stopping, giving the endpointer its trailing pause.
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
      // Latest transcript per result index; overwriting by index collapses
      // duplicates and lets a late `isFinal` replace its interim.
      const transcripts: string[] = []
      let settled = false
      // Armed after playout end; stops recognition once trailing silence flows through.
      let stopTimer: ReturnType<typeof setTimeout> | null = null
      // Armed once `endTime` resolves; backstops a recognition that never fires `onend`.
      let watchdog: ReturnType<typeof setTimeout> | null = null
      // Forward rope growth/seal to the node; torn down on cleanup.
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

      // Abort: tear down and reject. Can fire before playback, mid-recognition,
      // or while draining.
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

      // Node reports the context time its final sample plays out. Delay stopping
      // until then plus trailing silence, so the last syllables aren't clipped.
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

      // Handle an abort that landed during the awaits above.
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

      // No `await` between snapshot and subscribe so the node starts at the
      // current buffer count and every subsequent grow's `oldBufferCount` matches.
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

      // Stop at the span boundary once recording is complete. `end` bounds
      // playback even if the rope extends past it (multiple chunks per rope).
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
          // Recording abandoned before end was known; resolve with what we have.
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
    // MediaStream API limits speed to realtime.
    console.timeEnd(LOG + ' recognizePcm')
  }
}
