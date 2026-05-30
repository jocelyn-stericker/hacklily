/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { AudioSettingsModal } from '#/components/AudioSettingsModal'
import { BrowserEngineInstallModal } from '#/components/BrowserEngineInstallModal'
import { MoonshineDownloadModal } from '#/components/MoonshineDownloadModal'
import { TranscriptionSettingsModal } from '#/components/TranscriptionSettingsModal'
import type { AnalysisChunk } from '#/lib/AnalysisFrame'

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
import { WelcomeModal } from './WelcomeModal'

export function Dialogs({
  analysisMut,
  status,
  onAcknowledgeError,
  onStartRecording,
  openFilePicker,
  confirmingNew,
  onCancelNew,
  onConfirmNew,
  showAudioSettings,
  onCloseAudioSettings,
  showTranscriptionSettings,
  onCloseTranscriptionSettings,
}: {
  analysisMut: AnalysisChunk[]
  status: Status
  onAcknowledgeError: () => void
  onStartRecording: () => void
  openFilePicker: () => void
  confirmingNew: boolean
  onCancelNew: () => void
  onConfirmNew: () => void
  showAudioSettings: boolean
  onCloseAudioSettings: () => void
  showTranscriptionSettings: boolean
  onCloseTranscriptionSettings: (open: boolean) => void
}) {
  const showWelcome = analysisMut.length === 0 && status.value === 'inactive'

  return (
    <>
      <WelcomeModal
        open={showWelcome}
        onStartRecording={onStartRecording}
        onOpenFile={openFilePicker}
      />
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
      <AudioSettingsModal
        open={showAudioSettings}
        onOpenChange={onCloseAudioSettings}
      />
      <TranscriptionSettingsModal
        open={showTranscriptionSettings}
        onOpenChange={onCloseTranscriptionSettings}
      />
      <BrowserEngineInstallModal />
      <MoonshineDownloadModal />
    </>
  )
}
