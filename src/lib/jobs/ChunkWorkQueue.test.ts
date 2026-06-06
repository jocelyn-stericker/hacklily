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

import type { AnalysisChunk } from '#/lib/analysis/AnalysisFrame'
import { SabRope } from '#/lib/audio/SabRope'

import { ChunkWorkQueue } from './ChunkWorkQueue'
import type { ChunkWork } from './ChunkWorkQueue'
import { priorityPickNext } from './schedule'

function chunk(frames: number): AnalysisChunk {
  return {
    timeStepSamples: 10,
    sampleRate: 100,
    freqStepHz: 0,
    firstBinHz: 0,
    startTimeSec: 0,
    frames: Array.from({ length: frames }),
    voiced: true,
  }
}

function sealedRope(length: number): SabRope {
  const r = new SabRope(100)
  r.append(new Float32Array(length))
  r.seal()
  return r
}

async function settle(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !predicate(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('ChunkWorkQueue', () => {
  it('interleaves kinds by priority, finishing dependent work first', async () => {
    const c0 = chunk(5)
    const c1 = chunk(5)
    const chunks = [c0, c1]
    const id = (kind: string, ch: AnalysisChunk) =>
      `${kind}:${chunks.indexOf(ch)}`
    const order: string[] = []
    const done = new Set<string>()

    // 'a' is always eligible (like transcribe); 'b' depends on 'a' having run
    // (like align needing a transcript) and is ranked higher.
    const a: ChunkWork = {
      kind: 'a',
      needsWork: (ch) => !done.has(id('a', ch)),
      resolve: () =>
        Promise.resolve((ch) => {
          order.push(id('a', ch))
          done.add(id('a', ch))
          return Promise.resolve()
        }),
      onUnavailable: () => {},
    }
    const b: ChunkWork = {
      kind: 'b',
      needsWork: (ch) => done.has(id('a', ch)) && !done.has(id('b', ch)),
      resolve: () =>
        Promise.resolve((ch) => {
          order.push(id('b', ch))
          done.add(id('b', ch))
          return Promise.resolve()
        }),
      onUnavailable: () => {},
    }

    const queue = new ChunkWorkQueue([a, b], priorityPickNext(['b', 'a']), {
      getChunks: () => chunks,
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
    })

    queue.scan()
    await settle(() => done.size === 4)

    // Each chunk's 'a' is immediately followed by its higher-priority 'b' before
    // the next chunk's 'a' — priority is re-evaluated after every job.
    expect(order).toEqual(['a:0', 'b:0', 'a:1', 'b:1'])
  })

  it('stands a kind down (onUnavailable) when its resolve returns null', async () => {
    const onUnavailable = vi.fn()
    const unavailable: ChunkWork = {
      kind: 'x',
      needsWork: () => true,
      resolve: () => Promise.resolve(null),
      onUnavailable,
    }
    const queue = new ChunkWorkQueue([unavailable], priorityPickNext(['x']), {
      getChunks: () => [chunk(5)],
      getRopes: () => [sealedRope(100)],
      getViewport: () => null,
    })

    queue.scan()
    await settle(() => onUnavailable.mock.calls.length > 0)

    expect(onUnavailable).toHaveBeenCalledTimes(1)
  })
})
