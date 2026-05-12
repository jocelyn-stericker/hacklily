import { describe, it, expect } from 'vitest'

import { nextPow2 } from './nextPow2'

describe('nextPow2', () => {
  it('should return power of 2 for powers of 2', () => {
    expect(nextPow2(1)).toBe(1)
    expect(nextPow2(2)).toBe(2)
    expect(nextPow2(4)).toBe(4)
    expect(nextPow2(8)).toBe(8)
    expect(nextPow2(16)).toBe(16)
    expect(nextPow2(32)).toBe(32)
    expect(nextPow2(64)).toBe(64)
    expect(nextPow2(128)).toBe(128)
    expect(nextPow2(256)).toBe(256)
    expect(nextPow2(512)).toBe(512)
    expect(nextPow2(1024)).toBe(1024)
  })

  it('should return next power of 2 for non-powers of 2', () => {
    expect(nextPow2(3)).toBe(4)
    expect(nextPow2(5)).toBe(8)
    expect(nextPow2(7)).toBe(8)
    expect(nextPow2(9)).toBe(16)
    expect(nextPow2(15)).toBe(16)
    expect(nextPow2(17)).toBe(32)
    expect(nextPow2(100)).toBe(128)
    expect(nextPow2(1000)).toBe(1024)
    expect(nextPow2(1025)).toBe(2048)
  })

  it('should handle edge case of 1', () => {
    expect(nextPow2(1)).toBe(1)
  })

  it('should handle edge case of 2', () => {
    expect(nextPow2(2)).toBe(2)
  })

  it('should always return >= input', () => {
    for (let i = 1; i <= 10000; i++) {
      expect(nextPow2(i)).toBeGreaterThanOrEqual(i)
    }
  })

  it('should return power of 2', () => {
    for (let i = 1; i <= 10000; i++) {
      const result = nextPow2(i)
      expect((result & (result - 1)) === 0).toBe(true)
    }
  })

  it('should return smallest power of 2 >= input', () => {
    for (let i = 1; i <= 1000; i++) {
      const result = nextPow2(i)
      expect(result).toBeGreaterThanOrEqual(i)
      expect(result / 2).toBeLessThan(i)
    }
  })

  it('should handle large numbers', () => {
    const result = nextPow2(1000000)
    expect(result).toBeGreaterThanOrEqual(1000000)
    expect((result & (result - 1)) === 0).toBe(true)
  })

  it('should handle very large numbers', () => {
    const result = nextPow2(2 ** 20)
    expect(result).toBe(2 ** 20)
  })

  it('should handle numbers near powers of 2', () => {
    expect(nextPow2(127)).toBe(128)
    expect(nextPow2(255)).toBe(256)
    expect(nextPow2(511)).toBe(512)

    expect(nextPow2(129)).toBe(256)
    expect(nextPow2(257)).toBe(512)
    expect(nextPow2(513)).toBe(1024)
  })

  it('should match bit shifting behavior', () => {
    for (let i = 1; i <= 10000; i++) {
      const result = nextPow2(i)
      let p = 0
      let power = 1
      while (power < i) {
        power <<= 1
        p++
      }
      expect(result).toBe(power)
    }
  })

  it('should work correctly for FFT sizes', () => {
    const sizes = [128, 256, 512, 1024, 2048, 4096, 8192]
    sizes.forEach((size) => {
      expect(nextPow2(size)).toBe(size)
    })
  })

  it('should provide correct FFT padding', () => {
    const inputSizes = [100, 200, 500, 1000, 2000, 5000]
    inputSizes.forEach((n) => {
      const fftSize = nextPow2(n)
      expect(fftSize).toBeGreaterThanOrEqual(n)
      expect((fftSize & (fftSize - 1)) === 0).toBe(true)
    })
  })

  it('should handle sequential values correctly', () => {
    let lastResult = nextPow2(1)
    for (let i = 2; i <= 1000; i++) {
      const result = nextPow2(i)
      expect(result).toBeGreaterThanOrEqual(lastResult)
      lastResult = result
    }
  })
})
