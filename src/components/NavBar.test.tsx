// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Alison Jenkins <alison.juliet.jenkins@gmail.com>

// @vitest-environment happy-dom
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NavBar } from './NavBar'

const { journalEnabled } = vi.hoisted(() => ({
  journalEnabled: vi.fn(() => true),
}))
vi.mock('#/lib/journal/journalEnabled', () => ({ journalEnabled }))

afterEach(() => {
  vi.clearAllMocks()
})

// Render NavBar as the root layout so it is present on every path, with a stub
// route per tool so its <Link>s resolve against a real router.
function renderNavAt(path: string) {
  const rootRoute = createRootRoute({ component: () => <NavBar /> })
  const routes = ['/', '/ipa', '/practice', '/journal'].map((p) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: p,
      component: () => null,
    }),
  )
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  return render(<RouterProvider router={router} />)
}

describe('NavBar', () => {
  it('shows every enabled tool as a link', async () => {
    renderNavAt('/')
    // The router mounts asynchronously; wait for the bar, then assert the rest.
    await screen.findByRole('link', { name: 'Analyze' })
    for (const label of ['IPA', 'Practice', 'Journal']) {
      expect(screen.getByRole('link', { name: label })).toBeTruthy()
    }
  })

  it('marks the current tool as the active page', async () => {
    renderNavAt('/ipa')
    const ipa = await screen.findByRole('link', { name: 'IPA' })
    expect(ipa.getAttribute('aria-current')).toBe('page')
    // A non-active tool carries no aria-current.
    expect(
      screen
        .getByRole('link', { name: 'Practice' })
        .getAttribute('aria-current'),
    ).toBeNull()
  })

  it('hides the journal when its feature flag is off', async () => {
    journalEnabled.mockReturnValue(false)
    renderNavAt('/')
    // The other tools are unaffected.
    await screen.findByRole('link', { name: 'Analyze' })
    expect(screen.queryByRole('link', { name: 'Journal' })).toBeNull()
  })
})
