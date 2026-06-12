// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// A route for voice practice sessions: read a passage, record takes,
// hear them back — either automatically when you stop talking (echo mode) or on
// demand — and load any take into the main analysis view in one click. Mobile is
// the primary target.
//
// Future directions (not implemented):
//  - Persistence of takes across reloads (take model is already serialization-
//    friendly; needs OPFS/IndexedDB + quota + privacy copy).
//  - Reference-clip import (an external file as the ★ reference).
//  - Segment-event adoption in the index route (replacing its run-derivation
//    with `UtteranceTracker`).
//  - Rope segmentation for unbounded sessions (§5 option (a)).
//  - A single VAD "sensitivity" knob (item 3 of the `TODO(vad)` list).

import { createFileRoute, Link, useBlocker } from '@tanstack/react-router'
import {
  ArrowLeft,
  ChartSpline,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  GripHorizontal,
  Mic,
  Pin,
  Play,
  Settings,
  Shuffle,
  Square,
  StopCircle,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '#/components/ui/drawer'
import { Label } from '#/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useAudioPlayback } from '#/components/useAudioPlayback'
import { useMicCapture } from '#/components/useMicCapture'
import { useSettings } from '#/components/useSettings'
import type {
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import type {
  AudioRope,
  AudioRopeGrow,
  AudioRopeSeal,
  AudioRopeShare,
} from '#/lib/audio/AudioRope'
import { AudioRope as AudioRopeClass } from '#/lib/audio/AudioRope'
import type { AudioSpan } from '#/lib/audio/AudioSpan'
import { readAudioSpan } from '#/lib/audio/AudioSpan'
import { getOrCreateSharedAudioContext } from '#/lib/audio/sharedAudioContext'
import { RopeGainCache } from '#/lib/loudness/ropeLoudness'
import { passages } from '#/lib/passages'
import { stashTake } from '#/lib/practiceHandoff'
import type { PracticeTextSize } from '#/lib/settings'
import { preferredSampleRate } from '#/lib/settings'
import { assertUnreachable, cn } from '#/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VoicedRange = {
  startSec: number
  endSec: number
}

type Take = {
  id: number
  span: AudioSpan
  endTimeSec: number
  createdAt: number
  voicedRanges: VoicedRange[]
}

type PracticeState = {
  takes: Take[]
  nextTakeId: number
  referenceTakeId: number | null
  recording: boolean
  recordingStartTime: number | null
  playingTakeId: number | null
  playingSkipSilence: boolean
  sessionPhase: 'idle' | 'recording' | 'playback'
  echoWasHearing: boolean
  echoGateUntilTs: number
  pendingRestart: boolean
  error: string | null
  recordingStartFrame: number
  shuttingDown: boolean
  drillIndex: number
  sentenceCount: number
}

type PracticeAction =
  | { type: 'START_RECORDING'; startTime: number }
  | {
      type: 'STOP_RECORDING'
      span: AudioSpan
      voicedRanges: VoicedRange[]
      endTimeSec: number
    }
  | { type: 'START_PLAYBACK'; takeId: number; skipSilence: boolean }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'PIN_TAKE'; takeId: number }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_SESSION_PHASE'; phase: PracticeState['sessionPhase'] }
  | { type: 'STOP_SESSION' }
  | { type: 'ECHO_SPEECH_HEARD' }
  | { type: 'ECHO_UTTERANCE_DONE' }
  | { type: 'PENDING_RESTART' }
  | { type: 'ECHO_COOLDOWN'; untilTs: number }
  | { type: 'ECHO_GATE_BLOCK' }
  | { type: 'ECHO_RESET_GATE' }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SHUTTING_DOWN'; value: boolean }
  | { type: 'SET_DRILL_INDEX'; index: number }
  | { type: 'SET_SENTENCE_COUNT'; count: number }

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function initialPracticeState(): PracticeState {
  return {
    takes: [],
    nextTakeId: 1,
    referenceTakeId: null,
    recording: false,
    recordingStartTime: null,
    playingTakeId: null,
    playingSkipSilence: false,
    sessionPhase: 'idle',
    echoWasHearing: false,
    echoGateUntilTs: 0,
    pendingRestart: false,
    error: null,
    recordingStartFrame: 0,
    shuttingDown: false,
    drillIndex: 0,
    sentenceCount: 0,
  }
}

function practiceReducer(
  state: PracticeState,
  action: PracticeAction,
): PracticeState {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        recording: true,
        recordingStartTime: action.startTime,
        sessionPhase: 'recording',
        echoWasHearing: false,
        echoGateUntilTs: 0,
        pendingRestart: false,
        recordingStartFrame: 0,
        shuttingDown: false,
      }

    case 'STOP_RECORDING': {
      const newTake: Take = {
        id: state.nextTakeId,
        span: action.span,
        endTimeSec: action.endTimeSec,
        createdAt: Date.now(),
        voicedRanges: action.voicedRanges,
      }
      const takes = [newTake, ...state.takes]
      return {
        ...state,
        takes,
        nextTakeId: state.nextTakeId + 1,
        recording: false,
        recordingStartTime: null,
      }
    }

    case 'START_PLAYBACK':
      return {
        ...state,
        playingTakeId: action.takeId,
        playingSkipSilence: action.skipSilence,
      }

    case 'STOP_PLAYBACK':
      return { ...state, playingTakeId: null, playingSkipSilence: false }

    case 'PIN_TAKE':
      return {
        ...state,
        referenceTakeId:
          state.referenceTakeId === action.takeId ? null : action.takeId,
      }

    case 'CLEAR_SESSION':
      return initialPracticeState()

    case 'SET_SESSION_PHASE':
      return { ...state, sessionPhase: action.phase }

    case 'STOP_SESSION':
      return {
        ...state,
        sessionPhase: 'idle',
        echoWasHearing: false,
        echoGateUntilTs: 0,
        pendingRestart: false,
        shuttingDown: false,
      }

    case 'ECHO_SPEECH_HEARD':
      return { ...state, echoWasHearing: true }

    case 'ECHO_UTTERANCE_DONE':
      return {
        ...state,
        echoWasHearing: false,
        echoGateUntilTs: Infinity,
      }

    case 'PENDING_RESTART':
      return { ...state, pendingRestart: true }

    case 'ECHO_COOLDOWN':
      return { ...state, echoGateUntilTs: action.untilTs }

    case 'ECHO_GATE_BLOCK':
      return { ...state, echoGateUntilTs: Infinity }

    case 'ECHO_RESET_GATE':
      return { ...state, echoGateUntilTs: 0 }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'SET_SHUTTING_DOWN':
      return { ...state, shuttingDown: action.value }

    case 'SET_DRILL_INDEX':
      return { ...state, drillIndex: action.index }

    case 'SET_SENTENCE_COUNT':
      return { ...state, sentenceCount: action.count }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_TITLE = 'Practice — Braat'

const TEXT_SIZE_CLASS: Record<PracticeTextSize, string> = {
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
}

const TEXT_SIZE_LABELS: Record<PracticeTextSize, string> = {
  md: 'Medium',
  lg: 'Large',
  xl: 'XL',
  '2xl': '2XL',
}

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

function computeVoicedRanges(
  decisions: boolean[],
  fromIdx: number,
  toIdx: number,
  timePerFrame: number,
  baseTimeSec: number,
): VoicedRange[] {
  const ranges: VoicedRange[] = []
  let runStart = -1
  const end = Math.min(toIdx, decisions.length)
  for (let i = fromIdx; i < end; i++) {
    if (decisions[i]) {
      if (runStart === -1) runStart = i
    } else if (runStart !== -1) {
      ranges.push({
        startSec: baseTimeSec + (runStart - fromIdx) * timePerFrame,
        endSec: baseTimeSec + (i - fromIdx) * timePerFrame,
      })
      runStart = -1
    }
  }
  if (runStart !== -1) {
    ranges.push({
      startSec: baseTimeSec + (runStart - fromIdx) * timePerFrame,
      endSec: baseTimeSec + (end - fromIdx) * timePerFrame,
    })
  }
  return ranges
}

function TooltipButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button {...props} aria-label={label}>
            {children}
          </Button>
        }
      />
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Level meter
// ---------------------------------------------------------------------------

function useAnimatedLevel(intensity: number) {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: 14 }, () => 0),
  )
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, intensity))

    if (clamped > 0) {
      const animate = () => {
        setBars((prev) =>
          prev.map((v) => {
            const noise = Math.random() * 0.3
            const target = clamped * (0.5 + noise)
            return v + (target - v) * 0.25
          }),
        )
        rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
    } else {
      let decayFrames = 0
      const decay = () => {
        if (decayFrames < 30) {
          setBars((prev) => prev.map((v) => v * 0.9))
          decayFrames++
          rafRef.current = requestAnimationFrame(decay)
        }
      }
      rafRef.current = requestAnimationFrame(decay)
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [intensity])

  return intensity === 0 ? bars.map(() => 0) : bars
}

function LevelMeter({
  intensity,
  voiced = false,
}: {
  intensity: number
  voiced?: boolean
}) {
  const heights = useAnimatedLevel(intensity)
  const barRef = useRef<HTMLDivElement>(null)
  const prevVoiced = useRef(voiced)

  useLayoutEffect(() => {
    const container = barRef.current
    if (!container) return

    const justBecameVoiced = voiced && !prevVoiced.current
    const justBecameUnvoiced = !voiced && prevVoiced.current
    prevVoiced.current = voiced

    const bars = container.querySelectorAll<HTMLElement>('.level-bar')
    if (justBecameVoiced) {
      for (const bar of bars) {
        bar.style.transitionDuration = '0ms'
      }
    } else if (justBecameUnvoiced) {
      for (const bar of bars) {
        bar.style.transitionDuration = '1500ms'
      }
    }
  }, [voiced])

  return (
    <div ref={barRef} className="flex h-6 items-end gap-px">
      {heights.map((h, i) => (
        <div
          key={i}
          className={cn(
            'level-bar w-1 rounded-sm transition-colors',
            voiced ? 'bg-sky-500' : 'bg-muted-foreground/30',
          )}
          style={{ height: `${Math.max(1, h * 20)}px` }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatusRow
// ---------------------------------------------------------------------------

function StatusRow({
  phase,
  playing,
  timerActive,
  elapsedMs,
  voiced,
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
    <div className="relative flex items-center px-4 py-3">
      <div className="absolute left-0 right-0 top-0 bottom-0 flex justify-center">
        <Button
          aria-label="End session"
          onClick={onEndSession}
          size="icon-lg"
          className="rounded-full bg-red-500 text-white hover:bg-red-600 self-center"
        >
          <Square className="size-4 fill-current" />
        </Button>
      </div>
      <div className="flex items-center gap-2 shrink-0 z-1">
        {playing ? (
          <Button variant="outline" disabled={true} size="sm" className="px-3">
            <Play />
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={!timerActive}
            onClick={onNextTake}
            size="sm"
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
      <LevelMeter intensity={voiced ? 1.0 : 0.0} voiced={voiced} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings popover
// ---------------------------------------------------------------------------

function PracticeSettings({
  textSize,
  onTextSizeChange,
  mode,
  onModeChange,
  onOpenAudioSettings,
}: {
  textSize: PracticeTextSize
  onTextSizeChange: (size: PracticeTextSize) => void
  mode: 'echo' | 'on-demand'
  onModeChange: (m: 'echo' | 'on-demand') => void
  onOpenAudioSettings: () => void
}) {
  const sizes: PracticeTextSize[] = ['md', 'lg', 'xl', '2xl']
  const idx = sizes.indexOf(textSize)

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Practice settings"
                />
              }
            />
          }
        >
          <Settings className="size-4" />
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>Settings</TooltipContent>
      </Tooltip>
      <PopoverContent side="bottom" align="end" sideOffset={8} className="w-56">
        <div className="px-2">
          <div className="flex items-center justify-between pb-2">
            <Label className="text-xs">Text size</Label>
            <span className="text-xs text-muted-foreground">
              {TEXT_SIZE_LABELS[textSize]}
            </span>
          </div>
          <Slider
            value={idx}
            onValueChange={(value) => {
              onTextSizeChange(sizes[value as number]!)
            }}
            min={0}
            max={sizes.length - 1}
            step={1}
            aria-label="Text size"
            className="mt-1"
          />
        </div>
        <div className="pt-3 px-2 flex items-center justify-between">
          <Label className="text-xs">Stop take when I stop speaking</Label>
          <div className="flex items-center gap-2">
            <Switch
              checked={mode === 'echo'}
              onCheckedChange={(checked) =>
                onModeChange(checked ? 'echo' : 'on-demand')
              }
            />
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={onOpenAudioSettings}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Mic className="size-4" />
            Audio settings
          </button>
          <a
            href="https://codeberg.org/jocelyn-stericker/braat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground! hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ExternalLink className="size-4" />
            Source code & issues
          </a>
        </div>
        <div className="border-t border-border pt-3 space-y-2">
          <p className="px-2 text-xs text-muted-foreground leading-relaxed">
            This is free software, released under the{' '}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              GNU AGPL v3 or (at your option) any later version
            </a>
          </p>
          <p className="px-2 text-xs text-muted-foreground leading-relaxed">
            Made by Jocelyn Stericker 🇨🇦
            <br />
            <a
              href="mailto:jocelyn@nettek.ca"
              className="underline underline-offset-4 hover:text-foreground"
            >
              jocelyn@nettek.ca
            </a>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Drill pager
// ---------------------------------------------------------------------------

function DrillPager({
  sentenceIndex,
  sentenceCount,
  autoAdvance,
  onAutoAdvanceChange,
  randomize,
  onRandomizeChange,
  onPrevious,
  onNext,
}: {
  sentenceIndex: number
  sentenceCount: number
  autoAdvance: boolean
  onAutoAdvanceChange: (v: boolean) => void
  randomize: boolean
  onRandomizeChange: (v: boolean) => void
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <TooltipButton
          label="Previous sentence"
          variant="outline"
          size="icon-sm"
          disabled={sentenceIndex === 0}
          onClick={onPrevious}
        >
          <ChevronLeft className="size-4" />
        </TooltipButton>
        <span className="text-sm text-muted-foreground tabular-nums">
          Sentence {sentenceIndex + 1} of {sentenceCount}
        </span>
        <TooltipButton
          label="Next sentence"
          variant="outline"
          size="icon-sm"
          disabled={sentenceIndex === sentenceCount - 1}
          onClick={onNext}
        >
          <ChevronRight className="size-4" />
        </TooltipButton>
      </div>
      <div className="flex items-center justify-center gap-x-6 gap-y-2 flex-wrap">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={autoAdvance} onCheckedChange={onAutoAdvanceChange} />
          Next sentence after each take
        </Label>
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={randomize} onCheckedChange={onRandomizeChange} />
          <Shuffle className="size-3" />
          Randomize
        </Label>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Takes UI
// ---------------------------------------------------------------------------

function PassageFooter({
  source,
  sourceUrl,
  attribution,
}: {
  source?: string
  sourceUrl?: string
  attribution?: string
}) {
  if (!source && !attribution) return null
  return (
    <footer className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
      {source && (
        <p>
          Source:{' '}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {source}
            </a>
          ) : (
            source
          )}
        </p>
      )}
      {attribution && <p>{attribution}</p>}
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Practice — sub-components
// ---------------------------------------------------------------------------

function PracticeTakeRow({
  take,
  isLatest,
  referenceTakeId,
  playingTakeId,
  onPlay,
  onAnalyze,
  onStar,
}: {
  take: Take
  isLatest: boolean
  referenceTakeId: number | null
  playingTakeId: number | null
  onPlay: (take: Take) => void
  onAnalyze: (take: Take) => void
  onStar: (takeId: number) => void
}) {
  const isReference = referenceTakeId === take.id
  const isPlaying = playingTakeId === take.id

  const approxDuration =
    take.voicedRanges.length > 0
      ? formatDuration(
          take.voicedRanges[take.voicedRanges.length - 1]!.endSec -
            take.voicedRanges[0]!.startSec,
        )
      : '…'

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
          label={isReference ? 'Unpin reference' : 'Star as reference'}
          variant="ghost"
          size="icon-sm"
          onClick={() => onStar(take.id)}
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

function PracticeTakesList({
  takes,
  referenceTakeId,
  playingTakeId,
  onPlayTake,
  onAnalyzeTake,
  onStarTake,
  onClearSession,
}: {
  takes: Take[]
  referenceTakeId: number | null
  playingTakeId: number | null
  onPlayTake: (take: Take) => void
  onAnalyzeTake: (take: Take) => void
  onStarTake: (takeId: number) => void
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
          onStar={onStarTake}
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

function PracticeLatestTakeRow({
  latestTake,
  playingTakeId,
  referenceTakeId,
  takeCount,
  onPlayTake,
  onStarTake,
}: {
  latestTake: Take | undefined
  playingTakeId: number | null
  referenceTakeId: number | null
  takeCount: number
  onPlayTake: (take: Take) => void
  onStarTake: (takeId: number) => void
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
  const vr = latestTake.voicedRanges
  const duration =
    vr.length > 0
      ? formatDuration(vr[vr.length - 1]!.endSec - vr[0]!.startSec)
      : '…'

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
        label={isReference ? 'Unpin reference' : 'Star as reference'}
        variant="ghost"
        size="icon"
        onClick={() => onStarTake(latestTake.id)}
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

function PracticeTakesDrawer({
  open,
  onOpenChange,
  takes,
  referenceTakeId,
  playingTakeId,
  takeCount,
  onPlayTake,
  onAnalyzeTake,
  onStarTake,
  onClearSession,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  takes: Take[]
  referenceTakeId: number | null
  playingTakeId: number | null
  takeCount: number
  onPlayTake: (take: Take) => void
  onAnalyzeTake: (take: Take) => void
  onStarTake: (takeId: number) => void
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
        onStarTake={onStarTake}
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
            onStarTake={onStarTake}
            onClearSession={onClearSession}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function PracticeTakesSidebar({
  takes,
  referenceTakeId,
  playingTakeId,
  takeCount,
  onPlayTake,
  onAnalyzeTake,
  onStarTake,
  onClearSession,
}: {
  takes: Take[]
  referenceTakeId: number | null
  playingTakeId: number | null
  takeCount: number
  onPlayTake: (take: Take) => void
  onAnalyzeTake: (take: Take) => void
  onStarTake: (takeId: number) => void
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
            onStarTake={onStarTake}
            onClearSession={onClearSession}
          />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Practice — main component
// ---------------------------------------------------------------------------

function Practice() {
  const [settings, updateSettings] = useSettings()
  const [state, dispatch] = useReducer(
    practiceReducer,
    undefined,
    initialPracticeState,
  )
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  })
  const [, forceRender] = useState(0)

  const micActive = state.sessionPhase === 'recording'
  const [voicedStartMs, setVoicedStartMs] = useState<number | null>(null)
  const voicedStartMsRef = useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [displayLevel, setDisplayLevel] = useState({
    intensity: 0,
    voiced: false,
  })

  // UI toggles
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [takesDrawerOpen, setTakesDrawerOpen] = useState(false)
  const [confirmingClearSession, setConfirmingClearSession] = useState(false)

  const blocker = useBlocker({
    shouldBlockFn: () => state.takes.length > 0,
    enableBeforeUnload: true,
    withResolver: true,
  })

  // Refs — mutable state that shouldn't trigger re-renders
  const sessionRopeRef = useRef<AudioRopeClass | null>(null)
  const frameCountRef = useRef(0)
  const decisionsRef = useRef<boolean[]>([])
  const paramsRef = useRef<AnalysisParams | null>(null)
  const levelRef = useRef({ rms: 0, speechDetected: false })
  const [gainCache] = useState(() => new RopeGainCache())
  const pipelineDoneResolveRef = useRef<(() => void) | null>(null)
  const modeRef = useRef<'echo' | 'on-demand'>('echo')
  const handleNextTakeRef = useRef<(() => Promise<void>) | null>(null)

  const passageId = settings.practicePassageId
  const autoAdvance = settings.practiceAutoAdvance
  const mode = settings.practiceMode
  const randomize = settings.practiceRandomize

  // Start mic pipeline + new recording
  const startPipelineAndRecord = useCallback(() => {
    frameCountRef.current = 0
    decisionsRef.current = []
    sessionRopeRef.current = null
    paramsRef.current = null
    levelRef.current = { rms: 0, speechDetected: false }
    voicedStartMsRef.current = null
    setVoicedStartMs(null)
    dispatch({ type: 'START_RECORDING', startTime: Date.now() })
  }, [])

  // Tear down mic pipeline, resolving once VAD is fully computed
  const closePipeline = useCallback(() => {
    return new Promise<void>((resolve) => {
      pipelineDoneResolveRef.current = resolve
      dispatch({ type: 'SET_SESSION_PHASE', phase: 'playback' })
    })
  }, [])

  // When playback ends, either shut down or restart pipeline for next take
  const handlePlaybackEnd = useCallback(() => {
    if (stateRef.current.shuttingDown) {
      dispatch({ type: 'SET_SHUTTING_DOWN', value: false })
      dispatch({ type: 'STOP_PLAYBACK' })
      return
    }
    dispatch({ type: 'STOP_PLAYBACK' })
    const pendingRestart = stateRef.current.pendingRestart
    if (pendingRestart) {
      if (autoAdvance && stateRef.current.sentenceCount > 0) {
        const next = Math.min(
          stateRef.current.sentenceCount - 1,
          stateRef.current.drillIndex + 1,
        )
        dispatch({ type: 'SET_DRILL_INDEX', index: next })
      }
      startPipelineAndRecord()
      dispatch({
        type: 'ECHO_COOLDOWN',
        untilTs: performance.now() + 250,
      })
    } else {
      dispatch({ type: 'STOP_SESSION' })
    }
  }, [autoAdvance, startPipelineAndRecord])

  const preferredRate = preferredSampleRate(settings)

  const playbackTake =
    state.playingTakeId !== null
      ? (state.takes.find((t) => t.id === state.playingTakeId) ?? null)
      : null

  const playbackCursorSec = useMemo(() => {
    if (!playbackTake) return 0
    const vr = playbackTake.voicedRanges
    return vr.length > 0 ? vr[0]!.startSec : playbackTake.span.startTime
  }, [playbackTake])

  const playbackEndAtSec = useMemo(() => {
    if (!playbackTake) return undefined
    const vr = playbackTake.voicedRanges
    return vr.length > 0 ? vr[vr.length - 1]!.endSec : playbackTake.endTimeSec
  }, [playbackTake])

  const playbackRopes = useMemo<AudioRope[]>(
    () => (playbackTake ? [playbackTake.span.rope] : []),
    [playbackTake],
  )

  useAudioPlayback({
    enabled: state.playingTakeId !== null,
    ropes: playbackRopes,
    gainCache,
    cursorSec: playbackCursorSec,
    endAtSec: playbackEndAtSec,
    onStop: handlePlaybackEnd,
    onPlaybackPositionChanged: () => {},
  })

  // Document title
  useEffect(() => {
    document.title = PAGE_TITLE
    return () => {
      document.title = 'Braat'
    }
  }, [])

  // Level meter polling
  useEffect(() => {
    if (!micActive) return
    const id = setInterval(() => {
      const { rms, speechDetected } = levelRef.current
      const intensity = Math.min(1, Math.sqrt(rms) * 5)
      if (speechDetected && voicedStartMsRef.current === null) {
        voicedStartMsRef.current = Date.now()
        setVoicedStartMs(voicedStartMsRef.current)
      }
      setDisplayLevel({ intensity, voiced: speechDetected })
    }, 60)
    return () => clearInterval(id)
  }, [micActive])

  // Elapsed timer during recording — only starts once the first voiced frame is detected
  useEffect(() => {
    if (!state.recording || voicedStartMs === null) return
    const tick = () => setElapsedMs(Date.now() - voicedStartMs)
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [state.recording, voicedStartMs])

  // Mic capture callbacks
  const handleChunkStart = useCallback((params: AnalysisParams) => {
    paramsRef.current = params
  }, [])

  const handleAppend = useCallback((frame: AnalysisFrame) => {
    const idx = frameCountRef.current
    frameCountRef.current = idx + 1
    // Ensure decisions array is large enough
    while (decisionsRef.current.length <= idx) {
      decisionsRef.current.push(false)
    }
    decisionsRef.current[idx] = frame.speechDetected
    // Update level meter
    levelRef.current = { rms: frame.rms, speechDetected: frame.speechDetected }

    // Echo mode: auto-detect utterance end
    if (modeRef.current === 'echo') {
      if (frame.speechDetected) {
        if (!stateRef.current.echoWasHearing) {
          dispatch({ type: 'ECHO_SPEECH_HEARD' })
        }
      } else if (
        stateRef.current.echoWasHearing &&
        performance.now() > stateRef.current.echoGateUntilTs
      ) {
        dispatch({ type: 'ECHO_UTTERANCE_DONE' })
        void handleNextTakeRef.current?.()
      }
    }
  }, [])

  const handlePatch = useCallback((_from: number, _to: number) => {
    // Frames in the pipeline are mutated in-place. With redemptionMs=1500,
    // patches revert optimistic speech→silence after the 1.5s window. Our
    // decisionsRef values from onAppend go stale for those frames, so
    // voicedRanges computed at STOP will be slightly too large until the
    // pipeline API emits updated speechDetected values in patch events.
  }, [])

  const handleRecordingComplete = useCallback(() => {
    pipelineDoneResolveRef.current?.()
    pipelineDoneResolveRef.current = null
  }, [])

  const handleError = useCallback((err: string) => {
    dispatch({ type: 'SET_ERROR', error: err })
  }, [])

  const handleAudioRopeShare = useCallback((share: AudioRopeShare) => {
    sessionRopeRef.current = new AudioRopeClass(share)
  }, [])

  const handleAudioRopeGrow = useCallback((grow: AudioRopeGrow) => {
    sessionRopeRef.current?.grow(grow)
  }, [])

  const handleAudioRopeSeal = useCallback((_seal: AudioRopeSeal) => {
    sessionRopeRef.current?.seal()
  }, [])

  // useMicCapture — runs for the whole session
  useMicCapture({
    enabled: micActive,
    features: {
      spectrogram: false,
      formant: false,
      vad: {
        redemptionMs: settings.practiceMode === 'on-demand' ? 80 : 1500,
        prerollMs: 500,
      },
    },
    onAppend: handleAppend,
    onChunkStart: handleChunkStart,
    onPatch: handlePatch,
    onRecordingComplete: handleRecordingComplete,
    onError: handleError,
    onAudioRopeGrow: handleAudioRopeGrow,
    onAudioRopeShare: handleAudioRopeShare,
    onAudioRopeSeal: handleAudioRopeSeal,
  })

  // Start session — immediately begin recording the first take
  const handleStartSession = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null })
    getOrCreateSharedAudioContext(preferredRate)
    startPipelineAndRecord()
  }, [startPipelineAndRecord, preferredRate])

  // End session — stop mic and playback, but keep takes
  const handleEndSession = useCallback(() => {
    if (stateRef.current.shuttingDown) return
    dispatch({ type: 'SET_SHUTTING_DOWN', value: true })
    dispatch({ type: 'STOP_PLAYBACK' })
    dispatch({ type: 'ECHO_GATE_BLOCK' })

    void (async () => {
      if (
        stateRef.current.recording &&
        (stateRef.current.echoWasHearing || modeRef.current === 'on-demand')
      ) {
        await closePipeline()

        const startFrame = stateRef.current.recordingStartFrame
        const endFrame = frameCountRef.current
        const params = paramsRef.current
        const rope = sessionRopeRef.current
        const decisions = decisionsRef.current.slice()

        if (rope && params) {
          const timePerFrame = params.timeStepSamples / params.sampleRate
          const baseTimeSec = startFrame * timePerFrame
          const endTimeSec = endFrame * timePerFrame
          const voicedRanges = computeVoicedRanges(
            decisions,
            startFrame,
            endFrame,
            timePerFrame,
            baseTimeSec,
          )
          const span: AudioSpan = {
            rope,
            startTime: baseTimeSec,
            endTime: Promise.resolve(endTimeSec),
            signal: new AbortController().signal,
          }
          dispatch({ type: 'STOP_RECORDING', span, voicedRanges, endTimeSec })
          forceRender((n) => n + 1)
        }
      }

      dispatch({ type: 'STOP_SESSION' })
      setElapsedMs(0)
    })()
  }, [closePipeline])

  // Finish current take, tear down pipeline, then play back
  const handleNextTake = useCallback(async () => {
    if (!state.recording) return

    const startFrame = stateRef.current.recordingStartFrame
    const endFrame = frameCountRef.current
    const params = paramsRef.current
    const rope = sessionRopeRef.current
    const decisions = decisionsRef.current.slice()

    if (!rope || !params) return

    await closePipeline()

    const timePerFrame = params.timeStepSamples / params.sampleRate
    const baseTimeSec = startFrame * timePerFrame
    const endTimeSec = endFrame * timePerFrame
    const voicedRanges = computeVoicedRanges(
      decisions,
      startFrame,
      endFrame,
      timePerFrame,
      baseTimeSec,
    )

    const span: AudioSpan = {
      rope,
      startTime: baseTimeSec,
      endTime: Promise.resolve(endTimeSec),
      signal: new AbortController().signal,
    }

    const takeId = state.nextTakeId
    dispatch({ type: 'STOP_RECORDING', span, voicedRanges, endTimeSec })
    dispatch({ type: 'START_PLAYBACK', takeId, skipSilence: true })
    dispatch({ type: 'PENDING_RESTART' })
    forceRender((n) => n + 1)
  }, [state.recording, state.nextTakeId, closePipeline])

  // Play a take
  const handlePlayTake = useCallback(
    (take: Take, skipSilence: boolean) => {
      if (state.playingTakeId === take.id) {
        dispatch({ type: 'STOP_PLAYBACK' })
        dispatch({ type: 'ECHO_RESET_GATE' })
        return
      }
      getOrCreateSharedAudioContext(preferredRate)
      dispatch({ type: 'ECHO_GATE_BLOCK' })
      dispatch({ type: 'START_PLAYBACK', takeId: take.id, skipSilence })
    },
    [state.playingTakeId, preferredRate],
  )

  // Star a take as reference
  const handleStarTake = useCallback((takeId: number) => {
    dispatch({ type: 'PIN_TAKE', takeId })
  }, [])

  const handleAnalyzeTake = useCallback(async (take: Take) => {
    const newWindow = window.open('/', '_blank')
    if (!newWindow) return
    const pcm = await readAudioSpan(take.span)
    stashTake({ pcm, sampleRate: take.span.rope.sampleRate })
    newWindow.postMessage('braat:handoff', window.location.origin)
  }, [])

  // Clear session
  const doClearSession = useCallback(() => {
    dispatch({ type: 'CLEAR_SESSION' })
    frameCountRef.current = 0
    decisionsRef.current = []
    levelRef.current = { rms: 0, speechDetected: false }
    forceRender((n) => n + 1)
    setConfirmingClearSession(false)
  }, [])

  const handleClearSession = useCallback(() => {
    setTakesDrawerOpen(false)
    setConfirmingClearSession(true)
  }, [])

  const handleCancelClearSession = useCallback(() => {
    setConfirmingClearSession(false)
  }, [])

  // --- Derived data ---
  const passage = passages.find((p) => p.id === passageId) ?? passages[0]!

  const handleTextSizeChange = useCallback(
    (size: PracticeTextSize) => {
      void updateSettings({ practiceTextSize: size })
    },
    [updateSettings],
  )

  const handlePassageChange = useCallback(
    (id: string | null) => {
      if (id) {
        dispatch({ type: 'SET_DRILL_INDEX', index: 0 })
        void updateSettings({ practicePassageId: id })
      }
    },
    [updateSettings],
  )

  const handleModeChange = useCallback(
    (m: 'echo' | 'on-demand') => {
      void updateSettings({ practiceMode: m })
    },
    [updateSettings],
  )

  const handleOpenAudioSettings = useCallback(() => {
    setAudioSettingsOpen(true)
  }, [])

  const handleRandomizeChange = useCallback(
    (v: boolean) => {
      void updateSettings({ practiceRandomize: v })
    },
    [updateSettings],
  )

  const handleAutoAdvanceChange = useCallback(
    (v: boolean) => {
      void updateSettings({ practiceAutoAdvance: v })
    },
    [updateSettings],
  )

  const handleDrillPrev = useCallback(() => {
    dispatch({
      type: 'SET_DRILL_INDEX',
      index: Math.max(0, stateRef.current.drillIndex - 1),
    })
  }, [])

  const handleDrillNext = useCallback(() => {
    if (stateRef.current.sentenceCount > 0) {
      dispatch({
        type: 'SET_DRILL_INDEX',
        index: Math.min(
          stateRef.current.sentenceCount - 1,
          stateRef.current.drillIndex + 1,
        ),
      })
    }
  }, [])

  useHotkeys(
    'space',
    (e) => {
      e.preventDefault()
      if (stateRef.current.sessionPhase === 'idle') {
        handleStartSession()
      } else if (stateRef.current.recording) {
        if (voicedStartMsRef.current === null) {
          handleEndSession()
        } else {
          void handleNextTake()
        }
      }
    },
    [stateRef, handleStartSession, handleEndSession, handleNextTake],
  )

  useHotkeys(
    'esc',
    (e) => {
      e.preventDefault()
      handleEndSession()
    },
    [handleEndSession],
  )

  useHotkeys(
    'arrowleft',
    (e) => {
      if (passage.kind === 'sentenceLists') {
        e.preventDefault()
        handleDrillPrev()
      }
    },
    [passage.kind, handleDrillPrev],
    { enabled: passage.kind === 'sentenceLists' },
  )

  useHotkeys(
    'arrowright',
    (e) => {
      if (passage.kind === 'sentenceLists') {
        e.preventDefault()
        handleDrillNext()
      }
    },
    [passage.kind, handleDrillNext],
    { enabled: passage.kind === 'sentenceLists' },
  )

  const textSizeClass = TEXT_SIZE_CLASS[settings.practiceTextSize]

  const sentences: readonly string[] = useMemo(() => {
    const raw = passage.kind === 'sentenceLists' ? passage.lists.flat() : []
    return randomize ? shuffleArray(raw) : raw
  }, [passage, randomize])

  // Keep sentence count in the reducer for the playback-end handler
  useLayoutEffect(() => {
    dispatch({ type: 'SET_SENTENCE_COUNT', count: sentences.length })
  }, [sentences.length])
  useLayoutEffect(() => {
    modeRef.current = mode
  })
  useLayoutEffect(() => {
    handleNextTakeRef.current = handleNextTake
  })

  const selectedTitle = passage.title

  // --- Main render ---
  return (
    <main className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2 shrink-0">
        <Tooltip>
          <TooltipTrigger>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Braat</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>Back to analysis</TooltipContent>
        </Tooltip>
        <h1 className="text-sm font-medium shrink-0">Practice</h1>
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <Select value={passageId} onValueChange={handlePassageChange}>
            <SelectTrigger size="sm" className="w-62">
              <SelectValue>{selectedTitle}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {passages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PracticeSettings
            textSize={settings.practiceTextSize}
            onTextSizeChange={handleTextSizeChange}
            mode={mode}
            onModeChange={handleModeChange}
            onOpenAudioSettings={handleOpenAudioSettings}
          />
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 overflow-y-auto lg:pb-32">
          {passage.kind === 'passage' ? (
            <div className="mx-auto max-w-3xl px-4 py-6">
              <div
                className={cn(
                  'leading-relaxed text-justify hyphens-auto font-serif',
                  textSizeClass,
                )}
              >
                {passage.passage}
              </div>
              <PassageFooter
                source={passage.source}
                sourceUrl={passage.sourceUrl}
                attribution={passage.attribution}
              />
            </div>
          ) : passage.kind === 'sentenceLists' ? (
            <div className="mx-auto max-w-3xl px-4 py-6">
              <div className="flex flex-col justify-center min-h-64">
                <div
                  className={cn(
                    'text-center font-serif leading-relaxed py-8',
                    textSizeClass,
                  )}
                >
                  {sentences[state.drillIndex]}
                </div>
              </div>
              <DrillPager
                sentenceIndex={state.drillIndex}
                sentenceCount={sentences.length}
                autoAdvance={autoAdvance}
                onAutoAdvanceChange={handleAutoAdvanceChange}
                randomize={randomize}
                onRandomizeChange={handleRandomizeChange}
                onPrevious={handleDrillPrev}
                onNext={handleDrillNext}
              />
              <PassageFooter
                source={passage.source}
                sourceUrl={passage.sourceUrl}
                attribution={passage.attribution}
              />
            </div>
          ) : // eslint-disable-next-line no-unnecessary-condition
          passage.kind === 'blank' ? null : (
            assertUnreachable(passage)
          )}
        </div>

        <div className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border">
          <PracticeTakesSidebar
            takes={state.takes}
            referenceTakeId={state.referenceTakeId}
            playingTakeId={state.playingTakeId}
            takeCount={state.takes.length}
            onPlayTake={(take) => handlePlayTake(take, true)}
            onAnalyzeTake={handleAnalyzeTake}
            onStarTake={handleStarTake}
            onClearSession={handleClearSession}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <PracticeTakesDrawer
          open={takesDrawerOpen}
          onOpenChange={setTakesDrawerOpen}
          takes={state.takes}
          referenceTakeId={state.referenceTakeId}
          playingTakeId={state.playingTakeId}
          takeCount={state.takes.length}
          onPlayTake={(take) => handlePlayTake(take, true)}
          onAnalyzeTake={handleAnalyzeTake}
          onStarTake={handleStarTake}
          onClearSession={handleClearSession}
        />
      </div>

      <AudioSettingsModal
        open={audioSettingsOpen}
        onOpenChange={setAudioSettingsOpen}
      />

      {state.error && (
        <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
          <Button
            variant="link"
            className="ml-2 underline text-red-700 dark:text-red-300"
            onClick={() => dispatch({ type: 'SET_ERROR', error: null })}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div
        className={cn(
          'shrink-0 border-t border-border',
          state.sessionPhase !== 'idle' &&
            'lg:fixed lg:bottom-4 lg:left-4 lg:z-20 lg:w-80 lg:rounded-xl lg:border lg:bg-background lg:shadow-lg',
        )}
      >
        <StatusRow
          phase={state.sessionPhase}
          playing={state.playingTakeId !== null}
          timerActive={voicedStartMs !== null}
          elapsedMs={elapsedMs}
          level={displayLevel.intensity}
          voiced={displayLevel.voiced}
          onStartSession={handleStartSession}
          onNextTake={handleNextTake}
          onEndSession={handleEndSession}
          numTakes={state.takes.length}
        />
      </div>

      {blocker.status === 'blocked' && (
        <Dialog open onOpenChange={() => blocker.reset()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard practice session?</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Your takes will be lost if you leave this page.
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => blocker.reset()}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed()}>
                Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {confirmingClearSession && (
        <Dialog
          open
          onOpenChange={(open) => !open && handleCancelClearSession()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard practice session?</DialogTitle>
            </DialogHeader>
            <DialogDescription>All takes will be removed.</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelClearSession}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={doClearSession}>
                Discard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}

export const Route = createFileRoute('/practice')({
  component: Practice,
})
