// Memory scenario: Moonshine STT + forced alignment.
//
// Measures how much memory transcription and alignment workers add, and how
// much persists immediately after "New". Automatically downloads the Moonshine
// model if it is not already in the browser cache.

import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import {
  forceGc,
  readSnapshot,
  summarizeSnapshot,
  waitForProbe,
} from '../lib/probe.js'
import type { Scenario, ScenarioResult } from './main-record.js'

// Loads as a Buffer at module initialisation time — tiny file, no hot path.
const BUTTERFLY_WAV = readFileSync(
  new URL('../../test-assets/butterfly.wav', import.meta.url),
)

function workerValues(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).__braatMem
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (api?.snapshot()?.sources?.workers?.values ?? {}) as Record<
      string,
      number
    >
  })
}

async function ensureModelDownloaded(
  page: Page,
  timeoutMs = 300_000,
): Promise<void> {
  const cached = await page.evaluate(
    () => localStorage.getItem('braat:model-downloaded:moonshine') !== null,
  )
  if (cached) return

  console.log(
    '\n  [stt-alignment] Moonshine not in cache — downloading via UI...',
  )

  // Open the application menu → Transcription settings.
  await page.locator('[title="Application menu"]').click()
  await page.waitForTimeout(300)
  await page.getByText('Transcription settings').click()
  await page.waitForTimeout(500)

  // The Fast (Moonshine) card shows "Download · X MB". Click it.
  await page.getByRole('button', { name: /^Download/ }).click()

  // Poll for completion, logging elapsed time.
  const dlStart = Date.now()
  const poll = setInterval(() => {
    const elapsed = ((Date.now() - dlStart) / 1000).toFixed(0)
    process.stdout.write(`\r  downloading Moonshine... ${elapsed}s`)
  }, 3000)

  try {
    await page.waitForFunction(
      () => localStorage.getItem('braat:model-downloaded:moonshine') !== null,
      undefined,
      { timeout: timeoutMs },
    )
  } finally {
    clearInterval(poll)
    process.stdout.write('\r' + ' '.repeat(60) + '\r')
  }

  const dlSec = ((Date.now() - dlStart) / 1000).toFixed(1)
  console.log(`  [stt-alignment] Download complete in ${dlSec}s`)

  // Close the modal with Cancel (settings were pre-set via addInitScript).
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.waitForTimeout(300)
}

/**
 * Main route: enable Moonshine + forced alignment, import the butterfly sample
 * (~1.25s, one spoken word), wait for transcription and alignment to complete,
 * then clear. Shows worker weight overhead and what persists after "New"
 * (workers stay warm for 60s).
 */
export const sttAlignment: Scenario = async (
  page: Page,
  serverUrl: string,
  hooks,
): Promise<ScenarioResult> => {
  // Inject settings before the app mounts so it starts in the right mode.
  // We do not pre-set braat:model-downloaded:moonshine here; ensureModelDownloaded
  // handles it so the flag reflects the real cache state.
  await page.addInitScript(() => {
    const SETTINGS_KEY = 'braat:settings'
    const existing = localStorage.getItem(SETTINGS_KEY)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: Record<string, any> = existing ? JSON.parse(existing) : {}
    settings.transcriptionMode = 'small'
    settings.forcedAlignment = true
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  })

  await page.goto(serverUrl + '/')
  await waitForProbe(page)

  await ensureModelDownloaded(page)

  // --- Baseline ---
  await forceGc(page)
  await page.waitForTimeout(500)
  const baseline = await readSnapshot(page)
  await hooks?.afterPhase?.('baseline')

  // --- Import the butterfly sample (~1.25s, one spoken word) ---
  const filechooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /import audio file/i }).click()
  const filechooser = await filechooserPromise
  await filechooser.setFiles([
    { name: 'butterfly.wav', mimeType: 'audio/wav', buffer: BUTTERFLY_WAV },
  ])

  // The butterfly sample is ~75 frames; wait for at least 20 to confirm the
  // analysis pass has started and produced data.
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).__braatMem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (
        (api?.snapshot()?.sources?.['main-route']?.values?.frameCount ?? 0) > 20
      )
    },
    undefined,
    { timeout: 30_000 },
  )
  // Brief settle for the analysis worklet to finish the tail frames.
  await page.waitForTimeout(1000)

  // One spoken word → one voiced chunk. Two drain rounds are enough to confirm
  // the transcription queue is fully settled.
  for (let i = 0; i < 2; i++) {
    await page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).__braatMem
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = api?.snapshot()?.sources?.workers?.values ?? {}
        return (v.pendingTranscriptions ?? 0) === 0
      },
      undefined,
      { timeout: 180_000 },
    )
    await page.waitForTimeout(10_000)
  }

  // Alignment for one short word completes in seconds; give it a small buffer.
  await page.waitForTimeout(5_000)
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).__braatMem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = api?.snapshot()?.sources?.workers?.values ?? {}
      return (v.alignJobActive ?? 0) === 0
    },
    undefined,
    { timeout: 30_000 },
  )
  await page.waitForTimeout(2_000)

  await forceGc(page)
  await page.waitForTimeout(500)
  const afterStt = await readSnapshot(page)
  await hooks?.afterPhase?.('afterStt')

  // Log worker state for visibility.
  const wv = await workerValues(page)
  console.log(
    `\n  workers after STT: transcribeWorkers=${wv['transcribeWorkers']},` +
      ` pendingTranscriptions=${wv['pendingTranscriptions']},` +
      ` alignWorkerLive=${wv['alignWorkerLive']},` +
      ` alignJobActive=${wv['alignJobActive']}`,
  )

  // --- Clear ("New") ---
  // Workers stay alive (60s idle teardown pending), so afterClear shows
  // audio/analysis freed but worker weights still resident.
  await page.locator('[title="Application menu"]').click()
  await page.waitForTimeout(500)
  await page.getByText('New', { exact: true }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Discard' }).click()
  await page.waitForTimeout(2000)
  await forceGc(page)
  await page.waitForTimeout(1000)

  const afterClear = await readSnapshot(page)
  await hooks?.afterPhase?.('afterClear')

  return {
    name: 'stt-alignment',
    steps: [
      { name: 'baseline', snapshot: summarizeSnapshot(baseline) },
      { name: 'afterStt', snapshot: summarizeSnapshot(afterStt) },
      { name: 'afterClear', snapshot: summarizeSnapshot(afterClear) },
    ],
  }
}
