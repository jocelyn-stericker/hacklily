// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

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
import { Switch } from '#/components/ui/switch'
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

// Determinate bar once total size is known; indeterminate spinner before that
// (and for the browser engine, which reports no byte progress).
function DownloadProgress({
  loaded,
  total,
  label,
}: {
  loaded: number
  total: number
  // Named only for multi-model controls (Accurate); omitted otherwise.
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

// Download/cancel/retry for one model, visible until it's ready. Starting a
// download also selects the tier -- a clear intent signal.
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
  // The draft model is shared with Accurate, so a download can be in flight
  // from the other card. Only the card that started it shows the bar and Cancel.
  const [startedHere, setStartedHere] = useState(false)
  useEffect(() => {
    // FIXME: should be tracked externally
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    if (state.status === 'idle') setStartedHere(false)
  }, [state.status])
  // `force` bypasses the cache; used by "Try again" so a corrupt cached file
  // can't keep failing.
  const begin = (force = false) => {
    onDownload()
    setStartedHere(true)
    startDownload(model, { force })
  }
  if (state.status === 'downloading') {
    // Download started from the other card -- no bar or Cancel (not ours).
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
            This re-downloads the model from scratch.
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

// Accurate needs two models: the draft engine (shared with Fast) plus Whisper Turbo.
// One button fetches both sequentially -- draft first -- one bar tracks whichever
// stage is in flight. Both must land before Save is unblocked.
function AccurateDownloadControls({
  draftModel,
  draftReady,
  sizeLabel,
  enabled,
  onStart,
}: {
  draftModel: DownloadModel
  draftReady: boolean
  sizeLabel: string
  // False while closing, preventing the sequencer from restarting a cancelled download.
  enabled: boolean
  onStart: () => void
}) {
  const draftState = useDownloadState(draftModel)
  const whisperState = useDownloadState('whisper')

  // Set once the user starts the sequence here, so a concurrent Fast-tier download
  // of the shared draft model doesn't trigger Whisper auto-start on this control.
  const [started, setStarted] = useState(false)

  // The stage currently in flight: the draft model until it's ready, then Whisper.
  const stageModel = !draftReady ? draftModel : 'whisper'
  const stageLabel = !draftReady
    ? draftModel === 'browser'
      ? 'built-in'
      : 'Moonshine'
    : 'Whisper Turbo'
  const stageState = !draftReady ? draftState : whisperState

  // Advance the sequence: draft → Whisper, each starting once the prior settles.
  // A failed stage holds here until the user retries.
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

  // One bar for the current stage; `idle` is the brief gap between stages --
  // show indeterminate rather than flashing the Download button.
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

  // Block Save while downloading -- Whisper can destabilise low-memory devices,
  // so keep the modal open until it settles (closing cancels the download).
  const browserState = useDownloadState('browser')
  const moonshineState = useDownloadState('moonshine')
  const whisperState = useDownloadState('whisper')
  const anyDownloading =
    browserState.status === 'downloading' ||
    moonshineState.status === 'downloading' ||
    whisperState.status === 'downloading'

  // Small = browser engine (if available) or Moonshine; `null` while probing.
  const smallEngine = local === null ? null : resolveSmallEngine(local)
  const smallDownloadModel: DownloadModel =
    smallEngine === 'moonshine' ? 'moonshine' : 'browser'
  const smallReady =
    smallEngine === 'browser'
      ? local === 'downloaded'
      : smallEngine === 'moonshine'
        ? moonshineDownloaded
        : false

  // Large needs WebGPU; selectable while probe is pending, like cloud.
  const largeAvailable = webgpu !== false
  const largeReady = whisperDownloaded

  // Accurate requires both the small (draft) engine and Whisper.
  const accurateReady = smallReady && largeReady

  // Remaining download for the button: Whisper (540 MB) + draft model if needed.
  // Browser engine reports no size, so show an upper bound.
  const accurateDownloadLabel = smallReady
    ? '540 MB'
    : smallEngine === 'moonshine'
      ? '610 MB'
      : '< 640 MB'

  // Bundled fallback means small is never unavailable, only not-yet-downloaded.
  const cloudAvailable = availability === null ? true : availability.browser

  // Draft resets to saved value on open (during render, per React docs).
  const [draft, setDraft] = useState<TranscriptionMode>(mode)
  const [draftForcedAlignment, setDraftForcedAlignment] = useState(
    settings.forcedAlignment,
  )
  const [draftRunHeavyWhileRecording, setDraftRunHeavyWhileRecording] =
    useState(settings.runHeavyWhileRecording)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDraft(mode)
      setDraftForcedAlignment(settings.forcedAlignment)
      setDraftRunHeavyWhileRecording(settings.runHeavyWhileRecording)
    }
  }

  // Cancel any in-flight downloads when the modal closes.
  useEffect(() => {
    if (open) return
    cancelDownload('browser')
    cancelDownload('moonshine')
    cancelDownload('whisper')
  }, [open])

  const save = () =>
    updateSettings({
      transcriptionMode: draft,
      forcedAlignment: draftForcedAlignment,
      runHeavyWhileRecording: draftRunHeavyWhileRecording,
    })
      .then(() => {
        toast('Setting applied')
        onOpenChange(false)
      })
      .catch((err) => {
        console.error(LOG, 'failed to save:', err)
        toast('Failed to save setting')
      })

  const saveLabel =
    mode === 'disabled' && draft !== 'disabled'
      ? 'Enable transcription'
      : mode !== 'disabled' && draft === 'disabled'
        ? 'Disable transcription'
        : 'Save'

  // Block Save if the selected tier needs a model that isn't downloaded yet.
  const draftNeedsDownload =
    (draft === 'small' && !smallReady) || (draft === 'large' && !accurateReady)

  const nothingChanged =
    draft === mode &&
    draftForcedAlignment === settings.forcedAlignment &&
    draftRunHeavyWhileRecording === settings.runHeavyWhileRecording

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
            Choose how Braat transcribes and analyzes your speech. Language
            features currently rely on <strong>North American English</strong>.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div
            role="radiogroup"
            aria-label="Transcription method"
            className="flex flex-col gap-5 py-1"
          >
            <section className="flex flex-col gap-3">
              <ModeCard
                selected={draft === 'disabled'}
                onSelect={() => setDraft('disabled')}
                icon={'disabled'}
                title="Don’t transcribe"
              />
            </section>

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
                description="A rough draft appears right away; refine segments on demand. Needs significant compute and memory"
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
                  // Wait for WebGPU confirmation before offering ~600 MB download,
                  // and for local to resolve so we know which draft model to fetch.
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
                description="Uses your browser or operating system's transcription service, subject to that vendor's privacy policy. Transcribes automatically. Whisper Turbo is more accurate"
              />
            </section>

            <section className="flex flex-col gap-4 border-t border-border/60 pt-5">
              <header className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Analysis
                </h3>
              </header>

              <label className="flex cursor-pointer items-start gap-3">
                <Switch
                  size="sm"
                  checked={draftForcedAlignment}
                  onCheckedChange={setDraftForcedAlignment}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    Forced alignment and brightness
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Aligns transcriptions to audio using a port of{' '}
                    <a
                      href="https://github.com/tabahi/bournemouth-forced-aligner"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      Bournemouth Forced Aligner
                    </a>
                    . Enables a brightness (resonance) score, based on{' '}
                    <a
                      href="https://acousticgender.space"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      acousticgender.space
                    </a>
                    . This runs on your device. Enabling it triggers a one-time
                    ~30 MB download.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <Switch
                  size="sm"
                  checked={draftRunHeavyWhileRecording}
                  onCheckedChange={setDraftRunHeavyWhileRecording}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    Run heavy computation while recording
                  </span>
                  <p className="text-xs text-muted-foreground">
                    The browser&apos;s built-in speech recognition and cloud
                    engines always run during recording. This setting only
                    restricts Moonshine, Whisper Turbo, and alignment workers,
                    which are paused to free memory.
                  </p>
                </div>
              </label>
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
              disabled={nothingChanged || draftNeedsDownload || anyDownloading}
            >
              {saveLabel}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
