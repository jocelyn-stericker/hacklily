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

  it('returns the smallest power of 2 >= input for all values 1–1000', () => {
    for (let i = 1; i <= 1000; i++) {
      const result = nextPow2(i)
      expect(result).toBeGreaterThanOrEqual(i)
      expect(result & (result - 1)).toBe(0)
      expect(result / 2).toBeLessThan(i)
    }
  })
})
