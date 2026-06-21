// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Where practice reference clips (and their manifest) are loaded from.
//
// The ~140 MB of synthesized MP3s live on a separate origin (media.braat.app)
// rather than in the app bundle / git repo. The manifest stores root-relative
// paths (`/references/...`); `mediaUrl` prefixes them with the media origin.
//
// Flip `USE_LOCAL_MEDIA` to true to load from the local (gitignored) copy
// instead, served same-origin by the dev server out of `./media/references`
// (see the `localMediaDevPlugin` in vite.config.ts). Populate that copy with
// `npm run media:fetch`. Useful when regenerating clips with
// `npm run synth:references` before uploading them. Leave it false for
// committed builds.

// Flip this by hand for local development (see file header).
const USE_LOCAL_MEDIA = false

/** Origin serving `/references/...`. Empty string means same-origin (local). */
export const MEDIA_ORIGIN =
  // eslint-disable-next-line no-unnecessary-condition -- toggled by hand above
  USE_LOCAL_MEDIA ? '' : 'https://media.braat.app'

/**
 * Resolve a root-relative media path (e.g. a manifest `clip.url` like
 * `/references/foo/000/af_heart.mp3`) to a full URL on the media origin.
 */
export function mediaUrl(path: string): string {
  return MEDIA_ORIGIN + path
}
