// Root layout component wrapping all pages with global UI (toaster, devtools).

import { TanStackDevtools } from '@tanstack/react-devtools'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

import { Toaster } from '#/components/ui/sonner'

export const Route = createRootRoute({
  component: RootDocument,
})

function RootDocument() {
  const needsRefreshPosted = useRef(false)
  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (needsRefreshPosted.current) {
          return
        }
        needsRefreshPosted.current = true
        toast('A new version is available', {
          duration: Infinity,
          closeButton: true,
          action: {
            label: 'Reload',
            onClick: () => updateSW(true),
          },
        })
      },
    })
  }, [])
  return (
    <>
      <Outlet />
      <Toaster invert={true} />
      <TanStackDevtools plugins={[]} />
    </>
  )
}
