// SPDX-License-Identifier: AGPL-3.0-or-later
// Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
// Copyright (C) Tabahi <tabahi@duck.com>.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))

/** Resolve a path relative to the BFA repo root */
export function repoPath(rel: string): string {
  return fileURLToPath(new URL(`../../${rel}`, new URL('.', import.meta.url)))
}

export function exists(rel: string): boolean {
  return existsSync(repoPath(rel))
}

/** Minimal RIFF/WAVE reader for 16- or 32-bit PCM, downmixed to mono Float32. */
export function loadWavMono(path: string): {
  audio: Float32Array
  sampleRate: number
} {
  const buf = readFileSync(path)
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let off = 12 // skip RIFF/size/WAVE
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
    off += 8 + sz + (sz & 1) // chunks are word-aligned
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

export { here }
