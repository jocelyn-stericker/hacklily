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

import {
  CaptionsOff,
  Check,
  Cloud,
  Loader2,
  Sparkle,
  Sparkles,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
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
import { useBrowserSpeechRecognitionAvailable } from '#/components/useBrowserSpeechRecognitionAvailable'
import {
  useDownloadState,
  useModelDownloaded,
} from '#/components/useModelDownloaded'
import { useSettings } from '#/components/useSettings'
import type { DownloadModel } from '#/lib/modelDownload'
import { cancelDownload, startDownload } from '#/lib/modelDownload'
import type { TranscriptionMode } from '#/lib/settings'
import { resolveSmallEngine } from '#/lib/transcription'
import { cn } from '#/lib/utils'

const LOG = '[TranscriptionSettings]'

function TranscriptIcon({
  mode,
  ...props
}: { mode: TranscriptionMode } & LucideProps) {
  switch (mode) {
    case 'cloud':
      return <Cloud {...props} />
    case 'large':
      return <Sparkles {...props} />
    case 'disabled':
      return <CaptionsOff {...props} />
    case 'small':
      return <Sparkle {...props} />
    default:
      return null
  }
}

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Progress for an in-flight download: a determinate bar once the total size is
// known, an indeterminate spinner before that (and for the browser engine,
// whose install reports no byte progress).
function DownloadProgress({
  loaded,
  total,
  label,
}: {
  loaded: number
  total: number
  // Names the model being fetched, for when one control downloads several in
  // turn (Accurate). Omitted for a single-model control.
  label?: string
}) {
  if (total <= 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>{label ? `Downloading ${label}…` : 'Downloading…'}</span>
      </div>
    )
  }
  const percent = Math.min(100, (loaded / total) * 100)
  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>
          {label ? `${label} · ` : ''}
          {formatMB(loaded)} / {formatMB(total)}
        </span>
        <span>{Math.round(percent)}%</span>
      </div>
    </div>
  )
}

// Download / cancel / retry controls for one model, rendered only while the
// model isn't ready. Downloads can only ever be started from here. Starting a
// download also selects the tier (via `onDownload`) — downloading a model is a
// clear signal the user intends to use it.
function DownloadControls({
  model,
  sizeLabel,
  onDownload,
}: {
  model: DownloadModel
  sizeLabel?: string
  onDownload: () => void
}) {
  const state = useDownloadState(model)
  // The Fast draft model is shared with the Accurate tier, so the same download
  // can be in flight from the other card. Only the control that actually kicked
  // it off shows the bar and Cancel; reset when it settles back to idle so a
  // later download started elsewhere is correctly treated as not-ours.
  const [startedHere, setStartedHere] = useState(false)
  useEffect(() => {
    // FIXME: should be tracked externally
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    if (state.status === 'idle') setStartedHere(false)
  }, [state.status])
  // `force` re-downloads ignoring the cache; used by "Try again" so a corrupt
  // cached file (e.g. a truncated weight) can't keep failing the same way.
  const begin = (force = false) => {
    onDownload()
    setStartedHere(true)
    startDownload(model, { force })
  }
  if (state.status === 'downloading') {
    // Downloading because of the other card — show a passive note, not a second
    // bar (and no Cancel; it isn't ours to cancel).
    if (!startedHere) {
      return <DownloadProgress loaded={0} total={0} />
    }
    return (
      <div className="flex flex-col gap-2">
        <DownloadProgress loaded={state.loaded} total={state.total} />
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => cancelDownload(model)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }
  if (state.status === 'failed') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-destructive">{state.error}</p>
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" onClick={() => begin(true)}>
            Try again
          </Button>
          <p className="text-xs text-muted-foreground">
            Try again re-downloads from scratch.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div>
      <Button type="button" size="sm" onClick={() => begin()}>
        Download{sizeLabel ? ` · ${sizeLabel}` : ''}
      </Button>
    </div>
  )
}

// Accurate needs two models: the fast draft engine (the same one the Fast tier
// uses) for the instant rough transcription, and Whisper Turbo for the on-demand
// sharpen. One button fetches both, one at a time — draft first — so a low-memory
// device never loads both heavy models at once, surfacing a single progress bar
// for whichever stage is in flight. Both must land before Accurate can be applied;
// the modal blocks Save until then and cancels whatever's in flight when it closes.
function AccurateDownloadControls({
  draftModel,
  draftReady,
  sizeLabel,
  enabled,
  onStart,
}: {
  draftModel: DownloadModel
  draftReady: boolean
  // Combined size still to download, shown on the Download button.
  sizeLabel: string
  // False while the modal is closing, so the sequencer doesn't restart a
  // just-cancelled download on the way out.
  enabled: boolean
  onStart: () => void
}) {
  const draftState = useDownloadState(draftModel)
  const whisperState = useDownloadState('whisper')

  // Set once the user kicks the pair off from *this* control. Gating the whole UI
  // on it keeps a Fast-tier download of the shared draft model from lighting this
  // up too, and means Whisper only auto-starts after the user began the sequence
  // here (not on reopen with the draft model already present).
  const [started, setStarted] = useState(false)

  // The stage currently in flight: the draft model until it's ready, then Whisper.
  const stageModel = !draftReady ? draftModel : 'whisper'
  const stageLabel = !draftReady
    ? draftModel === 'browser'
      ? 'built-in'
      : 'Moonshine'
    : 'Whisper Turbo'
  const stageState = !draftReady ? draftState : whisperState

  // Advance the sequence: draft first, then Whisper, each only once its
  // predecessor is ready. Re-runs as each stage settles. A failed stage stops here
  // (its state is `failed`, not `idle`) until the user retries.
  useEffect(() => {
    if (!enabled || !started) return
    if (stageState.status === 'idle') startDownload(stageModel)
  }, [enabled, started, stageModel, stageState.status])

  if (started && stageState.status === 'failed') {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-destructive">{stageState.error}</p>
        <Button
          type="button"
          size="sm"
          onClick={() => startDownload(stageModel, { force: true })}
        >
          Try again
        </Button>
      </div>
    )
  }

  // Active sequence: one bar for the current stage. `idle` here is the brief gap
  // between stages (or the frame before the first fetch starts) — render it as the
  // indeterminate bar rather than flashing the Download button back.
  if (started) {
    const loaded = stageState.status === 'downloading' ? stageState.loaded : 0
    const total = stageState.status === 'downloading' ? stageState.total : 0
    return (
      <div className="flex flex-col gap-2">
        <DownloadProgress loaded={loaded} total={total} label={stageLabel} />
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              cancelDownload(stageModel)
              setStarted(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          onStart()
          setStarted(true)
        }}
      >
        Download · {sizeLabel}
      </Button>
    </div>
  )
}

function ModeCard({
  selected,
  disabled = false,
  onSelect,
  title,
  icon,
  description,
  badge,
  footer,
}: {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  title: string
  icon?: TranscriptionMode
  description?: string
  badge?: ReactNode
  footer?: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        disabled
          ? 'border-border opacity-55'
          : selected
            ? 'border-primary bg-primary/5'
            : 'border-border',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          'flex w-full flex-col gap-1 rounded-lg p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          disabled
            ? 'cursor-not-allowed'
            : selected
              ? 'cursor-pointer'
              : 'cursor-pointer hover:bg-muted/50',
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
            {badge}
          </span>
          {icon ? <TranscriptIcon mode={icon} /> : null}
        </div>
        {description ? (
          <p className="pl-6 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </button>
      {footer ? <div className="px-3 pb-3 pl-9">{footer}</div> : null}
    </div>
  )
}

export function TranscriptionSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [settings, updateSettings] = useSettings()
  const availability = useBrowserSpeechRecognitionAvailable()
  const local = availability?.local ?? null
  const webgpu = availability?.webgpu ?? null
  const mode = settings.transcriptionMode

  const moonshineDownloaded = useModelDownloaded('moonshine')
  const whisperDownloaded = useModelDownloaded('whisper')

  // Block Save while any model is fetching — the heavy Whisper download in
  // particular can destabilise low-memory devices, so we keep the modal open
  // until it settles rather than letting the user apply and navigate away
  // mid-download (closing the modal cancels the download).
  const browserState = useDownloadState('browser')
  const moonshineState = useDownloadState('moonshine')
  const whisperState = useDownloadState('whisper')
  const anyDownloading =
    browserState.status === 'downloading' ||
    moonshineState.status === 'downloading' ||
    whisperState.status === 'downloading'

  // Small tier resolves to the browser engine (if downloaded/downloadable) or
  // the bundled Moonshine model. `null` while the availability probe is pending.
  const smallEngine = local === null ? null : resolveSmallEngine(local)
  const smallDownloadModel: DownloadModel =
    smallEngine === 'moonshine' ? 'moonshine' : 'browser'
  const smallReady =
    smallEngine === 'browser'
      ? local === 'downloaded'
      : smallEngine === 'moonshine'
        ? moonshineDownloaded
        : false

  // Large tier needs WebGPU. While the probe is in flight (webgpu === null) we
  // leave it selectable, like the cloud tier.
  const largeAvailable = webgpu !== false
  const largeReady = whisperDownloaded

  // Accurate is "draft engine + Whisper": the small engine supplies the instant
  // rough transcription and Whisper sharpens it on demand, so the tier isn't
  // usable until *both* models are present.
  const accurateReady = smallReady && largeReady

  // What the Accurate download still has to fetch, for the button so the user
  // knows the commitment up front: Whisper (540 MB) plus the fast draft model
  // unless it's already present. The browser draft engine reports no size, so we
  // show an upper bound (matching its standalone "<100 MB" label) in that case.
  const accurateDownloadLabel = smallReady
    ? '540 MB'
    : smallEngine === 'moonshine'
      ? '610 MB'
      : '< 640 MB'

  // The bundled fallback always works, so the small tier is never unavailable —
  // only "not downloaded yet".
  const cloudAvailable = availability === null ? true : availability.browser

  // The dialog edits a draft and only commits when Save is pressed. Reset it to
  // the saved value whenever the dialog opens (adjusting state during render
  // rather than in an effect, per the React docs).
  const [draft, setDraft] = useState<TranscriptionMode>(mode)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(mode)
  }

  // Downloads may only happen from this modal, so cancel any in-flight download
  // when it closes.
  useEffect(() => {
    if (open) return
    cancelDownload('browser')
    cancelDownload('moonshine')
    cancelDownload('whisper')
  }, [open])

  const save = () =>
    updateSettings({ transcriptionMode: draft })
      .then(() => {
        toast('Setting applied')
        onOpenChange(false)
      })
      .catch((err) => {
        console.error(LOG, 'failed to save:', err)
        toast('Failed to save setting')
      })

  // The action's label reflects the kind of change being saved: turning
  // transcription on, turning it off, or just switching between engines.
  const saveLabel =
    mode === 'disabled' && draft !== 'disabled'
      ? 'Enable transcription'
      : mode !== 'disabled' && draft === 'disabled'
        ? 'Disable transcription'
        : 'Save'

  // Any tier the device supports is selectable, but a tier whose model isn't
  // downloaded yet can't actually be applied — block Save (with an explanatory
  // tooltip) until its weights are present.
  const draftNeedsDownload =
    (draft === 'small' && !smallReady) || (draft === 'large' && !accurateReady)

  const smallTitle =
    smallEngine === 'moonshine' ? 'Fast (Moonshine)' : 'Fast (built-in)'

  const smallDescription =
    smallEngine === 'moonshine'
      ? 'A fast, lightweight model. Transcribes automatically'
      : 'Your browser’s own on-device speech recognition. Transcribes automatically'

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
                icon={'disabled'}
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
                selected={draft === 'small'}
                onSelect={() => setDraft('small')}
                icon={'small'}
                title={smallTitle}
                description={smallDescription}
                badge={
                  local === null ? (
                    <Badge variant="outline">Checking…</Badge>
                  ) : smallReady ? (
                    <Badge variant="secondary">Ready</Badge>
                  ) : null
                }
                footer={
                  local !== null && !smallReady ? (
                    <DownloadControls
                      model={smallDownloadModel}
                      sizeLabel={
                        smallEngine === 'moonshine' ? '70 MB' : '<100 MB'
                      }
                      onDownload={() => setDraft('small')}
                    />
                  ) : null
                }
              />

              <ModeCard
                selected={draft === 'large'}
                disabled={!largeAvailable}
                onSelect={() => setDraft('large')}
                icon={'large'}
                title="Accurate (Whisper Turbo)"
                description="A rough draft appears right away; sharpen segments on demand. Needs significant compute and memory"
                badge={
                  !largeAvailable ? (
                    <Badge variant="outline">Needs WebGPU</Badge>
                  ) : webgpu === null || local === null ? (
                    <Badge variant="outline">Checking…</Badge>
                  ) : accurateReady ? (
                    <Badge variant="secondary">Ready</Badge>
                  ) : null
                }
                footer={
                  // Only offer the download once WebGPU is confirmed (not merely
                  // while the probe is pending — no point fetching ~600 MB the
                  // device can't run) and the draft engine has resolved (local !==
                  // null), since that decides which draft model to fetch.
                  webgpu === true && local !== null && !accurateReady ? (
                    <AccurateDownloadControls
                      draftModel={smallDownloadModel}
                      draftReady={smallReady}
                      sizeLabel={accurateDownloadLabel}
                      enabled={open}
                      onStart={() => setDraft('large')}
                    />
                  ) : null
                }
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
                selected={draft === 'cloud'}
                disabled={!cloudAvailable}
                onSelect={() => setDraft('cloud')}
                title="Cloud transcription"
                icon={'cloud'}
                badge={
                  cloudAvailable ? null : (
                    <Badge variant="outline">Unavailable</Badge>
                  )
                }
                description="Use your browser or operating system's transcription service, subject to that vendor's privacy policy. Transcribes automatically. Whisper Turbo is more accurate"
              />
            </section>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <span
            title={
              anyDownloading
                ? 'Wait for the download to finish'
                : draftNeedsDownload
                  ? 'Download required'
                  : undefined
            }
            className="inline-flex"
          >
            <Button
              onClick={save}
              className="w-full"
              disabled={draft === mode || draftNeedsDownload || anyDownloading}
            >
              {saveLabel}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
