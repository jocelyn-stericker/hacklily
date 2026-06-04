export interface IPAPhonemeOptions {
  /** Character inserted between phoneme groups (default: " ") */
  separator?: string
  /** Tie character for multi-character phonemes (e.g., U+0361 "◌͡") */
  tie?: string
  /** Keep primary/secondary stress marks (ˈˌ), default: true */
  keepStress?: boolean
  /** English voice variant (default: "en") */
  voice?: "en" | "en-us"
}

export type Compression = "gzip" | "none"

export interface DataAsset {
  /** Raw bytes of the compressed (or uncompressed) data archive */
  archive: ArrayBuffer | Uint8Array
  /** How the archive is compressed.  "none" = raw tar bytes. */
  compression?: Compression
}

export interface CreateESpeakOptions {
  /**
   * The emscripten Module factory function (the default export of
   * espeak-phonemes.js).  Invoked with `moduleOverrides` so you can
   * supply `locateFile`/`wasmBinary` to point at the .wasm.
   */
  moduleFactory: (moduleOverrides?: any) => Promise<any>
  /**
   * Overrides forwarded to the emscripten Module factory. Use this in
   * bundled/browser environments where the glue can't locate the .wasm
   * on its own, e.g. `{ locateFile: () => wasmUrl }` or
   * `{ wasmBinary: bytes }`.
   */
  moduleOverrides?: Record<string, unknown>
  /** Compressed data archive containing espeak-ng-data/ */
  data: DataAsset
}
