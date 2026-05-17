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
import { useLiveQuery } from '@tanstack/react-db'
import { useEffect, useLayoutEffect, useRef } from 'react'

import type { AnalysisFrame, AnalysisParams } from '#/lib/analysis'
import {
  MicCapturePipeline,
  preInitPersistentStream,
} from '#/lib/MicCapturePipeline'
import { settingsCollection, DEFAULT_SETTINGS } from '#/lib/settings'

export function useMicCapture({
  enabled,
  onAppend,
  onChunkStart,
  onPatch,
  onRecordingComplete,
  onError,
}: {
  enabled: boolean
  onAppend: (frame: AnalysisFrame) => void
  onChunkStart?: (params: AnalysisParams) => void
  onPatch?: (frameIndex: number) => void
  onRecordingComplete: (buffer: AudioBuffer) => void
  onError: (error: string) => void
}) {
  const { data: settingsRows } = useLiveQuery(settingsCollection)
  const audioSettings = settingsRows[0] ?? DEFAULT_SETTINGS

  // Pre-open the mic when persistentMic is enabled so the connection is warm.
  const { inputDeviceId, sampleRate, persistentMic, browserPreprocessing } =
    audioSettings
  useEffect(() => {
    void preInitPersistentStream({
      id: 'audioSettings',
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

  useLayoutEffect(() => {
    onAppendRef.current = onAppend
    onChunkStartRef.current = onChunkStart
    onPatchRef.current = onPatch
    onRecordingCompleteRef.current = onRecordingComplete
    onErrorRef.current = onError
  })

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    const pipeline = new MicCapturePipeline({
      signal: ctrl.signal,
      settings: {
        id: 'audioSettings',
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
      (e) => onPatchRef.current?.(e.detail.frameIndex),
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'recordingComplete',
      (e) => {
        onRecordingCompleteRef.current(e.detail.buffer)
      },
      { signal: pipeline.destroyed },
    )
    pipeline.addEventListener(
      'error',
      (e) => onErrorRef.current(e.detail.error),
      { signal: pipeline.destroyed },
    )
    return () => ctrl.abort()
  }, [enabled, inputDeviceId, sampleRate, persistentMic, browserPreprocessing])
}
