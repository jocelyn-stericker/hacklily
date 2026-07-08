// Memory scenarios for the main route: import audio, let analysis settle,
// scroll/playback, then idle. Each scenario returns a sequence of named
// snapshots the runner compares.

import type { Page } from '@playwright/test'

import {
  forceGc,
  readSnapshot,
  summarizeSnapshot,
  waitForProbe,
} from '../lib/probe.js'
import { generateWav } from '../lib/wav.js'

export interface ScenarioStep {
  name: string
  snapshot: Record<string, number>
}

export interface ScenarioResult {
  name: string
  steps: ScenarioStep[]
}

export interface ScenarioDef {
  run: Scenario
  /**
   * Preferred browser for this scenario. Used when the user hasn't
   * explicitly chosen --browser. Most scenarios run on webkit (mobile
   * Safari is the target); stt-alignment uses chromium for CDP heap
   * breakdown. See the SCENARIOS note in run.ts.
   */
  preferredBrowser?: 'webkit' | 'chromium'
  /** Route the scenario starts at, e.g. '/' or '/practice'. */
  route: string
}

export interface ScenarioHooks {
  /** Called after each named phase completes. The runner can use this to
   *  capture CDP heap snapshots at step boundaries. */
  afterPhase?: (phase: string) => Promise<void>
}

export type Scenario = (
  page: Page,
  serverUrl: string,
  hooks?: ScenarioHooks,
) => Promise<ScenarioResult>

/**
 * Main route: import a 60s WAV, wait for analysis, scroll, idle, then
 * clear. Checks that retained memory drops back toward baseline after
 * "New" clears the timeline.
 */
export const mainImport: Scenario = async (page, serverUrl, hooks) => {
  await page.goto(serverUrl + '/')
  await waitForProbe(page)

  const wav = generateWav(60)

  // --- Baseline (empty app) ---
  await forceGc(page)
  await page.waitForTimeout(500)
  const before = await readSnapshot(page)
  await hooks?.afterPhase?.('baseline')

  // --- Import the WAV via the file picker ---
  // The WelcomeModal appears on first load with an "Import Audio File" button.
  // That button calls openFilePicker, which creates an <input type=file> and
  // clicks it. Playwright's filechooser event lets us supply the file.
  const filechooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /import audio file/i }).click()
  const filechooser = await filechooserPromise
  await filechooser.setFiles([
    {
      name: 'test-60s.wav',
      mimeType: 'audio/wav',
      buffer: wav,
    },
  ])

  // Wait for analysis to complete: the spectrogram tiles should grow and
  // the toolbar should leave the "analyzing" state.
  const pollStart = Date.now()
  const poll = setInterval(async () => {
    try {
      const snap = await readSnapshot(page)
      const frames = snap.sources['main-route']?.values.frameCount ?? 0
      const elapsed = ((Date.now() - pollStart) / 1000).toFixed(0)
      process.stdout.write(`\r  importing... ${frames} frames (${elapsed}s)`)
    } catch {
      // ignore
    }
  }, 5000)

  try {
    await page.waitForFunction(
      () => {
        const api = (
          window as unknown as { __braatMem?: { snapshot: () => any } }
        ).__braatMem
        if (!api) return false
        const snap = api.snapshot()
        const frames = snap.sources?.['main-route']?.values?.frameCount ?? 0
        return frames > 24000
      },
      undefined,
      { timeout: 120_000 },
    )
  } finally {
    clearInterval(poll)
    process.stdout.write('\r' + ' '.repeat(60) + '\r')
  }
  // Extra settle time for workers to drain and tiles to finish.
  await page.waitForTimeout(3000)
  await forceGc(page)
  await page.waitForTimeout(500)

  const afterImport = await readSnapshot(page)
  await hooks?.afterPhase?.('afterImport')

  // --- Fully zoom out (whole 60s on screen at once) ---
  // In this app a plain wheel deltaY is a zoom (not a scroll): positive zooms
  // out, and handlePlotZoom caps the span at the full track (~90s for a 60s
  // WAV). Fully zoomed out is a weak spot. Eviction floors at the
  // on-screen set, so every visible tile is held at full
  // resolution. This snapshot makes that retained span measurable.
  //
  // Only the spectrogram plot wires onZoom to handlePlotZoom; the waveform plot
  // above it passes onZoom={noOp}. The spectrogram is the taller plot (flex-1
  // vs the waveform's fixed h-32), so target the largest canvas to land the
  // wheel on the right VirtualScrollArea overlay.
  const specBox = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas'))
    let best: { x: number; y: number; width: number; height: number } | null =
      null
    for (const c of canvases) {
      const r = c.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      if (!best || r.width * r.height > best.width * best.height) {
        best = { x: r.x, y: r.y, width: r.width, height: r.height }
      }
    }
    return best
  })
  if (specBox) {
    await page.mouse.move(
      specBox.x + specBox.width / 2,
      specBox.y + specBox.height / 2,
    )
  }
  // Each wheel event is capped at exp(80 * 0.002) is about 1.17x; ~30 steps drives the
  // span from the import default to the ~90s cap with margin to spare.
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 80)
    await page.waitForTimeout(50)
  }
  await page.waitForTimeout(1500)
  await forceGc(page)
  await page.waitForTimeout(500)

  const afterZoomOut = await readSnapshot(page)
  await hooks?.afterPhase?.('afterZoomOut')

  // --- Zoom back in for the remaining steps ---
  // Negative deltaY zooms in (factor < 1); the same ~30 steps return the span
  // to roughly the import default so afterScroll/afterIdle aren't measured at
  // the zoomed-out extreme.
  if (specBox) {
    await page.mouse.move(
      specBox.x + specBox.width / 2,
      specBox.y + specBox.height / 2,
    )
  }
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, -80)
    await page.waitForTimeout(50)
  }
  await page.waitForTimeout(1000)

  // --- Scroll the timeline left and right a few times ---
  // Exercise the draw path and any caching.
  const scrollArea = page
    .locator('[data-testid="plot-scroll"], .plot-scroll, canvas')
    .first()
  await scrollArea.scrollIntoViewIfNeeded().catch(() => {})
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 500)
    await page.waitForTimeout(200)
    await page.mouse.wheel(0, -500)
    await page.waitForTimeout(200)
  }
  await page.waitForTimeout(1000)

  const afterScroll = await readSnapshot(page)
  await hooks?.afterPhase?.('afterScroll')

  // --- Idle for 3s (workers should be quiescent) ---
  await page.waitForTimeout(3000)
  await forceGc(page)
  await page.waitForTimeout(500)

  const afterIdle = await readSnapshot(page)
  await hooks?.afterPhase?.('afterIdle')

  // --- Clear ("New") should drop tiles, ropes, frames ---
  // "New" lives in the application menu dropdown (the hamburger/menu icon).
  await page.locator('[title="Application menu"]').click()
  await page.waitForTimeout(500)
  await page.getByText('New', { exact: true }).click()
  await page.waitForTimeout(500)
  // A confirmation dialog appears with a "Discard" button.
  await page.getByRole('button', { name: 'Discard' }).click()
  await page.waitForTimeout(2000)
  await forceGc(page)
  await page.waitForTimeout(1000)

  const afterClear = await readSnapshot(page)
  await hooks?.afterPhase?.('afterClear')

  return {
    name: 'main-import',
    steps: [
      { name: 'baseline', snapshot: summarizeSnapshot(before) },
      { name: 'afterImport', snapshot: summarizeSnapshot(afterImport) },
      { name: 'afterZoomOut', snapshot: summarizeSnapshot(afterZoomOut) },
      { name: 'afterScroll', snapshot: summarizeSnapshot(afterScroll) },
      { name: 'afterIdle', snapshot: summarizeSnapshot(afterIdle) },
      { name: 'afterClear', snapshot: summarizeSnapshot(afterClear) },
    ],
  }
}
