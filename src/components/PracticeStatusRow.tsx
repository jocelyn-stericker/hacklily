// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { Mic, Play, Square } from 'lucide-react'

import { formatDuration } from '#/lib/utils.ts'

import { Button } from './ui/button'

export function PracticeStatusRow({
  phase,
  playing,
  timerActive,
  elapsedMs,
  onStartSession,
  onNextTake,
  onEndSession,
  numTakes,
}: {
  phase: 'idle' | 'recording' | 'playback'
  playing: boolean
  timerActive: boolean
  elapsedMs: number
  level: number
  voiced: boolean
  onStartSession: () => void
  onNextTake: () => void
  onEndSession: () => void
  numTakes: number
}) {
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-4">
        <Button size="lg" onClick={onStartSession}>
          <Mic />
          {numTakes > 0 ? 'Resume recording' : 'Start recording'}
        </Button>
        {numTakes > 0 ? null : (
          <p className="max-w-md text-center text-xs text-muted-foreground">
            Recording and analysis happen in your browser; nothing is uploaded.
            Takes are kept in memory and discarded when you leave the page.
          </p>
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

  return (
    <div className="relative flex items-center px-4 py-3 gap-2">
      <div className="flex items-center gap-2 shrink-0 z-1">
        {playing ? (
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
            {indicator}
            {timerActive
              ? `Next · ${formatDuration(elapsedMs / 1000)}`
              : 'Listening…'}
          </Button>
        )}
      </div>
      <div className="flex-1" />
      <Button
        aria-label="End session"
        onClick={onEndSession}
        size="icon"
        className="bg-red-500 text-white hover:bg-red-600"
      >
        <Square className="size-4 fill-current" />
      </Button>
    </div>
  )
}
