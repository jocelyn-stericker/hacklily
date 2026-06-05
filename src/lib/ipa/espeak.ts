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
