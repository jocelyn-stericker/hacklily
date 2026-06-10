// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect, vi } from 'vitest'

import { bestResult, needsTier, transcriptIndicator } from '.'

vi.mock('#/lib/transcription/transcribeBundled', () => ({
  transcribeWithWorker: vi.fn(async () => 'transcribed text'),
}))

vi.mock('#/lib/transcription/transcribeWeb', () => ({
  transcribeWeb: vi.fn().mockRejectedValue(new Error('not used')),
}))

// transcription.ts imports modelDownload (which pulls in a web-worker module);
// stub it so the worker model always reads as downloaded and no worker loads.
vi.mock('#/lib/modelDownload', () => ({
  isModelDownloaded: vi.fn().mockReturnValue(true),
  clearModelDownloaded: vi.fn(),
}))

// The "small" tier probes for on-device support; force the bundled (Moonshine)
// path so the test doesn't depend on a browser SpeechRecognition global.
vi.mock('#/lib/browserFeatures', () => ({
  checkLocalTranscription: vi.fn().mockResolvedValue(false),
}))

describe('bestResult', () => {
  it('prefers large over cloud over small', () => {
    expect(
      bestResult({
        small: { text: 's' },
        cloud: { text: 'c' },
        large: { text: 'l' },
      })?.text,
    ).toBe('l')
    expect(
      bestResult({ small: { text: 's' }, cloud: { text: 'c' } })?.text,
    ).toBe('c')
    expect(bestResult({ small: { text: 's' } })?.text).toBe('s')
  })

  it('returns the small text while a large upgrade is in flight', () => {
    expect(
      bestResult({
        small: { text: 's' },
        large: { job: { tier: 'large', status: 'transcribing' } },
      })?.text,
    ).toBe('s')
  })

  it('returns undefined when nothing has completed yet', () => {
    expect(
      bestResult({ small: { job: { tier: 'small', status: 'queued' } } }),
    ).toBeUndefined()
  })
})

describe('needsTier', () => {
  it('needs work when nothing exists for the tier', () => {
    expect(needsTier(undefined, 'small')).toBe(true)
    expect(needsTier({}, 'small')).toBe(true)
  })

  it('does not need work once the tier has a result', () => {
    expect(needsTier({ small: { text: 'hi' } }, 'small')).toBe(false)
  })

  it('needs work at a different tier than the one already done', () => {
    expect(needsTier({ small: { text: 'hi' } }, 'large')).toBe(true)
  })

  it('does not need work while a job is queued or running', () => {
    expect(
      needsTier(
        { small: { job: { tier: 'small', status: 'queued' } } },
        'small',
      ),
    ).toBe(false)
    expect(
      needsTier(
        { small: { job: { tier: 'small', status: 'transcribing' } } },
        'small',
      ),
    ).toBe(false)
  })

  it('needs work again after a failed job (retry)', () => {
    expect(
      needsTier(
        { small: { job: { tier: 'small', status: 'error', error: 'x' } } },
        'small',
      ),
    ).toBe(true)
  })
})

describe('transcriptIndicator', () => {
  it('reports nothing for an absent or empty transcript', () => {
    expect(transcriptIndicator(undefined)).toEqual({ kind: 'none' })
    expect(transcriptIndicator({})).toEqual({ kind: 'none' })
  })

  it('prefers the best completed tier (large > cloud > small)', () => {
    expect(
      transcriptIndicator({
        small: { text: 's' },
        cloud: { text: 'c' },
        large: { text: 'l' },
      }),
    ).toEqual({ kind: 'done', tier: 'large' })
    expect(
      transcriptIndicator({ small: { text: 's' }, cloud: { text: 'c' } }),
    ).toEqual({ kind: 'done', tier: 'cloud' })
    expect(transcriptIndicator({ small: { text: 's' } })).toEqual({
      kind: 'done',
      tier: 'small',
    })
  })

  it('shows in-flight work over a completed lower tier', () => {
    expect(
      transcriptIndicator({
        small: { text: 's' },
        large: { job: { tier: 'large', status: 'transcribing' } },
      }),
    ).toEqual({ kind: 'transcribing' })
  })

  it('does not let a lower tier error mask a higher tier still in flight', () => {
    expect(
      transcriptIndicator({
        small: { job: { tier: 'small', status: 'error', error: 'boom' } },
        large: { job: { tier: 'large', status: 'transcribing' } },
      }),
    ).toEqual({ kind: 'transcribing' })
  })

  it('treats a queued job as in flight', () => {
    expect(
      transcriptIndicator({
        large: { job: { tier: 'large', status: 'queued' } },
      }),
    ).toEqual({ kind: 'transcribing' })
  })

  it('surfaces the highest tier error when nothing is in flight', () => {
    expect(
      transcriptIndicator({
        small: {
          job: { tier: 'small', status: 'error', error: 'small failed' },
        },
        large: {
          job: { tier: 'large', status: 'error', error: 'large failed' },
        },
      }),
    ).toEqual({ kind: 'error', error: 'large failed' })
  })
})
