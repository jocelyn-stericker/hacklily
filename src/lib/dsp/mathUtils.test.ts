// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { describe, it, expect } from 'vitest'

import { nextPow2 } from './mathUtils'

describe('nextPow2', () => {
  it('returns the input when it is already a power of 2', () => {
    expect(nextPow2(1)).toBe(1)
    expect(nextPow2(2)).toBe(2)
    expect(nextPow2(1024)).toBe(1024)
    expect(nextPow2(2 ** 20)).toBe(2 ** 20)
  })

  it('rounds up to the next power of 2', () => {
    expect(nextPow2(3)).toBe(4)
    expect(nextPow2(5)).toBe(8)
    expect(nextPow2(127)).toBe(128)
    expect(nextPow2(1025)).toBe(2048)
    expect(nextPow2(1000000)).toBe(2 ** 20)
  })

  it('returns the smallest power of 2 >= input for all values 1-1000', () => {
    for (let i = 1; i <= 1000; i++) {
      const result = nextPow2(i)
      expect(result).toBeGreaterThanOrEqual(i)
      expect(result & (result - 1)).toBe(0)
      expect(result / 2).toBeLessThan(i)
    }
  })
})
