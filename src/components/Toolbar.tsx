/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {
  Captions,
  CircleDot,
  Download,
  FilePlus,
  FolderOpen,
  Menu,
  MicVocal,
  Pause,
  Play,
  Settings2,
  SkipBack,
  Sparkles,
} from 'lucide-react'

import braatPng from '#/braat.png'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

import type { TimelineState, Status } from './useTimelineState'

const MOD = navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl+'

export function Toolbar({
  openFilePicker,
  onNew,
  timelineState,
  status,
  onBackToStart,
  onStart,
  onPause,
  onPlay,
  playDisabled,
  onExportAudio,
  exportAudioDisabled,
  onOpenAudioSettings,
  onOpenTranscriptionSettings,
  onOpenVowelChartSettings,
  showUpgradeAll,
  onUpgradeAll,
  upgradeAllDisabled,
}: {
  openFilePicker: () => void
  onNew: () => void
  timelineState: TimelineState
  status: Status
  onBackToStart: () => void
  onStart: () => void
  onPause: () => void
  onPlay: () => void
  playDisabled: boolean
  onExportAudio: () => void
  exportAudioDisabled: boolean
  onOpenAudioSettings: () => void
  onOpenTranscriptionSettings: () => void
  onOpenVowelChartSettings: () => void
  showUpgradeAll: boolean
  onUpgradeAll: () => void
  upgradeAllDisabled: boolean
}) {
  return (
    <header className="flex align-center justify-end gap-1 p-2 flex-wrap">
      <h1 className="text-lg font-bold bg-[#8ace00] mr-2">
        <img src={braatPng} className="h-10" />
      </h1>
      <div className="grow" />
      {showUpgradeAll && (
        <Button
          variant="default"
          className="h-10 w-10 cursor-pointer"
          title="Upgrade all visible transcripts (T)"
          disabled={upgradeAllDisabled}
          onClick={onUpgradeAll}
        >
          <Sparkles className="size-6" />
        </Button>
      )}
      <Button
        variant="default"
        className="h-10 w-10 cursor-pointer"
        title="Back to start (Shift+←)"
        disabled={
          (timelineState.cursorSec === 0 &&
            timelineState.viewportLeftSec === 0) ||
          status.value === 'recording' ||
          status.value === 'analyzing'
        }
        onClick={onBackToStart}
      >
        <SkipBack className="size-6" />
      </Button>
      <Button
        variant="default"
        className="h-10 w-10 cursor-pointer"
        disabled={status.value === 'recording' || status.value === 'analyzing'}
        title="Record from microphone (R)"
        onClick={onStart}
      >
        <MicVocal className="size-6" />
      </Button>
      {status.value === 'playing' || status.value === 'recording' ? (
        <Button
          variant="default"
          className="h-10 w-10 cursor-pointer"
          title="Pause (Space)"
          onClick={onPause}
        >
          <Pause className="size-6" />
        </Button>
      ) : (
        <Button
          variant="default"
          className="h-10 w-10 cursor-pointer"
          title="Play (Space)"
          onClick={onPlay}
          disabled={playDisabled}
        >
          <Play className="size-6" />
        </Button>
      )}
      <div className="w-px bg-border mx-1 self-stretch" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center h-10 w-10 cursor-pointer rounded-md text-foreground hover:bg-muted"
          title="Application menu"
        >
          <Menu className="size-6" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onClick={onNew}>
            <FilePlus className="size-4" />
            New
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openFilePicker}>
            <FolderOpen className="size-4" />
            Open audio file
            <DropdownMenuShortcut>{MOD}O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onExportAudio}
            disabled={exportAudioDisabled}
          >
            <Download className="size-4" />
            Export mono audio
            <DropdownMenuShortcut>{MOD}E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenAudioSettings}>
            <Settings2 className="size-4" />
            Audio settings
            <DropdownMenuShortcut>{MOD},</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenTranscriptionSettings}>
            <Captions className="size-4" />
            Transcription settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenVowelChartSettings}>
            <CircleDot className="size-4" />
            Vowel chart settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
