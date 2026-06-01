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

declare module '#/lib/SpectrogramWorker?worker' {
  import type { SpectrogramWorker } from '#/lib/SpectrogramWorker'

  const SpectrogramWorkerConstructor: new () => SpectrogramWorker
  export default SpectrogramWorkerConstructor
}

declare module '#/lib/FormantWorker?worker' {
  import type { FormantWorker } from '#/lib/FormantWorker'

  const FormantWorkerConstructor: new () => FormantWorker
  export default FormantWorkerConstructor
}

declare module '#/lib/VadWorker?worker' {
  import type { VadWorker } from '#/lib/VadWorker'

  const VadWorkerConstructor: new () => VadWorker
  export default VadWorkerConstructor
}

declare module '#/lib/ImportWorker?worker' {
  import type { ImportWorker } from '#/lib/ImportWorker'

  const ImportWorkerConstructor: new () => ImportWorker
  export default ImportWorkerConstructor
}

declare module '#/lib/MoonshineWorker?worker' {
  import type { MoonshineWorker } from '#/lib/MoonshineWorker'

  const MoonshineWorkerConstructor: new () => MoonshineWorker
  export default MoonshineWorkerConstructor
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
