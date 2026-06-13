// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

export function PracticePassageFooter({
  source,
  sourceUrl,
  attribution,
}: {
  source?: string
  sourceUrl?: string
  attribution?: string
}) {
  if (!source && !attribution) return null
  return (
    <footer className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
      {source && (
        <p>
          Source:{' '}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {source}
            </a>
          ) : (
            source
          )}
        </p>
      )}
      {attribution && <p>{attribution}</p>}
    </footer>
  )
}
