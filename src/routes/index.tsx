// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute, useBlocker } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'

import { Dialogs } from '#/components/Dialogs'
import { JournalSetupModal } from '#/components/JournalSetupModal'
import { Plot } from '#/components/Plot'
import { SHORTCUTS, useActiveScope } from '#/components/shortcuts'
import { Spectrogram } from '#/components/Spectrogram'
import type { SpectrogramHandle } from '#/components/Spectrogram'
import { SpeechStrip } from '#/components/SpeechStrip'
import type { SpeechStripHandle } from '#/components/SpeechStrip'
import { Toolbar } from '#/components/Toolbar'
import { TranscriptStore } from '#/components/TranscriptStore'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { importMonoPcm, useAudioImport } from '#/components/useAudioImport'
import { useAudioManager } from '#/components/useAudioManager'
import { autoTier, useChunkWorkQueue } from '#/components/useChunkWorkQueue'
import { usePreemptibleCallback } from '#/components/usePreemptibleCallback'
import { useSettings } from '#/components/useSettings'
import { useTimelineState } from '#/components/useTimelineState'
import { useUpgradeVisibleTranscriptions } from '#/components/useUpgradeVisibleTranscriptions'
import { ViewportShade } from '#/components/ViewportShade'
import { VowelChart } from '#/components/VowelChart'
import type { VowelChartHandle } from '#/components/VowelChart'
import { Waveform } from '#/components/Waveform'
import type { WaveformHandle } from '#/components/Waveform'
import { WelcomeModal } from '#/components/WelcomeModal'
import type {
  AnalysisChunk,
  AnalysisFrame,
  AnalysisParams,
} from '#/lib/analysis/AnalysisFrame'
import {
  appendFrame,
  reconcileVoicingAt,
  totalFrames,
} from '#/lib/analysis/AnalysisFrame'
import { track } from '#/lib/analytics'
import { AudioRope, SEG_SAMPLES } from '#/lib/audio/AudioRope'
import type { AudioRopeGrow, AudioRopeShare } from '#/lib/audio/AudioRope'
import { exportMp3, ropesToMp3 } from '#/lib/audio/exportMp3'
import { alignJobActive, alignWorkerLive } from '#/lib/jobs/alignJob'
import type { Viewport } from '#/lib/jobs/schedule'
import {
  journalSetupGuidance,
  loadJournalBackend,
  setupOpfsJournal,
} from '#/lib/journal/journalBackend'
import type { JournalBackend } from '#/lib/journal/journalBackend'
import { journalEnabled } from '#/lib/journal/journalEnabled'
import {
  deleteEntry,
  deleteEntrySrt,
  ensureAccess,
  writeEntry,
} from '#/lib/journal/journalFs'
import {
  deleteEntryDuration,
  recordEntryDuration,
  saveJournalHandle,
} from '#/lib/journal/journalStore'
import { RopeGainCache } from '#/lib/loudness/ropeLoudness'
import { registerMemSource } from '#/lib/memProbe'
import { takePracticeData } from '#/lib/practiceHandoff'
import {
  clampVowelChartScale,
  updateSettings,
  VOWEL_CHART_SCALE_STEP,
} from '#/lib/settings'
import {
  consumeBundledCrashFlag,
  transcribeWorkerStats,
} from '#/lib/transcription/transcribeBundled'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const waveformRef = useRef<WaveformHandle>(null)
  const spectrogramRef = useRef<SpectrogramHandle>(null)
  const vowelChartRef = useRef<VowelChartHandle>(null)
  const speechStripRef = useRef<SpeechStripHandle>(null)
  const [analysisMut, replaceAnalysis] = useState<AnalysisChunk[]>([])

  const [showTranscriptionSettings, setShowTranscriptionSettings] =
    useState(false)
  const [showVowelChartSettings, setShowVowelChartSettings] = useState(false)
  const vowelChartBoxRef = useRef<HTMLDivElement>(null)
  const [chartFocused, setChartFocused] = useState(false)
  const [mouseOverChart, setMouseOverChart] = useState(false)
  // Pinch-to-zoom state: the two-finger distance and the chart scale captured
  // when the pinch began; the live scale is read from a ref so the touch
  // listener never re-attaches mid-gesture.
  const pinchStartDistRef = useRef(0)
  const pinchStartScaleRef = useRef(1)
  const vowelScaleRef = useRef(0)
  const vowelIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bumpVowelChartIdle = useCallback(() => {
    if (vowelIdleTimerRef.current) clearTimeout(vowelIdleTimerRef.current)
    vowelIdleTimerRef.current = setTimeout(() => {
      vowelChartBoxRef.current?.blur()
    }, 4000)
  }, [])

  useEffect(() => {
    if (chartFocused) {
      bumpVowelChartIdle()
    } else if (vowelIdleTimerRef.current) {
      clearTimeout(vowelIdleTimerRef.current)
      vowelIdleTimerRef.current = null
    }
    return () => {
      if (vowelIdleTimerRef.current) clearTimeout(vowelIdleTimerRef.current)
    }
  }, [chartFocused, bumpVowelChartIdle])

  const [settings] = useSettings()

  // Restore the base title on (client-side) navigation back to the app; tool
  // pages like /ipa set their own document.title and the head isn't reloaded.
  useEffect(() => {
    document.title = 'Braat'
  }, [])

  const [ropesMut, replaceRopes] = useState<Array<AudioRope>>([])
  const {
    status,
    timelineState,
    waveformTimelineState,
    handleAnalyze,
    handleNew: resetTimeline,
    handlePlotScroll,
    handlePlotClick,
    handlePlotHover,
    handlePlotZoom,
    handlePlay: triggerPlay,
    handleStart: startRecording,
    handlePause,
    handlePlaybackStop,
    handleBackToStart,
    handleJump,
    handleAcknowledgeError,
    handleRecordingComplete: handleAudioBufferAppended,
    handlePlaybackPositionChanged,
    handleError,
    handleOpenAudioSettings,
    hoverFrame,
  } = useTimelineState(analysisMut)

  // The chart container unmounts (rather than losing focus normally) when
  // recording starts or the averages are hidden, so onBlur never fires --
  // force-clear the focus flag here to avoid a stale focus ring on remount.
  useEffect(() => {
    if (
      status.value === 'recording' ||
      settings.vowelChartAverages === 'hidden'
    ) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setChartFocused(false)
    }
  }, [status.value, settings.vowelChartAverages])

  const { openFilePicker } = useAudioImport({
    handleAnalyze,
    onStart: () => {
      replaceAnalysis([])
    },
    onImported: ({ analysis: newAnalysis, ropes: newRopes }) => {
      replaceRopes(newRopes)
      replaceAnalysis(newAnalysis)
      track('import-audio')
    },
  })

  useEffect(() => {
    const tryConsumeHandoff = () => {
      const data = takePracticeData()
      if (!data) return
      void handleAnalyze(async () => {
        const { analysis, ropes: newRopes } = await importMonoPcm(
          data.pcm,
          data.sampleRate,
        )
        replaceRopes(newRopes)
        replaceAnalysis(analysis)
        const trackDurationSec = newRopes.reduce(
          (sum, rope) => sum + rope.length / rope.sampleRate,
          0,
        )
        return { trackDurationSec }
      })
    }

    tryConsumeHandoff()

    const onMessage = (e: MessageEvent) => {
      if (e.data === 'braat:handoff') tryConsumeHandoff()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [handleAnalyze])

  const recordingStartIndexRef = useRef(0)
  const recordingDurationSecRef = useRef(0)

  const [confirmingAction, setConfirmingAction] = useState<
    'new' | 'open' | null
  >(null)

  const doNew = useCallback(() => {
    resetTimeline()
    replaceAnalysis([])
    replaceRopes([])
    recordingStartIndexRef.current = 0
    recordingDurationSecRef.current = 0
  }, [resetTimeline])

  const hasData =
    ropesMut.some((rope) => rope.length > 0) ||
    analysisMut.length > 0 ||
    status.value === 'recording'
  const [isExporting, setIsExporting] = useState(false)
  const exportAudioDisabled = !hasData || isExporting

  const handleNew = useCallback(() => {
    if (hasData) {
      setConfirmingAction('new')
      return
    }
    doNew()
  }, [hasData, doNew])

  const handleCancelNew = useCallback(() => {
    setConfirmingAction(null)
  }, [])

  const handleConfirmNew = useCallback(() => {
    const action = confirmingAction
    if (action === 'new') {
      doNew()
    } else if (action === 'open') {
      openFilePicker()
    }
    setConfirmingAction(null)
  }, [confirmingAction, doNew, openFilePicker])

  const handleOpen = useCallback(() => {
    if (hasData) {
      setConfirmingAction('open')
      return
    }
    openFilePicker()
  }, [hasData, openFilePicker])

  const ampMaxNorm = analysisMut.reduce(
    (memo, chunk) => chunk.frames.reduce((m, f) => Math.max(m, f.rms), memo),
    0,
  )

  const analysisMutRef = useRef(analysisMut)
  useEffect(() => {
    analysisMutRef.current = analysisMut
  })

  // If the previous session was killed while the bundled model was running (most
  // likely an out-of-memory tab crash on a low-memory device), don't silently
  // reload straight back into the same crash: turn transcription off and tell
  // the user why so they can pick a lighter engine. Runs once on mount.
  useEffect(() => {
    if (!consumeBundledCrashFlag()) return
    void updateSettings({ transcriptionMode: 'disabled' })
    setTimeout(() => {
      toast('Transcription was turned off', {
        description:
          'Bundled transcription may have crashed last time, possibly due to insufficient memory',
      })
    })
  }, [])

  const ropesRef = useRef<AudioRope[]>(ropesMut)
  useEffect(() => {
    ropesRef.current = ropesMut
  }, [ropesMut])

  // Dev-only: report the main route's retained structures to the memory probe.
  useEffect(() => {
    return registerMemSource('main-route', 'Main route state', () => {
      const chunks = analysisMutRef.current
      const frameCount = chunks.reduce((s, c) => s + c.frames.length, 0)
      const spectrumBytes = chunks.reduce(
        (s, c) => s + c.frames.reduce((cs, f) => cs + f.spectrum.byteLength, 0),
        0,
      )
      const ropeCount = ropesRef.current.length
      const ropeBytes = ropesRef.current.reduce((s, r) => s + r.length * 2, 0)
      const ropeSegments = ropesRef.current.reduce(
        (s, r) => s + Math.ceil(r.length / SEG_SAMPLES),
        0,
      )
      return {
        chunkCount: chunks.length,
        frameCount,
        spectrumBytes,
        ropeCount,
        ropeBytes,
        ropeSegments,
      }
    })
  }, [])

  useEffect(() => {
    return registerMemSource('workers', 'Background workers', () => {
      const { workerCount, pendingCount } = transcribeWorkerStats()
      return {
        transcribeWorkers: workerCount,
        pendingTranscriptions: pendingCount,
        alignWorkerLive: alignWorkerLive() ? 1 : 0,
        alignJobActive: alignJobActive() ? 1 : 0,
      }
    })
  }, [])

  // Per-recording loudness-normalization gains, shared between playback and
  // export so the exported file sounds like what was played.
  const [gainCache] = useState(() => new RopeGainCache())

  // External store the SpeechStrip overlay subscribes to: chunks are mutated in
  // place, so structural changes and (later) per-chunk transcripts are surfaced
  // to React through here rather than through prop identity.
  const [transcriptStore] = useState(() => new TranscriptStore())

  // Publish chunk-list changes that swap the array identity (import, New, a
  // finished recording) to the overlay. In-place growth during recording is
  // published imperatively from the append/patch handlers below.
  useEffect(() => {
    transcriptStore.publishChunkList(analysisMut)
  }, [analysisMut, transcriptStore])

  // Mirror the visible range into a ref so the queue can prioritise on-screen
  // chunks, following the viewport without restarting its pass.
  const viewportRef = useRef<Viewport>({
    leftSec: timelineState.viewportLeftSec,
    rightSec: timelineState.viewportRightSec,
  })
  useEffect(() => {
    viewportRef.current = {
      leftSec: timelineState.viewportLeftSec,
      rightSec: timelineState.viewportRightSec,
    }
  }, [timelineState.viewportLeftSec, timelineState.viewportRightSec])
  const getViewport = useCallback((): Viewport => viewportRef.current, [])

  // When the selected model turns out not to be downloaded, turn transcription
  // off and tell the user rather than failing every chunk. Guarded to fire once
  // per mode; re-armed when the mode changes.
  const modelUnavailableHandledRef = useRef(false)
  useEffect(() => {
    modelUnavailableHandledRef.current = false
  }, [settings.transcriptionMode])
  const handleModelUnavailable = useCallback(() => {
    if (modelUnavailableHandledRef.current) return
    modelUnavailableHandledRef.current = true
    void updateSettings({ transcriptionMode: 'disabled' })
    toast('Transcription was turned off', {
      description:
        'The selected model isn’t available. Re-enable transcription in settings to download it.',
    })
  }, [])

  const {
    request: requestTranscription,
    onSeal: handleTranscriptionSeal,
    rescan: rescanTranscription,
  } = useChunkWorkQueue({
    store: transcriptStore,
    analysisMutRef,
    ropesRef,
    getViewport,
    transcriptionMode: settings.transcriptionMode,
    forcedAlignment: settings.forcedAlignment,
    runHeavyWhileRecording: settings.runHeavyWhileRecording,
    isRecording: status.value === 'recording',
    onModelUnavailable: handleModelUnavailable,
  })

  const upgradeVisibleTranscriptions = useUpgradeVisibleTranscriptions(
    transcriptStore,
    timelineState.viewportLeftSec,
    timelineState.viewportRightSec,
    autoTier(settings.transcriptionMode, true),
    requestTranscription,
  )
  const hasUpgradableVisible =
    settings.transcriptionMode === 'large' && !!upgradeVisibleTranscriptions

  const handleExportAudio = useCallback(async () => {
    const currentRopes = ropesRef.current
    if (!currentRopes.some((rope) => rope.length > 0)) return
    setIsExporting(true)
    try {
      await exportMp3(currentRopes, gainCache.gainsFor(currentRopes))
      track('export-audio')
    } catch (err) {
      handleError(err)
    }

    setIsExporting(false)
  }, [handleError, gainCache])

  // --- Voice journal (flag-gated) ---
  const [journalFlagOn] = useState(journalEnabled)
  const [journalBackend, setJournalBackend] = useState<JournalBackend | null>(
    null,
  )
  const [journalSetupOpen, setJournalSetupOpen] = useState(false)

  // Resolve the journal backend so the menu can show Save vs. Set up. For FSA,
  // permission isn't requested here (no gesture); that happens on save.
  useEffect(() => {
    if (!journalFlagOn) return
    void loadJournalBackend().then(setJournalBackend)
  }, [journalFlagOn])

  const handleViewJournal = useCallback(() => {
    // Open synchronously so the popup isn't blocked — we must NOT await a
    // permission prompt first (that burns the click's activation). We don't
    // need to: setup and Save already grant access, and Chromium remembers the
    // grant for the session, so the journal tab almost always opens straight to
    // its entries. If it isn't granted, the tab falls back to its one-click
    // "Reconnect folder" gate.
    window.open('/journal', '_blank')
  }, [])

  const handleSaveToJournal = useCallback(async () => {
    const backend = journalBackend
    if (!backend) return
    const handle = backend.handle
    const currentRopes = ropesRef.current
    if (!currentRopes.some((rope) => rope.length > 0)) return
    // OPFS without persistent storage: saving is blocked (the file could be
    // evicted). Direct the user to the journal, which explains how to enable it.
    if (!backend.persisted) {
      toast('Storage isn’t enabled', {
        description:
          'Open Braat from its Home Screen icon to save recordings on this device.',
      })
      return
    }
    try {
      const access = await ensureAccess(handle)
      if (access !== 'granted') {
        toast('Could not access the journal folder', {
          description: 'Grant access to the folder to save this recording.',
        })
        return
      }
      const bytes = await ropesToMp3(
        currentRopes,
        gainCache.gainsFor(currentRopes),
      )
      const name = await writeEntry(handle, bytes)
      const durationSec = currentRopes.reduce(
        (sum, rope) => sum + rope.length / rope.sampleRate,
        0,
      )
      void recordEntryDuration(name, durationSec)
      track('journal/save')
      toast('Saved to voice journal', {
        description: (
          <span>
            {name} &middot;{' '}
            <button
              type="button"
              className="cursor-pointer underline underline-offset-2 hover:text-white dark:hover:text-black"
              onClick={handleViewJournal}
            >
              View journal
            </button>
          </span>
        ),
        action: {
          label: 'Undo',
          onClick: () => {
            void deleteEntry(handle, name)
              .then(() => deleteEntryDuration(name))
              .then(() => deleteEntrySrt(handle, name))
              .catch((err) => handleError(err))
          },
        },
      })
    } catch (err) {
      handleError(err)
    }
  }, [journalBackend, gainCache, handleError, handleViewJournal])

  // After setting up the journal while a recording is loaded, offer to save it
  // straight away rather than making the user re-open the menu.
  const [confirmSaveAfterSetup, setConfirmSaveAfterSetup] = useState(false)

  const handleChooseJournalFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) return
    let handle: FileSystemDirectoryHandle
    try {
      handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    } catch {
      // User dismissed the picker; leave setup as-is.
      return
    }
    await saveJournalHandle(handle)
    setJournalBackend({ kind: 'fsa', handle, persisted: true })
    setJournalSetupOpen(false)
    track('journal/setup')
    if (ropesRef.current.some((rope) => rope.length > 0)) {
      setConfirmSaveAfterSetup(true)
    } else {
      toast('Voice journal set up', {
        description: `Saving to “${handle.name}”.`,
      })
    }
  }, [])

  // Desktop without FSA: keep the journal in this browser (OPFS) instead of
  // switching to Chromium.
  const handleContinueWithOpfs = useCallback(async () => {
    let backend
    try {
      backend = await setupOpfsJournal()
    } catch (err) {
      // getDirectory() throws where OPFS is blocked (e.g. private browsing).
      console.error('[journal] failed to set up OPFS storage:', err)
      setJournalSetupOpen(false)
      toast('Couldn’t set up storage', {
        description:
          'This browser blocked private storage — that can happen in a private window. Use a normal window, or a Chromium browser, to keep a journal.',
      })
      return
    }
    setJournalBackend(backend)
    setJournalSetupOpen(false)
    track('journal/setup')
    if (!backend.persisted) {
      // Persistence was refused (e.g. a private window) -- saving would fail, so
      // surface it rather than claiming the journal is ready.
      toast('Storage could not be enabled', {
        description:
          'A private window won’t keep recordings, so nothing can be saved here. Use a normal window, or a Chromium browser, to keep a journal.',
      })
    } else if (ropesRef.current.some((rope) => rope.length > 0)) {
      setConfirmSaveAfterSetup(true)
    } else {
      toast('Voice journal set up', {
        description:
          'Saved privately in this browser. Export a backup regularly.',
      })
    }
  }, [])

  const handleRecordingComplete = useCallback(() => {
    // The PCM is already in the ropes; just settle the timeline to the duration
    // accumulated from the analysed frames.
    handleAudioBufferAppended({
      trackDurationSec: recordingDurationSecRef.current,
    })
  }, [handleAudioBufferAppended])

  const handleChunkStart = useCallback(
    (params: AnalysisParams) => {
      const startTimeSec = analysisMutRef.current.reduce(
        (sum, c) => sum + c.frames.length * (c.timeStepSamples / c.sampleRate),
        0,
      )
      analysisMutRef.current.push({
        ...params,
        startTimeSec,
        frames: [],
        voiced: null,
        recordingStart: true,
      })
      transcriptStore.publishChunkList(analysisMutRef.current)
    },
    [transcriptStore],
  )

  const schedulePlaybackPositionChanged = usePreemptibleCallback(
    handlePlaybackPositionChanged,
  )
  const handleAppend = useCallback(
    (frame: AnalysisFrame) => {
      const lastChunk =
        analysisMutRef.current[analysisMutRef.current.length - 1]!
      const structuralChange = appendFrame(analysisMutRef.current, frame)
      const globalIndex = totalFrames(analysisMutRef.current) - 1
      waveformRef.current?.append(globalIndex)
      spectrogramRef.current?.append(globalIndex)
      vowelChartRef.current?.append(globalIndex)
      speechStripRef.current?.append(globalIndex)
      // The appended frame mutates the last chunk in place; mark it dirty so
      // its derived values (medianF0, brightness) refresh on the next read.
      transcriptStore.notifyChunkFrames(
        analysisMutRef.current[analysisMutRef.current.length - 1]!,
      )
      // Only a structural change needs a publish: a chunk turning voiced adds a
      // button. Pure growth of an already-voiced chunk doesn't -- the snapshot
      // holds the live chunk objects, so the next render (e.g. the viewport
      // auto-scrolling) already reads the new extent. Skipping it avoids a
      // redundant overlay re-render on every recorded frame.
      if (structuralChange) {
        transcriptStore.publishChunkList(analysisMutRef.current)
      }
      recordingDurationSecRef.current +=
        lastChunk.timeStepSamples / lastChunk.sampleRate
      schedulePlaybackPositionChanged(recordingDurationSecRef.current)
    },
    [schedulePlaybackPositionChanged, transcriptStore],
  )
  const handleAudioRopeGrow = useCallback(
    (ev: AudioRopeGrow) => {
      ropesMut[ropesMut.length - 1]!.grow(ev)
    },
    [ropesMut],
  )
  const handleAudioRopeShare = useCallback(
    (ev: AudioRopeShare) => {
      ropesMut.push(new AudioRope(ev))
    },
    [ropesMut],
  )
  const handleAudioRopeSeal = useCallback(() => {
    // Seal our copy too, releasing its spare buffer. The shared flag is already
    // set by the producer; this just drops the local reference.
    ropesMut[ropesMut.length - 1]!.seal()
    // Publish the final chunk dimensions: during recording, frames were appended
    // in place without publishing (to avoid re-rendering every frame). The DOM
    // overlay needs the updated extent before transcripts arrive.
    transcriptStore.publishChunkList(analysisMutRef.current)
    // Recording audio is complete: let the queue finish its live spans.
    handleTranscriptionSeal()
  }, [ropesMut, handleTranscriptionSeal, transcriptStore])

  const handlePatch = useCallback(
    (from: number, to: number) => {
      const absFrom = recordingStartIndexRef.current + from
      const absTo = recordingStartIndexRef.current + to

      // Re-chunk around each patched frame so every chunk stays uniformly
      // voiced/unvoiced (a VAD patch may flip frames -- onset, redemption revert,
      // or min-speech discard). The VAD revises the tail on nearly every frame,
      // but the chunk structure rarely changes, so only publish when it does.
      let voicingChanged = false
      for (let abs = absFrom; abs < absTo; abs++) {
        if (reconcileVoicingAt(analysisMutRef.current, abs))
          voicingChanged = true
      }

      waveformRef.current?.patch(absFrom, absTo)
      spectrogramRef.current?.patch(absFrom, absTo)
      vowelChartRef.current?.patch(absFrom, absTo)
      speechStripRef.current?.patch(absFrom, absTo)
      // f0/formant patches mutate frames in place; mark any chunk overlapping
      // the range dirty so its derived values (medianF0, brightness) refresh.
      // Lazy: the recompute happens on the next overlay read, not here.
      {
        let offset = 0
        for (const c of analysisMutRef.current) {
          const end = offset + c.frames.length
          if (offset < absTo && end > absFrom)
            transcriptStore.notifyChunkFrames(c)
          offset = end
        }
      }
      // Only a split/merge/voicing flip changes which chunks the overlay shows.
      if (voicingChanged) {
        // Re-chunking shifted boundaries: any chunk overlapping the patched range
        // now spans different audio than its transcript covered, so drop those
        // transcripts (the queue re-transcribes them).
        let offset = 0
        for (const c of analysisMutRef.current) {
          const end = offset + c.frames.length
          if (offset < absTo && end > absFrom)
            transcriptStore.clearTranscript(c)
          offset = end
        }
        transcriptStore.publishChunkList(analysisMutRef.current)
      }
    },
    [transcriptStore],
  )

  const handleNotification = useCallback((message: string) => {
    toast(message)
  }, [])

  const audioManager = useAudioManager({
    active: settings.persistentMic || status.value === 'recording',
    recording: status.value === 'recording',
    onCaptureChunkStart: handleChunkStart,
    onCaptureAppend: handleAppend,
    onCapturePatch: handlePatch,
    onCaptureComplete: handleRecordingComplete,
    onCaptureNotification: handleNotification,
    onAudioRopeGrow: handleAudioRopeGrow,
    onAudioRopeShare: handleAudioRopeShare,
    onAudioRopeSeal: handleAudioRopeSeal,
    captureFeatures: {
      spectrogram: true,
      formant: true,
      vad: true,
    },
    playing: status.value === 'playing',
    playbackRopes: ropesMut,
    playbackGainCache: gainCache,
    playbackCursorSec: timelineState.cursorSec,
    onPlaybackStop: handlePlaybackStop,
    onPlaybackPositionChanged: handlePlaybackPositionChanged,
    onError: handleError,
  })

  const handlePlay = useCallback(() => {
    void audioManager?.unlockForGesture()
    track('play')
    triggerPlay()
  }, [audioManager, triggerPlay])

  const handlePauseTracked = useCallback(() => {
    track('pause')
    handlePause()
  }, [handlePause])

  const handleStart = useCallback(() => {
    void audioManager?.unlockForGesture()
    track('record-start')
    recordingStartIndexRef.current = totalFrames(analysisMutRef.current)
    recordingDurationSecRef.current = analysisMutRef.current.reduce(
      (t, c) => t + (c.frames.length * c.timeStepSamples) / c.sampleRate,
      0,
    )
    startRecording()
  }, [audioManager, startRecording])

  const blocker = useBlocker({
    shouldBlockFn: () => hasData,
    enableBeforeUnload: true,
    withResolver: true,
  })

  const isRecording =
    status.value === 'recording' || status.value === 'analyzing'

  // Timeline-scoped shortcuts: only fire while this route is mounted. See
  // src/lib/shortcuts.ts for the registry (keys/labels) that these read from.
  const notRecording =
    status.value !== 'recording' && status.value !== 'analyzing'
  useActiveScope('timeline')

  useHotkeys(
    SHORTCUTS.playPause.keys,
    (e) => {
      e.preventDefault()
      if (status.value === 'playing' || status.value === 'recording') {
        handlePauseTracked()
      } else if (hasData) {
        handlePlay()
      }
    },
    [status, hasData, handlePauseTracked, handlePlay],
    { scopes: 'timeline' },
  )
  useHotkeys(SHORTCUTS.jumpStart.keys, handleBackToStart, [handleBackToStart], {
    enabled: notRecording,
    scopes: 'timeline',
  })
  useHotkeys(
    SHORTCUTS.jumpEnd.keys,
    (e) => {
      e.preventDefault()
      handleJump(Infinity)
    },
    [handleJump],
    { enabled: notRecording, scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.jumpBack.keys,
    (e) => {
      e.preventDefault()
      handleJump(-0.5)
    },
    [handleJump],
    { enabled: notRecording, scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.jumpForward.keys,
    (e) => {
      e.preventDefault()
      handleJump(0.5)
    },
    [handleJump],
    { enabled: notRecording, scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.record.keys,
    () => {
      if (notRecording) {
        handleStart()
      }
    },
    [notRecording, handleStart],
    { scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.openFile.keys,
    (e) => {
      e.preventDefault()
      handleOpen()
    },
    [handleOpen],
    { scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.exportAudio.keys,
    (e) => {
      e.preventDefault()
      if (!exportAudioDisabled) void handleExportAudio()
    },
    [exportAudioDisabled, handleExportAudio],
    { scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.audioSettings.keys,
    (e) => {
      e.preventDefault()
      handleOpenAudioSettings()
    },
    [handleOpenAudioSettings],
    { scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.upgradeTranscripts.keys,
    () => {
      if (settings.transcriptionMode === 'large' && hasUpgradableVisible) {
        upgradeVisibleTranscriptions()
      }
    },
    [
      settings.transcriptionMode,
      hasUpgradableVisible,
      upgradeVisibleTranscriptions,
    ],
    { scopes: 'timeline' },
  )
  const resizeVowelChart = useCallback(
    (direction: 1 | -1) => {
      void updateSettings({
        vowelChartScale: clampVowelChartScale(
          settings.vowelChartScale + direction * VOWEL_CHART_SCALE_STEP,
        ),
      })
      if (chartFocused) bumpVowelChartIdle()
    },
    [settings.vowelChartScale, chartFocused, bumpVowelChartIdle],
  )

  useEffect(() => {
    const el = vowelChartBoxRef.current
    if (!el) return
    // React has passive event handlers, so we can't block page scrolling via prop!
    const onWheel = (e: WheelEvent) => {
      if (!chartFocused) return
      e.preventDefault()
      resizeVowelChart(e.deltaY < 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [chartFocused, resizeVowelChart])

  // Keep the live scale in a ref so the pinch listener (attached once per mount)
  // reads the current value without re-attaching on every zoom tick.
  useEffect(() => {
    vowelScaleRef.current = settings.vowelChartScale
  }, [settings.vowelChartScale])

  // Pinch-to-zoom (touch): two fingers on the chart scale it by the change in
  // finger distance. Native non-passive listeners so we can preventDefault the
  // browser's page pinch-zoom. Re-attaches when the chart (un)mounts — it is
  // only rendered when not recording and averages aren't hidden.
  useEffect(() => {
    const el = vowelChartBoxRef.current
    if (!el) return
    const distance = (t: TouchList) =>
      Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      setChartFocused(true)
      bumpVowelChartIdle()
      pinchStartDistRef.current = distance(e.touches)
      pinchStartScaleRef.current = vowelScaleRef.current
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDistRef.current === 0) return
      e.preventDefault()
      const ratio = distance(e.touches) / pinchStartDistRef.current
      void updateSettings({
        vowelChartScale: clampVowelChartScale(
          pinchStartScaleRef.current * ratio,
        ),
      })
      bumpVowelChartIdle()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDistRef.current = 0
    }
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [status.value, settings.vowelChartAverages, bumpVowelChartIdle])

  useHotkeys(
    SHORTCUTS.vowelChartBigger.keys,
    (e) => {
      e.preventDefault()
      resizeVowelChart(1)
    },
    [resizeVowelChart],
    { scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.vowelChartSmaller.keys,
    (e) => {
      e.preventDefault()
      resizeVowelChart(-1)
    },
    [resizeVowelChart],
    { scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.newSession.keys,
    (e) => {
      e.preventDefault()
      handleNew()
    },
    [handleNew],
    { scopes: 'timeline' },
  )
  useHotkeys(
    SHORTCUTS.saveToJournal.keys,
    (e) => {
      e.preventDefault()
      if (journalFlagOn && journalBackend !== null && !exportAudioDisabled) {
        void handleSaveToJournal()
      }
    },
    [journalFlagOn, journalBackend, exportAudioDisabled, handleSaveToJournal],
    { scopes: 'timeline' },
  )

  const virtualWidthSec =
    Math.floor(timelineState.trackDurationSec / 30 + 1) * 30 +
    (timelineState.viewportRightSec - timelineState.viewportLeftSec)

  const showWelcome = analysisMut.length === 0 && status.value === 'inactive'
  const noOp = useCallback(() => {}, [])

  return (
    <>
      <Dialogs
        status={status}
        onAcknowledgeError={handleAcknowledgeError}
        confirmingNew={confirmingAction !== null}
        onCancelNew={handleCancelNew}
        onConfirmNew={handleConfirmNew}
        confirmingNavigate={blocker.status === 'blocked'}
        onCancelNavigate={() => blocker.reset?.()}
        onConfirmNavigate={() => blocker.proceed?.()}
        showAudioSettings={status.value === 'editAudioSettings'}
        onCloseAudioSettings={handleOpenAudioSettings}
        showTranscriptionSettings={showTranscriptionSettings}
        onCloseTranscriptionSettings={setShowTranscriptionSettings}
        showVowelChartSettings={showVowelChartSettings}
        onCloseVowelChartSettings={setShowVowelChartSettings}
      />
      <main className="h-dvh flex flex-col overflow-hidden">
        <Toolbar
          openFilePicker={handleOpen}
          onNew={handleNew}
          timelineState={timelineState}
          status={status}
          onBackToStart={handleBackToStart}
          onStart={handleStart}
          onPause={handlePauseTracked}
          onPlay={handlePlay}
          playDisabled={!hasData}
          onExportAudio={handleExportAudio}
          exportAudioDisabled={exportAudioDisabled}
          onOpenAudioSettings={handleOpenAudioSettings}
          onOpenTranscriptionSettings={() => setShowTranscriptionSettings(true)}
          onOpenVowelChartSettings={() => setShowVowelChartSettings(true)}
          showUpgradeAll={settings.transcriptionMode === 'large'}
          onUpgradeAll={upgradeVisibleTranscriptions}
          journalEnabled={journalFlagOn}
          journalSetUp={journalBackend !== null}
          onSetUpJournal={() => setJournalSetupOpen(true)}
          onSaveToJournal={() => void handleSaveToJournal()}
          onViewJournal={handleViewJournal}
        />
        <div className="relative flex flex-col grow overflow-hidden">
          <Plot
            timelineState={waveformTimelineState}
            xAxisVisible={false}
            yAxisVisible={false}
            yAxis={{
              type: 'amplitude',
              ampMaxNorm: ampMaxNorm || 1,
            }}
            onScroll={noOp}
            onZoom={noOp}
            onClick={isRecording ? noOp : handlePlotClick}
            onHover={handlePlotHover}
            className="h-32 max-h-[15dvh] border-b border-b-gray-500"
            virtualWidthSec={virtualWidthSec}
            hideScrollBar={isRecording}
          >
            <Waveform analysisMut={analysisMut} ref={waveformRef} />
            <ViewportShade
              leftSec={timelineState.viewportLeftSec}
              rightSec={timelineState.viewportRightSec}
            />
          </Plot>
          <div className="flex gap-4 grow">
            <Plot
              timelineState={timelineState}
              xAxisVisible={true}
              yAxisVisible={true}
              yAxis={{
                type: 'freq',
                fMinHz: 50,
                fMaxHz: 5500,
                hover:
                  hoverFrame?.pitchDetected && hoverFrame.speechDetected
                    ? {
                        f0: hoverFrame.f0,
                        f1: hoverFrame.f1,
                        f2: hoverFrame.f2,
                        f3: hoverFrame.f3,
                      }
                    : null,
              }}
              onScroll={isRecording ? noOp : handlePlotScroll}
              onZoom={handlePlotZoom}
              onClick={isRecording ? noOp : handlePlotClick}
              onHover={handlePlotHover}
              virtualWidthSec={virtualWidthSec}
              className="flex-1"
              hideScrollBar={isRecording}
              speechStripHeight={settings.forcedAlignment ? 60 : 30}
            >
              <Spectrogram
                analysisMut={analysisMut}
                ref={spectrogramRef}
                debug={false}
              />
              <SpeechStrip
                analysisMut={analysisMut}
                store={transcriptStore}
                onTranscribe={requestTranscription}
                onOpenTranscriptionSettings={() =>
                  setShowTranscriptionSettings(true)
                }
                onManualSave={rescanTranscription}
                ref={speechStripRef}
              />
              {status.value !== 'recording' &&
                settings.vowelChartAverages !== 'hidden' && (
                  <div
                    ref={vowelChartBoxRef}
                    tabIndex={0}
                    role="group"
                    aria-label="Vowel chart"
                    onMouseEnter={() => setMouseOverChart(true)}
                    onMouseLeave={() => setMouseOverChart(false)}
                    onFocus={() => setChartFocused(true)}
                    onBlur={() => setChartFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') vowelChartBoxRef.current?.blur()
                    }}
                    className={cn(
                      'absolute z-10 border border-[#ccccdd] dark:border-[#2a2a3a] right-0 bottom-auto top-0 left-auto md:right-0 outline-none',
                      chartFocused && 'ring-2 ring-sky-400',
                      !hoverFrame?.speechDetected &&
                        !mouseOverChart &&
                        !chartFocused &&
                        'hidden',
                    )}
                    style={{
                      width: 240 * settings.vowelChartScale,
                      height: 192 * settings.vowelChartScale,
                      maxWidth: '90vw',
                      maxHeight: '80vh',
                    }}
                  >
                    <VowelChart
                      analysisMut={analysisMut}
                      cursorSec={
                        timelineState.hoverSec ?? timelineState.cursorSec
                      }
                      ref={vowelChartRef}
                    />
                  </div>
                )}
            </Plot>
          </div>
          <WelcomeModal
            open={showWelcome}
            onStartRecording={handleStart}
            onOpenFile={openFilePicker}
          />
        </div>
      </main>
      {journalFlagOn && (
        <>
          <JournalSetupModal
            open={journalSetupOpen}
            onOpenChange={setJournalSetupOpen}
            guidance={journalSetupGuidance()}
            onChooseFolder={() => void handleChooseJournalFolder()}
            onContinueAnyway={() => void handleContinueWithOpfs()}
            folderName={
              journalBackend?.kind === 'fsa'
                ? journalBackend.handle.name
                : undefined
            }
          />
          <Dialog
            open={confirmSaveAfterSetup}
            onOpenChange={setConfirmSaveAfterSetup}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save this recording?</DialogTitle>
                <DialogDescription>
                  Your voice journal is set up
                  {journalBackend?.kind === 'fsa'
                    ? ` in “${journalBackend.handle.name}”`
                    : ''}
                  . Save the current recording to it now?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmSaveAfterSetup(false)}
                >
                  Not now
                </Button>
                <Button
                  onClick={() => {
                    setConfirmSaveAfterSetup(false)
                    void handleSaveToJournal()
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}
