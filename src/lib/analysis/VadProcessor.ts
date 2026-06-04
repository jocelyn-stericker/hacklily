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
export const VAD_CHUNK = 512 // 32 ms at 16 kHz
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

  /**
   * Feed 16 kHz mono audio. Runs one inference per 512-sample chunk; `onChunk`,
   * if given, is invoked with that chunk's speech probability as each inference
   * completes (in order), so callers can record a per-chunk probability series
   * rather than only sampling the latest value.
   */
  async feed(
    samples16k: Float32Array,
    onChunk?: (speechProbability: number) => void,
  ): Promise<void> {
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
        onChunk?.(this.speechProbability)
        // Carry this chunk's trailing VAD_V6_EXTRA_CONTEXT samples into the
        // context region at the front of the buffer, so the next chunk's
        // inference sees the proper overlap. The just-processed chunk occupies
        // buf[VAD_V6_EXTRA_CONTEXT .. VAD_CHUNK + VAD_V6_EXTRA_CONTEXT); its
        // last VAD_V6_EXTRA_CONTEXT samples are buf[VAD_CHUNK ..].
        this.buf.copyWithin(0, VAD_CHUNK, VAD_CHUNK + VAD_V6_EXTRA_CONTEXT)
        this.bufLen = 0
      }
    }
  }

  /**
   * Run inference on any buffered samples that have not filled a full chunk,
   * zero-padding the remainder to VAD_CHUNK. Use at end of stream so the final
   * partial chunk still yields a probability, matching the batch path, which
   * always runs a (zero-padded) last chunk. No-op when nothing is buffered.
   */
  async flush(onChunk?: (speechProbability: number) => void): Promise<void> {
    if (this.bufLen === 0) return
    const session = await getSession()
    this.buf.fill(0, this.bufLen + VAD_V6_EXTRA_CONTEXT)
    await this._run(session)
    onChunk?.(this.speechProbability)
    this.bufLen = 0
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
// so the attack of a word is not clipped. Always applied, regardless of audio.
export const PREROLL_MS = 50

// Upper bound on how far before a voiced onset the gate may reclaim as speech
// when callers supply a per-frame onset feature (high-frequency energy). Unlike
// PREROLL_MS, this is only a ceiling: the gate walks back from the onset through
// frames whose energy stays well above the local noise floor — an unvoiced
// attack such as /s/ or /f/ that Silero, run on quiet input, tends to miss —
// and stops once the energy returns to the floor. With no feature supplied it
// has no effect and the blind PREROLL_MS pad is used.
export const ONSET_BACKTRACK_MS = 200

// How far above the local noise floor a frame's onset feature must sit to be
// pulled into the onset by the backtrack (≈5 dB in power). Low enough to catch
// weak fricatives (/f/, /θ/), high enough that steady-state silence stops it.
const ONSET_BACKTRACK_FACTOR = 3

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
  // Per-frame high-frequency energy, used to refine onsets. NaN when the caller
  // does not supply it; the gate then falls back to the blind PREROLL_MS pad.
  onsetFeature: number
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
  private readonly backtrackFrames: number
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
    this.backtrackFrames = framesFor(ONSET_BACKTRACK_MS)
    this.postrollFrames = framesFor(POSTROLL_MS)
    this.redemptionFrames = framesFor(REDEMPTION_MS)
    this.minSpeechFrames = framesFor(MIN_SPEECH_MS)
  }

  push(
    frameIndex: number,
    speechProbability: number,
    onsetFeature = NaN,
  ): void {
    const frame: GateFrame = { frameIndex, speechProbability, onsetFeature }

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
      // Onset: open a segment and reclaim buffered pre-roll frames, extending
      // back through any unvoiced attack the onset feature reveals.
      this.inSegment = true
      for (const pf of this.reclaimPreroll()) {
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
    if (this.preroll.length > this.backtrackFrames) this.preroll.shift()
  }

  // Choose which buffered pre-onset frames an onset reclaims as speech. Always
  // takes at least the last prerollFrames (the blind PREROLL_MS pad). When an
  // onset feature is available, estimates the noise floor from the oldest part
  // of the buffer (which predates the attack) and walks further back from the
  // pad through any contiguous run sitting ONSET_BACKTRACK_FACTOR above that
  // floor, so the onset lands at the start of an unvoiced consonant rather than
  // the voiced vowel. Falls back to the blind pad when no usable feature exists.
  private reclaimPreroll(): GateFrame[] {
    const n = this.preroll.length
    let start = Math.max(0, n - this.prerollFrames)

    const refEnd = Math.floor(n / 4)
    let sum = 0
    let count = 0
    for (let i = 0; i < refEnd; i++) {
      const f = this.preroll[i]!.onsetFeature
      if (!Number.isNaN(f)) {
        sum += f
        count++
      }
    }
    if (count > 0) {
      const threshold = (sum / count) * ONSET_BACKTRACK_FACTOR
      if (threshold > 0) {
        while (start > 0 && this.preroll[start - 1]!.onsetFeature > threshold) {
          start--
        }
      }
    }

    return this.preroll.slice(start)
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
