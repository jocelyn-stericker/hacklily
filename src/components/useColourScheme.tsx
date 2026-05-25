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

import { useEffect, useState } from 'react'

const query = window.matchMedia('(prefers-color-scheme: dark)')

export function useColourScheme(): 'dark' | 'light' {
  const [scheme, setScheme] = useState<'dark' | 'light'>(
    query.matches ? 'dark' : 'light',
  )

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) =>
      setScheme(e.matches ? 'dark' : 'light')
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  return scheme
}
