// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { Loader2, Mic, Play, Square } from 'lucide-react'

import { formatDuration } from '#/lib/utils'

import { Button } from './ui/button'

export function PracticeStatusRow({
  phase,
  playing,
  audioActive,
  timerActive,
  elapsedMs,
  onStartSession,
  onNextTake,
  onEndSession,
  numTakes,
  playReferenceBeforeTake,
  referencePlaying,
  referenceLoading,
  onStopReference,
}: {
  phase: 'idle' | 'recording' | 'playback'
  playing: boolean
  audioActive: boolean
  timerActive: boolean
  elapsedMs: number
  onStartSession: () => void
  onNextTake: () => void
  onEndSession: () => void
  numTakes: number
  /** True when each take is preceded by playing the reference clip. */
  playReferenceBeforeTake: boolean
  /** True when a reference clip is currently playing. */
  referencePlaying: boolean
  /** True while the reference clip is buffering. */
  referenceLoading: boolean
  onStopReference: () => void
}) {
  if (phase === 'idle') {
    if (referencePlaying || referenceLoading) {
      // fall through to toolbar treatment below
    } else {
      return (
        <div className="flex flex-col items-center gap-2 px-4 py-4">
          <Button size="lg" onClick={onStartSession}>
            <Mic />
            {numTakes > 0 ? 'Resume take' : 'Start take'}
          </Button>
          {numTakes > 0 ? null : (
            <p className="max-w-md text-center text-xs text-muted-foreground">
              {playReferenceBeforeTake
                ? 'Listen, then record your own take. '
                : null}
              Practice takes stay in your browser and are gone when you leave
              &mdash; nothing is saved.
            </p>
          )}
        </div>
      )
    }
  }

  const indicator = (
    <span className="relative flex size-3 shrink-0 mr-2">
      <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex size-3 rounded-full bg-red-500" />
    </span>
  )

  return (
    <div className="relative flex items-center px-4 py-3 gap-2">
      <div className="flex items-center gap-2 shrink-0 z-1">
        {referencePlaying || referenceLoading ? (
          <Button variant="outline" disabled={true} className="px-3">
            {referenceLoading ? <Loader2 className="animate-spin" /> : <Play />}
            Playing reference…
          </Button>
        ) : playing ? (
          <Button variant="outline" disabled={true} className="px-3">
            <Play /> Heard you, playing back…
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={!timerActive}
            onClick={onNextTake}
            className="px-3"
          >
            {audioActive ? (
              <>
                {indicator}
                {timerActive
                  ? `Next · ${formatDuration(elapsedMs / 1000)}`
                  : 'Listening…'}
              </>
            ) : (
              <Loader2 className="animate-spin" />
            )}
          </Button>
        )}
      </div>
      <div className="flex-1" />
      {(referencePlaying || referenceLoading) && (
        <Button
          aria-label="Stop reference"
          onClick={onStopReference}
          size="icon"
          className="bg-red-500 text-white hover:bg-red-600"
        >
          <Square className="size-4 fill-current" />
        </Button>
      )}
      {phase !== 'idle' && (
        <Button
          aria-label="End session"
          onClick={onEndSession}
          size="icon"
          className="bg-red-500 text-white hover:bg-red-600"
        >
          <Square className="size-4 fill-current" />
        </Button>
      )}
    </div>
  )
}
