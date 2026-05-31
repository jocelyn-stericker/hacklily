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
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  dismissMoonshineDownloadState,
  useMoonshineDownloadState,
} from '#/lib/transcription-bundled'

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// The bundled Moonshine model is fetched on first use of the "bundled"
// transcription mode. The worker reports aggregate progress; we render a
// determinate bar, falling back to an indeterminate spinner if total bytes
// aren't known yet. A failed load keeps the modal open with a dismiss action.
// transformers.js fires the same progress events for cache reads as for
// network downloads, but the state store delays surfacing them — so warm
// cache loads never reach this component as a `downloading` status.
export function MoonshineDownloadModal() {
  const state = useMoonshineDownloadState()
  if (state.status === 'idle') return null

  const isFailed = state.status === 'failed'
  const loaded = state.status === 'downloading' ? state.loaded : 0
  const total = state.status === 'downloading' ? state.total : 0
  const percent =
    state.status === 'downloading' && total > 0
      ? Math.min(100, (loaded / total) * 100)
      : null

  if (percent === 100) {
    return null
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && isFailed) dismissMoonshineDownloadState()
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isFailed
              ? 'Couldn’t download transcription model'
              : 'Downloading transcription model…'}
          </DialogTitle>
          <DialogDescription>
            {isFailed
              ? state.error
              : 'Braat is downloading the on-device speech recognition model. This is a one-time download — it may take a few minutes.'}
          </DialogDescription>
        </DialogHeader>
        {isFailed ? (
          <DialogFooter>
            <Button onClick={dismissMoonshineDownloadState}>Dismiss</Button>
          </DialogFooter>
        ) : (
          <DialogBody>
            {percent === null ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 py-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-150"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
                  <span>
                    {formatMB(loaded)} / {formatMB(total)}
                  </span>
                  <span>{Math.round(percent)}%</span>
                </div>
              </div>
            )}
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}
