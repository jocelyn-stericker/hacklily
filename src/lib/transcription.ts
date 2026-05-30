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

import type { AnalysisChunk } from '#/lib/AnalysisFrame'
import type { SettingsRow } from '#/lib/settings'
import { transcribeBundled } from '#/lib/transcription-bundled'
import { enqueueRecognition, recognizePcm } from '#/lib/transcription-web'

/**
 * Status and result of transcribing a chunk. Absent (`undefined`) means
 * transcription has not been requested for the chunk.
 */
export type TranscriptionState =
  | { status: 'pending' }
  | { status: 'done'; text: string }
  | { status: 'error'; error: string }

/**
 * Supplies the mono PCM samples spanning a chunk, or `null` if the audio for
 * the chunk is unavailable. Returned samples cover the chunk's time range at
 * its `sampleRate`. The caller owns sourcing the audio (e.g. from the recorded
 * `AudioBuffer`); transcription only consumes the samples.
 */
export type ChunkPcmProvider = (chunk: AnalysisChunk) => Float32Array | null

/**
 * Slice the mono PCM samples spanning `chunk` out of `buffer` (channel 0),
 * or `null` if the chunk falls outside the buffer. Suitable for building a
 * {@link ChunkPcmProvider} bound to the recording's `AudioBuffer`.
 */
export function chunkPcmFromBuffer(
  chunk: AnalysisChunk,
  buffer: AudioBuffer,
): Float32Array | null {
  if (buffer.numberOfChannels === 0) return null
  const data = buffer.getChannelData(0)
  const start = Math.round(chunk.startTimeSec * buffer.sampleRate)
  const length = chunk.frames.length * chunk.timeStepSamples
  const end = Math.min(start + length, data.length)
  if (start < 0 || start >= end) return null
  return data.slice(start, end)
}

/**
 * Transcribe a single chunk, filling in its `transcription` field as the work
 * progresses. The chunk is mutated in place; `onUpdate` is invoked after each
 * status change so callers can re-render (the analysis array is mutated in
 * place and does not otherwise trigger React updates).
 *
 * `pcm` is the chunk's mono audio, spanning its time range at `sampleRate`.
 *
 * The "browser" and "cloud" modes run the Web Speech API on the chunk's audio
 * (on-device vs. allowing the user agent's remote service, respectively). The
 * "bundled" mode runs the Moonshine model in a web worker.
 */
export async function transcribeChunk(
  chunk: AnalysisChunk,
  settings: SettingsRow,
  pcm: Float32Array,
  onUpdate?: () => void,
): Promise<void> {
  if (settings.transcriptionMode === 'disabled') return
  if (chunk.transcription) return

  chunk.transcription = { status: 'pending' }
  onUpdate?.()

  try {
    let text: string
    switch (settings.transcriptionMode) {
      case 'browser':
      case 'cloud':
        text = await enqueueRecognition(() =>
          recognizePcm(
            pcm,
            chunk.sampleRate,
            settings.transcriptionMode === 'browser',
          ),
        )
        break
      case 'bundled':
        text = await transcribeBundled(pcm, chunk.sampleRate)
        break
    }
    chunk.transcription = { status: 'done', text }
  } catch (err) {
    chunk.transcription = {
      status: 'error',
      error: err instanceof Error ? err.message : 'Transcription failed',
    }
  }
  onUpdate?.()
}

/**
 * Kick off transcription for every voiced chunk that hasn't been transcribed
 * yet. Each chunk is transcribed independently; `onUpdate` fires as results
 * arrive. No-op when transcription is disabled.
 *
 * A chunk whose PCM isn't available yet (e.g. the audio hasn't been appended to
 * the recording buffer) is left untouched rather than started and failed, so a
 * later call — once the PCM has arrived — will pick it up.
 */
export function transcribeChunks(
  chunks: AnalysisChunk[],
  settings: SettingsRow,
  getPcm: ChunkPcmProvider,
  onUpdate?: () => void,
): void {
  if (settings.transcriptionMode === 'disabled') return
  for (const chunk of chunks) {
    if (!chunk.voiced || chunk.transcription) continue
    const pcm = getPcm(chunk)
    if (!pcm) continue
    void transcribeChunk(chunk, settings, pcm, onUpdate)
  }
}
