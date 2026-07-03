// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { Loader2, Pause, Play, StopCircle } from 'lucide-react'

import { formatKeys } from '#/components/shortcuts'
import { cn } from '#/lib/utils'

import { TooltipButton } from './ui/tooltipButton'

export function PracticeReferenceText({
  segments,
  passageId,
  voiceId,
  activePassageId,
  activeSegmentIndex,
  currentSentenceIndex,
  playing,
  loading,
  onToggle,
  onToggleAndRecord,
}: {
  segments: readonly string[]
  passageId: string
  voiceId: string
  activePassageId: string | null
  activeSegmentIndex: number | null
  /** Index of the current sentence the loop is on (for passages). -1 = none. */
  currentSentenceIndex: number
  /** True when the active reference segment is playing. */
  playing: boolean
  /** True when the active reference segment is buffering. */
  loading: boolean
  onToggle: (passageId: string, segmentIndex: number, voiceId: string) => void
  /**
   * Ctrl/Cmd+click (or Ctrl/Cmd+Enter/Space) on a sentence: play its reference
   * and then start recording a take. Plain activation still just toggles play.
   */
  onToggleAndRecord: (
    passageId: string,
    segmentIndex: number,
    voiceId: string,
  ) => void
}) {
  const mod = formatKeys('mod')
  return (
    <div className="space-y-1">
      {segments.map((sentence, i) => {
        const isActive =
          activePassageId === passageId && activeSegmentIndex === i
        const isCurrent = currentSentenceIndex === i
        const isPlaying = isActive && playing
        const isLoading = isActive && loading
        return (
          <span key={i} className="contents">
            <span
              role="button"
              tabIndex={0}
              title={`Click to play reference · ${mod}-click to record a take`}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  onToggleAndRecord(passageId, i, voiceId)
                } else {
                  onToggle(passageId, i, voiceId)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (e.ctrlKey || e.metaKey) {
                    onToggleAndRecord(passageId, i, voiceId)
                  } else {
                    onToggle(passageId, i, voiceId)
                  }
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
            </span>
            <span
              aria-hidden
              className="inline-flex align-baseline select-none text-muted-foreground/60 pl-0.5"
            >
              <TooltipButton
                label={`${isPlaying ? 'Pause reference' : 'Play reference'} · ${mod}-click to record a take`}
                variant="ghost"
                size="icon-sm"
                tabIndex={-1}
                className="size-5 -my-1 align-baseline"
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    onToggleAndRecord(passageId, i, voiceId)
                  } else {
                    onToggle(passageId, i, voiceId)
                  }
                }}
              >
                {isLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="size-3" />
                ) : (
                  <Play className="size-3" />
                )}
              </TooltipButton>
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
  onToggleAndRecord,
}: {
  passageId: string
  segmentIndex: number
  voiceId: string
  activePassageId: string | null
  activeSegmentIndex: number | null
  playing: boolean
  loading: boolean
  onToggle: (passageId: string, segmentIndex: number, voiceId: string) => void
  /** Ctrl/Cmd+click: play the reference and then start recording a take. */
  onToggleAndRecord: (
    passageId: string,
    segmentIndex: number,
    voiceId: string,
  ) => void
}) {
  const isActive =
    activePassageId === passageId && activeSegmentIndex === segmentIndex
  const isPlaying = isActive && playing
  const isLoading = isActive && loading
  const mod = formatKeys('mod')
  return (
    <TooltipButton
      label={`${isPlaying ? 'Stop reference' : 'Play reference'} · ${mod}-click to record a take`}
      variant="outline"
      size="icon"
      className="mt-1 shrink-0"
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          onToggleAndRecord(passageId, segmentIndex, voiceId)
        } else {
          onToggle(passageId, segmentIndex, voiceId)
        }
      }}
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
