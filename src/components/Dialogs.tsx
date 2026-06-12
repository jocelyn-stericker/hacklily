// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { TranscriptionSettingsModal } from '#/components/TranscriptionSettingsModal'
import { VowelChartSettingsModal } from '#/components/VowelChartSettingsModal'

import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import type { Status } from './useTimelineState'

export function Dialogs({
  status,
  onAcknowledgeError,
  confirmingNew,
  onCancelNew,
  onConfirmNew,
  confirmingNavigate,
  onCancelNavigate,
  onConfirmNavigate,
  showAudioSettings,
  onCloseAudioSettings,
  showTranscriptionSettings,
  onCloseTranscriptionSettings,
  showVowelChartSettings,
  onCloseVowelChartSettings,
}: {
  status: Status
  onAcknowledgeError: () => void
  confirmingNew: boolean
  onCancelNew: () => void
  onConfirmNew: () => void
  confirmingNavigate: boolean
  onCancelNavigate: () => void
  onConfirmNavigate: () => void
  showAudioSettings: boolean
  onCloseAudioSettings: () => void
  showTranscriptionSettings: boolean
  onCloseTranscriptionSettings: (open: boolean) => void
  showVowelChartSettings: boolean
  onCloseVowelChartSettings: (open: boolean) => void
}) {
  return (
    <>
      <Dialog open={status.value === 'analyzing'}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Analyzing audio…</DialogTitle>
            <DialogDescription>This may take a moment.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Dialog open={status.value === 'error'} onOpenChange={onAcknowledgeError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Something went wrong</DialogTitle>
            <DialogDescription>
              {status.value === 'error' ? status.error : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmingNew}
        onOpenChange={(open) => !open && onCancelNew()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your current recording will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelNew}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirmNew}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmingNavigate}
        onOpenChange={(open) => !open && onCancelNavigate()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your current recording will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelNavigate}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirmNavigate}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AudioSettingsModal
        open={showAudioSettings}
        onOpenChange={onCloseAudioSettings}
      />
      <TranscriptionSettingsModal
        open={showTranscriptionSettings}
        onOpenChange={onCloseTranscriptionSettings}
      />
      <VowelChartSettingsModal
        open={showVowelChartSettings}
        onOpenChange={onCloseVowelChartSettings}
      />
    </>
  )
}
