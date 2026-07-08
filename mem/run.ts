// Layer 1 runner: Playwright webkit scenarios for leak/regression detection.
// Layer 2 runner: Playwright chromium with CDP heap breakdown for diagnosis.
//
// Usage:
//   npm run dev          # in another terminal first
//   npx tsx mem/run.ts                          # Layer 1: webkit, all scenarios
//   npx tsx mem/run.ts --browser chromium       # Layer 2: chromium CDP breakdown
//   npx tsx mem/run.ts --scenario main-import   # single scenario
//   npx tsx mem/run.ts --url http://localhost:5173

import { chromium, webkit } from '@playwright/test'
import type { CDPSession, Page } from '@playwright/test'

import { renderSummaryLine, renderTable } from './lib/format.js'
import { waitForProbe } from './lib/probe.js'
import { repeatedImportClear } from './scenarios/leak-check.js'
import type {
  Scenario,
  ScenarioDef,
  ScenarioHooks,
  ScenarioResult,
} from './scenarios/main-record.js'
import { mainImport } from './scenarios/main-record.js'
import { practiceTakes } from './scenarios/practice-takes.js'
import { sttAlignment } from './scenarios/stt-alignment.js'

interface CliArgs {
  url: string
  browser: 'webkit' | 'chromium' | null
  scenario: string | null
  headless: boolean
  layer2: boolean
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const out: CliArgs = {
    url: 'http://localhost:3000',
    browser: null,
    scenario: null,
    headless: true,
    layer2: false,
  }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      out.url = args[i + 1]!
      i++
    } else if (args[i] === '--browser' && args[i + 1]) {
      out.browser = args[i + 1] as 'webkit' | 'chromium'
      i++
    } else if (args[i] === '--scenario' && args[i + 1]) {
      out.scenario = args[i + 1] as string
      i++
    } else if (args[i] === '--headed') {
      out.headless = false
    } else if (args[i] === '--layer2' || args[i] === '--detail') {
      out.layer2 = true
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`Usage: npx tsx mem/run.ts [options]

Start the dev server first:  npm run dev

Options:
  --url <url>                   Dev server URL (default: http://localhost:3000)
  --browser <webkit|chromium>   Override browser engine (default: per-scenario)
  --scenario <name>             Run only this scenario
  --headed                      Show the browser window
  --layer2 / --detail           Layer 2: chromium CDP heap breakdown
  --help                        This help

Scenarios:
  main-import              Main route: import 60s WAV, scroll, idle, clear
  practice-takes           Practice route: record 3 takes, play back, idle, clear
  repeated-import-clear    Repeat import/clear 3x to detect monotonic leaks
  stt-alignment            Moonshine STT + forced alignment (needs cached model)

Default: Layer 1 on webkit, except stt-alignment (chromium, for CDP heap
breakdown).`)
      process.exit(0)
    }
  }
  return out
}

async function checkServerReachable(url: string): Promise<void> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(
      `Dev server not reachable at ${url} -- run \`npm run dev\` first (${msg})`,
    )
    process.exit(1)
  }
}

/**
 * Chrome launch options needed for Chromium scenarios.
 *
 * `performance.measureUserAgentSpecificMemory()` requires site isolation (a
 * dedicated renderer process per site). Playwright's default `headless: true`
 * launches the lightweight `chromium-headless-shell` binary, which does not do
 * site isolation, so the API throws SecurityError even with COOP/COEP headers
 * and `--headless=new` (the shell ignores it). `channel: 'chromium'` launches
 * the full Chrome-for-Testing build instead, which runs new headless by
 * default and supports the API. See
 * https://github.com/microsoft/playwright/issues/27499 and
 * https://playwright.dev/docs/browsers#chromium-new-headless-mode.
 */
function headlessChromiumArgs(headless: boolean): {
  channel?: string
  args: string[]
} {
  return {
    ...(headless && { channel: 'chromium' }),
    args: ['--js-flags=--expose-gc'],
  }
}

function attachPageLogging(page: Page): void {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning')
      console.error(`  [page ${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => console.error(`  [pageerror] ${err.message}`))
}

// Browser preferences per scenario:
//
// `main-import` and `practice-takes` run on webkit -- mobile Safari is the
// primary target. `repeated-import-clear` also runs on webkit now that the
// dev server sends `Cache-Control: no-store` on script responses (see
// vite.config.ts), which works around a WebKit COEP caching bug that
// previously made worker loads flaky under COEP `require-corp`.
//
// `stt-alignment` runs on chromium because Layer 2 needs CDP
// `backingStorageSize` to see worker WASM weights in the heap breakdown --
// webkit has no equivalent API.
const SCENARIOS: Record<string, ScenarioDef> = {
  'main-import': { run: mainImport, preferredBrowser: 'webkit', route: '/' },
  'practice-takes': {
    run: practiceTakes,
    preferredBrowser: 'webkit',
    route: '/practice',
  },
  'repeated-import-clear': {
    run: repeatedImportClear,
    preferredBrowser: 'webkit',
    route: '/',
  },
  // Chromium: worker WASM weights show up in CDP backingStorageSize (L2).
  'stt-alignment': {
    run: sttAlignment,
    preferredBrowser: 'chromium',
    route: '/',
  },
}

async function runScenarioLayer1(
  scenario: Scenario,
  serverUrl: string,
  headless: boolean,
  browserType: 'webkit' | 'chromium',
): Promise<ScenarioResult> {
  const launcher = browserType === 'chromium' ? chromium : webkit
  const chromiumLaunchOpts =
    browserType === 'chromium' ? headlessChromiumArgs(headless) : undefined
  const browser = await launcher.launch({ headless, ...chromiumLaunchOpts })
  try {
    const context = await browser.newContext({
      // Mobile-ish viewport — mobile Safari is the target.
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    attachPageLogging(page)

    const result = await scenario(page, serverUrl)
    await context.close()
    return result
  } finally {
    await browser.close()
  }
}

interface HeapReport {
  scenarioName: string
  stepName: string
  jsHeapUsed: number
  jsHeapTotal: number
  backingStorageSize: number
}

async function runScenarioLayer2(
  scenarioName: string,
  scenario: Scenario,
  scenarioDef: ScenarioDef,
  serverUrl: string,
  headless: boolean,
): Promise<{ heapReports: HeapReport[]; scenarioResult: ScenarioResult }> {
  const browser = await chromium.launch({
    headless,
    ...headlessChromiumArgs(headless),
  })
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['microphone'],
    })
    const page = await context.newPage()
    attachPageLogging(page)

    // Navigate and wait for the app to mount so the scenario can start from
    // a warm page (avoids cold-start variance in the first phase).
    const routeUrl = serverUrl + scenarioDef.route
    console.log(`[L2] navigating to ${routeUrl}...`)
    await page
      .goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 10000 })
      .catch((e) => console.log(`[L2] goto: ${e.message}`))
    console.log('[L2] waiting for probe...')
    await waitForProbe(page)

    const heapReports: HeapReport[] = []

    // Hooks called by the scenario after each named phase. We open a fresh
    // CDP session for each measurement so navigations within the scenario
    // never interfere.
    const hooks: ScenarioHooks = {
      afterPhase: async (phase: string) => {
        console.log(`[L2] ${phase}: creating CDP session...`)
        const client = await context.newCDPSession(page)
        try {
          await forceGcViaCdp(client)
          heapReports.push({
            scenarioName,
            stepName: phase,
            ...(await measureHeap(client)),
          })
        } finally {
          await client.detach()
        }
      },
    }

    console.log('[L2] running scenario...')
    const scenarioResult = await scenario(page, serverUrl, hooks)

    console.log('[L2] done.')
    await context.close()
    return { heapReports, scenarioResult }
  } finally {
    await browser.close()
  }
}

async function forceGcViaCdp(client: CDPSession): Promise<void> {
  try {
    await client.send('HeapProfiler.enable')
    await client.send('HeapProfiler.collectGarbage')
  } catch {
    // Ignore — not all targets support it.
  }
}

async function measureHeap(client: CDPSession): Promise<{
  jsHeapUsed: number
  jsHeapTotal: number
  backingStorageSize: number
}> {
  try {
    const { usedSize, totalSize, backingStorageSize } = (await client.send(
      'Runtime.getHeapUsage',
    )) as { usedSize: number; totalSize: number; backingStorageSize?: number }
    return {
      jsHeapUsed: usedSize,
      jsHeapTotal: totalSize,
      backingStorageSize: backingStorageSize ?? 0,
    }
  } catch {
    return { jsHeapUsed: 0, jsHeapTotal: 0, backingStorageSize: 0 }
  }
}

async function main() {
  const args = parseArgs()
  const isLayer2 = args.layer2

  console.log(
    `\n│ Braat memory ${isLayer2 ? 'breakdown (chromium CDP)' : 'check'}\n`,
  )

  await checkServerReachable(args.url)
  console.log(`Dev server at ${args.url}`)

  const scenarioNames = args.scenario ? [args.scenario] : Object.keys(SCENARIOS)

  for (const name of scenarioNames) {
    const scenarioDef = SCENARIOS[name]
    if (!scenarioDef) {
      console.error(`Unknown scenario: ${name}`)
      console.error(`Available: ${Object.keys(SCENARIOS).join(', ')}`)
      process.exit(1)
    }

    // Use the scenario's preferred browser unless the user explicitly
    // chose --browser.
    const browserType = args.browser ?? scenarioDef.preferredBrowser ?? 'webkit'

    console.log(`\n│ Scenario: ${name} (${browserType})`)
    console.log('└── running...')

    if (isLayer2) {
      const { heapReports, scenarioResult } = await runScenarioLayer2(
        name,
        scenarioDef.run,
        scenarioDef,
        args.url,
        args.headless,
      )
      // Merge CDP heap measurements into the scenario result so they
      // appear in the same table as the app-tracked metrics. The CDP
      // measurements overlap with app-tracked ArrayBuffer bytes
      // (ropeBytes, colorBytes, spectrumBytes are inside backingStorage),
      // so format.ts reports them as a separate "Chromium heap" subtotal.
      const heapByStep = new Map(heapReports.map((r) => [r.stepName, r]))
      for (const step of scenarioResult.steps) {
        const r = heapByStep.get(step.name)
        if (!r) continue
        step.snapshot['chromium.jsHeapUsedBytes'] = r.jsHeapUsed
        step.snapshot['chromium.jsHeapTotalBytes'] = r.jsHeapTotal
        step.snapshot['chromium.backingStorageBytes'] = r.backingStorageSize
      }
      console.log('\n' + renderTable(scenarioResult))
      console.log('\n  ' + renderSummaryLine(scenarioResult))
    } else {
      const result = await runScenarioLayer1(
        scenarioDef.run,
        args.url,
        args.headless,
        browserType,
      )
      console.log('\n' + renderTable(result))
      console.log('\n  ' + renderSummaryLine(result))
    }
  }
  console.log('\n✓ Done\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
