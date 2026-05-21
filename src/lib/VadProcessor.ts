/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 * Copyright (C) 2022-2026 ricky0123
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

// Silero VAD v6 inference via onnxruntime-web.
// Model interface originally from https://github.com/ricky0123/vad

import ortMjsUrl from '@jocelyn-stericker/ort-silero-vad-wasm-minimal/ort-wasm-simd-threaded.mjs?url'
import ortWasmUrl from '@jocelyn-stericker/ort-silero-vad-wasm-minimal/ort-wasm-simd-threaded.wasm?url'
import vadModelUrl from '@jocelyn-stericker/ort-silero-vad-wasm-minimal/silero_vad_v6_16k_op15.ort?url'
import * as ort from 'onnxruntime-web/wasm'

const VAD_SAMPLE_RATE = 16000
const VAD_CHUNK = 512 // 32 ms at 16 kHz
const VAD_V6_EXTRA_CONTEXT = 64 // overlap prepended to each frame https://github.com/snakers4/silero-vad/issues/771
const STATE_SIZE = 2 * 1 * 128 // shape [2, 1, 128]

let _session: ort.InferenceSession | undefined
let _sessionPromise: Promise<ort.InferenceSession> | undefined

function getSession(): Promise<ort.InferenceSession> {
  if (_session) return Promise.resolve(_session)
  if (!_sessionPromise) {
    ort.env.wasm.numThreads = 1
    ort.env.wasm.wasmPaths = { wasm: ortWasmUrl, mjs: ortMjsUrl }
    _sessionPromise = ort.InferenceSession.create(vadModelUrl).then((sess) => {
      _session = sess
      return sess
    })
  }
  return _sessionPromise
}

/**
 * Stateful streaming VAD processor for Silero v5.
 *
 * Feed 16 kHz mono audio chunks via `feed()`. The model runs inference each
 * time 512 samples have accumulated. `speechProbability` holds the output of
 * the most recent inference (0 = silence, 1 = speech).
 *
 * LSTM state persists across `feed()` calls so continuous streams are handled
 * correctly. Call `reset()` between independent utterances.
 */
export class VadStreamProcessor {
  private state = new Float32Array(STATE_SIZE)
  private buf = new Float32Array(VAD_CHUNK + VAD_V6_EXTRA_CONTEXT)
  private bufLen = 0
  speechProbability = 0

  async feed(samples16k: Float32Array): Promise<void> {
    const session = await getSession()
    let offset = 0
    while (offset < samples16k.length) {
      const take = Math.min(VAD_CHUNK - this.bufLen, samples16k.length - offset)
      this.buf.set(
        samples16k.subarray(offset, offset + take),
        this.bufLen + VAD_V6_EXTRA_CONTEXT,
      )
      this.bufLen += take
      offset += take
      if (this.bufLen === VAD_CHUNK) {
        await this._run(session)
        this.buf.set(
          this.buf.subarray(
            VAD_CHUNK - VAD_V6_EXTRA_CONTEXT,
            VAD_V6_EXTRA_CONTEXT - 1,
          ),
          0,
        )
        this.bufLen = 0
      }
    }
  }

  private async _run(session: ort.InferenceSession): Promise<void> {
    const feeds = {
      input: new ort.Tensor('float32', this.buf.slice(), [
        1,
        VAD_CHUNK + VAD_V6_EXTRA_CONTEXT,
      ]),
      state: new ort.Tensor('float32', this.state.slice(), [2, 1, 128]),
      sr: new ort.Tensor(
        'int64',
        new BigInt64Array([BigInt(VAD_SAMPLE_RATE)]),
        [1],
      ),
    }
    const out = await session.run(feeds)
    this.state.set(out['stateN']!.data as Float32Array)
    this.speechProbability = (out['output']!.data as Float32Array)[0]!
  }

  reset(): void {
    this.state.fill(0)
    this.bufLen = 0
    this.speechProbability = 0
  }
}
