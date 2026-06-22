// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { ExternalLink, Mic, Settings, Shuffle } from 'lucide-react'

import { REFERENCE_VOICES, getReferenceVoice } from '#/lib/referenceVoices'
import type { ReferenceVoice } from '#/lib/referenceVoices'
import type { PracticeTextSize } from '#/lib/settings'

import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Slider } from './ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export const TEXT_SIZE_CLASS: Record<PracticeTextSize, string> = {
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
}

export const TEXT_SIZE_LABELS: Record<PracticeTextSize, string> = {
  md: 'Medium',
  lg: 'Large',
  xl: 'XL',
  '2xl': '2XL',
}

export function PracticeSettings({
  textSize,
  onTextSizeChange,
  mode,
  onModeChange,
  onOpenAudioSettings,
  autoAdvance,
  onAutoAdvanceChange,
  randomize,
  onRandomizeChange,
  referenceVoice,
  onReferenceVoiceChange,
  playReferenceBeforeTake,
  onPlayReferenceBeforeTakeChange,
}: {
  textSize: PracticeTextSize
  onTextSizeChange: (size: PracticeTextSize) => void
  mode: 'echo' | 'on-demand'
  onModeChange: (m: 'echo' | 'on-demand') => void
  onOpenAudioSettings: () => void
  autoAdvance?: boolean
  onAutoAdvanceChange?: (v: boolean) => void
  randomize?: boolean
  onRandomizeChange?: (v: boolean) => void
  referenceVoice: string
  onReferenceVoiceChange: (id: string) => void
  playReferenceBeforeTake: boolean
  onPlayReferenceBeforeTakeChange: (v: boolean) => void
}) {
  const sizes: PracticeTextSize[] = ['md', 'lg', 'xl', '2xl']
  const idx = sizes.indexOf(textSize)

  const voiceIdx = Math.max(
    0,
    REFERENCE_VOICES.findIndex((v) => v.id === referenceVoice),
  )
  const voice: ReferenceVoice =
    REFERENCE_VOICES[voiceIdx] ?? getReferenceVoice(referenceVoice)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Practice settings"
                />
              }
            />
          }
        >
          <Settings className="size-5" />
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>Settings</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium">Text size</span>
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
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium">Reference voice</span>
            <span className="text-xs text-muted-foreground">{voice.name}</span>
          </div>
          <Slider
            value={voiceIdx}
            onValueChange={(value) => {
              const next = REFERENCE_VOICES[value as number]
              if (next) onReferenceVoiceChange(next.id)
            }}
            min={0}
            max={REFERENCE_VOICES.length - 1}
            step={1}
            aria-label="Reference voice"
            className="mt-1"
          />
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {voice.description}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
            <span>F0 {voice.f0} Hz</span>
            <span aria-hidden>·</span>
            <span>F1 {voice.f1} Hz</span>
            <span className="ml-auto capitalize">{voice.presentation}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenAudioSettings}>
          <Mic />
          Audio settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={mode === 'echo'}
            onCheckedChange={(checked) =>
              onModeChange(checked ? 'echo' : 'on-demand')
            }
          >
            Stop take when I stop speaking
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={playReferenceBeforeTake}
            onCheckedChange={onPlayReferenceBeforeTakeChange}
          >
            Play reference before each take
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={autoAdvance}
            onCheckedChange={onAutoAdvanceChange}
          >
            Next sentence after each take
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={randomize}
            onCheckedChange={onRandomizeChange}
          >
            <Shuffle />
            Randomize drills
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <a
              href="https://codeberg.org/jocelyn-stericker/braat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground!"
            />
          }
        >
          <ExternalLink />
          Source code & issues
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
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
          <p>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
