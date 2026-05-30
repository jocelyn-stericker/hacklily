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

import { Loader2 } from 'lucide-react'

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
  dismissBrowserEngineInstallState,
  useBrowserEngineInstallState,
} from '#/lib/installBrowserEngine'

// The Web Speech API doesn't expose install progress, so the running state is
// an indeterminate spinner. A failed install keeps the modal open with a
// dismiss action so the user has a chance to read the error before the chunk's
// own error indicator (a small triangle in the speech strip) is all that's left.
export function BrowserEngineInstallModal() {
  const state = useBrowserEngineInstallState()
  if (state.status === 'idle') return null

  const isFailed = state.status === 'failed'

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && isFailed) dismissBrowserEngineInstallState()
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isFailed
              ? 'Couldn’t install transcription engine'
              : 'Downloading transcription engine…'}
          </DialogTitle>
          <DialogDescription>
            {isFailed
              ? state.error
              : 'Your browser is downloading its on-device speech recognition model. This is a one-time download — it may take a few minutes.'}
          </DialogDescription>
        </DialogHeader>
        {isFailed ? (
          <DialogFooter>
            <Button onClick={dismissBrowserEngineInstallState}>Dismiss</Button>
          </DialogFooter>
        ) : (
          <div className="flex justify-center py-4">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
