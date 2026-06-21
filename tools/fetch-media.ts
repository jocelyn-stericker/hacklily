// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Mirror the practice reference clips from media.braat.app into the local
// (gitignored) `media/references` copy, so the app can be developed against
// them by flipping `USE_LOCAL_MEDIA` in src/lib/mediaConfig.ts.
//
// The manifest enumerates every clip, so we fetch it first and download each
// `clip.url` it lists. Existing files are skipped unless `--force` is passed.
//
//   npm run media:fetch            # incremental
//   npm run media:fetch -- --force # re-download everything

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = (process.env.MEDIA_BASE ?? 'https://media.braat.app').replace(
  /\/$/,
  '',
)
const CONCURRENCY = 12
const force = process.argv.includes('--force')

// tools/fetch-media.ts -> repo/media
const mediaRoot = fileURLToPath(new URL('../media', import.meta.url))

type Manifest = {
  passages: Record<
    string,
    { segments: { clips: Record<string, { url: string }> }[] }
  >
}

async function download(url: string, dest: string): Promise<void> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText} for ${url}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, buf)
}

function localPathFor(refUrl: string): string {
  // refUrl is root-relative, e.g. "/references/foo/000/af_heart.mp3".
  return path.join(mediaRoot, refUrl)
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  console.log(`Fetching media from ${BASE} into ${mediaRoot}`)

  // 1. Manifest — always refreshed; it's the source of truth for what to pull.
  const manifestUrl = `${BASE}/references/manifest.json`
  await download(manifestUrl, localPathFor('/references/manifest.json'))
  const manifest = JSON.parse(
    await fs.readFile(localPathFor('/references/manifest.json'), 'utf8'),
  ) as Manifest

  // 2. Collect every unique clip URL.
  const urls = new Set<string>()
  for (const passage of Object.values(manifest.passages))
    for (const segment of passage.segments)
      for (const clip of Object.values(segment.clips)) urls.add(clip.url)

  const all = [...urls]
  console.log(`${all.length} clips listed in manifest`)

  // 3. Download with a small worker pool; skip files already present.
  let downloaded = 0
  let skipped = 0
  let failed = 0
  let next = 0
  async function worker(): Promise<void> {
    while (next < all.length) {
      const refUrl = all[next++]!
      const dest = localPathFor(refUrl)
      if (!force && (await exists(dest))) {
        skipped++
        continue
      }
      try {
        await download(`${BASE}${refUrl}`, dest)
        downloaded++
      } catch (err) {
        failed++
        console.error(`  failed: ${refUrl} — ${(err as Error).message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log(
    `Done: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`,
  )
  if (failed > 0) process.exitCode = 1
}

void main()
