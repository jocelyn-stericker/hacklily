// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import {
  ChartSpline,
  ChevronUp,
  GripHorizontal,
  Pin,
  Play,
  StopCircle,
} from 'lucide-react'

import { Button } from '#/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '#/components/ui/drawer'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import type { PracticeTake } from '#/lib/practiceState'
import { cn, formatDuration } from '#/lib/utils'

import { TooltipButton } from './ui/tooltipButton'

export function PracticeTakeRow({
  take,
  isLatest,
  referenceTakeId,
  playingTakeId,
  onPlay,
  onAnalyze,
  onPin,
}: {
  take: PracticeTake
  isLatest: boolean
  referenceTakeId: number | null
  playingTakeId: number | null
  onPlay: (take: PracticeTake) => void
  onAnalyze: (take: PracticeTake) => void
  onPin: (takeId: number) => void
}) {
  const isReference = referenceTakeId === take.id
  const isPlaying = playingTakeId === take.id

  const approxDuration = formatDuration(
    take.voicedRange.endSec - take.voicedRange.startSec,
  )

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors',
        isReference && 'bg-muted/30',
      )}
    >
      <span className="text-sm font-medium tabular-nums">#{take.id}</span>
      <span className="text-sm tabular-nums text-muted-foreground">
        {approxDuration}
      </span>
      {isLatest && (
        <span className="text-xs text-muted-foreground">just now</span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <TooltipButton
          label={isPlaying ? 'Stop' : 'Play'}
          variant="ghost"
          size="icon-sm"
          onClick={() => onPlay(take)}
        >
          {isPlaying ? (
            <StopCircle className="size-3" />
          ) : (
            <Play className="size-3" />
          )}
        </TooltipButton>
        <TooltipButton
          label="Analyze"
          variant="ghost"
          size="icon-sm"
          onClick={() => onAnalyze(take)}
        >
          <ChartSpline className="size-3" />
        </TooltipButton>
        <TooltipButton
          label={isReference ? 'Unpin reference' : 'Pin as reference'}
          variant="ghost"
          size="icon-sm"
          onClick={() => onPin(take.id)}
        >
          <Pin
            className={cn(
              'size-3',
              isReference
                ? 'fill-sky-400 text-sky-400'
                : 'text-muted-foreground',
            )}
          />
        </TooltipButton>
      </div>
    </div>
  )
}

export function PracticeTakesList({
  takes,
  referenceTakeId,
  playingTakeId,
  onPlayTake,
  onAnalyzeTake,
  onPinTake,
  onClearSession,
}: {
  takes: PracticeTake[]
  referenceTakeId: number | null
  playingTakeId: number | null
  onPlayTake: (take: PracticeTake) => void
  onAnalyzeTake: (take: PracticeTake) => void
  onPinTake: (takeId: number) => void
  onClearSession: () => void
}) {
  const referenceTake = takes.find((t) => t.id === referenceTakeId)

  return (
    <>
      {referenceTake && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Pin className="size-4 fill-sky-400 text-sky-400" />
            <span className="font-medium">Reference</span>
            <span className="text-muted-foreground tabular-nums">
              #{referenceTake.id}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <TooltipButton
                label="Play"
                variant="ghost"
                size="icon-sm"
                onClick={() => onPlayTake(referenceTake)}
              >
                <Play className="size-3" />
              </TooltipButton>
            </div>
          </div>
        </div>
      )}
      {takes.map((t, i) => (
        <PracticeTakeRow
          key={t.id}
          take={t}
          isLatest={i === 0}
          referenceTakeId={referenceTakeId}
          playingTakeId={playingTakeId}
          onPlay={onPlayTake}
          onAnalyze={onAnalyzeTake}
          onPin={onPinTake}
        />
      ))}
      {takes.length > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" onClick={onClearSession}>
                Clear session
              </Button>
            }
          />
          <TooltipContent sideOffset={8}>
            Remove all takes from this session
          </TooltipContent>
        </Tooltip>
      )}
      {takes.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No takes yet. Record your first take to get started.
        </p>
      )}
    </>
  )
}

export function PracticeLatestTakeRow({
  latestTake,
  playingTakeId,
  referenceTakeId,
  takeCount,
  onPlayTake,
  onPinTake,
}: {
  latestTake: PracticeTake | undefined
  playingTakeId: number | null
  referenceTakeId: number | null
  takeCount: number
  onPlayTake: (take: PracticeTake) => void
  onPinTake: (takeId: number) => void
}) {
  if (!latestTake) {
    return (
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center border-t border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <span>No takes yet</span>
          <span className="ml-auto flex items-center gap-1 text-xs">
            Takes
            <ChevronUp className="size-4" />
          </span>
        </button>
      </DrawerTrigger>
    )
  }

  const isPlaying = playingTakeId === latestTake.id
  const isReference = referenceTakeId === latestTake.id
  const vr = latestTake.voicedRange
  const duration = formatDuration(vr.endSec - vr.startSec)

  return (
    <div className="flex items-center gap-1 border-t border-border px-2">
      <TooltipButton
        label={isPlaying ? 'Stop' : 'Play'}
        variant="ghost"
        size="icon"
        onClick={() => onPlayTake(latestTake)}
      >
        {isPlaying ? (
          <StopCircle className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </TooltipButton>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-md px-2 py-3 text-sm hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <span className="font-medium tabular-nums">#{latestTake.id}</span>
          <span className="tabular-nums text-muted-foreground">{duration}</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            Takes ({takeCount})
            <ChevronUp className="size-4" />
          </span>
        </button>
      </DrawerTrigger>
      <TooltipButton
        label={isReference ? 'Unpin reference' : 'Pin as reference'}
        variant="ghost"
        size="icon"
        onClick={() => onPinTake(latestTake.id)}
      >
        <Pin
          className={cn(
            'size-4',
            isReference ? 'fill-sky-400 text-sky-400' : 'text-muted-foreground',
          )}
        />
      </TooltipButton>
    </div>
  )
}

export function PracticeTakesDrawer({
  open,
  onOpenChange,
  takes,
  referenceTakeId,
  playingTakeId,
  takeCount,
  onPlayTake,
  onAnalyzeTake,
  onPinTake,
  onClearSession,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  takes: PracticeTake[]
  referenceTakeId: number | null
  playingTakeId: number | null
  takeCount: number
  onPlayTake: (take: PracticeTake) => void
  onAnalyzeTake: (take: PracticeTake) => void
  onPinTake: (takeId: number) => void
  onClearSession: () => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <PracticeLatestTakeRow
        latestTake={takes[0]}
        playingTakeId={playingTakeId}
        referenceTakeId={referenceTakeId}
        takeCount={takeCount}
        onPlayTake={onPlayTake}
        onPinTake={onPinTake}
      />
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-center gap-2">
            <GripHorizontal className="size-4 text-muted-foreground" />
            Takes ({takeCount})
          </DrawerTitle>
          <DrawerDescription />
        </DrawerHeader>
        <div className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
          <PracticeTakesList
            takes={takes}
            referenceTakeId={referenceTakeId}
            playingTakeId={playingTakeId}
            onPlayTake={onPlayTake}
            onAnalyzeTake={onAnalyzeTake}
            onPinTake={onPinTake}
            onClearSession={onClearSession}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function PracticeTakesSidebar({
  takes,
  referenceTakeId,
  playingTakeId,
  takeCount,
  onPlayTake,
  onAnalyzeTake,
  onPinTake,
  onClearSession,
}: {
  takes: PracticeTake[]
  referenceTakeId: number | null
  playingTakeId: number | null
  takeCount: number
  onPlayTake: (take: PracticeTake) => void
  onAnalyzeTake: (take: PracticeTake) => void
  onPinTake: (takeId: number) => void
  onClearSession: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-sm font-medium">Takes ({takeCount})</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 px-4 py-3">
          <PracticeTakesList
            takes={takes}
            referenceTakeId={referenceTakeId}
            playingTakeId={playingTakeId}
            onPlayTake={onPlayTake}
            onAnalyzeTake={onAnalyzeTake}
            onPinTake={onPinTake}
            onClearSession={onClearSession}
          />
        </div>
      </div>
    </>
  )
}
