// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Alison Jenkins <alison.juliet.jenkins@gmail.com>

// Keyboard-shortcut help. A provider mounted at the root owns the modal's open
// state so both the global `?` hotkey and the Toolbar menu item can open it. The
// sheet lists only the shortcuts whose scope is currently active (plus the
// always-on global ones), read from the react-hotkeys-hook context.

import { createContext, useContext, useMemo, useState } from 'react'
import { useHotkeys, useHotkeysContext } from 'react-hotkeys-hook'

import { formatKeys, POINTER_HINTS, SHORTCUTS } from '#/components/shortcuts'
import type { Shortcut } from '#/components/shortcuts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

interface ShortcutsHelpApi {
  openShortcutsHelp: () => void
}

const ShortcutsHelpContext = createContext<ShortcutsHelpApi | null>(null)

/** Open the keyboard-shortcut help modal from anywhere under the provider. */
export function useShortcutsHelp(): ShortcutsHelpApi {
  const ctx = useContext(ShortcutsHelpContext)
  if (!ctx) {
    throw new Error(
      'useShortcutsHelp must be used within ShortcutsHelpProvider',
    )
  }
  return ctx
}

function Kbd({ combo }: { combo: string }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
      {combo}
    </kbd>
  )
}

interface HelpRow {
  label: string
  combo: string
}

function ShortcutRows({ rows }: { rows: HelpRow[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div
          key={`${r.combo}:${r.label}`}
          className="flex items-center justify-between gap-4"
        >
          <span>{r.label}</span>
          <Kbd combo={r.combo} />
        </div>
      ))}
    </div>
  )
}

export function ShortcutsHelpProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { activeScopes } = useHotkeysContext()

  useHotkeys(
    SHORTCUTS.help.keys,
    (e) => {
      e.preventDefault()
      setOpen((o) => !o)
    },
    { scopes: 'global' },
  )

  const api = useMemo<ShortcutsHelpApi>(
    () => ({ openShortcutsHelp: () => setOpen(true) }),
    [],
  )

  // Group the active shortcuts + pointer hints by display group, preserving
  // registry order (keyboard groups first, then the Mouse group).
  const groups = useMemo(() => {
    const inScope = (scope: string) =>
      scope === 'global' || activeScopes.includes(scope)
    const byGroup = new Map<string, HelpRow[]>()
    const push = (group: string, row: HelpRow) => {
      const list = byGroup.get(group)
      if (list) list.push(row)
      else byGroup.set(group, [row])
    }
    for (const s of Object.values(SHORTCUTS) as Shortcut[]) {
      if (inScope(s.scope))
        push(s.group, { label: s.label, combo: formatKeys(s.keys) })
    }
    for (const h of POINTER_HINTS) {
      if (inScope(h.scope)) {
        push(h.group, {
          label: h.label,
          combo: `${formatKeys(h.modifier)}-click`,
        })
      }
    }
    return [...byGroup.entries()]
  }, [activeScopes])

  return (
    <ShortcutsHelpContext.Provider value={api}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Shortcuts available on the current screen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {groups.map(([group, rows]) => (
              <div key={group} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  {group}
                </h3>
                <ShortcutRows rows={rows} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </ShortcutsHelpContext.Provider>
  )
}
