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

import { useEffect, useState } from 'react'

import type { LocalTranscriptionStatus } from '#/lib/browserFeatures'
import {
  isBrowserTranscriptionAvailable,
  checkLocalTranscription,
} from '#/lib/browserFeatures'

const LOG = '[BrowserSpeechRecognition]'

export interface BrowserSpeechRecognitionAvailability {
  browser: boolean
  local: LocalTranscriptionStatus
}

/**
 * Resolves the status of local and any browser-based transcription for a
 * language, re-running when `lang` changes. Returns `null` while the checks are
 * still in flight (the probes are async). A stale result is discarded if `lang`
 * changes or the component unmounts before the probes resolve.
 */
export function useBrowserSpeechRecognitionAvailable(
  lang = 'en-US',
): BrowserSpeechRecognitionAvailability | null {
  const [resolved, setResolved] = useState<{
    lang: string
    status: BrowserSpeechRecognitionAvailability
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      isBrowserTranscriptionAvailable(lang),
      checkLocalTranscription(lang),
    ])
      .then(([browser, local]) => {
        if (!cancelled) setResolved({ lang, status: { browser, local } })
      })
      .catch((err) => {
        console.warn(LOG, 'availability probe failed:', err)
        if (!cancelled)
          setResolved({
            lang,
            status: { browser: false, local: false as const },
          })
      })

    return () => {
      cancelled = true
    }
  }, [lang])

  return resolved?.lang === lang ? resolved.status : null
}
