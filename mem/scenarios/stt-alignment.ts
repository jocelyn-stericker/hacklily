// Memory scenario: Moonshine STT + forced alignment.
//
// Measures how much memory the transcription and alignment workers add, one at a
// time. Single-residency (see lib/jobs/heavyWorkerArbiter) means the two heavy
// models never coexist, so we capture each while it is the sole resident model:
//
//   - transcribing: Moonshine resident, alignment still disabled.
//   - aligning: alignment enabled, which evicts Moonshine and loads the aligner.
//
// Automatically downloads the Moonshine model if it is not already in the
// browser cache; the alignment model downloads lazily on first use.

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

// Patch settings at runtime and notify the app. Same-tab localStorage writes
// don't fire 'storage', so we dispatch it manually; the settings store listens
// for it, invalidates its cache, and the app re-reads (see lib/settings.ts).
async function setSettings(
  page: Page,
  patch: Record<string, unknown>,
): Promise<void> {
  await page.evaluate((p) => {
    const KEY = 'braat:settings'
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<
      string,
      unknown
    >
    Object.assign(s, p)
    localStorage.setItem(KEY, JSON.stringify(s))
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: KEY,
        newValue: localStorage.getItem(KEY),
      }),
    )
  }, patch)
}

function logWorkers(wv: Record<string, number>, phase: string): void {
  console.log(
    `\n  workers at ${phase}: transcribeWorkers=${wv['transcribeWorkers']},` +
      ` pendingTranscriptions=${wv['pendingTranscriptions']},` +
      ` alignWorkerLive=${wv['alignWorkerLive']},` +
      ` alignJobActive=${wv['alignJobActive']}`,
  )
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
 * Main route: import the butterfly sample (~1.25s, one spoken word) and measure
 * the two heavy workers separately, since single-residency keeps only one model
 * resident at a time.
 *
 * `runHeavyWhileRecording` is toggled, not fixed: it lengthens the idle-unload
 * window to 60s, which the measurement phases need so the resident model
 * survives the ~20s rate-limit wait on measureUserAgentSpecificMemory(). It's
 * left OFF for the baseline and afterClear phases (and we wait for the workers to
 * unload) so those are model-free reference points. The scenario imports a file
 * (never records), so the flag has no other effect here.
 */
export const sttAlignment: Scenario = async (
  page: Page,
  serverUrl: string,
  hooks,
): Promise<ScenarioResult> => {
  // Inject settings before the app mounts. Alignment and the warm-idle window
  // both start disabled so the baseline is model-free; both are toggled on below.
  // We do not pre-set braat:model-downloaded:moonshine here; ensureModelDownloaded
  // handles it so the flag reflects the real cache state.
  await page.addInitScript(() => {
    const SETTINGS_KEY = 'braat:settings'
    const existing = localStorage.getItem(SETTINGS_KEY)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: Record<string, any> = existing ? JSON.parse(existing) : {}
    settings.transcriptionMode = 'small'
    settings.forcedAlignment = false
    settings.runHeavyWhileRecording = false
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  })

  await page.goto(serverUrl + '/')
  await waitForProbe(page)

  await ensureModelDownloaded(page)

  // --- Baseline (model-free) ---
  // Downloading warms a Moonshine worker; with the cold idle window it unloads
  // after ~10s. Wait for that so the baseline holds no heavy model.
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).__braatMem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = api?.snapshot()?.sources?.workers?.values ?? {}
      return (v.transcribeWorkers ?? 0) === 0 && (v.alignWorkerLive ?? 0) === 0
    },
    undefined,
    { timeout: 30_000 },
  )
  await forceGc(page)
  await page.waitForTimeout(500)
  const baseline = await readSnapshot(page)
  await hooks?.afterPhase?.('baseline')

  // Widen the idle-unload window so the resident model survives the agentMemory
  // rate-limit wait during the two measurement phases.
  await setSettings(page, { runHeavyWhileRecording: true })

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

  // --- Transcribing: Moonshine resident, alignment disabled ---
  // Wait for the transcription queue to drain; the worker stays warm (60s idle).
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).__braatMem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = api?.snapshot()?.sources?.workers?.values ?? {}
      return (
        (v.pendingTranscriptions ?? 0) === 0 && (v.transcribeWorkers ?? 0) >= 1
      )
    },
    undefined,
    { timeout: 180_000 },
  )
  await forceGc(page)
  await page.waitForTimeout(500)
  const transcribing = await readSnapshot(page)
  await hooks?.afterPhase?.('transcribing')
  logWorkers(await workerValues(page), 'transcribing')

  // --- Enable alignment: evicts Moonshine, loads the aligner ---
  await setSettings(page, { forcedAlignment: true })

  // --- Aligning: aligner resident, Moonshine evicted ---
  // The first alignment downloads the ~30 MB model, so wait for the job to start,
  // then for it to finish.
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).__braatMem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = api?.snapshot()?.sources?.workers?.values ?? {}
      return (v.alignJobActive ?? 0) === 1
    },
    undefined,
    { timeout: 60_000 },
  )
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).__braatMem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = api?.snapshot()?.sources?.workers?.values ?? {}
      return (v.alignJobActive ?? 0) === 0
    },
    undefined,
    { timeout: 180_000 },
  )
  await page.waitForTimeout(1_000)
  await forceGc(page)
  await page.waitForTimeout(500)
  const aligning = await readSnapshot(page)
  await hooks?.afterPhase?.('aligning')
  logWorkers(await workerValues(page), 'aligning')

  // --- Clear ("New") ---
  await page.locator('[title="Application menu"]').click()
  await page.waitForTimeout(500)
  await page.getByText('New', { exact: true }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Discard' }).click()
  await page.waitForTimeout(2000)

  // --- afterClear (model-free) ---
  // Drop back to the cold idle window and wait for the aligner to unload, so the
  // post-clear snapshot holds no heavy model. Turning the flag off re-arms the
  // idle timer with the cold window, so this unloads in ~10s.
  await setSettings(page, { runHeavyWhileRecording: false })
  await page.waitForFunction(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).__braatMem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = api?.snapshot()?.sources?.workers?.values ?? {}
      return (v.transcribeWorkers ?? 0) === 0 && (v.alignWorkerLive ?? 0) === 0
    },
    undefined,
    { timeout: 30_000 },
  )
  await forceGc(page)
  await page.waitForTimeout(1000)

  const afterClear = await readSnapshot(page)
  await hooks?.afterPhase?.('afterClear')

  return {
    name: 'stt-alignment',
    steps: [
      { name: 'baseline', snapshot: summarizeSnapshot(baseline) },
      { name: 'transcribing', snapshot: summarizeSnapshot(transcribing) },
      { name: 'aligning', snapshot: summarizeSnapshot(aligning) },
      { name: 'afterClear', snapshot: summarizeSnapshot(afterClear) },
    ],
  }
}
