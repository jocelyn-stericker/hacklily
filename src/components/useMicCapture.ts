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
import { useEffect, useLayoutEffect, useRef } from 'react'

import type { AnalysisFrame, AnalysisParams } from '#/lib/AnalysisFrame'
import {
  MicCapturePipeline,
  preInitPersistentStream,
} from '#/lib/MicCapturePipeline'
import type { SabRopeGrow, SabRopeSeal, SabRopeShare } from '#/lib/SabRope'
import { useSettings } from '#/lib/settings'

export function useMicCapture({
  enabled,
  onAppend,
  onChunkStart,
  onPatch,
  onRecordingComplete,
  onError,
  onSabRopeGrow,
  onSabRopeShare,
  onSabRopeSeal,
}: {
  enabled: boolean
  onAppend: (frame: AnalysisFrame) => void
  onChunkStart?: (params: AnalysisParams) => void
  onPatch?: (from: number, to: number) => void
  onRecordingComplete: () => void
  onError: (error: string) => void
  onSabRopeGrow: (grow: SabRopeGrow) => void
  onSabRopeShare: (sabRope: SabRopeShare) => void
  onSabRopeSeal: (seal: SabRopeSeal) => void
}) {
  const audioSettings = useSettings()

  // Pre-open the mic when persistentMic is enabled so the connection is warm.
  const { inputDeviceId, sampleRate, persistentMic, browserPreprocessing } =
    audioSettings
  useEffect(() => {
    void preInitPersistentStream({
      inputDeviceId,
      sampleRate,
      persistentMic,
      browserPreprocessing,
    })
  }, [inputDeviceId, sampleRate, persistentMic, browserPreprocessing])

  const onAppendRef = useRef(onAppend)
  const onChunkStartRef = useRef(onChunkStart)
  const onPatchRef = useRef(onPatch)
  const onRecordingCompleteRef = useRef(onRecordingComplete)
  const onErrorRef = useRef(onError)
  const onSabRopeGrowRef = useRef(onSabRopeGrow)
  const onSabRopeShareRef = useRef(onSabRopeShare)
  const onSabRopeSealRef = useRef(onSabRopeSeal)

  useLayoutEffect(() => {
    onAppendRef.current = onAppend
    onChunkStartRef.current = onChunkStart
    onPatchRef.current = onPatch
    onRecordingCompleteRef.current = onRecordingComplete
    onErrorRef.current = onError
    onSabRopeGrowRef.current = onSabRopeGrow
    onSabRopeShareRef.current = onSabRopeShare
    onSabRopeSealRef.current = onSabRopeSeal
  })

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    const pipeline = new MicCapturePipeline({
      signal: ctrl.signal,
      settings: {
        inputDeviceId,
        sampleRate,
        persistentMic,
        browserPreprocessing,
      },
    })
    pipeline.addEventListener(
      'append',
      (e) => onAppendRef.current(e.detail.frame),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'chunkStart',
      (e) => onChunkStartRef.current?.(e.detail.params),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'patch',
      (e) => onPatchRef.current?.(e.detail.from, e.detail.to),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'recordingComplete',
      () => {
        onRecordingCompleteRef.current()
      },
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'error',
      (e) => onErrorRef.current(e.detail.error),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'sabRopeShare',
      (e) => onSabRopeShareRef.current(e.detail),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'sabRopeGrow',
      (e) => onSabRopeGrowRef.current(e.detail),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'sabRopeSeal',
      (e) => onSabRopeSealRef.current(e.detail),
      { signal: pipeline.destroyed },
    )
    return () => ctrl.abort()
  }, [enabled, inputDeviceId, sampleRate, persistentMic, browserPreprocessing])
}
