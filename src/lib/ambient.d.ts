// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Ambient declarations for Vite's ?worker import syntax and the AudioWorklet
// global scope, which TypeScript has no built-in lib for.

declare module '#/lib/workers/RopeWriterWorker?worker' {
  import type { RopeWriterWorker } from '#/lib/workers/RopeWriterWorker'

  const RopeWriterWorkerConstructor: new () => RopeWriterWorker
  export default RopeWriterWorkerConstructor
}

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
  export type { ImportWorker }
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
