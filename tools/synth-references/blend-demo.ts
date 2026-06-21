// Quick demo: blend two Kokoro voices by averaging their style matrices, then
// synthesize a sample with each parent and the blend so they can be compared.
// Also measures the blend's F0/F1. Run: npx tsx blend-demo.ts

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { KokoroTTS } from 'kokoro-js'

import { FormantProcessor } from '../../src/lib/analysis/FormantProcessor.ts'
import { PitchProcessor } from '../../src/lib/analysis/PitchProcessor.ts'
import { resample } from '../../src/lib/analysis/ResampleProcessor.ts'

type VoiceId = NonNullable<
  NonNullable<Parameters<KokoroTTS['generate']>[1]>['voice']
>

const SENTENCE =
  'When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow.'
const VOICES_DIR = join(import.meta.dirname, 'node_modules/kokoro-js/voices')
const OUT_DIR = join(import.meta.dirname, '..', '..', 'blend-demo')

const PARENT_A = 'af_heart'
const PARENT_B = 'am_onyx'
const MIX = 0.5 // weight of PARENT_A
const BLEND_ID = 'a_blend_heart_onyx' // leading 'a' → US-English phonemization

function readVoice(id: string): Float32Array {
  const buf = readFileSync(join(VOICES_DIR, `${id}.bin`))
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)
}

function encodeMp3(pcm: Float32Array, sr: number, outPath: string) {
  return new Promise<void>((res, rej) => {
    const ff = spawn(
      'ffmpeg',
      // prettier-ignore
      [
        '-loglevel', 'error', '-y',
        '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', 'pipe:0',
        '-codec:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', outPath,
      ],
      { stdio: ['pipe', 'ignore', 'inherit'] },
    )
    ff.on('error', rej)
    ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`))))
    ff.stdin.write(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength))
    ff.stdin.end()
  })
}

const median = (xs: number[]) =>
  xs.length ? [...xs].sort((a, b) => a - b)[xs.length >> 1]! : NaN

function measure(pcm: Float32Array, sr: number) {
  const pitch = new PitchProcessor({ timeStepSec: 0 }, sr).analyze(pcm)
  const f0 = median(
    pitch.frames
      .filter((f) => f.frequencyHz > 0 && f.strength >= 0.5)
      .map((f) => f.frequencyHz),
  )
  const fs = resample(pcm, sr, 11000, 50)
  const fr = new FormantProcessor(
    {
      maxFormants: 5,
      maxFrequencyHz: 5500,
      halfWindowLengthSec: 0.025,
      timeStepSec: 0,
      preEmphasisHz: 50,
      safetyMarginHz: 50,
    },
    11000,
  ).analyze(fs)
  const f1: number[] = []
  for (const f of fr.frames) {
    const a = f.formantCount > 0 ? f.formants[0]!.frequencyHz : null
    const b = f.formantCount > 1 ? f.formants[1]!.frequencyHz : null
    if (a && a >= 200 && a <= 1100 && b && b >= 650 && b <= 3500) f1.push(a)
  }
  return { f0: Math.round(f0), f1: Math.round(median(f1)) }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  // Build and write the blended style matrix.
  const a = readVoice(PARENT_A)
  const b = readVoice(PARENT_B)
  if (a.length !== b.length) throw new Error('voice size mismatch')
  const blend = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) blend[i] = MIX * a[i]! + (1 - MIX) * b[i]!
  const blendPath = join(VOICES_DIR, `${BLEND_ID}.bin`)
  writeFileSync(blendPath, Buffer.from(blend.buffer))

  const tts = await KokoroTTS.from_pretrained(
    'onnx-community/Kokoro-82M-v1.0-ONNX',
    { dtype: 'q8', device: 'cpu' },
  )
  // Allow our synthetic id past the built-in voice-name check; the returned
  // char selects US ('a') phonemization.
  ;(
    tts as unknown as { _validate_voice: (v: string) => string }
  )._validate_voice = () => 'a'

  try {
    for (const [label, id] of [
      [PARENT_A, PARENT_A],
      [PARENT_B, PARENT_B],
      [
        `blend_${Math.round(MIX * 100)}-${Math.round((1 - MIX) * 100)}`,
        BLEND_ID,
      ],
    ] as const) {
      const audio = await tts.generate(SENTENCE, { voice: id as VoiceId })
      const out = join(OUT_DIR, `${label}.mp3`)
      await encodeMp3(audio.audio, audio.sampling_rate, out)
      const m = measure(audio.audio, audio.sampling_rate)
      console.log(`${label.padEnd(18)} F0 ${m.f0}  F1 ${m.f1}  → ${out}`)
    }
  } finally {
    unlinkSync(blendPath)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
