// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// SRT editor modal: a structured cue list for editing a journal entry's
// transcript sidecar. Each cue has a play button (plays that time range), a
// timecode label, and an editable text field. Save is disabled when no cue text
// has changed. Includes an "improve transcript" button (re-transcribe with
// Whisper) when large mode is enabled, and a "save as" button for download.

import { Download, Loader2, Pause, Play, Save, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { cuesToSrt, formatSrtTime, parseSrt } from '#/lib/journal/journalSrt'
import type { SrtCue } from '#/lib/journal/journalSrt'

export interface SrtEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The entry's audio filename (for the title). */
  audioName: string
  /** Current SRT text (loaded when the modal opens). */
  srt: string
  /** The audio file for playback. */
  audioFile: File | null
  /** Save the edited SRT back to the journal folder. */
  onSave: (srt: string) => Promise<void>
  /** Re-transcribe with the large (Whisper) model. */
  onImprove?: () => Promise<void>
  /** Whether an "improve transcript" run is in progress. */
  improving?: boolean
  /** Whether to show the "Improve transcript" button (large mode enabled). */
  canImprove?: boolean
  /** Whether automated transcription is disabled (show a config hint). */
  transcriptionDisabled?: boolean
}

export function SrtEditorModal({
  open,
  onOpenChange,
  audioName,
  srt,
  audioFile,
  onSave,
  onImprove,
  improving = false,
  canImprove = false,
  transcriptionDisabled = false,
}: SrtEditorModalProps) {
  // Parse the SRT prop into cues for the structured editor.
  const cues = useMemo<SrtCue[]>(() => {
    if (srt.trim() === '') return []
    return parseSrt(srt) ?? []
  }, [srt])

  // Editable text per cue, keyed by cue index. Kept in sync with the parsed
  // cues when the prop changes.
  const [texts, setTexts] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Detect prop changes (e.g. after "improve transcript") and re-sync without
  // an effect.
  const [lastSyncedSrt, setLastSyncedSrt] = useState(srt)
  if (srt !== lastSyncedSrt) {
    setLastSyncedSrt(srt)
    setTexts(cues.map((c) => c.text))
    setDirty(false)
  }

  // Also sync on open, when the prop may not have changed identity but the
  // modal is freshly opened for a different entry.
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setTexts(cues.map((c) => c.text))
      setDirty(false)
    }
  }

  // --- Audio playback ---
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrl = useMemo(() => {
    if (!open || !audioFile) return null
    return URL.createObjectURL(audioFile)
  }, [open, audioFile])
  // Revoke the previous URL when it changes or on unmount.
  useEffect(() => {
    if (!audioUrl) return
    return () => URL.revokeObjectURL(audioUrl)
  }, [audioUrl])
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const playEndRef = useRef<number | null>(null)

  const handlePlayCue = useCallback(
    (idx: number) => {
      const audio = audioRef.current
      if (!audio || !cues[idx]) return
      // Toggle: if already playing this cue, stop.
      if (playingIdx === idx) {
        audio.pause()
        setPlayingIdx(null)
        return
      }
      audio.currentTime = cues[idx].startSec
      playEndRef.current = cues[idx].endSec
      void audio.play()
      setPlayingIdx(idx)
    },
    [cues, playingIdx],
  )

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio || playEndRef.current === null) return
    if (audio.currentTime >= playEndRef.current) {
      audio.pause()
      playEndRef.current = null
      setPlayingIdx(null)
    }
  }, [])

  const handleAudioEnded = useCallback(() => {
    playEndRef.current = null
    setPlayingIdx(null)
  }, [])

  // Serialise the edited cues back to SRT.
  const editedSrt = useMemo(() => {
    if (cues.length === 0) return ''
    return cuesToSrt(
      cues.map((cue, i) => ({ ...cue, text: texts[i] ?? cue.text })),
    )
  }, [cues, texts])

  const valid = useMemo(() => {
    if (editedSrt.trim() === '') return true
    return parseSrt(editedSrt) !== null
  }, [editedSrt])

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      await onSave(editedSrt)
      setDirty(false)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transcript — {audioName}</DialogTitle>
          <DialogDescription>
            Edit the SRT subtitle file. Changes are saved to the journal folder
            alongside the audio.
            {transcriptionDisabled && (
              <>
                {' '}
                Enable automatic transcription in the settings menu to have
                transcripts generated for you.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {cues.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No speech segments detected. Record or import audio with speech to
            generate a transcript.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-lg border border-input">
            {cues.map((cue, idx) => {
              const isPlaying = playingIdx === idx
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 border-b border-border px-2 py-1.5 last:border-b-0"
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={isPlaying ? 'Pause' : 'Play cue'}
                    disabled={!audioUrl}
                    onClick={() => handlePlayCue(idx)}
                    className="mt-0.5 shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="size-3.5" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatSrtTime(cue.startSec)} →{' '}
                      {formatSrtTime(cue.endSec)}
                    </p>
                    <textarea
                      value={texts[idx] ?? cue.text}
                      onChange={(e) => {
                        setTexts((prev) => {
                          const next = [...prev]
                          // Pad with the original cue texts (not empty strings)
                          // so unedited cues keep their value.
                          while (next.length < cues.length)
                            next.push(cues[next.length]!.text)
                          next[idx] = e.target.value
                          return next
                        })
                        setDirty(true)
                      }}
                      rows={1}
                      spellCheck={true}
                      className="w-full resize-y rounded-sm bg-transparent text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!valid && (
          <p className="text-xs text-destructive">
            Invalid SRT format — check cue timecodes and text.
          </p>
        )}

        <DialogFooter>
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
            {canImprove && onImprove && (
              <Button
                variant="outline"
                onClick={() => void onImprove()}
                disabled={improving}
                className="sm:mr-auto"
              >
                {improving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Improve transcript
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([editedSrt], {
                  type: 'application/x-subrip',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                const dot = audioName.lastIndexOf('.')
                a.download = `${dot < 0 ? audioName : audioName.slice(0, dot)}.srt`
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="size-4" />
              Save as…
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!valid || saving || !dirty}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Hidden audio element for cue playback. Lives outside DialogContent
          so the audio keeps playing while the modal is open. */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          hidden
        />
      )}
    </Dialog>
  )
}
