import { ESpeakWasm } from "./wasm.js"
import type { IPAPhonemeOptions, CreateESpeakOptions } from "./types.js"

export type { IPAPhonemeOptions, CreateESpeakOptions, Compression, DataAsset } from "./types.js"

export function createESpeak(opts: CreateESpeakOptions): Promise<ESpeakWasm> {
  return ESpeakWasm.create(opts)
}

let wasmInstance: ESpeakWasm | null = null
let initPromise: Promise<void> | null = null

async function initSingleton(): Promise<ESpeakWasm> {
  const isNode = typeof process !== "undefined" && !!process.versions?.node
  if (!isNode) {
    throw new Error(
      "espeak-phonemes: use createESpeak() to supply assets in non-Node environments",
    )
  }
  const { resolve, dirname } = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const { readFileSync } = await import("node:fs")
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const pkgRoot = resolve(currentDir, "..", "..")
  const modPath = resolve(pkgRoot, "espeak-phonemes.js")
  const dataPath = resolve(pkgRoot, "espeak-ng-data.tar")
  const ModuleFactory = (await import(modPath)).default
  const archive = readFileSync(dataPath)
  return ESpeakWasm.create({
    moduleFactory: ModuleFactory,
    data: { archive },
  })
}

export async function textToIPA(
  text: string,
  opts?: IPAPhonemeOptions,
): Promise<string> {
  if (!wasmInstance) {
    // Reuse an in-flight init; reset on failure so a later call can retry.
    if (!initPromise) {
      initPromise = initSingleton().then(
        (inst) => {
          wasmInstance = inst
          initPromise = null
        },
        (err) => {
          initPromise = null
          throw err
        },
      )
    }
    await initPromise
  }
  return wasmInstance!.textToIPA(text, opts)
}
