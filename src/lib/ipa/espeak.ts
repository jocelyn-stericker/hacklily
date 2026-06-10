// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Lazy, single-instance loader for the eSpeak NG phonemiser used by the /ipa
// route. The WASM module + English data are fetched once and the engine is
// cached for the lifetime of the page; textToIPA is synchronous afterwards.

import { createESpeak } from '@jocelyn-stericker/espeak-phonemes'
import dataUrl from '@jocelyn-stericker/espeak-phonemes/espeak-ng-data.tar?url'
import initWasm from '@jocelyn-stericker/espeak-phonemes/espeak-phonemes.js'
import wasmUrl from '@jocelyn-stericker/espeak-phonemes/espeak-phonemes.wasm?url'

export type ESpeakEngine = Awaited<ReturnType<typeof createESpeak>>

let enginePromise: Promise<ESpeakEngine> | null = null

/** Resolve the shared eSpeak engine, creating (and caching) it on first call. */
export function getESpeak(): Promise<ESpeakEngine> {
  enginePromise ??= (async () => {
    const resp = await fetch(dataUrl)
    if (!resp.ok) {
      throw new Error(`Failed to load eSpeak data (HTTP ${resp.status})`)
    }
    return createESpeak({
      moduleFactory: initWasm,
      // The emscripten glue can't locate the .wasm on its own once bundled.
      moduleOverrides: { locateFile: () => wasmUrl },
      data: { archive: await resp.arrayBuffer() },
    })
  })()
  return enginePromise
}
