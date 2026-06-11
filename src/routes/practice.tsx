// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  GripHorizontal,
  Lock,
  Mic,
  Play,
  Settings,
  Shuffle,
  Square,
  Star,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { Button } from '#/components/ui/button'
import {
  Drawer,
  DrawerContent,
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
import { useSettings } from '#/components/useSettings'
import { passages } from '#/lib/passages'
import type { PracticeTextSize } from '#/lib/settings'
import { cn } from '#/lib/utils'

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

function takeRelativeTime(secondsAgo: number): string {
  if (secondsAgo < 60) return 'just now'
  const m = Math.floor(secondsAgo / 60)
  return `${m}m`
}

function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

function TooltipButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button {...props} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  )
}

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

function StatusRow({
  listening,
  mode,
  voiced,
  playing,
  onToggleListening,
  onTogglePlay,
}: {
  listening: boolean
  mode: 'echo' | 'on-demand'
  voiced?: boolean
  playing: boolean
  onToggleListening: () => void
  onTogglePlay: () => void
}) {
  if (!listening) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-4">
        <button
          type="button"
          onClick={onToggleListening}
          className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-base font-medium text-white shadow-md hover:bg-red-600 active:scale-95 transition-all cursor-pointer"
        >
          <Mic className="size-5" />
          Start practice session
        </button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
          <Lock className="size-3" />
          Audio stays on your device
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex items-center px-4 py-3">
      {mode === 'echo' ? (
        <div className="flex items-center gap-2 group shrink-0">
          <span className="relative flex size-3">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-red-500" />
          </span>
          <span className="text-sm font-medium">Listening…</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted active:scale-95 transition-all cursor-pointer"
        >
          {playing ? (
            <>
              <Play className="size-3 fill-current" />
              Playing…
            </>
          ) : (
            <>
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-red-500" />
              </span>
              Next take
            </>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={onToggleListening}
        aria-label="Stop"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center size-9 rounded-full bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all cursor-pointer"
      >
        <Square className="size-4 fill-current" />
      </button>
      <div className="flex-1" />
      <LevelMeter intensity={0.7} voiced={voiced} />
    </div>
  )
}

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
        <TooltipTrigger>
          <PopoverTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Practice settings"
            >
              <Settings className="size-4" />
            </Button>
          </PopoverTrigger>
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
          <Label className="text-xs">Playback</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {mode === 'echo' ? 'Echo' : 'On-demand'}
            </span>
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
      <div className="flex items-center justify-center gap-6">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={autoAdvance} onCheckedChange={onAutoAdvanceChange} />
          Auto-advance per take
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

function LatestTakeRow() {
  return (
    <DrawerTrigger>
      <button
        type="button"
        className="flex relative w-full items-center gap-2 border-t border-border px-4 py-3 text-left hover:bg-muted/50 transition-colors cursor-pointer group"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
          <Play className="size-3" />
        </span>
        <span className="text-sm font-medium tabular-nums">#7</span>
        <span className="text-sm tabular-nums text-muted-foreground">0:06</span>
        <span className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <span className="inline-flex">
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>Analyze in Braat</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <span className="inline-flex">
                <Star className="size-4 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>Reference take</TooltipContent>
          </Tooltip>
        </span>
        <ChevronUp className="absolute left-1/2 -translate-x-1/2 size-4 text-muted-foreground/40 transition-transform translate-y-[-10px] group-hover:translate-y-[-12px] group-hover:-translate-x-1/2" />
      </button>
    </DrawerTrigger>
  )
}

function TakesList() {
  const mockTakes = [
    { id: 7, duration: '0:06', secondsAgo: 0 },
    { id: 6, duration: '0:09', secondsAgo: 60 },
    { id: 5, duration: '0:04', secondsAgo: 120 },
    { id: 4, duration: '0:07', secondsAgo: 180 },
    { id: 3, duration: '0:05', secondsAgo: 300 },
    { id: 2, duration: '0:08', secondsAgo: 420 },
    { id: 1, duration: '0:03', secondsAgo: 540 },
  ]

  return (
    <>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm">
          <Star className="size-4 text-muted-foreground" />
          <span className="font-medium">Reference</span>
          <span className="text-muted-foreground tabular-nums">0:05</span>
          <div className="ml-auto flex items-center gap-1">
            <TooltipButton label="Play" variant="ghost" size="icon-sm">
              <Play className="size-3" />
            </TooltipButton>
            <TooltipButton label="A/B latest" variant="ghost" size="icon-sm">
              A/B
            </TooltipButton>
          </div>
        </div>
      </div>
      {mockTakes.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
        >
          <span className="text-sm font-medium tabular-nums">#{t.id}</span>
          <span className="text-sm tabular-nums text-muted-foreground">
            {t.duration}
          </span>
          <span className="text-xs text-muted-foreground">
            {takeRelativeTime(t.secondsAgo)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <TooltipButton label="Play" variant="ghost" size="icon-sm">
              <Play className="size-3" />
            </TooltipButton>
            <TooltipButton label="Analyze" variant="ghost" size="icon-sm">
              <ArrowUpRight className="size-3" />
            </TooltipButton>
            <TooltipButton
              label="Star as reference"
              variant="ghost"
              size="icon-sm"
            >
              <Star className="size-3" />
            </TooltipButton>
          </div>
        </div>
      ))}
      <Tooltip>
        <TooltipTrigger>
          <Button variant="outline" className="mt-3 w-full text-sm">
            Clear session
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>
          Remove all takes from this session
        </TooltipContent>
      </Tooltip>
    </>
  )
}

function TakesDrawer() {
  return (
    <Drawer>
      <LatestTakeRow />
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-center gap-2">
            <GripHorizontal className="size-4 text-muted-foreground" />
            Takes (7)
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 px-4 pb-4">
          <TakesList />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function TakesSidebar() {
  return (
    <>
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-sm font-medium">Takes (7)</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 px-4 py-3">
          <TakesList />
        </div>
      </div>
    </>
  )
}

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: 'echo' | 'on-demand'
  onModeChange: (m: 'echo' | 'on-demand') => void
}) {
  return (
    <div className="flex rounded-lg border border-input p-0.5">
      <button
        type="button"
        onClick={() => onModeChange('echo')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
          mode === 'echo'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Echo
      </button>
      <button
        type="button"
        onClick={() => onModeChange('on-demand')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
          mode === 'on-demand'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        On-demand
      </button>
    </div>
  )
}

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

function Practice() {
  const [settings, updateSettings] = useSettings()
  const [drillIndex, setDrillIndex] = useState(0)
  const [listening, setListening] = useState(false)
  const [voiced, _setVoiced] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)

  const passageId = settings.practicePassageId
  const mode = settings.practiceMode
  const randomize = settings.practiceRandomize

  useEffect(() => {
    document.title = PAGE_TITLE
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = setTimeout(() => setPlaying(false), 2000)
    return () => clearTimeout(id)
  }, [playing])

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
        setDrillIndex(0)
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

  const handleTogglePlay = useCallback(() => {
    setPlaying((p) => !p)
  }, [])

  const handleOpenAudioSettings = useCallback(() => {
    setAudioSettingsOpen(true)
  }, [])

  const handleRandomizeChange = useCallback(
    (v: boolean) => {
      void updateSettings({ practiceRandomize: v })
    },
    [updateSettings],
  )

  const handleDrillPrev = useCallback(() => {
    setDrillIndex((i) => Math.max(0, i - 1))
  }, [])

  const handleDrillNext = useCallback(() => {
    if (passage.kind === 'sentenceLists') {
      setDrillIndex((i) => Math.min(passage.lists.flat().length - 1, i + 1))
    }
  }, [passage])

  const toggleListening = useCallback(() => {
    setListening((l) => !l)
  }, [])

  const textSizeClass = TEXT_SIZE_CLASS[settings.practiceTextSize]

  const sentences: readonly string[] = useMemo(() => {
    const raw = passage.kind === 'sentenceLists' ? passage.lists.flat() : []
    return randomize ? shuffleArray(raw) : raw
  }, [passage, randomize])

  const selectedTitle =
    passages.find((p) => p.id === passageId)?.title ?? passages[0]!.title

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
        <div className="flex-1 overflow-y-auto">
          {passage.kind === 'passage' ? (
            <div className="mx-auto max-w-[768px] px-4 py-6">
              <div
                className={cn(
                  'leading-relaxed text-justify font-serif',
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
          ) : passage.kind === 'blank' ? null : (
            <div className="mx-auto max-w-[768px] px-4 py-6">
              <div className="flex flex-col justify-center min-h-[16rem]">
                <div
                  className={cn(
                    'text-center font-serif leading-relaxed py-8',
                    textSizeClass,
                  )}
                >
                  {sentences[drillIndex]}
                </div>
              </div>
              <DrillPager
                sentenceIndex={drillIndex}
                sentenceCount={sentences.length}
                autoAdvance={autoAdvance}
                onAutoAdvanceChange={setAutoAdvance}
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
          )}
        </div>

        <div className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border">
          <TakesSidebar />
        </div>
      </div>

      <div className="lg:hidden">
        <TakesDrawer />
      </div>

      <AudioSettingsModal
        open={audioSettingsOpen}
        onOpenChange={setAudioSettingsOpen}
      />

      <div className="shrink-0 border-t border-border">
        <StatusRow
          listening={listening}
          mode={mode}
          voiced={voiced}
          playing={playing}
          onToggleListening={toggleListening}
          onTogglePlay={handleTogglePlay}
        />
        {listening && (
          <div className="flex lg:hidden items-center justify-center border-t border-border px-4 py-3">
            <ModeToggle mode={mode} onModeChange={handleModeChange} />
          </div>
        )}
      </div>
    </main>
  )
}

export const Route = createFileRoute('/practice')({
  component: Practice,
})
