// SPDX-License-Identifier: AGPL-3.0-or-later
// Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
// Copyright (C) Tabahi <tabahi@duck.com>.

/*
 * Phonemizer golden tests -- values cross-checked against the upstream Python
 * ph66 mapper (bournemouth_aligner/ipamappers/ph66_mapper.py).
 */
import { describe, it, expect } from 'vitest'

import { getCompoundPhonemeMapping } from './ph66Mapper'
import { phonemizeTranscript } from './phonemizer'

describe('phonemizeTranscript — golden cases', () => {
  it("maps 'butterfly' (| -separated espeak IPA) to ph66/pg16/mipa", () => {
    const p = phonemizeTranscript('b|ʌ|ɾ|ɚ|f|l|aɪ')
    expect(p.ph66).toEqual([29, 10, 58, 9, 43, 56, 23])
    expect(p.pg16).toEqual([7, 2, 14, 2, 8, 13, 5])
    expect(p.mipa).toEqual(['b', 'ʌ', 'ɾ', 'ɚ', 'f', 'l', 'aɪ'])
    expect(p.eipa).toEqual(['b', 'ʌ', 'ɾ', 'ɚ', 'f', 'l', 'aɪ'])
    expect(p.words).toEqual(['b|ʌ|ɾ|ɚ|f|l|aɪ'])
    expect(p.wordNum).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it("expands predefined compounds: 'ɑːɹ' -> [a:, ɹ]", () => {
    const p = phonemizeTranscript('ɑːɹ')
    expect(p.ph66).toEqual([19, 59])
    expect(p.pg16).toEqual([4, 14])
    expect(p.mipa).toEqual(['a:', 'ɹ'])
    // The compound continuation carries "-" in the espeak-IPA column.
    expect(p.eipa).toEqual(['ɑːɹ', '-'])
  })

  it("expands syllabic 'əl' -> [ə, l] and 'ju' -> [j, u]", () => {
    expect(phonemizeTranscript('əl').ph66).toEqual([8, 56])
    expect(phonemizeTranscript('ju').ph66).toEqual([60, 11])
  })

  it("drops unmapped phonemes as noise by default ('ɝ' -> [])", () => {
    expect(phonemizeTranscript('ɝ').ph66).toEqual([])
  })

  it('keeps noise as id 66 when removeNoisePhonemes=false', () => {
    const p = phonemizeTranscript('ɝ', { removeNoisePhonemes: false })
    expect(p.ph66).toEqual([66])
  })

  it('inserts SIL (id 0) for punctuation and compacts words', () => {
    // "hello , world ." -> SIL between/after words; word list excludes <sil>.
    const p = phonemizeTranscript('h|ɛ|l|oʊ , w|ɝ|l|d .')
    // ɝ is unmapped -> dropped, so 'world' yields w,l,d.
    expect(p.ph66).toEqual([50, 7, 56, 26, 0, 61, 56, 31, 0])
    expect(p.mipa).toEqual(['h', 'ɛ', 'l', 'oʊ', 'SIL', 'w', 'l', 'd', 'SIL'])
    // word_num references the compacted word list (sil entries get their own).
    expect(p.wordNum).toEqual([0, 0, 0, 0, 1, 2, 2, 2, 3])
    expect(p.words).toEqual(['h|ɛ|l|oʊ', '<sil>', 'w|ɝ|l|d', '<sil>'])
  })

  it('treats literal <SIL> markers as silence', () => {
    const p = phonemizeTranscript('b <SIL> t')
    expect(p.ph66).toEqual([29, 0, 30])
    expect(p.mipa).toEqual(['b', 'SIL', 't'])
  })

  it('falls back to greedy IPA segmentation for separator-less words', () => {
    // No '|': the whole word is segmented greedily by getCompoundPhonemeMapping.
    const p = phonemizeTranscript('baɪ')
    expect(p.ph66).toEqual([29, 23]) // b + aɪ
  })

  it('returns empty output for empty/whitespace input', () => {
    const p = phonemizeTranscript('   ')
    expect(p.ph66).toEqual([])
    expect(p.words).toEqual([])
  })
})

describe('getCompoundPhonemeMapping — unit', () => {
  it('direct single mapping returns a 1-element list', () => {
    expect(getCompoundPhonemeMapping('b')).toEqual(['b'])
  })
  it('predefined compound returns its decomposition', () => {
    expect(getCompoundPhonemeMapping('ɑːɹ')).toEqual(['a:', 'ɹ'])
  })
  it('greedily decomposes valid IPA runs', () => {
    expect(getCompoundPhonemeMapping('zzz')).toEqual(['z', 'z', 'z'])
  })
  it('unknown input collapses to noise', () => {
    expect(getCompoundPhonemeMapping('@@@')).toEqual(['noise'])
  })
})
