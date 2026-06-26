// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// A single-take recorder for the voice journal. Deliberately simpler than
// practice: manual start/stop, no echo/loop/reference machinery and no live
// visuals — just an elapsed timer that mirrors the practice footer's look.
//
// VAD gates the *start* of the take: the timer only begins counting once
// speech is detected, and leading silence before the first voiced frame is
// trimmed from the saved file. VAD never ends a recording — only the user
// (or a too-short take) does.

import { Loader2, Mic, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { useAudioManager } from '#/components/useAudioManager'
import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import { track } from '#/lib/analytics'
import { AudioRope } from '#/lib/audio/AudioRope'
import type {
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import { ropesToMp3 } from '#/lib/audio/exportMp3'
import { deleteEntry, ensureAccess, writeEntry } from '#/lib/journal/journalFs'
import { RopeGainCache } from '#/lib/loudness/ropeLoudness'
import { computeVoicedRange } from '#/lib/practiceState'
import { formatDuration } from '#/lib/utils'

// Stable empty array so useAudioManager's playback effect doesn't churn.
const NO_ROPES: AudioRope[] = []

// Discard a take with effectively no audio rather than writing a silent file.
const MIN_TAKE_SEC = 0.3

type Phase = 'idle' | 'recording' | 'saving'

export function JournalRecorder({
  handle,
  onSaved,
  folderName,
}: {
  handle: FileSystemDirectoryHandle
  onSaved: () => void
  folderName: string
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  // `audioActive` flips true when the first analysis frame lands (mic is warm).
  // `voicedStartMs` flips when VAD first reports speech — the timer starts here.
  const [audioActive, setAudioActive] = useState(false)
  const [voicedStartMs, setVoicedStartMs] = useState<number | null>(null)

  const sessionRopeRef = useRef<AudioRope | null>(null)
  const analysisRef = useRef<AnalysisFrame[]>([])
  const paramsRef = useRef<AnalysisParams | null>(null)
  const [gainCache] = useState(() => new RopeGainCache())
  // Resolved by onCaptureComplete so handleStop can await a fully sealed rope.
  const doneResolveRef = useRef<(() => void) | null>(null)

  const noop = useCallback(() => {}, [])

  const handleRecordingComplete = useCallback(() => {
    doneResolveRef.current?.()
    doneResolveRef.current = null
  }, [])

  const handleChunkStart = useCallback((params: AnalysisParams) => {
    paramsRef.current = params
  }, [])

  const handleAppend = useCallback((frame: AnalysisFrame) => {
    analysisRef.current.push(frame)
    setAudioActive((prev) => prev || true)
    if (frame.speechDetected === true) {
      setVoicedStartMs((prev) => prev ?? Date.now())
    }
  }, [])

  const handleAudioRopeShare = useCallback((share: AudioRopeShare) => {
    sessionRopeRef.current = new AudioRope(share)
  }, [])
  const handleAudioRopeGrow = useCallback((grow: AudioRopeGrow) => {
    sessionRopeRef.current?.grow(grow)
  }, [])
  const handleAudioRopeSeal = useCallback((_: AudioRopeSeal) => {
    sessionRopeRef.current?.seal()
  }, [])

  const handleNotification = useCallback((message: string) => {
    toast(message)
  }, [])

  const handleError = useCallback((error: string) => {
    toast('Recording error', { description: error })
    setPhase('idle')
  }, [])

  const audioManager = useAudioManager({
    active: phase !== 'idle',
    recording: phase === 'recording',
    captureFeatures: {
      spectrogram: false,
      formant: false,
      vad: { redemptionMs: 80, prerollMs: 500 },
    },
    onCaptureAppend: handleAppend,
    onCaptureChunkStart: handleChunkStart,
    onCaptureComplete: handleRecordingComplete,
    onCaptureNotification: handleNotification,
    onAudioRopeGrow: handleAudioRopeGrow,
    onAudioRopeShare: handleAudioRopeShare,
    onAudioRopeSeal: handleAudioRopeSeal,
    onError: handleError,
    playing: false,
    playbackRopes: NO_ROPES,
    playbackGainCache: gainCache,
    playbackCursorSec: 0,
    onPlaybackStop: noop,
    onPlaybackPositionChanged: noop,
  })

  // Elapsed timer — only runs once VAD has marked the start of speech.
  useEffect(() => {
    if (phase !== 'recording' || voicedStartMs === null) return
    const tick = () => setElapsedMs(Date.now() - voicedStartMs)
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [phase, voicedStartMs])

  const handleStart = useCallback(() => {
    // Unlock the AudioContext synchronously in the gesture before any await.
    void audioManager?.unlockForGesture()
    sessionRopeRef.current = null
    analysisRef.current = []
    paramsRef.current = null
    setAudioActive(false)
    setVoicedStartMs(null)
    setElapsedMs(0)
    setPhase('recording')
  }, [audioManager])

  const handleStop = useCallback(async () => {
    // Stop recording; the pipeline seals the rope and fires onCaptureComplete.
    setPhase('saving')
    await new Promise<void>((resolve) => {
      doneResolveRef.current = resolve
    })

    const rope = sessionRopeRef.current
    if (!rope) {
      toast('Recording too short', { description: 'Nothing was saved.' })
      setPhase('idle')
      return
    }

    // Trim leading and trailing silence: keep from the first voiced frame to
    // the last, preserving any gaps between speech segments. The VAD preroll/
    // postroll already fold pre-onset and post-offset frames into the voiced
    // region, so the bounds land just outside the speech itself.
    const params = paramsRef.current
    const frames = analysisRef.current
    let startSample = 0
    let endSample = rope.length
    if (params && frames.length > 0) {
      const timePerFrame = params.timeStepSamples / params.sampleRate
      const voiced = computeVoicedRange(
        frames,
        0,
        frames.length,
        timePerFrame,
        0,
      )
      if (voiced.endSec > 0) {
        startSample = Math.round(voiced.startSec * rope.sampleRate)
        endSample = Math.min(
          Math.round(voiced.endSec * rope.sampleRate),
          rope.length,
        )
      }
    }

    const trimmedLength = endSample - startSample
    if (trimmedLength <= 0 || trimmedLength / rope.sampleRate < MIN_TAKE_SEC) {
      toast('Recording too short', { description: 'Nothing was saved.' })
      setPhase('idle')
      return
    }

    // Copy the voiced-onward PCM into a fresh rope so ropesToMp3 handles
    // resampling/encoding exactly as it does elsewhere.
    const trimmed = new AudioRope(rope.sampleRate)
    const chunk = new Float32Array(Math.min(trimmedLength, 65536))
    let read = 0
    while (read < trimmedLength) {
      const n = Math.min(chunk.length, trimmedLength - read)
      rope.read(chunk, startSample + read, 0, n)
      trimmed.append(chunk.subarray(0, n))
      read += n
    }
    trimmed.seal()

    try {
      const access = await ensureAccess(handle)
      if (access !== 'granted') {
        toast('Could not access the journal folder', {
          description: 'Grant access to the folder to save this recording.',
        })
        setPhase('idle')
        return
      }
      const bytes = await ropesToMp3([trimmed], gainCache.gainsFor([trimmed]))
      const name = await writeEntry(handle, bytes)
      track('journal/record')
      onSaved()
      toast('Saved to voice journal', {
        description: name,
        action: {
          label: 'Undo',
          onClick: () => {
            void deleteEntry(handle, name)
              .then(onSaved)
              .catch((err: unknown) => {
                console.error('[journal] failed to undo recording:', err)
                toast('Could not undo')
              })
          },
        },
      })
    } catch (err) {
      console.error('[journal] failed to save recording:', err)
      toast('Could not save the recording')
    }
    setPhase('idle')
  }, [handle, gainCache, onSaved])

  const active = phase !== 'idle'
  const timerActive = voicedStartMs !== null

  return (
    <div
      className={
        active
          ? 'lg:fixed lg:bottom-4 lg:left-4 lg:z-20 lg:w-80 lg:rounded-xl lg:border lg:bg-background lg:shadow-lg'
          : 'shrink-0 border-t border-border'
      }
    >
      {phase === 'saving' ? (
        <div className="relative flex items-center px-4 py-3 gap-2">
          <Button variant="outline" disabled className="px-3">
            <Loader2 className="animate-spin" />
            Saving…
          </Button>
        </div>
      ) : phase === 'recording' ? (
        <div className="relative flex items-center px-4 py-3 gap-2">
          <div className="flex items-center gap-2 shrink-0 z-1">
            <Button variant="outline" disabled className="px-3">
              {audioActive ? (
                <>
                  {indicator}
                  {timerActive
                    ? `Rec · ${formatDuration(elapsedMs / 1000)}`
                    : 'Listening…'}
                </>
              ) : (
                <Loader2 className="animate-spin" />
              )}
            </Button>
          </div>
          <div className="flex-1" />
          <Button
            aria-label="Stop recording"
            onClick={() => void handleStop()}
            size="icon"
            className="bg-red-500 text-white hover:bg-red-600"
          >
            <Square className="size-4 fill-current" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-4">
          <Button size="lg" onClick={handleStart}>
            <Mic />
            Record entry
          </Button>
          <p className="max-w-md text-center text-xs text-muted-foreground">
            Entries are saved to “{folderName}”. The files are yours &mdash;
            keep, move, sync, or delete them however you like, and anyone who
            can open the folder can play them back.
          </p>
        </div>
      )}
    </div>
  )
}

const indicator = (
  <span className="relative flex size-3 shrink-0 mr-2">
    <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex size-3 rounded-full bg-red-500" />
  </span>
)
