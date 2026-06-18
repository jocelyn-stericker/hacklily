// Repeated import/clear cycle to detect monotonic memory leaks.
// Runs N cycles of: import short WAV → wait for analysis → clear.
// If Chromium heap after clear grows each cycle, something isn't
// being released.

import type { Page } from '@playwright/test'

import {
  forceGc,
  readSnapshot,
  summarizeSnapshot,
  waitForProbe,
} from '../lib/probe.js'
import { generateWav } from '../lib/wav.js'
import type { Scenario } from './main-record.js'

const CYCLES = 3
const WAV_DURATION_SEC = 5

export const repeatedImportClear: Scenario = async (
  page: Page,
  serverUrl: string,
  hooks?: { afterPhase?: (phase: string) => Promise<void> },
) => {
  await page.goto(serverUrl + '/')
  await waitForProbe(page)

  const wav = generateWav(WAV_DURATION_SEC)

  // --- Baseline ---
  await forceGc(page)
  await page.waitForTimeout(500)
  const baseline = await readSnapshot(page)
  await hooks?.afterPhase?.('baseline')

  const steps: { name: string; snapshot: Record<string, number> }[] = []

  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    // --- Import ---
    const filechooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /import audio file/i }).click()
    const filechooser = await filechooserPromise
    await filechooser.setFiles([
      {
        name: `test-${cycle}.wav`,
        mimeType: 'audio/wav',
        buffer: wav,
      },
    ])

    // Wait for first analysis frame to appear, then settle.
    await page.waitForFunction(
      () => {
        const api = (
          window as unknown as { __braatMem?: { snapshot: () => any } }
        ).__braatMem
        if (!api) return false
        const snap = api.snapshot()
        return (snap.sources?.['main-route']?.values?.frameCount ?? 0) > 0
      },
      undefined,
      { timeout: 30_000 },
    )

    await page.waitForTimeout(3000)
    await forceGc(page)
    await page.waitForTimeout(500)

    const afterImport = await readSnapshot(page)
    await hooks?.afterPhase?.(`import-${cycle}`)
    steps.push({
      name: `import-${cycle}`,
      snapshot: summarizeSnapshot(afterImport),
    })

    // --- Clear ("New" → "Discard") ---
    await page.locator('[title="Application menu"]').click()
    await page.waitForTimeout(500)
    await page.getByText('New', { exact: true }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Discard' }).click()
    await page.waitForTimeout(2000)
    await forceGc(page)
    await page.waitForTimeout(1000)

    const afterClear = await readSnapshot(page)
    await hooks?.afterPhase?.(`clear-${cycle}`)
    steps.push({
      name: `clear-${cycle}`,
      snapshot: summarizeSnapshot(afterClear),
    })
  }

  return {
    name: 'repeated-import-clear',
    steps: [
      { name: 'baseline', snapshot: summarizeSnapshot(baseline) },
      ...steps,
    ],
  }
}
