// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Root layout component wrapping all pages with global UI (toaster, devtools).

import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { installMemProbe } from '#/lib/memProbe'

export const Route = createRootRoute({
  component: RootDocument,
})

function RootDocument() {
  const needsRefreshPosted = useRef(false)
  useEffect(() => installMemProbe(), [])
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
    <TooltipProvider>
      <Outlet />
      <Toaster invert={true} />
    </TooltipProvider>
  )
}
