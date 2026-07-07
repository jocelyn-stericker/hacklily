// SPDX-License-Identifier: AGPL-3.0-or-later
// Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
// Copyright (C) Tabahi <tabahi@duck.com>.

/*
 * End-to-end parity test: run the simplified pipeline on the "butterfly" sample
 * through the real CUPE int8 ONNX model (onnxruntime-web / wasm under Node) and
 * compare against the upstream Python reference output.
 *
 * The Python golden was produced with:
 *   bfaonnx.PhonemeTimestampAligner(cupe_ckpt_path="models/variants/int8dyn.onnx")
 *     .extract_timestamps_from_segment_simplified(wavs, [wav_len],
 *        phoneme_sequences=[[29,10,58,9,43,56,23]])
 *
 * Downloads the model and assets if needed
 * Part of the BFA TypeScript port (AGPL-3.0-or-later).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, it, expect } from 'vitest'

import { createCupeSession, PhonemeTimestampAligner } from './index'
import { loadWavMono } from './testHelpers'

const assetsDir = fileURLToPath(
  new URL('../../../test-assets', import.meta.url),
)

const MODEL = 'cupe_2i_q8.onnx'
const WAV = 'butterfly.wav'
const BUTTERFLY_PH66 = [29, 10, 58, 9, 43, 56, 23]

// Reference golden for the simplified pipeline *with* the extended boundaries
// (ensure_target_coverage + extend_soft_boundaries, both on by default). Each
// stamp's start has been widened back to the previous phoneme's end and the
// final phoneme's end runs to the spectral end, so the cores below are now
// contiguous coverage rather than the isolated single-frame stamps the bare
// simplified decoder emits.
//
// Produced by the C++ advanced-pipeline draft
// (bournemouth_aligner/cpp_onnx/main.cpp) running the same simplified decode +
// ensure_target_coverage + extend_soft_boundaries(softness=7) +
// calculate_confidences over cupe_2i_q8.onnx.
// [phonemeId, startFrame, endFrame, targetIndex, startMs, endMs]
const PY_GOLDEN: [number, number, number, number, number, number][] = [
  [29, 0, 1, 0, 0.0, 16.784],
  [10, 1, 7, 1, 16.784, 117.489],
  [58, 7, 9, 2, 117.489, 151.058],
  [9, 9, 18, 3, 151.058, 302.115],
  [43, 18, 23, 4, 302.115, 386.036],
  [56, 23, 32, 5, 386.036, 537.093],
  [23, 32, 75, 6, 537.093, 1258.813],
]

const ASSET_URLS: Record<string, string> = {
  [MODEL]:
    'https://huggingface.co/jstericker/CUPE-2i-ONNX/resolve/main/onnx/en_libri1000_ua01c_e4_val_GER%3D0.2186_q8.onnx',
  [WAV]:
    'https://huggingface.co/Tabahi/CUPE-2i/resolve/main/samples/109867__timkahn__butterfly.wav.wav',
}

async function downloadAssets() {
  await Promise.all(
    Object.entries(ASSET_URLS).map(async ([name, url]) => {
      const filePath = join(assetsDir, name)
      if (!existsSync(filePath)) {
        console.warn(`Downloading ${url}`)
        mkdirSync(assetsDir, { recursive: true })
        const res = await fetch(url)
        if (!res.ok)
          throw new Error(`Failed to download ${url} (${res.status})`)
        writeFileSync(filePath, Buffer.from(await res.arrayBuffer()))
      }
    }),
  )
}

describe('end-to-end vs Python (cupe_2i_q8.onnx)', { tags: ['e2e'] }, () => {
  it('reproduces the butterfly alignment with extended boundaries', async () => {
    await downloadAssets()

    const { readFileSync } = await import('node:fs')
    const { audio, sampleRate } = loadWavMono(join(assetsDir, WAV))
    expect(sampleRate).toBe(16000)

    const model = new Uint8Array(readFileSync(join(assetsDir, MODEL)))
    const session = await createCupeSession(model)
    const aligner = new PhonemeTimestampAligner(session, { durationMax: 10 })

    const res = await aligner.align(audio, BUTTERFLY_PH66)

    expect(res.spectralLength).toBe(75)
    // totalFrames now reflects the real-audio frame count rather than the
    // 10s-padded 620: chopWav no longer zero-pads to wavLenMax, so stitching
    // only spans the valid windows. The timestamps below are unchanged because
    // decoding only ever used the first spectralLength (75) frames.
    expect(res.totalFrames).toBe(75)
    expect(res.phonemeTimestamps).toHaveLength(PY_GOLDEN.length)

    res.phonemeTimestamps.forEach((p, i) => {
      const [phId, sf, ef, tgt, startMs, endMs] = PY_GOLDEN[i]!
      expect(p.phonemeId, `phonemeId[${i}]`).toBe(phId)
      expect(p.startFrame, `startFrame[${i}]`).toBe(sf)
      expect(p.endFrame, `endFrame[${i}]`).toBe(ef)
      expect(p.targetIndex, `targetIndex[${i}]`).toBe(tgt)
      expect(p.startMs, `startMs[${i}]`).toBeCloseTo(startMs, 2)
      expect(p.endMs, `endMs[${i}]`).toBeCloseTo(endMs, 2)
    })

    // The extended boundaries make the stamps contiguous: each phoneme starts
    // exactly where the previous one ends, and the run spans the whole clip.
    // Without extend_soft_boundaries the simplified decoder leaves single-frame
    // cores with gaps between them, so this guards the new behaviour.
    res.phonemeTimestamps.forEach((p, i) => {
      if (i === 0) {
        expect(p.startFrame, 'first start').toBe(0)
        return
      }
      expect(p.startFrame, `contiguous start[${i}]`).toBe(
        res.phonemeTimestamps[i - 1]!.endFrame,
      )
    })
    expect(
      res.phonemeTimestamps.at(-1)!.endFrame,
      'last end reaches spectral end',
    ).toBe(res.spectralLength)
  })

  it('accepts an espeak IPA transcript via the convenience helper', async () => {
    await downloadAssets()

    const { alignTranscript } = await import('./index')
    const { readFileSync } = await import('node:fs')
    const { audio } = loadWavMono(join(assetsDir, WAV))
    const session = await createCupeSession(
      new Uint8Array(readFileSync(join(assetsDir, MODEL))),
    )
    const aligner = new PhonemeTimestampAligner(session)

    const { phonemized, phonemeTimestamps } = await alignTranscript(
      aligner,
      audio,
      'b|ʌ|ɾ|ɚ|f|l|aɪ',
    )
    expect(phonemized.ph66).toEqual(BUTTERFLY_PH66)
    expect(phonemeTimestamps.map((p) => p.phonemeId)).toEqual(BUTTERFLY_PH66)
  })
})
