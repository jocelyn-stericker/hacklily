// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { TooltipButton } from './ui/tooltipButton'

export function PracticeDrillPager({
  sentenceIndex,
  sentenceCount,
  onPrevious,
  onNext,
}: {
  sentenceIndex: number
  sentenceCount: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center">
        <span className="flex gap-1">
          <TooltipButton
            label="Previous sentence"
            variant="outline"
            size="icon-sm"
            onClick={onPrevious}
          >
            <ChevronLeft className="size-4" />
          </TooltipButton>
        </span>
        <span className="text-sm text-muted-foreground tabular-nums text-center w-48">
          Sentence {sentenceIndex + 1} of {sentenceCount}
        </span>
        <span className="flex gap-1">
          <TooltipButton
            label="Next sentence"
            variant="outline"
            size="icon-sm"
            onClick={onNext}
          >
            <ChevronRight className="size-4" />
          </TooltipButton>
        </span>
      </div>
    </div>
  )
}
