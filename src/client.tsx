// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Vite/TanStack client entry point with React DOM rendering.

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { initAnalytics, trackPageview } from './lib/analytics'
import { getRouter } from './router'

import './styles.css'

const ENABLE_STRICT_MODE = false

const router = getRouter()

// Cookieless analytics: one pageview per resolved route. Deduped by pathname so
// re-resolves (search/hash changes, preloads settling) don't double-count, and
// so the initial load is counted exactly once.
initAnalytics()
let lastTrackedPath: string | undefined
function trackCurrentRoute() {
  const path = router.state.location.pathname
  if (path === lastTrackedPath) return
  lastTrackedPath = path
  trackPageview(path)
}
trackCurrentRoute()
router.subscribe('onResolved', trackCurrentRoute)

createRoot(document.getElementById('root')!).render(
  ENABLE_STRICT_MODE ? (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  ) : (
    <RouterProvider router={router} />
  ),
)
