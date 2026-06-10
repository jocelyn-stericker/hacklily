// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Vite/TanStack client entry point with React DOM rendering.

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { getRouter } from './router'

import './styles.css'

const ENABLE_STRICT_MODE = false

const router = getRouter()

createRoot(document.getElementById('root')!).render(
  ENABLE_STRICT_MODE ? (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  ) : (
    <RouterProvider router={router} />
  ),
)
