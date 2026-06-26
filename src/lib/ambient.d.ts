// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

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

// File System Access API surface not yet in the standard DOM lib. The handle
// interfaces themselves (FileSystemDirectoryHandle etc.) are standardised and
// present, but the permission methods and the directory picker entry point are
// not, so we declare just what the voice journal uses.
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemHandle {
  queryPermission?(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>
  requestPermission?(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>
}

interface Window {
  showDirectoryPicker?(options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: string | FileSystemHandle
  }): Promise<FileSystemDirectoryHandle>
}
