// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Measure per-voice F0 (Hz) and F1 (Hz) medians from synthed reference clips,
// using the *same* analysis pipeline the practice app runs on reference audio:
//
// Usage (from this directory):
//   npm run measure -- --passage=rainbow                    # all voices in the manifest
//   npm run measure -- --passage=rainbow --voice=bf_emma    # one voice
//   npm run measure -- --passage=rainbow --voice=bf_emma,bm_george
//
// Decodes MP3 via ffmpeg. Clips are read from `media/references/<passage>/<idx>/<voice>.mp3`.

import { spawn } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FormantProcessor } from '../../src/lib/analysis/FormantProcessor.ts'
import { PitchProcessor } from '../../src/lib/analysis/PitchProcessor.ts'
import { resample } from '../../src/lib/analysis/ResampleProcessor.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const REF_DIR = join(REPO_ROOT, 'media', 'references')

const CLIP_RATE = 24000 // Kokoro output rate
const FORMANT_RATE = 11000 // 2 x 5500 ceiling, matching analyzeBuffer.ts

// Pitch config identical to analyzeBuffer.ts ({ timeStepSec: 0 } + class defaults).
const pitchProc = new PitchProcessor({ timeStepSec: 0 }, CLIP_RATE)

// Formant config identical to analyzeBuffer.ts.
const formantProc = new FormantProcessor(
  {
    maxFormants: 5,
    maxFrequencyHz: 5500,
    halfWindowLengthSec: 0.025,
    timeStepSec: 0,
    preEmphasisHz: 50,
    safetyMarginHz: 50,
  },
  FORMANT_RATE,
)

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (k: string) =>
    args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
  const passage = get('passage')
  if (!passage) throw new Error('--passage=<id> is required')
  const voiceArg = get('voice')
  const voices = voiceArg ? voiceArg.split(',').map((s) => s.trim()) : null
  return { passage, voices }
}

// Decode an mp3 file to mono Float32 PCM at `rate` Hz via ffmpeg.
function decodeMp3(path: string, rate: number): Promise<Float32Array> {
  return new Promise((resolveP, rejectP) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-loglevel',
        'error',
        '-i',
        path,
        '-f',
        'f32le',
        '-ac',
        '1',
        '-ar',
        String(rate),
        'pipe:1',
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    )
    const chunks: Buffer[] = []
    ff.stdout.on('data', (c) => chunks.push(c as Buffer))
    ff.on('error', rejectP)
    ff.on('close', (code) => {
      if (code !== 0) return rejectP(new Error(`ffmpeg exited ${code}`))
      const buf = Buffer.concat(chunks)
      resolveP(new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4))
    })
  })
}

function medianSorted(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

type VoiceResult = {
  voice: string
  f0Median: number | null
  f1Median: number | null
  f0Count: number
  f1Count: number
  clips: number
}

async function measureVoice(
  voice: string,
  clipPaths: string[],
): Promise<VoiceResult> {
  const f0s: number[] = []
  const f1s: number[] = []
  for (const p of clipPaths) {
    const pcm = await decodeMp3(p, CLIP_RATE)
    if (pcm.length === 0) continue

    // Pitch at native rate.
    const pr = pitchProc.analyze(pcm)
    for (const f of pr.frames) if (f.frequencyHz > 0) f0s.push(f.frequencyHz)

    // Formants at 11 kHz (resample matching the app).
    const fSamples = resample(pcm, CLIP_RATE, FORMANT_RATE, 50)
    // FormantProcessor.analyze applies pre-emphasis in-place; pass a copy so the
    // pitch buffer (already consumed) isn't a concern and runs are independent.
    const fr = formantProc.analyze(fSamples.slice())
    for (const frame of fr.frames) {
      if (frame.formantCount < 2) continue
      const f1 = frame.formants[0]!.frequencyHz
      const f2 = frame.formants[1]!.frequencyHz
      if (f1 >= 200 && f1 <= 1100 && f2 >= 650 && f2 <= 3500) f1s.push(f1)
    }
  }
  f0s.sort((a, b) => a - b)
  f1s.sort((a, b) => a - b)
  return {
    voice,
    f0Median: medianSorted(f0s),
    f1Median: medianSorted(f1s),
    f0Count: f0s.length,
    f1Count: f1s.length,
    clips: clipPaths.length,
  }
}

async function main() {
  const { passage, voices } = parseArgs()
  const passageDir = join(REF_DIR, passage)
  let segmentDirs: string[]
  try {
    segmentDirs = readdirSync(passageDir)
      .map((d) => join(passageDir, d))
      .filter((d) => statSync(d).isDirectory())
      .sort()
  } catch {
    throw new Error(`No reference directory for passage "${passage}"`)
  }

  // Collect the set of voice ids present across segment dirs.
  const voiceSet = new Set<string>()
  const clipsByVoice = new Map<string, string[]>()
  for (const seg of segmentDirs) {
    for (const f of readdirSync(seg)) {
      if (!f.endsWith('.mp3')) continue
      const vid = f.slice(0, -'.mp3'.length)
      if (voices && !voices.includes(vid)) continue
      voiceSet.add(vid)
      const arr = clipsByVoice.get(vid) ?? []
      arr.push(join(seg, f))
      clipsByVoice.set(vid, arr)
    }
  }

  const ids = [...voiceSet].sort()
  if (ids.length === 0) {
    console.error('No matching clips found.')
    process.exit(1)
  }

  const results: VoiceResult[] = []
  for (const id of ids) {
    const clips = clipsByVoice.get(id)!.sort()
    process.stderr.write(`measuring ${id} (${clips.length} clips)...\n`)
    results.push(await measureVoice(id, clips))
  }

  // Sorted by F0 for readability.
  results.sort((a, b) => (a.f0Median ?? 0) - (b.f0Median ?? 0))
  const col = (s: string, w: number) =>
    s + ' '.repeat(Math.max(0, w - s.length))
  const rows = [
    `${col('voice', 14)}${col('F0 Hz', 9)}${col('F1 Hz', 9)}${col('F0n', 7)}${col('F1n', 7)}clips`,
    '-'.repeat(60),
  ]
  for (const r of results) {
    rows.push(
      `${col(r.voice, 14)}${col(r.f0Median?.toFixed(1) ?? '-', 9)}${col(r.f1Median?.toFixed(1) ?? '-', 9)}${col(String(r.f0Count), 7)}${col(String(r.f1Count), 7)}${r.clips}`,
    )
  }
  console.log(rows.join('\n'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
