import { TanStackDevtools } from '@tanstack/react-devtools'
import { Outlet, createRootRoute } from '@tanstack/react-router'

import { Toaster } from '#/components/ui/sonner'

export const Route = createRootRoute({
  component: RootDocument,
})

function RootDocument() {
  return (
    <>
      <Outlet />
      <Toaster invert={true} />
      <TanStackDevtools plugins={[]} />
    </>
  )
}
