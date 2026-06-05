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

import { useCallback, useEffect, useRef, useState } from 'react'

import type { TranscriptStore } from './TranscriptStore'

export function useHasUpgradableVisible(
  store: TranscriptStore,
  viewportLeftSec: number,
  viewportRightSec: number,
): boolean {
  const storeRef = useRef(store)
  const viewportLeftRef = useRef(viewportLeftSec)
  const viewportRightRef = useRef(viewportRightSec)

  useEffect(() => {
    storeRef.current = store
  }, [store])
  useEffect(() => {
    viewportLeftRef.current = viewportLeftSec
  }, [viewportLeftSec])
  useEffect(() => {
    viewportRightRef.current = viewportRightSec
  }, [viewportRightSec])

  const [hasUpgradable, setHasUpgradable] = useState(false)

  const recompute = useCallback(() => {
    const s = storeRef.current
    const chunks = s.getChunkList()
    const leftSec = viewportLeftRef.current
    const rightSec = viewportRightRef.current
    let result = false
    for (const chunk of chunks) {
      if (!chunk.voiced) continue
      const durationSec =
        (chunk.frames.length * chunk.timeStepSamples) / chunk.sampleRate
      const endSec = chunk.startTimeSec + durationSec
      if (chunk.startTimeSec >= rightSec || endSec <= leftSec) continue
      const t = s.getTranscript(chunk)
      if (t?.results.small && !t.results.large && !t.results.cloud) {
        if (!t.job || t.job.status === 'error') {
          result = true
          break
        }
      }
    }
    setHasUpgradable(result)
  }, [])

  useEffect(() => {
    let chunkUnsubs: (() => void)[] = []

    const resubscribeChunks = () => {
      for (const unsub of chunkUnsubs) unsub()
      chunkUnsubs = []
      for (const chunk of store.getChunkList()) {
        chunkUnsubs.push(store.subscribeChunk(chunk, recompute))
      }
    }

    resubscribeChunks()
    recompute()

    const listUnsub = store.subscribeList(() => {
      resubscribeChunks()
      recompute()
    })

    return () => {
      listUnsub()
      for (const unsub of chunkUnsubs) unsub()
    }
  }, [store, recompute])

  useEffect(() => {
    recompute()
  }, [viewportLeftSec, viewportRightSec, recompute])

  return hasUpgradable
}
