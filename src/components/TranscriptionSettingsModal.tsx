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

import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { LocalTranscriptionStatus } from '#/lib/checkFeatures'
import type { TranscriptionMode } from '#/lib/settings'
import { useSettings, updateSettings } from '#/lib/settings'
import { useBrowserSpeechRecognitionAvailable } from '#/lib/useBrowserSpeechRecognitionAvailable'
import { cn } from '#/lib/utils'

/** Badge describing whether the browser's own on-device engine can be used. */
function browserEngineBadge(local: LocalTranscriptionStatus | null): ReactNode {
  switch (local) {
    case null:
      return <Badge variant="outline">Checking…</Badge>
    case 'downloaded':
      return <Badge variant="secondary">Ready</Badge>
    case 'available':
      return null
    case false:
      return <Badge variant="outline">Unavailable</Badge>
  }
}

function ModeCard({
  selected,
  disabled = false,
  onSelect,
  title,
  description,
  badge,
}: {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  title: string
  description?: string
  badge?: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        disabled
          ? 'cursor-not-allowed border-border opacity-55'
          : selected
            ? 'cursor-pointer border-primary bg-primary/5'
            : 'cursor-pointer border-border hover:bg-muted/50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/40',
            )}
          >
            {selected && <Check className="size-3" />}
          </span>
          {title}
        </span>
        {badge}
      </div>
      {description ? (
        <p className="pl-6 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </button>
  )
}

export function TranscriptionSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const settings = useSettings()
  const availability = useBrowserSpeechRecognitionAvailable()
  const local = availability?.local ?? null
  const mode = settings.transcriptionMode

  // The dialog edits a draft and only commits when Save is pressed. Reset it to
  // the saved value whenever the dialog opens (adjusting state during render
  // rather than in an effect, per the React docs).
  const [draft, setDraft] = useState<TranscriptionMode>(mode)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(mode)
  }

  // While the probe is still in flight (availability === null) we don't yet know
  // what's supported, so we leave engines selectable; unavailable ones disable
  // once it resolves. The bundled model is always available.
  const browserEngineAvailable = local !== false
  const cloudAvailable = availability === null ? true : availability.browser

  const save = () =>
    void updateSettings({ transcriptionMode: draft }).then(() => {
      toast('Setting applied')
      onOpenChange(false)
    })

  // The action's label reflects the kind of change being saved: turning
  // transcription on, turning it off, or just switching between engines.
  const saveLabel =
    mode === 'disabled' && draft !== 'disabled'
      ? 'Enable transcription'
      : mode !== 'disabled' && draft === 'disabled'
        ? 'Disable transcription'
        : 'Save'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transcription settings</DialogTitle>
          <DialogDescription>
            Choose how Braat turns your speech into text.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div
            role="radiogroup"
            aria-label="Transcription method"
            className="flex flex-col gap-5 py-1"
          >
            {/* Turn transcription off entirely. */}
            <section className="flex flex-col gap-3">
              <ModeCard
                selected={draft === 'disabled'}
                onSelect={() => setDraft('disabled')}
                title="Don’t transcribe"
              />
            </section>

            {/* Engines that run locally — audio stays in this browser. */}
            <section className="flex flex-col gap-3 border-t border-border/60 pt-5">
              <header className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  On your device
                </h3>
                <p className="text-xs text-muted-foreground">
                  Private — your audio never leaves this browser.
                </p>
              </header>

              <ModeCard
                selected={draft === 'browser' && browserEngineAvailable}
                disabled={!browserEngineAvailable}
                onSelect={() => setDraft('browser')}
                title="Browser engine"
                badge={browserEngineBadge(local)}
                description={
                  'Uses your browser’s own on-device speech recognition' +
                  (local === 'available'
                    ? '; large download on first use, then offline.'
                    : '.')
                }
              />
              <ModeCard
                selected={draft === 'bundled'}
                onSelect={() => setDraft('bundled')}
                title="Bundled model"
                description="Braat’s bundled Moonshine model. 70 MB model download on first use, then offline."
              />
            </section>

            {/* Remote (cloud) transcription — opt-in. */}
            <section className="flex flex-col gap-3 border-t border-border/60 pt-5">
              <header className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Off your device
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sent to a remote service — only if you allow it.
                </p>
              </header>

              <ModeCard
                selected={draft === 'cloud' && cloudAvailable}
                disabled={!cloudAvailable}
                onSelect={() => setDraft('cloud')}
                title="Cloud transcription"
                badge={
                  cloudAvailable ? null : (
                    <Badge variant="outline">Unavailable</Badge>
                  )
                }
                description="Uses your browser's speech recognition. May use your browser or operating system's remote service, subject to that vendor's privacy policy."
              />
            </section>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={save} disabled={draft === mode}>
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
