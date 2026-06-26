// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// The voice journal: a folder of audio files on the user's computer (via the
// File System Access API) that persists across sessions, unlike practice takes.
// Lists, plays, opens entries in the analysis tool, and deletes them; recording
// a new entry in the route lives in JournalRecorder (rendered in the footer).

import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  ArrowLeft,
  ChartColumn,
  ChartSpline,
  ExternalLink,
  FolderOpen,
  FolderSync,
  Loader2,
  Metronome,
  Mic,
  Pause,
  Play,
  Settings,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { JournalRecorder } from '#/components/JournalRecorder'
import { JournalSetupContent } from '#/components/JournalSetupModal'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { track } from '#/lib/analytics'
import { supportsFileSystemAccess } from '#/lib/browserFeatures'
import { journalEnabled } from '#/lib/journal/journalEnabled'
import { deleteEntry, ensureAccess, listEntries } from '#/lib/journal/journalFs'
import type { JournalAccess, JournalEntry } from '#/lib/journal/journalFs'
import {
  clearJournalHandle,
  loadJournalHandle,
  saveJournalHandle,
} from '#/lib/journal/journalStore'
import { stashTake } from '#/lib/practiceHandoff'

const PAGE_TITLE = 'Voice journal — Braat'

function Journal() {
  // `undefined` = still loading the saved handle; `null` = none saved.
  const [handle, setHandle] = useState<
    FileSystemDirectoryHandle | null | undefined
  >(undefined)
  const [granted, setGranted] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [playingName, setPlayingName] = useState<string | null>(null)
  const [errored, setErrored] = useState<ReadonlySet<string>>(new Set())
  const [fsaSupported] = useState(supportsFileSystemAccess)

  const audioRef = useRef<HTMLAudioElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    document.title = PAGE_TITLE
    return () => {
      document.title = 'Braat'
    }
  }, [])

  const refresh = useCallback(async (h: FileSystemDirectoryHandle) => {
    try {
      setEntries(await listEntries(h))
    } catch (err) {
      console.error('[journal] failed to list entries:', err)
      toast('Could not read the journal folder')
    }
  }, [])

  // Load the saved folder on mount and try to get access straight away.
  // ensureAccess only prompts when permission isn't already granted; navigating
  // here is a click, so within the same tab the activation carries over and the
  // prompt appears without a separate "Reconnect" step. If there's no activation
  // to prompt with (e.g. the journal was opened in a new tab), requestPermission
  // throws and we fall back to the reconnect gate.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const h = await loadJournalHandle()
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- set by cleanup across the await
      if (cancelled) return
      if (!h) {
        setHandle(null)
        return
      }
      setHandle(h)
      let access: JournalAccess = 'prompt'
      try {
        access = await ensureAccess(h)
      } catch {
        // No user activation available to prompt; the reconnect gate handles it.
      }
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- set by cleanup across the await
      if (cancelled) return
      if (access === 'granted') {
        setGranted(true)
        void refresh(h)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Re-list when the tab regains focus: entries may have been added (from the
  // analysis tool's "Save to voice journal") or changed in the OS file manager.
  useEffect(() => {
    if (!granted || !handle) return
    const onFocus = () => void refresh(handle)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [granted, handle, refresh])

  // Revoke the last object URL on unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleChooseFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) return
    let h: FileSystemDirectoryHandle
    try {
      h = await window.showDirectoryPicker({ mode: 'readwrite' })
    } catch {
      return // user dismissed the picker
    }
    await saveJournalHandle(h)
    setHandle(h)
    setGranted(true)
    track('journal/setup')
    void refresh(h)
  }, [refresh])

  const handleReconnect = useCallback(async () => {
    if (!handle) return
    const access = await ensureAccess(handle)
    if (access === 'granted') {
      setGranted(true)
      void refresh(handle)
    } else {
      toast('Could not access the journal folder', {
        description: 'Grant access to the folder to see your entries.',
      })
    }
  }, [handle, refresh])

  const handleCloseJournal = useCallback(async () => {
    await clearJournalHandle()
    setHandle(null)
    setGranted(false)
    setEntries([])
    setPlayingName(null)
  }, [])

  const handlePlay = useCallback(
    (entry: JournalEntry) => {
      const audio = audioRef.current
      if (!audio) return
      if (playingName === entry.name) {
        audio.pause()
        setPlayingName(null)
        return
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(entry.file)
      objectUrlRef.current = url
      audio.src = url
      setPlayingName(entry.name)
      audio.play().catch(() => {
        setPlayingName(null)
        setErrored((prev) => new Set(prev).add(entry.name))
        toast('Could not play this file')
      })
    },
    [playingName],
  )

  const handleAnalyze = useCallback(async (entry: JournalEntry) => {
    const newWindow = window.open('/', '_blank')
    if (!newWindow) return
    const ctx = new AudioContext()
    try {
      const buf = await entry.file.arrayBuffer()
      const decoded = await ctx.decodeAudioData(buf)
      stashTake({
        pcm: new Float32Array(decoded.getChannelData(0)),
        sampleRate: decoded.sampleRate,
      })
      newWindow.postMessage('braat:handoff', window.location.origin)
      track('journal/analyze')
    } catch (err) {
      console.error('[journal] failed to analyze entry:', err)
      newWindow.close()
      setErrored((prev) => new Set(prev).add(entry.name))
      toast('Could not open this file in the analysis tool')
    } finally {
      void ctx.close()
    }
  }, [])

  // Deletion removes the file from the user's folder on disk, so confirm first.
  const [pendingDelete, setPendingDelete] = useState<JournalEntry | null>(null)

  const handleConfirmDelete = useCallback(async () => {
    const entry = pendingDelete
    if (!entry || !handle) return
    setPendingDelete(null)
    if (playingName === entry.name) {
      audioRef.current?.pause()
      setPlayingName(null)
    }
    try {
      await deleteEntry(handle, entry.name)
      track('journal/delete')
      void refresh(handle)
      toast('Entry deleted', { description: entry.name })
    } catch (err) {
      console.error('[journal] failed to delete entry:', err)
      toast('Could not delete this entry')
    }
  }, [pendingDelete, handle, playingName, refresh])

  const folderName = handle?.name

  const settingsMenu = (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Journal settings"
                  className="text-white hover:bg-white/15 hover:text-white"
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
        <DropdownMenuItem onClick={() => setAudioSettingsOpen(true)}>
          <Mic className="size-4" />
          Audio settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link to="/practice" className="text-foreground!" />}
        >
          <Metronome className="size-4" />
          Practice
        </DropdownMenuItem>
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
          <ExternalLink className="size-4" />
          Source code & issues
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a
              href="https://stats.braat.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground!"
            />
          }
        >
          <ChartColumn className="size-4" />
          Global usage stats
        </DropdownMenuItem>
        {folderName && (
          <>
            <DropdownMenuSeparator />
            <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">
              Folder: {folderName}
            </div>
            <DropdownMenuItem onClick={() => void handleChooseFolder()}>
              <FolderOpen className="size-4" />
              Change journal folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleCloseJournal()}>
              <FolderSync className="size-4" />
              Close journal
            </DropdownMenuItem>
          </>
        )}
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
            Anonymous, cookieless usage stats &mdash;{' '}
            <Link
              to="/privacy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Privacy
            </Link>
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

  return (
    <main className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-3 bg-sky-600 p-2 text-white shrink-0">
        <Tooltip>
          <TooltipTrigger>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-base text-white/90! hover:text-white! transition-colors shrink-0"
            >
              <ArrowLeft className="size-6" />
              <span className="hidden sm:inline">Braat</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>Back to analysis</TooltipContent>
        </Tooltip>
        <h1 className="text-lg font-bold shrink-0">Voice journal</h1>
        <div className="ml-auto flex items-center gap-2">{settingsMenu}</div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {handle === undefined ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : handle === null ? (
          <div className="mx-auto max-w-md px-4 py-12">
            <JournalSetupContent
              supported={fsaSupported}
              onChooseFolder={() => void handleChooseFolder()}
            />
          </div>
        ) : !granted ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Reconnect to{' '}
              <span className="font-medium text-foreground">{folderName}</span>{' '}
              to see your journal entries.
            </p>
            <Button onClick={() => void handleReconnect()}>
              <FolderSync className="size-4" />
              Reconnect folder
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
            No entries yet. Record an entry below, or save one from the analysis
            tool, and it will appear here.
          </div>
        ) : (
          <ul className="mx-auto max-w-2xl divide-y divide-border px-4 py-2">
            {entries.map((entry) => {
              const isErrored = errored.has(entry.name)
              const isPlaying = playingName === entry.name
              return (
                <li key={entry.name} className="flex items-center gap-3 py-3">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    disabled={isErrored}
                    onClick={() => handlePlay(entry)}
                  >
                    {isPlaying ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.lastModified).toLocaleString()}
                      {isErrored && ' · unsupported format'}
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Open in analysis"
                          disabled={isErrored}
                          onClick={() => void handleAnalyze(entry)}
                        />
                      }
                    >
                      <ChartSpline className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      Open in analysis
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete entry"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDelete(entry)}
                        />
                      }
                    >
                      <Trash2 className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>Delete</TooltipContent>
                  </Tooltip>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {granted && handle && (
        <JournalRecorder
          handle={handle}
          onSaved={() => void refresh(handle)}
          folderName={folderName ?? handle.name}
        />
      )}

      <AudioSettingsModal
        open={audioSettingsOpen}
        onOpenChange={setAudioSettingsOpen}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.name} will be permanently removed from “
              {folderName}”. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <audio ref={audioRef} onEnded={() => setPlayingName(null)} hidden />
    </main>
  )
}

export const Route = createFileRoute('/journal')({
  component: Journal,
  beforeLoad: () => {
    if (!journalEnabled()) throw redirect({ to: '/' })
  },
})
