// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useCallback, useEffect, useRef } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { totalFrames } from '#/lib/analysis/AnalysisFrame'
import { SabRope } from '#/lib/audio/SabRope'
import ImportWorker from '#/lib/workers/ImportWorker?worker'

async function importAudioFile(file: File): Promise<{
  analysis: AnalysisChunk[]
  ropes: SabRope[]
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
        const chunks: AnalysisChunk[] = data.ok
        const timeStepSamples = chunks[0]?.timeStepSamples ?? 0
        const analysisSamples = timeStepSamples * totalFrames(chunks)

        // Mirror the mono PCM, trimmed to the analysed length, into a SabRope --
        // the single audio representation for playback, export, and
        // transcription. One rope covers the whole clip; it never grows, so
        // seal it in one shot (no spare buffer, appends forbidden).
        const rope = new SabRope(fileSampleRate)
        rope.seal(mono.subarray(0, analysisSamples))

        resolve({ analysis: chunks, ropes: [rope] })
      } else {
        reject(data.error)
      }
    }
  })
}

interface FileImportResult {
  analysis: AnalysisChunk[]
  ropes: SabRope[]
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
        const { analysis, ropes } = await importAudioFile(file)
        onImportedRef.current({ analysis, ropes })
        const trackDurationSec = ropes.reduce(
          (sum, rope) => sum + rope.length / rope.sampleRate,
          0,
        )
        return { trackDurationSec }
      })
    }
    input.click()
  }, [handleAnalyze])

  return { openFilePicker }
}
