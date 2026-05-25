/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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
