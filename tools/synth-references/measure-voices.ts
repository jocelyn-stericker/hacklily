// Utility: synthesize a fixed sentence with each English Kokoro voice and
// measure where it sits on pitch (F0) and resonance (F1/F2/F3), using the same
// pitch/formant analyzers the app uses. Helps choose a voice set (and, later,
// blends) that spans a useful range rather than clustering by gender label.
//
// Run from this directory:  npx tsx measure-voices.ts

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { KokoroTTS } from 'kokoro-js'

// Relative imports; these modules' own `#/...` specifiers resolve against the
// repo-root package.json (their nearest package), so this works under tsx.
import { FormantProcessor } from '../../src/lib/analysis/FormantProcessor.ts'
import { PitchProcessor } from '../../src/lib/analysis/PitchProcessor.ts'
import { resample } from '../../src/lib/analysis/ResampleProcessor.ts'

type VoiceId = NonNullable<
  NonNullable<Parameters<KokoroTTS['generate']>[1]>['voice']
>

// Sonorant-heavy so most frames are voiced → stable F0/formant medians.
const SENTENCE = 'We were away a year ago, and the wind was below the hill.'
const FORMANT_CEILING_HZ = 5500
const FORMANT_RATE_HZ = 2 * FORMANT_CEILING_HZ

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  return s[s.length >> 1]!
}

// Pull the published quality grades straight out of the kokoro-js bundle.
function loadGrades(): Record<string, { gender: string; grade: string }> {
  const bundle = readFileSync(
    join(import.meta.dirname, 'node_modules/kokoro-js/dist/kokoro.js'),
    'utf8',
  )
  const out: Record<string, { gender: string; grade: string }> = {}
  for (const m of bundle.matchAll(/([abefhijpz][fm]_[a-z]+):\{name:[^}]*\}/g)) {
    const id = m[1]!
    const gender = /gender:"?([^,"}]*)/.exec(m[0])?.[1] ?? '?'
    const grade = /overallGrade:"?([^,"}]*)/.exec(m[0])?.[1] ?? '?'
    out[id] = { gender, grade }
  }
  return out
}

async function main() {
  const grades = loadGrades()
  const voices = readdirSync(
    join(import.meta.dirname, 'node_modules/kokoro-js/voices'),
  )
    .filter((f) => /^[ab][fm]_.*\.bin$/.test(f)) // en-us (a*) + en-gb (b*)
    .map((f) => f.replace(/\.bin$/, ''))
    .sort()

  console.log(`Loading model… measuring ${voices.length} English voices.\n`)
  const tts = await KokoroTTS.from_pretrained(
    'onnx-community/Kokoro-82M-v1.0-ONNX',
    { dtype: 'q8', device: 'cpu' },
  )

  type Row = {
    id: string
    accent: string
    gender: string
    grade: string
    f0: number
    f1: number
    f2: number
    f3: number
  }
  const rows: Row[] = []

  for (const id of voices) {
    const audio = await tts.generate(SENTENCE, { voice: id as VoiceId })
    const pcm = audio.audio
    const sr = audio.sampling_rate

    const pitch = new PitchProcessor({ timeStepSec: 0 }, sr).analyze(pcm)
    const f0s = pitch.frames
      .filter((f) => f.frequencyHz > 0 && f.strength >= 0.5)
      .map((f) => f.frequencyHz)

    const fs = resample(pcm, sr, FORMANT_RATE_HZ, 50)
    const formants = new FormantProcessor(
      {
        maxFormants: 5,
        maxFrequencyHz: FORMANT_CEILING_HZ,
        halfWindowLengthSec: 0.025,
        timeStepSec: 0,
        preEmphasisHz: 50,
        safetyMarginHz: 50,
      },
      FORMANT_RATE_HZ,
    ).analyze(fs)

    const f1s: number[] = []
    const f2s: number[] = []
    const f3s: number[] = []
    for (const fr of formants.frames) {
      const f1 = fr.formantCount > 0 ? fr.formants[0]!.frequencyHz : null
      const f2 = fr.formantCount > 1 ? fr.formants[1]!.frequencyHz : null
      const f3 = fr.formantCount > 2 ? fr.formants[2]!.frequencyHz : null
      // Same validity gate the app uses to accept a formant frame.
      if (f1 && f1 >= 200 && f1 <= 1100 && f2 && f2 >= 650 && f2 <= 3500) {
        f1s.push(f1)
        f2s.push(f2)
        if (f3) f3s.push(f3)
      }
    }

    const row: Row = {
      id,
      accent: id.startsWith('a') ? 'US' : 'GB',
      gender: grades[id]?.gender.slice(0, 1) ?? '?',
      grade: grades[id]?.grade ?? '?',
      f0: Math.round(median(f0s)),
      f1: Math.round(median(f1s)),
      f2: Math.round(median(f2s)),
      f3: Math.round(median(f3s)),
    }
    rows.push(row)
    console.log(
      `  ${id.padEnd(12)} F0=${row.f0}  F1=${row.f1}  F2=${row.f2}  (grade ${row.grade})`,
    )
  }

  rows.sort((a, b) => a.f0 - b.f0)
  console.log('\nSorted by pitch (F0), low → high:\n')
  console.table(rows)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
