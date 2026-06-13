// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { ExternalLink, Mic, Settings, Shuffle } from 'lucide-react'

import type { PracticeTextSize } from '#/lib/settings.ts'

import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
}) {
  const sizes: PracticeTextSize[] = ['md', 'lg', 'xl', '2xl']
  const idx = sizes.indexOf(textSize)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
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
        <DropdownMenuItem onClick={onOpenAudioSettings}>
          <Mic />
          Audio settings
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem
          checked={mode === 'echo'}
          onCheckedChange={(checked) =>
            onModeChange(checked ? 'echo' : 'on-demand')
          }
        >
          Stop take when I stop speaking
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Drills</DropdownMenuLabel>
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
            Randomize
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
