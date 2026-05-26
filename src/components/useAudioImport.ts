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

import { useCallback, useEffect, useRef } from 'react'

import type { AnalysisChunk } from '#/lib/AnalysisFrame'
import { computeDbMax } from '#/lib/AnalysisFrame'
import ImportWorker from '#/lib/ImportWorker?worker'

async function importAudioFile(file: File): Promise<{
  analysis: AnalysisChunk[]
  dbMax: number | null
  buffer: AudioBuffer
}> {
  const audioImporter = new ImportWorker()
  console.time('import: decode')
  const arrayBuffer = await file.arrayBuffer()

  const ctx = new AudioContext({ sampleRate: 44100 })
  const newAudioBuffer = await ctx.decodeAudioData(arrayBuffer)
  await ctx.close()

  const {
    numberOfChannels,
    length,
    sampleRate: fileSampleRate,
  } = newAudioBuffer

  const mono = new Float32Array(length)
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = newAudioBuffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      mono[i]! += ch[i]! / numberOfChannels
    }
  }
  console.timeEnd('import: decode')

  audioImporter.postMessage({ mono, fileSampleRate })
  return new Promise((resolve, reject) => {
    audioImporter.onmessage = ({ data }) => {
      audioImporter.terminate()
      if ('ok' in data) {
        const analysisSamples = data.ok.timeStepSamples * data.ok.frames.length

        // Fit it to the analysis samples, keep it mono
        const shortenedMono = new AudioBuffer({
          length: analysisSamples,
          numberOfChannels: 1,
          sampleRate: 44100,
        })
        shortenedMono.copyToChannel(mono, 0)

        const chunks: AnalysisChunk[] = [data.ok]
        resolve({
          analysis: chunks,
          dbMax: computeDbMax(chunks),
          buffer: shortenedMono,
        })
      } else {
        reject(data.error)
      }
    }
  })
}

interface FileImportResult {
  analysis: AnalysisChunk[]
  dbMax: number | null
  audioBuffer: AudioBuffer
}

interface UseAudioImportOptions {
  handleAnalyze: (fn: () => Promise<{ trackDurationSec: number }>) => void
  onStart?: () => void
  onImported: (result: FileImportResult) => void
}

export function useAudioImport({
  handleAnalyze,
  onStart,
  onImported,
}: UseAudioImportOptions) {
  const onStartRef = useRef(onStart)
  const onImportedRef = useRef(onImported)
  useEffect(() => {
    onStartRef.current = onStart
    onImportedRef.current = onImported
  })

  const openFilePicker = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.wav,.mp3,audio/wav,audio/mpeg'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      onStartRef.current?.()
      handleAnalyze(async () => {
        const {
          analysis,
          dbMax,
          buffer: audioBuffer,
        } = await importAudioFile(file)
        onImportedRef.current({ analysis, dbMax, audioBuffer })
        return { trackDurationSec: audioBuffer.duration }
      })
    }
    input.click()
  }, [handleAnalyze])

  return { openFilePicker }
}
