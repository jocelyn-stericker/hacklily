// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Single-consumer async channel (one reader, many writers)

export class Sink<T> {
  #queue: T[] = []
  #pending: ((value: T | null) => void) | null = null

  push(value: T): void {
    if (this.#pending) {
      const resolve = this.#pending
      this.#pending = null
      resolve(value)
    } else {
      this.#queue.push(value)
    }
  }

  next(signal: AbortSignal): Promise<T | null> {
    if (this.#queue.length > 0) {
      return Promise.resolve(this.#queue.shift()!)
    }

    return new Promise<T | null>((resolve) => {
      this.#pending = (value: T | null) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      }
      const onAbort = () => {
        this.#pending = null
        resolve(null)
      }
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }
}
