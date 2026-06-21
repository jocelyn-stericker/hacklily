// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import {
  ChartSpline,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  StopCircle,
} from 'lucide-react'

import { TooltipButton } from './ui/tooltipButton'

export function PracticeCurrentSentence({
  sentence,
  sentenceIndex,
  sentenceCount,
  playing,
  loading,
  compact,
  onPlay,
  onAnalyze,
  onPrevious,
  onNext,
}: {
  sentence: string | null
  sentenceIndex: number
  sentenceCount: number
  playing: boolean
  loading: boolean
  /** When true, hide the sentence text and prev/next (used for drills, where
   *  the drill pager already shows the sentence + navigation). */
  compact: boolean
  onPlay: () => void
  onAnalyze: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Reference</span>
        {sentenceCount > 0 && (
          <span className="text-muted-foreground tabular-nums">
            {sentenceIndex + 1} of {sentenceCount}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <TooltipButton
            label="Analyze reference"
            variant="ghost"
            size="icon-sm"
            onClick={onAnalyze}
          >
            <ChartSpline className="size-3" />
          </TooltipButton>
          <TooltipButton
            label={playing ? 'Stop reference' : 'Play reference for sentence'}
            variant="ghost"
            size="icon-sm"
            onClick={onPlay}
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : playing ? (
              <StopCircle className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
          </TooltipButton>
        </div>
      </div>
      {!compact && sentence && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {sentence}
        </p>
      )}
      {!compact && sentenceCount > 1 && (
        <div className="flex items-center justify-between">
          <TooltipButton
            label="Previous sentence"
            variant="ghost"
            size="icon-sm"
            onClick={onPrevious}
          >
            <ChevronLeft className="size-3" />
          </TooltipButton>
          <TooltipButton
            label="Next sentence"
            variant="ghost"
            size="icon-sm"
            onClick={onNext}
          >
            <ChevronRight className="size-3" />
          </TooltipButton>
        </div>
      )}
    </div>
  )
}
