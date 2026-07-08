// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Catalog of synthetic reference voices available in the practice view.
//
// Each voice is a Kokoro TTS voice (or a blend of two) synthesized offline by
// `tools/synth-references/synth.ts` into per-sentence MP3 clips, with some
// pitch/resonance characterization plus a short prose description, and a
// resentation label (masc / femme / enby):
//
//   - Nova reads decidedly femme and must never be surfaced as enby.
//   - Kore is femme-leaning enby.
//   - heart_onyx (the af_heart x am_onyx blend) is masc-leaning enby.
//
// Voices are ordered by overall gender impression, by vibes. Individual measurements
// are not monotonic.

export type VoicePresentation = 'masc' | 'femme' | 'enby'

export type ReferenceVoice = {
  /** Id used in reference clip file paths (manifest.json / `<voiceId>.mp3`). */
  id: string
  /** Display name. */
  name: string
  presentation: VoicePresentation
  /** F0 (Hz) median. */
  f0: number
  /** F1 (Hz) median. */
  f1: number
  /** One-line characterization shown in the UI. */
  description: string
}

export const REFERENCE_VOICES: readonly ReferenceVoice[] = [
  {
    id: 'am_onyx',
    name: 'Onyx',
    presentation: 'masc',
    f0: 83,
    f1: 424,
    description: 'Deep, dark',
  },
  {
    id: 'am_michael',
    name: 'Michael',
    presentation: 'masc',
    f0: 110,
    f1: 650,
    description: 'Deep with bright resonance',
  },
  {
    id: 'am_fenrir',
    name: 'Fenrir',
    presentation: 'masc',
    f0: 137,
    f1: 444,
    description: 'Low-mid masc, darker resonance',
  },
  {
    id: 'heart_onyx',
    name: 'Heart × Onyx',
    presentation: 'enby',
    f0: 128,
    f1: 463,
    description: 'Masc-leaning',
  },
  {
    id: 'af_kore',
    name: 'Kore',
    presentation: 'enby',
    f0: 156,
    f1: 429,
    description: 'Femme-leaning',
  },
  {
    id: 'af_nova',
    name: 'Nova',
    presentation: 'femme',
    f0: 156,
    f1: 628,
    description: 'Mid pitch with bright resonance',
  },
  {
    id: 'af_sarah',
    name: 'Sarah',
    presentation: 'femme',
    f0: 177,
    f1: 548,
    description: 'Mid-high',
  },
  {
    id: 'af_heart',
    name: 'Heart',
    presentation: 'femme',
    f0: 194,
    f1: 594,
    description: 'High, bright',
  },
] as const

export const DEFAULT_REFERENCE_VOICE_ID = 'heart_onyx'

export function getReferenceVoice(
  id: string | null | undefined,
): ReferenceVoice {
  if (id) {
    const v = REFERENCE_VOICES.find((r) => r.id === id)
    if (v) return v
  }
  return (
    REFERENCE_VOICES.find((r) => r.id === DEFAULT_REFERENCE_VOICE_ID) ??
    REFERENCE_VOICES[0]!
  )
}
