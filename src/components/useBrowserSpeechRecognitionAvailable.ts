// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useEffect, useState } from 'react'

import { useDownloadVersion } from '#/components/useModelDownloaded'
import type { LocalTranscriptionStatus } from '#/lib/browserFeatures'
import {
  isBrowserTranscriptionAvailable,
  isWebGpuAvailable,
  checkLocalTranscription,
} from '#/lib/browserFeatures'

const LOG = '[BrowserSpeechRecognition]'

export interface BrowserSpeechRecognitionAvailability {
  /** Any browser-based recognition (on-device or cloud-backed) -- gates "cloud". */
  browser: boolean
  /** On-device speech model status -- gates the browser variant of "small". */
  local: LocalTranscriptionStatus
  /** WebGPU support -- gates the "large" (Whisper) model. */
  webgpu: boolean
}

/**
 * Resolves the status of local/browser/WebGPU transcription support for a
 * language, re-running when `lang` changes or a model finishes downloading (so a
 * freshly-installed browser engine flips `local` to `downloaded`). Returns
 * `null` while the checks are in flight. A stale result is discarded if `lang`
 * changes or the component unmounts before the probes resolve.
 */
export function useBrowserSpeechRecognitionAvailable(
  lang = 'en-US',
): BrowserSpeechRecognitionAvailability | null {
  const [resolved, setResolved] = useState<{
    lang: string
    status: BrowserSpeechRecognitionAvailability
  } | null>(null)
  // Re-probe after a download completes (e.g. browser engine just installed).
  const downloadVersion = useDownloadVersion()

  useEffect(() => {
    let cancelled = false

    Promise.all([
      isBrowserTranscriptionAvailable(lang),
      checkLocalTranscription(lang),
      isWebGpuAvailable(),
    ])
      .then(([browser, local, webgpu]) => {
        if (!cancelled)
          setResolved({ lang, status: { browser, local, webgpu } })
      })
      .catch((err) => {
        console.warn(LOG, 'availability probe failed:', err)
        if (!cancelled)
          setResolved({
            lang,
            status: { browser: false, local: false as const, webgpu: false },
          })
      })

    return () => {
      cancelled = true
    }
  }, [lang, downloadVersion])

  return resolved?.lang === lang ? resolved.status : null
}
