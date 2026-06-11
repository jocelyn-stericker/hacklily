// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useCallback, useEffect, useRef } from 'react'

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { AudioRope } from '#/lib/audio/AudioRope'
import ImportWorker from '#/lib/workers/ImportWorker?worker'
import type { ImportWorker as ImportWorkerInstance } from '#/lib/workers/ImportWorker'

async function importAudioFile(file: File): Promise<{
  analysis: AnalysisChunk[]
  ropes: AudioRope[]
}> {
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

  return importMonoPcm(mono, fileSampleRate)
}

// importMonoPcm takes ownership of mono
export function importMonoPcm(
  mono: Float32Array,
  sampleRate: number,
): Promise<{ analysis: AnalysisChunk[]; ropes: AudioRope[] }> {
  return new Promise((resolve, reject) => {
    let audioImporter: ImportWorkerInstance | undefined
    try {
      audioImporter = new ImportWorker()
      audioImporter.onerror = ({ message }) => {
        audioImporter?.terminate()

        reject(new Error(message))
      }
      audioImporter.onmessage = ({ data }) => {
        audioImporter?.terminate()

        if ('ok' in data) {
          resolve({ analysis: data.ok, ropes: [new AudioRope(data.rope)] })
        } else {
          reject(data.error)
        }
      }

      audioImporter.postMessage({ mono, fileSampleRate: sampleRate }, [
        mono.buffer,
      ])
    } catch (err) {
      audioImporter?.terminate()
      throw err
    }
  })
}

interface FileImportResult {
  analysis: AnalysisChunk[]
  ropes: AudioRope[]
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
