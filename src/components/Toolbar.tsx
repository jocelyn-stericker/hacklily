// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import {
  BookOpen,
  Captions,
  CircleDot,
  Download,
  FilePlus,
  FolderOpen,
  Keyboard,
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
import { formatKeys, shortcutTitle, SHORTCUTS } from '#/components/shortcuts'
import { useShortcutsHelp } from '#/components/ShortcutsHelp'
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
  const { openShortcutsHelp } = useShortcutsHelp()
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
          title={shortcutTitle('upgradeTranscripts')}
          disabled={!onUpgradeAll}
          onClick={onUpgradeAll ?? undefined}
        >
          <Sparkles className="size-6" />
        </Button>
      )}
      <Button
        variant="default"
        className="h-10 w-10 cursor-pointer"
        title={shortcutTitle('jumpStart')}
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
        title={shortcutTitle('record')}
        onClick={onStart}
      >
        <MicVocal className="size-6" />
      </Button>
      {status.value === 'playing' || status.value === 'recording' ? (
        <Button
          variant="default"
          className="h-10 w-10 cursor-pointer"
          title={shortcutTitle('playPause')}
          onClick={onPause}
        >
          <Pause className="size-6" />
        </Button>
      ) : (
        <Button
          variant="default"
          className="h-10 w-10 cursor-pointer"
          title={shortcutTitle('playPause')}
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
            {SHORTCUTS.newSession.label}
            <DropdownMenuShortcut>
              {formatKeys(SHORTCUTS.newSession.keys)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openFilePicker}>
            <FolderOpen className="size-4" />
            {SHORTCUTS.openFile.label}
            <DropdownMenuShortcut>
              {formatKeys(SHORTCUTS.openFile.keys)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onExportAudio}
            disabled={exportAudioDisabled}
          >
            <Download className="size-4" />
            {SHORTCUTS.exportAudio.label}
            <DropdownMenuShortcut>
              {formatKeys(SHORTCUTS.exportAudio.keys)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenAudioSettings}>
            <Settings2 className="size-4" />
            {SHORTCUTS.audioSettings.label}
            <DropdownMenuShortcut>
              {formatKeys(SHORTCUTS.audioSettings.keys)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenTranscriptionSettings}>
            <Captions className="size-4" />
            Transcription settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenVowelChartSettings}>
            <CircleDot className="size-4" />
            Vowel chart settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openShortcutsHelp}>
            <Keyboard className="size-4" />
            {SHORTCUTS.help.label}
            <DropdownMenuShortcut>
              {formatKeys(SHORTCUTS.help.keys)}
            </DropdownMenuShortcut>
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
                    {SHORTCUTS.saveToJournal.label}
                    <DropdownMenuShortcut>
                      {formatKeys(SHORTCUTS.saveToJournal.keys)}
                    </DropdownMenuShortcut>
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
