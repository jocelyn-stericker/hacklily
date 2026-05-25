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

// TanStack Router root configuration and layout definition.

import {
  createRouter as createTanStackRouter,
  useLocation,
} from '@tanstack/react-router'
import type { NotFoundRouteProps } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    basepath: '/',
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: function NotFound(_: NotFoundRouteProps) {
      const location = useLocation()
      console.log(`404: ${location.publicHref}`)
      return <p>Not Found</p>
    },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
