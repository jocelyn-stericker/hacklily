// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { FolderOpen } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Dialog, DialogContent } from '#/components/ui/dialog'

// The setup explanation + folder picker, without any dialog chrome. Rendered as
// a modal in the analysis tool and inline on the /journal route (so the route's
// header stays usable before a folder is chosen).
export function JournalSetupContent({
  supported,
  onChooseFolder,
  folderName,
}: {
  supported: boolean
  onChooseFolder: () => void
  /** When re-choosing, the name of the currently selected folder. */
  folderName?: string
}) {
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
      <Button
        onClick={onChooseFolder}
        disabled={!supported}
        className="self-start"
      >
        <FolderOpen className="size-4" />
        {folderName ? 'Choose a different folder' : 'Choose folder'}
      </Button>
      {!supported && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          Currently only Chromium-based browsers (Chrome, Edge) support saving
          to a folder.
        </p>
      )}
    </div>
  )
}

// Modal form, used by the analysis tool's "Set up voice journal" menu item.
export function JournalSetupModal({
  open,
  onOpenChange,
  supported,
  onChooseFolder,
  folderName,
}: {
  open: boolean
  onOpenChange?: (open: boolean) => void
  supported: boolean
  onChooseFolder: () => void
  folderName?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        aria-label="Set up your voice journal"
      >
        <JournalSetupContent
          supported={supported}
          onChooseFolder={onChooseFolder}
          folderName={folderName}
        />
      </DialogContent>
    </Dialog>
  )
}
