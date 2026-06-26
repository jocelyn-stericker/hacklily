// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import {
  BookOpen,
  Captions,
  CircleDot,
  Download,
  FilePlus,
  FolderOpen,
  Menu,
  MicVocal,
  NotebookPen,
  Pause,
  Play,
  Save,
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
  DropdownMenuSeparator,
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
  journalEnabled,
  journalSetUp,
  onSetUpJournal,
  onSaveToJournal,
  onViewJournal,
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
  onUpgradeAll: (() => void) | null
  /** Whether the voice-journal feature flag is on (gates the menu items). */
  journalEnabled: boolean
  /** Whether a journal folder has been chosen. */
  journalSetUp: boolean
  onSetUpJournal: () => void
  onSaveToJournal: () => void
  onViewJournal: () => void
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
          disabled={!onUpgradeAll}
          onClick={onUpgradeAll ?? undefined}
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
            Export mono MP3
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
          {journalEnabled && (
            <>
              <DropdownMenuSeparator />
              {journalSetUp ? (
                <>
                  <DropdownMenuItem
                    onClick={onSaveToJournal}
                    disabled={exportAudioDisabled}
                  >
                    <Save className="size-4" />
                    Save to voice journal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onViewJournal}>
                    <BookOpen className="size-4" />
                    View voice journal…
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={onSetUpJournal}>
                  <NotebookPen className="size-4" />
                  Set up voice journal
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
