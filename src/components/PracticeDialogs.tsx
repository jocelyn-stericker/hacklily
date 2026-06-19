// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
//
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

export function PracticeDialogs({
  blocked,
  onResetBlocker,
  onLeave,
  confirmingClearSession,
  onConfirmClearSession,
  onCancelClearSession,
}: {
  blocked: boolean
  onResetBlocker: () => void
  onLeave: () => void
  confirmingClearSession: boolean
  onConfirmClearSession: () => void
  onCancelClearSession: () => void
}) {
  return (
    <>
      {blocked && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              onResetBlocker()
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard practice session?</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Your takes will be lost if you leave this page.
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={onResetBlocker}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onLeave}>
                Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {confirmingClearSession && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              onCancelClearSession()
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard practice session?</DialogTitle>
            </DialogHeader>
            <DialogDescription>All takes will be removed.</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => onCancelClearSession()}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => onConfirmClearSession()}
              >
                Discard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
