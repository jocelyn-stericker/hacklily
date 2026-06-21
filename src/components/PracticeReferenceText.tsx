// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { Loader2, Play, StopCircle } from 'lucide-react'

import { cn } from '#/lib/utils'

import { TooltipButton } from './ui/tooltipButton'

export function PracticeReferenceText({
  segments,
  passageId,
  voiceId,
  activePassageId,
  activeSegmentIndex,
  currentSentenceIndex,
  onToggle,
}: {
  segments: readonly string[]
  passageId: string
  voiceId: string
  activePassageId: string | null
  activeSegmentIndex: number | null
  /** Index of the current sentence the loop is on (for passages). -1 = none. */
  currentSentenceIndex: number
  onToggle: (passageId: string, segmentIndex: number, voiceId: string) => void
}) {
  return (
    <div className="space-y-1">
      {segments.map((sentence, i) => {
        const isActive =
          activePassageId === passageId && activeSegmentIndex === i
        const isCurrent = currentSentenceIndex === i
        return (
          <span key={i} className="contents">
            <span
              role="button"
              tabIndex={0}
              onClick={() => onToggle(passageId, i, voiceId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onToggle(passageId, i, voiceId)
                }
              }}
              className={cn(
                'rounded px-0.5 -mx-0.5 cursor-pointer transition-colors border-x border-transparent',
                'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isActive && 'bg-primary/10 hover:bg-primary/15',
                // Current sentence (the one the loop is on): a left accent
                // border so it's distinguishable from the playing highlight.
                isCurrent && 'border-sky-400 pl-1 -ml-1',
              )}
            >
              {sentence}
            </span>{' '}
          </span>
        )
      })}
    </div>
  )
}

export function PracticeReferenceDrillButton({
  passageId,
  segmentIndex,
  voiceId,
  activePassageId,
  activeSegmentIndex,
  playing,
  loading,
  onToggle,
}: {
  passageId: string
  segmentIndex: number
  voiceId: string
  activePassageId: string | null
  activeSegmentIndex: number | null
  playing: boolean
  loading: boolean
  onToggle: (passageId: string, segmentIndex: number, voiceId: string) => void
}) {
  const isActive =
    activePassageId === passageId && activeSegmentIndex === segmentIndex
  const isPlaying = isActive && playing
  const isLoading = isActive && loading
  return (
    <TooltipButton
      label={isPlaying ? 'Stop reference' : 'Play reference for sentence'}
      variant="outline"
      size="icon"
      className="mt-1 shrink-0"
      onClick={() => onToggle(passageId, segmentIndex, voiceId)}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : isPlaying ? (
        <StopCircle className="size-4" />
      ) : (
        <Play className="size-4" />
      )}
    </TooltipButton>
  )
}
