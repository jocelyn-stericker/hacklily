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

// Root layout component wrapping all pages with global UI (toaster, devtools).

import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'

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
    <TooltipProvider>
      <Outlet />
      <Toaster invert={true} />
    </TooltipProvider>
  )
}
