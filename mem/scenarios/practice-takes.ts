// Memory scenarios for the practice route. The practice route records from
// the mic, so we mock getUserMedia to feed real speech audio (butterfly.wav,
// looped). This exercises the full capture -> VAD -> analysis -> playback
// pipeline deterministically.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { Page } from '@playwright/test'

import {
  forceGc,
  readSnapshot,
  summarizeSnapshot,
  waitForProbe,
} from '../lib/probe.js'
import type { Scenario } from './main-record.js'

// Real speech sample (1.3s at 16 kHz mono). Downloaded on first use, then
// cached in test-assets/. Base64-encoded for injection into the page.
const BUTTERFLY_URL =
  'https://huggingface.co/Tabahi/CUPE-2i/resolve/main/samples/109867__timkahn__butterfly.wav.wav'

// fetch is async but we call this at module load for simplicity. Use a
// cached promise pattern — the mockMic function is async anyway.
let butterflyCache: Promise<string> | null = null
function getButterflyWavB64(): Promise<string> {
  if (!butterflyCache) {
    butterflyCache = (async () => {
      const assetsDir = resolve(process.cwd(), 'test-assets')
      const filePath = join(assetsDir, 'butterfly.wav')
      if (!existsSync(filePath)) {
        console.warn(`Downloading ${BUTTERFLY_URL}`)
        mkdirSync(assetsDir, { recursive: true })
        const res = await fetch(BUTTERFLY_URL)
        if (!res.ok)
          throw new Error(`Failed to download ${BUTTERFLY_URL} (${res.status})`)
        writeFileSync(filePath, Buffer.from(await res.arrayBuffer()))
      }
      return readFileSync(filePath).toString('base64')
    })()
  }
  return butterflyCache
}

/**
 * Mock `navigator.mediaDevices.getUserMedia` to return a MediaStream playing
 * looped real speech (butterfly.wav).
 *
 * Two things must work for the capture pipeline to produce frames:
 *
 * 1. The AudioManager's AudioContext must be `running`. On webkit, a context
 *    created outside a user gesture stays suspended. We patch the
 *    AudioContext constructor to auto-resume every new context — the "Start
 *    recording" click is a real gesture, so the context created inside that
 *    stack will resume successfully.
 *
 * 2. The audio must trigger Silero VAD. Synthesized tones don't. Real speech
 *    does. We decode butterfly.wav (via an OfflineAudioContext at the mock's
 *    sample rate) and loop it through a BufferSourceNode ->
 *    MediaStreamDestination. The 1.3s clip has natural speech -> silence
 *    transitions at the loop boundary, which echo-mode VAD detects as
 *    speech-end -> auto-advance.
 *
 * Implementation note — why we replace `navigator.mediaDevices` with a Proxy
 * instead of the obvious `navigator.mediaDevices.getUserMedia = fn`:
 *
 * Playwright's WebKit resets `navigator.mediaDevices`'s method bindings back
 * to native ~100ms after `addInitScript` runs (the secure-context media
 * subsystem re-initialises the object once the document is interactive). A
 * direct assignment to `getUserMedia` looks like it succeeds at init time but
 * is silently reverted before any page script runs, so the real
 * `getUserMedia` is called and the test hangs on the OS mic-permission
 * prompt. Replacing the `navigator.mediaDevices` *property itself* with a
 * Proxy (via `Object.defineProperty`) survives the reset, because WebKit
 * only restores the object's own methods, not a redefined accessor on
 * `navigator`. The Proxy forwards every property except `getUserMedia` to
 * the real object so `enumerateDevices` etc. still work.
 */
export async function mockMic(page: Page): Promise<void> {
  const butterflyWavB64 = await getButterflyWavB64()
  // Build the init script as a string so esbuild/tsx doesn't inject __name
  // helpers that don't exist in the page context.
  const script = `
    (function() {
      var w = window;
      var OrigCtx = w.AudioContext || w.webkitAudioContext;

      // Patch AudioContext to auto-resume. The "Start recording" click is a
      // real gesture, so resume() succeeds on webkit.
      function PatchedContext() {
        var ctx = new OrigCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(function() {});
        }
        return ctx;
      }
      w.AudioContext = PatchedContext;
      w.webkitAudioContext = PatchedContext;

      var wavB64 = ${JSON.stringify(butterflyWavB64)};

      function mockGetUserMedia(constraints) {
        if (constraints.audio) {
          var ctx = new PatchedContext();
          if (ctx.state === 'suspended') {
            return ctx.resume().then(function() { return buildStream(ctx); });
          }
          return Promise.resolve(buildStream(ctx));
        }
        return origGetUserMedia(constraints);
      }

      function buildStream(ctx) {
        var wavBytes = Uint8Array.from(atob(wavB64), function(c) {
          return c.charCodeAt(0);
        });
        return ctx.decodeAudioData(wavBytes.buffer).then(function(audioBuffer) {
          // Build a loop buffer: speech clip + 3s of silence. The silence
          // gap must exceed echo mode's redemption window (1500ms) so VAD
          // detects speech-end -> auto-advance. Use 3s for margin.
          var speechLen = audioBuffer.length;
          var silenceLen = ctx.sampleRate * 3; // 3s
          var loopLen = speechLen + silenceLen;
          var loopBuf = ctx.createBuffer(1, loopLen, ctx.sampleRate);
          loopBuf.getChannelData(0).set(audioBuffer.getChannelData(0), 0);

          var dest = ctx.createMediaStreamDestination();
          var src = ctx.createBufferSource();
          src.buffer = loopBuf;
          src.loop = true;
          src.connect(dest);
          src.start();
          w.__mockMic = { ctx: ctx, dest: dest, src: src };
          return dest.stream;
        });
      }

      // WebKit restores navigator.mediaDevices' own methods ~100ms after this
      // init script runs, so a plain assignment to getUserMedia is silently
      // reverted. Replace the navigator.mediaDevices property itself with a
      // Proxy that intercepts getUserMedia and forwards everything else
      // (enumerateDevices, devicechange, etc.) to the real object.
      var realMd = navigator.mediaDevices;
      var origGetUserMedia = realMd.getUserMedia.bind(realMd);
      var proxy = new Proxy(realMd, {
        get: function (target, prop, receiver) {
          if (prop === 'getUserMedia') return mockGetUserMedia;
          var v = target[prop];
          return typeof v === 'function' ? v.bind(target) : v;
        },
        set: function (target, prop, value) {
          target[prop] = value;
          return true;
        },
        has: function (target, prop) {
          return prop in target;
        },
      });
      try {
        Object.defineProperty(navigator, 'mediaDevices', {
          value: proxy,
          writable: true,
          configurable: true,
        });
      } catch (e) {
        // Fallback: if redefining navigator.mediaDevices fails (it shouldn't
        // on current WebKit, but older builds make the property
        // non-configurable), fall back to the direct assignment. The mock
        // won't survive the reset, but at least the failure mode is the
        // documented hang rather than a thrown init error.
        w.__mockMicFallback = 'defineProperty failed: ' + e.message;
        realMd.getUserMedia = mockGetUserMedia;
      }
    })();
  `

  await page.addInitScript({ content: script })
}

/**
 * Practice route: start a session, let echo mode auto-advance through 3
 * takes (speech -> silence -> take saved -> playback -> restart), then idle
 * and clear.
 *
 * Echo mode auto-fires handleNextTake when VAD detects speech-end, so we
 * don't click "Next" — we just poll takeCount until it reaches 3.
 */
export const practiceTakes: Scenario = async (page, serverUrl, hooks) => {
  await mockMic(page)
  await page.goto(serverUrl + '/practice')
  await waitForProbe(page)

  // --- Baseline ---
  await forceGc(page)
  await page.waitForTimeout(500)
  const before = await readSnapshot(page)
  await hooks?.afterPhase?.('baseline')

  // --- Start session ---
  await page
    .getByRole('button', { name: /start recording/i })
    .first()
    .click()

  // --- Wait for 3 takes via echo-mode auto-advance ---
  // Each take: ~1.3s speech -> VAD detects silence -> handleNextTake fires ->
  // take saved -> playback (~1.3s) -> PENDING_RESTART -> next take starts.
  // Allow up to 30s per take for VAD + playback + restart overhead.
  const pollStart = Date.now()
  const poll = setInterval(async () => {
    try {
      const snap = await readSnapshot(page)
      const v = snap.sources['practice-route']?.values
      const takes = v?.takeCount ?? 0
      const frames = v?.analysisFrameCount ?? 0
      const speech = v?.speechDetectedCount ?? 0
      const elapsed = ((Date.now() - pollStart) / 1000).toFixed(0)
      process.stdout.write(
        `\r  ${takes}/3 takes, ${frames} frames, ${speech} voiced (${elapsed}s)   `,
      )
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
        const takes = snap.sources?.['practice-route']?.values?.takeCount ?? 0
        return takes >= 3
      },
      undefined,
      { timeout: 90_000 },
    )
  } finally {
    clearInterval(poll)
    process.stdout.write('\r' + ' '.repeat(70) + '\r')
  }

  // --- End the session (stop the mic) ---
  await page
    .getByRole('button', { name: 'End session' })
    .click({ timeout: 5000 })
    .catch(() => {})

  await page.waitForTimeout(2000)
  await forceGc(page)
  await page.waitForTimeout(500)

  const afterTakes = await readSnapshot(page)
  await hooks?.afterPhase?.('afterTakes')

  // --- Idle ---
  await page.waitForTimeout(3000)
  await forceGc(page)
  await page.waitForTimeout(500)

  const afterIdle = await readSnapshot(page)
  await hooks?.afterPhase?.('afterIdle')

  // --- Clear session ---
  // On mobile viewport, takes are in a drawer. Open it, then click
  // "Clear session" -> "Discard".
  // The drawer trigger shows "Takes (N)" -- click it to expand.
  await page.locator('button:has-text("Takes")').first().click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Clear session' }).first().click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Discard' }).click()
  await page.waitForTimeout(2000)
  await forceGc(page)
  await page.waitForTimeout(1000)

  const afterClear = await readSnapshot(page)
  await hooks?.afterPhase?.('afterClear')

  return {
    name: 'practice-takes',
    steps: [
      { name: 'baseline', snapshot: summarizeSnapshot(before) },
      { name: 'afterTakes', snapshot: summarizeSnapshot(afterTakes) },
      { name: 'afterIdle', snapshot: summarizeSnapshot(afterIdle) },
      { name: 'afterClear', snapshot: summarizeSnapshot(afterClear) },
    ],
  }
}
