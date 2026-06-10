// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { SabRope } from '#/lib/audio/SabRope'
import type { SabRopeGrow, SabRopeShare } from '#/lib/audio/SabRope'

export class AudioRopeReader {
  private readonly _rope: SabRope
  private readonly _quantum: number
  private _readPos = 0

  constructor(share: SabRopeShare, quantum: number) {
    this._rope = new SabRope(share)
    this._quantum = quantum
  }

  grow(grow: SabRopeGrow) {
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
        if (rope.sealed) return
        const r = rope.waitForLength(rope.length)
        if (r.async) await r.value
      }

      rope.read(readBuf, this._readPos, 0, quantum)
      this._readPos += quantum
      yield readBuf.slice()
    }
  }
}
