// SPDX-License-Identifier: AGPL-3.0-or-later
// Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
// Copyright (C) Tabahi <tabahi@duck.com>.
// See ATTRIBUTION.md.

/*
 * IPA -> ph66 base-phoneme mapping.
 *
 * Faithful TypeScript port of bournemouth_aligner/ipamappers/ph66_mapper.py
 * (functions get_compound_phoneme_mapping / _try_intelligent_split /
 *  _score_phoneme_split / _collapse_to_single_phoneme).
 */

import { phonemeMappingRaw, compoundPhonemeMappingRaw } from './ph66Data.js'

// Phonetic categories for the 66 base phonemes. [upstream: ph66_mapper.py:1109-1115]
const VOWELS = new Set([
  'i',
  'i:',
  'ɨ',
  'ɪ',
  'e',
  'e:',
  'ɛ',
  'ə',
  'ɚ',
  'ʌ',
  'u',
  'u:',
  'ʊ',
  'ɯ',
  'o',
  'o:',
  'ɔ',
  'a',
  'a:',
  'æ',
  'y',
  'ø',
])
const CONSONANTS = new Set([
  'p',
  'b',
  't',
  'd',
  'k',
  'g',
  'q',
  'ts',
  's',
  'z',
  'tʃ',
  'dʒ',
  'ʃ',
  'ʒ',
  'ɕ',
  'f',
  'v',
  'θ',
  'ð',
  'ç',
  'x',
  'ɣ',
  'h',
  'ʁ',
  'm',
  'n',
  'ɲ',
  'ŋ',
  'l',
  'ɭ',
  'ɾ',
  'ɹ',
  'j',
  'w',
  'tʲ',
  'nʲ',
  'rʲ',
  'ɭʲ',
])
const RHOTICS = new Set(['ɹ', 'ɾ', 'rʲ', 'ɚ'])

/** Score a 2-phoneme split. [upstream: ph66_mapper.py:1141 _score_phoneme_split] */
function scorePhonemeSplit(left: string, right: string): number {
  if (VOWELS.has(left) && RHOTICS.has(right)) return 10 // V + r
  if (VOWELS.has(left) && right === 'ə') return 8 // V + schwa
  if (left === 'ə' && CONSONANTS.has(right)) return 8 // schwa + C
  if (VOWELS.has(left) && VOWELS.has(right)) return 7 // V + V
  if (CONSONANTS.has(left) && VOWELS.has(right)) return 6 // C + V
  if (VOWELS.has(left) && CONSONANTS.has(right) && !RHOTICS.has(right)) return 5 // V + C
  if (CONSONANTS.has(left) && CONSONANTS.has(right)) return 3 // C + C
  return 1 // any valid split beats nothing
}

/** Port of _try_intelligent_split. [upstream: ph66_mapper.py:1097] */
function tryIntelligentSplit(phoneme: string): string[] | null {
  // Iterate by Unicode code point to match Python string slicing semantics.
  const chars = Array.from(phoneme)
  // Python uses highest-score-first with a *stable* sort (Timsort); for ties it
  // keeps the earlier split position. Array.prototype.sort is not guaranteed
  // stable across engines, so we track insertion order explicitly.
  const candidates: { score: number; order: number; split: string[] }[] = []
  let order = 0
  for (let splitPos = 1; splitPos < chars.length; splitPos++) {
    const left = chars.slice(0, splitPos).join('')
    const right = chars.slice(splitPos).join('')
    const leftMapped = Object.prototype.hasOwnProperty.call(
      phonemeMappingRaw,
      left,
    )
      ? phonemeMappingRaw[left]
      : null
    const rightMapped = Object.prototype.hasOwnProperty.call(
      phonemeMappingRaw,
      right,
    )
      ? phonemeMappingRaw[right]
      : null
    if (leftMapped && rightMapped) {
      candidates.push({
        score: scorePhonemeSplit(leftMapped, rightMapped),
        order: order++,
        split: [leftMapped, rightMapped],
      })
    }
  }
  if (candidates.length === 0) return null
  // reverse=True by score; preserve original order on ties (Python stable sort).
  candidates.sort((a, b) => b.score - a.score || a.order - b.order)
  return candidates[0]!.split
}

/** Port of _collapse_to_single_phoneme. [upstream: ph66_mapper.py:1169] */
function collapseToSinglePhoneme(phoneme: string): string | null {
  if (phoneme.includes('r') || phoneme.includes('ɹ') || phoneme.includes('ɚ')) {
    if (phonemeMappingRaw['ɚ']) return phonemeMappingRaw['ɚ']
    if (phonemeMappingRaw['ɹ']) return phonemeMappingRaw['ɹ']
  }
  if (phoneme.includes(':') || phoneme.includes('ː')) {
    const base = phoneme.replace(/:/g, '').replace(/ː/g, '')
    if (Object.prototype.hasOwnProperty.call(phonemeMappingRaw, base)) {
      return phonemeMappingRaw[base]!
    }
  }
  if (phoneme.includes('ə')) {
    if (phonemeMappingRaw['ə']) return phonemeMappingRaw['ə']
  }
  const first = Array.from(phoneme)[0]
  if (
    first !== undefined &&
    Object.prototype.hasOwnProperty.call(phonemeMappingRaw, first)
  ) {
    return phonemeMappingRaw[first]!
  }
  return null
}

/**
 * Map a phoneme to base phoneme(s) with intelligent compound splitting.
 * Faithful port of get_compound_phoneme_mapping. Always returns a list.
 * [upstream: ph66_mapper.py:1039]
 */
export function getCompoundPhonemeMapping(phoneme: string): string[] {
  // 1. Direct single-phoneme mapping
  if (Object.prototype.hasOwnProperty.call(phonemeMappingRaw, phoneme)) {
    return [phonemeMappingRaw[phoneme]!]
  }
  // 2. Predefined compound decompositions
  if (
    Object.prototype.hasOwnProperty.call(compoundPhonemeMappingRaw, phoneme)
  ) {
    return compoundPhonemeMappingRaw[phoneme]!.slice()
  }
  // 3. Intelligent 2-phoneme split
  const chars = Array.from(phoneme)
  if (chars.length > 1) {
    const bestSplit = tryIntelligentSplit(phoneme)
    if (bestSplit) return bestSplit
  }
  // 4. Greedy longest-match decomposition (operates on code points)
  const mapped: string[] = []
  let remaining = chars.slice()
  while (remaining.length > 0) {
    let found = false
    for (let i = remaining.length; i > 0; i--) {
      const subset = remaining.slice(0, i).join('')
      if (Object.prototype.hasOwnProperty.call(phonemeMappingRaw, subset)) {
        mapped.push(phonemeMappingRaw[subset]!)
        remaining = remaining.slice(i)
        found = true
        break
      }
    }
    if (!found) remaining = remaining.slice(1) // skip unknown char
  }
  if (mapped.length > 0) return mapped
  // 5. Last resort: collapse to single most-similar phoneme
  const collapsed = collapseToSinglePhoneme(phoneme)
  if (collapsed) return [collapsed]
  return ['noise']
}
