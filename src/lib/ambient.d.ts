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

// Ambient declarations for Vite's ?worker import syntax and the AudioWorklet
// global scope, which TypeScript has no built-in lib for.

declare module '#/lib/workers/SpectrogramWorker?worker' {
  import type { SpectrogramWorker } from '#/lib/workers/SpectrogramWorker'

  const SpectrogramWorkerConstructor: new () => SpectrogramWorker
  export default SpectrogramWorkerConstructor
}

declare module '#/lib/workers/FormantWorker?worker' {
  import type { FormantWorker } from '#/lib/workers/FormantWorker'

  const FormantWorkerConstructor: new () => FormantWorker
  export default FormantWorkerConstructor
}

declare module '#/lib/workers/VadWorker?worker' {
  import type { VadWorker } from '#/lib/workers/VadWorker'

  const VadWorkerConstructor: new () => VadWorker
  export default VadWorkerConstructor
}

declare module '#/lib/workers/ImportWorker?worker' {
  import type { ImportWorker } from '#/lib/workers/ImportWorker'

  const ImportWorkerConstructor: new () => ImportWorker
  export default ImportWorkerConstructor
}

declare module '#/lib/workers/TranscribeWorker?worker' {
  import type { TranscribeWorker } from '#/lib/workers/TranscribeWorker'

  const TranscribeWorkerConstructor: new () => TranscribeWorker
  export default TranscribeWorkerConstructor
}

declare module '#/lib/workers/AlignWorker?worker' {
  import type { AlignWorker } from '#/lib/workers/AlignWorker'

  const AlignWorkerConstructor: new () => AlignWorker
  export default AlignWorkerConstructor
}

declare interface AudioParamDescriptor {
  name: string
  automationRate?: AutomationRate
  defaultValue?: number
  maxValue?: number
  minValue?: number
}

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean
}

declare function registerProcessor(
  name: string,
  processorCtor: new (
    options?: AudioWorkletNodeOptions,
  ) => AudioWorkletProcessor,
): void

// Globals available inside the AudioWorkletGlobalScope.
declare const sampleRate: number
declare const currentTime: number
declare const currentFrame: number
