// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { CaptionsOff, Cloud, Loader2, Sparkle, Sparkles } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
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
      ? '640 MB'
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

  // Trigger/label text for the model dropdown.
  const modeTitle = (m: TranscriptionMode) =>
    m === 'disabled'
      ? 'Transcribe manually'
      : m === 'small'
        ? smallTitle
        : m === 'large'
          ? 'Accurate (Whisper Turbo)'
          : 'Cloud transcription'

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
          <div className="flex flex-col gap-5 py-1">
            <section className="flex flex-col gap-3">
              <header className="flex flex-col gap-0.5">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Transcription
                </h3>
              </header>

              <Select
                value={draft}
                onValueChange={(v) => {
                  if (v) setDraft(v)
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Transcription model"
                >
                  <SelectValue>
                    {(v: TranscriptionMode | null) =>
                      v ? (
                        <span className="flex items-center gap-2">
                          <TranscriptIcon
                            mode={v}
                            className="size-4 text-muted-foreground"
                          />
                          {modeTitle(v)}
                        </span>
                      ) : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="disabled">
                      <CaptionsOff className="text-muted-foreground self-center" />
                      Transcribe manually
                    </SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>On your device · private</SelectLabel>
                    <SelectItem value="small">
                      <Sparkle className="text-muted-foreground self-center" />
                      {smallTitle}
                      {smallReady ? (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Ready
                        </span>
                      ) : null}
                    </SelectItem>
                    <SelectItem value="large" disabled={!largeAvailable}>
                      <Sparkles className="text-muted-foreground self-center" />
                      Accurate (Whisper Turbo)
                      {!largeAvailable ? (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Needs WebGPU
                        </span>
                      ) : accurateReady ? (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Ready
                        </span>
                      ) : null}
                    </SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Off your device</SelectLabel>
                    <SelectItem value="cloud" disabled={!cloudAvailable}>
                      <Cloud className="text-muted-foreground self-center" />
                      Cloud transcription
                      {cloudAvailable ? null : (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Unavailable
                        </span>
                      )}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Status, privacy framing, and download for the selected model.
                  Mirrors the dropdown's on-device / off-device grouping. */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                {draft === 'disabled' ? (
                  <p className="text-xs text-muted-foreground">
                    Braat won’t transcribe your speech.
                  </p>
                ) : draft === 'small' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium">
                        Private — your audio never leaves this browser.
                      </p>
                      {local === null ? (
                        <Badge variant="outline">Checking…</Badge>
                      ) : smallReady ? (
                        <Badge variant="secondary">Ready</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {smallDescription}.
                    </p>
                    {local !== null && !smallReady ? (
                      <DownloadControls
                        model={smallDownloadModel}
                        sizeLabel={
                          smallEngine === 'moonshine' ? '100 MB' : '<100 MB'
                        }
                        onDownload={() => setDraft('small')}
                      />
                    ) : null}
                  </div>
                ) : draft === 'large' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium">
                        Private — your audio never leaves this browser.
                      </p>
                      {!largeAvailable ? (
                        <Badge variant="outline">Needs WebGPU</Badge>
                      ) : webgpu === null || local === null ? (
                        <Badge variant="outline">Checking…</Badge>
                      ) : accurateReady ? (
                        <Badge variant="secondary">Ready</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A rough draft appears right away; refine segments on
                      demand. Needs significant compute and memory.
                    </p>
                    {!largeAvailable ? (
                      <p className="text-xs text-muted-foreground">
                        Requires a browser with WebGPU support.
                      </p>
                    ) : // Wait for WebGPU confirmation before offering the
                    // ~600 MB download, and for local to resolve so we know
                    // which draft model to fetch.
                    webgpu === true && local !== null && !accurateReady ? (
                      <AccurateDownloadControls
                        draftModel={smallDownloadModel}
                        draftReady={smallReady}
                        sizeLabel={accurateDownloadLabel}
                        enabled={open}
                        onStart={() => setDraft('large')}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium">
                        Sent to a remote service — only if you choose it.
                      </p>
                      {cloudAvailable ? null : (
                        <Badge variant="outline">Unavailable</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uses your browser or operating system’s transcription
                      service, subject to that vendor’s privacy policy.
                      Transcribes automatically. Whisper Turbo is more accurate.
                    </p>
                  </div>
                )}
              </div>
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
                    Aligns transcriptions to audio using a port of the{' '}
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
                    Transcribe while recording
                  </span>
                  <p className="text-xs text-muted-foreground">
                    When off, on-device transcription (Moonshine, Whisper Turbo)
                    pauses while recording and catches up when you stop, to keep
                    memory low. Turn it on to transcribe live as you record;
                    this uses more memory and may be unstable on low-memory
                    devices. Alignment always runs after recording either way.
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
