// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Catalog of synthetic reference voices available in the practice view.
//
// Each voice is a Kokoro TTS voice (or a blend of two) synthesized offline by
// `tools/synth-references/synth.ts` into per-sentence MP3 clips, with some
// pitch/resonance characterization plus a short prose description, and a
// presentation label (masc / femme / enby):
//
//   - Nova reads decidedly femme and must never be surfaced as enby.
//   - Kore is femme-leaning enby.
//   - heart_onyx (the af_heart x am_onyx blend) is masc-leaning enby.
//
// Voices are ordered by overall gender impression, by vibes. Individual
// measurements are not monotonic.
//
// Accents: voices are grouped by `accent`. The en-gb set was chosen to mirror
// the en-us pitch/resonance spread as closely as the Kokoro en-gb voice pool
// allows (see tools/synth-references/measure.ts for the measurement harness).
// Known gaps: the deep-dark masc end (am_onyx 83 Hz) sits below the en-gb F0
// floor (~100 Hz, bm_lewis), and the bright femme resonance (af_nova/af_heart
// ~600 Hz F1) sits above the en-gb F1 ceiling (~551 Hz, bf_lily). en-gb f0/f1
// below are measured on the rainbow passage.

export type VoicePresentation = 'masc' | 'femme' | 'enby'

export type Accent = 'en-us' | 'en-gb'

export type ReferenceVoice = {
  /** Id used in reference clip file paths (manifest.json / `<voiceId>.mp3`). */
  id: string
  /** Display name. */
  name: string
  accent: Accent
  presentation: VoicePresentation
  /** F0 (Hz) median. */
  f0: number
  /** F1 (Hz) median. */
  f1: number
  /** One-line characterization shown in the UI. */
  description: string
}

const EN_US_VOICES: readonly ReferenceVoice[] = [
  {
    id: 'am_onyx',
    name: 'Onyx',
    accent: 'en-us',
    presentation: 'masc',
    f0: 83,
    f1: 424,
    description: 'Deep, dark',
  },
  {
    id: 'am_michael',
    name: 'Michael',
    accent: 'en-us',
    presentation: 'masc',
    f0: 110,
    f1: 650,
    description: 'Deep with bright resonance',
  },
  {
    id: 'am_fenrir',
    name: 'Fenrir',
    accent: 'en-us',
    presentation: 'masc',
    f0: 137,
    f1: 444,
    description: 'Low-mid masc, darker resonance',
  },
  {
    id: 'heart_onyx',
    name: 'Heart × Onyx',
    accent: 'en-us',
    presentation: 'enby',
    f0: 128,
    f1: 463,
    description: 'Masc-leaning',
  },
  {
    id: 'af_kore',
    name: 'Kore',
    accent: 'en-us',
    presentation: 'enby',
    f0: 156,
    f1: 429,
    description: 'Femme-leaning',
  },
  {
    id: 'af_nova',
    name: 'Nova',
    accent: 'en-us',
    presentation: 'femme',
    f0: 156,
    f1: 628,
    description: 'Mid pitch with bright resonance',
  },
  {
    id: 'af_sarah',
    name: 'Sarah',
    accent: 'en-us',
    presentation: 'femme',
    f0: 177,
    f1: 548,
    description: 'Mid-high',
  },
  {
    id: 'af_heart',
    name: 'Heart',
    accent: 'en-us',
    presentation: 'femme',
    f0: 194,
    f1: 594,
    description: 'High, bright',
  },
] as const

// en-gb counterparts. Native voices where one fits, plus the Fable x Isabella
// enby blend (isabella 0.4 / fable 0.6, measured 147/473) where no native does.
// bf_isabella's F1 is the closest to Fable's of any en-gb voice, so a Fable-
// dominant blend keeps Fable's resonance while raising F0 into femme-enby
// range. Fable itself reads enby and is labelled as such, so it sits in the
// enby section. Ordered masc -> enby -> femme by impression (F0 is
// intentionally not monotonic). en-us has more range.
const EN_GB_VOICES: readonly ReferenceVoice[] = [
  {
    id: 'bm_lewis',
    name: 'Lewis',
    accent: 'en-gb',
    presentation: 'masc',
    f0: 100,
    f1: 485,
    description: '',
  },
  {
    id: 'bm_george',
    name: 'George',
    accent: 'en-gb',
    presentation: 'masc',
    f0: 137,
    f1: 397,
    description: '',
  },
  {
    id: 'bm_fable',
    name: 'Fable',
    accent: 'en-gb',
    presentation: 'enby',
    f0: 110,
    f1: 477,
    description: '',
  },
  {
    id: 'isabella_fable',
    name: 'Isabella × Fable',
    accent: 'en-gb',
    presentation: 'enby',
    f0: 147,
    f1: 473,
    description: '',
  },
  {
    id: 'bf_emma',
    name: 'Emma',
    accent: 'en-gb',
    presentation: 'femme',
    f0: 176,
    f1: 489,
    description: '',
  },
  {
    id: 'bf_lily',
    name: 'Lily',
    accent: 'en-gb',
    presentation: 'femme',
    f0: 182,
    f1: 551,
    description: '',
  },
] as const

/** Voices grouped by accent, each ordered by gender impression (masc -> femme). */
export const REFERENCE_VOICES_BY_ACCENT: Record<
  Accent,
  readonly ReferenceVoice[]
> = {
  'en-us': EN_US_VOICES,
  'en-gb': EN_GB_VOICES,
}

/** Ordered accent ids, matching the UI presentation order. */
export const ACCENTS: readonly Accent[] = ['en-us', 'en-gb']

/** Full language names shown in the Language dropdown. */
export const ACCENT_NAMES: Record<Accent, string> = {
  'en-us': 'English (North America)',
  'en-gb': 'English (British)',
}

/**
 * Flat catalog for id lookups.
 */
export const REFERENCE_VOICES: readonly ReferenceVoice[] = [
  ...EN_US_VOICES,
  ...EN_GB_VOICES,
]

export const DEFAULT_REFERENCE_VOICE_ID = 'heart_onyx'
export const DEFAULT_REFERENCE_ACCENT: Accent = 'en-us'

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

/** The accent a voice id belongs to, falling back to the default accent. */
export function accentOfVoice(id: string | null | undefined): Accent {
  const v = id ? REFERENCE_VOICES.find((r) => r.id === id) : undefined
  return v?.accent ?? DEFAULT_REFERENCE_ACCENT
}

/** Voices for an accent. */
export function voicesForAccent(accent: Accent): readonly ReferenceVoice[] {
  return REFERENCE_VOICES_BY_ACCENT[accent]
}
