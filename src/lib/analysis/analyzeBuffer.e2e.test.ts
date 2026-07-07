// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@neteker.ca>

/*
 * End-to-end test: run the full offline analysis pipeline (`analyzeBuffer`,
 * spectrogram + formants + pitch + the *real* Silero VAD ONNX model) on the
 * "butterfly" sample and assert the pipeline produces sensible voiced/silence
 * structure.
 *
 * Unlike analyzeBuffer.test.ts, the VAD is not mocked -- VadStreamProcessor
 * loads silero_vad_v6_16k_op15.ort via onnxruntime-web/wasm under Node (see
 * VadProcessor.getSession's isNode branch). The butterfly clip is a single
 * spoken word (~1.26 s, 16 kHz), so we expect a contiguous speech region
 * bracketed by silence, with pitch and formants populated on voiced frames.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, it, expect } from 'vitest'

import type { AnalysisChunk, AnalysisFrame } from './AnalysisFrame'
import { analyzeBuffer } from './analyzeBuffer'

const assetsDir = fileURLToPath(
  new URL('../../../test-assets', import.meta.url),
)

/** Minimal RIFF/WAVE reader for 16-bit mono PCM -> Float32. */
function loadWavMono(path: string): {
  audio: Float32Array
  sampleRate: number
} {
  const buf = readFileSync(path)
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let off = 12
  let numCh = 1
  let bits = 16
  let sampleRate = 16000
  let dataOff = 0
  let dataLen = 0
  while (off + 8 <= buf.length) {
    const id = String.fromCharCode(
      buf[off]!,
      buf[off + 1]!,
      buf[off + 2]!,
      buf[off + 3]!,
    )
    const sz = dv.getUint32(off + 4, true)
    if (id === 'fmt ') {
      numCh = dv.getUint16(off + 10, true)
      sampleRate = dv.getUint32(off + 12, true)
      bits = dv.getUint16(off + 22, true)
    } else if (id === 'data') {
      dataOff = off + 8
      dataLen = sz
    }
    off += 8 + sz + (sz & 1)
  }
  const bytesPerSample = bits / 8
  const n = Math.floor(dataLen / bytesPerSample / numCh)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let c = 0; c < numCh; c++) {
      const sampleOff = dataOff + (i * numCh + c) * bytesPerSample
      if (bits === 16) s += dv.getInt16(sampleOff, true) / 32768
      else if (bits === 32) s += dv.getFloat32(sampleOff, true)
    }
    out[i] = s / numCh
  }
  return { audio: out, sampleRate }
}

function allFrames(chunks: AnalysisChunk[]): AnalysisFrame[] {
  return chunks.flatMap((c) => c.frames)
}

describe('analyzeBuffer end-to-end on butterfly.wav', { tags: ['e2e'] }, () => {
  const SAMPLE_RATE = 16000

  // test-assets/ is gitignored; the butterfly clip is fetched from the same
  // source the BFA alignment e2e test uses (see bfa-e2e.test.ts). The VAD
  // model itself ships in node_modules via @jocelyn-stericker/ort-silero-vad-
  // wasm-minimal, so only the wav needs downloading.
  const WAV_URL =
    'https://huggingface.co/Tabahi/CUPE-2i/resolve/main/samples/109867__timkahn__butterfly.wav.wav'

  async function ensureButterfly(): Promise<string> {
    const wavPath = `${assetsDir}/butterfly.wav`
    if (!existsSync(wavPath)) {
      console.warn(`Downloading ${WAV_URL}`)
      mkdirSync(assetsDir, { recursive: true })
      const res = await fetch(WAV_URL)
      if (!res.ok)
        throw new Error(`Failed to download ${WAV_URL} (${res.status})`)
      writeFileSync(wavPath, Buffer.from(await res.arrayBuffer()))
    }
    return wavPath
  }

  it('detects a single voiced region bracketed by silence', async () => {
    const { audio, sampleRate } = loadWavMono(await ensureButterfly())
    expect(sampleRate).toBe(SAMPLE_RATE)
    // butterfly.wav is ~1.26 s of a single spoken word.
    expect(audio.length / sampleRate).toBeGreaterThan(1)
    expect(audio.length / sampleRate).toBeLessThan(2)

    const chunks = await analyzeBuffer(audio, sampleRate)
    const frames = allFrames(chunks)
    expect(frames.length).toBeGreaterThan(100)

    // The clip is one word with leading/trailing silence, so the voiced frames
    // form a single contiguous run (after VAD hysteresis + pre-roll). Some
    // boundary frames may be voiced due to pre-roll; the run itself should be
    // contiguous, and both silence (before/after) and speech must appear.
    const voiced = frames.map((f) => f.speechDetected)
    expect(voiced.some((v) => v)).toBe(true)
    expect(voiced.some((v) => !v)).toBe(true)

    // Count transitions silence->speech; a single utterance yields exactly one
    // onset (the first voiced frame). We allow the pre-roll to extend the
    // voiced run backward, but it stays a single contiguous block.
    let onsets = 0
    for (let i = 1; i < voiced.length; i++) {
      if (voiced[i] && !voiced[i - 1]) onsets++
    }
    expect(onsets).toBe(1)

    // The voiced run covers a substantial fraction of the clip (the word itself,
    // not just a few frames of leakage).
    const voicedCount = voiced.filter((v) => v).length
    expect(voicedCount).toBeGreaterThan(frames.length * 0.2)
  })

  it('populates pitch and formants on voiced frames', async () => {
    const { audio, sampleRate } = loadWavMono(await ensureButterfly())
    const chunks = await analyzeBuffer(audio, sampleRate)
    const frames = allFrames(chunks)

    const voicedFrames = frames.filter((f) => f.speechDetected)
    expect(voicedFrames.length).toBeGreaterThan(0)

    // On a spoken word, most voiced frames should carry a pitch. Silero VAD's
    // speechDetected is broader than Praat pitch, so allow a minority of
    // voiced frames to be unpitched (e.g. unvoiced consonants), but require
    // that pitch is detected on the majority.
    const pitched = voicedFrames.filter((f) => f.pitchDetected)
    expect(pitched.length).toBeGreaterThan(voicedFrames.length * 0.5)

    // F0 for an adult male reading "butterfly" sits roughly in 80-220 Hz.
    for (const f of pitched) {
      expect(f.f0).toBeGreaterThan(60)
      expect(f.f0).toBeLessThan(300)
    }

    // Pitched frames carry formants (the validity filter in analyzeBuffer sets
    // f1/f2 only when pitch is detected and the formants are in range). We
    // expect at least some pitched frames to have non-null F1/F2.
    const withFormants = pitched.filter((f) => f.f1 !== null && f.f2 !== null)
    expect(withFormants.length).toBeGreaterThan(0)
  })

  it('spectrum and RMS are populated on every frame', async () => {
    const { audio, sampleRate } = loadWavMono(await ensureButterfly())
    const chunks = await analyzeBuffer(audio, sampleRate)
    const frames = allFrames(chunks)

    for (const frame of frames) {
      expect(frame.spectrum).toBeInstanceOf(Int8Array)
      expect(frame.spectrum.length).toBeGreaterThan(0)
      expect(frame.rms).toBeGreaterThanOrEqual(0)
    }

    // RMS during speech should exceed RMS in the leading silence.
    const voiced = frames.filter((f) => f.speechDetected)
    const silent = frames.filter((f) => !f.speechDetected)
    const meanRms = (arr: AnalysisFrame[]) =>
      arr.reduce((s, f) => s + f.rms, 0) / Math.max(1, arr.length)
    expect(meanRms(voiced)).toBeGreaterThan(meanRms(silent))
  })
})
