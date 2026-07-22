import type { IPAPhonemeOptions, CreateESpeakOptions } from "./types.js"
import { loadTarToMEMFS } from "./data.js"

export class ESpeakWasm {
  private wasm: any
  private activeVoice: string | null = null

  private constructor() {}

  static async create(opts: CreateESpeakOptions): Promise<ESpeakWasm> {
    const ModuleFactory = opts.moduleFactory
    const wasm = await ModuleFactory(opts.moduleOverrides)

    await loadTarToMEMFS(wasm, opts.data.archive, opts.data.compression)

    const pathStr = "/data/espeak-ng-data"
    const pathHomeAddr = wasm._path_home
    for (let i = 0; i < pathStr.length; i++) {
      wasm.HEAPU8[pathHomeAddr + i] = pathStr.charCodeAt(i)
    }
    wasm.HEAPU8[pathHomeAddr + pathStr.length] = 0

    const ctxPtr = wasm._malloc(4)
    wasm.setValue(ctxPtr, 0, "i32")
    const initStatus = wasm._espeak_ng_Initialize(ctxPtr)
    wasm._free(ctxPtr)
    if (initStatus < 0) {
      throw new Error(`espeak_ng_Initialize failed: ${initStatus}`)
    }

    const instance = new ESpeakWasm()
    instance.wasm = wasm
    return instance
  }

  private setVoice(name: string): void {
    // SetVoiceByName reloads the voice (and its dictionary/phoneme tables),
    // so skip it when the voice hasn't changed since the last call.
    if (name === this.activeVoice) return
    const wasm = this.wasm
    const buf = wasm._malloc(name.length + 1)
    wasm.stringToUTF8(name, buf, name.length + 1)
    const status = wasm._espeak_ng_SetVoiceByName(buf)
    wasm._free(buf)
    if (status !== 0) {
      throw new Error(`espeak_ng_SetVoiceByName("${name}") failed: ${status}`)
    }
    this.activeVoice = name
  }

  // Drain residual clause-reader lookahead left by a previous call.
  // espeak's `ungot_char` (readclause.c) persists across espeak_TextToPhonemes
  // calls — the phoneme API never calls InitText2() to clear it. A text ending
  // in ".." leaves a stray '.' pending (clause termination ungets the 2nd dot
  // while *textptr goes NULL), which the next call would emit as "dot".
  // Translating an empty string consumes that pending state. Cheap (empty
  // clause), so we run it before every translation.
  private flushClauseState(): void {
    const wasm = this.wasm
    const emptyPtr = wasm._malloc(1)
    wasm.HEAPU8[emptyPtr] = 0
    const ePtrPtr = wasm._malloc(4)
    wasm.setValue(ePtrPtr, emptyPtr, "i32")
    wasm.ccall("espeak_TextToPhonemes", "string",
      ["number", "number", "number"], [ePtrPtr, 1, 2])
    wasm._free(emptyPtr)
    wasm._free(ePtrPtr)
  }

  textToIPA(text: string, opts?: IPAPhonemeOptions): string {
    const wasm = this.wasm

    const voice = opts?.voice ?? "en"
    if (voice !== "en" && voice !== "en-us") {
      throw new Error(`Unsupported voice: "${voice}". Use "en" or "en-us".`)
    }
    this.setVoice(voice)
    this.flushClauseState()

    // bit 1 = IPA output. bit 7 + codepoint in bits 8-23 tells espeak to
    // insert a tie *within* multi-character phonemes (e.g. "əʊ" -> "ə͡ʊ"),
    // at the phoneme-internal letter boundaries only espeak knows about.
    let phonemeMode = 2
    if (opts?.tie && opts?.sep) {
      throw new Error('tie and sep cannot both be set')
    }
    if (opts?.tie) {
      const tieCp = opts.tie.codePointAt(0)
      if (tieCp !== undefined) {
        phonemeMode |= 0x80 // espeakPHONEMES_TIE
        phonemeMode |= (tieCp & 0xffff) << 8
      }
    }
    if (opts?.sep) {
      const tieCp = opts.sep.codePointAt(0)
      if (tieCp !== undefined) {
        phonemeMode |= (tieCp & 0xffff) << 8
      }
    }

    const textBytes = wasm.lengthBytesUTF8(text) + 1
    const textPtr = wasm._malloc(textBytes)
    wasm.stringToUTF8(text, textPtr, textBytes)

    const textPtrPtr = wasm._malloc(4)
    wasm.setValue(textPtrPtr, textPtr, "i32")

    const clauses: string[] = []
    while (true) {
      const clause: string | null = wasm.ccall(
        "espeak_TextToPhonemes",
        "string",
        ["number", "number", "number"],
        [textPtrPtr, 1, phonemeMode],
      )

      if (!clause) break
      clauses.push(clause)

      const nextPtr = wasm.getValue(textPtrPtr, "i32")
      if (nextPtr === 0) break
    }

    wasm._free(textPtr)
    wasm._free(textPtrPtr)

    let result = clauses.join(" ")

    if (opts?.keepStress === false) {
      result = result.replace(/[ˈˌ]/g, "")
    }

    // Apply the separator uniformly at every phoneme-group boundary (between
    // words and between clauses). espeak emits space-separated groups; the
    // default " " leaves them as-is, anything else replaces every run of
    // whitespace so within-clause and between-clause spacing stay consistent.
    const separator = opts?.wordSeparator
    if (separator !== undefined && separator !== " ") {
      result = result.split(/\s+/).filter((s) => s.length > 0).join(separator)
    }

    return result
  }
}
