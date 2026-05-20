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
