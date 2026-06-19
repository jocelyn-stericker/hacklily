// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { Link } from '@tanstack/react-router'
import {
  ChevronRight,
  FolderOpen,
  Languages,
  MicVocal,
  Metronome,
} from 'lucide-react'

import braatPng from '#/braat.png'
import { Button } from '#/components/ui/button'

interface WelcomeModalProps {
  open: boolean
  onStartRecording: () => void
  onOpenFile: () => void
}

export function WelcomeModal({
  open,
  onStartRecording,
  onOpenFile,
}: WelcomeModalProps) {
  if (!open) return null

  // Absolute (not fixed/portal) overlay so it only covers its relative parent --
  // the waveform + spectrogram region -- leaving the Toolbar header usable.
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 supports-backdrop-filter:backdrop-blur-xs animate-in fade-in-0 duration-100">
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Welcome to Braat"
        className="flex flex-col max-h-[calc(100%-2rem)] w-full max-w-[calc(100%-2rem)] sm:max-w-sm gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-100"
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col items-center gap-4 py-2">
            <img src={braatPng} className="h-12 bg-[#8ace00]" alt="Braat" />
            <div className="flex flex-col gap-2 w-full">
              <Button
                variant="default"
                className="w-full h-12 text-base gap-2 cursor-pointer"
                onClick={onStartRecording}
              >
                <MicVocal className="size-5" />
                Analyze from Microphone
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full cursor-pointer"
                onClick={onOpenFile}
              >
                <FolderOpen className="size-4" />
                Import Audio File
              </Button>
            </div>
            <div className="flex w-full flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Other tools
              </span>
              <Link
                to="/practice"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <Metronome className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">Practice</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <Link
                to="/ipa"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <Languages className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">English to IPA</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </div>
          </div>
          <div className="text-xs space-y-2 text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
            <span className="block">
              Braat shows you the pitch and resonance of your voice in real time
              &mdash; a practice aid for voice training, including trans voice
              training. Algorithms are adapted from{' '}
              <a
                href="https://www.fon.hum.uva.nl/praat/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Praat
              </a>
              . Audio is processed entirely in your browser.
            </span>
            <span className="block">
              This is free software, released under the{' '}
              <a
                href="https://www.gnu.org/licenses/agpl-3.0.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                GNU AGPL v3 or (at your option) any later version
              </a>{' '}
              &mdash; source code &amp; feedback on{' '}
              <a
                href="https://codeberg.org/jocelyn-stericker/braat"
                target="_blank"
                rel="noopener noreferrer"
              >
                Codeberg
              </a>
              .
            </span>
            <span className="block">
              Made by Jocelyn Stericker {'<'}jocelyn@nettek.ca{'>'}{' '}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
