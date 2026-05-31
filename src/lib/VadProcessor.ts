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
 * Stateful streaming VAD processor for Silero v6.
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

// --- Speech gating ----------------------------------------------------------

// Hysteresis thresholds on the Silero speech probability (0 = silence, 1 =
// speech). Speech turns on at POSITIVE and back off at NEGATIVE; the gap
// between them debounces probabilities hovering around the boundary.
export const POSITIVE_THRESHOLD = 0.3
export const NEGATIVE_THRESHOLD = 0.25

// Frames immediately before a voiced onset are retroactively marked as speech,
// so the attack of a word is not clipped.
export const PREROLL_MS = 50

// Frames immediately after a voiced segment ends are kept as speech, so the
// release/decay tail of the last word is not clipped. Unlike redemption (which
// reverts when speech does not resume), this pad is always kept.
export const POSTROLL_MS = 50

// After speech stops, frames keep being reported as speech for this long. If
// speech resumes within the window the gap is bridged; otherwise — or when the
// stream ends — the held frames revert to silence, save for the POSTROLL_MS pad.
export const REDEMPTION_MS = 80

// Speech segments shorter than this, measured end to end (including pre-roll,
// post-roll, and any bridged gaps), are discarded as spurious and reverted to
// silence.
export const MIN_SPEECH_MS = 400

// TODO(vad): future explorations, in rough priority order —
//   1. Reconsider the live UX of optimistic redemption: at a 2 ms step,
//      REDEMPTION_MS paints ~500 frames as speech and then retracts them a
//      second later. Consider a shorter redemption for the realtime path, or a
//      distinct "tentative" rendering so retraction reads as intentional.
//   2. Emit segment-level events (utterance start/end/duration) in addition to
//      per-frame decisions. The gate already knows these boundaries; surfacing
//      them would let the UI report durations/counts without re-deriving runs.
//   3. Make the thresholds and durations tunable (e.g. a single "sensitivity"
//      knob) once fixed values prove wrong on real mics/rooms.

export interface SpeechDecision {
  frameIndex: number
  speechProbability: number
  speechDetected: boolean
}

interface GateFrame {
  frameIndex: number
  speechProbability: number
}

/**
 * Turns a stream of per-frame speech probabilities into per-frame speech
 * decisions, applying hysteresis, pre-roll, post-roll, redemption, and a
 * minimum-duration filter. Shared by the realtime VAD worker and offline buffer
 * analysis so both behave identically.
 *
 * Decisions are reported optimistically and may be revised later: a frame can
 * be reported as speech and then corrected to silence once a redemption window
 * expires without speech resuming, or once its segment proves too short to
 * keep. Each callback carries the latest known value for that frame, so a later
 * decision for a frame overrides an earlier one. Frames are reported in the
 * order they are pushed, though corrections may target earlier frames.
 */
export class SpeechGate {
  private readonly prerollFrames: number
  private readonly postrollFrames: number
  private readonly redemptionFrames: number
  private readonly minSpeechFrames: number

  // Whether the most recent frame counts as speech (post-hysteresis).
  private speaking = false
  // Whether we are inside a speech segment: its leading edge has fired and it
  // has not yet been closed by an expired redemption window or the stream end.
  private inSegment = false
  // Consecutive silent frames since the last speech frame, while in a segment.
  private silenceRun = 0

  // Recent silent frames eligible to become pre-roll for the next onset.
  private preroll: GateFrame[] = []
  // Silent frames optimistically reported as speech during the redemption
  // window; either folded into the segment (bridged) or reverted to silence.
  private redemption: GateFrame[] = []
  // Frames in the current segment, retained only until it reaches
  // minSpeechFrames so they can be reverted if the segment stays too short.
  private segment: GateFrame[] = []
  private segmentLength = 0

  constructor(
    framesPerSecond: number,
    private readonly onDecision: (decision: SpeechDecision) => void,
  ) {
    const framesFor = (ms: number) => Math.round((ms / 1000) * framesPerSecond)
    this.prerollFrames = framesFor(PREROLL_MS)
    this.postrollFrames = framesFor(POSTROLL_MS)
    this.redemptionFrames = framesFor(REDEMPTION_MS)
    this.minSpeechFrames = framesFor(MIN_SPEECH_MS)
  }

  push(frameIndex: number, speechProbability: number): void {
    const frame: GateFrame = { frameIndex, speechProbability }

    if (speechProbability >= POSITIVE_THRESHOLD) this.speaking = true
    else if (speechProbability < NEGATIVE_THRESHOLD) this.speaking = false

    if (this.speaking) this.onSpeech(frame)
    else if (this.inSegment) this.onRedemption(frame)
    else this.onSilence(frame)
  }

  /** End of stream: an open redemption tail never resumed, so close it out. */
  end(): void {
    if (!this.inSegment) return
    this.closeRedemptionTail()
    this.closeSegment()
    this.inSegment = false
    this.silenceRun = 0
  }

  private onSpeech(frame: GateFrame): void {
    if (!this.inSegment) {
      // Onset: open a segment and reclaim buffered pre-roll frames.
      this.inSegment = true
      for (const pf of this.preroll) {
        this.emit(pf, true)
        this.extendSegment(pf)
      }
      this.preroll = []
    } else if (this.redemption.length > 0) {
      // Speech resumed within the redemption window: bridge the gap. These
      // frames were already reported as speech; just fold them into the segment.
      for (const rf of this.redemption) this.extendSegment(rf)
      this.redemption = []
    }
    this.silenceRun = 0
    this.emit(frame, true)
    this.extendSegment(frame)
  }

  private onRedemption(frame: GateFrame): void {
    this.silenceRun++
    if (this.silenceRun <= this.redemptionFrames) {
      // Still within the window: keep reporting speech in case it resumes.
      this.emit(frame, true)
      this.redemption.push(frame)
      return
    }
    // Window expired without speech resuming: close out the tail, close the
    // segment, and treat this frame as the start of the trailing silence.
    this.closeRedemptionTail()
    this.closeSegment()
    this.inSegment = false
    this.silenceRun = 0
    this.onSilence(frame)
  }

  // Close an unbridged redemption tail: keep the first postrollFrames as a
  // release pad on the end of the segment (they were already reported as
  // speech), and revert the rest to silence.
  private closeRedemptionTail(): void {
    const keep = Math.min(this.postrollFrames, this.redemption.length)
    for (let i = 0; i < this.redemption.length; i++) {
      const frame = this.redemption[i]!
      if (i < keep) this.extendSegment(frame)
      else this.emit(frame, false)
    }
    this.redemption = []
  }

  private onSilence(frame: GateFrame): void {
    this.emit(frame, false)
    this.preroll.push(frame)
    if (this.preroll.length > this.prerollFrames) this.preroll.shift()
  }

  private extendSegment(frame: GateFrame): void {
    this.segmentLength++
    if (this.segmentLength < this.minSpeechFrames) {
      this.segment.push(frame)
    } else if (this.segmentLength === this.minSpeechFrames) {
      // Long enough to keep for good; stop tracking frames for reversion.
      this.segment = []
    }
  }

  // Close the segment, reverting it to silence if it never reached
  // minSpeechFrames. (A kept segment leaves `segment` empty, so this is a no-op.)
  private closeSegment(): void {
    this.revert(this.segment)
    this.segment = []
    this.segmentLength = 0
  }

  private revert(frames: GateFrame[]): void {
    for (const frame of frames) this.emit(frame, false)
  }

  private emit(frame: GateFrame, speechDetected: boolean): void {
    this.onDecision({
      frameIndex: frame.frameIndex,
      speechProbability: frame.speechProbability,
      speechDetected,
    })
  }
}
