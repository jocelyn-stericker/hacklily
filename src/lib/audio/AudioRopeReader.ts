// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { AudioRope } from '#/lib/audio/AudioRope'
import type { AudioRopeGrow, AudioRopeShare } from '#/lib/audio/AudioRope'

export class AudioRopeReader {
  private readonly _rope: AudioRope
  private readonly _quantum: number
  private _readPos = 0

  constructor(share: AudioRopeShare, quantum: number) {
    this._rope = new AudioRope(share)
    this._quantum = quantum
  }

  grow(grow: AudioRopeGrow) {
    this._rope.grow(grow)
  }

  seal() {
    this._rope.seal()
  }

  async *[Symbol.asyncIterator]() {
    const { _quantum: quantum, _rope: rope } = this
    const readBuf = new Float32Array(quantum)

    while (true) {
      while (rope.length - this._readPos < quantum) {
        const rawLen = rope.rawLength
        // Only exit when sealed AND rope.length is unclamped (all grow messages applied).
        // If clamped, wait: the consumer-side seal() call (from 'rope-seal' message) will
        // notify CTRL_LENGTH after all grows land, unblocking the wait below.
        if (rope.sealed && rope.length === rawLen) return
        // Wait on the actual Atomics value (not the clamped length) so this truly
        // blocks when the producer is ahead of our local buffer count.
        const r = rope.waitForLength(rawLen)
        if (r.async) await r.value
      }

      rope.read(readBuf, this._readPos, 0, quantum)
      this._readPos += quantum
      yield readBuf.slice()
    }
  }
}
