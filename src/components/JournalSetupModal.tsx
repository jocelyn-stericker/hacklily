// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { FolderOpen, Share } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Dialog, DialogContent } from '#/components/ui/dialog'
import type { JournalSetupGuidance } from '#/lib/journal/journalBackend'

// The setup explanation, without any dialog chrome. Rendered as a modal in the
// analysis tool and inline on the /journal route (so the route's header stays
// usable before the journal is ready). What it shows depends on `guidance`:
//   - 'choose-folder': the File System Access folder picker (Chromium).
//   - 'add-to-home':   iOS instructions to install Braat to the Home Screen.
//   - 'use-chromium':  a nudge to open Braat in a Chromium browser.
export function JournalSetupContent({
  guidance,
  onChooseFolder,
  onContinueAnyway,
  folderName,
}: {
  guidance: JournalSetupGuidance
  onChooseFolder: () => void
  /** Continue with the OPFS store on a desktop browser that lacks FSA. */
  onContinueAnyway?: () => void
  /** When re-choosing (FSA only), the name of the currently selected folder. */
  folderName?: string
}) {
  // iOS: the journal lives in app-private storage that Safari can clear after a
  // week unless Braat is installed to the Home Screen, so guide that first.
  if (guidance === 'add-to-home') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-base leading-none font-medium">
            Add Braat to your Home Screen
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            On iPhone and iPad, you can store a voice journal privately on your
            device by adding Braat to your Home Screen and opening it from
            there.
          </p>
        </div>
        <ol className="flex flex-col gap-1 pl-5 text-sm text-muted-foreground leading-relaxed list-decimal">
          <li>
            Tap the Share button{' '}
            <Share className="inline size-4 align-text-bottom" /> in Safari.
          </li>
          <li>Choose &ldquo;Add to Home Screen&rdquo;.</li>
          <li>Open Braat from the new Home Screen icon.</li>
        </ol>
      </div>
    )
  }

  // Desktop without FSA (Firefox/Safari): recommend a Chromium browser for the
  // real folder experience, but let the user continue with the app-private OPFS
  // store as long as they understand they must export and back it up themselves.
  if (guidance === 'use-chromium') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-base leading-none font-medium">
            Set up your voice journal
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This browser can&rsquo;t save recordings to a folder you choose
            &mdash; that feature is currently only in Chromium-based browsers
            (Chrome, Edge, Opera). There, your journal lives as ordinary files
            you fully control, so we&rsquo;d recommend opening Braat in one of
            them.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can also keep a journal right here. It&rsquo;ll be stored
            privately in this browser &mdash; nothing is uploaded &mdash; but to
            keep it safe you&rsquo;ll need to export a zip of your recordings
            now and then and back it up yourself.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={onContinueAnyway}
          className="self-start"
        >
          Continue in this browser anyway
        </Button>
      </div>
    )
  }

  // No usable storage at all (very old browser).
  if (guidance === 'unsupported') {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base leading-none font-medium">
          Voice journal isn&rsquo;t available
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This browser can&rsquo;t store a voice journal. Try a recent version
          of Chrome, Edge, Firefox, or Safari.
        </p>
      </div>
    )
  }

  // 'choose-folder': the File System Access picker flow.
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base leading-none font-medium">
          {folderName ? 'Change journal folder' : 'Set up your voice journal'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Pick a folder on this computer to use as your voice journal. You can
          save recordings there to track your voice over time, and any audio
          files in the folder show up here too.
        </p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Nothing is saved unless you ask. The files are yours &mdash; keep, move,
        sync, or delete them however you like. Anyone who can open the folder
        can play them back.
      </p>
      {folderName && (
        <p className="text-sm">
          Current folder: <span className="font-medium">{folderName}</span>
        </p>
      )}
      <Button onClick={onChooseFolder} className="self-start">
        <FolderOpen className="size-4" />
        {folderName ? 'Choose a different folder' : 'Choose folder'}
      </Button>
    </div>
  )
}

// Modal form, used by the analysis tool's "Set up voice journal" menu item.
export function JournalSetupModal({
  open,
  onOpenChange,
  guidance,
  onChooseFolder,
  onContinueAnyway,
  folderName,
}: {
  open: boolean
  onOpenChange?: (open: boolean) => void
  guidance: JournalSetupGuidance
  onChooseFolder: () => void
  onContinueAnyway?: () => void
  folderName?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        aria-label="Set up your voice journal"
      >
        <JournalSetupContent
          guidance={guidance}
          onChooseFolder={onChooseFolder}
          onContinueAnyway={onContinueAnyway}
          folderName={folderName}
        />
      </DialogContent>
    </Dialog>
  )
}
