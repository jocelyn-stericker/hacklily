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
