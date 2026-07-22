// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Offline generator for reference practice recordings.
//
// For every passage in `src/lib/passages.ts`, every sentence (segment) of that
// passage, and every voice in `VOICES`, this synthesizes the sentence with
// Kokoro on CPU to mono media/references/<passageId>/<segmentIndex>/<voiceId>.mp3
//
// It also (re)writes `media/references/manifest.json`, used at runtime and to
// fetch available clips.
//
// This is slow, see also `fetch-media` for downloading clips.
//
// `--force` rewrites existing clips.
//
// Usage (from this directory):  npm run synth -- [--force] [--only=id] [--voice=id]

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { KokoroTTS } from 'kokoro-js'

// passages.ts is self-contained (zero imports), so tsx loads it directly across
// the package boundary without needing the app's `#/` path alias.
import { passages } from '../../src/lib/passages.ts'
import type { Passage } from '../../src/lib/passages.ts'

type VoiceId = NonNullable<
  NonNullable<Parameters<KokoroTTS['generate']>[1]>['voice']
>

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const OUT_DIR = join(REPO_ROOT, 'media', 'references')
const VOICES_DIR = join(__dirname, 'node_modules/kokoro-js/voices')

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const ENGINE = 'kokoro-js@1.2.1'

type VoiceSpec = {
  /** Id used in file paths and the manifest. For a native voice this is the
   *  Kokoro voice id; for a blend it's a chosen, filesystem-safe name. */
  id: string
  /** Weighted average of these voices' style matrices. Omit for a native
   *  Kokoro voice. Parents should share a language prefix (a* US / b* GB). */
  blend?: { voice: string; weight: number }[]
}

// US-only set chosen for interesting variance across F0, F1, and weight
// en-gb and other languages later. `KokoroTTS.list_voices()` for the full native set.
const VOICES: VoiceSpec[] = [
  { id: 'am_onyx' }, //    F0 83  / F1 424: masc, deep, dark
  { id: 'am_michael' }, // F0 110 / F1 650: masc, deep, bright
  { id: 'am_fenrir' }, //  F0 137 / F1 444: masc, low-mid, dark
  { id: 'af_kore' }, //    F0 156 / F1 429: femme-leaning enby
  { id: 'af_nova' }, //    F0 156 / F1 628: femme (NOT enby)
  { id: 'af_sarah' }, //   F0 177 / F1 548: femme, mid-high
  { id: 'af_heart' }, //   F0 194 / F1 594: femme, high, bright (A-grade)
  {
    id: 'heart_onyx', //   F0 128 / F1 463: masc-leaning enby (blend)
    blend: [
      { voice: 'af_heart', weight: 0.5 },
      { voice: 'am_onyx', weight: 0.5 },
    ],
  },
  // --- en-gb (British) reference voices, chosen to match the en-us set's
  // pitch/resonance spread as far as the en-gb voice pool allows. Native
  // voices where one fits, plus the Fable × Isabella enby blend where no
  // native does. Fable itself reads enby and is labelled as such. Measured via
  // measure.ts on the rainbow passage; see referenceVoices.ts for the curated
  // f0/f1. Known gaps vs en-us: the deep-dark masc end (am_onyx 84 Hz) is below
  // the en-gb F0 floor (~100 Hz, bm_lewis), and the bright femme resonance
  // (af_nova/af_heart ~600 Hz F1) is above the en-gb F1 ceiling (~551 Hz,
  // bf_lily); en-gb has no counterpart for af_kore or af_heart.
  { id: 'bm_lewis' }, //     ~100/485  -> am_onyx    (F0 floor)
  { id: 'bm_george' }, //    ~137/397  -> am_michael (darker F1)
  { id: 'bm_fable' }, //     ~110/477  enby (native)
  { id: 'bf_emma' }, //      ~176/489  -> af_nova    (femme; F0 +24, darker F1)
  { id: 'bf_lily' }, //      ~182/551  -> af_sarah   (brightest en-gb femme)
  // Enby blend: Fable × Isabella at 0.6/0.4 (isabella 0.4). bf_isabella has
  // the closest F1 to Fable of any en-gb voice, so a Fable-dominant blend keeps
  // Fable's resonance (~477) while raising F0 into femme-enby range. Measured
  // 147/473 on rainbow. (Emma blends were tried but produced unsettling artifacts)
  {
    id: 'isabella_fable', //  isabella 0.4 / fable 0.6  -> 147/473 enby
    blend: [
      { voice: 'bf_isabella', weight: 0.4 },
      { voice: 'bm_fable', weight: 0.6 },
    ],
  },
]

const MP3_BITRATE = '48k' // mono; ~7 KB/s.

// ---------------------------------------------------------------------------

type ClipEntry = {
  url: string
  durationSec: number
  engine: string
}

type SegmentEntry = {
  text: string
  /** Hash of the segment text, so we re-synth only sentences that changed. */
  textHash: string
  clips: Record<string, ClipEntry>
}

type PassageEntry = {
  title: string
  kind: string
  segments: SegmentEntry[]
}

type Manifest = {
  generatedAt: string
  model: string
  passages: Record<string, PassageEntry>
}

// The ordered list of sentences to synthesize for a passage, matching the order
// the practice UI presents them. Returns null for passages with no readable
// text (e.g. 'blank').
function passageSegments(passage: Passage): string[] | null {
  switch (passage.kind) {
    case 'blank':
      return null
    case 'passage':
      return [...passage.segments]
    case 'sentenceLists':
      return passage.lists.flat()
    default:
      return assertNever(passage)
  }
}

function assertNever(x: never): never {
  throw new Error(`Unexpected passage kind: ${JSON.stringify(x)}`)
}

function textHashOf(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function readVoiceStyle(id: string): Float32Array {
  const buf = readFileSync(join(VOICES_DIR, `${id}.bin`))
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)
}

// A Kokoro "voice" is a 510x256 style matrix; a blend is the (weight-
// normalized) average of several. Writes the blended matrix to a temp .bin in
// the voices dir under a language-prefixed id so the loader and phonemizer pick
// it up, and returns that id. Caller is responsible for deleting the file.
function writeBlendStyle(spec: VoiceSpec & { blend: object }): string {
  const recipe = spec.blend as { voice: string; weight: number }[]
  const totalW = recipe.reduce((s, p) => s + p.weight, 0)
  const styles = recipe.map((p) => readVoiceStyle(p.voice))
  const blend = new Float32Array(styles[0]!.length)
  recipe.forEach((p, k) => {
    const w = p.weight / totalW
    const s = styles[k]!
    for (let i = 0; i < blend.length; i++) blend[i]! += w * s[i]!
  })
  const lang = recipe[0]!.voice[0] // 'a' (US) / 'b' (GB) for espeak
  const tempId = `${lang}_blend_${spec.id}`
  writeFileSync(join(VOICES_DIR, `${tempId}.bin`), Buffer.from(blend.buffer))
  return tempId
}

function blendRecipeString(spec: VoiceSpec): string | undefined {
  if (!spec.blend) return undefined
  return spec.blend.map((p) => `${p.voice}*${p.weight}`).join('+')
}

// Encode mono Float32 PCM to an MP3 file via ffmpeg.
function encodeMp3(
  pcm: Float32Array,
  sampleRate: number,
  outPath: string,
): Promise<void> {
  return new Promise((resolveP, rejectP) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-loglevel',
        'error',
        '-y',
        '-f',
        'f32le',
        '-ar',
        String(sampleRate),
        '-ac',
        '1',
        '-i',
        'pipe:0',
        '-codec:a',
        'libmp3lame',
        '-b:a',
        MP3_BITRATE,
        '-ac',
        '1',
        outPath,
      ],
      { stdio: ['pipe', 'ignore', 'inherit'] },
    )
    ff.on('error', rejectP)
    ff.on('close', (code) => {
      if (code === 0) resolveP()
      else rejectP(new Error(`ffmpeg exited with code ${code}`))
    })
    ff.stdin.write(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength))
    ff.stdin.end()
  })
}

// Delete any *.mp3 under `dir` that isn't an expected output, then remove the
// empty segment directories left behind (e.g. for sentences that were removed).
function pruneStale(dir: string, expected: Set<string>) {
  if (!existsSync(dir)) return
  for (const rel of readdirSync(dir, { recursive: true }) as string[]) {
    const full = join(dir, rel)
    if (rel.endsWith('.mp3') && !expected.has(full)) unlinkSync(full)
  }
  for (const sub of readdirSync(dir)) {
    const subDir = join(dir, sub)
    if (statSync(subDir).isDirectory() && readdirSync(subDir).length === 0) {
      rmdirSync(subDir)
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const get = (k: string) =>
    args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
  return { force, only: get('only'), voice: get('voice') }
}

async function main() {
  const { force, only, voice } = parseArgs()
  const specs = voice ? VOICES.filter((s) => s.id === voice) : VOICES
  if (specs.length === 0) throw new Error(`Unknown --voice=${voice}`)
  // Pruning is based on the full set so a scoped --voice run keeps other voices.
  const allVoiceIds = VOICES.map((s) => s.id)

  mkdirSync(OUT_DIR, { recursive: true })
  const manifestPath = join(OUT_DIR, 'manifest.json')
  const loaded = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest)
    : undefined
  // A different model invalidates every clip, so start fresh in that case.
  const manifest: Manifest =
    loaded?.model === MODEL_ID
      ? loaded
      : { generatedAt: '', model: MODEL_ID, passages: {} }

  const persist = () => {
    manifest.generatedAt = new Date().toISOString()
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  }

  console.log(`Loading Kokoro model (${MODEL_ID})...`)
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: 'q8',
    device: 'cpu',
  })

  // Let synthetic blend ids past the built-in name check; the returned char
  // selects the phonemizer language ('a' US / 'b' GB).
  ;(
    tts as unknown as { _validate_voice: (v: string) => string }
  )._validate_voice = (v) => v.at(0)!

  // Resolve each spec to the voice id passed to generate(): the native id, or a
  // temp blended .bin written into the voices dir (cleaned up in `finally`).
  const tempBins: string[] = []
  const genArg = new Map<string, string>()
  for (const spec of specs) {
    if (spec.blend) {
      const tempId = writeBlendStyle(spec as VoiceSpec & { blend: object })
      genArg.set(spec.id, tempId)
      tempBins.push(join(VOICES_DIR, `${tempId}.bin`))
    } else {
      genArg.set(spec.id, spec.id)
    }
  }

  try {
    for (const passage of passages) {
      if (only && passage.id !== only) continue
      const segments = passageSegments(passage)
      if (!segments) continue

      const passageDir = join(OUT_DIR, passage.id)
      const pEntry: PassageEntry = (manifest.passages[passage.id] ??= {
        title: passage.title,
        kind: passage.kind,
        segments: [],
      })
      pEntry.title = passage.title
      pEntry.kind = passage.kind
      const width = Math.max(3, String(segments.length - 1).length)
      const expected = new Set<string>()

      console.log(
        `\n${passage.id}: ${segments.length} sentences x ${specs.length} voices`,
      )

      for (let i = 0; i < segments.length; i++) {
        const text = segments[i]!
        const hash = textHashOf(text)
        const idx = String(i).padStart(width, '0')
        const idxDir = join(passageDir, idx)
        for (const id of allVoiceIds) expected.add(join(idxDir, `${id}.mp3`))

        let segEntry = pEntry.segments[i]
        if (!segEntry || segEntry.textHash !== hash) {
          segEntry = pEntry.segments[i] = { text, textHash: hash, clips: {} }
        } else {
          segEntry.text = text
        }

        let made = 0
        for (const spec of specs) {
          const vid = spec.id
          const outPath = join(idxDir, `${vid}.mp3`)
          expected.add(outPath)
          const upToDate =
            !force &&
            segEntry.clips[vid] !== undefined &&
            existsSync(outPath) &&
            statSync(outPath).size > 0
          if (upToDate) continue

          mkdirSync(idxDir, { recursive: true })
          const audio = await tts.generate(text, {
            voice: genArg.get(vid)! as VoiceId,
          })
          await encodeMp3(audio.audio, audio.sampling_rate, outPath)
          const recipe = blendRecipeString(spec)
          segEntry.clips[vid] = {
            url: `/references/${passage.id}/${idx}/${vid}.mp3`,
            durationSec:
              Math.round((audio.audio.length / audio.sampling_rate) * 10) / 10,
            engine: recipe ? `${ENGINE} blend(${recipe})` : ENGINE,
          }
          made++
        }
        // Persist after each sentence so a long run can be resumed.
        persist()
        console.log(
          `  [${idx}] ${made ? `synth ${made}` : 'skip'}: ${text.slice(0, 60)}`,
        )
      }

      // Drop sentences that no longer exist, then prune their files.
      pEntry.segments.length = segments.length
      // Drop manifest clip entries for voices no longer in VOICES (their
      // .mp3s are removed by pruneStale below; keep the manifest in sync).
      const keepIds = new Set(allVoiceIds)
      for (const seg of pEntry.segments) {
        for (const vid of Object.keys(seg.clips)) {
          if (!keepIds.has(vid)) delete seg.clips[vid]
        }
      }
      pruneStale(passageDir, expected)
      persist()
    }

    console.log('\nDone.')
  } finally {
    for (const p of tempBins) if (existsSync(p)) unlinkSync(p)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
