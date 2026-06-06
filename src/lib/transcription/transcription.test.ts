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

import { describe, it, expect, vi } from 'vitest'

import { bestResult, needsTier } from '.'

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
      bestResult({ results: { small: 's', cloud: 'c', large: 'l' } }),
    ).toBe('l')
    expect(bestResult({ results: { small: 's', cloud: 'c' } })).toBe('c')
    expect(bestResult({ results: { small: 's' } })).toBe('s')
  })

  it('returns the small text while a large upgrade is in flight', () => {
    expect(
      bestResult({
        results: { small: 's' },
        job: { tier: 'large', status: 'transcribing' },
      }),
    ).toBe('s')
  })

  it('returns undefined when nothing has completed yet', () => {
    expect(
      bestResult({ results: {}, job: { tier: 'small', status: 'queued' } }),
    ).toBeUndefined()
  })
})

describe('needsTier', () => {
  it('needs work when nothing exists for the tier', () => {
    expect(needsTier(undefined, 'small')).toBe(true)
    expect(needsTier({ results: {} }, 'small')).toBe(true)
  })

  it('does not need work once the tier has a result', () => {
    expect(needsTier({ results: { small: 'hi' } }, 'small')).toBe(false)
  })

  it('needs work at a different tier than the one already done', () => {
    expect(needsTier({ results: { small: 'hi' } }, 'large')).toBe(true)
  })

  it('does not need work while a job is queued or running', () => {
    expect(
      needsTier(
        { results: {}, job: { tier: 'small', status: 'queued' } },
        'small',
      ),
    ).toBe(false)
    expect(
      needsTier(
        { results: {}, job: { tier: 'small', status: 'transcribing' } },
        'small',
      ),
    ).toBe(false)
  })

  it('needs work again after a failed job (retry)', () => {
    expect(
      needsTier(
        { results: {}, job: { tier: 'small', status: 'error', error: 'x' } },
        'small',
      ),
    ).toBe(true)
  })
})
