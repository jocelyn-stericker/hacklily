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

import { hzToBark } from './bark'

describe('hzToBark', () => {
  it('converts 0 Hz to 0 Bark', () => {
    expect(hzToBark(0)).toBeCloseTo(0, 2)
  })

  it('converts 1000 Hz to approximately 8.5 Bark', () => {
    const result = hzToBark(1000)
    expect(result).toBeCloseTo(8.5, 1)
  })

  it('converts 500 Hz to approximately 4.7 Bark', () => {
    const result = hzToBark(500)
    expect(result).toBeCloseTo(4.7, 1)
  })

  it('converts 4000 Hz to approximately 17.3 Bark', () => {
    const result = hzToBark(4000)
    expect(result).toBeCloseTo(17.3, 1)
  })

  it('is monotonically increasing', () => {
    const frequencies = [0, 100, 500, 1000, 2000, 5000, 10000, 20000]
    const barks = frequencies.map(hzToBark)
    for (let i = 1; i < barks.length; i++) {
      expect(barks[i]).toBeGreaterThan(barks[i - 1]!)
    }
  })

  it('approaches human hearing limit asymptotically', () => {
    // Human hearing is limited to roughly 24 Bark (≈20 kHz)
    const result20k = hzToBark(20000)
    const result40k = hzToBark(40000)
    // The increase from 20k to 40k should be much smaller than from 0 to 20k
    expect(result40k - result20k).toBeLessThan(hzToBark(20000) - hzToBark(0))
  })

  it('has decreasing slope with frequency (non-linear)', () => {
    // The rate of Bark change decreases at higher frequencies
    const bark100 = hzToBark(100)
    const bark200 = hzToBark(200)
    const bark10000 = hzToBark(10000)
    const bark10100 = hzToBark(10100)

    const slope1 = bark200 - bark100 // Bark per Hz at low freq
    const slope2 = bark10100 - bark10000 // Bark per Hz at high freq
    expect(slope2).toBeLessThan(slope1)
  })
})
