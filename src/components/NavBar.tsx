// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Alison Jenkins <alison.juliet.jenkins@gmail.com>

// The shared top bar for every Braat sub-application. It gives a consistent,
// always-present way to jump between the tools (issue #15): a segmented tab
// switcher on wide screens, collapsing to a hamburger menu on narrow ones.
// Each tool passes its own controls via `actions`, which sit to the right.

import { Link, useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import type { ReactNode } from 'react'

import braatPng from '#/braat.png'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { enabledTools } from '#/lib/tools'
import { cn } from '#/lib/utils'

export function NavBar({ actions }: { actions?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const tools = enabledTools()

  return (
    <header className="flex items-center gap-1 border-b border-border bg-background p-2 shrink-0">
      <Link
        to="/"
        aria-label="Braat home"
        className="mr-1 shrink-0 self-center bg-[#8ace00]"
      >
        <img src={braatPng} className="h-9" alt="Braat" />
      </Link>

      {/* Wide screens: inline tab switcher. */}
      <nav aria-label="Tools" className="hidden items-center gap-1 sm:flex">
        {tools.map((tool) => {
          const active = pathname === tool.path
          const Icon = tool.icon
          return (
            <Link
              key={tool.path}
              to={tool.path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {tool.label}
            </Link>
          )
        })}
      </nav>

      {/* Narrow screens: hamburger menu with the same destinations. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Tools menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted sm:hidden"
        >
          <Menu className="size-6" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <DropdownMenuItem
                key={tool.path}
                render={<Link to={tool.path} />}
                // Roomy targets (~44px tall) so the menu is comfortable to tap,
                // including for users with motor or vision impairments.
                className={cn(
                  'min-h-11 gap-3 px-3 py-2.5 text-base',
                  pathname === tool.path && 'bg-muted font-medium',
                )}
              >
                <Icon className="size-5" />
                {tool.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {actions != null && (
        <div className="ml-auto flex min-w-0 items-center justify-end gap-1">
          {actions}
        </div>
      )}
    </header>
  )
}
