// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Runtime-side mirror of the manifest written by
// `tools/synth-references/synth.ts`. Only the fields the app actually read are
// typed here; the on-disk file may carry more.

export type ReferenceClip = {
  url: string
  durationSec: number
  engine: string
}

export type ReferenceSegment = {
  text: string
  textHash: string
  clips: Record<string, ReferenceClip>
}

export type ReferencePassage = {
  title: string
  kind: string
  segments: ReferenceSegment[]
}

export type ReferenceManifest = {
  generatedAt: string
  model: string
  passages: Record<string, ReferencePassage>
}
