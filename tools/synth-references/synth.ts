// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Offline generator for per-sentence reference recordings of the practice
// passages.
//
// For every passage in `src/lib/passages.ts`, every sentence (segment) of that
// passage, and every voice in `VOICES`, this synthesizes the sentence with
// Kokoro (locally, on CPU — no Python, no cloud), encodes it to a small mono
// MP3, and writes it to:
//
//   media/references/<passageId>/<segmentIndex>/<voiceId>.mp3
//
// `<segmentIndex>` is the zero-padded position in the passage's flattened
// sentence list (the same order the practice UI uses), so the app can line a
// clip up with the sentence it's reading.
//
// It also (re)writes `media/references/manifest.json`, an index the app can
// load at runtime to discover available clips. Each clip records its `engine`,
// so adding recordings from another source later (a different TTS, or a human
// take) is just a matter of writing files into the same layout and merging
// manifest entries. Nothing here is Kokoro-specific past the `generate()` call.
//
// Idempotent: a clip is skipped if its file exists and the segment text hasn't
// changed since it was made (tracked per segment via `textHash`); pass `--force`
// to regenerate anyway. Stale files (from edited/removed sentences or voices)
// are pruned. Pass `--only=<passageId>` and/or `--voice=<voiceId>` to scope a
// run (useful for a quick smoke test before the full ~720-sentence Harvard run).
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
// Config — tweak these freely.
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

// US-only set chosen for spread across pitch (F0) and resonance (F1), measured
// with measure-voices.ts. en-gb coverage to be revisited later. F0/F1 are the
// measured medians. NOTE on presentation: Nova reads decidedly femme and must
// never be surfaced as enby; Kore is the femme-leaning enby; heart×onyx is the
// masc-leaning enby. See `KokoroTTS.list_voices()` for the full native set.
const VOICES: VoiceSpec[] = [
  { id: 'am_onyx' }, //    F0 83  / F1 424 — masc, deep, dark
  { id: 'am_michael' }, // F0 110 / F1 650 — masc, deep, bright
  { id: 'am_fenrir' }, //  F0 137 / F1 444 — masc, low-mid, dark
  { id: 'af_kore' }, //    F0 156 / F1 429 — femme-leaning enby
  { id: 'af_nova' }, //    F0 156 / F1 628 — femme (NOT enby)
  { id: 'af_sarah' }, //   F0 177 / F1 548 — femme, mid-high
  { id: 'af_heart' }, //   F0 194 / F1 594 — femme, high, bright (A-grade)
  {
    id: 'heart_onyx', //   F0 128 / F1 463 — masc-leaning enby (blend)
    blend: [
      { voice: 'af_heart', weight: 0.5 },
      { voice: 'am_onyx', weight: 0.5 },
    ],
  },
]

const MP3_BITRATE = '48k' // mono; ~7 KB/s. Decodes everywhere incl. iOS Safari.

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

// A Kokoro "voice" is a 510×256 style matrix; a blend is the (weight-
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
  const lang = recipe[0]!.voice[0] // 'a' (US) / 'b' (GB) — drives phonemization
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

  console.log(`Loading Kokoro model (${MODEL_ID})…`)
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
        `\n${passage.id}: ${segments.length} sentences × ${specs.length} voices`,
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
          `  [${idx}] ${made ? `synth ${made}` : 'skip'} — ${text.slice(0, 60)}`,
        )
      }

      // Drop sentences that no longer exist, then prune their files.
      pEntry.segments.length = segments.length
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
