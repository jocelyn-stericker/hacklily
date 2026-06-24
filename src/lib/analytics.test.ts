// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The module keeps process-wide state (queue, "initialized" latch), so each
// test imports a fresh copy via vi.resetModules() + dynamic import.
async function freshModule() {
  vi.resetModules()
  return import('./analytics')
}

// count.js is never actually loaded in tests; simulate it becoming ready by
// assigning window.goatcounter.count and firing the script's load event.
function simulateCountJsLoaded(count: (vars: unknown) => void) {
  window.goatcounter!.count = count
  document.head
    .querySelector('script[data-goatcounter]')!
    .dispatchEvent(new Event('load'))
}

describe('analytics', () => {
  beforeEach(() => {
    // initAnalytics injects the real count.js <script>; happy-dom blocks
    // external script loading and throws unless told to treat it as success.
    // We drive the "loaded" state manually via simulateCountJsLoaded anyway.
    const happyDOM = (
      globalThis as typeof globalThis & {
        happyDOM?: { settings: { handleDisabledFileLoadingAsSuccess: boolean } }
      }
    ).happyDOM
    if (happyDOM) happyDOM.settings.handleDisabledFileLoadingAsSuccess = true

    vi.stubEnv('PROD', true)
    document.head.innerHTML = ''
    delete (window as { goatcounter?: unknown }).goatcounter
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('queues events fired before count.js loads, then flushes them', async () => {
    const { initAnalytics, track } = await freshModule()
    initAnalytics()

    // count.js not ready yet -> the event must be buffered, not dropped.
    track('record-start')
    const count = vi.fn()
    simulateCountJsLoaded(count)

    expect(count).toHaveBeenCalledWith({
      path: 'record-start',
      title: 'record-start',
      event: true,
      no_session: true,
    })
  })

  it('sends straight through once count.js is ready', async () => {
    const { initAnalytics, track, trackPageview } = await freshModule()
    initAnalytics()
    const count = vi.fn()
    simulateCountJsLoaded(count)

    track('play')
    trackPageview('/practice', 'Practice')

    expect(count).toHaveBeenNthCalledWith(1, {
      path: 'play',
      title: 'play',
      event: true,
      no_session: true,
    })
    // Pageviews stay session-based (no no_session), so per-session visits are
    // counted rather than every navigation.
    expect(count).toHaveBeenNthCalledWith(2, {
      path: '/practice',
      title: 'Practice',
    })
  })

  it('strips a leading slash from event names (GoatCounter rejects it)', async () => {
    const { initAnalytics, track } = await freshModule()
    initAnalytics()
    const count = vi.fn()
    simulateCountJsLoaded(count)

    track('/reference-play/af_heart')

    expect(count).toHaveBeenCalledWith({
      path: 'reference-play/af_heart',
      title: '/reference-play/af_heart',
      event: true,
      no_session: true,
    })
  })

  it('does nothing outside production builds', async () => {
    vi.stubEnv('PROD', false)
    const { initAnalytics, track } = await freshModule()
    initAnalytics()
    track('play')

    // No script injected and no global created — fully inert.
    expect(document.head.querySelector('script[data-goatcounter]')).toBeNull()
    expect((window as { goatcounter?: unknown }).goatcounter).toBeUndefined()
  })
})
