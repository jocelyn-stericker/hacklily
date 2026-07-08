// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// The voice journal: a folder of audio files on the user's computer (via the
// File System Access API) that persists across sessions, unlike practice takes.
// Lists, plays, opens entries in the analysis tool, and deletes them; recording
// a new entry in the route lives in JournalRecorder (rendered in the footer).

import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ChartColumn,
  ChartSpline,
  Download,
  ExternalLink,
  FileText,
  FolderInput,
  FolderOpen,
  FolderSync,
  Loader2,
  Metronome,
  Mic,
  Pause,
  Play,
  Settings,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { JournalRecorder } from '#/components/JournalRecorder'
import { JournalSetupContent } from '#/components/JournalSetupModal'
import { NavBar } from '#/components/NavBar'
import { SrtEditorModal } from '#/components/SrtEditorModal'
import { TranscriptionSettingsModal } from '#/components/TranscriptionSettingsModal'
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
import { useSettings } from '#/components/useSettings'
import { track } from '#/lib/analytics'
import { isIos } from '#/lib/browserFeatures'
import {
  buildJournalZip,
  importJournalFolder,
  importJournalZip,
  measureAudioDuration,
  summarizeSinceExport,
} from '#/lib/journal/journalArchive'
import {
  isPersisted,
  journalSetupGuidance,
  loadJournalBackend,
  requestPersistence,
  setupOpfsJournal,
} from '#/lib/journal/journalBackend'
import type { JournalBackend } from '#/lib/journal/journalBackend'
import {
  deleteEntry,
  deleteEntrySrt,
  ensureAccess,
  listEntries,
  listEntrySrtAudios,
  readEntrySrt,
  writeEntrySrt,
} from '#/lib/journal/journalFs'
import type { JournalAccess, JournalEntry } from '#/lib/journal/journalFs'
import { parseSrt } from '#/lib/journal/journalSrt'
import {
  clearJournalHandle,
  deleteEntryDuration,
  getLastExportAt,
  loadEntryDurations,
  recordEntryDuration,
  saveJournalHandle,
  setLastExportAt as storeSetLastExportAt,
} from '#/lib/journal/journalStore'
import {
  transcribeEntry,
  generateSrtSkeleton,
} from '#/lib/journal/journalTranscribe'
import type { TranscribeStatus } from '#/lib/journal/journalTranscribe'
import { stashTake } from '#/lib/practiceHandoff'
import { formatDuration } from '#/lib/utils'

const PAGE_TITLE = 'Voice journal — Braat'

function Journal() {
  // `undefined` = still resolving the backend; `null` = not set up yet.
  const [backend, setBackend] = useState<JournalBackend | null | undefined>(
    undefined,
  )
  const [granted, setGranted] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [transcriptionSettingsOpen, setTranscriptionSettingsOpen] =
    useState(false)
  const [playingName, setPlayingName] = useState<string | null>(null)
  const [errored, setErrored] = useState<ReadonlySet<string>>(new Set())
  // Per-entry take durations (seconds) and the last-export timestamp. Both feed
  // the "minutes since last export" summary shown above the OPFS entry list.
  const [durations, setDurations] = useState<Map<string, number>>(new Map())
  const [lastExportAt, setLastExportAt] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  // Per-entry transcript state. `transcriptPreviews` carries the first cue's
  // text per entry (shown as the list title), and `transcribeStatus` carries
  // the live progress for any entry currently being transcribed.
  const [transcriptPreviews, setTranscriptPreviews] = useState<
    Map<string, string>
  >(new Map())
  const [transcribeStatus, setTranscribeStatus] = useState<
    Map<string, TranscribeStatus>
  >(new Map())

  const [settings] = useSettings()

  const handle = backend?.handle ?? null
  const importInputRef = useRef<HTMLInputElement>(null)
  const importFolderInputRef = useRef<HTMLInputElement>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  // Aborted on unmount to stop the heavy transcript backfill loop.
  const transcribeAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    document.title = PAGE_TITLE
    return () => {
      document.title = 'Braat'
    }
  }, [])

  // Stop any in-flight transcription when the route unmounts.
  useEffect(() => {
    return () => {
      transcribeAbortRef.current?.abort()
    }
  }, [])

  const refresh = useCallback(
    async (h: FileSystemDirectoryHandle) => {
      try {
        const [list, durs, srtAudios] = await Promise.all([
          listEntries(h),
          loadEntryDurations(),
          listEntrySrtAudios(h),
        ])
        setEntries(list)
        setDurations(durs)

        // Load the first cue's text for every entry with a transcript sidecar,
        // so the entry list can show it as the title line. Best-effort: a
        // missing or unparseable sidecar just yields no preview.
        const previews = new Map<string, string>()
        for (const entry of list) {
          if (!srtAudios.has(entry.name)) continue
          const srt = await readEntrySrt(h, entry.name)
          if (srt && srt.trim() !== '') {
            const cues = parseSrt(srt)
            if (cues && cues.length > 0 && cues[0]!.text) {
              previews.set(entry.name, cues[0]!.text)
            }
          }
        }
        setTranscriptPreviews(previews)

        // Backfill durations for entries that don't have one (like in FSA, added by user)
        const missing = list.filter((e) => !durs.has(e.name))
        if (missing.length > 0) {
          void (async () => {
            let filled = 0
            for (const entry of missing) {
              const bytes = new Uint8Array(await entry.file.arrayBuffer())
              const measured = await measureAudioDuration(bytes)
              if (measured !== null) {
                void recordEntryDuration(entry.name, measured)
                filled += 1
                // Update the visible map so the list picks up the new value.
                setDurations((prev) => {
                  const next = new Map(prev)
                  next.set(entry.name, measured)
                  return next
                })
              }
            }
            console.info(
              '[journal] backfilled durations for',
              filled,
              'of',
              missing.length,
              'entries without one',
            )
          })()
        }

        // Backfill transcripts for entries lacking an SRT sidecar, when
        // transcription is enabled. Transcription is heavy (decode + VAD + model
        // inference), so run one entry at a time, checking the abort signal
        // between entries so it stops when the route unmounts. Fire-and-forget;
        // the status map drives the UI, and each completed entry's sidecar is
        // picked up on the next refresh.
        if (settings.transcriptionMode !== 'disabled') {
          const needTranscript = list.filter((e) => !srtAudios.has(e.name))
          if (needTranscript.length > 0) {
            // Abort any prior backfill (e.g. from a previous refresh) and start
            // a new one. Only one backfill runs at a time.
            transcribeAbortRef.current?.abort()
            const abort = new AbortController()
            transcribeAbortRef.current = abort
            void (async () => {
              let done = 0
              for (const entry of needTranscript) {
                if (abort.signal.aborted) break
                const status: TranscribeStatus = await transcribeEntry({
                  file: entry.file,
                  handle: h,
                  audioName: entry.name,
                  mode: settings.transcriptionMode,
                  signal: abort.signal,
                  onStatus: (s) => {
                    setTranscribeStatus((prev) => {
                      const next = new Map(prev)
                      next.set(entry.name, s)
                      return next
                    })
                  },
                })
                if (status.kind === 'done') {
                  done += 1
                  // Surface the preview text immediately rather than waiting for
                  // the whole batch to finish.
                  const srt = await readEntrySrt(h, entry.name)
                  if (srt && srt.trim() !== '') {
                    const cues = parseSrt(srt)
                    if (cues && cues.length > 0 && cues[0]!.text) {
                      setTranscriptPreviews((prev) => {
                        const next = new Map(prev)
                        next.set(entry.name, cues[0]!.text)
                        return next
                      })
                    }
                  }
                  setTranscribeStatus((prev) => {
                    const next = new Map(prev)
                    next.delete(entry.name)
                    return next
                  })
                }
              }
              if (abort.signal.aborted) return
              console.info(
                '[journal] backfilled transcripts for',
                done,
                'of',
                needTranscript.length,
                'entries without one',
              )
              setTranscribeStatus(new Map())
            })()
          }
        }
      } catch (err) {
        console.error('[journal] failed to list entries:', err)
        toast('Could not read the journal folder')
      }
    },
    [settings.transcriptionMode],
  )

  // Load the saved folder on mount and try to get access straight away.
  // ensureAccess only prompts when permission isn't already granted; navigating
  // here is a click, so within the same tab the activation carries over and the
  // prompt appears without a separate "Reconnect" step. If there's no activation
  // to prompt with (e.g. the journal was opened in a new tab), requestPermission
  // throws and we fall back to the reconnect gate.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const b = await loadJournalBackend()
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- set by cleanup across the await
      if (cancelled) return
      if (!b) {
        setBackend(null)
        return
      }
      setBackend(b)
      let access: JournalAccess = 'prompt'
      try {
        // OPFS handles report 'granted' immediately; FSA may need re-granting.
        access = await ensureAccess(b.handle)
      } catch {
        // No user activation available to prompt; the reconnect gate handles it.
      }
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- set by cleanup across the await
      if (cancelled) return
      if (access === 'granted') {
        setGranted(true)
        void refresh(b.handle)
        // The summary only matters for OPFS, but loading is cheap and keeps the
        // FSA path symmetric if we ever surface it there too.
        void getLastExportAt().then(setLastExportAt)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Re-list when the tab regains focus: entries may have been added (from the
  // analysis tool's "Save to voice journal") or changed in the OS file manager.
  // Also re-check OPFS persistence (read-only, so it never re-grants) so the
  // warning banner appears if persistent storage was revoked while we were away.
  useEffect(() => {
    if (!granted || !handle) return
    const onFocus = () => {
      void refresh(handle)
      void isPersisted().then((p) =>
        setBackend((b) =>
          b && b.kind === 'opfs' && b.persisted !== p
            ? { ...b, persisted: p }
            : b,
        ),
      )
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [granted, handle, refresh])

  // Revoke the last object URL on unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  // FSA only: pick (or change) the journal folder.
  const handleChooseFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) return
    let h: FileSystemDirectoryHandle
    try {
      h = await window.showDirectoryPicker({ mode: 'readwrite' })
    } catch {
      return // user dismissed the picker
    }
    await saveJournalHandle(h)
    setBackend({ kind: 'fsa', handle: h, persisted: true })
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

  // Desktop without FSA: the user chose to keep the journal in this browser
  // (OPFS) rather than switch to Chromium. Set it up and start listing. If
  // persistence was refused (e.g. a private window), say so -- the journal would
  // otherwise look set up while being unable to save anything.
  const handleContinueWithOpfs = useCallback(async () => {
    let b: JournalBackend
    try {
      b = await setupOpfsJournal()
    } catch (err) {
      // getDirectory() throws where OPFS is blocked (e.g. private browsing).
      console.error('[journal] failed to set up OPFS storage:', err)
      toast('Couldn’t set up storage', {
        description:
          'This browser blocked private storage — that can happen in a private window. Use a normal window, or a Chromium browser, to keep a journal.',
      })
      return
    }
    setBackend(b)
    setGranted(true)
    track('journal/setup')
    void refresh(b.handle)
    if (!b.persisted) {
      toast('Storage could not be enabled', {
        description:
          'A private window won’t keep recordings, so nothing can be saved here. Use a normal window, or a Chromium browser, to keep a journal.',
      })
    }
  }, [refresh])

  // OPFS only: retry the persistent-storage request (e.g. after the user has
  // installed Braat to the Home Screen). On success, recording is unblocked.
  const handleEnableStorage = useCallback(async () => {
    const ok = await requestPersistence()
    if (ok) {
      setBackend((b) => (b ? { ...b, persisted: true } : b))
    } else {
      toast('Storage could not be enabled', {
        description: isIos()
          ? 'Make sure you opened Braat from its Home Screen icon, then try again.'
          : 'A private window won’t keep recordings. Use a normal window, or a Chromium browser, to keep a journal.',
      })
    }
  }, [])

  const handleCloseJournal = useCallback(async () => {
    await clearJournalHandle()
    setBackend(null)
    setGranted(false)
    setEntries([])
    setPlayingName(null)
    setDurations(new Map())
    setLastExportAt(null)
  }, [])

  // OPFS only: zip every entry for backup/transfer. The OPFS store is
  // app-private, so this is the only way out -- without it the recordings live
  // and die with this browser profile.
  const handleExportZip = useCallback(async () => {
    if (!handle || entries.length === 0) return
    setExporting(true)
    try {
      const blob = await buildJournalZip(entries, handle)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      a.download = `braat-journal-${stamp}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      const now = Date.now()
      setLastExportAt(now)
      void storeSetLastExportAt(now)
      track('journal/export')
      const totalSec = [...durations.values()].reduce((s, v) => s + v, 0)
      toast('Exported journal', {
        description: `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} · ${formatDuration(totalSec)} recorded`,
      })
    } catch (err) {
      console.error('[journal] failed to export zip:', err)
      toast('Could not export the journal')
    } finally {
      setExporting(false)
    }
  }, [handle, entries, durations])

  // OPFS only: merge a previously-exported zip back into the store. Files that
  // already exist on disk are skipped (dedupe by filename), so re-importing the
  // same backup is a no-op and importing a different one adds only the new
  // entries. Durations from the archive's manifest are restored.
  const handleImportZip = useCallback(async () => {
    importInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(
    async (file: File) => {
      if (!handle) return
      setImporting(true)
      try {
        const result = await importJournalZip(handle, file)
        console.info(
          '[journal] import zip:',
          result.imported,
          'imported,',
          result.skipped,
          'skipped',
        )
        track('journal/import')
        void refresh(handle)
        toast('Imported journal', {
          description:
            result.imported === 0
              ? result.skipped > 0
                ? `All ${result.skipped} entr${result.skipped === 1 ? 'y' : 'ies'} already present`
                : 'No entries found in the zip'
              : `${result.imported} imported${
                  result.skipped > 0
                    ? ` · ${result.skipped} skipped (already present)`
                    : ''
                }`,
        })
      } catch (err) {
        console.error('[journal] failed to import zip:', err)
        toast('Could not import the zip', {
          description: 'Make sure it’s a Braat journal export (.zip).',
        })
      } finally {
        setImporting(false)
      }
    },
    [handle, refresh],
  )

  const handleImportFolder = useCallback(
    async (files: FileList) => {
      if (!handle) return
      setImporting(true)
      try {
        const result = await importJournalFolder(handle, files)
        console.info(
          '[journal] import folder:',
          result.imported,
          'imported,',
          result.skipped,
          'skipped',
        )
        track('journal/import')
        void refresh(handle)
        toast('Imported folder', {
          description:
            result.imported === 0
              ? result.skipped > 0
                ? `All ${result.skipped} entr${result.skipped === 1 ? 'y' : 'ies'} already present`
                : 'No audio files found in the folder'
              : `${result.imported} imported${
                  result.skipped > 0
                    ? ` · ${result.skipped} skipped (already present)`
                    : ''
                }`,
        })
      } catch (err) {
        console.error('[journal] failed to import folder:', err)
        toast('Could not import the folder')
      } finally {
        setImporting(false)
      }
    },
    [handle, refresh],
  )

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

  // SRT editor modal: the entry being edited, the loaded SRT text, and whether
  // an "improve transcript" run is in progress for it.
  const [srtEditorEntry, setSrtEditorEntry] = useState<JournalEntry | null>(
    null,
  )
  const [srtEditorText, setSrtEditorText] = useState('')
  const [srtImproving, setSrtImproving] = useState(false)

  // Open the SRT editor for an entry. If a transcript sidecar exists, load it;
  // otherwise decode + VAD the audio to build an SRT skeleton with `<voiced>`
  // placeholders the user can fill in by hand.
  const handleOpenSrtEditor = useCallback(
    async (entry: JournalEntry) => {
      if (!handle) return
      const srt = await readEntrySrt(handle, entry.name)
      if (srt !== null) {
        setSrtEditorText(srt)
      } else {
        // No sidecar: generate a VAD skeleton so the user has time ranges to
        // edit. Best-effort: if VAD fails, open with an empty editor.
        try {
          const skeleton = await generateSrtSkeleton(entry.file)
          setSrtEditorText(skeleton)
        } catch (err) {
          console.error('[journal] failed to generate SRT skeleton:', err)
          setSrtEditorText('')
        }
      }
      setSrtEditorEntry(entry)
    },
    [handle],
  )

  // Save the edited SRT back to the journal folder.
  const handleSaveSrt = useCallback(
    async (srt: string) => {
      if (!handle || !srtEditorEntry) return
      await writeEntrySrt(handle, srtEditorEntry.name, srt)
      track('journal/edit-srt')
      await refresh(handle)
    },
    [handle, srtEditorEntry, refresh],
  )

  // Re-transcribe the entry with the large (Whisper) model, overwriting the SRT.
  const handleImproveTranscript = useCallback(async () => {
    if (!handle || !srtEditorEntry) return
    setSrtImproving(true)
    try {
      const status = await transcribeEntry({
        file: srtEditorEntry.file,
        handle,
        audioName: srtEditorEntry.name,
        mode: settings.transcriptionMode,
        forceTier: 'large',
        onStatus: (s) => {
          if (s.kind === 'done' || s.kind === 'error') return
        },
      })
      if (status.kind === 'done') {
        const srt = await readEntrySrt(handle, srtEditorEntry.name)
        setSrtEditorText(srt ?? '')
        await refresh(handle)
        track('journal/improve-transcript')
        toast('Transcript improved', {
          description: 'The updated transcript has been saved.',
        })
      } else if (status.kind === 'error') {
        toast('Could not improve transcript', {
          description: status.message,
        })
      }
    } finally {
      setSrtImproving(false)
    }
  }, [handle, srtEditorEntry, settings.transcriptionMode, refresh])

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
      void deleteEntryDuration(entry.name)
      void deleteEntrySrt(handle, entry.name)
      track('journal/delete')
      void refresh(handle)
      toast('Entry deleted', { description: entry.name })
    } catch (err) {
      console.error('[journal] failed to delete entry:', err)
      toast('Could not delete this entry')
    }
  }, [pendingDelete, handle, playingName, refresh])

  // The folder section (and its name) is only meaningful for the FSA backend;
  // OPFS storage is app-private with no user-facing folder.
  const isFsa = backend?.kind === 'fsa'
  const folderName = isFsa ? backend.handle.name : undefined

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
        <DropdownMenuItem onClick={() => setTranscriptionSettingsOpen(true)}>
          <FileText className="size-4" />
          Transcription settings
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
      <NavBar actions={settingsMenu} />

      <div className="flex-1 overflow-y-auto">
        {backend?.kind === 'opfs' && granted && (
          <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            {(() => {
              const summary = summarizeSinceExport(
                entries,
                durations,
                lastExportAt,
              )
              if (entries.length === 0) {
                return (
                  <p className="text-muted-foreground">
                    Export your recordings to a zip you can keep, move, or
                    recover &mdash; this journal lives inside Braat itself, so a
                    backup is the only way out.
                  </p>
                )
              }
              if (lastExportAt === null) {
                const totalSec = [...durations.values()].reduce(
                  (s, v) => s + v,
                  0,
                )
                return (
                  <p className="text-muted-foreground">
                    You have {entries.length} entr
                    {entries.length === 1 ? 'y' : 'ies'} (
                    {formatDuration(totalSec)}) that haven’t been exported yet.
                  </p>
                )
              }
              if (summary.count === 0) {
                return (
                  <p className="text-muted-foreground">
                    Everything is backed up &mdash; no new recordings since your
                    last export.
                  </p>
                )
              }
              return (
                <p className="text-muted-foreground">
                  You’ve recorded {formatDuration(summary.seconds)} in{' '}
                  {summary.count} journal
                  {summary.count === 1 ? '' : 's'} since you last exported.
                </p>
              )
            })()}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExportZip()}
                disabled={entries.length === 0 || exporting}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Export all
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" disabled={importing} />
                  }
                >
                  {importing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Import...
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={4}
                  className="w-56"
                >
                  {entries.length > 0 && (
                    <>
                      <p className="px-1.5 py-1 text-xs text-muted-foreground leading-relaxed">
                        Imported files are merged with your existing journal
                        entries.
                      </p>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => void handleImportZip()}
                    disabled={importing}
                  >
                    <Upload className="size-4" />
                    Add zip file
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => importFolderInputRef.current?.click()}
                    disabled={importing}
                  >
                    <FolderInput className="size-4" />
                    Add audio in folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void handleImportFile(file)
              }}
            />
            <input
              ref={importFolderInputRef}
              type="file"
              // webkitdirectory is non-standard but works cross-browser and is
              // the only folder-pick primitive available on Safari/Firefox. The
              // TS DOM type omits it, so we set it via a spread attribute below.
              className="hidden"
              onChange={(e) => {
                const files = e.target.files
                e.target.value = ''
                if (files && files.length > 0) void handleImportFolder(files)
              }}
              {...({ webkitdirectory: '' } as { webkitdirectory?: string })}
            />
          </div>
        )}
        {backend?.kind === 'opfs' && !backend.persisted && granted && (
          <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-3 rounded-lg border-2 border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-300">
            <div className="flex items-center gap-2 font-semibold">
              <TriangleAlert className="size-5 shrink-0" />
              Your recordings could be deleted
            </div>
            <p className="leading-relaxed">
              This browser hasn’t granted Braat protected storage, so your
              journal can be erased without warning &mdash; when the browser
              clears site data, or after a period without using Braat. New
              recordings can’t be saved until you fix this, and you should
              export a backup now to be safe.
            </p>
            <Button
              variant="destructive"
              className="self-start"
              onClick={() => void handleEnableStorage()}
            >
              <TriangleAlert className="size-4" />
              Enable protected storage
            </Button>
          </div>
        )}
        {backend === undefined ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : backend === null ? (
          <div className="mx-auto max-w-md px-4 py-12">
            <JournalSetupContent
              guidance={journalSetupGuidance()}
              onChooseFolder={() => void handleChooseFolder()}
              onContinueAnyway={() => void handleContinueWithOpfs()}
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
              const status = transcribeStatus.get(entry.name)
              const isTranscribing = status?.kind === 'running'
              const preview = transcriptPreviews.get(entry.name)
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
                    <p className="truncate text-sm font-medium">
                      {preview ?? entry.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.lastModified).toLocaleString()}
                      {durations.has(entry.name) &&
                        ` · ${formatDuration(durations.get(entry.name)!)}`}
                      {isErrored && ' · unsupported format'}
                      {isTranscribing &&
                        ` · transcribing${
                          status.total > 0
                            ? ` (${status.done + 1}/${status.total})`
                            : '…'
                        }`}
                      {!isTranscribing &&
                        status?.kind === 'error' &&
                        ' · transcript failed'}
                    </p>
                  </div>
                  {!isTranscribing && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit transcript (SRT)"
                            onClick={() => void handleOpenSrtEditor(entry)}
                          />
                        }
                      >
                        <FileText className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent sideOffset={8}>
                        Edit transcript (SRT)
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {isTranscribing && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
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

      {granted && backend && (
        <JournalRecorder
          handle={backend.handle}
          onSaved={() => void refresh(backend.handle)}
          folderName={folderName ?? backend.handle.name}
          kind={backend.kind}
          persisted={backend.persisted}
        />
      )}

      <AudioSettingsModal
        open={audioSettingsOpen}
        onOpenChange={setAudioSettingsOpen}
      />

      <TranscriptionSettingsModal
        open={transcriptionSettingsOpen}
        onOpenChange={setTranscriptionSettingsOpen}
      />

      <SrtEditorModal
        open={srtEditorEntry !== null}
        onOpenChange={(open) => !open && setSrtEditorEntry(null)}
        audioName={srtEditorEntry?.name ?? ''}
        audioFile={srtEditorEntry?.file ?? null}
        srt={srtEditorText}
        onSave={handleSaveSrt}
        onImprove={handleImproveTranscript}
        improving={srtImproving}
        canImprove={settings.transcriptionMode === 'large'}
        transcriptionDisabled={settings.transcriptionMode === 'disabled'}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.name} will be permanently removed from{' '}
              {folderName ? `“${folderName}”` : 'this device'}. This can’t be
              undone.
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
    // Landing on /journal opts the user into the journal feature: set the
    // localStorage flag rather than bouncing them away.
    try {
      localStorage.setItem('ENABLE_JOURNAL', '1')
    } catch {
      // localStorage can throw in some privacy modes / sandboxed contexts.
    }
  },
})
